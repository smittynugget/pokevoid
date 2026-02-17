import BattleScene from "../battle-scene";
import { TrainerType } from "#enums/trainer-type";
import Trainer, { TrainerVariant } from "../field/trainer";
import {
  RivalTrainerType,
  scaleTrainerParty,
  TrainerConfig,
  trainerConfigs,
} from "../data/trainer-config";

export default class TrainerData {
  public trainerType: TrainerType;
  public variant: TrainerVariant;
  public partyTemplateIndex: integer;
  public name: string;
  public partnerName: string;
  public dynamicRivalType: RivalTrainerType | null;
  public rivalStage: number;
  public rivalConfig: TrainerConfig | undefined;
  public isCorrupted: boolean;
  public smittyVariantIndex?: number;

  constructor(source: Trainer | any) {
    const sourceTrainer = source instanceof Trainer ? source as Trainer : null;
    this.trainerType = sourceTrainer ? sourceTrainer.config.trainerType : source.trainerType;
    this.variant = source.hasOwnProperty("variant") ? source.variant : source.female ? TrainerVariant.FEMALE : TrainerVariant.DEFAULT;
    this.partyTemplateIndex = source.partyMemberTemplateIndex;
    this.name = source.name;
    this.partnerName = source.partnerName;
    this.dynamicRivalType = sourceTrainer ? sourceTrainer.dynamicRivalType : source.dynamicRivalType;
    this.rivalStage = source.rivalStage || -1;
    this.isCorrupted = source.isCorrupted || false;
    const smittyIdx =
      sourceTrainer?.config?.smittyVariantIndex ??
      (sourceTrainer as any)?.rivalConfig?.smittyVariantIndex ??
      source?.smittyVariantIndex ??
      source?.rivalConfig?.smittyVariantIndex;
    if (typeof smittyIdx === "number" && Number.isFinite(smittyIdx)) {
      this.smittyVariantIndex = smittyIdx;
    }
    if (source.rivalConfig) {
      if (sourceTrainer?.rivalConfig instanceof TrainerConfig) {
        this.rivalConfig = sourceTrainer.rivalConfig;
      } else {
        const baseConfig = trainerConfigs[source.rivalConfig.trainerType];
        if (baseConfig) {
          const reconstructedConfig = Object.create(baseConfig);
          if (source.rivalConfig.encounterMessages) reconstructedConfig.encounterMessages = source.rivalConfig.encounterMessages;
          if (source.rivalConfig.victoryMessages) reconstructedConfig.victoryMessages = source.rivalConfig.victoryMessages;
          if (source.rivalConfig.defeatMessages) reconstructedConfig.defeatMessages = source.rivalConfig.defeatMessages;
          this.rivalConfig = reconstructedConfig;
        }
      }
    }
  }

  toTrainer(scene: BattleScene): Trainer {

    let trainer: Trainer;

    if (this.trainerType === TrainerType.SMITTY) {
      const cfg = new TrainerConfig(TrainerType.SMITTY);
      const idx = typeof this.smittyVariantIndex === "number" && Number.isFinite(this.smittyVariantIndex) ? this.smittyVariantIndex : 0;
      cfg.smittyVariantIndex = idx;
      const stage = this.rivalStage >= 1 ? this.rivalStage : 6;
      trainer = new Trainer(
        scene,
        TrainerType.SMITTY,
        this.variant,
        this.partyTemplateIndex,
        this.name,
        this.partnerName,
        cfg,
        stage,
        false
      );
    } else {
      trainer = new Trainer(
        scene,
        this.trainerType,
        this.variant,
        this.partyTemplateIndex,
        this.name,
      this.partnerName,
        this.rivalConfig = this.rivalConfig ? scaleTrainerParty(this.rivalConfig, this.rivalStage, this.rivalConfig.trainerType as RivalTrainerType, scene, true)  : undefined,
        this.rivalStage,
        this.isCorrupted
      );
    }

    return trainer;
  }
}