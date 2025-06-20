import BattleScene from "../battle-scene";
import { Species } from "../enums/species";
import { FormChangeItem } from "../enums/form-change-items";
import { getPokemonSpecies, isGlitchFormKey, PokemonForm, SpeciesFormKey } from "./pokemon-species";
import { addGlitchFormChange, addGlitchFormChangeAlt } from "./pokemon-forms";
import { getModFormSystemName, ModGlitchFormData, modGlitchFormData } from "./mod-glitch-form-data";
import { modStorage } from "../system/mod-storage";
import { RivalTrainerType, getAllRivalTrainerTypes } from "./trainer-config";

export enum StatIndex {
    HP = 0,
    ATK = 1,
    DEF = 2,
    SP_ATK = 3,
    SP_DEF = 4,
    SPD = 5
}

export function findAvailableGlitchFormKey(species: ReturnType<typeof getPokemonSpecies>): SpeciesFormKey | null {
    const usedFormKeys = species.forms.map(form => form.formKey);
    const glitchFormKeys = [
        SpeciesFormKey.GLITCH,
        SpeciesFormKey.GLITCH_B,
        SpeciesFormKey.GLITCH_C,
        SpeciesFormKey.GLITCH_D,
        SpeciesFormKey.GLITCH_E
    ];
    
    for (const key of glitchFormKeys) {
        if (!usedFormKeys.includes(key)) {
            return key;
        }
    }
    
    return SpeciesFormKey.GLITCH_E;
}

export function distributeStatIncrease(
    baseStats: number[],
    statsToBoost: string[],
    distributionType: 'even' | 'twoPriority' | 'scaling' | 'topPriority'
): number[] {
    const statIndices = {
        "HP": StatIndex.HP,
        "ATK": StatIndex.ATK,
        "DEF": StatIndex.DEF,
        "SPATK": StatIndex.SP_ATK,
        "SPDEF": StatIndex.SP_DEF,
        "SPD": StatIndex.SPD
    };

    const requestedIndices = statsToBoost.slice(0, 3).map(stat =>
        typeof stat === 'string' ? statIndices[stat] : stat
    );

    const uniqueIndicesToBoost: number[] = [];
    const seenIndices = new Set<number>();
    for (const index of requestedIndices) {
        if (index !== undefined && index !== null && !seenIndices.has(index)) {
            uniqueIndicesToBoost.push(index);
            seenIndices.add(index);
        }
    }

    const totalIncrease = calculateTotalIncrease(baseStats);
    const newStats = [...baseStats];

    let distribution: number[];
    switch(distributionType) {
        case 'even':
            distribution = [0.333, 0.333, 0.334];
            break;
        case 'twoPriority':
            distribution = [0.4, 0.4, 0.2];
            break;
        case 'scaling':
            distribution = [0.45, 0.35, 0.2];
            break;
        case 'topPriority':
            distribution = [0.4, 0.3, 0.3];
            break;
        default:
            distribution = [0.333, 0.333, 0.334];
    }

    for (let i = 0; i < Math.min(uniqueIndicesToBoost.length, distribution.length); i++) {
        const statIndex = uniqueIndicesToBoost[i];
        newStats[statIndex] += Math.round(totalIncrease * distribution[i]);
    }

    return newStats;
}

export function calculateTotalIncrease(stats: number[]): number {
    const total = stats.reduce((sum, stat) => sum + stat, 0);
    let newTotal = total;
    let increase = 0;
    
    do {
        const currentIncrease = Math.floor(newTotal * 0.2);
        increase += currentIncrease;
        newTotal += currentIncrease;
    } while (newTotal < 500);
    
    return increase;
}

