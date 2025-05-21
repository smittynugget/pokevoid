import { Abilities } from "../enums/abilities";
import { Species } from "../enums/species";
import { Type } from "./type";
import { SpeciesFormKey } from "./pokemon-species";
import { FormChangeItem } from "../enums/form-change-items";
import { TrainerType } from "../enums/trainer-type";
import { RivalTrainerType } from "./trainer-config";

export type StatDistributionType = 'even' | 'twoPriority' | 'scaling' | 'topPriority';

export interface ModGlitchFormData {
    speciesId: Species;
    formName: string;
    primaryType: Type;
    secondaryType?: Type;
    abilities: [Abilities, Abilities, Abilities];
    stats: {
        statsToBoost: string[];
        distributionType: StatDistributionType;
    };
    sprites?: {
        front?: ArrayBuffer | string;
        back?: ArrayBuffer | string;
        icon?: ArrayBuffer | string;
    };
    unlockConditions?: {
        rivalTrainerTypes?: RivalTrainerType[];
    };
    formKey?: SpeciesFormKey;
    lang?: {
        en: string;
        ja: string;
        ko: string;
        de: string;
        it: string;
        "pt-BR": string;
        es: string;
        fr: string;
        "zh-TW": string;
        "zh-CN": string;
    };
}

export const modGlitchFormData: Record<string, ModGlitchFormData> = {};

export function getModFormSystemName(speciesId: Species, formName: string): string {
    return `${Species[speciesId].toLowerCase()}_${formName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export function hasModGlitchForm(speciesId: Species, formName?: string): boolean {
    if (formName) {
        return !!modGlitchFormData[getModFormSystemName(speciesId, formName)];
    }
    return Object.values(modGlitchFormData).some(form => form.speciesId === speciesId);
}

export function getModGlitchFormKey(speciesId: Species, formName: string): SpeciesFormKey | null {
    const systemName = getModFormSystemName(speciesId, formName);
    return modGlitchFormData[systemName]?.formKey || null;
}

export function clearModGlitchFormData(): void {
    Object.keys(modGlitchFormData).forEach(key => {
        delete modGlitchFormData[key];
    });
}