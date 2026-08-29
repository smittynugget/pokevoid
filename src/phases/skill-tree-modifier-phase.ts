import BattleScene from "#app/battle-scene";
import { Phase } from "#app/phase";
import { PokemonAltBuildModifier, PermaRunQuestModifier, PermaWinQuestModifier, PermaCountdownWaveCheckQuestModifier } from "#app/modifier/modifier";
import { Mode } from "#app/ui/ui";
import { SkillTreeRewardType, SkillTreeNodeState } from "#app/system/skill-tree-data";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";
import { PathNodeTypeFilter, ModifierTypeOption, modifierTypes, MoveUpgradeModifierTypeGenerator, AddPokemonModifierType, AddTypeBallModifierType, TrainerBondAbilityModifierTypeGenerator, ChampionPokemonStatBoosterModifierTypeGenerator, TeraAbilityModifierTypeGenerator, TypeSwitcherModifierType, PermaMoneyModifierType, ForbiddenFormUnlockModifierType, ForbiddenFormUnlockCandidate, QUEST_CONSOLE_CODES, BOUNTY_ONLY_CODES, RIVAL_CONSOLE_CODES, rivalQuestModifiers, QuestModifierTypeGenerator } from "#app/modifier/modifier-type";
import { RivalTrainerType } from "#app/data/trainer-config";
import { pokemonEvolutions, pokemonPrevolutions } from "#app/data/pokemon-evolutions";
import * as Utils from "#app/utils";
import { Abilities } from "#enums/abilities";
import { allAbilities } from "#app/data/ability";
import { Species } from "#enums/species";
import { Type } from "#app/data/type";
import { VoucherType } from "#app/system/voucher";
import { FormChangeItem } from "#enums/form-change-items";
import { SkillTreeSelectors } from "#app/system/skill-tree-selectors";
import { ChampionUtils } from "#app/system/champion-utils";
import { getPokemonSpecies, universalSmittyForms } from "#app/data/pokemon-species";
import { QuestUnlockables, QuestState } from "#app/system/game-data.js";
import { PokemonAltBuildDefinition, POKEMON_ALT_BUILDS, PokemonAltBuildId } from "#app/data/pokemon-alt-buid";
import { PlayerPokemon } from "#app/field/pokemon";
import Battle, { BattleType } from "#app/battle";
import { GameModes, getGameMode } from "#app/game-mode";
import { PlayableChampionData } from "#app/system/playable-champions.js";
import { SkillTreeNode } from "#app/system/skill-tree-data.js";
import i18next from "i18next";
import { SkillTreePhase, SkillTreePhaseConfig, SkillTreeMode, PokemonSelection } from "#app/phases/skill-tree-phase";
import { SkillTreeConfig } from "#app/ui/skill-tree-ui-handler";
import { PermaType } from "#app/modifier/perma-modifiers";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import { RewardType } from "#enums/reward-type";
import { modGlitchFormData } from "#app/data/mod-glitch-form-data.js";
import { RunDuration, RunType } from "#enums/quest-type-conditions";

interface SkillTreeNodeLike { rewardData: { type: SkillTreeRewardType, data?: any }; name?: string }

export function isPokemonSelectionComplete(activeSkillTree: any, nodes: any[]): boolean {
  if (!activeSkillTree?.unlockedNodes || !nodes) {
    return false;
  }

  const isJourneyTree = nodes.some(n => n?.id?.startsWith("depth1_journey_mystery_"));
  if (isJourneyTree) {
    const primaryUnlocked = nodes.filter(n =>
      n?.id?.match(/^depth1_journey_mystery_[012]$/) &&
      activeSkillTree.unlockedNodes.has(n.id)
    ).length;
    const fourthNode = nodes.find(n => n?.id === "depth1_journey_mystery_3");
    const fourthDone = !fourthNode || activeSkillTree.unlockedNodes.has(fourthNode.id);
    return primaryUnlocked >= 2 && fourthDone;
  }

  let signatureCount = 0;
  let generalCount = 0;
  let mysteryExists = false;
  let mysteryPurchased = false;
  for (const n of nodes) {
    const unlocked = activeSkillTree.unlockedNodes.has(n.id);
    const isMystery = !!n?.rewardData?.data?.starterMysteryNode;
    if (isMystery) {
      mysteryExists = true;
      if (unlocked) mysteryPurchased = true;
    }
    if (!unlocked) continue;
    if (n.rewardData.type === SkillTreeRewardType.SIGNATURE_POKEMON) signatureCount++;
    if (n.rewardData.type === SkillTreeRewardType.GENERAL_POKEMON) generalCount++;
  }
  const total = signatureCount + generalCount;
  const mysteryOk = !mysteryExists || mysteryPurchased;
  return total >= 2 && generalCount >= 1 && signatureCount <= 1 && mysteryOk;
}

export class SkillTreeModifierPhase extends Phase {
  private node: SkillTreeNode;
  private championData: PlayableChampionData;
  private placeholderPokemon: PlayerPokemon | null = null;
  private createdDummyBattle: boolean = false;
  private dummyBattle: Battle | null = null;
  private static forbiddenFormRegistry: { glitch: ForbiddenFormUnlockCandidate[]; smitty: ForbiddenFormUnlockCandidate[] } | null = null;

  constructor(scene: BattleScene, node: SkillTreeNode, championData: PlayableChampionData) {
    super(scene);
    this.node = node;
    this.championData = championData;
  }

  private createSelectPhase(...args: ConstructorParameters<typeof SelectModifierPhase>): SelectModifierPhase {
    const phase = new SelectModifierPhase(...args);
    phase.uiDisplayConfig = {
      title: i18next.t("modifierSelectUiHandler:skillTreeLootTitle"),
      subtitle: i18next.t("modifierSelectUiHandler:skillTreeLootSubtitle"),
      isBounty: this.node.rewardData.type === SkillTreeRewardType.BOUNTY_SELECT,
      isAltBuild: this.node.rewardData.type === SkillTreeRewardType.POKEMON_ALT_BUILD,
    };
    return phase;
  }