export function loadModPokemonIconFromData(
    scene: BattleScene, 
    formName: string, 
    iconData: ArrayBuffer | Blob | string
): Promise<void> {
    return new Promise((resolve, reject) => {
        const iconKey = `pokemon_icons_mod_${formName.toLowerCase()}`;
        
        if (scene.textures.exists(iconKey)) {
            resolve();
            return;
        }
        
        let objectUrl: string;
        
        if (typeof iconData === 'string') {
            if (iconData.startsWith('data:')) {
                objectUrl = iconData;
            } else {
                objectUrl = `data:image/png;base64,${iconData}`;
            }
        } else {
            const blob = iconData instanceof ArrayBuffer ? new Blob([iconData]) : iconData;
            objectUrl = URL.createObjectURL(blob);
        }
        
        scene.load.image(iconKey, objectUrl);
        
        scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
            if (!objectUrl.startsWith('data:')) {
                URL.revokeObjectURL(objectUrl);
            }
            
            resolve();
        });
        
        scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
            if (!objectUrl.startsWith('data:')) {
                URL.revokeObjectURL(objectUrl);
            }
            reject(new Error(`Failed to load icon for ${formName}`));
        });
        
        if (!scene.load.isLoading()) {
            scene.load.start();
        }
    });
}

export function getModPokemonName(speciesId: Species, formName: string): string {
    const systemName = getModFormSystemName(speciesId, formName);
    if (modGlitchFormData[systemName]) {
        if(modGlitchFormData[systemName]?.lang) {
            const currentLocale = localStorage.getItem("prLang") || "en";
            return modGlitchFormData[systemName].lang[currentLocale] || 
                   modGlitchFormData[systemName].lang.en;
        }
        return formName.charAt(0).toUpperCase() + formName.slice(1).toLowerCase();
    }
    return null;
}

export function loadModGlitchSpriteFromData(
    scene: BattleScene, 
    formName: string, 
    spriteData: ArrayBuffer | Blob | string, 
    isBackSprite: boolean = false
): Promise<void> {
    return new Promise((resolve, reject) => {
        const spriteKey = `pkmn__glitch__${formName.toLowerCase()}${isBackSprite ? '_back' : ''}`;
        
        if (scene.textures.exists(spriteKey)) {
            resolve();
            return;
        }
        
        let objectUrl: string;
        
        if (typeof spriteData === 'string') {
            if (spriteData.startsWith('data:')) {
                objectUrl = spriteData;
            } else {
                objectUrl = `data:image/png;base64,${spriteData}`;
            }
        } else {
            const blob = spriteData instanceof ArrayBuffer ? new Blob([spriteData]) : spriteData;
            objectUrl = URL.createObjectURL(blob);
        }
        
        scene.load.image(spriteKey, objectUrl);
        
        scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
            if (!objectUrl.startsWith('data:')) {
                URL.revokeObjectURL(objectUrl);
            }
            
            if (scene.anims && typeof scene.anims.create === 'function' && !scene.anims.exists(spriteKey)) {
                scene.anims.create({
                    key: spriteKey,
                    frames: [{ key: spriteKey }],
                    frameRate: 1,
                    repeat: -1
                });
            }
            
            resolve();
        });
        
        scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, () => {
            if (!objectUrl.startsWith('data:')) {
                URL.revokeObjectURL(objectUrl);
            }
            reject(new Error(`Failed to load sprite for ${formName}`));
        });
        
        if (!scene.load.isLoading()) {
            scene.load.start();
        }
    });
}

