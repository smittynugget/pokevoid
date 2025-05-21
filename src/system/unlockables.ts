import i18next from "i18next";
import {GameMode, GameModes} from "../game-mode";

export enum Unlockables {
    ENDLESS_MODE,
    MINI_BLACK_HOLE,
    SPLICED_ENDLESS_MODE,
    EVIOLITE,
    NUZLOCKE_MODE,
    DRAFT_MODE,
    NUZLIGHT_MODE,
    NIGHTMARE_MODE,
    NORMAL_EFFECTIVENESS,
    THE_VOID_OVERTAKEN,
    SMITTY_NUGGET,
    NUGGET_OF_SMITTY,
    MANY_MORE_NUGGETS
}

export function getUnlockableName(unlockable: Unlockables) {
    switch (unlockable) {
        case Unlockables.ENDLESS_MODE:
            return getModeName(GameModes.ENDLESS);
        case Unlockables.MINI_BLACK_HOLE:
            return i18next.t("modifierType:ModifierType.MINI_BLACK_HOLE.name");
        case Unlockables.SPLICED_ENDLESS_MODE:
            return getModeName(GameModes.SPLICED_ENDLESS);
        case Unlockables.EVIOLITE:
            return i18next.t("modifierType:ModifierType.EVIOLITE.name");
        case Unlockables.NUZLOCKE_MODE:
            return getModeName(GameModes.NUZLOCKE);
        case Unlockables.DRAFT_MODE:
            return getModeName(GameModes.DRAFT);
        case Unlockables.NUZLIGHT_MODE:
            return getModeName(GameModes.NUZLIGHT);
        case Unlockables.NIGHTMARE_MODE:
            return getModeName(GameModes.NIGHTMARE);
        case Unlockables.NORMAL_EFFECTIVENESS:
            return i18next.t("modifierType:ModifierType.NORMAL_EFFECTIVENESS.name");
        case Unlockables.THE_VOID_OVERTAKEN:
            return i18next.t("rewardObtainedUi:titles.voidOvertaken");
        case Unlockables.SMITTY_NUGGET:
            return i18next.t("move:smittyNuggets.name");
        case Unlockables.NUGGET_OF_SMITTY:
            return i18next.t("move:nuggetOfSmitty.name");
        case Unlockables.MANY_MORE_NUGGETS:
            return i18next.t("rewardObtainedUi:titles.manyMoreNuggets");
    }
}

function getModeName(gameMode: GameModes):string {
    return `${GameMode.getModeName(gameMode)} ${i18next.t("gameMode:mode")}`
}
