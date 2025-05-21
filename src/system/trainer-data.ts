import BattleScene from "../battle-scene";
import { TrainerType } from "#enums/trainer-type";
import Trainer, { TrainerVariant } from "../field/trainer";
import {
  RivalTrainerType,
  scaleTrainerParty,
  TrainerConfig,
  trainerConfigs,
  trainerPartyTemplates
} from "../data/trainer-config";
import { createSmittyBattle } from "#app/battle.ts";

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
    if (source.rivalConfig) {
      if (sourceTrainer?.rivalConfig instanceof TrainerConfig) {
        this.rivalConfig = sourceTrainer.rivalConfig;
      } else {
        const baseConfig = trainerConfigs[source.rivalConfig.trainerType];
        if (baseConfig) {
          const reconstructedConfig = new TrainerConfig(source.rivalConfig.trainerType);
          
          reconstructedConfig.encounterMessages = source.rivalConfig.encounterMessages;
          reconstructedConfig.victoryMessages = source.rivalConfig.victoryMessages;
          reconstructedConfig.defeatMessages = source.rivalConfig.defeatMessages;
          this.rivalConfig = reconstructedConfig;

        }
      }
    }
  }

  toTrainer(scene: BattleScene): Trainer {

    let trainer: Trainer;

    if (this.trainerType === TrainerType.SMITTY) {
      trainer = createSmittyBattle(scene, scene.gameData.nightmareBattleSeeds.smittySeed).getTrainer(scene);
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