export function registerModGlitchForm(formData: ModGlitchFormData): boolean {
    const { speciesId, formName, primaryType, secondaryType, abilities, stats } = formData;
    
    const species = getPokemonSpecies(speciesId);
    if (!species) {
        console.error(`Failed to register mod glitch form: species ${speciesId} not found`);
        return false;
    }

    if (!species.forms || species.forms.length === 0) {
        const normalForm = new PokemonForm(
            "Normal",
            "",
            species.type1,
            species.type2,
            species.height,
            species.weight,
            species.ability1,
            species.ability2,
            species.abilityHidden,
            species.baseTotal,
            species.baseStats[0],
            species.baseStats[1],
            species.baseStats[2],
            species.baseStats[3],
            species.baseStats[4],
            species.baseStats[5],
            species.catchRate,
            species.baseFriendship,
            species.baseExp,
        );
        normalForm.speciesId = species.speciesId;
        normalForm.formIndex = 0;
        normalForm.generation = species.generation;
        species.forms.push(normalForm);
    }
    
    const formKey =  findAvailableGlitchFormKey(species) || formData.formKey;
    if (!formKey || !isGlitchFormKey(formKey)) {
        console.error(`Failed to register mod glitch form: no available glitch form key for ${Species[speciesId]}`);
        return false;
    }
    
    formData.formKey = formKey;
    
    const baseStats = [...species.baseStats];
    const boostedStats = distributeStatIncrease(baseStats, stats.statsToBoost, stats.distributionType);
    
    for (let i = 0; i < abilities.length; i++) {
        if (abilities[i] > 310) {
            abilities[i] = 128;
        }
    }

    let uniqueRivalTrainerTypes = new Set<number>(
        formData.unlockConditions?.rivalTrainerTypes
            ?.filter(type => typeof type === 'number' && type !== -1)
            || []
    );

    const allRivalTypes = getAllRivalTrainerTypes();

    while (uniqueRivalTrainerTypes.size < 4) {
        const randomRival = allRivalTypes[Math.floor(Math.random() * allRivalTypes.length)];
        if (!uniqueRivalTrainerTypes.has(randomRival)) {
            uniqueRivalTrainerTypes.add(randomRival);
        }
    }

    formData.unlockConditions = formData.unlockConditions || {};
    formData.unlockConditions.rivalTrainerTypes = Array.from(uniqueRivalTrainerTypes);

    const systemName = getModFormSystemName(speciesId, formName);
    modGlitchFormData[systemName] = formData;
    
    const totalStats = boostedStats.reduce((a, b) => a + b, 0);
    const newForm = new PokemonForm(
        formName,
        formKey,
        primaryType,
        secondaryType === null || secondaryType === undefined ? null : secondaryType,
        species.height,
        species.weight,
        abilities[0],
        abilities[1],
        abilities[2],
        totalStats,
        boostedStats[0],
        boostedStats[1],
        boostedStats[2],
        boostedStats[3],
        boostedStats[4],
        boostedStats[5],
        species.catchRate,
        species.baseFriendship,
        species.baseExp
    );
    
    newForm.speciesId = species.speciesId;
    newForm.formIndex = species.forms.length;
    newForm.generation = species.generation;
    
    species.forms.push(newForm);
    
    if (formKey === SpeciesFormKey.GLITCH) {
        addGlitchFormChange(speciesId, systemName);
    } 
    else {
        const formChangeItem = getFormChangeItemForGlitchForm(formKey);
        addGlitchFormChangeAlt(speciesId, formKey, formChangeItem, systemName);
    }
    
    return true;
}

function getFormChangeItemForGlitchForm(formKey: SpeciesFormKey): FormChangeItem {
    switch(formKey) {
        case SpeciesFormKey.GLITCH:
            return FormChangeItem.GLITCHI_GLITCHI_FRUIT;
        case SpeciesFormKey.GLITCH_B:
            return FormChangeItem.GLITCH_COMMAND_SEAL;
        case SpeciesFormKey.GLITCH_C:
            return FormChangeItem.GLITCH_MOD_SOUL;
        case SpeciesFormKey.GLITCH_D:
            return FormChangeItem.GLITCH_MASTER_PARTS;
        case SpeciesFormKey.GLITCH_E:
            return FormChangeItem.GLITCH_SHOUT;
        default:
            return FormChangeItem.GLITCHI_GLITCHI_FRUIT;
    }
}