  start(): void {
    super.start();
    this.scene.skillTreeModifierContext = true;
    this.createDummyBattle();
    this.addPlaceholderPokemon();

    if (this.node.rewardData.type === SkillTreeRewardType.ROGUEBALL_RARITY_SELECT) {
      this.scene.unshiftPhase(this.createSelectPhase(
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
      this.scene.unshiftPhase(this.createSelectPhase(
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
      this.scene.unshiftPhase(this.createSelectPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.HEAL_ITEMS,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.PARTY_ABILITY_GRANT) {
      this.scene.unshiftPhase(this.createSelectPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.PARTY_ABILITY,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.BERRY_ITEMS) {
      this.scene.unshiftPhase(this.createSelectPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.ITEM_BERRY,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.ABILITY_SWITCHER) {
      this.scene.unshiftPhase(this.createSelectPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.ABILITY_SWITCHERS,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.GENERAL_ITEMS) {
      this.scene.unshiftPhase(this.createSelectPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.NONE,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.MOVE_UPGRADE) {
      if (!this.scene.moveUpgradesEnabledForRun) {
        const fallback = this.getIncompatibleNodeFallbackOption();
        if (fallback) {
          this.scene.unshiftPhase(this.createSelectPhase(
            this.scene, 0, undefined, false,
            () => this.returnToSkillTree(),
            PathNodeTypeFilter.NONE, 0,
            [fallback], this.node, this.championData
          ));
        } else {
          this.removePlaceholderPokemon();
          this.returnToSkillTree();
        }
        this.end();
        return;
      }
      this.scene.unshiftPhase(this.createSelectPhase(
        this.scene, 0, undefined, false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.MOVE_UPGRADE,
        0, undefined, this.node, this.championData
      ));
      this.end();
      return;
    }
    if (this.node.rewardData.type === SkillTreeRewardType.BOUNTY_SELECT) {
      let modifierOptions: ModifierTypeOption[] = [];
      const nodeOffset = this.calculateNodeSeedOffset();
      try {
        this.scene.executeWithSeedOffset(() => {
          modifierOptions = this.createBountyModifierOptions();
        }, nodeOffset);
      } catch {
        modifierOptions = [];
      }

      if (modifierOptions.length === 0) {
        const fallback = this.getIncompatibleNodeFallbackOption();
        if (fallback) {
          this.scene.unshiftPhase(this.createSelectPhase(
            this.scene, 0, undefined, false,
            () => this.returnToSkillTree(),
            PathNodeTypeFilter.NONE, 0,
            [fallback], this.node, this.championData, 3
          ));
        } else {
          this.removePlaceholderPokemon();
          this.returnToSkillTree();
        }
        this.end();
        return;
      }

      this.scene.unshiftPhase(this.createSelectPhase(
        this.scene,
        0,
        undefined,
        false,
        () => this.returnToSkillTree(),
        PathNodeTypeFilter.NONE,
        0,
        modifierOptions,
        this.node,
        this.championData,
        3
      ));
      this.end();
      return;
    }

    let modifierOptions: ModifierTypeOption[] = [];
    const nodeOffset = this.calculateNodeSeedOffset();
    try {
      this.scene.executeWithSeedOffset(() => {
        modifierOptions = this.createSkillTreeModifierOptions();
      }, nodeOffset);
    } catch {
      modifierOptions = [];
    }

    if (modifierOptions.length === 0) {
      this.removePlaceholderPokemon();
      this.returnToSkillTree();
      this.end();
      return;
    }

     this.scene.unshiftPhase(this.createSelectPhase(
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
        options.push(...this.createSignaturePokemonOptions(4));
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
        const trainerBondCount = Utils.randSeedInt(100) < 85 ? 4 : 5;
        const trainerBondOptions = this.createMultipleTrainerBondOptions(trainerBondCount);
        options.push(...trainerBondOptions);
        break;

      case SkillTreeRewardType.STAT_BOOST:
        const statBoostOption = this.createStatBoostModifierOption();
        if (statBoostOption) options.push(statBoostOption);
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
      case SkillTreeRewardType.GLITCH_CHANGE: {
        const glitchChangeOption = this.createGlitchChangeOption();
        if (glitchChangeOption?.type) {
          const tAny: any = glitchChangeOption.type as any;
          const sf = tAny.selectFilter;
          if (typeof sf === "function") {
            const party = this.scene.getParty();
            const hasEligible = party.some(p => sf(p) === null);
            if (!hasEligible) {
              const fallbackOpt = this.getIncompatibleNodeFallbackOption();
              if (fallbackOpt) options.push(fallbackOpt);
              break;
            }
          }
          options.push(glitchChangeOption);
        } else {
          const fallbackOpt = this.getIncompatibleNodeFallbackOption();
          if (fallbackOpt) options.push(fallbackOpt);
        }
        break;
      }

      case SkillTreeRewardType.POKEMON_ALT_BUILD: {
        const altBuildOption = this.createAltBuildOption();
        if (altBuildOption?.type) {
          const tAny: any = altBuildOption.type as any;
          const sf = tAny.selectFilter;
          if (typeof sf === "function") {
            const party = this.scene.getParty();
            const hasEligible = party.some(p => sf(p) === null);
            if (!hasEligible) {
              const fallbackOpt = this.getIncompatibleNodeFallbackOption();
              if (fallbackOpt) options.push(fallbackOpt);
              break;
            }
          }
          options.push(altBuildOption);
        } else {
          const fallbackOpt = this.getIncompatibleNodeFallbackOption();
          if (fallbackOpt) options.push(fallbackOpt);
        }
        break;
      }

      case SkillTreeRewardType.PERMA_ITEM:
        const permaItemOption = this.createPermaItemOption();
        if (permaItemOption) options.push(permaItemOption);
        break;
      case SkillTreeRewardType.PERMA_MONEY:
        this.grantPermaMoneyImmediate();
        break;
      case SkillTreeRewardType.MONEY_REWARD:
        options.push(...this.createMoneyRewardOption());
        break;

      case SkillTreeRewardType.TERA_ABILITY: {
        const teraAbilityCount = Utils.randSeedInt(100) < 85 ? 3 : 4;
        const teraAbilityOptions = this.createMultipleTeraAbilityOptions(teraAbilityCount);
        options.push(...teraAbilityOptions);
        break;
      }

      case SkillTreeRewardType.SMITTY_ABILITY: {
        const opt = this.createSmittyAbilityOption();
        if (opt) options.push(opt);
        break;
      }

      case SkillTreeRewardType.TYPE_SWITCHER: {
        const typeSwitcherCount = Utils.randSeedInt(100) < 85 ? 4 : 5;
        const typeSwitcherOpts = this.createMultipleTypeSwitcherOptions(typeSwitcherCount);
        options.push(...typeSwitcherOpts);
        break;
      }

      case SkillTreeRewardType.GLITCH_FORM_UNLOCK: {
        let alreadyUnlocked = false;
        try {
          const questId = this.node.rewardData?.data?.unlockableId as QuestUnlockables;
          const questUnlockData = questId ? this.scene.gameData.getQuestUnlockDataFromModifierTypes(questId) : undefined;
          const rewardIdAny: any = questUnlockData?.rewardId;
          const rewardTypeAny: any = questUnlockData?.rewardType;
          if (rewardIdAny != null && rewardTypeAny != null) {
            const ids = Array.isArray(rewardIdAny) ? rewardIdAny : [rewardIdAny];
            alreadyUnlocked = ids.some((id: any) => this.scene.gameData.canUseGlitchOrSmittyForm(id as Species, rewardTypeAny));
          }
        } catch {}

        if (alreadyUnlocked) {
          const fallbackOpt = this.getIncompatibleNodeFallbackOption();
          if (fallbackOpt) options.push(fallbackOpt);
        } else {
          this.grantGlitchFormUnlockImmediate();
        }
        break;
      }

      case SkillTreeRewardType.RANDOM_GLITCH_FORMS_FOR_RUN: {
        const opts = this.createRandomGlitchFormsForRunOptions(4);
        if (opts.length) {
          options.push(...opts);
        } else {
          const fallbackOpt = this.getIncompatibleNodeFallbackOption();
          if (fallbackOpt) options.push(fallbackOpt);
        }
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

      case SkillTreeRewardType.VOID_BALL:
        options.push(...this.createVoidBallOption());
        break;

      case SkillTreeRewardType.TYPE_BALL_FILTERED: {
        const opt = this.createTypeBallOption();
        if (opt) options.push(opt);
        break;
      }

      case SkillTreeRewardType.BOUNTY_SELECT:
        options.push(...this.createBountyModifierOptions());
        break;
    }

    return options;
  }

  public createBountyModifierOptions(): ModifierTypeOption[] {
    const activeConsoleCodes = new Set<string>();
    const existingQuestModifiers = this.scene.gameData.permaModifiers.findModifiers(m =>
      m instanceof PermaRunQuestModifier && m.consoleCode
    ) || [];
    for (const modifier of existingQuestModifiers) {
      activeConsoleCodes.add((modifier as PermaRunQuestModifier).consoleCode);
    }
    const runQuestModifiers = this.scene.findModifiers(m =>
      m instanceof PermaRunQuestModifier && !!(m as PermaRunQuestModifier).consoleCode
    ) || [];
    for (const modifier of runQuestModifiers) {
      activeConsoleCodes.add((modifier as PermaRunQuestModifier).consoleCode);
    }

    type BountyCandidate = { consoleCode: string; generator: QuestModifierTypeGenerator };
    const candidates: BountyCandidate[] = [];

    const gm = this.scene.gameMode;
    const currentWave = this.scene.currentBattle?.waveIndex ?? 0;
    const party = this.scene.getParty();

    for (const [consoleCode, factory] of Object.entries(QUEST_CONSOLE_CODES)) {
      if (!factory) continue;
      const generator = (factory as () => QuestModifierTypeGenerator)();
      if (!(generator instanceof QuestModifierTypeGenerator)) continue;
      const rt = generator.config.runType;
      if (rt !== undefined && rt !== RunType.ANY) {
        const rtOk = gm.isRunType(rt) || (rt === RunType.NIGHTMARE && gm.isChaosMode && currentWave > 1000);
        if (!rtOk) continue;
      }
      const questId = generator.config.questUnlockData?.questId;
      if (questId != null && this.scene.gameData.checkQuestState(questId, QuestState.COMPLETED)) continue;
      if (activeConsoleCodes.has(consoleCode)) continue;
      if (this.isVictoryBountyGenerator(generator, party)) continue;
      if (this.isCountdownWaveBountyGenerator(generator, party)) continue;
      candidates.push({ consoleCode, generator });
    }

    for (const [consoleCode, factory] of Object.entries(BOUNTY_ONLY_CODES)) {
      if (!factory) continue;
      const generator = (factory as () => QuestModifierTypeGenerator)();
      if (!(generator instanceof QuestModifierTypeGenerator)) continue;
      const rt = generator.config.runType;
      if (rt !== undefined && rt !== RunType.ANY) {
        const rtOk = gm.isRunType(rt) || (rt === RunType.NIGHTMARE && gm.isChaosMode && currentWave > 1000);
        if (!rtOk) continue;
      }
      if (activeConsoleCodes.has(consoleCode)) continue;
      if (this.isVictoryBountyGenerator(generator, party)) continue;
      if (this.isCountdownWaveBountyGenerator(generator, party)) continue;
      if (Utils.randSeedInt(100) >= 5) continue;
      candidates.push({ consoleCode, generator });
    }

    const runRivals: RivalTrainerType[] = [];
    if (this.scene.gameData.playerRival) runRivals.push(this.scene.gameData.playerRival);
    if (this.scene.gameData.chaosAltRivals?.length) {
      for (const r of this.scene.gameData.chaosAltRivals) {
        if (!runRivals.includes(r)) runRivals.push(r);
      }
    }
    const runRivalCodes = new Set(runRivals.map(r => RIVAL_CONSOLE_CODES[r]).filter(Boolean));

    for (const [consoleCode, generator] of Object.entries(rivalQuestModifiers)) {
      if (!runRivalCodes.has(consoleCode)) continue;
      if (!(generator instanceof QuestModifierTypeGenerator)) continue;
      const rt = generator.config.runType;
      if (rt !== undefined && rt !== RunType.ANY) {
        const rtOk = gm.isRunType(rt) || (rt === RunType.NIGHTMARE && gm.isChaosMode && currentWave > 1000);
        if (!rtOk) continue;
      }
      const questId = generator.config.questUnlockData?.questId;
      if (questId != null && this.scene.gameData.checkQuestState(questId, QuestState.COMPLETED)) continue;
      if (activeConsoleCodes.has(consoleCode)) continue;
      candidates.push({ consoleCode, generator });
    }

    if (candidates.length === 0) return [];

    const shuffled = Utils.randSeedShuffle([...candidates]);
    const BOUNTY_COUNT = 8;
    const teamLine = this.getPartyEvolutionLineSpecies(party);
    const selected: typeof candidates[number][] = [];
    const usedCodes = new Set<string>();

    if (Utils.randSeedInt(100) < 1) {
      const allRunRivals: RivalTrainerType[] = [];
      if (this.scene.gameData.playerRival) allRunRivals.push(this.scene.gameData.playerRival);
      if (this.scene.gameData.chaosAltRivals?.length) {
        for (const r of this.scene.gameData.chaosAltRivals) {
          if (!allRunRivals.includes(r)) allRunRivals.push(r);
        }
      }
      if (allRunRivals.length > 0) {
        const chosenRival = Utils.randSeedItem(allRunRivals);
        const rivalCode = RIVAL_CONSOLE_CODES[chosenRival];
        const rivalGen = rivalQuestModifiers[rivalCode];
        if (rivalGen && !activeConsoleCodes.has(rivalCode)) {
          const rivalCandidate = candidates.find(c => c.consoleCode === rivalCode);
          if (rivalCandidate) {
            selected.push(rivalCandidate);
            usedCodes.add(rivalCode);
          }
        }
      }
    }

    for (const c of shuffled) {
      if (selected.length >= BOUNTY_COUNT) break;
      if (usedCodes.has(c.consoleCode)) continue;
      const useTeamMatch = Utils.randSeedInt(100) < 30;
      if (useTeamMatch) {
        const questSpecies = this.getBountyQuestSpecies(c);
        if (questSpecies !== null && teamLine.has(questSpecies)) {
          selected.push(c);
          usedCodes.add(c.consoleCode);
          continue;
        }
      }
      selected.push(c);
      usedCodes.add(c.consoleCode);
    }

    const options: ModifierTypeOption[] = [];

    for (const candidate of selected) {
      const questType = candidate.generator.generateType(party);
      if (!questType) continue;
      const originalNewModifier = questType.newModifier.bind(questType);
      questType.newModifier = (...args: any[]) => {
        const modifier = originalNewModifier(...args) as PermaRunQuestModifier;
        if (modifier) {
          modifier.consoleCode = candidate.consoleCode;
          modifier.skillTreeBounty = true;
        }
        return modifier;
      };
      options.push(new ModifierTypeOption(questType, 0, 0));
    }

    return options;
  }

  private getForbiddenFormCandidateKey(c: ForbiddenFormUnlockCandidate): string {
    if (c.kind === "QUEST_FORM") {
      const q: any = (c as any).questUnlockData;
      return `quest:${q?.questId}:${q?.rewardType}:${JSON.stringify(q?.rewardId ?? null)}`;
    }
    if (c.kind === "MOD_FORM") {
      return `mod:${(c as any).systemName}`;
    }
    return `uni:${(c as any).formName}`;
  }

  private buildForbiddenFormRegistry(): { glitch: ForbiddenFormUnlockCandidate[]; smitty: ForbiddenFormUnlockCandidate[] } {
    const gd: any = (this.scene as any).gameData;
    const glitch: ForbiddenFormUnlockCandidate[] = [];
    const smitty: ForbiddenFormUnlockCandidate[] = [];
    const seen = new Set<string>();
    const questIds = Object.values(QuestUnlockables).filter(v => typeof v === "number") as any[];
    for (const questId of questIds) {
      try {
        const questUnlockData = gd.getQuestUnlockDataFromModifierTypes(questId as any);
        const rt: any = questUnlockData?.rewardType;
        const rid: any = questUnlockData?.rewardId;
        const ids: any[] = Array.isArray(rid) ? rid : [rid];
        const hasSpeciesId = ids.some(v => typeof v === "number");
        if (!hasSpeciesId) continue;

        const candidate: ForbiddenFormUnlockCandidate = { kind: "QUEST_FORM", questUnlockData } as any;
        const key = this.getForbiddenFormCandidateKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);

        if (
          rt === RewardType.GLITCH_FORM_A ||
          rt === RewardType.GLITCH_FORM_B ||
          rt === RewardType.GLITCH_FORM_C ||
          rt === RewardType.GLITCH_FORM_D ||
          rt === RewardType.GLITCH_FORM_E
        ) {
          glitch.push(candidate);
        } else if (rt === RewardType.SMITTY_FORM || rt === RewardType.SMITTY_FORM_B) {
          smitty.push(candidate);
        }
      } catch {
        continue;
      }
    }
    try {
      for (const [systemName, data] of Object.entries(modGlitchFormData || {})) {
        const d: any = data as any;
        if (!d || typeof d.speciesId !== "number" || !d.formName) continue;
        const candidate: ForbiddenFormUnlockCandidate = {
          kind: "MOD_FORM",
          systemName,
          speciesId: d.speciesId,
          formName: d.formName
        } as any;
        const key = this.getForbiddenFormCandidateKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        glitch.push(candidate);
      }
    } catch {
    }
    try {
      for (const f of universalSmittyForms || []) {
        const formName = (f as any)?.formName;
        if (!formName || typeof formName !== "string") continue;
        const candidate: ForbiddenFormUnlockCandidate = { kind: "UNI_SMITTY", formName } as any;
        const key = this.getForbiddenFormCandidateKey(candidate);
        if (seen.has(key)) continue;
        seen.add(key);
        smitty.push(candidate);
      }
    } catch {
    }

    glitch.sort((a, b) => this.getForbiddenFormCandidateKey(a).localeCompare(this.getForbiddenFormCandidateKey(b)));
    smitty.sort((a, b) => this.getForbiddenFormCandidateKey(a).localeCompare(this.getForbiddenFormCandidateKey(b)));
    return { glitch, smitty };
  }

  private getForbiddenFormRegistry(): { glitch: ForbiddenFormUnlockCandidate[]; smitty: ForbiddenFormUnlockCandidate[] } {
    if (SkillTreeModifierPhase.forbiddenFormRegistry) return SkillTreeModifierPhase.forbiddenFormRegistry;
    SkillTreeModifierPhase.forbiddenFormRegistry = this.buildForbiddenFormRegistry();
    return SkillTreeModifierPhase.forbiddenFormRegistry;
  }

  private isForbiddenFormCandidateUnlocked(c: ForbiddenFormUnlockCandidate): boolean {
    try {
      const gd: any = (this.scene as any).gameData;
      if (!gd) return true;

      if (c.kind === "MOD_FORM") {
        const sys = (c as any).systemName;
        return typeof sys === "string" ? gd.isModFormUnlocked(sys) : true;
      }
      if (c.kind === "UNI_SMITTY") {
        const name = (c as any).formName;
        return typeof name === "string" ? gd.isUniSmittyFormUnlocked(name) : true;
      }
      if (c.kind === "QUEST_FORM") {
        const q: any = (c as any).questUnlockData;
        const rt: any = q?.rewardType;
        const rid: any = q?.rewardId;
        const ids: any[] = Array.isArray(rid) ? rid : [rid];
        const speciesIds = ids.filter(v => typeof v === "number") as any[];
        if (!speciesIds.length) return true;
        return speciesIds.some(id => gd.canUseGlitchOrSmittyForm(id as Species, rt as any));
      }
    } catch {
    }
    return true;
  }

  private createRandomGlitchFormsForRunOptions(count: number): ModifierTypeOption[] {
    const { glitch, smitty } = this.getForbiddenFormRegistry();
    const availableGlitch = glitch.filter(c => !this.isForbiddenFormCandidateUnlocked(c));
    const availableSmitty = smitty.filter(c => !this.isForbiddenFormCandidateUnlocked(c));

    const party = this.scene.getParty();
    const teamSpeciesSet = this.getPartyEvolutionLineSpecies(party);
    const teamMatchedGlitch = availableGlitch.filter(c => {
      const sid = this.getCandidateSpeciesId(c);
      return sid !== null && teamSpeciesSet.has(sid);
    });
    const teamMatchedSmitty = availableSmitty.filter(c => {
      const sid = this.getCandidateSpeciesId(c);
      return sid !== null && teamSpeciesSet.has(sid);
    });

    const selected: ForbiddenFormUnlockCandidate[] = [];
    const selectedKeys = new Set<string>();
    const allPool = Utils.randSeedShuffle([...availableGlitch, ...availableSmitty]);
    const teamPool = Utils.randSeedShuffle([...teamMatchedGlitch, ...teamMatchedSmitty]);
    for (let i = 0; i < count && (allPool.length > 0 || teamPool.length > 0); i++) {
      const useTeam = Utils.randSeedInt(100) < 30 && teamPool.length > 0;
      const pool = useTeam ? teamPool : allPool;
      let picked = false;
      for (let j = 0; j < pool.length; j++) {
        const k = this.getForbiddenFormCandidateKey(pool[j]);
        if (selectedKeys.has(k)) continue;
        selectedKeys.add(k);
        selected.push(pool[j]);
        pool.splice(j, 1);
        picked = true;
        break;
      }
      if (!picked && useTeam) {
        for (let j = 0; j < allPool.length; j++) {
          const k = this.getForbiddenFormCandidateKey(allPool[j]);
          if (selectedKeys.has(k)) continue;
          selectedKeys.add(k);
          selected.push(allPool[j]);
          allPool.splice(j, 1);
          break;
        }
      }
    }

    if (!selected.length) return [];

    return selected.map(c => new ModifierTypeOption(new ForbiddenFormUnlockModifierType(c), 0, 0));
  }

  private getCandidateSpeciesId(c: ForbiddenFormUnlockCandidate): Species | null {
    if (c.kind === "MOD_FORM") return c.speciesId ?? null;
    if (c.kind === "QUEST_FORM") {
      const rid: any = c.questUnlockData?.rewardId;
      const ids: any[] = Array.isArray(rid) ? rid : [rid];
      const first = ids.find(v => typeof v === "number");
      return typeof first === "number" ? first as Species : null;
    }
    return null;
  }

  private getPartyEvolutionLineSpecies(party: PlayerPokemon[]): Set<Species> {
    const line = new Set<Species>();
    const walkForward = (id: Species) => {
      if (line.has(id)) return;
      line.add(id);
      for (const evo of (pokemonEvolutions[id] || [])) walkForward(evo.speciesId);
    };
    for (const p of party) {
      let cur = p.species.speciesId;
      while (pokemonPrevolutions[cur] !== undefined) cur = pokemonPrevolutions[cur];
      walkForward(cur);
      if (p.isFusion() && p.fusionSpecies) {
        let fCur = p.fusionSpecies.speciesId;
        while (pokemonPrevolutions[fCur] !== undefined) fCur = pokemonPrevolutions[fCur];
        walkForward(fCur);
      }
    }
    return line;
  }
  private isVictoryBountyGenerator(generator: QuestModifierTypeGenerator, party: PlayerPokemon[]): boolean {
    try {
      return generator.generateType(party)?.newModifier(this.scene) instanceof PermaWinQuestModifier;
    } catch {
      return false;
    }
  }

  private isCountdownWaveBountyGenerator(generator: QuestModifierTypeGenerator, party: PlayerPokemon[]): boolean {
    try {
      return generator.generateType(party)?.newModifier(this.scene) instanceof PermaCountdownWaveCheckQuestModifier;
    } catch {
      return false;
    }
  }

  private getBountyQuestSpecies(c: { consoleCode: string; generator: QuestModifierTypeGenerator }): Species | null {
    const rid: any = c.generator.config?.questUnlockData?.rewardId;
    const ids: any[] = Array.isArray(rid) ? rid : [rid];
    const first = ids.find(v => typeof v === "number");
    return typeof first === "number" ? first as Species : null;
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

  private createSignaturePokemonOption(species: Species): ModifierTypeOption | null {
    const generator = modifierTypes.CHAMPION_SIGNATURE_POKEMON(this.championData);
    const pokemonModifierType = generator.generateType(this.scene.getParty(), [species]);

    if (pokemonModifierType) {
      return new ModifierTypeOption(pokemonModifierType, 0, 0);
    }
    return null;
  }

  private createSignaturePokemonOptions(count: number = 4): ModifierTypeOption[] {
    ChampionUtils.syncChampionUnlocks(this.championData);
    const base = (this.championData.signaturePokemon || []) as Species[];
    const unlocked = ((this.championData as any).unlockedSignaturePokemon || []) as Species[];
    const combined = Array.from(new Set([...(unlocked || []), ...(base || [])]));

    let pool = combined;
    try {
      const genFilter = (this.championData as any)?.pokemonGenerationFilter as number[] | undefined;
      if (Array.isArray(genFilter) && genFilter.length > 0) {
        pool = combined.filter((s) => {
          try {
            const speciesData: any = getPokemonSpecies(s);
            const gen = speciesData?.generation;
            return typeof gen === "number" ? genFilter.includes(gen) : true;
          } catch {
            return true;
          }
        });
      }
    } catch {
      pool = combined;
    }

    const shuffledPool = Utils.randSeedShuffle(pool.length > 0 ? [...pool] : [...combined]);
    const fallbackSpecies = (this.node.rewardData as any)?.data?.species as Species | undefined;
    const finalPool = shuffledPool.length > 0
      ? shuffledPool
      : (fallbackSpecies ? [fallbackSpecies] : (base.length > 0 ? [Utils.randSeedItem(base)] : []));

    const options: ModifierTypeOption[] = [];
    if (finalPool.length === 0) return options;

    for (let i = 0; i < count; i++) {
      const species = finalPool[i % finalPool.length];
      const opt = this.createSignaturePokemonOption(species);
      if (opt) options.push(opt);
    }
    return options;
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
    try {
      const amount = this.node.rewardData?.data?.amount ?? 3000;
      const t = new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", amount, true);
      return t ? [new ModifierTypeOption(t, 0, 0)] : [];
    } catch {
      return [];
    }
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
  private createMasterBallOption(): ModifierTypeOption[] {
    const t = (modifierTypes as any).MASTER_BALL?.();
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

  private createVoidBallOption(): ModifierTypeOption[] {
    const t = (modifierTypes as any).VOID_BALL?.();
    return t ? [new ModifierTypeOption(t, 0, 0)] : [];
  }

  private createTypeBallOption(): ModifierTypeOption | null {
    const data = this.node.rewardData.data || {};
    const selectedType = data.ballType as Type | undefined;
    if (selectedType === undefined) return null;
    const t = new AddTypeBallModifierType(selectedType, 3);
    return new ModifierTypeOption(t, 0, 0);
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

  private createMultipleTrainerBondOptions(count: number = 3): ModifierTypeOption[] {
    const results: ModifierTypeOption[] = [];
    const baseOffset = (this.scene as any).rngOffset || 0;
    const usedAbilities = new Set<Abilities>();
    const gender = this.scene.gameData?.gender;
    const maxAttempts = count * 3;

    for (let i = 0; i < maxAttempts && results.length < count; i++) {
      let option: ModifierTypeOption | null = null;
      this.scene.executeWithSeedOffset(() => {
        const ability = SkillTreeSelectors.pickTrainerBondAbility(this.championData);
        if (usedAbilities.has(ability)) return;
        usedAbilities.add(ability);
        const gen = modifierTypes.TRAINER_BOND_ABILITY();
        const type = gen.generateType(this.scene.getParty(), [
          this.championData.id,
          ability,
          this.node.rewardData.data?.activationChance || 0.15,
          gender
        ]);
        if (type) {
          if (!type.id) type.withIdFromFunc(modifierTypes.TRAINER_BOND_ABILITY);
          option = new ModifierTypeOption(type, 0, 0);
        }
      }, baseOffset + i * 100);
      if (option) results.push(option);
    }

    if (results.length === 0) {
      const fallback = this.createTrainerBondAbilityOption();
      if (fallback) results.push(fallback);
    }

    return results;
  }

  private createStatBoostModifierOption(): ModifierTypeOption | null {
    const gen = modifierTypes.CHAMPION_POKEMON_STAT_BOOST();
    const championTypes = (this.championData.id === "red" && this.championData.unlockedTypeBoosters?.length) ? this.championData.unlockedTypeBoosters.filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[] : [this.championData.type1, this.championData.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
    const type = gen.generateType(this.scene.getParty(), [
      this.championData.id,
      this.node.rewardData.data.stats,
      this.node.rewardData.data.boostPercent || 0.03,
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
    if (!this.scene.moveUpgradesEnabledForRun) return null;
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
    if (!this.scene.moveUpgradesEnabledForRun) return null;
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
    const party = this.scene.getParty();
    const data = this.node.rewardData?.data || {};
    const isSignatureAltBuild = data.signatureAltBuild === true || !data.altBuildId;
    if (isSignatureAltBuild) {
      const sigSpeciesIds = party.filter(p => p.isSignature).map(p => p.species.speciesId);
      const unlocked = (this.championData.unlockedAltBuilds || []) as PokemonAltBuildId[];
      const eligible = unlocked
        .map((id) => ({ id, def: POKEMON_ALT_BUILDS[id] }))
        .filter(x => x.def?.species && sigSpeciesIds.includes(x.def.species))
        .map((x) => {
          const matchingPokemon = party.find(p => p.altBuildId === x.id);
          const currentRank = matchingPokemon?.altBuildRank ?? 0;
          const nextRank = currentRank + 1;
          return { id: x.id, def: x.def as PokemonAltBuildDefinition, nextRank };
        })
        .filter(x => x.nextRank >= 1 && x.nextRank <= 10)
        .filter(x => {
          const prereqs = x.def?.prerequisiteBuilds || [];
          if (!prereqs.length) return true;
          if (x.nextRank !== 1) return true;
          const prereqId = prereqs[0];
          const prereqDef = POKEMON_ALT_BUILDS[prereqId];
          const prereqSpecies = prereqDef?.species;
          if (prereqSpecies) {
            return party.some(p =>
              (p.species.speciesId === prereqSpecies && p.altBuildId === prereqId) ||
              (p.isFusion() && p.fusionSpecies?.speciesId === prereqSpecies && p.altBuildId === prereqId)
            );
          }
          return party.some(p => p.altBuildId === prereqId);
        });
      if (eligible.length === 0) {
        return null;
      }
      const picked = Utils.randSeedItem(eligible);
      const gen = modifierTypes.POKEMON_ALT_BUILD();
      const type = gen.generateType(party, [picked.id, picked.nextRank]);
      if (type && !type.id) {
        type.withIdFromFunc(modifierTypes.POKEMON_ALT_BUILD);
      }
      return type ? new ModifierTypeOption(type, 0, 0) : null;
    }
    const altBuildId = data.altBuildId as PokemonAltBuildId;
    const storedRank = data.rank || 1;
    let proposedRank = storedRank;
    const matchingPokemon = party.find(p => p.altBuildId === altBuildId);
    if (matchingPokemon && matchingPokemon.altBuildRank) {
      proposedRank = Math.max((matchingPokemon.altBuildRank || 0) + 1, storedRank);
    }
    if (proposedRank > 10) {
      const rarerCandyType = modifierTypes.RARER_CANDY?.();
      return rarerCandyType ? new ModifierTypeOption(rarerCandyType, 0, 0) : null;
    }
    const effectiveRank = Math.min(10, proposedRank);
    const altBuildDef = POKEMON_ALT_BUILDS[altBuildId];
    if (!altBuildDef) {
      return null;
    }
    if (altBuildDef.prerequisiteBuilds && altBuildDef.prerequisiteBuilds.length > 0) {
      if (effectiveRank === 1) {
        const prereqId = altBuildDef.prerequisiteBuilds[0];
        const prereqDef = POKEMON_ALT_BUILDS[prereqId];
        const prereqSpecies = prereqDef?.species;
        let hasPrereq = false;
        if (prereqSpecies) {
          hasPrereq = party.some(p =>
            (p.species.speciesId === prereqSpecies && p.altBuildId === prereqId) ||
            (p.isFusion() && p.fusionSpecies?.speciesId === prereqSpecies && p.altBuildId === prereqId)
          );
        } else {
          hasPrereq = party.some(p => p.altBuildId === prereqId);
        }
        if (!hasPrereq) {
          return null;
        }
      } else {
        const requiredPreviousRank = effectiveRank - 1;
        const hasPrereq = party.some(p => p.altBuildId === altBuildId && (p.altBuildRank || 0) >= requiredPreviousRank);
        if (!hasPrereq) {
          return null;
        }
      }
    } else if (altBuildDef.species) {
      const s = altBuildDef.species;
      const has = party.some(p => p.species.speciesId === s || (p.isFusion() && p.fusionSpecies?.speciesId === s));
      if (!has) {
        return null;
      }
    }
    const gen = modifierTypes.POKEMON_ALT_BUILD();
    const type = gen.generateType(party, [altBuildId, effectiveRank]);
    if (type && !type.id) {
      type.withIdFromFunc(modifierTypes.POKEMON_ALT_BUILD);
    }
    return type ? new ModifierTypeOption(type, 0, 0) : null;
  }

  private createPermaItemOption(): ModifierTypeOption | null {
    const permaTypeRaw = (this.node.rewardData.data as any)?.permaType;
    const permaTypeKey = typeof permaTypeRaw === "string" ? permaTypeRaw : PermaType[permaTypeRaw as PermaType];
    const permaFactory = permaTypeKey ? ((modifierTypes as any)[permaTypeKey] as (() => any) | undefined) : undefined;
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

    return isPokemonSelectionComplete(activeSkillTree, nodes);
  }

  private returnToSkillTree(): void {
    this.scene.skillTreeModifierContext = false;
    if (!this.scene.reroll) {
      this.removePlaceholderPokemon();
    }

    const originalConfig = (this.scene.gameData as any).tempSkillTreeConfig as SkillTreeConfig;
    try {
      const gd = this.scene.gameData as any;
      gd.tempSkillTreeTransform = gd.tempSkillTreeTransform || {};
      const nodeId = (this.node as any)?.id;
      if (nodeId) {
        gd.tempSkillTreeTransform.purchasedNodeId = nodeId;
      }
    } catch {}

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

          const isJourneyTree = nodes.some((n: any) => n?.id?.startsWith("depth1_journey_mystery_"));
          if (isJourneyTree) {
            const primaryMysteryNodes = nodes.filter((n: any) =>
              n?.id?.match(/^depth1_journey_mystery_[012]$/) &&
              !activeSkillTree.unlockedNodes.has(n.id)
            );
            primaryMysteryNodes.forEach((node: any) => {
              activeSkillTree.unlockedNodes.add(node.id);
              node.state = SkillTreeNodeState.UNLOCKED;
              node.unlocked = true;
            });
          }
        }
      }

      const phaseConfig: SkillTreePhaseConfig = {
        mode: (originalConfig.mode === SkillTreeMode.POKEMON_SELECTION || originalConfig.mode === "POKEMON_SELECTION")
          ? (isPokemonSelectionComplete
              ? SkillTreeMode.INITIAL_ACCESS
              : SkillTreeMode.POKEMON_SELECTION)
          : originalConfig.mode,
        requiredSelections: originalConfig.requiredSelections,
        shouldPlayPurchaseAnimation: true,
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
      const effectiveWave = this.scene.battlePathWave
        || this.scene.gameData?.gameStats?.highestWaveReached
        || 1;
      this.scene.currentBattle = new Battle(
        getGameMode(GameModes.CLASSIC),
        effectiveWave,
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
        const removeAll = (ctorName: string) => {
          while (this.scene.tryRemovePhase(p => p.constructor?.name === ctorName)) {}
        };
        removeAll("TurnInitPhase");
        removeAll("CommandPhase");
        removeAll("EnemyCommandPhase");
        removeAll("TurnStartPhase");
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

  private createMultipleTeraAbilityOptions(count: number = 3): ModifierTypeOption[] {
    const results: ModifierTypeOption[] = [];
    const baseOffset = (this.scene as any).rngOffset || 0;
    const usedAbilities = new Set<Abilities>();
    const championTypes = (this.championData.id === "red" && this.championData.unlockedTypeBoosters?.length) ? this.championData.unlockedTypeBoosters.filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[] : [this.championData.type1, this.championData.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
    const maxAttempts = count * 3;

    for (let i = 0; i < maxAttempts && results.length < count; i++) {
      let option: ModifierTypeOption | null = null;
      this.scene.executeWithSeedOffset(() => {
        const ability = SkillTreeSelectors.pickTrainerBondAbility(this.championData);
        if (usedAbilities.has(ability)) return;
        usedAbilities.add(ability);
        const teraType = championTypes.length > 0 ? Utils.randSeedItem(championTypes) : Type.NORMAL;
        const gen = modifierTypes.TERA_ABILITY();
        const type = gen.generateType(this.scene.getParty(), [
          this.championData.id,
          ability,
          teraType,
          this.node.rewardData.data?.activationChance || 0.10
        ]);
        if (type) {
          if (!type.id) type.withIdFromFunc(modifierTypes.TERA_ABILITY);
          option = new ModifierTypeOption(type, 0, 0);
        }
      }, baseOffset + i * 100);
      if (option) results.push(option);
    }

    if (results.length === 0) {
      const fallback = this.createTeraAbilityOption();
      if (fallback) results.push(fallback);
    }

    return results;
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

  private createMultipleTypeSwitcherOptions(count: number = 3): ModifierTypeOption[] {
    const results: ModifierTypeOption[] = [];
    const baseOffset = (this.scene as any).rngOffset || 0;
    const champTypes = (this.championData.id === "red" && this.championData.unlockedTypeBoosters?.length) ? this.championData.unlockedTypeBoosters.filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[] : [this.championData.type1, this.championData.type2].filter(t => t !== undefined && t !== null && t !== Type.UNKNOWN) as Type[];
    const allTypes = Utils.getEnumValues(Type).filter((v: number) => v >= Type.NORMAL && v <= Type.FAIRY) as Type[];

    type ComboSpec = { primary: Type | null; secondary: Type | null; needsRandom: "primary" | "secondary" | null };
    const comboPool: ComboSpec[] = [];
    for (const ct of champTypes) {
      comboPool.push({ primary: ct, secondary: null, needsRandom: null });
      comboPool.push({ primary: null, secondary: ct, needsRandom: null });
      comboPool.push({ primary: ct, secondary: null, needsRandom: "secondary" });
      comboPool.push({ primary: null, secondary: ct, needsRandom: "primary" });
    }
    for (let i = 0; i < champTypes.length; i++) {
      for (let j = i + 1; j < champTypes.length; j++) {
        comboPool.push({ primary: champTypes[i], secondary: champTypes[j], needsRandom: null });
      }
    }

    for (let i = 0; i < count; i++) {
      let option: ModifierTypeOption | null = null;
      this.scene.executeWithSeedOffset(() => {
        if (comboPool.length === 0) return;
        const combo = Utils.randSeedItem(comboPool);
        let primary = combo.primary;
        let secondary = combo.secondary;

        if (combo.needsRandom === "primary") {
          const exclude = secondary != null ? [secondary] : [];
          const pool = allTypes.filter(t => !exclude.includes(t));
          primary = Utils.randSeedItem(pool);
        } else if (combo.needsRandom === "secondary") {
          const exclude = primary != null ? [primary] : [];
          const pool = allTypes.filter(t => !exclude.includes(t));
          secondary = Utils.randSeedItem(pool);
        }

        const type = new TypeSwitcherModifierType(primary, secondary);
        if (type) {
          if (!type.id) type.withIdFromFunc((modifierTypes as any).TYPE_SWITCHER);
          option = new ModifierTypeOption(type, 0, 0);
        }
      }, baseOffset + i * 100);
      if (option) results.push(option);
    }

    if (results.length === 0) {
      const fallback = this.createTypeSwitcherOption();
      if (fallback) results.push(fallback);
    }

    return results;
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
        const ast = this.scene.gameData.activeSkillTree;
        if (formName && ast) {
            if (!Array.isArray(ast.unlockedGlitchForms)) {
                ast.unlockedGlitchForms = [];
            }
            if (!ast.unlockedGlitchForms.includes(formName)) {
                ast.unlockedGlitchForms.push(formName);
            }
        }

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

  private grantPermaMoneyImmediate(): void {
    const amount = this.node.rewardData?.data?.amount ?? 3000;
    const t = new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", amount, true);
    this.scene.ui.setMode(Mode.REWARD_OBTAINED, { type: RewardObtainedType.MODIFIER, name: t.name, modifierType: t, isInverted: t.isInverted, skillTreeRarity: this.node.rarity } as any);
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