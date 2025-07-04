import BattleScene from "../battle-scene";
import i18next from "i18next";
import { AchvTier, achvs, getAchievementDescription } from "./achv";
import { PlayerGender } from "#enums/player-gender";
import { TrainerType } from "#enums/trainer-type";
import { ConditionFn } from "#app/@types/common.js";
import { trainerConfigs } from "#app/data/trainer-config.js";

export enum VoucherType {
  REGULAR,
  PLUS,
  PREMIUM,
  GOLDEN
}

export class Voucher {
  public id: string;
  public voucherType: VoucherType;
  public description: string;

  private conditionFunc: ConditionFn | undefined;

  constructor(voucherType: VoucherType, description: string, conditionFunc?: ConditionFn) {
    this.description = description;
    this.voucherType = voucherType;
    this.conditionFunc = conditionFunc;
  }

  validate(scene: BattleScene, args?: any[]): boolean {
    return !this.conditionFunc || this.conditionFunc(scene, args);
  }

  /**
   * Get the name of the voucher
   * @param playerGender - this is ignored here. It's only there to match the signature of the function in the Achv class
   * @returns the name of the voucher
   */
  getName(playerGender: PlayerGender): string {
    return getVoucherTypeName(this.voucherType);
  }

  getIconImage(): string {
    return getVoucherTypeIcon(this.voucherType);
  }

  getTier(): AchvTier {
    switch (this.voucherType) {
      case VoucherType.REGULAR:
        return AchvTier.COMMON;
      case VoucherType.PLUS:
        return AchvTier.GREAT;
      case VoucherType.PREMIUM:
        return AchvTier.ULTRA;
      case VoucherType.GOLDEN:
        return AchvTier.ROGUE;
    }
  }
}

export function getVoucherTypeName(voucherType: VoucherType): string {
  switch (voucherType) {
    case VoucherType.REGULAR:
      return i18next.t("voucher:eggVoucher");
    case VoucherType.PLUS:
      return i18next.t("voucher:eggVoucherPlus");
    case VoucherType.PREMIUM:
      return i18next.t("voucher:eggVoucherPremium");
    case VoucherType.GOLDEN:
      return i18next.t("voucher:eggVoucherGold");
  }
}

export function getVoucherTypeIcon(voucherType: VoucherType): string {
  switch (voucherType) {
    case VoucherType.REGULAR:
      return "coupon";
    case VoucherType.PLUS:
      return "pair_of_tickets";
    case VoucherType.PREMIUM:
      return "mystic_ticket";
    case VoucherType.GOLDEN:
      return "golden_mystic_ticket";
  }
}

export interface Vouchers {
  [key: string]: Voucher;
}

export const vouchers: Vouchers = {};

export function initVouchers() {
  for (const achv of [achvs.CLASSIC_VICTORY]) {
      const voucherType = achv.score >= 150
          ? VoucherType.PREMIUM
          : achv.score >= 100
              ? VoucherType.PLUS
              : VoucherType.REGULAR;
      vouchers[achv.id] = new Voucher(voucherType, getAchievementDescription(achv.localizationKey));
    }

    const bossTrainerTypes = Object.keys(trainerConfigs)
    .filter(tt => trainerConfigs[tt].isBoss && trainerConfigs[tt].getDerivedType() !== TrainerType.RIVAL && trainerConfigs[tt].hasVoucher);

    for (const trainerType of bossTrainerTypes) {
      const voucherType = trainerConfigs[trainerType].moneyMultiplier < 10
          ? VoucherType.REGULAR
          : VoucherType.PLUS;
      const key = TrainerType[trainerType];
      const trainerName = trainerConfigs[trainerType].name;
      const trainer = trainerConfigs[trainerType];
      const title = trainer.title ? ` (${trainer.title})` : "";
      vouchers[key] = new Voucher(
          voucherType,
          `${i18next.t("voucher:defeatTrainer", { trainerName })} ${title}`,
      );
    }
    const voucherKeys = Object.keys(vouchers);
    for (const k of voucherKeys) {
      vouchers[k].id = k;
    }
}