export async function loadModGlitchFormFromJson(
    scene: BattleScene,
    json: any
): Promise<boolean> {
    try {
        if (!json.speciesId) {
            console.error("Invalid mod glitch form data: missing speciesId");
            return false;
        }
        if (!json.formName) {
            console.error("Invalid mod glitch form data: missing formName");
            return false;
        }
        if (!(json.primaryType >= 0) || !(json.primaryType < 18)) {
            console.error("Invalid mod glitch form data: primary type is out of range");
            return false;
        }
        if (json.secondaryType && (!(json.secondaryType >= 0) || !(json.secondaryType < 18))) {
            console.error("Invalid mod glitch form data: secondary type is out of range");
            return false;
        }
        if (!json.abilities) {
            console.error("Invalid mod glitch form data: missing abilities");
            return false;
        }
        if (!json.stats) {
            console.error("Invalid mod glitch form data: missing stats");
            return false;
        }
        if (!json.sprites) {
            console.error("Invalid mod glitch form data: missing sprites");
            return false;
        }
        
        if (!json.sprites.front) {
            console.error("Invalid mod glitch form data: missing front sprite data");
            return false;
        }
        
        const formData: ModGlitchFormData = {
            speciesId: json.speciesId,
            formName: json.formName,
            primaryType: json.primaryType,
            secondaryType: json.secondaryType,
            abilities: json.abilities,
            stats: {
                statsToBoost: json.stats.statsToBoost || ["ATK", "HP", "SPD"],
                distributionType: json.stats.distributionType || "even"
            },
            sprites: {
                front: json.sprites.front,
                back: json.sprites.back,
                icon: json.sprites.icon
            },
            unlockConditions: {
                rivalTrainerTypes: json.unlockConditions?.rivalTrainerTypes || []
            }
        };

        if (json.lang) {
            formData.lang = {
                en: json.lang.en || json.formName,
                ja: json.lang.ja || json.formName,
                ko: json.lang.ko || json.formName,
                de: json.lang.de || json.formName,
                it: json.lang.it || json.formName,
                "pt-BR": json.lang["pt-BR"] || json.formName,
                es: json.lang.es || json.formName,
                fr: json.lang.fr || json.formName,
                "zh-TW": json.lang["zh-TW"] || json.formName,
                "zh-CN": json.lang["zh-CN"] || json.formName
            };
        }
        
        const registered = registerModGlitchForm(formData);
        if (!registered) {
            return false;
        }
        
        try {
            await loadModGlitchSpriteFromData(scene, formData.formName, formData.sprites.front, false);
            
            if (formData.sprites.back) {
                await loadModGlitchSpriteFromData(scene, formData.formName, formData.sprites.back, true);
            } else {
                console.warn(`Back sprite missing for ${formData.formName}, using front sprite as fallback`);
                await loadModGlitchSpriteFromData(scene, formData.formName, formData.sprites.front, true);
            }
            
            if (formData.sprites.icon) {
                await loadModPokemonIconFromData(scene, formData.formName, formData.sprites.icon);
            } else if (formData.sprites.front) {
                console.warn(`Icon sprite missing for ${formData.formName}, using front sprite as fallback`);
                await loadModPokemonIconFromData(scene, formData.formName, formData.sprites.front);
            }
            
            return true;
        } catch (error) {
            console.error(`Error loading sprites for ${formData.formName}:`, error);
            return false;
        }
    } catch (error) {
        console.error("Error loading mod glitch form:", error);
        return false;
    }
}

export async function loadAndStoreMod(scene: BattleScene, jsonData: any): Promise<boolean> {
    try {
        const success = await loadModGlitchFormFromJson(scene, jsonData);
        
        if (success) {
            try {
                await modStorage.storeMod({
                    speciesId: jsonData.speciesId,
                    formName: jsonData.formName,
                    jsonData: jsonData,
                    spriteData: jsonData.sprites.front,
                    iconData: jsonData.sprites.icon || jsonData.sprites.front
                });
                return true;
            } catch (storageError) {
                console.error("Error storing mod:", storageError);
                return false;
            }
        } else {
            console.error("Failed to register glitch form. Check console for details.");
            return false;
        }
    } catch (error) {
        console.error("Error uploading mod:", error);
        return false;
    }
}