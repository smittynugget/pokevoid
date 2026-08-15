import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import * as Utils from "#app/utils.js";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase.js";
import { RandomRankUpPhase } from "#app/phases/random-rank-up-phase.js";
import { YuMovePhase } from "#app/phases/yu-move-phase.js";
import { MessagePhase } from "#app/phases/message-phase.js";
import {
  PermaMoneyModifierType,
  EssenceBundleRewardModifierType,
  SkillPointRewardModifierType,
  createModifierTypeOption,
  modifierTypes,
  ModifierTypeOption,
  PathNodeTypeFilter,
  PermaModifierTypeGenerator,
} from "#app/modifier/modifier-type.js";
import { PermaWinQuestModifier } from "#app/modifier/modifier.js";
import { getRandomPermaModifierKey } from "#app/phases/modifier-reward-phase.js";
import { getYuMoveRange, pickThreeYuMovesWithFallback } from "#app/data/yu-move-utils.js";
import { isDuelmonSpecies } from "#app/data/duelmon-rankups.js";
import { PlayerPokemon } from "#app/field/pokemon.js";
import { Type } from "#app/data/type.js";
import { SkillTreeSelectors } from "#app/system/skill-tree-selectors.js";
import { ChampionManager } from "#app/system/champion-manager.js";
import { PlayableChampionData } from "#app/system/playable-champions.js";
import i18next from "i18next";
import Overrides from "#app/overrides";

export enum BountyRewardType {
  STANDARD_MODIFIER_SELECT,
  MASTERBALL_RARITY_SELECT,
  RANDOM_RANK_UP,
  DUELMON_RANDOM_MOVE,
}

export function isVictoryBountyModifier(modifier: unknown): modifier is PermaWinQuestModifier {
  return modifier instanceof PermaWinQuestModifier;
}

export class BountyRewardPhase extends Phase {
  private static readonly BOUNTY_RANDOM_RANK_UP_BAND = 99;
  private static readonly DEFAULT_REROLL_COST_MULTIPLIER = 3;
  private static readonly RIVAL_REROLL_COST_MULTIPLIER = 5;

  private readonly isVictoryBounty: boolean;
  private readonly isRivalBounty: boolean;
  private readonly rerollMultiplier: number;

  constructor(scene: BattleScene, isVictoryBounty: boolean = false, isRivalBounty: boolean = false) {
    super(scene);
    this.isVictoryBounty = isVictoryBounty;
    this.isRivalBounty = isRivalBounty;
    this.rerollMultiplier = isRivalBounty
      ? BountyRewardPhase.RIVAL_REROLL_COST_MULTIPLIER
      : BountyRewardPhase.DEFAULT_REROLL_COST_MULTIPLIER;
  }

  start(): void {
    super.start();
    const rewardType = this.rollBountyReward();
    this.dispatchByRewardType(rewardType);
  }

  rollBountyReward(): BountyRewardType {
    if (this.isRivalBounty) {
      return BountyRewardType.STANDARD_MODIFIER_SELECT;
    }
    if (Overrides.FORCE_BOUNTY_COMPLETION_OVERRIDE) {
      const types = [
        BountyRewardType.DUELMON_RANDOM_MOVE,
        BountyRewardType.RANDOM_RANK_UP,
        BountyRewardType.MASTERBALL_RARITY_SELECT,
        BountyRewardType.STANDARD_MODIFIER_SELECT
      ];
      return types[Utils.randSeedInt(types.length)];
    }
    const roll = Utils.randSeedInt(1000);
    if (roll < 5) {
      return BountyRewardType.DUELMON_RANDOM_MOVE;
    }
    if (roll < 10) {
      return BountyRewardType.RANDOM_RANK_UP;
    }
    if (roll < 15) {
      return BountyRewardType.MASTERBALL_RARITY_SELECT;
    }
    return BountyRewardType.STANDARD_MODIFIER_SELECT;
  }

  private dispatchByRewardType(rewardType: BountyRewardType): void {
    switch (rewardType) {
      case BountyRewardType.DUELMON_RANDOM_MOVE:
        if (!this.tryGrantYuMoveBountyReward()) {
          this.dispatchStandardReward(true);
        } else {
          this.end();
        }
        break;
      case BountyRewardType.RANDOM_RANK_UP:
        if (!this.queueBountyRandomRankUp()) {
          this.dispatchStandardReward(true);
        } else {
          this.end();
        }
        break;
      case BountyRewardType.MASTERBALL_RARITY_SELECT:
        this.dispatchMasterballReward();
        break;
      case BountyRewardType.STANDARD_MODIFIER_SELECT:
      default:
        this.dispatchStandardReward(false);
        break;
    }
  }

  private dispatchStandardReward(fallback: boolean): void {
    const options = this.buildStandardModifierOptions();
    if (options.length === 0) {
      const omegaGold = new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 2500, true);
      options.push(new ModifierTypeOption(omegaGold, 0, 0));
    }
    const isVictory = this.isVictoryBounty;
    const scene = this.scene;
    this.scene.unshiftPhase(new SelectModifierPhase(
      this.scene,
      0,
      undefined,
      false,
      undefined,
      PathNodeTypeFilter.NONE,
      0,
      options,
      undefined,
      undefined,
      this.rerollMultiplier,
      () => BountyRewardPhase.buildStandardModifierOptionsStatic(scene, isVictory)
    ));
    this.enqueueCompletionFanfare(BountyRewardType.STANDARD_MODIFIER_SELECT, fallback);
    this.end();
  }

  private dispatchMasterballReward(): void {
    this.scene.unshiftPhase(new SelectModifierPhase(
      this.scene,
      0,
      undefined,
      false,
      undefined,
      PathNodeTypeFilter.MASTER_BALL_ITEMS,
      0,
      undefined,
      undefined,
      undefined,
      this.rerollMultiplier
    ));
    this.enqueueCompletionFanfare(BountyRewardType.MASTERBALL_RARITY_SELECT);
    this.end();
  }

  private queueBountyRandomRankUp(): boolean {
    const band = BountyRewardPhase.BOUNTY_RANDOM_RANK_UP_BAND;
    const candidates = this.scene.getParty().filter(p => {
      if (p.isEvolutionLocked()) {
        return false;
      }
      if (p.getSpeciesForm().baseTotal >= 800) {
        return false;
      }
      if (p.randomRankUpBandUsed === band) {
        return false;
      }
      if (p.randomRankUpBandPending === band) {
        return false;
      }
      return true;
    }) as PlayerPokemon[];

    if (!candidates.length) {
      return false;
    }

    let pokemon: PlayerPokemon | null = null;
    this.scene.executeWithSeedOffset(() => {
      pokemon = Utils.randSeedItem(candidates);
    }, (this.scene.currentBattle?.waveIndex ?? 0) as integer, this.scene.waveSeed);

    if (!pokemon) {
      return false;
    }

    pokemon.randomRankUpBandPending = band;
    this.scene.unshiftPhase(new RandomRankUpPhase(this.scene, pokemon, pokemon.level, band));
    this.enqueueCompletionFanfare(BountyRewardType.RANDOM_RANK_UP);
    return true;
  }

  private tryGrantYuMoveBountyReward(): boolean {
    const range = getYuMoveRange(this.scene);
    if (range < 0) {
      return false;
    }

    const target = this.pickEligibleDuelmonForYuMove();
    if (!target) {
      return false;
    }

    const choices = pickThreeYuMovesWithFallback(this.scene, target);
    if (choices.length < 1) {
      return false;
    }

    this.scene.unshiftPhase(new YuMovePhase(this.scene, target, choices, () => {
      target.yuMoveRangeUsed = range;
      target.yuMoveRangePending = null;
    }, false));
    this.enqueueCompletionFanfare(BountyRewardType.DUELMON_RANDOM_MOVE);
    return true;
  }

  pickEligibleDuelmonForYuMove(): PlayerPokemon | null {
    const range = getYuMoveRange(this.scene);
    if (range < 0) {
      return null;
    }

    const candidates = this.scene.getParty().filter(
      p => isDuelmonSpecies(p.species.speciesId)
        && p.yuMoveRangeUsed !== range
    ) as PlayerPokemon[];

    if (!candidates.length) {
      return null;
    }

    let picked: PlayerPokemon | null = null;
    this.scene.executeWithSeedOffset(() => {
      picked = Utils.randSeedItem(candidates);
    }, (this.scene.currentBattle?.waveIndex ?? 0) as integer, this.scene.waveSeed);
    return picked;
  }

  private buildStandardModifierOptions(): ModifierTypeOption[] {
    const builders: Array<() => ModifierTypeOption | null> = [
      () => new ModifierTypeOption(
        new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 2500, true),
        0,
        0
      ),
      () => this.createRandomPermaItemOption(),
    ];

    if (!this.isVictoryBounty) {
      builders.push(() => {
        const relicGold = modifierTypes.RELIC_GOLD();
        return relicGold ? new ModifierTypeOption(relicGold, 0, 0) : null;
      });
      builders.push(() => new ModifierTypeOption(
        new SkillPointRewardModifierType("modifierType:ModifierType.SKILL_POINTS", "ribbon_gen9", 3),
        0,
        0
      ));
    }

    builders.push(() => createModifierTypeOption(modifierTypes.PERMA_PARTY_ABILITY, 0, 0, this.scene));
    builders.push(() => this.createEssenceBundleOption());

    const shuffled = Utils.randSeedShuffle([...builders]);
    const options: ModifierTypeOption[] = [];
    const seen = new Set<string>();

    for (const builder of shuffled) {
      if (options.length >= 3) {
        break;
      }
      const opt = builder();
      if (!opt?.type) {
        continue;
      }
      const key = opt.type.id ?? opt.type.name;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      options.push(opt);
    }

    let safety = 0;
    while (options.length < 3 && safety < builders.length * 2) {
      safety++;
      const opt = builders[safety % builders.length]();
      if (!opt?.type) {
        continue;
      }
      const key = opt.type.id ?? opt.type.name;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      options.push(opt);
    }

    return options;
  }

  private createRandomPermaItemOption(): ModifierTypeOption | null {
    const excluded = new Set(["PERMA_MONEY", "PERMA_COLLECTED_TYPE", "PERMA_PARTY_ABILITY"]);
    let attempts = 0;
    while (attempts < 20) {
      attempts++;
      const key = getRandomPermaModifierKey();
      if (excluded.has(key) || key.includes("MONEY")) {
        continue;
      }
      const factory = modifierTypes[key as keyof typeof modifierTypes];
      if (!factory) {
        continue;
      }
      const generator = factory();
      if (!(generator instanceof PermaModifierTypeGenerator)) {
        continue;
      }
      const type = generator.generateType(this.scene.getParty());
      if (!type) {
        continue;
      }
      if (!type.id) {
        type.withIdFromFunc(factory);
      }
      return new ModifierTypeOption(type, 0, 0);
    }
    return null;
  }

  private createEssenceBundleOption(): ModifierTypeOption | null {
    const championData = this.getChampionData();
    const bundle = SkillTreeSelectors.pickEssenceBundle(championData);
    const essType = new EssenceBundleRewardModifierType(
      "skillTree:rewards.essenceBundle",
      "modSoulCollected",
      bundle.type,
      bundle.amount,
      "glitch"
    );
    return new ModifierTypeOption(essType, 0, 0);
  }

  private getChampionData(): PlayableChampionData {
    const championId = this.scene.gameData.activeSkillTree?.championId;
    if (championId) {
      try {
        return ChampionManager.getInstance().getChampionData(championId);
      } catch {
      }
    }
    return {
      id: championId ?? "unknown",
      type1: Type.NORMAL,
      type2: null,
      signaturePokemon: [],
    } as PlayableChampionData;
  }

  private getCompletionFanfareText(rewardType: BountyRewardType, fallback: boolean): string {
    const title = i18next.t("questUi:bounty.skillTree.completion.title", { defaultValue: "Bounty Complete!" });
    let key: string;
    if (fallback) {
      key = "fallback";
    } else {
      switch (rewardType) {
        case BountyRewardType.STANDARD_MODIFIER_SELECT:
          key = "standardReward";
          break;
        case BountyRewardType.MASTERBALL_RARITY_SELECT:
          key = "rareReward";
          break;
        case BountyRewardType.RANDOM_RANK_UP:
          key = "veryRareRankUp";
          break;
        case BountyRewardType.DUELMON_RANDOM_MOVE:
          key = "veryRareMove";
          break;
        default:
          key = "fallback";
      }
    }
    const subtitle = i18next.t(`questUi:bounty.skillTree.completion.${key}`, { defaultValue: "Choose your reward!" });
    return `${title}\n${subtitle}`;
  }

  private enqueueCompletionFanfare(rewardType: BountyRewardType, fallback: boolean = false): void {
    const text = this.getCompletionFanfareText(rewardType, fallback);
    this.scene.unshiftPhase(new MessagePhase(this.scene, text, null, true));
  }

  public static buildStandardModifierOptionsStatic(scene: BattleScene, isVictoryBounty: boolean): ModifierTypeOption[] {
    const builders: Array<() => ModifierTypeOption | null> = [
      () => new ModifierTypeOption(
        new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 2500, true),
        0,
        0
      ),
      () => {
        const excluded = new Set(["PERMA_MONEY", "PERMA_COLLECTED_TYPE", "PERMA_PARTY_ABILITY"]);
        let attempts = 0;
        while (attempts < 20) {
          attempts++;
          const key = getRandomPermaModifierKey();
          if (excluded.has(key) || key.includes("MONEY")) {
            continue;
          }
          const factory = modifierTypes[key as keyof typeof modifierTypes];
          if (!factory) {
            continue;
          }
          const generator = factory();
          if (!(generator instanceof PermaModifierTypeGenerator)) {
            continue;
          }
          const type = generator.generateType(scene.getParty());
          if (!type) {
            continue;
          }
          if (!type.id) {
            type.withIdFromFunc(factory);
          }
          return new ModifierTypeOption(type, 0, 0);
        }
        return null;
      },
    ];

    if (!isVictoryBounty) {
      builders.push(() => {
        const relicGold = modifierTypes.RELIC_GOLD();
        return relicGold ? new ModifierTypeOption(relicGold, 0, 0) : null;
      });
      builders.push(() => new ModifierTypeOption(
        new SkillPointRewardModifierType("modifierType:ModifierType.SKILL_POINTS", "ribbon_gen9", 3),
        0,
        0
      ));
    }

    builders.push(() => createModifierTypeOption(modifierTypes.PERMA_PARTY_ABILITY, 0, 0, scene));

    const championId = scene.gameData.activeSkillTree?.championId;
    let championData: PlayableChampionData;
    if (championId) {
      try {
        championData = ChampionManager.getInstance().getChampionData(championId);
      } catch {
        championData = { id: championId, type1: Type.NORMAL, type2: null, signaturePokemon: [] } as PlayableChampionData;
      }
    } else {
      championData = { id: "unknown", type1: Type.NORMAL, type2: null, signaturePokemon: [] } as PlayableChampionData;
    }
    builders.push(() => {
      const bundle = SkillTreeSelectors.pickEssenceBundle(championData);
      const essType = new EssenceBundleRewardModifierType(
        "skillTree:rewards.essenceBundle",
        "modSoulCollected",
        bundle.type,
        bundle.amount,
        "glitch"
      );
      return new ModifierTypeOption(essType, 0, 0);
    });

    const shuffled = Utils.randSeedShuffle([...builders]);
    const options: ModifierTypeOption[] = [];
    const seen = new Set<string>();

    for (const builder of shuffled) {
      if (options.length >= 3) {
        break;
      }
      const opt = builder();
      if (!opt?.type) {
        continue;
      }
      const key = opt.type.id ?? opt.type.name;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      options.push(opt);
    }

    let safety = 0;
    while (options.length < 3 && safety < builders.length * 2) {
      safety++;
      const opt = builders[safety % builders.length]();
      if (!opt?.type) {
        continue;
      }
      const key = opt.type.id ?? opt.type.name;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      options.push(opt);
    }

    if (options.length === 0) {
      options.push(new ModifierTypeOption(
        new PermaMoneyModifierType("modifierType:common:permaMoney", "coin", 2500, true),
        0,
        0
      ));
    }

    return options;
  }
}

export default BountyRewardPhase;