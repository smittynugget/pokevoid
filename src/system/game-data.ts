import i18next from "i18next";
import BattleScene, {PokeballCounts, RecoveryBossMode, bypassLogin} from "../battle-scene";
import Pokemon, {EnemyPokemon, PlayerPokemon, PokemonMove, PokemonSummonData} from "../field/pokemon";
import {pokemonEvolutions, pokemonPrevolutions} from "../data/pokemon-evolutions";
import PokemonSpecies, {
    allSpecies,
    getPokemonSpecies,
    noStarterFormKeys,
    speciesStarters
} from "../data/pokemon-species";
import * as Utils from "../utils";
import Overrides from "#app/overrides";
import PokemonData from "./pokemon-data";
import PersistentModifierData from "./modifier-data";
import ArenaData from "./arena-data";
import {Unlockables} from "./unlockables";
import {GameModes, getGameMode} from "../game-mode";
import {BattleType, DynamicMode, FixedBattleSeeds, NightmareBattleSeeds, nightmareFixedBattles, NightmareRivalInfo, setupNightmareFixedBattles} from "../battle";
import TrainerData from "./trainer-data";
import {getAllRivalTrainerTypes, getDynamicRivalConfig, RivalTrainerType, trainerConfigs, TrainerSlot} from "../data/trainer-config";
import {SettingKeys, resetSettings, setSetting} from "./settings/settings";
import {achvs} from "./achv";
import EggData from "./egg-data";
import {Egg} from "../data/egg";
import {VoucherType, vouchers} from "./voucher";
import {AES, enc} from "crypto-js";
import {Mode} from "../ui/ui";
import {clientSessionId, loggedInUser, updateUserInfo} from "../account";
import {Nature} from "../data/nature";
import {GameStats} from "./game-stats";
import {Tutorial} from "../tutorial";
import {speciesEggMoves} from "../data/egg-moves";
import Move, {allMoves} from "../data/move";
import {TrainerVariant} from "../field/trainer";
import {Variant, variantData} from "#app/data/variant";
import {setSettingGamepad, SettingGamepad, settingGamepadDefaults} from "./settings/settings-gamepad";
import {setSettingKeyboard, SettingKeyboard} from "#app/system/settings/settings-keyboard";
import {TerrainChangedEvent, WeatherChangedEvent} from "#app/events/arena.js";
import {
    EnemyAttackStatusEffectChanceModifier,
    GlitchPieceModifier, PermaQuestModifier,
    PermaHitQuestModifier, PermaModifier, PersistentModifier, PokemonFormChangeItemModifier, PermaRunQuestModifier
} from "../modifier/modifier";
import {StatusEffect} from "#app/data/status-effect.js";
import ChallengeData from "./challenge-data";
import {randSeedInt} from "../utils";
import {PokeballType} from "#app/data/pokeball";
import {Device} from "#enums/devices";
import {GameDataType} from "#enums/game-data-type";
import {Moves} from "#enums/moves";
import {PlayerGender} from "#enums/player-gender";
import {Species} from "#enums/species";
import {applyChallenges, ChallengeType} from "#app/data/challenge.js";
import {WeatherType} from "#app/enums/weather-type.js";
import {TerrainType} from "#app/data/terrain.js";
import {OutdatedPhase} from "#app/phases/outdated-phase.js";
import {ReloadSessionPhase} from "#app/phases/reload-session-phase.js";
import {RUN_HISTORY_LIMIT} from "#app/ui/run-history-ui-handler";

import {Abilities} from "#enums/abilities";
import {Gender} from "#app/data/gender";
import {
    ModifierTypeGenerator,
    ModifierTypeOption,
    modifierTypes,
    PermaModifierTypeGenerator,
    PermaPartyAbilityModifierTypeGenerator,
    QuestModifierType,
    QuestModifierTypeGenerator,
} from "#app/modifier/modifier-type";
import ModifierData from "./modifier-data";
import {PermaModifiers, PermaType} from "#app/modifier/perma-modifiers";
import {RunDuration, RunType} from "#enums/quest-type-conditions";
import {Type} from "#app/data/type";
import {TrainerType} from "#enums/trainer-type";
import {BattlerTagType} from "#enums/battler-tag-type";
import {BattlerTag, BattlerTagLapseType} from "#app/data/battler-tags";
import * as Modifiers from "#app/modifier/modifier";
import {initializePermaModifierChecker} from "#app/modifier/perma-modifier-checker";
import {FormChangeItem} from "#enums/form-change-items";
import {QuestUnlockPhase} from "#app/phases/quest-unlock-phase.js";
import {RewardObtainedType, UnlockModePokeSpriteType} from "#app/ui/reward-obtained-ui-handler";
import {UnlockPhase} from "#app/phases/unlock-phase";
import {pokemonQuestLevelMoves, pokemonSpeciesLevelMoves} from "#app/data/pokemon-level-moves";
import {RewardObtainDisplayPhase} from "#app/phases/reward-obtain-display-phase";
import { transpileModule } from "typescript";
import {BerryType} from "#enums/berry-type";
import { TutorialService } from "#app/ui/tutorial-service";
import { QUEST_CONSOLE_CODES, SMITTY_CONSOLE_CODES, RIVAL_CONSOLE_CODES } from "#app/modifier/modifier-type";
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";
import { modStorage } from "./mod-storage";
import { UnlockModFormPhase } from "../phases/unlock-mod-form-phase";
import { getModPokemonName } from "../data/mod-glitch-form-utils";
import { getModFormSystemName } from "#app/data/mod-glitch-form-data.js";
import { PathNodeContext } from "#app/phases/battle-path-phase";
import { PathNodeType } from "#app/battle";

export const defaultStarterSpecies: Species[] = [];

const saveKey = "x0i2O7WRiANTqPmZ"; // Temporary; secure encryption is not yet necessary

export function getDataTypeKey(dataType: GameDataType, slotId: integer = 0): string {
    switch (dataType) {
        case GameDataType.SYSTEM:
            return "data";
        case GameDataType.SESSION:
            let ret = "sessionData";
            if (slotId) {
                ret += slotId;
            }
            return ret;
        case GameDataType.SETTINGS:
            return "settings";
        case GameDataType.TUTORIALS:
            return "tutorials";
        case GameDataType.SEEN_DIALOGUES:
            return "seenDialogues";
        case GameDataType.RUN_HISTORY:
            return "runHistoryData";
    }
}

export function encrypt(data: string, bypassLogin: boolean): string {
    return data;
}

export function decrypt(data: string, bypassLogin: boolean): string {
    return data;
}

export interface PreargsForShop {
    berryType?: BerryType;
    formChangeItems?: FormChangeItem;
    nature?: Nature;
    berryAttempted?: boolean;
    mintAttempted?: boolean;
    smittyAttempted?: boolean;
}

export enum BiomeChange {
    NONE,
    CHANGE_BIOME,
    HEAL_CHANGE_BIOME,
}

export interface SystemSaveData {
    trainerId: integer;
    secretId: integer;
    gender: PlayerGender;
    dexData: DexData;
    starterData: StarterData;
    gameStats: GameStats;
    unlocks: Unlocks;
    achvUnlocks: AchvUnlocks;
    voucherUnlocks: VoucherUnlocks;
    voucherCounts: VoucherCounts;
    eggs: EggData[];
    gameVersion: string;
    timestamp: integer;
    eggPity: integer[];
    unlockPity: integer[];
    permaMoney: number;
    permaModifiers: PersistentModifierData[];
    questUnlockables: Partial<Record<QuestUnlockables, QuestProgress>>;
    currentPermaShopOptions?: ModifierTypeOption[];
    lastPermaShopRefreshTime?: number;
    permaShopRerollCount?: number;
    lastSmitomReward?: number;
    lastDailyBountyTime?: number;
    dailyBountyCode?: string;
    lastSaveTime?: number;
    defeatedRivals: RivalTrainerType[];
    uniSmittyUnlocks: string[];
    modFormsUnlocked?: string[];
    smitomTalks: number[];
    rewardOverlayOpacity: number;
    testSpeciesForMod: number[];
}

export interface SessionSaveData {
    seed: string;
    playTime: integer;
    gameMode: GameModes;
    party: PokemonData[];
    enemyParty: PokemonData[];
    modifiers: PersistentModifierData[];
    enemyModifiers: PersistentModifierData[];
    arena: ArenaData;
    pokeballCounts: PokeballCounts;
    money: integer;
    score: integer;
    waveIndex: integer;
    battleType: BattleType;
    trainer: TrainerData;
    gameVersion: string;
    timestamp: integer;
    challenges: ChallengeData[];
    playerRival: RivalTrainerType;
    sessionQuestModifierData?: Record<string, number>;
    activeConsoleCodeQuests?: string[];
    nightmareBattleSeeds: NightmareBattleSeeds | null;
    fixedBattleSeeds: FixedBattleSeeds | null;
    majorBossWave: integer;
    sacrificeToggleOn: boolean;
    preargsForShop: Record<number, PreargsForShop>;
    moveUsageCount: Record<number, number>;
    pendingMoveUpgrades?: number;
    biomeChange: BiomeChange;
    recoveryBossMode: RecoveryBossMode;
    pathNodeContext?: PathNodeContext | null;
    selectedNodeType?: PathNodeType | null;
    battlePath?: any;
    selectedPath?: string;
    battlePathWave?: integer;
    dynamicMode?: DynamicMode;
    rivalWave?: integer;
    
}

interface Unlocks {
    [key: integer]: boolean;
}

interface AchvUnlocks {
    [key: string]: integer
}

interface VoucherUnlocks {
    [key: string]: integer
}

export interface VoucherCounts {
    [type: string]: integer;
}

export interface DexData {
    [key: integer]: DexEntry
}

export interface DexEntry {
    seenAttr: bigint;
    caughtAttr: bigint;
    natureAttr: integer,
    seenCount: integer;
    caughtCount: integer;
    hatchedCount: integer;
    ivs: integer[];
}

export const DexAttr = {
    NON_SHINY: 1n,
    SHINY: 2n,
    MALE: 4n,
    FEMALE: 8n,
    DEFAULT_VARIANT: 16n,
    VARIANT_2: 32n,
    VARIANT_3: 64n,
    DEFAULT_FORM: 128n
};

export interface DexAttrProps {
    shiny: boolean;
    female: boolean;
    variant: Variant;
    formIndex: integer;
}

export const AbilityAttr = {
    ABILITY_1: 1,
    ABILITY_2: 2,
    ABILITY_HIDDEN: 4
};

export type RunHistoryData = Record<number, RunEntry>;

export interface RunEntry {
    entry: SessionSaveData;
    isVictory: boolean;
    /*Automatically set to false at the moment - implementation TBD*/
    isFavorite: boolean;
}

export type StarterMoveset = [Moves] | [Moves, Moves] | [Moves, Moves, Moves] | [Moves, Moves, Moves, Moves];

export interface StarterFormMoveData {
    [key: integer]: StarterMoveset
}

export interface StarterMoveData {
    [key: integer]: StarterMoveset | StarterFormMoveData
}

export interface StarterAttributes {
    nature?: integer;
    ability?: integer;
    variant?: integer;
    form?: integer;
    female?: boolean;
    shiny?: boolean;
    favorite?: boolean;
    nickname?: string;
    fusion?: integer;
}

export interface StarterPreferences {
    [key: integer]: StarterAttributes;
}

// the latest data saved/loaded for the Starter Preferences. Required to reduce read/writes. Initialize as "{}", since this is the default value and no data needs to be stored if present.
// if they ever add private static variables, move this into StarterPrefs
const StarterPrefers_DEFAULT: string = "{}";
let StarterPrefers_private_latest: string = StarterPrefers_DEFAULT;

export class StarterPrefs {
    // called on starter selection show once
    static load(): StarterPreferences {
        return JSON.parse(
            StarterPrefers_private_latest = (localStorage.getItem(`starterPrefs_${loggedInUser?.username}`) || StarterPrefers_DEFAULT)
        );
    }

    // called on starter selection clear, always
    static save(prefs: StarterPreferences): void {
        const pStr: string = JSON.stringify(prefs);
        if (pStr !== StarterPrefers_private_latest) {
            // something changed, store the update
            localStorage.setItem(`starterPrefs_${loggedInUser?.username}`, pStr);
            // update the latest prefs
            StarterPrefers_private_latest = pStr;
        }
    }
}

export interface StarterDataEntry {
    moveset: StarterMoveset | StarterFormMoveData | null;
    eggMoves: integer;
    candyCount: integer;
    friendship: integer;
    abilityAttr: integer;
    passiveAttr: integer;
    valueReduction: integer;
    classicWinCount: integer;
    
    obtainedFusions: Species[];
    fusionMovesets: StarterMoveset[] | StarterFormMoveData[] | null;
}

export interface StarterData {
    [key: integer]: StarterDataEntry
}

export interface TutorialFlags {
    [key: string]: boolean
}

export interface SeenDialogues {
    [key: string]: boolean;
}

const systemShortKeys = {
    seenAttr: "$sa",
    caughtAttr: "$ca",
    natureAttr: "$na",
    seenCount: "$s",
    caughtCount: "$c",
    hatchedCount: "$hc",
    ivs: "$i",
    moveset: "$m",
    fusionMovesets: "$fm",
    obtainedFusions: "$of",
    eggMoves: "$em",
    candyCount: "$x",
    friendship: "$f",
    abilityAttr: "$a",
    passiveAttr: "$pa",
    valueReduction: "$vr",
    classicWinCount: "$wc"
};

export interface QuestProgress {
    state: QuestState;
    currentCount?: number;
    currentStage?: number;
    questUnlockData?: QuestUnlockData;
}

export class GameData {
    private scene: BattleScene;

    public trainerId: integer;
    public secretId: integer;

    public gender: PlayerGender;

    public dexData: DexData;
    private defaultDexData: DexData | null;

    public starterData: StarterData;

    public gameStats: GameStats;
    public runHistory: RunHistoryData;

    public unlocks: Unlocks;

    public achvUnlocks: AchvUnlocks;

    public voucherUnlocks: VoucherUnlocks;
    public voucherCounts: VoucherCounts;
    public eggs: Egg[];
    public eggPity: integer[];
    public unlockPity: integer[];

    public permaMoney: number = 0;
    public permaModifiers: PermaModifiers;
    public testSpeciesForMod: number[] = [];

    public currentPermaShopOptions: ModifierTypeOption[] | null = null;
    public lastPermaShopRefreshTime: number = 0;
    public permaShopRerollCount: number = 0;
    public lastSmitomReward: number = 0;
    public lastDailyBountyTime: number = 0;
    public lastSaveTime: number = 0;
    public rewardOverlayOpacity: number = 1;
    public dailyBountyCode: string = "";
    public questUnlockables: Partial<Record<QuestUnlockables, QuestProgress>>;
    public playerRival: RivalTrainerType | null = null;
    public defeatedRivals: RivalTrainerType[] = [];
    private sessionQuestModifierData: Record<string, number> = {};
    private activeConsoleCodeQuests: string[] = [];
    public uniSmittyUnlocks: string[] = [];
    public modFormsUnlocked: string[] = [];
    public dataLoadAttempted: boolean = false;
    public nightmareBattleSeeds: NightmareBattleSeeds | null = null;
    public fixedBattleSeeds: FixedBattleSeeds | null = null;
    public sacrificeToggleOn: boolean = false;
    public preargsForShop: Record<number, PreargsForShop> = {};

    public smitomTalks: number[] = [];
    public nightmareRivalInfo: Record<number, NightmareRivalInfo> = {};
    public combinedData: { systemData?: SystemSaveData, sessionData?: string[] } = {};
    public tutorialService: TutorialService;
    public moveUsageCount: Record<number, number> = {};
    public pendingMoveUpgrades: number = -1;
    public upgradedMoves: Record<string, Move> = {};
    public tempHatchedPokemon: PlayerPokemon[] = [];
    public battlePath: any = null;
    public selectedPath: string = "";
    public currentPathPosition: number = 0;
    public biomeChange: BiomeChange = BiomeChange.NONE;
    public recoveryBossMode: RecoveryBossMode = RecoveryBossMode.NONE;

    constructor(scene: BattleScene) {
        this.scene = scene;
        this.loadSettings();
        this.loadGamepadSettings();
        this.loadMappingConfigs();
        this.trainerId = Utils.randInt(65536);
        this.secretId = Utils.randInt(65536);
        this.starterData = {};
        this.gameStats = new GameStats();
        this.runHistory = {};
        this.moveUsageCount = {};
        this.pendingMoveUpgrades = -1;
        this.unlocks = {
            [Unlockables.ENDLESS_MODE]: false,
            [Unlockables.MINI_BLACK_HOLE]: false,
            [Unlockables.SPLICED_ENDLESS_MODE]: false,
            [Unlockables.EVIOLITE]: false,
            [Unlockables.NUZLOCKE_MODE]: false,
            [Unlockables.DRAFT_MODE]: false,
            [Unlockables.NUZLIGHT_MODE]: false,
            [Unlockables.NIGHTMARE_MODE]: false,
            [Unlockables.NORMAL_EFFECTIVENESS]: false,
            [Unlockables.THE_VOID_OVERTAKEN]: false,
            [Unlockables.SMITTY_NUGGET]: false,
            [Unlockables.NUGGET_OF_SMITTY]: false,
            [Unlockables.MANY_MORE_NUGGETS]: false,
        };
        this.achvUnlocks = {};
        this.voucherUnlocks = {};
        this.voucherCounts = {
            [VoucherType.REGULAR]: 0,
            [VoucherType.PLUS]: 0,
            [VoucherType.PREMIUM]: 0,
            [VoucherType.GOLDEN]: 0
        };
        this.eggs = [];
        this.eggPity = [0, 0, 0, 0];
        this.unlockPity = [0, 0, 0, 0];
        
        this.permaModifiers = new PermaModifiers();
        this.questUnlockables = {};
        this.uniSmittyUnlocks = [];
        this.modFormsUnlocked = [];
        initializePermaModifierChecker(this);
        this.initDexData();
        this.initStarterData();
        this.tutorialService = new TutorialService(this.scene);
        this.moveUsageCount = {};
        this.upgradedMoves = {};
        this.tempHatchedPokemon = [];
        this.pendingMoveUpgrades = -1;
        this.testSpeciesForMod = [];
        this.biomeChange = BiomeChange.NONE;
    }

    public resetBattlePathData(): void {
        this.battlePath = null;
        this.nightmareBattleSeeds = null;
        this.fixedBattleSeeds = null;
        this.selectedPath = "";
        this.currentPathPosition = 0;
    }

    findBigIntPaths(obj: any, currentPath: string = ''): string[] {
        const paths: string[] = [];

        if (typeof obj === 'bigint') {
            paths.push(currentPath);
        } else if (Array.isArray(obj)) {
            obj.forEach((item, index) => {
                paths.push(...this.findBigIntPaths(item, `${currentPath}[${index}]`));
            });
        } else if (typeof obj === 'object' && obj !== null) {
            Object.entries(obj).forEach(([key, value]) => {
                const newPath = currentPath ? `${currentPath}.${key}` : key;
                paths.push(...this.findBigIntPaths(value, newPath));
            });
        }

        return paths;
    }

    setLocalStorageItem(key: string, value: any): void {
        localStorage.setItem(key, value);
    }

    getLocalStorageItem(key: string): any {
        if(key.includes("data") || key.includes("sessionData")) {
            const value = localStorage.getItem(key);
            if (value !== null) {
                try {
                    const parsedValue = JSON.parse(value);
                    const bigIntPaths = this.findBigIntPaths(parsedValue);
                    if (bigIntPaths.length > 0) {
                    }
                } catch (error) {
                    // If JSON.parse fails, it's not an object, so no BigInt
                }
            }
        }
        return localStorage.getItem(key);
    }

    public getSystemSaveData(): SystemSaveData {
        return {
            trainerId: this.trainerId,
            secretId: this.secretId,
            gender: this.gender,
            dexData: this.dexData,
            starterData: this.starterData,
            gameStats: this.gameStats,
            unlocks: this.unlocks,
            achvUnlocks: this.achvUnlocks,
            voucherUnlocks: this.voucherUnlocks,
            voucherCounts: this.voucherCounts,
            eggs: this.eggs.map(e => new EggData(e)),
            gameVersion: this.scene.game.config.gameVersion,
            timestamp: new Date().getTime(),
            eggPity: this.eggPity.slice(0),
            unlockPity: this.unlockPity.slice(0),
            permaMoney: this.permaMoney,
            permaModifiers: this.permaModifiers.getModifiers().map(m => new PersistentModifierData(m, true)),
            currentPermaShopOptions: this.currentPermaShopOptions,
            lastPermaShopRefreshTime: this.lastPermaShopRefreshTime,
            permaShopRerollCount: this.permaShopRerollCount,
            questUnlockables: this.questUnlockables,
            defeatedRivals: this.defeatedRivals,
            uniSmittyUnlocks: this.uniSmittyUnlocks,
            modFormsUnlocked: this.modFormsUnlocked,
            smitomTalks: this.smitomTalks,
            lastSmitomReward: this.lastSmitomReward,
            lastDailyBountyTime: this.lastDailyBountyTime,
            dailyBountyCode: this.dailyBountyCode,
            lastSaveTime: this.lastSaveTime,
            rewardOverlayOpacity: this.rewardOverlayOpacity,
            testSpeciesForMod: this.testSpeciesForMod,
        };
    }

    public saveSystem(): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            this.scene.ui.savingIcon.show();
            const data = this.getSystemSaveData();

            const serializedData = this.serializeBigInt(data);

            this.setLocalStorageItem(`data_${loggedInUser?.username}`, encrypt(serializedData, bypassLogin));
            this.scene.ui.savingIcon.hide();
            resolve(true);
        });
    }


    public async loadSystem(): Promise<boolean> {

            let importResult = false;
            
            importResult = await this.importFromHardcodedPath("./pokesav/chaos-test-mobile.prsv");
            // importResult = await this.importFromHardcodedPath("./pokesav/void-breaks.prsv");
            
            return true;

            if (bypassLogin && !this.getLocalStorageItem(`data_${loggedInUser?.username}`)) {
                this.updatePermaMoney(this.scene, 12500);
                return false;
            }

            if (bypassLogin) {
            const systemDataStr = decrypt(this.getLocalStorageItem(`data_${loggedInUser?.username}`)!, bypassLogin);
            const sessionDataStrArray = [];
            for (let slotId = 0; slotId < 5; slotId++) {
                const sessionDataStr = this.getLocalStorageItem(`sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`);
                if (sessionDataStr) {
                    sessionDataStrArray.push(decrypt(sessionDataStr, bypassLogin));
                }
                else {
                    sessionDataStrArray.push(null);
                }
            }
            return await this.initSystemWithStr(systemDataStr, sessionDataStrArray);
            } else {
                return false
            }
    }

    public async importFromHardcodedPath(filePath: string): Promise<boolean> {
        try {
            const response = await fetch(filePath);
            if (!response.ok) {
                console.error("Failed to fetch file:", response.statusText);
                return false;
            }
            
            const file = await response.blob();
            
            const reader = new FileReader();
            return new Promise<boolean>((resolve) => {
                reader.onload = async (event) => {
                    try {
                        const encryptedData = event.target?.result?.toString() || "";
                        
                        let dataStr = "";
                        
                        try {
                            dataStr = AES.decrypt(encryptedData, saveKey).toString(enc.Utf8);
                        } catch (decryptError) {
                            console.error("Standard decryption failed:", decryptError);
                        }
                        
                        if (!dataStr || dataStr.trim() === "") {
                            try {
                                const directData = JSON.parse(encryptedData);
                                dataStr = encryptedData;
                            } catch (parseError) {
                                console.error("Direct JSON parse failed:", parseError);
                                
                                try {
                                    const altKey = "PokemonRogueSaveKey";
                                    dataStr = AES.decrypt(encryptedData, altKey).toString(enc.Utf8);
                                } catch (altDecryptError) {
                                    console.error("Alternate key decryption failed:", altDecryptError);
                                }
                            }
                        }
                        
                        if (!dataStr || dataStr.trim() === "") {
                            console.error("Decrypted data is empty. Possible file corruption, wrong decryption key, or empty file.");
                            resolve(false);
                            return;
                        }
                        
                        try {
                            this.combinedData = JSON.parse(dataStr) as { systemData?: SystemSaveData, sessionData?: SessionSaveData[] };
                        } catch (parseError) {
                            console.error("Failed to parse combined data:", parseError);
                            resolve(false);
                            return;
                        }
                        
                        if (typeof this.combinedData.systemData === 'string') {
                            this.combinedData.systemData = this.deserializeBigInt(JSON.parse(this.combinedData.systemData));
                        }

                        if (Array.isArray(this.combinedData.sessionData)) {
                            this.combinedData.sessionData = this.combinedData.sessionData.map((session: any) => {
                                if (typeof session === 'string') {
                                    return this.deserializeBigInt(JSON.parse(session));
                                }
                                return session;
                            });
                        }

                        for (let i = 0; i < 5; i++) {
                            const sessionKey = `sessionData${i || ""}_${loggedInUser?.username}`;
                            localStorage.removeItem(sessionKey);
                        }

                        this.setLocalStorageItem(
                            `data_${loggedInUser?.username}`,
                            encrypt(this.serializeBigInt(this.combinedData.systemData), bypassLogin)
                        );

                        if (this.combinedData.sessionData?.length) {
                            this.combinedData.sessionData.forEach((sessionData, index) => {
                                this.setLocalStorageItem(
                                    `sessionData${index || ""}_${loggedInUser?.username}`,
                                    encrypt(this.serializeBigInt(sessionData), bypassLogin)
                                );
                            });
                        }

                        await this.initSystem(this.combinedData.systemData, this.combinedData.sessionData as SessionSaveData[]);
                        
                        resolve(true);
                    } catch (error) {
                        console.error("Error importing from hardcoded path:", error);
                        resolve(false);
                    }
                };
                
                reader.readAsText(file);
            });
        } catch (error) {
            console.error("Error fetching file:", error);
            return false;
        }
    }

    private async initSystemWithStr(systemDataStr: string, sessionDataStrArray: string[]): Promise<boolean> {
        try {
            const systemData: SystemSaveData = this.deserializeAndParseSystemData(systemDataStr);
            const sessionDataArray: SessionSaveData[] = sessionDataStrArray.map(sessionDataStr => {
                try {
                    return sessionDataStr ? JSON.parse(sessionDataStr) : null;
                } catch (e) {
                    return null;
                }
            });

            return await this.initSystem(systemData, sessionDataArray);
        } catch (error) {
            console.error("Error initializing system from string:", error);
            return false;
        }
    }


    async initSystem(systemData: SystemSaveData, sessionData: SessionSaveData[]): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            try {
              
                const serializedSystemData = this.serializeBigInt(systemData);
                this.setLocalStorageItem(`data_${loggedInUser?.username}`, serializedSystemData);

                const maxIntAttrValue = 0x80000000;

                for (let slotId = 0; slotId < sessionData.length; slotId++) {
                    if (sessionData[slotId]) {
                    sessionData[slotId] = this.serializeBigInt(sessionData[slotId]);

                        this.setLocalStorageItem(`sessionData${slotId ? slotId : ""}_${loggedInUser.username}`, sessionData[slotId]);
                    }
                }

                const lsItemKey = `runHistoryData_${loggedInUser?.username}`;
                const lsItem = this.getLocalStorageItem(lsItemKey);
                if (!lsItem) {
                    this.setLocalStorageItem(lsItemKey, "");
                }

                this.trainerId = systemData.trainerId;
                this.secretId = systemData.secretId;

                this.gender = systemData.gender;

                this.saveSetting(SettingKeys.Player_Gender, systemData.gender === PlayerGender.FEMALE ? 1 : 0);

                const initStarterData = !systemData.starterData;

                
                const newSmittySpeciesData = this.initSmittySpeciesData();
                const newUpdate = true;
                Object.keys(newSmittySpeciesData).forEach(speciesId => {
                    if (!systemData.starterData[speciesId] || newUpdate) {
                        systemData.starterData[speciesId] = newSmittySpeciesData[speciesId];
                    }
                });

                if (initStarterData) {
                    this.initStarterData();

                    if (systemData["starterMoveData"]) {
                        const starterMoveData = systemData["starterMoveData"];
                        for (const s of Object.keys(starterMoveData)) {
                            this.starterData[s].moveset = starterMoveData[s];
                        }
                    }

                    if (systemData["starterEggMoveData"]) {
                        const starterEggMoveData = systemData["starterEggMoveData"];
                        for (const s of Object.keys(starterEggMoveData)) {
                            this.starterData[s].eggMoves = starterEggMoveData[s];
                        }
                    }
                    
                    if (systemData["starterObtainedFusionData"]) {
                        const starterObtainedFusionData = systemData["starterObtainedFusionData"];
                        for (const s of Object.keys(starterObtainedFusionData)) {
                            this.starterData[s].obtainedFusions = starterObtainedFusionData[s];
                        }
                    }

                    if (systemData["starterFusionMovesets"]) {
                        const starterFusionMovesets = systemData["starterFusionMovesets"];
                        for (const s of Object.keys(starterFusionMovesets)) {
                            this.starterData[s].fusionMovesets = starterFusionMovesets[s];
                        }
                    }

                    this.migrateStarterAbilities(systemData, this.starterData);
                }
                else {
                    Object.keys(systemData.starterData).forEach(sd => {
                        try {
                            if (systemData.dexData[sd].caughtAttr && !systemData.starterData[sd].abilityAttr) {
                                systemData.starterData[sd].abilityAttr = 1;
                            }
                        }
                        catch (err) {
                        }

                    });

                    
                    Object.keys(systemData.starterData).forEach(speciesId => {
                        if (!systemData.starterData[speciesId].obtainedFusions) {
                            systemData.starterData[speciesId].obtainedFusions = [];
                        }
                        if (!systemData.starterData[speciesId].fusionMovesets) {
                            systemData.starterData[speciesId].fusionMovesets = [];
                        }
                    });

                    

                    this.starterData = systemData.starterData;
                }

                if (systemData.gameStats) {
                    if (systemData.gameStats.legendaryPokemonCaught !== undefined && systemData.gameStats.subLegendaryPokemonCaught === undefined) {
                        this.fixLegendaryStats(systemData);
                    }
                    this.gameStats = systemData.gameStats;
                    this.addNewStats(systemData);
                }

                if (systemData.unlocks) {
                    for (const key of Object.keys(systemData.unlocks)) {
                        if (this.unlocks.hasOwnProperty(key)) {
                            this.unlocks[key] = systemData.unlocks[key];
                        }
                    }
                }

                if (systemData.defeatedRivals) {
                    this.defeatedRivals = systemData.defeatedRivals;
                }

                if (systemData.uniSmittyUnlocks) {
                    this.uniSmittyUnlocks = systemData.uniSmittyUnlocks;
                }

                if (systemData.modFormsUnlocked) {
                    this.modFormsUnlocked = systemData.modFormsUnlocked;
                }

                if (systemData.achvUnlocks) {
                    for (const a of Object.keys(systemData.achvUnlocks)) {
                        if (achvs.hasOwnProperty(a)) {
                            this.achvUnlocks[a] = systemData.achvUnlocks[a];
                        }
                    }
                }

                if (systemData.voucherUnlocks) {
                    for (const v of Object.keys(systemData.voucherUnlocks)) {
                        if (vouchers.hasOwnProperty(v)) {
                            this.voucherUnlocks[v] = systemData.voucherUnlocks[v];
                        }
                    }
                }

                if (systemData.voucherCounts) {
                    Utils.getEnumKeys(VoucherType).forEach(key => {
                        const index = VoucherType[key];
                        this.voucherCounts[index] = systemData.voucherCounts[index] || 0;
                    });
                }

                this.eggs = systemData.eggs
                    ? systemData.eggs.map(e => new EggData(e).toEgg())
                    : [];

                this.eggPity = systemData.eggPity ? systemData.eggPity.slice(0) : [0, 0, 0, 0];
                this.unlockPity = systemData.unlockPity ? systemData.unlockPity.slice(0) : [0, 0, 0, 0];

                this.dexData = Object.assign(this.dexData, systemData.dexData);
                this.consolidateDexData(this.dexData);
                this.defaultDexData = null;

                if (initStarterData) {
                    const starterIds = Object.keys(this.starterData).map(s => parseInt(s) as Species);
                    for (const s of starterIds) {
                        this.starterData[s].candyCount += this.dexData[s].caughtCount;
                        this.starterData[s].candyCount += this.dexData[s].hatchedCount * 2;
                    if (BigInt(this.dexData[s].caughtAttr) & BigInt(DexAttr.SHINY)) {
                            this.starterData[s].candyCount += 4;
                        }
                    }
                }

                if (systemData.questUnlockables) {
                    this.questUnlockables = systemData.questUnlockables;
                } else {
                    this.questUnlockables = {};
                }


                if (systemData.currentPermaShopOptions) {
                    this.currentPermaShopOptions = systemData.currentPermaShopOptions;
                }

                if (systemData.lastPermaShopRefreshTime) {
                    this.lastPermaShopRefreshTime = systemData.lastPermaShopRefreshTime;
                }

                if (systemData.permaShopRerollCount) {
                    this.permaShopRerollCount = systemData.permaShopRerollCount;
                }

                if (systemData.lastSmitomReward) {
                    this.lastSmitomReward = systemData.lastSmitomReward;
                }

                if (systemData.lastDailyBountyTime) {
                    this.lastDailyBountyTime = systemData.lastDailyBountyTime;
                }

                if (systemData.dailyBountyCode) {
                    this.dailyBountyCode = systemData.dailyBountyCode;
                }

                if (systemData.smitomTalks) {
                    this.smitomTalks = systemData.smitomTalks;
                }

                if (systemData.lastSaveTime) {
                    this.lastSaveTime = systemData.lastSaveTime;
                }

                if (systemData.rewardOverlayOpacity) {
                    this.rewardOverlayOpacity = systemData.rewardOverlayOpacity;
                }

                if (systemData.testSpeciesForMod) {
                    this.testSpeciesForMod = systemData.testSpeciesForMod;
                }

                
                this.updatePermaMoney(this.scene, systemData.permaMoney != undefined ? systemData.permaMoney : 10000);
                this.scene.ui.updatePermaMoneyText(this.scene);

                if (systemData.permaModifiers) {
                    const modifiersModule = await import("../modifier/modifier");
                    this.permaModifiers = new PermaModifiers();
                    for (const modifierDataPlain of systemData.permaModifiers) {
                        const modifierData = new PersistentModifierData(modifierDataPlain, true);
                        const modifier = modifierData.toModifier(this.scene, modifiersModule[modifierData.className]);
                        if (modifier) {
                            this.permaModifiers.addModifier(this.scene, modifier);
                        }
                    }
                }

                // this.addTestPermaModifier();
                this.scene.ui.updatePermaModifierBar(this.permaModifiers);

                for (const questId in this.questUnlockables) {
                    const questUnlockData = this.questUnlockables[questId]?.questUnlockData;
                    if (questUnlockData && questUnlockData.rewardType === RewardType.NEW_MOVES_FOR_SPECIES) {
                        const speciesId = questUnlockData.rewardId;
                        if (this.getCompletedQuestForSpecies(speciesId, RewardType.NEW_MOVES_FOR_SPECIES)) {
                            this.addSpeciesQuestMoves(speciesId);
                        }
                    }
                }
                resolve(true);
            } catch (err) {
                console.error(err);
                resolve(false);
            }
        });
    }

    /**
     * Retrieves current run history data, organized by time stamp.
     * At the moment, only retrievable from locale cache
     */
    async getRunHistoryData(scene: BattleScene): Promise<RunHistoryData> {
        if (!Utils.isLocal) {
            const lsItemKey = `runHistoryData_${loggedInUser?.username}`;
            const lsItem = this.getLocalStorageItem(lsItemKey);
            if (lsItem) {
                const cachedResponse = lsItem;
                if (cachedResponse) {
                    const runHistory = JSON.parse(decrypt(cachedResponse, bypassLogin));
                    return runHistory;
                }
                return {};
            } else {
                this.setLocalStorageItem(`runHistoryData_${loggedInUser?.username}`, "");
                return {};
            }
        } else {
            const lsItemKey = `runHistoryData_${loggedInUser?.username}`;
            const lsItem = this.getLocalStorageItem(lsItemKey);
            if (lsItem) {
                const cachedResponse = lsItem;
                if (cachedResponse) {
                    const runHistory: RunHistoryData = JSON.parse(decrypt(cachedResponse, bypassLogin));
                    return runHistory;
                }
                return {};
            } else {
                this.setLocalStorageItem(`runHistoryData_${loggedInUser?.username}`, "");
                return {};
            }
        }
    }

    /**
     * Saves a new entry to Run History
     * @param scene: BattleScene object
     * @param runEntry: most recent SessionSaveData of the run
     * @param isVictory: result of the run
     * Arbitrary limit of 25 runs per player - Will delete runs, starting with the oldest one, if needed
     */
    async saveRunHistory(scene: BattleScene, runEntry: SessionSaveData, isVictory: boolean): Promise<boolean> {
        const runHistoryData = await this.getRunHistoryData(scene);
        // runHistoryData should always return run history or {} empty object
        let timestamps = Object.keys(runHistoryData).map(Number);

        // Arbitrary limit of 25 entries per user --> Can increase or decrease
        while (timestamps.length >= RUN_HISTORY_LIMIT) {
            const oldestTimestamp = (Math.min.apply(Math, timestamps)).toString();
            delete runHistoryData[oldestTimestamp];
            timestamps = Object.keys(runHistoryData).map(Number);
        }

        const timestamp = (runEntry.timestamp).toString();
        runHistoryData[timestamp] = {
            entry: runEntry,
            isVictory: isVictory,
            isFavorite: false,
        };
        this.setLocalStorageItem(`runHistoryData_${loggedInUser?.username}`, encrypt(JSON.stringify(runHistoryData), bypassLogin));
        /**
         * Networking Code DO NOT DELETE
         *
         if (!Utils.isLocal) {
         try {
         await Utils.apiPost("savedata/runHistory", JSON.stringify(runHistoryData), undefined, true);
         return true;
         } catch (err) {
         return false;
         }
         */
        return true;
    }

    parseSystemData(dataStr: string): SystemSaveData {
        return JSON.parse(dataStr, (k: string, v: any) => {
            if (k === "gameStats") {
                return new GameStats(v);
            } else if (k === "eggs") {
                const ret: EggData[] = [];
                if (v === null) {
                    v = [];
                }
                for (const e of v) {
                    ret.push(new EggData(e));
                }
                return ret;
            }

            if (/^\d+n$/.test(v)) {
                return BigInt(v.slice(0, -1));
            }

            if (k === "currentPermaShopOptions") {
                if (!v) {
                    return null;
                }
                return v.map((option: any) => {
                    if (!option?.type?.id) {
                        return null;
                    }
                    const modifierTypeFunc = modifierTypes[option.type.id];
                    if (!modifierTypeFunc) {
                        console.error(`ModifierType with id ${option.type.id} not found`);
                        return null;
                    }
                    let modifierType = modifierTypeFunc();

                    if (modifierType instanceof QuestModifierTypeGenerator) {
                        const GenModifierType = modifierType.generateType([], [0]);
                        if (!GenModifierType.id) {
                            GenModifierType.withIdFromFunc(modifierTypeFunc);
                        }

                        modifierType = GenModifierType;
                    }
                     else if (modifierType instanceof PermaPartyAbilityModifierTypeGenerator) {
                        if(this.scene) modifierType.assignScene(this.scene);
                        const GenModifierType = modifierType.generateType([], [0]);
                        if (!GenModifierType.id) {
                            GenModifierType.withIdFromFunc(modifierTypeFunc);
                        }
                        modifierType = GenModifierType;
                    }
                    else if (modifierType instanceof ModifierTypeGenerator) {
                        let generatedType = modifierType.generateType([]);
                        if (!generatedType.id) {
                            generatedType.withIdFromFunc(modifierTypeFunc);
                        }
                        modifierType = generatedType;

                    }

                    Object.assign(modifierType, option.type);

                    return new ModifierTypeOption(
                        modifierType,
                        option.upgradeCount,
                        option.cost
                    );
                }).filter(Boolean);
            }

            if (k === "lastPermaShopRefreshTime" || k === "lastSmitomReward" || k === "lastDailyBountyTime" || k === "lastSaveTime" || k === "rewardOverlayOpacity" || k === "permaShopRerollCount") {
                return v as number;
            }

            if (k === "dailyBountyCode") {
                return v as string;
            }

            if (k === "smitomTalks" || k === "testSpeciesForMod") {
                return v as number[];
            }

            if (k === "questUnlockables") {
                return this.parseQuestUnlockables(v);
            }

            if (k === "permaModifiers") {
                return v.map((modifierData: any) => new PersistentModifierData(modifierData, true));
            }

            return k.endsWith("Attr") && !["natureAttr", "abilityAttr", "passiveAttr"].includes(k) ? BigInt(v) : v;
        }) as SystemSaveData;
    }

    private deserializeAndParseSystemData(systemData: string | SystemSaveData): SystemSaveData {
        if (typeof systemData === 'string') {
            return JSON.parse(systemData, (k, v) => {
                if (typeof v === 'string' && /^\d+n$/.test(v)) {
                    return BigInt(v.slice(0, -1));
                }

                if (k === "gameStats") {
                    return new GameStats(v);
                } else if (k === "eggs") {
                    return (v || []).map(e => new EggData(e));
                } else if (k === "currentPermaShopOptions") {
                    return this.parsePermaShopOptions(v);
                } else if (k === "permaModifiers") {
                    return v.map((modifierData: any) => new PersistentModifierData(modifierData, true));
                } else if (k === "questUnlockables") {
                    return this.parseQuestUnlockables(v);
                }

                return k.endsWith("Attr") && !["natureAttr", "abilityAttr", "passiveAttr"].includes(k) ? BigInt(v) : v;
            });
        } else {
            return JSON.parse(JSON.stringify(systemData), (k, v) => {
                if (typeof v === 'string' && /^\d+n$/.test(v)) {
                    return BigInt(v.slice(0, -1));
                }
                return v;
            });
        }
    }

    private parsePermaShopOptions(options: any[] | null): ModifierTypeOption[] | null {
    if (!options) {
        return null;
    }

        return options.map(option => {
        if (!option || !option.type || !option.type.id) {
            return null;
        }

            const modifierTypeFunc = modifierTypes[option.type.id];
            if (!modifierTypeFunc) {
                console.error(`ModifierType with id ${option.type.id} not found`);
                return null;
            }
            let modifierType = modifierTypeFunc();

            if (modifierType instanceof QuestModifierTypeGenerator) {
                const GenModifierType = modifierType.generateType([], [0]);
                if (!GenModifierType.id) {
                    GenModifierType.withIdFromFunc(modifierTypeFunc);
                }

                modifierType = GenModifierType;
            }
            else if (modifierType instanceof PermaPartyAbilityModifierTypeGenerator) {
                if(this.scene) modifierType.assignScene(this.scene);
                const GenModifierType = modifierType.generateType([], [0]);
                if (!GenModifierType.id) {
                    GenModifierType.withIdFromFunc(modifierTypeFunc);
                }

                modifierType = GenModifierType;
            }
            else if (modifierType instanceof ModifierTypeGenerator) {
                let generatedType = modifierType.generateType([]);
                if (!generatedType.id) {
                    generatedType.withIdFromFunc(modifierTypeFunc);
                }
                modifierType = generatedType;

            }

            Object.assign(modifierType, option.type);
            return new ModifierTypeOption(modifierType, option.upgradeCount, option.cost);
        }).filter(Boolean);
    }

    private parseQuestUnlockables(questUnlockables: any): Partial<Record<QuestUnlockables, QuestProgress>> {
        const parsedQuestUnlockables: Partial<Record<QuestUnlockables, QuestProgress>> = {};
        for (const [key, value] of Object.entries(questUnlockables)) {
            const questKey = Number(key) as QuestUnlockables;
            if (QuestUnlockables[questKey] !== undefined) {
                parsedQuestUnlockables[questKey] = value as QuestProgress;
            } else {
                console.warn(`Invalid QuestUnlockables key: ${key}`);
            }
            }
        return parsedQuestUnlockables;
    }



    convertSystemDataStr(dataStr: string, shorten: boolean = false): string {
        if (!shorten) {
            dataStr = dataStr.replace(/\$pAttr/g, "$pa");
        }
        dataStr = dataStr.replace(/"trainerId":\d+/g, `"trainerId":${this.trainerId}`);
        dataStr = dataStr.replace(/"secretId":\d+/g, `"secretId":${this.secretId}`);
        const fromKeys = shorten ? Object.keys(systemShortKeys) : Object.values(systemShortKeys);
        const toKeys = shorten ? Object.values(systemShortKeys) : Object.keys(systemShortKeys);
        for (const k in fromKeys) {
            dataStr = dataStr.replace(new RegExp(`${fromKeys[k].replace("$", "\\$")}`, "g"), toKeys[k]);
        }

        return dataStr;
    }

    public async verify(): Promise<boolean> {
        return true;
    }

    public clearLocalData(): void {
        if (bypassLogin) {
            return;
        }
        localStorage.removeItem(`data_${loggedInUser?.username}`);
        for (let s = 0; s < 5; s++) {
            localStorage.removeItem(`sessionData${s ? s : ""}_${loggedInUser?.username}`);
        }
    }

    /**
     * Saves a setting to localStorage
     * @param setting string ideally of SettingKeys
     * @param valueIndex index of the setting's option
     * @returns true
     */
    public saveSetting(setting: string, valueIndex: integer): boolean {
        let settings: object = {};
        if (localStorage.hasOwnProperty("settings")) {
            settings = JSON.parse(this.getLocalStorageItem("settings")!); // TODO: is this bang correct?
        }

        setSetting(this.scene, setting, valueIndex);

        settings[setting] = valueIndex;

        this.setLocalStorageItem("settings", JSON.stringify(settings));

        return true;
    }

    /**
     * Saves the mapping configurations for a specified device.
     *
     * @param deviceName - The name of the device for which the configurations are being saved.
     * @param config - The configuration object containing custom mapping details.
     * @returns `true` if the configurations are successfully saved.
     */
    public saveMappingConfigs(deviceName: string, config): boolean {
        const key = deviceName.toLowerCase();  // Convert the gamepad name to lowercase to use as a key
        let mappingConfigs: object = {};  // Initialize an empty object to hold the mapping configurations
        if (localStorage.hasOwnProperty("mappingConfigs")) {// Check if 'mappingConfigs' exists in localStorage
            mappingConfigs = JSON.parse(this.getLocalStorageItem("mappingConfigs")!); // TODO: is this bang correct?
        }  // Parse the existing 'mappingConfigs' from localStorage
        if (!mappingConfigs[key]) {
            mappingConfigs[key] = {};
        }  // If there is no configuration for the given key, create an empty object for it
        mappingConfigs[key].custom = config.custom;  // Assign the custom configuration to the mapping configuration for the given key
        this.setLocalStorageItem("mappingConfigs", JSON.stringify(mappingConfigs));  // Save the updated mapping configurations back to localStorage
        return true;  // Return true to indicate the operation was successful
    }

    /**
     * Loads the mapping configurations from localStorage and injects them into the input controller.
     *
     * @returns `true` if the configurations are successfully loaded and injected; `false` if no configurations are found in localStorage.
     *
     * @remarks
     * This method checks if the 'mappingConfigs' entry exists in localStorage. If it does not exist, the method returns `false`.
     * If 'mappingConfigs' exists, it parses the configurations and injects each configuration into the input controller
     * for the corresponding gamepad or device key. The method then returns `true` to indicate success.
     */
    public loadMappingConfigs(): boolean {
        if (!localStorage.hasOwnProperty("mappingConfigs")) {// Check if 'mappingConfigs' exists in localStorage
            return false;
        }  // If 'mappingConfigs' does not exist, return false

        const mappingConfigs = JSON.parse(this.getLocalStorageItem("mappingConfigs")!);  // Parse the existing 'mappingConfigs' from localStorage // TODO: is this bang correct?

        for (const key of Object.keys(mappingConfigs)) {// Iterate over the keys of the mapping configurations
            
            if (!Object.values(mappingConfigs[key]).includes("BUTTON_CYCLE_FUSION") || !Object.values(mappingConfigs[key]).includes("BUTTON_CONSOLE")) {
                return false;
            }
            this.scene.inputController.injectConfig(key, mappingConfigs[key]);
        }  // Inject each configuration into the input controller for the corresponding key

        return true;  // Return true to indicate the operation was successful
    }

    public resetMappingToFactory(): boolean {
        if (!localStorage.hasOwnProperty("mappingConfigs")) {// Check if 'mappingConfigs' exists in localStorage
            return false;
        }  // If 'mappingConfigs' does not exist, return false
        localStorage.removeItem("mappingConfigs");
        this.scene.inputController.resetConfigs();
        return true; // TODO: is `true` the correct return value?
    }

    /**
     * Saves a gamepad setting to localStorage.
     *
     * @param setting - The gamepad setting to save.
     * @param valueIndex - The index of the value to set for the gamepad setting.
     * @returns `true` if the setting is successfully saved.
     *
     * @remarks
     * This method initializes an empty object for gamepad settings if none exist in localStorage.
     * It then updates the setting in the current scene and iterates over the default gamepad settings
     * to update the specified setting with the new value. Finally, it saves the updated settings back
     * to localStorage and returns `true` to indicate success.
     */
    public saveControlSetting(device: Device, localStoragePropertyName: string, setting: SettingGamepad | SettingKeyboard, settingDefaults, valueIndex: integer): boolean {
        let settingsControls: object = {};  // Initialize an empty object to hold the gamepad settings

        if (localStorage.hasOwnProperty(localStoragePropertyName)) {  // Check if 'settingsControls' exists in localStorage
            settingsControls = JSON.parse(this.getLocalStorageItem(localStoragePropertyName)!);  // Parse the existing 'settingsControls' from localStorage // TODO: is this bang correct?
        }

        if (device === Device.GAMEPAD) {
            setSettingGamepad(this.scene, setting as SettingGamepad, valueIndex);  // Set the gamepad setting in the current scene
        } else if (device === Device.KEYBOARD) {
            setSettingKeyboard(this.scene, setting as SettingKeyboard, valueIndex);  // Set the keyboard setting in the current scene
        }

        Object.keys(settingDefaults).forEach(s => {  // Iterate over the default gamepad settings
            if (s === setting) {// If the current setting matches, update its value
                settingsControls[s] = valueIndex;
            }
        });

        this.setLocalStorageItem(localStoragePropertyName, JSON.stringify(settingsControls));  // Save the updated gamepad settings back to localStorage

        return true;  // Return true to indicate the operation was successful
    }

    /**
     * Loads Settings from local storage if available
     * @returns true if succesful, false if not
     */
    private loadSettings(): boolean {
        resetSettings(this.scene);

        if (!localStorage.hasOwnProperty("settings")) {
            return false;
        }

        const settings = JSON.parse(this.getLocalStorageItem("settings")!); // TODO: is this bang correct?

        for (const setting of Object.keys(settings)) {
            setSetting(this.scene, setting, settings[setting]);
        }

        return true; // TODO: is `true` the correct return value?
    }

    private loadGamepadSettings(): boolean {
        Object.values(SettingGamepad).map(setting => setting as SettingGamepad).forEach(setting => setSettingGamepad(this.scene, setting, settingGamepadDefaults[setting]));

        if (!localStorage.hasOwnProperty("settingsGamepad")) {
            return false;
        }
        const settingsGamepad = JSON.parse(this.getLocalStorageItem("settingsGamepad")!); // TODO: is this bang correct?

        for (const setting of Object.keys(settingsGamepad)) {
            setSettingGamepad(this.scene, setting as SettingGamepad, settingsGamepad[setting]);
        }

        return true; // TODO: is `true` the correct return value?
    }

    public saveTutorialFlag(tutorial: Tutorial, flag: boolean): boolean {
        const key = getDataTypeKey(GameDataType.TUTORIALS);
        let tutorials: object = {};
        if (localStorage.hasOwnProperty(key)) {
            tutorials = JSON.parse(this.getLocalStorageItem(key)!); // TODO: is this bang correct?
        }

        Object.keys(Tutorial).map(t => t as Tutorial).forEach(t => {
            const key = Tutorial[t];
            if (key === tutorial) {
                tutorials[key] = flag;
            } else {
                tutorials[key] ??= false;
            }
        });

        this.setLocalStorageItem(key, JSON.stringify(tutorials));

        return true;
    }

    public getTutorialFlags(): TutorialFlags {
        const key = getDataTypeKey(GameDataType.TUTORIALS);
        const ret: TutorialFlags = {};
        Object.values(Tutorial).map(tutorial => tutorial as Tutorial).forEach(tutorial => ret[Tutorial[tutorial]] = false);

        if (!localStorage.hasOwnProperty(key)) {
            return ret;
        }

        const tutorials = JSON.parse(this.getLocalStorageItem(key)!); // TODO: is this bang correct?

        for (const tutorial of Object.keys(tutorials)) {
            ret[tutorial] = tutorials[tutorial];
        }

        return ret;
    }

    public saveSeenDialogue(dialogue: string): boolean {
        const key = getDataTypeKey(GameDataType.SEEN_DIALOGUES);
        const dialogues: object = this.getSeenDialogues();

        dialogues[dialogue] = true;
        this.setLocalStorageItem(key, JSON.stringify(dialogues));

        return true;
    }

    public getSeenDialogues(): SeenDialogues {
        const key = getDataTypeKey(GameDataType.SEEN_DIALOGUES);
        const ret: SeenDialogues = {};

        if (!localStorage.hasOwnProperty(key)) {
            return ret;
        }

        const dialogues = JSON.parse(this.getLocalStorageItem(key)!); // TODO: is this bang correct?

        for (const dialogue of Object.keys(dialogues)) {
            ret[dialogue] = dialogues[dialogue];
        }

        return ret;
    }

    public getSessionSaveData(scene: BattleScene): SessionSaveData {
        return {
            seed: scene.seed,
            playTime: scene.sessionPlayTime,
            gameMode: scene.gameMode.modeId,
            party: scene.getParty().map(p => new PokemonData(p)),
            enemyParty: scene.getEnemyParty().map(p => new PokemonData(p)),
            modifiers: scene.findModifiers(() => true).map(m => new PersistentModifierData(m, true)),
            enemyModifiers: scene.findModifiers(() => true, false).map(m => new PersistentModifierData(m, false)),
            arena: new ArenaData(scene.arena),
            pokeballCounts: scene.pokeballCounts,
            money: scene.money,
            score: scene.score,
            waveIndex: scene.currentBattle?.waveIndex ?? 0,
            battleType: scene.currentBattle?.battleType ?? "",
            trainer: scene.currentBattle?.battleType === BattleType.TRAINER ? new TrainerData(scene.currentBattle.trainer) : null,
            gameVersion: scene.game.config.gameVersion,
            timestamp: new Date().getTime(),
            challenges: scene.gameMode.challenges.map(c => new ChallengeData(c)),
            playerRival: this.playerRival,
            sessionQuestModifierData: this.sessionQuestModifierData,
            activeConsoleCodeQuests: this.activeConsoleCodeQuests,
            nightmareBattleSeeds: this.nightmareBattleSeeds,
            fixedBattleSeeds: this.fixedBattleSeeds,
            sacrificeToggleOn: this.sacrificeToggleOn,
            preargsForShop: this.preargsForShop,
            majorBossWave: scene.majorBossWave,
            moveUsageCount: this.moveUsageCount,
            pendingMoveUpgrades: this.pendingMoveUpgrades,
            biomeChange: this.biomeChange,
            recoveryBossMode: scene.recoveryBossMode,
            pathNodeContext: scene.pathNodeContext,
            selectedNodeType: scene.selectedNodeType,
            battlePath: this.battlePath,
            selectedPath: this.selectedPath,
            battlePathWave: scene.battlePathWave,
            dynamicMode: scene.dynamicMode,
            rivalWave: scene.rivalWave,
        } as SessionSaveData;
    }


    public getSessionSavedData(scene: BattleScene, slotId: integer): SessionSaveData {
          const sessionDataStr = this.getLocalStorageItem(`sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`);
          return JSON.parse(sessionDataStr);
    }

    getSession(slotId: integer): Promise<SessionSaveData | null> {
        return new Promise(async (resolve, reject) => {
            if (slotId < 0) {
                return resolve(null);
            }
            const handleSessionData = async (sessionDataStr: string) => {
                try {
                    const sessionData = this.parseSessionData(sessionDataStr);
                    resolve(sessionData);
                } catch (err) {
                    reject(err);
                    return;
                }
            };
            const sessionData = this.getLocalStorageItem(`sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`);
            if (sessionData) {
                await handleSessionData(decrypt(sessionData, bypassLogin));
            } else {
                return resolve(null);
            }
        });
    }

    public getSessionQuestModifierCount(modifierId: string): number {
        return this.sessionQuestModifierData[modifierId] || 0;
    }

    public incrementSessionQuestModifierCount(modifierId: string): void {
        this.sessionQuestModifierData[modifierId] = (this.sessionQuestModifierData[modifierId] || 0) + 1;
    }

    public resetSessionQuestModifierCount(modifierId: string): void {
        this.sessionQuestModifierData[modifierId] = 0;
    }

    public addPermaModifier(modifierKey: keyof typeof modifierTypes): void {
        const modifierTypeFunc = modifierTypes[modifierKey];
        if (modifierTypeFunc) {
            try {
                let modifierType = modifierTypeFunc();
                if (modifierType instanceof QuestModifierTypeGenerator || modifierType instanceof PermaModifierTypeGenerator) {
                    modifierType = modifierType.generateType([], [0]);
                }
                if (!modifierType.id) {
                    modifierType.withIdFromFunc(modifierTypeFunc);
                }
                const newModifier = modifierType.newModifier() as PersistentModifier;
                if (newModifier) {
                    this.permaModifiers.addModifier(this.scene, newModifier);
                }
            } catch (error) {
                console.error(`Failed to create perma modifier for ${modifierKey}: ${error.message}`);
            }
        } else {
            console.error(`Modifier type ${modifierKey} not found in modifierTypes`);
        }
    }

    

    loadSession(scene: BattleScene, slotId: integer, sessionData?: SessionSaveData): Promise<boolean> {
        return new Promise(async (resolve, reject) => {
            try {
                const initSessionFromData = async (_sessionData: SessionSaveData) => {
                    console.debug(_sessionData);

                    scene.gameMode = getGameMode(_sessionData.gameMode || GameModes.CLASSIC, scene);
                    if (_sessionData.challenges) {
                        scene.gameMode.challenges = _sessionData.challenges.map(c => c.toChallenge());
                    }

                    scene.setSeed(_sessionData.seed || scene.game.config.seed[0]);
                    scene.resetSeed();


                    scene.sessionPlayTime = _sessionData.playTime || 0;
                    scene.lastSavePlayTime = 0;

                    scene.majorBossWave = _sessionData.majorBossWave || 0;
                    this.nightmareBattleSeeds = _sessionData.nightmareBattleSeeds || null;
                    this.fixedBattleSeeds = _sessionData.fixedBattleSeeds || null;
                    this.sacrificeToggleOn = _sessionData.sacrificeToggleOn || false;
                    this.moveUsageCount = _sessionData.moveUsageCount || {};
                    this.pendingMoveUpgrades = _sessionData.pendingMoveUpgrades || -1;
                    this.preargsForShop = _sessionData.preargsForShop || {};
                    this.biomeChange = _sessionData.biomeChange || BiomeChange.NONE;
                    this.recoveryBossMode = _sessionData.recoveryBossMode || RecoveryBossMode.NONE;
                    scene.pathNodeContext = _sessionData.pathNodeContext === undefined || _sessionData.pathNodeContext === null ? null : _sessionData.pathNodeContext;
                    scene.selectedNodeType = _sessionData.selectedNodeType === undefined || _sessionData.selectedNodeType === null ? null : _sessionData.selectedNodeType;
                    this.battlePath = _sessionData.battlePath || null;
                    this.selectedPath = _sessionData.selectedPath || "";
                    scene.battlePathWave = _sessionData.battlePathWave || 1;
                    scene.dynamicMode = _sessionData.dynamicMode || undefined;
                    scene.rivalWave = _sessionData.rivalWave || 0;
                    const loadPokemonAssets: Promise<void>[] = [];

                    let waveDebug = _sessionData.waveIndex;
                    // waveDebug = 89;

                    const party = scene.getParty();

                    for (const p of _sessionData.party) {
                        const pokemon = p.toPokemon(scene) as PlayerPokemon;
                        pokemon.setVisible(false);
                        loadPokemonAssets.push(pokemon.loadAssets());
                        party.push(pokemon);
                    }


                    Object.keys(scene.pokeballCounts).forEach((key: string) => {
                        scene.pokeballCounts[key] = _sessionData.pokeballCounts[key] || 0;
                    });
                    if (Overrides.POKEBALL_OVERRIDE.active) {
                        scene.pokeballCounts = Overrides.POKEBALL_OVERRIDE.pokeballs;
                    }

                    scene.money = _sessionData.money || 0;
                    scene.updateMoneyText();

                    if (scene.money > this.gameStats.highestMoney) {
                        this.gameStats.highestMoney = scene.money;
                    }

                    scene.score = _sessionData.score;
                    scene.updateScoreText();

                    scene.newArena(_sessionData.arena.biome);

                    const battleType = _sessionData.battleType || 0;
                    const trainerConfig = _sessionData.trainer ? _sessionData.trainer.rivalConfig ? _sessionData.trainer.rivalConfig : trainerConfigs[_sessionData.trainer.trainerType] : null;
                    const battle = scene.newBattle(waveDebug, battleType, _sessionData.trainer, battleType === BattleType.TRAINER ? trainerConfig?.doubleOnly || _sessionData.trainer?.variant === TrainerVariant.DOUBLE : _sessionData.enemyParty.length > 1);
                    battle.enemyLevels = _sessionData.enemyParty.map(p => p.level);

                        scene.arena.init();

                        if(_sessionData.trainer?.trainerType === TrainerType.SMITTY) {
                            battle.enemyLevels?.forEach((level, e) => {
                                battle.enemyParty[e] = battle.trainer?.genPartyMember(e)!;
                                loadPokemonAssets.push(battle.enemyParty[e].loadAssets());
                            });
                        }

                        else {

                        _sessionData.enemyParty.forEach((enemyData, e) => {
                            const enemyPokemon = enemyData.toPokemon(scene, battleType, e, _sessionData.trainer?.variant === TrainerVariant.DOUBLE) as EnemyPokemon;
                            battle.enemyParty[e] = enemyPokemon;
                            if (battleType === BattleType.WILD) {
                                battle.seenEnemyPartyMemberIds.add(enemyPokemon.id);
                            }

                            loadPokemonAssets.push(enemyPokemon.loadAssets());
                        });
                        }

                    scene.arena.weather = _sessionData.arena.weather;
                    scene.arena.eventTarget.dispatchEvent(new WeatherChangedEvent(WeatherType.NONE, scene.arena.weather?.weatherType!, scene.arena.weather?.turnsLeft!)); // TODO: is this bang correct?

                    scene.arena.terrain = _sessionData.arena.terrain;
                    scene.arena.eventTarget.dispatchEvent(new TerrainChangedEvent(TerrainType.NONE, scene.arena.terrain?.terrainType!, scene.arena.terrain?.turnsLeft!)); // TODO: is this bang correct?

                    const modifiersModule = await import("../modifier/modifier");

                    for (const modifierData of _sessionData.modifiers) {
                        const modifier = modifierData.toModifier(scene, modifiersModule[modifierData.className]);
                        if (modifier) {
                            scene.addModifier(modifier, true);
                        }
                    }

                    scene.updateModifiers(true);

                    for (const enemyModifierData of _sessionData.enemyModifiers) {
                        const modifier = enemyModifierData.toModifier(scene, modifiersModule[enemyModifierData.className]);
                        if (modifier) {
                            scene.addEnemyModifier(modifier, true);
                        }
                    }

                    scene.updateModifiers(false);

                    
                    this.playerRival = _sessionData.playerRival || null;
                    this.sessionQuestModifierData = _sessionData.sessionQuestModifierData || {};
                    this.activeConsoleCodeQuests = _sessionData.activeConsoleCodeQuests || [];


                    Promise.all(loadPokemonAssets).then(() => resolve(true));
                };
                if(this.combinedData.sessionData?.length) {
                    await initSessionFromData(this.parseSessionData(this.combinedData.sessionData[slotId]));
                    this.combinedData = {};
                } else if (sessionData) {
                    await initSessionFromData(sessionData);
                } else {
                const data = await this.getSession(slotId);
                if (data) {
                    await initSessionFromData(data);
                } else {
                    resolve(false);
                            return;
                }
            }

            scene.sessionSlotId = slotId; // Set the current session slot ID
            resolve(true);
            } catch (err) {
            console.error("Error loading session:", err);
                reject(err);
                return;
            }
        });
    }

    modifyPartyData(partyData: PokemonData[], scene: BattleScene) {
        partyData.splice(0, partyData.length);

        const poke1 = new PokemonData({
            id: randSeedInt(1000),
            player: true,
            species: Species.CHARIZARD,
            formIndex: 2,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.GENDERLESS,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.TACKLE),
                new PokemonMove(Moves.LEER),
                new PokemonMove(Moves.HELPING_HAND),
                new PokemonMove(Moves.EARTHQUAKE),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke2 = new PokemonData({
            id: randSeedInt(1000),
            player: true,
            species: Species.NIDOKING,
            formIndex: 1,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 1,
            pokeball: PokeballType.POKEBALL,
            level: 5,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [50, 50, 50, 50, 50, 50],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.ICICLE_SPEAR),
                new PokemonMove(Moves.SHELL_SMASH),
                new PokemonMove(Moves.RECOVER),
                new PokemonMove(Moves.TACKLE),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 100,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke3 = new PokemonData({
            id: randSeedInt(1000),
            player: true,
            species: Species.NIDOKING,
            formIndex: 0,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.NASTY_PLOT),
                new PokemonMove(Moves.BLIZZARD),
                new PokemonMove(Moves.THUNDER_PUNCH),
                new PokemonMove(Moves.TELEPORT),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke4 = new PokemonData({
            id: randSeedInt(1000),
            player: true,
            species: Species.DARKRAI,
            formIndex: 0,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 55,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.THUNDERBOLT),
                new PokemonMove(Moves.SHADOW_BALL),
                new PokemonMove(Moves.AURA_SPHERE),
                new PokemonMove(Moves.GIGA_DRAIN),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke5 = new PokemonData({
            id: randSeedInt(1000),
            player: true,
            species: Species.AEGISLASH,
            formIndex: 0,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.CLOSE_COMBAT),
                new PokemonMove(Moves.ZIPPY_ZAP),
                new PokemonMove(Moves.EARTHQUAKE),
                new PokemonMove(Moves.IRON_HEAD),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke6 = new PokemonData({
            id: randSeedInt(1000),
            player: true,
            species: Species.SWAMPERT,
            formIndex: 1,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 50,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.LIQUIDATION),
                new PokemonMove(Moves.EARTHQUAKE),
                new PokemonMove(Moves.ICICLE_CRASH),
                new PokemonMove(Moves.POWER_UP_PUNCH),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        partyData.push(poke1, poke2, poke3, poke4, poke5, poke6);

        // partyData.forEach((pokemon, index) => {
        //     const abilities = [Abilities.MISERY_TOUCH, Abilities.JUST_A_JERK, Abilities.SPIRITUAL_BOND, Abilities.VINE_FIST, Abilities.TOXIC_COMBUSTION, Abilities.SOUL_COLLECTOR];
        //
        //     pokemon.summonData.ability = abilities[index % abilities.length];
        //     pokemon.passive = true;
        // });
    }

    modifyEnemyPartyData(partyData: PokemonData[], scene: BattleScene) {
        partyData.splice(0, partyData.length);

        const poke1 = new PokemonData({
            id: randSeedInt(1000),
            player: false,
            species: Species.NIDOKING,
            formIndex: 1,
            abilityIndex: 0,
            passive: true,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 5,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.SPLASH),
                new PokemonMove(Moves.SPLASH),
                new PokemonMove(Moves.SPLASH),
                new PokemonMove(Moves.SPLASH),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke2 = new PokemonData({
            id: randSeedInt(1000),
            player: false,
            species: Species.ELECTRODE,
            formIndex: 0,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 60,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.GYRO_BALL),
                new PokemonMove(Moves.AURA_SPHERE),
                new PokemonMove(Moves.ABSORB),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke3 = new PokemonData({
            id: randSeedInt(1000),
            player: false,
            species: Species.TOTODILE,
            formIndex: 0,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.THUNDER_SHOCK),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke4 = new PokemonData({
            id: randSeedInt(1000),
            player: false,
            species: Species.TOTODILE,
            formIndex: 0,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.THUNDER_SHOCK),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke5 = new PokemonData({
            id: randSeedInt(1000),
            player: false,
            species: Species.TOTODILE,
            formIndex: 0,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.THUNDER_SHOCK),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        const poke6 = new PokemonData({
            id: randSeedInt(1000),
            player: false,
            species: Species.TOTODILE,
            formIndex: 0,
            abilityIndex: 0,
            passive: false,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 100,
            exp: 0,
            levelExp: 0,
            gender: Gender.MALE,
            hp: 100,
            stats: [20, 20, 20, 20, 20, 20],
            ivs: [31, 31, 31, 31, 31, 31],
            nature: Nature.ADAMANT,
            natureOverride: -1,
            moveset: [
                new PokemonMove(Moves.THUNDER_SHOCK),
            ],
            status: null,
            friendship: 70,
            metLevel: 5,
            luck: 10,
            pauseEvolutions: false,
            pokerus: false,
            fusionSpecies: null,
            fusionFormIndex: 0,
            fusionAbilityIndex: 0,
            fusionShiny: false,
            fusionVariant: 0,
            fusionLuck: 0,
            boss: false,
        });

        // partyData.push(poke1);
        // partyData.push(poke1, poke2, poke3, poke4, poke5, poke6);
        partyData.push(poke1);

        partyData.forEach((pokemon, index) => {
            const abilities = [Abilities.TERA_FORCE, Abilities.LONG_FORGOTTEN, Abilities.WAAAA, Abilities.TOO_LATE, Abilities.MEMORIES_OF_TENNIS, Abilities.NIGHTMARE_SAUCE];

            pokemon.summonData.ability = abilities[index % abilities.length];
            pokemon.passive = true;
        });
    }

    deleteSession(slotId: integer): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            localStorage.removeItem(`sessionData${this.scene.sessionSlotId ? this.scene.sessionSlotId : ""}_${loggedInUser?.username}`);
            return resolve(true);
        });
    }

    /* Defines a localStorage item 'daily' to check on clears, offline implementation of savedata/newclear API
    If a GameModes clear other than Daily is checked, newClear = true as usual
    If a Daily mode is cleared, checks if it was already cleared before, based on seed, and returns true only to new daily clear runs */
    offlineNewClear(scene: BattleScene): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const sessionData = this.getSessionSaveData(scene);
            const seed = sessionData.seed;
            let daily: string[] = [];

            if (sessionData.gameMode === GameModes.DAILY) {
                if (localStorage.hasOwnProperty("daily")) {
                    daily = JSON.parse(atob(this.getLocalStorageItem("daily")!)); // TODO: is this bang correct?
                    if (daily.includes(seed)) {
                        return resolve(false);
                    } else {
                        daily.push(seed);
                        this.setLocalStorageItem("daily", btoa(JSON.stringify(daily)));
                        return resolve(true);
                    }
                } else {
                    daily.push(seed);
                    this.setLocalStorageItem("daily", btoa(JSON.stringify(daily)));
                    return resolve(true);
                }
            } else {
                return resolve(true);
            }
        });
    }

    checkSessionExists(slotId: number): boolean {
        if (slotId < 0 || slotId > 4) {
            console.warn(`Invalid slotId: ${slotId}. Slot ID must be between 0 and 4.`);
        }
        const sessionKey = `sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`;
        const sessionData = this.getLocalStorageItem(sessionKey);
        return !!sessionData
    }

    getLastPlayedSessionSlot(): number {
        let lastSlot = -1;
        let latestTimestamp = 0;

        for (let slotId = 0; slotId < 5; slotId++) {
            const sessionKey = `sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`;
            const sessionData = this.getLocalStorageItem(sessionKey);
            
            if (sessionData) {
                try {
                    const parsedData = JSON.parse(decrypt(sessionData, bypassLogin));
                    const sessionTimestamp = parsedData?.timestamp || 0;
                    
                    if (sessionTimestamp > latestTimestamp) {
                        latestTimestamp = sessionTimestamp;
                        lastSlot = slotId;
                    }
                } catch (err) {
                    console.error(`Error parsing session data for slot ${slotId}:`, err);
                }
            }
        }

        return lastSlot;
    }

    tryClearSession(scene: BattleScene, slotId: integer): Promise<[success: boolean, newClear: boolean]> {
        return new Promise<[boolean, boolean]>(async (resolve) => {
            if (slotId < 0) {
                return resolve([true, true]);
            }
            localStorage.removeItem(`sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`);
            return resolve([true, true]);
        });
    }

    parseSessionData(dataStr: string): SessionSaveData {
        return JSON.parse(dataStr, (k: string, v: any) => {

            if (k === "party" || k === "enemyParty") {
                const ret: PokemonData[] = [];
                if (v === null) {
                    v = [];
                }
                for (const pd of v) {
                    ret.push(new PokemonData(pd));
                }
                return ret;
            }

            if (k === "trainer") {
                return v ? new TrainerData(v) : null;
            }

            if (k === "nightmareBattleSeeds") {
                return v ? v as NightmareBattleSeeds : null;
            }

            if (k === "fixedBattleSeeds") {
                return v ? v as FixedBattleSeeds : null;
            }

            if (k === "sacrificeToggleOn") {
                return v ? v as boolean : false;
            }

            if (k === "moveUsageCount") {
                return v ? v as Record<number, number> : {};
            }

            if (k === "preargsForShop") {
                return v ? v as Record<number, PreargsForShop> : {};
            }

            if (k === "pathNodeContext") {
                return v !== undefined ? v : null;
            }

            if (k === "selectedNodeType") {
                return v !== undefined ? v : null;
            }

            if (k === "battlePath") {
                return v !== undefined ? v : null;
            }

            if (k === "selectedPath") {
                return v !== undefined ? v : "";
            }

            if (k === "battlePathWave") {
                return v !== undefined ? v : 1;
            }

            if (k === "dynamicMode") {
                return v !== undefined ? v : undefined;
            }

            if (k === "modifiers" || k === "enemyModifiers") {
                const player = k === "modifiers";
                const ret: PersistentModifierData[] = [];
                if (v === null) {
                    v = [];
                }
                for (const md of v) {
                    if (md?.type?.id === "modifierType:ModifierType.SUPER_EXP_CHARM") {
                        continue;
                    }
                    if (md?.className === "ExpBalanceModifier") {
                        md.stackCount = Math.min(md.stackCount, 4);
                    }
                    if (md instanceof EnemyAttackStatusEffectChanceModifier && md.effect === StatusEffect.FREEZE || md.effect === StatusEffect.SLEEP) {
                        continue;
                    }
                    ret.push(new PersistentModifierData(md, player));
                }
                return ret;
            }

            if (k === "arena") {
                return new ArenaData(v);
            }

            if (k === "challenges") {
                const ret: ChallengeData[] = [];
                if (v === null) {
                    v = [];
                }
                for (const c of v) {
                    ret.push(new ChallengeData(c));
                }
                return ret;
            }

            if (k === "playerRival") {
                return v as TrainerType | null;
            }

            if (k === "sessionQuestModifierData") {
                return v as Record<string, number>;
            }

            if (k === "activeConsoleCodeQuests") {
                return Array.isArray(v) ? v : [];
            }

            return v;
        }) as SessionSaveData;
    }

    private serializeBigInt(obj: any): any {
        return JSON.stringify(obj, (key, value) => {
            // Handle bigint directly
            if (typeof value === "bigint") {
                return value.toString() + "n";
            }

            // Only recursively parse objects that might contain BigInt values
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
                // Check if this is a DexEntry or contains DexAttr-related fields
                const mightContainBigInt = 
                    'seenAttr' in value || 
                    'caughtAttr' in value || 
                    'dexData' in value ||
                    key === 'dexData';

                if (!mightContainBigInt) {
                    return value;
                }

                const newObj: any = {};
                for (const k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        try {
                            // Recursively handle all nested values
                            newObj[k] = JSON.parse(this.serializeBigInt(value[k]));
                        } catch (error) {
                            console.error(`Error parsing nested value for key ${k}:`, error);
                            newObj[k] = value[k]; // Fallback to original value
                        }
                    }
                }
                return newObj;
            }

            // Only recursively parse arrays if they're within a BigInt-containing context
            if (Array.isArray(value)) {
                const parentMightContainBigInt = 
                    key === 'dexData' || 
                    key === 'seenAttr' || 
                    key === 'caughtAttr';

                if (!parentMightContainBigInt) {
                    return value;
                }

                return value.map(item => {
                    try {
                        // Recursively handle all items in array
                        return JSON.parse(this.serializeBigInt(item));
                    } catch (error) {
                        console.error('Error parsing array item:', error);
                        return item; // Fallback to original value
                    }
                });
            }

            return value;
        });
    }


    private deserializeBigInt(obj: any): any {
        return JSON.parse(JSON.stringify(obj), (key, value) => {
            if (typeof value === 'string') {
                if (/^\d+n$/.test(value)) {
                    return BigInt(value.slice(0, -1));
                }
                // Handle cases where BigInt was stringified without 'n'
                if (['caughtAttr', 'seenAttr', 'abilityAttr'].includes(key)) {
                    return BigInt(value);
                }
            }
            return value;
        });
    }
    saveAll(scene: BattleScene, skipVerification: boolean = false, sync: boolean = false, useCachedSession: boolean = false, useCachedSystem: boolean = false): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            try {
            await updateUserInfo();

            let systemData = useCachedSystem
                ? this.parseSystemData(decrypt(this.getLocalStorageItem(`data_${loggedInUser?.username}`)!, bypassLogin)) || this.getSystemSaveData()
                : this.getSystemSaveData();

            let sessionData = useCachedSession
                ? this.parseSessionData(decrypt(this.getLocalStorageItem(`sessionData${this.scene.sessionSlotId ? this.scene.sessionSlotId : ""}_${loggedInUser?.username}`)!, bypassLogin)) || this.getSessionSaveData(scene)
                : this.getSessionSaveData(scene);

            const maxIntAttrValue = 0x80000000;

            let serializedSystemData = this.serializeBigInt(systemData);

            if(!scene.gameMode.isTestMod && sessionData.playTime && sessionData.party.length > 0 && sessionData.waveIndex > 0) {
            let serializedSessionData = this.serializeBigInt(sessionData);
            this.setLocalStorageItem(`sessionData${scene.sessionSlotId ? scene.sessionSlotId : ""}_${loggedInUser?.username}`, encrypt(serializedSessionData, bypassLogin));
                console.debug("Session data saved to slot", scene.sessionSlotId);
            }
            this.setLocalStorageItem(`data_${loggedInUser?.username}`, encrypt(serializedSystemData, bypassLogin));

                resolve(true);
            } catch (error) {
                console.error("Error saving all data locally:", error);
                resolve(false);
            }
        });
    }

    
    public localSaveAll(scene: BattleScene): void {
        this.saveAll(scene).then(() => {
            console.debug("Local save completed");
        }).catch(error => {
            console.error("Error in background save:", error);
        });
    }

    public tryExportData(dataType: GameDataType, slotId: integer = 0): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            const dataKey = `${getDataTypeKey(dataType, slotId)}_${loggedInUser?.username}`;

            const handleData = async (dataStr: string) => {
                let encryptedData;
                let downloadName;

                if (dataType === GameDataType.COMBINED) {
                    const systemDataStr = this.getLocalStorageItem(`data_${loggedInUser?.username}`);
                    if (!systemDataStr) {
                        resolve(false);
                        return;
                    }

                    const sessionDataStrs = await Promise.all(
                        Array.from({ length: 5 }, (_, i) =>
                            this.getLocalStorageItem(`sessionData${i || ""}_${loggedInUser?.username}`)
                        )
                    );

                    const systemData = this.parseSystemData(
                        this.convertSystemDataStr(
                            JSON.stringify(this.serializeBigInt(
                                this.deserializeBigInt(JSON.parse(decrypt(systemDataStr, bypassLogin)))
                            ))
                        )
                    );

                    const validSessionData = sessionDataStrs.filter(Boolean)
                        .map(str => this.deserializeBigInt(JSON.parse(decrypt(str!, bypassLogin))))
                        .filter((session: any) => session?.timestamp && (session?.party?.length > 0 || session?.enemyParty?.length > 0))
                        .map(session => this.serializeBigInt(session)); // Serialize each session

                    const combinedData = {
                        systemData: systemData,
                        sessionData: validSessionData
                    };

                    encryptedData = AES.encrypt(JSON.stringify(combinedData), saveKey);
                    
                    const now = new Date();
                    const month = now.getMonth() + 1;
                    const day = now.getDate();
                    const hour = now.getHours();
                    const minute = now.getMinutes();
                    
                    if (this.scene.currentBattle) {
                        const waveIndex = this.scene.currentBattle.waveIndex;
                        const gameMode = this.scene.gameMode.getName();
                        
                        let playerPokemonName = "Unknown";
                        if (this.scene.getParty().length > 0) {
                            playerPokemonName = this.scene.getParty()[0].name || "Unknown";
                        }
                        
                        let enemyPokemonName = "Unknown";
                        if (this.scene.getEnemyParty().length > 0) {
                            enemyPokemonName = this.scene.getEnemyParty()[0].name || "Unknown";
                        }
                        
                        downloadName = `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}_${hour.toString().padStart(2, '0')}-${minute.toString().padStart(2, '0')}_wave_${waveIndex}_${playerPokemonName}_vs_${enemyPokemonName}_${gameMode}_`;
                    } else {
                        downloadName = `${month.toString().padStart(2, '0')}_${day.toString().padStart(2, '0')}_${hour.toString().padStart(2, '0')}-${minute.toString().padStart(2, '0')}_title_screen_save`;
                    }
                    
                    downloadName = `PokeVoid_${downloadName}.prsv`;
                } 
              
                else {
                    switch (dataType) {
                        case GameDataType.SYSTEM:
                            dataStr = this.convertSystemDataStr(dataStr, true);
                            break;
                    }
                    encryptedData = AES.encrypt(dataStr, saveKey);
                    downloadName = `${dataKey}.prsv`;
                }

                const blob = new Blob([encryptedData.toString()], { type: "text/json" });
                const link = document.createElement("a");
                link.href = window.URL.createObjectURL(blob);
                link.download = downloadName;
                link.click();
                link.remove();
            };

            if (dataType === GameDataType.COMBINED) {
                await handleData("");
                resolve(true);
            } else {
                const data = this.getLocalStorageItem(dataKey);
                if (data) {
                    await handleData(decrypt(data, bypassLogin));
                }
                resolve(!!data);
            }
        });
    }

    public importData(dataType: GameDataType, slotId: integer = 0): void {
        const dataKey = `${getDataTypeKey(dataType, slotId)}_${loggedInUser?.username}`;
        
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        
        if (isIOS) {
            try {
                import("../ui/import-data-form-ui-handler").then(module => {
                    try {
                        const handler = new module.default(this.scene);
                        handler.setImportParameters(dataType, slotId);
                        this.scene.ui.setMode(Mode.IMPORT_DATA_FORM, dataType, slotId);
                    } catch (e) {
                        console.error("Error instantiating ImportDataFormUiHandler:", e);
                    }
                }).catch(error => {
                    console.error("Failed to load ImportDataFormUiHandler:", error);
                    this.useTraditionalFileInput(dataType, slotId);
                });
                return;
            } catch (e) {
                console.error("Error in iOS import handler logic:", e);
                this.useTraditionalFileInput(dataType, slotId);
                return;
            }
        }
        
        this.useTraditionalFileInput(dataType, slotId);
    }
    
    private useTraditionalFileInput(dataType: GameDataType, slotId: integer = 0): void {
        const existingFile = document.getElementById("saveFile");
        existingFile?.remove();

        const saveFile = document.createElement("input");
        saveFile.id = "saveFile";
        saveFile.type = "file";
        saveFile.accept = ".prsv";
        saveFile.style.display = "none";

        saveFile.addEventListener("change", e => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const encryptedData = event.target?.result?.toString() || "";
                    const dataStr = AES.decrypt(encryptedData, saveKey).toString(enc.Utf8);

                    let valid = false;
                    let dataName: string;
                    let combinedData: { systemData?: any, sessionData?: any[] } = {};

                    if (dataType === GameDataType.COMBINED) {
                        combinedData = JSON.parse(dataStr);

                        if (typeof combinedData.systemData === 'string') {
                            combinedData.systemData = this.deserializeBigInt(JSON.parse(combinedData.systemData));
                        }

                        if (Array.isArray(combinedData.sessionData)) {
                            combinedData.sessionData = combinedData.sessionData.map((session: any) => {
                                if (typeof session === 'string') {
                                    return this.deserializeBigInt(JSON.parse(session));
                                }
                                return session;
                            });
                        }
                        valid = this.validateCombinedData(combinedData);
                        dataName = "system and session";
                    } else {
                        valid = await this.validateSingleTypeData(dataType, dataStr);
                        dataName = this.getDataTypeName(dataType);
                    }

                    if (!valid) {
                        this.scene.ui.showText(
                            i18next.t("menuUiHandler:dataCorrupted"),
                            null,
                            () => this.scene.ui.showText("", 0),
                            Utils.fixedInt(1500)
                        );
                        return;
                    }

                    this.showImportConfirmation(dataType, dataName, combinedData, dataStr, slotId);

                } catch (ex) {
                    console.error("Import error:", ex);
                    this.scene.ui.showText(
                        i18next.t("menuUiHandler:importFailed"),
                        null,
                        () => this.scene.ui.showText("", 0),
                        Utils.fixedInt(1500)
                    );
                }
            };

            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                reader.readAsText(file);
            }
        });

        saveFile.click();
    }

    private validateCombinedData(data: any): boolean {
        if (!data.systemData.dexData || !data.systemData.timestamp) {
            return false
        }

        if (data.sessionData.length) {
            if (!Array.isArray(data.sessionData)) {
                return false;
            }
            return data.sessionData.every((session: any) => {
                return session?.timestamp && (session?.party?.length > 0 || session?.enemyParty?.length > 0);
            });
        }

        return true;
    }

    private async validateSingleTypeData(dataType: GameDataType, dataStr: string): Promise<boolean> {
        try {
            switch (dataType) {
                case GameDataType.SYSTEM:
                    const systemData = this.parseSystemData(this.convertSystemDataStr(dataStr));
                    return !!systemData.dexData && !!systemData.timestamp;
                case GameDataType.SESSION:
                    const sessionData = this.parseSessionData(dataStr);
                    return (!!sessionData.party || !!sessionData.enemyParty) && !!sessionData.timestamp;
                case GameDataType.RUN_HISTORY:
                    const data = JSON.parse(dataStr);
                    return Object.values(data).every((entry: any) =>
                        ["isFavorite", "isVictory", "entry"].every(key => key in entry)
                    );
                case GameDataType.SETTINGS:
                case GameDataType.TUTORIALS:
                    return true;
                default:
                    return false;
            }
        } catch {
            return false;
        }
    }

    private getDataTypeName(dataType: GameDataType): string {
        switch (dataType) {
            case GameDataType.RUN_HISTORY:
                return i18next.t("menuUiHandler:RUN_HISTORY").toLowerCase();
            default:
                return GameDataType[dataType].toLowerCase();
        }
    }

    private showImportConfirmation(
        dataType: GameDataType,
        dataName: string,
        combinedData: { systemData?: any, sessionData?: any[] },
        dataStr: string,
        slotId: integer
    ): void {
        this.scene.ui.showText(
            i18next.t("menuUiHandler:dataOverrideWarning"),
            null,
            () => {
                this.scene.ui.setOverlayMode(Mode.CONFIRM,
                    () => {
                        for (let i = 0; i < 5; i++) {
                            const sessionKey = `sessionData${i || ""}_${loggedInUser?.username}`;
                            localStorage.removeItem(sessionKey);
                        }

                        if (dataType === GameDataType.COMBINED) {
                            this.setLocalStorageItem(
                                `data_${loggedInUser?.username}`,
                                encrypt(this.serializeBigInt(combinedData.systemData), bypassLogin)
                            );

                            if (combinedData.sessionData?.length) {
                                combinedData.sessionData.forEach((sessionData, index) => {
                                    this.setLocalStorageItem(
                                        `sessionData${index || ""}_${loggedInUser?.username}`,
                                        encrypt(this.serializeBigInt(sessionData), bypassLogin)
                                    );
                                });
                            }
                        } else {
                            this.setLocalStorageItem(
                                `${getDataTypeKey(dataType, slotId)}_${loggedInUser?.username}`,
                                encrypt(dataStr, bypassLogin)
                            );
                        }
                        window.location.reload();
                    },
                    () => {
                        this.scene.ui.revertMode();
                        this.scene.ui.showText("", 0);
                    },
                    false,
                    -98
                );
            }
        );
    }

    private initDexData(): void {
        const data: DexData = {};

        for (const species of allSpecies) {
            data[species.speciesId] = {
                seenAttr: 0n,
                caughtAttr: 0n,
                natureAttr: 0,
                seenCount: 0,
                caughtCount: 0,
                hatchedCount: 0,
                ivs: [0, 0, 0, 0, 0, 0]
            };
        }

        const defaultStarterAttr = DexAttr.NON_SHINY | DexAttr.MALE | DexAttr.DEFAULT_VARIANT | DexAttr.DEFAULT_FORM;

        const defaultStarterNatures: Nature[] = [];

        this.scene.executeWithSeedOffset(() => {
            const neutralNatures = [Nature.HARDY, Nature.DOCILE, Nature.SERIOUS, Nature.BASHFUL, Nature.QUIRKY];
            for (let s = 0; s < defaultStarterSpecies.length; s++) {
                defaultStarterNatures.push(Utils.randSeedItem(neutralNatures));
            }
        }, 0, "default");

        for (let ds = 0; ds < defaultStarterSpecies.length; ds++) {
            const entry = data[defaultStarterSpecies[ds]] as DexEntry;
            entry.seenAttr = defaultStarterAttr;
            entry.caughtAttr = defaultStarterAttr;
            entry.natureAttr = 1 << (defaultStarterNatures[ds] + 1);
            for (const i in entry.ivs) {
                entry.ivs[i] = 10;
            }
        }

        this.defaultDexData = Object.assign({}, data);
        this.dexData = data;
    }

    private initStarterData(): void {
        const starterData: StarterData = {};

        const starterSpeciesIds = Object.keys(speciesStarters).map(k => parseInt(k) as Species);

        for (const speciesId of starterSpeciesIds) {
            starterData[speciesId] = {
                moveset: null,
                eggMoves: 0,
                candyCount: 0,
                friendship: 0,
                abilityAttr: defaultStarterSpecies.includes(speciesId) ? AbilityAttr.ABILITY_1 : 0,
                passiveAttr: 0,
                valueReduction: 0,
                classicWinCount: 0,
                obtainedFusions: [],
                fusionMovesets: []
            };
        }

        this.starterData = starterData;
    }

    
    private initSmittySpeciesData(): { [key: number]: any } {
        const newSpeciesData = {};
        allSpecies.forEach(species => {
            if (species.speciesId >= 9999991) {
                newSpeciesData[species.speciesId] = {
                    moveset: null,
                    eggMoves: 0,
                    candyCount: 0,
                    friendship: 0,
                    abilityAttr: 0,
                    passiveAttr: 0,
                    valueReduction: 0,
                    classicWinCount: 0,
                    obtainedFusions: null,
                    fusionMovesets: null
                };
            }
        });
        return newSpeciesData;
    }

    setPokemonSeen(pokemon: Pokemon, incrementCount: boolean = true, trainer: boolean = false): void {
        const dexEntry = this.dexData[pokemon.species.speciesId];
        dexEntry.seenAttr |= pokemon.getDexAttr();
        if (incrementCount) {
            dexEntry.seenCount++;
            this.gameStats.pokemonSeen++;
            if (!trainer && pokemon.species.subLegendary) {
                this.gameStats.subLegendaryPokemonSeen++;
            } else if (!trainer && pokemon.species.legendary) {
                this.gameStats.legendaryPokemonSeen++;
            } else if (!trainer && pokemon.species.mythical) {
                this.gameStats.mythicalPokemonSeen++;
            }
            if (!trainer && pokemon.isShiny()) {
                this.gameStats.shinyPokemonSeen++;
            }
        }
    }

    setPokemonCaught(pokemon: Pokemon, incrementCount: boolean = true, fromEgg: boolean = false, skipEggs: boolean = false): Promise<void> {
        return this.setPokemonSpeciesCaught(pokemon, pokemon.species, incrementCount, fromEgg, skipEggs);
    }

    setPokemonSpeciesCaught(pokemon: Pokemon, species: PokemonSpecies, incrementCount: boolean = true, fromEgg: boolean = false, skipEggs: boolean = false): Promise<void> {
        return new Promise<void>(resolve => {
            const dexEntry = this.dexData[species.speciesId];
            const caughtAttr = dexEntry.caughtAttr;
            const formIndex = pokemon.formIndex;
            if (noStarterFormKeys.includes(pokemon.getFormKey())) {
                pokemon.formIndex = 0;
            }
            const dexAttr = pokemon.getDexAttr();
            pokemon.formIndex = formIndex;
            dexEntry.caughtAttr |= dexAttr;
            if (speciesStarters.hasOwnProperty(species.speciesId)) {
                this.starterData[species.speciesId].abilityAttr |= pokemon.abilityIndex !== 1 || pokemon.species.ability2
                    ? 1 << pokemon.abilityIndex
                    : AbilityAttr.ABILITY_HIDDEN;
            }
            dexEntry.natureAttr |= 1 << (pokemon.nature + 1);

            const hasPrevolution = pokemonPrevolutions.hasOwnProperty(species.speciesId);
            const newCatch = !caughtAttr;
            const hasNewAttr = (caughtAttr & dexAttr) !== dexAttr;

            if (incrementCount) {
                if (!fromEgg) {
                    dexEntry.caughtCount++;
                    this.gameStats.pokemonCaught++;
                    if (pokemon.species.subLegendary) {
                        this.gameStats.subLegendaryPokemonCaught++;
                    } else if (pokemon.species.legendary) {
                        this.gameStats.legendaryPokemonCaught++;
                    } else if (pokemon.species.mythical) {
                        this.gameStats.mythicalPokemonCaught++;
                    }
                    if (pokemon.isShiny()) {
                        this.gameStats.shinyPokemonCaught++;
                    }
                } else {
                    dexEntry.hatchedCount++;
                    this.gameStats.pokemonHatched++;
                    if (pokemon.species.subLegendary) {
                        this.gameStats.subLegendaryPokemonHatched++;
                    } else if (pokemon.species.legendary) {
                        this.gameStats.legendaryPokemonHatched++;
                    } else if (pokemon.species.mythical) {
                        this.gameStats.mythicalPokemonHatched++;
                    }
                    if (pokemon.isShiny()) {
                        this.gameStats.shinyPokemonHatched++;
                    }
                }

                if (!hasPrevolution && (!pokemon.scene.gameMode.isDaily || hasNewAttr || fromEgg)) {
                    this.addStarterCandy(species, (1 * (pokemon.isShiny() ? 5 * (1 << (pokemon.variant ?? 0)) : 1)) * (fromEgg || pokemon.isBoss() ? 2 : 1));
                }
            }

            const checkPrevolution = () => {
                if (hasPrevolution) {
                    const prevolutionSpecies = pokemonPrevolutions[species.speciesId];
                    return this.setPokemonSpeciesCaught(pokemon, getPokemonSpecies(prevolutionSpecies), incrementCount, fromEgg).then(() => resolve());
                } else {
                    resolve();
                }
            };

            if (newCatch && speciesStarters.hasOwnProperty(species.speciesId)) {
                this.scene.playSound("level_up_fanfare");
                if (skipEggs) {
                    checkPrevolution();
                } else if (this.scene.gameMode.isTestMod) {
                    resolve();
                }
                else {
                    this.scene.ui.showText(i18next.t("battle:addedAsAStarter", {pokemonName: species.name}), null, () => checkPrevolution(), null, true);
                }
            } else {
                checkPrevolution();
            }
        });
    }

    incrementRibbonCount(species: PokemonSpecies, forStarter: boolean = false): integer {
        const speciesIdToIncrement: Species = species.getRootSpeciesId(forStarter);

        if (!this.starterData[speciesIdToIncrement].classicWinCount) {
            this.starterData[speciesIdToIncrement].classicWinCount = 0;
        }

        if (!this.starterData[speciesIdToIncrement].classicWinCount) {
            this.scene.gameData.gameStats.ribbonsOwned++;
        }

        const ribbonsInStats: integer = this.scene.gameData.gameStats.ribbonsOwned;

        if (ribbonsInStats >= 100) {
            this.scene.validateAchv(achvs._100_RIBBONS);
        }
        if (ribbonsInStats >= 75) {
            this.scene.validateAchv(achvs._75_RIBBONS);
        }
        if (ribbonsInStats >= 50) {
            this.scene.validateAchv(achvs._50_RIBBONS);
        }
        if (ribbonsInStats >= 25) {
            this.scene.validateAchv(achvs._25_RIBBONS);
        }
        if (ribbonsInStats >= 10) {
            this.scene.validateAchv(achvs._10_RIBBONS);
        }

        return ++this.starterData[speciesIdToIncrement].classicWinCount;
    }

    addStarterCandy(species: PokemonSpecies, count: integer): void {
        
        this.scene.candyBar.showStarterSpeciesCandy(species.speciesId, count + 3);
        this.starterData[species.speciesId].candyCount += count + 3;
    }

    setEggMoveUnlocked(species: PokemonSpecies, eggMoveIndex: integer, hatchingSkipped: boolean = false): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const speciesId = species.speciesId;
            if (!speciesEggMoves.hasOwnProperty(speciesId) || !speciesEggMoves[speciesId][eggMoveIndex]) {
                resolve(false);
                return;
            }

            if (!this.starterData[speciesId].eggMoves) {
                this.starterData[speciesId].eggMoves = 0;
            }

            const value = 1 << eggMoveIndex;

            if (this.starterData[speciesId].eggMoves & value) {
                resolve(false);
                return;
            }

            this.starterData[speciesId].eggMoves |= value;

            this.scene.playSound("level_up_fanfare");

            const moveName = allMoves[speciesEggMoves[speciesId][eggMoveIndex]].name;

            if (!hatchingSkipped) {
                this.scene.ui.showText(eggMoveIndex === 3 ? i18next.t("egg:rareEggMoveUnlock", {moveName: moveName}) : i18next.t("egg:eggMoveUnlock", {moveName: moveName}), null, () => resolve(true), null, true);
            }
            else {
                resolve(true);
            }
        });
    }

    
    public setObtainedFusionUnlock(pokemon: Pokemon, fusionSpecies: Species): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const rootSpeciesId = pokemon.species.getRootSpeciesId(true);
            const rootFusionSpeciesId = getPokemonSpecies(fusionSpecies).getRootSpeciesId(true);

            if (!this.starterData[rootSpeciesId].obtainedFusions) {
                this.starterData[rootSpeciesId].obtainedFusions = [rootFusionSpeciesId];
            } else if (this.starterData[rootSpeciesId].obtainedFusions.includes(rootFusionSpeciesId)) {
                resolve(false);
                return;
            } else {
                this.starterData[rootSpeciesId].obtainedFusions.push(rootFusionSpeciesId);
            }

        });
    }

    updateSpeciesDexIvs(speciesId: Species, ivs: integer[]): void {
        let dexEntry: DexEntry;
        do {
            dexEntry = this.scene.gameData.dexData[speciesId];
            const dexIvs = dexEntry.ivs;
            for (let i = 0; i < dexIvs.length; i++) {
                if (dexIvs[i] < ivs[i]) {
                    dexIvs[i] = ivs[i];
                }
            }
            if (dexIvs.filter(iv => iv === 31).length === 6) {
                this.scene.validateAchv(achvs.PERFECT_IVS);
            }
        } while (pokemonPrevolutions.hasOwnProperty(speciesId) && (speciesId = pokemonPrevolutions[speciesId]));
    }

    getSpeciesCount(dexEntryPredicate: (entry: DexEntry) => boolean): integer {
        const dexKeys = Object.keys(this.dexData);
        let speciesCount = 0;
        for (const s of dexKeys) {
            if (dexEntryPredicate(this.dexData[s])) {
                speciesCount++;
            }
        }
        return speciesCount;
    }

    getStarterCount(dexEntryPredicate: (entry: DexEntry) => boolean): integer {
        const starterKeys = Object.keys(speciesStarters);
        let starterCount = 0;
        for (const s of starterKeys) {
            const starterDexEntry = this.dexData[s];
            if (dexEntryPredicate(starterDexEntry)) {
                starterCount++;
            }
        }
        return starterCount;
    }

    getSpeciesDefaultDexAttr(species: PokemonSpecies, forSeen: boolean = false, optimistic: boolean = false): bigint {
        let ret = 0n;
        const dexEntry = this.dexData[species.speciesId];
        const attr = dexEntry.caughtAttr;
        ret |= optimistic
            ? attr & DexAttr.SHINY ? DexAttr.SHINY : DexAttr.NON_SHINY
            : attr & DexAttr.NON_SHINY || !(attr & DexAttr.SHINY) ? DexAttr.NON_SHINY : DexAttr.SHINY;
        ret |= attr & DexAttr.MALE || !(attr & DexAttr.FEMALE) ? DexAttr.MALE : DexAttr.FEMALE;
        ret |= optimistic
            ? attr & DexAttr.SHINY ? attr & DexAttr.VARIANT_3 ? DexAttr.VARIANT_3 : attr & DexAttr.VARIANT_2 ? DexAttr.VARIANT_2 : DexAttr.DEFAULT_VARIANT : DexAttr.DEFAULT_VARIANT
            : attr & DexAttr.DEFAULT_VARIANT ? DexAttr.DEFAULT_VARIANT : attr & DexAttr.VARIANT_2 ? DexAttr.VARIANT_2 : attr & DexAttr.VARIANT_3 ? DexAttr.VARIANT_3 : DexAttr.DEFAULT_VARIANT;
        ret |= this.getFormAttr(this.getFormIndex(attr));
        return ret;
    }

    getSpeciesDexAttrProps(species: PokemonSpecies, dexAttr: bigint): DexAttrProps {
        const shiny = !(dexAttr & DexAttr.NON_SHINY);
        const female = !(dexAttr & DexAttr.MALE);
        const variant = dexAttr & DexAttr.DEFAULT_VARIANT ? 0 : dexAttr & DexAttr.VARIANT_2 ? 1 : dexAttr & DexAttr.VARIANT_3 ? 2 : 0;
        const formIndex = this.getFormIndex(dexAttr);

        return {
            shiny,
            female,
            variant,
            formIndex
        };
    }

    getStarterSpeciesDefaultAbilityIndex(species: PokemonSpecies): integer {
        const abilityAttr = this.starterData[species.speciesId]?.abilityAttr;
        return abilityAttr & AbilityAttr.ABILITY_1 ? 0 : !species.ability2 || abilityAttr & AbilityAttr.ABILITY_2 ? 1 : 2;
    }

    getSpeciesDefaultNature(species: PokemonSpecies): Nature {
        const dexEntry = this.dexData[species.speciesId];
        for (let n = 0; n < 25; n++) {
            if (dexEntry.natureAttr & (1 << (n + 1))) {
                return n as Nature;
            }
        }
        return 0 as Nature;
    }

    getSpeciesDefaultNatureAttr(species: PokemonSpecies): integer {
        return 1 << (this.getSpeciesDefaultNature(species));
    }

    getDexAttrLuck(dexAttr: bigint): integer {
        return dexAttr & DexAttr.SHINY ? dexAttr & DexAttr.VARIANT_3 ? 3 : dexAttr & DexAttr.VARIANT_2 ? 2 : 1 : 0;
    }

    getNaturesForAttr(natureAttr: integer = 0): Nature[] {
        const ret: Nature[] = [];
        for (let n = 0; n < 25; n++) {
            if (natureAttr & (1 << (n + 1))) {
                ret.push(n);
            }
        }
        return ret;
    }

    getSpeciesStarterValue(speciesId: Species): number {
        const baseValue = speciesStarters[speciesId];
        let value = baseValue;

        const decrementValue = (value: number) => {
            if (value > 1) {
                value--;
            } else {
                value /= 2;
            }
            return value;
        };


        for (let v = 0; v < this.starterData[speciesId]?.valueReduction; v++) {
            value = decrementValue(value);
        }

        const cost = new Utils.NumberHolder(value);
        applyChallenges(this.scene.gameMode, ChallengeType.STARTER_COST, speciesId, cost);

        return cost.value;
    }

    getFormIndex(attr: bigint): integer {
        if (!attr || attr < DexAttr.DEFAULT_FORM) {
            return 0;
        }
        let f = 0;
        while (!(attr & this.getFormAttr(f))) {
            f++;
        }
        return f;
    }

    getFormAttr(formIndex: integer): bigint {
        return BigInt(1) << BigInt(7 + formIndex);
    }

    consolidateDexData(dexData: DexData): void {
        for (const k of Object.keys(dexData)) {
            const entry = dexData[k] as DexEntry;
            if (!entry.hasOwnProperty("hatchedCount")) {
                entry.hatchedCount = 0;
            }
            if (!entry.hasOwnProperty("natureAttr") || (entry.caughtAttr && !entry.natureAttr)) {
                entry.natureAttr = this.defaultDexData?.[k].natureAttr || (1 << Utils.randInt(25, 1));
            }
        }
    }

    migrateStarterAbilities(systemData: SystemSaveData, initialStarterData?: StarterData): void {
        const starterIds = Object.keys(this.starterData).map(s => parseInt(s) as Species);
        const starterData = initialStarterData || systemData.starterData;
        const dexData = systemData.dexData;
        for (const s of starterIds) {
            const dexAttr = dexData[s].caughtAttr;
            starterData[s].abilityAttr = (dexAttr & DexAttr.DEFAULT_VARIANT ? AbilityAttr.ABILITY_1 : 0)
                | (dexAttr & DexAttr.VARIANT_2 ? AbilityAttr.ABILITY_2 : 0)
                | (dexAttr & DexAttr.VARIANT_3 ? AbilityAttr.ABILITY_HIDDEN : 0);
            if (dexAttr) {
                if (!(dexAttr & DexAttr.DEFAULT_VARIANT)) {
                    dexData[s].caughtAttr ^= DexAttr.DEFAULT_VARIANT;
                }
                if (dexAttr & DexAttr.VARIANT_2) {
                    dexData[s].caughtAttr ^= DexAttr.VARIANT_2;
                }
                if (dexAttr & DexAttr.VARIANT_3) {
                    dexData[s].caughtAttr ^= DexAttr.VARIANT_3;
                }
            }
        }
    }

    fixVariantData(systemData: SystemSaveData): void {
        const starterIds = Object.keys(this.starterData).map(s => parseInt(s) as Species);
        const starterData = systemData.starterData;
        const dexData = systemData.dexData;
    if (starterIds.find(id => (BigInt(dexData[id].caughtAttr) & BigInt(DexAttr.VARIANT_2) || BigInt(dexData[id].caughtAttr) & BigInt(DexAttr.VARIANT_3)) && !variantData[id])) {
            for (const s of starterIds) {
                const species = getPokemonSpecies(s);
                if (variantData[s]) {
                const tempCaughtAttr = BigInt(dexData[s].caughtAttr);
                    let seenVariant2 = false;
                    let seenVariant3 = false;
                    const checkEvoSpecies = (es: Species) => {
                        seenVariant2 ||= !!(dexData[es].seenAttr & DexAttr.VARIANT_2);
                        seenVariant3 ||= !!(dexData[es].seenAttr & DexAttr.VARIANT_3);
                        if (pokemonEvolutions.hasOwnProperty(es)) {
                            for (const pe of pokemonEvolutions[es]) {
                                checkEvoSpecies(pe.speciesId);
                            }
                        }
                    };
                    checkEvoSpecies(s);
                    if (BigInt(dexData[s].caughtAttr) & BigInt(DexAttr.VARIANT_2) && !seenVariant2) {
                    dexData[s].caughtAttr = (BigInt(dexData[s].caughtAttr) ^ BigInt(DexAttr.VARIANT_2)).toString();
                    }
                    if (BigInt(dexData[s].caughtAttr) & BigInt(DexAttr.VARIANT_3) && !seenVariant3) {
                    dexData[s].caughtAttr = (BigInt(dexData[s].caughtAttr) ^ BigInt(DexAttr.VARIANT_3)).toString();
                     }
                    starterData[s].abilityAttr = (tempCaughtAttr & DexAttr.DEFAULT_VARIANT ? AbilityAttr.ABILITY_1 : 0)
                        | (tempCaughtAttr & DexAttr.VARIANT_2 && species.ability2 ? AbilityAttr.ABILITY_2 : 0)
                        | (tempCaughtAttr & DexAttr.VARIANT_3 && species.abilityHidden ? AbilityAttr.ABILITY_HIDDEN : 0);
                } else {
                    const tempCaughtAttr = dexData[s].caughtAttr;
                    if (dexData[s].caughtAttr & DexAttr.VARIANT_2) {
                        dexData[s].caughtAttr ^= DexAttr.VARIANT_2;
                    }
                    if (dexData[s].caughtAttr & DexAttr.VARIANT_3) {
                        dexData[s].caughtAttr ^= DexAttr.VARIANT_3;
                    }
                    starterData[s].abilityAttr = (tempCaughtAttr & DexAttr.DEFAULT_VARIANT ? AbilityAttr.ABILITY_1 : 0)
                        | (tempCaughtAttr & DexAttr.VARIANT_2 && species.ability2 ? AbilityAttr.ABILITY_2 : 0)
                        | (tempCaughtAttr & DexAttr.VARIANT_3 && species.abilityHidden ? AbilityAttr.ABILITY_HIDDEN : 0);
                }
            }
        }
    }

    fixStarterData(systemData: SystemSaveData): void {
        for (const starterId of defaultStarterSpecies) {
            systemData.starterData[starterId].abilityAttr |= AbilityAttr.ABILITY_1;
        }
    }

    fixLegendaryStats(systemData: SystemSaveData): void {
        systemData.gameStats.subLegendaryPokemonSeen = 0;
        systemData.gameStats.subLegendaryPokemonCaught = 0;
        systemData.gameStats.subLegendaryPokemonHatched = 0;
        allSpecies.filter(s => s.subLegendary).forEach(s => {
            const dexEntry = systemData.dexData[s.speciesId];
            systemData.gameStats.subLegendaryPokemonSeen += dexEntry.seenCount;
            systemData.gameStats.legendaryPokemonSeen = Math.max(systemData.gameStats.legendaryPokemonSeen - dexEntry.seenCount, 0);
            systemData.gameStats.subLegendaryPokemonCaught += dexEntry.caughtCount;
            systemData.gameStats.legendaryPokemonCaught = Math.max(systemData.gameStats.legendaryPokemonCaught - dexEntry.caughtCount, 0);
            systemData.gameStats.subLegendaryPokemonHatched += dexEntry.hatchedCount;
            systemData.gameStats.legendaryPokemonHatched = Math.max(systemData.gameStats.legendaryPokemonHatched - dexEntry.hatchedCount, 0);
        });
        systemData.gameStats.subLegendaryPokemonSeen = Math.max(systemData.gameStats.subLegendaryPokemonSeen, systemData.gameStats.subLegendaryPokemonCaught);
        systemData.gameStats.legendaryPokemonSeen = Math.max(systemData.gameStats.legendaryPokemonSeen, systemData.gameStats.legendaryPokemonCaught);
        systemData.gameStats.mythicalPokemonSeen = Math.max(systemData.gameStats.mythicalPokemonSeen, systemData.gameStats.mythicalPokemonCaught);
    }

    addNewStats(systemdata: SystemSaveData): void {
        if (systemdata.gameStats.permaReroll === undefined) {
            systemdata.gameStats.nuzlockeSessionsPlayed = 0;
            systemdata.gameStats.nuzlockeSessionsWon = 0;
            systemdata.gameStats.draftSessionsPlayed = 0;
            systemdata.gameStats.draftSessionsWon = 0;
            systemdata.gameStats.shopSessionsPlayed = 0;
            systemdata.gameStats.shopSessionsWon = 0;
            systemdata.gameStats.nuzlightSessionsPlayed = 0;
            systemdata.gameStats.nuzlightSessionsWon = 0;
            systemdata.gameStats.nightmareSessionsPlayed = 0;
            systemdata.gameStats.nightmareSessionsWon = 0;
            systemdata.gameStats.nuzlightDraftSessionsPlayed = 0;
            systemdata.gameStats.nuzlightDraftSessionsWon = 0;
            systemdata.gameStats.nuzlockeDraftSessionsPlayed = 0;
            systemdata.gameStats.nuzlockeDraftSessionsWon = 0;
            systemdata.gameStats.testModSessionsPlayed = 0;
            systemdata.gameStats.testModSessionsWon = 0;
            systemdata.gameStats.chaosRogueSessionsPlayed = 0;
            systemdata.gameStats.chaosRogueSessionsWon = 0;
            systemdata.gameStats.chaosJourneySessionsPlayed = 0;
            systemdata.gameStats.chaosJourneySessionsWon = 0;
            systemdata.gameStats.chaosVoidSessionsPlayed = 0;
            systemdata.gameStats.chaosVoidSessionsWon = 0;
            systemdata.gameStats.chaosRogueVoidSessionsPlayed = 0;
            systemdata.gameStats.chaosRogueVoidSessionsWon = 0;
            systemdata.gameStats.chaosInfiniteSessionsPlayed = 0;
            systemdata.gameStats.chaosInfiniteSessionsWon = 0;
            systemdata.gameStats.chaosInfiniteRogueSessionsPlayed = 0;
            systemdata.gameStats.chaosInfiniteRogueSessionsWon = 0;
            systemdata.gameStats.sessionsPlayed = 0;
            systemdata.gameStats.sessionsWon = 0;
            systemdata.gameStats.highestPermaMoney = 0;
            systemdata.gameStats.rivalsDefeated = 0;
            systemdata.gameStats.glitchFormsUnlocked = 0;
            systemdata.gameStats.smittyFormsUnlocked = 0;
            systemdata.gameStats.fusionsCaptured = 0;
            systemdata.gameStats.glitchEvolutions = 0;
            systemdata.gameStats.smittyEvolutions = 0;
            systemdata.gameStats.dynamaxEvolutions = 0;
            systemdata.gameStats.megaEvolutions = 0;
            systemdata.gameStats.trainerPokemonSnatched = 0;
            systemdata.gameStats.permaItemsBought = 0;
            systemdata.gameStats.glitchFormsDefeated = 0;
            systemdata.gameStats.smittyFormsDefeated = 0;
            systemdata.gameStats.pokeballsThrown = 0;
            systemdata.gameStats.greatballsThrown = 0;
            systemdata.gameStats.ultraballsThrown = 0;
            systemdata.gameStats.rogueballsThrown = 0;
            systemdata.gameStats.masterballsThrown = 0;
            systemdata.gameStats.elite4Defeated = 0;
            systemdata.gameStats.championsDefeated = 0;
            systemdata.gameStats.gruntsDefeated = 0;
            systemdata.gameStats.evilAdminsDefeated = 0;
            systemdata.gameStats.evilBossesDefeated = 0;
            systemdata.gameStats.smittysDefeated = 0;
            systemdata.gameStats.pokemonTradedForMoney = 0;
            systemdata.gameStats.pokemonSwitched = 0;
            systemdata.gameStats.majorBossesDefeated = 0;
            systemdata.gameStats.questsCompleted = 0;
            systemdata.gameStats.bountiesCompleted = 0;
            systemdata.gameStats.battlesEscaped = 0;
            systemdata.gameStats.glitchModsCreated = 0;
            systemdata.gameStats.glitchModsUploaded = 0;
            systemdata.gameStats.glitchModsUnlocked = 0;
            systemdata.gameStats.moneySpentFromSnatching = 0;
            systemdata.gameStats.moneyEarnedFromTrading = 0;
            systemdata.gameStats.totalEvolutions = 0;
            systemdata.gameStats.reroll = 0;
            systemdata.gameStats.permaReroll = 0;
        }
        
        if (systemdata.gameStats.modifiersObtained === undefined) {
            systemdata.gameStats.modifiersObtained = {};
        }
        
        if (systemdata.gameStats.typeOfDefeated === undefined) {
            systemdata.gameStats.typeOfDefeated = {};
        }
        
        if (systemdata.gameStats.typeOfMovesUsed === undefined) {
            systemdata.gameStats.typeOfMovesUsed = {};
        }
        
        if (systemdata.gameStats.playerKnockoutType === undefined) {
            systemdata.gameStats.playerKnockoutType = {};
        }
  }

    public updateGameModeStats(gameMode: GameModes, isVictory: boolean = false): void {
        const gameStats = this.scene.gameData.gameStats;
        if(isVictory) {
            gameStats.sessionsWon++;
        }
        else {
            gameStats.sessionsPlayed++;
        }
        
        switch (gameMode) {
        case GameModes.CLASSIC:
            if (isVictory) {
            gameStats.classicSessionsWon++;
            } else {
            gameStats.classicSessionsPlayed++;
            }
            break;
        case GameModes.NUZLOCKE:
            if (isVictory) {
            gameStats.nuzlockeSessionsWon++;
            } else {
            gameStats.nuzlockeSessionsPlayed++;
            }
            break;
        case GameModes.DRAFT:
            if (isVictory) {
            gameStats.draftSessionsWon++;
            } else {
            gameStats.draftSessionsPlayed++;
            }
            break;
        case GameModes.NUZLIGHT:
            if (isVictory) {
            gameStats.nuzlightSessionsWon++;
            } else {
            gameStats.nuzlightSessionsPlayed++;
            }
            break;
        case GameModes.NIGHTMARE:
            if (isVictory) {
            gameStats.nightmareSessionsWon++;
            } else {
            gameStats.nightmareSessionsPlayed++;
            }
            break;
        case GameModes.NUZLIGHT_DRAFT:
            if (isVictory) {
            gameStats.nuzlightDraftSessionsWon++;
            } else {
            gameStats.nuzlightDraftSessionsPlayed++;
            }
            break;
        case GameModes.NUZLOCKE_DRAFT:
            if (isVictory) {
            gameStats.nuzlockeDraftSessionsWon++;
            } else {
            gameStats.nuzlockeDraftSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_ROGUE:
            if (isVictory) {
            gameStats.chaosRogueSessionsWon++;
            } else {
            gameStats.chaosRogueSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_JOURNEY:
            if (isVictory) {
            gameStats.chaosJourneySessionsWon++;
            } else {
            gameStats.chaosJourneySessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_VOID:
            if (isVictory) {
            gameStats.chaosVoidSessionsWon++;
            } else {
            gameStats.chaosVoidSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_ROGUE_VOID:
            if (isVictory) {
            gameStats.chaosRogueVoidSessionsWon++;
            } else {
            gameStats.chaosRogueVoidSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_INFINITE:
            if (isVictory) {
            gameStats.chaosInfiniteSessionsWon++;
            } else {
            gameStats.chaosInfiniteSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_INFINITE_ROGUE:
            if (isVictory) {
            gameStats.chaosInfiniteRogueSessionsWon++;
            } else {
            gameStats.chaosInfiniteRogueSessionsPlayed++;
            }
            break;
        }
        
        this.checkAndUnlockGameModes();
    }

    
    public updatePermaShopOptions(options: ModifierTypeOption[]): void {
        this.currentPermaShopOptions = options;
    }

    public resetPermaShopReroll(): void {
        this.permaShopRerollCount = 0;
    }

    public isSmitomRewardTime() : boolean {
        return this.lastSmitomReward + 20 * 60 * 1000 < Date.now();
    }

    public updateSmitomRewardTime(): void {
        this.lastSmitomReward = Date.now();
    }

    public isDailyBountyTime() : boolean {
        return this.lastDailyBountyTime + 24 * 60 * 60 * 500 < Date.now();
    }

    public updateDailyBountyTime(): void {
        this.lastDailyBountyTime = Date.now();
    }

    public updateDailyBountyCode(): void {
        this.dailyBountyCode = this.getRandomBountyCode();
        this.updateDailyBountyTime();
        
    }

    public isSaveRewardTime() : boolean {
        return this.lastSaveTime + 20 * 60 * 1000 < Date.now();
    }

    public updateSaveRewardTime(): void {
        this.lastSaveTime = Date.now();
    }

    public updateRewardOverlayOpacity(opacity: number): void {
        this.rewardOverlayOpacity = opacity;
    }

    public updatePermaMoney(scene: BattleScene, amount: number, addToMoney: boolean = false): void {
        const oldValue = this.permaMoney;

        if (addToMoney) {
            this.permaMoney += amount;
        } else {
            this.permaMoney = amount;
        }

        this.permaMoney = Math.max(Math.round(this.permaMoney), 0);

        if (this.permaMoney > this.gameStats.highestPermaMoney) {
            this.gameStats.highestPermaMoney = this.permaMoney;
        }

        if (this.permaMoney !== oldValue) {
            scene.ui.updatePermaMoneyText(scene);
        }

    }

    
    public setQuestState(questId: QuestUnlockables, state: QuestState, questUnlockData?: QuestUnlockData): void {
        this.questUnlockables[questId] = { state, questUnlockData };
        
        if (state === QuestState.COMPLETED && questUnlockData) {
            if (questUnlockData.rewardType === RewardType.GLITCH_FORM_A ||
                questUnlockData.rewardType === RewardType.GLITCH_FORM_B ||
                questUnlockData.rewardType === RewardType.GLITCH_FORM_C ||
                questUnlockData.rewardType === RewardType.GLITCH_FORM_D ||
                questUnlockData.rewardType === RewardType.GLITCH_FORM_E) {
                this.gameStats.glitchFormsUnlocked++;
            }
        }
    }

    public getQuestState(questId: QuestUnlockables): QuestState | undefined {
        return this.questUnlockables[questId]?.state;
    }



    setQuestStageProgress(questId: QuestUnlockables, stageIndex: number, questUnlockData: QuestUnlockData): void {
        const questProgress: QuestProgress = {
            state: this.questUnlockables[questId]?.state || QuestState.UNLOCKED,
            currentStage: stageIndex,
            currentCount: 0,
            questUnlockData: questUnlockData
        };
        this.questUnlockables[questId] = questProgress;
    }

    getQuestStageProgress(questId: QuestUnlockables): number {
        return this.questUnlockables[questId]?.currentStage || 0;
    }

    public getQuestUnlockData(questId: QuestUnlockables): QuestUnlockData | undefined {
        return this.questUnlockables[questId]?.questUnlockData;
    }

    public unlockQuestState(quest: QuestUnlockables): void {
        if (!this.questUnlockables.hasOwnProperty(quest)) {
            this.questUnlockables[quest] = { state: QuestState.UNLOCKED };
        }
    }

    public canUseGlitchOrSmittyForm(speciesId: Species, rewardType: RewardType = RewardType.GLITCH_FORM_A): boolean {
        return this.getCompletedQuestForSpecies(speciesId, rewardType);
    }

    isUniSmittyFormUnlocked(formName: string): boolean {
        return this.uniSmittyUnlocks.includes(formName);
    }

    unlockUniSmittyForm(formName: string): void {
        if (!this.uniSmittyUnlocks.includes(formName)) {
            this.uniSmittyUnlocks.push(formName);
            this.gameStats.smittyFormsUnlocked++;
            this.tutorialService.saveTutorialFlag(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1, true);
        }
    }
    
    isModFormUnlocked(formName: string): boolean {
        return this.modFormsUnlocked.includes(formName);
    }

    unlockModForm(formName: string): void {
        if (!this.modFormsUnlocked.includes(formName)) {
            this.modFormsUnlocked.push(formName);
            this.gameStats.glitchModsUnlocked++;
        }
    }

    canUseGlitchModForm(species: Species, formName: string): boolean {
        const modFormName = getModPokemonName(species, formName);
        if(modFormName) {
            return this.isModFormUnlocked(modFormName);
        }
        return false;
    }

    public getRandomConsoleCode(pool: Record<string, string>): string {
    const codes = Object.values(pool);
    return codes.length ? codes[Utils.randSeedInt(codes.length)] : "";
}

public getRandomBountyCode(): string {
    const availablePools = [];
    
    const hasSmittyCodes = Object.keys(SMITTY_CONSOLE_CODES).some(formName => 
        this.isUniSmittyFormUnlocked(formName)
    );
    if (hasSmittyCodes) {
        availablePools.push(() => this.getRandomSmittyBountyCode());
    }
    
    availablePools.push(
        () => this.getRandomRivalBountyCode(),
        () => this.getRandomQuestBountyCode()
    );

    return availablePools[Utils.randSeedInt(availablePools.length)]();
    }

    public getRandomRivalBountyCode(): string {
        return this.getRandomConsoleCode(RIVAL_CONSOLE_CODES);
    }

    public getRandomQuestBountyCode(): string {
        const questCodes = Object.keys(QUEST_CONSOLE_CODES);
        return questCodes.length ? questCodes[Utils.randSeedInt(questCodes.length)] : "";
    }

    public getRandomSmittyBountyCode(): string {
        const unlockedSmittyCodes = Object.entries(SMITTY_CONSOLE_CODES)
            .filter(([formName]) => this.isUniSmittyFormUnlocked(formName))
            .reduce((acc, [formName, code]) => {
                acc[formName] = code;
                return acc;
            }, {} as Record<string, string>);
        
        return this.getRandomConsoleCode(unlockedSmittyCodes);
    } 

    public getCompletedQuestForSpecies(speciesId: Species, rewardType: RewardType = RewardType.GLITCH_FORM_A): boolean {
        for (const [questId, QuestProgress] of Object.entries(this.questUnlockables)) {
            if (QuestProgress.state === QuestState.COMPLETED) {
                const questUnlockData = QuestProgress.questUnlockData;
                if (questUnlockData.rewardType === rewardType) {
                    if (Array.isArray(questUnlockData.rewardId)) {
                        if (questUnlockData.rewardId.includes(speciesId)) {
                            return true;
                        }
                    } else if (questUnlockData.rewardId === speciesId) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    public checkQuestState(unlockable: QuestUnlockables, state: QuestState): boolean {
        if (this.questUnlockables.hasOwnProperty(unlockable)) {
            return this.questUnlockables[unlockable].state === state;
        }
        return false;
    }

    
    public getPermaModifiersByType(permaType: PermaType): PermaModifier[] {
        return this.permaModifiers.getPermaModifiersByType(permaType);
    }

     public getPreargsForShop(waveIndex: number): PreargsForShop | undefined {
        return this.preargsForShop[waveIndex];
    }

    public setPreargsForShop(waveIndex: number, data: PreargsForShop): void {
        const existingPreargs = this.getPreargsForShop(waveIndex) || {};
        this.preargsForShop[waveIndex] = { ...existingPreargs, ...data };
    }

    public hasPermaModifierByType(permaType: PermaType): boolean {
        return this.permaModifiers.hasPermaModifierByType(permaType);
    }

    public reducePermaModifierByType(permaTypes: PermaType | PermaType[], scene: BattleScene): void {
        this.permaModifiers.reducePermaModifierByType(permaTypes, scene);
    }

    public reducePermaWaveModifiers(scene: BattleScene): void {
        this.permaModifiers.reducePermaWaveModifiers(scene);
    }


    
    public getFusionTaxCost(): number {
        let cost = 1000;

        
        if (this.hasPermaModifierByType(PermaType.PERMA_CHEAPER_FUSIONS_3)) {
            cost *= 0.25;
        } else if (this.hasPermaModifierByType(PermaType.PERMA_CHEAPER_FUSIONS_2)) {
            cost *= 0.5;
        } else if (this.hasPermaModifierByType(PermaType.PERMA_CHEAPER_FUSIONS_1)) {
            cost *= 0.75;
        }
        return Math.round(cost / 10) * 10;
    }

    public addActiveConsoleCodeQuest(consoleCode: string): boolean {
        if (!this.activeConsoleCodeQuests.includes(consoleCode)) {
            this.activeConsoleCodeQuests.push(consoleCode);
            return true;
        }
        return false;
    }

    public removeActiveConsoleCodeQuest(consoleCode: string): boolean {
        const index = this.activeConsoleCodeQuests.indexOf(consoleCode);
        if (index !== -1) {
            this.activeConsoleCodeQuests.splice(index, 1);
            return true;
        }
        return false;
    }

    public isConsoleCodeQuestActive(consoleCode: string): boolean {
        return this.activeConsoleCodeQuests.includes(consoleCode);
    }

    getQuestUnlockDataFromModifierTypes(questUnlockable: QuestUnlockables): QuestUnlockData {
        const modifierTypeKey = QuestUnlockables[questUnlockable] as keyof typeof modifierTypes;
        const modifierType = modifierTypes[modifierTypeKey]();
        if (!modifierType || !(modifierType instanceof QuestModifierType) && !(modifierType instanceof QuestModifierTypeGenerator)) {
            throw new Error(`Invalid quest modifier type for ${questUnlockable}`);
        }
        return modifierType.config.questUnlockData;
    }

    handleQuestUnlocks(scene: BattleScene, rival: RivalTrainerType = null): void {
      const targetRival = rival ?? this.playerRival;
      if (targetRival) {
        const handleQuestUnlock = () => {
          const questToUnlock = getRandomLockedQuestForRival(targetRival, this);
          if (questToUnlock) {
            const questUnlockData = this.getQuestUnlockDataFromModifierTypes(questToUnlock);
            this.setQuestState(questToUnlock, QuestState.UNLOCKED, questUnlockData);
            scene.unshiftPhase(new QuestUnlockPhase(scene, questUnlockData,true));
            this.tutorialService.saveTutorialFlag(EnhancedTutorial.NEW_QUESTS, true);
          }
        };

        const checkAndUnlockModForm = async () => {
          try {
            const allMods = await modStorage.getAllMods();
            const rivalMods = allMods.filter(mod => {
              return mod.jsonData.unlockConditions && 
                    mod.jsonData.unlockConditions.rivalTrainerTypes &&
                    mod.jsonData.unlockConditions.rivalTrainerTypes.includes(targetRival);
            });

            if (rivalMods.length > 0) {
              const uncompletedMods = rivalMods.filter(mod => 
                !this.isModFormUnlocked(getModFormSystemName(mod.speciesId, mod.formName))
              );

              if (uncompletedMods.length > 0) {
                const chosenMod = Utils.randSeedItem(uncompletedMods);
                
                const phase = new UnlockModFormPhase(scene, chosenMod.formName, () => {
                  this.unlockModForm(getModFormSystemName(chosenMod.speciesId, chosenMod.formName));
                });
                scene.unshiftPhase(phase);
                return true;
              }
            }
            return false;
          } catch (error) {
            console.error("Error checking for rival mods:", error);
            return false;
          }
        };

        if (!this.defeatedRivals.includes(targetRival)) {
          this.defeatedRivals.push(targetRival);
          
          this.gameStats.rivalsDefeated++;

          const rivalName = i18next.t(`trainerNames:${TrainerType[targetRival].toLowerCase()}`);

            this.scene.unshiftPhase(new RewardObtainDisplayPhase(
                this.scene,
                {
                    name: rivalName,
                    rivalType: targetRival,
                    type: RewardObtainedType.RIVAL_TO_VOID
                }, () => {
                    this.scene.ui.getHandler().clear();
                    checkAndUnlockModForm().then(hasUnlockedMod => {
                      if (!hasUnlockedMod) {
                        handleQuestUnlock();
                      }
                    });
                }
            ));
        
        } else if (this.unlocks[Unlockables.NIGHTMARE_MODE]) {
          checkAndUnlockModForm().then(hasUnlockedMod => {
            if (!hasUnlockedMod) {
              handleQuestUnlock();
            }
          });
        }
      }
    }

    addSpeciesQuestMoves(speciesId: Species): void {
        if (pokemonQuestLevelMoves.hasOwnProperty(speciesId)) {

            pokemonSpeciesLevelMoves[speciesId] = pokemonQuestLevelMoves[speciesId];
        }
    }

    public processImportedData(encryptedData: string, dataType: GameDataType, slotId: integer = 0): void {
        try {
            const dataStr = AES.decrypt(encryptedData, saveKey).toString(enc.Utf8);

            let valid = false;
            let dataName: string;
            let combinedData: { systemData?: any, sessionData?: any[] } = {};

            if (dataType === GameDataType.COMBINED) {
                combinedData = JSON.parse(dataStr);

                if (typeof combinedData.systemData === 'string') {
                    combinedData.systemData = this.deserializeBigInt(JSON.parse(combinedData.systemData));
                }

                if (Array.isArray(combinedData.sessionData)) {
                    combinedData.sessionData = combinedData.sessionData.map((session: any) => {
                        if (typeof session === 'string') {
                            return this.deserializeBigInt(JSON.parse(session));
                        }
                        return session;
                    });
                }
                valid = this.validateCombinedData(combinedData);
                dataName = "system and session";
            } else {
                valid = this.validateSingleTypeData(dataType, dataStr);
                dataName = this.getDataTypeName(dataType);
            }

            if (!valid) {
                this.scene.ui.showText(
                    i18next.t("menuUiHandler:dataCorrupted"),
                    null,
                    () => this.scene.ui.showText("", 0),
                    Utils.fixedInt(1500)
                );
                return;
            }

            this.showImportConfirmation(dataType, dataName, combinedData, dataStr, slotId);

        } catch (ex) {
            console.error("Import error:", ex);
            this.scene.ui.showText(
                i18next.t("menuUiHandler:importFailed"),
                null,
                () => this.scene.ui.showText("", 0),
                Utils.fixedInt(1500)
            );
        }
    }

    private checkAndUnlockGameModes(): void {
        if (this.gameStats.nuzlightSessionsWon >= 2 && !this.unlocks[Unlockables.NUZLIGHT_DRAFT_MODE]) {
            this.unlocks[Unlockables.NUZLIGHT_DRAFT_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NUZLIGHT_DRAFT_MODE, Species.NUZLEAF.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }

        if (this.gameStats.nuzlockeSessionsWon >= 2 && !this.unlocks[Unlockables.NUZLOCKE_DRAFT_MODE]) {
            this.unlocks[Unlockables.NUZLOCKE_DRAFT_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NUZLOCKE_DRAFT_MODE, Species.SHIFTRY.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }

        const journeyUnlocked = this.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED);
        const chaosRogueBeaten = this.gameStats.chaosRogueSessionsWon >= 1;
        const draftSessionsCondition = this.gameStats.draftSessionsWon >= 3;
        
        if (journeyUnlocked && (chaosRogueBeaten || draftSessionsCondition) && !this.unlocks[Unlockables.CHAOS_JOURNEY_MODE]) {
            this.unlocks[Unlockables.CHAOS_JOURNEY_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_JOURNEY_MODE, Species.CATERPIE.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }

        if (this.unlocks[Unlockables.NIGHTMARE_MODE] && this.gameStats.nightmareSessionsWon >= 1 && !this.unlocks[Unlockables.CHAOS_VOID_MODE]) {
            this.unlocks[Unlockables.CHAOS_VOID_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_VOID_MODE, Species.DARKRAI.toString(), true, UnlockModePokeSpriteType.NORMAL));
        }

        if (this.gameStats.chaosVoidSessionsWon >= 1 && !this.unlocks[Unlockables.CHAOS_ROGUE_VOID_MODE]) {
            this.unlocks[Unlockables.CHAOS_ROGUE_VOID_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_ROGUE_VOID_MODE, Species.DARKRAI.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }

        if (this.gameStats.chaosRogueVoidSessionsWon >= 3 && !this.unlocks[Unlockables.CHAOS_INFINITE_MODE]) {
            this.unlocks[Unlockables.CHAOS_INFINITE_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_INFINITE_MODE, Species.ARCEUS.toString(), true, UnlockModePokeSpriteType.NORMAL));
        }

        if (this.gameStats.highestEndlessWave >= 10000 && !this.unlocks[Unlockables.CHAOS_INFINITE_ROGUE_MODE]) {
            this.unlocks[Unlockables.CHAOS_INFINITE_ROGUE_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_INFINITE_ROGUE_MODE, Species.ARCEUS.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }
    }
}


export enum RewardType {
    GLITCH_FORM_A,
    MODIFIER,
    GAME_MODE,
    UNLOCKABLE,
    GLITCH_FORM_B,
    GLITCH_FORM_C,
    GLITCH_FORM_D,
    GLITCH_FORM_E,
    SMITTY_FORM,
    SMITTY_FORM_B,
    PERMA_MODIFIER,
    PERMA_MONEY,
    PERMA_MONEY_AND_MODIFIER,
    NEW_MOVES_FOR_SPECIES
}

export interface QuestUnlockData {
    rewardType: RewardType;
    rewardId: Species | keyof typeof modifierTypes | GameModes | Species[] | QuestUnlockables;
    rewardAmount?: number;
    questId: QuestUnlockables;
    rewardText?: string;
    questSpriteId?: string | Species | TrainerType;
    cloned?: boolean;
}


export enum QuestUnlockables {
    TAUROS_ELECTRIC_HIT_QUEST,
    KECLEON_COLOR_CHANGE_QUEST,
    GLISCOR_DARK_MOVE_KNOCKOUT_QUEST,
    MAROWAK_CUBONE_FAINT_QUEST,
    NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST,
    FERALIGATR_DRAGON_DEFEAT_QUEST,
    CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST,
    VENUSAUR_PSYCHIC_MOVE_USE_QUEST,
    BLASTOISE_FAIRY_DEFEAT_QUEST,
    NIDOKING_DEFEAT_QUEST,
    GENGAR_SPECIAL_WAVE_QUEST,
    WEEZING_FIRE_MOVE_KNOCKOUT_QUEST,
    HITMONLEE_NORMAL_WAVE_QUEST,
    HITMONCHAN_STAT_INCREASE_QUEST,
    HITMON_DUO_WIN_QUEST,
    KANGASKHAN_GHOST_MOVE_QUEST,
    SCYTHER_TRIO_WIN_QUEST,
    GRENINJA_TRIO_WIN_QUEST,
    SIMISAGE_TRIO_WIN_QUEST,
    ELEMENTAL_MONKEY_WIN_QUEST,
    ELECTIVIREMAGMORTAR_WIN_QUEST,
    GYARADOS_GROUND_SWITCH_QUEST,
    LAPRAS_FIRE_MOVE_QUEST,
    PORYGON_Z_ANALYTIC_USE_QUEST,
    DRAGONITE_LANCE_DEFEAT_QUEST,
    SUDOWOODO_WOOD_HAMMER_QUEST,
    AMBIPOM_GIGA_IMPACT_QUEST,
    MILTANK_STEEL_MOVE_KNOCKOUT_QUEST,
    SLAKING_RIVAL_DEFEAT_QUEST,
    SOLROCK_LUNATONE_WIN_QUEST,
    REGIGIGAS_REGI_DEFEAT_QUEST,
    PIKACHU_RED_BLUE_WIN_QUEST,
    SNORLAX_GRASS_KNOCKOUT_QUEST,
    CLOYSTER_PRESENT_QUEST,
    NUZLEAF_NOSEPASS_DEFEAT_QUEST,
    CHANDELURE_REST_QUEST,
    SMEARGLE_DEFEAT_QUEST,
    MIMIKYU_CHARIZARD_KNOCKOUT_QUEST,
    MIMIKYU_GRENINJA_KNOCKOUT_QUEST,
    MIMIKYU_RAICHU_KNOCKOUT_QUEST,
    MIMIKYU_MEWTWO_KNOCKOUT_QUEST,
    MIMIKYU_REGIROCK_KNOCKOUT_QUEST,
    EISCUE_ROCK_KNOCKOUT_QUEST,
    ZANGOOSE_SEVIPER_KNOCKOUT_QUEST,
    SEVIPER_ZANGOOSE_KNOCKOUT_QUEST,
    TRUBBISH_POISON_DEFEAT_QUEST,
    HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST,
    DITTO_DRAGONITE_TRANSFORM_QUEST,
    DITTO_CHARIZARD_TRANSFORM_QUEST,
    DITTO_PIKACHU_TRANSFORM_QUEST,
    DITTO_MACHAMP_TRANSFORM_QUEST,
    DITTO_MEWTWO_TRANSFORM_QUEST,
    FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST,
    WOBBUFFET_RIVAL_DEFEAT_QUEST,
    MAGIKARP_DEFEAT_QUEST,
    KLINKLANG_GEAR_MOVE_QUEST,
    SPINDA_CONFUSION_RECOVERY_QUEST,
    NINETALES_STORED_POWER_KNOCKOUT_QUEST,
    MUK_RED_DEFEAT_QUEST,
    SHUCKLE_DEFEAT_QUEST,
    TANGELA_RIVAL_DEFEAT_QUEST,
    LICKITUNG_GIGGLE_KNOCKOUT_QUEST,
    MAGICAL_PIKACHU_QUEST,
    CHARMANDER_UNDERTALE_QUEST,
    MEOWTH_JESTER_QUEST,
    SHIFTRY_TENGU_QUEST,
    CLAYDOL_POISON_QUEST,
    STARTER_CATCH_QUEST,
    NUZLIGHT_UNLOCK_QUEST,
    NUZLOCKE_UNLOCK_QUEST,
    REVAROOM_EXTRA_QUEST,
    NORMAL_EFFECTIVENESS_QUEST,
    MAGIKARP_NEW_MOVES_QUEST,
    DITTO_NEW_MOVES_QUEST,
    WOBBUFFET_NEW_MOVES_QUEST,
    SMEARGLE_NEW_MOVES_QUEST,
    UNOWN_NEW_MOVES_QUEST,
    TYROGUE_NEW_MOVES_QUEST,
    METAPOD_NEW_MOVES_QUEST,
    TAUROS_DARK_WAVE_QUEST,
    DITTO_SPECIAL_WIN_QUEST,
    MAROWAK_ZOMBIE_KNOCKOUT_QUEST,
    GRENINJA_YOKAI_WAVE_QUEST,
    RAYQUAZA_SPECIAL_WIN_QUEST,
    LICKITUNG_HYPER_WAVE_QUEST,
    CHARMANDER_NIGHTMARE_WIN_QUEST,
    GASTLY_NIGHTMARE_WAVE_QUEST,
    PIKACHU_PLUS_ULTRA_QUEST,
    CHARIZARD_HELLFLAME_QUEST,
    EEVEE_NIGHTMARE_QUEST,
    SNORLAX_NIGHTMARE_QUEST,
    MEWTWO_NIGHTMARE_QUEST,
    TYRANITAR_NIGHTMARE_QUEST,
    OCTILLERY_NIGHTMARE_QUEST,
    REGIROCK_NIGHTMARE_QUEST,
    EEVEE_GHOST_QUEST,
    EEVEE_STEEL_QUEST,
    EEVEE_GROUND_QUEST,
    SQUIRTLE_TORMENT_QUEST,
    BULBASAUR_TERROR_QUEST,
    HYPNO_NIGHTMARE_QUEST,
    MAMOSWINE_NIGHTMARE_QUEST,
    MORPEKO_NIGHTMARE_QUEST,
    CLEFABLE_GENGAR_QUEST,
    GOLEM_FIRE_QUEST,
    DEINO_NIGHTMARE_QUEST,
    GOLURK_DREAD_QUEST,
    DUSCLOPS_NIGHTMARE_QUEST,
    HARIYAMA_NIGHTMARE_QUEST,
    SHARPEDO_NIGHTMARE_QUEST,
    FARIGIRAF_NIGHTMARE_QUEST,
    KINGDRA_NIGHTMARE_QUEST,
    EXCADRILL_NIGHTMARE_QUEST,
    PIKACHU_ROBO_NIGHTMARE_QUEST,
    LUCARIO_NIGHTMARE_QUEST,
    SUNFLORA_NIGHTMARE_QUEST,
    DODRIO_NIGHTMARE_QUEST,
    LANTURN_NIGHTMARE_QUEST,

    // RIVAL BOUNTY QUESTS
    BLUE_BOUNTY_QUEST,
    LANCE_BOUNTY_QUEST,
    CYNTHIA_BOUNTY_QUEST,
    GIOVANNI_BOUNTY_QUEST,
    RED_BOUNTY_QUEST,
    BROCK_BOUNTY_QUEST,
    STEVEN_BOUNTY_QUEST,
    CYRUS_BOUNTY_QUEST,
    LT_SURGE_BOUNTY_QUEST,
    HAU_BOUNTY_QUEST,
    LARRY_BOUNTY_QUEST,
    WALLACE_BOUNTY_QUEST,
    ALDER_BOUNTY_QUEST,
    MISTY_BOUNTY_QUEST,
    BLAINE_BOUNTY_QUEST,
    ARCHIE_BOUNTY_QUEST,
    MAXIE_BOUNTY_QUEST,
    GHETSIS_BOUNTY_QUEST,
    LYSANDRE_BOUNTY_QUEST,
    ROSE_BOUNTY_QUEST,
    GUZMA_BOUNTY_QUEST,
    LUSAMINE_BOUNTY_QUEST,
    NEMONA_BOUNTY_QUEST,
    // OLYMPIA_BOUNTY_QUEST,
    NORMAN_BOUNTY_QUEST,
    ALLISTER_BOUNTY_QUEST,
    IRIS_BOUNTY_QUEST,
    ROXIE_BOUNTY_QUEST,
    SABRINA_BOUNTY_QUEST,
    TARTAUROS_SMITTY_QUEST,
    ZAMOWAK_SMITTY_QUEST,
    GREYOKAI_SMITTY_QUEST,
    JORMUNZA_SMITTY_QUEST,
    LICTHULHU_SMITTY_QUEST,
    PLASMIST_SMITTY_QUEST,
    PLUSTRA_SMITTY_QUEST,
    HELLCHAR_SMITTY_QUEST,
    FEAREON_SMITTY_QUEST,
    OMNINOM_SMITTY_QUEST,
    NECROMEW_SMITTY_QUEST,
    DIABLOTAR_SMITTY_QUEST,
    SMITOM_SMITTY_QUEST,
    GENOMANDER_SMITTY_QUEST,
    TORMENTLE_SMITTY_QUEST,
    TERRORBULB_SMITTY_QUEST,
    DANKITAR_SMITTY_QUEST,
    GASTMOJI_SMITTY_QUEST,
    NOXABIS_SMITTY_QUEST,
    FLORAVORA_SMITTY_QUEST,
    CHIMERDRIO_SMITTY_QUEST,
    CLEFANGAR_SMITTY_QUEST,
    TERRORAGON_SMITTY_QUEST,
    GODREAD_SMITTY_QUEST,
    DUSCHMARE_SMITTY_QUEST,
    ABYSSUMA_SMITTY_QUEST,
    OMNITTO_SMITTY_QUEST,
    UMBRAFFE_SMITTY_QUEST,
    TARTADRA_SMITTY_QUEST,
    TENGALE_SMITTY_QUEST,
    HYPLAGUS_SMITTY_QUEST,
    DEMONOTH_SMITTY_QUEST,
    DESPEKO_SMITTY_QUEST,
    ZOOMER_SMITTY_QUEST,
    VOIDASH_SMITTY_QUEST,
    WAHCKY_SMITTY_QUEST,
    WAHZEBUB_SMITTY_QUEST,
    FINEFERNO_SMITTY_QUEST,
    SORBRED_SMITTY_QUEST,
    CORPANZEE_SMITTY_QUEST,
    PLANKLING_SMITTY_QUEST,
    TIMBRICK_SMITTY_QUEST,
    PLANKULT_SMITTY_QUEST,
    SORBOBO_SMITTY_QUEST,
    HAMTARO_SMITTY_QUEST,
    ELMOLD_SMITTY_QUEST,
    FUNGHOMP_SMITTY_QUEST,
    RIDDICUS_SMITTY_QUEST,
    BOXECUTIVE_SMITTY_QUEST,
    PATNIUS_SMITTY_QUEST,
    TENTACRIM_SMITTY_QUEST,
    UNDEADTUNASMIT_SMITTY_QUEST,
    SCARABLANC_SMITTY_QUEST,
    BATMARE_SMITTY_QUEST,
    SMITWARD_SMITTY_QUEST,
    NITEKNITE_SMITTY_QUEST,
    DIGNITIER_SMITTY_QUEST,
    CEPHALOOM_SMITTY_QUEST,
    SMITSHADE_SMITTY_QUEST,
    SMITSPECT_SMITTY_QUEST,
    SMITWRAITH_SMITTY_QUEST,
    SMITERNAL_SMITTY_QUEST,
    SMITTYFISH_SMITTY_QUEST,
    SMITTELLECT_SMITTY_QUEST,
    GALLUX_SMITTY_QUEST,
    HOSTMITTY_SMITTY_QUEST,
    SMITTYNARIE_SMITTY_QUEST,
    BATBOXBABA_SMITTY_QUEST,
    BATBOXBEYOND_SMITTY_QUEST,
    VICTAINER_SMITTY_QUEST,
    KAKOPIER_SMITTY_QUEST,
    KARASU_ME_SMITTY_QUEST,
    BULLKTOPUS_SMITTY_QUEST,
    GUMUGUMU_SMITTY_QUEST,
    SANTORYU_SMITTY_QUEST,
    ROOSTACE_SMITTY_QUEST,
    BOGACE_SMITTY_QUEST,
    MILLIANT_SMITTY_QUEST,
    CHURRY_SMITTY_QUEST,
    GAZORPSMITFIELD_SMITTY_QUEST,
    HOLOGRICK_SMITTY_QUEST,
    SEEKLING_SMITTY_QUEST,
    PICKLISK_SMITTY_QUEST,
    BRAVEHOUND_SMITTY_QUEST,
    MISSINGNO_SMITTY_QUEST,
}

export function isNonQuestBountyModifier(modifier : PermaRunQuestModifier): boolean {
    if ((modifier instanceof PermaRunQuestModifier) && modifier.consoleCode) {
        const questId = modifier.questUnlockData?.questId;
        return questId !== undefined &&
            questId >= QuestUnlockables.BLUE_BOUNTY_QUEST &&
            questId <= QuestUnlockables.MISSINGNO_SMITTY_QUEST;
    }
}

export enum QuestState {
    UNLOCKED,
    ACTIVE,
    COMPLETED
}

export const rivalQuestMap: Partial<Record<RivalTrainerType, QuestUnlockables[]>> = {
    [TrainerType.BLUE]: [
        QuestUnlockables.BLASTOISE_FAIRY_DEFEAT_QUEST,
        QuestUnlockables.HITMONLEE_NORMAL_WAVE_QUEST,
        QuestUnlockables.HITMONCHAN_STAT_INCREASE_QUEST,
        QuestUnlockables.LICKITUNG_GIGGLE_KNOCKOUT_QUEST,
    ],
    [TrainerType.LANCE]: [
        QuestUnlockables.DRAGONITE_LANCE_DEFEAT_QUEST,
        QuestUnlockables.GYARADOS_GROUND_SWITCH_QUEST,
        QuestUnlockables.FERALIGATR_DRAGON_DEFEAT_QUEST,
    ],
    [TrainerType.CYNTHIA]: [
        QuestUnlockables.HITMON_DUO_WIN_QUEST,
        QuestUnlockables.GENGAR_SPECIAL_WAVE_QUEST,
        QuestUnlockables.ZANGOOSE_SEVIPER_KNOCKOUT_QUEST,
        QuestUnlockables.TYROGUE_NEW_MOVES_QUEST,
    ],
    [TrainerType.GIOVANNI]: [
        QuestUnlockables.NIDOKING_DEFEAT_QUEST,
        QuestUnlockables.MAROWAK_CUBONE_FAINT_QUEST,
        QuestUnlockables.MEOWTH_JESTER_QUEST,
        QuestUnlockables.GLISCOR_DARK_MOVE_KNOCKOUT_QUEST,
    ],
    [TrainerType.RED]: [
        QuestUnlockables.PIKACHU_RED_BLUE_WIN_QUEST,
        QuestUnlockables.CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST,
        QuestUnlockables.CHARMANDER_UNDERTALE_QUEST,
        QuestUnlockables.METAPOD_NEW_MOVES_QUEST,
    ],
    [TrainerType.BROCK]: [
        QuestUnlockables.SUDOWOODO_WOOD_HAMMER_QUEST,
        QuestUnlockables.NUZLEAF_NOSEPASS_DEFEAT_QUEST,
        QuestUnlockables.MILTANK_STEEL_MOVE_KNOCKOUT_QUEST,
    ],
    [TrainerType.STEVEN]: [
        QuestUnlockables.REGIGIGAS_REGI_DEFEAT_QUEST,
        QuestUnlockables.SOLROCK_LUNATONE_WIN_QUEST,
        QuestUnlockables.MIMIKYU_REGIROCK_KNOCKOUT_QUEST,
        QuestUnlockables.UNOWN_NEW_MOVES_QUEST,
    ],
    [TrainerType.CYRUS]: [
        QuestUnlockables.WOBBUFFET_RIVAL_DEFEAT_QUEST,
        QuestUnlockables.WEEZING_FIRE_MOVE_KNOCKOUT_QUEST,
        QuestUnlockables.SCYTHER_TRIO_WIN_QUEST,
        QuestUnlockables.WOBBUFFET_NEW_MOVES_QUEST,
    ],
    [TrainerType.LT_SURGE]: [
        QuestUnlockables.ELECTIVIREMAGMORTAR_WIN_QUEST,
        QuestUnlockables.TAUROS_ELECTRIC_HIT_QUEST,
        QuestUnlockables.MIMIKYU_RAICHU_KNOCKOUT_QUEST,
        QuestUnlockables.REVAROOM_EXTRA_QUEST,
    ],
    [TrainerType.HAU]: [
        QuestUnlockables.ELEMENTAL_MONKEY_WIN_QUEST,
        QuestUnlockables.SIMISAGE_TRIO_WIN_QUEST,
        QuestUnlockables.DITTO_PIKACHU_TRANSFORM_QUEST,
        QuestUnlockables.MAGICAL_PIKACHU_QUEST,
    ],
    [TrainerType.LARRY]: [
        QuestUnlockables.SNORLAX_GRASS_KNOCKOUT_QUEST,
        QuestUnlockables.SMEARGLE_DEFEAT_QUEST,
        QuestUnlockables.HITMONLEE_NORMAL_WAVE_QUEST,
        QuestUnlockables.NORMAL_EFFECTIVENESS_QUEST,
    ],
    [TrainerType.WALLACE]: [
        QuestUnlockables.GYARADOS_GROUND_SWITCH_QUEST,
        QuestUnlockables.LAPRAS_FIRE_MOVE_QUEST,
        QuestUnlockables.FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST,
    ],
    [TrainerType.ALDER]: [
        QuestUnlockables.CHANDELURE_REST_QUEST,
        QuestUnlockables.SHUCKLE_DEFEAT_QUEST,
        QuestUnlockables.TAUROS_ELECTRIC_HIT_QUEST,
        QuestUnlockables.SHIFTRY_TENGU_QUEST,
    ],
    [TrainerType.MISTY]: [
        QuestUnlockables.LAPRAS_FIRE_MOVE_QUEST,
        QuestUnlockables.CLOYSTER_PRESENT_QUEST,
        QuestUnlockables.MIMIKYU_GRENINJA_KNOCKOUT_QUEST,
        QuestUnlockables.MAGIKARP_NEW_MOVES_QUEST,
    ],
    [TrainerType.BLAINE]: [
        QuestUnlockables.NINETALES_STORED_POWER_KNOCKOUT_QUEST,
        QuestUnlockables.MIMIKYU_CHARIZARD_KNOCKOUT_QUEST,
        QuestUnlockables.DITTO_CHARIZARD_TRANSFORM_QUEST,
        QuestUnlockables.SMEARGLE_NEW_MOVES_QUEST,
    ],
    [TrainerType.ARCHIE]: [
        QuestUnlockables.EISCUE_ROCK_KNOCKOUT_QUEST,
        QuestUnlockables.MAGIKARP_DEFEAT_QUEST,
        QuestUnlockables.FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST,
    ],
    [TrainerType.MAXIE]: [
        QuestUnlockables.WEEZING_FIRE_MOVE_KNOCKOUT_QUEST,
        QuestUnlockables.LAPRAS_FIRE_MOVE_QUEST,
        QuestUnlockables.GYARADOS_GROUND_SWITCH_QUEST,
    ],
    [TrainerType.GHETSIS]: [
        QuestUnlockables.KLINKLANG_GEAR_MOVE_QUEST,
        QuestUnlockables.EISCUE_ROCK_KNOCKOUT_QUEST,
        QuestUnlockables.SUDOWOODO_WOOD_HAMMER_QUEST,
    ],
    [TrainerType.LYSANDRE]: [
        QuestUnlockables.GYARADOS_GROUND_SWITCH_QUEST,
        QuestUnlockables.FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST,
        QuestUnlockables.SMEARGLE_DEFEAT_QUEST,
    ],
    [TrainerType.ROSE]: [
        QuestUnlockables.TANGELA_RIVAL_DEFEAT_QUEST,
        QuestUnlockables.MIMIKYU_MEWTWO_KNOCKOUT_QUEST,
        QuestUnlockables.HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST,
    ],
    [TrainerType.GUZMA]: [
        QuestUnlockables.SCYTHER_TRIO_WIN_QUEST,
        QuestUnlockables.SEVIPER_ZANGOOSE_KNOCKOUT_QUEST,
        QuestUnlockables.TRUBBISH_POISON_DEFEAT_QUEST,
        QuestUnlockables.MUK_RED_DEFEAT_QUEST,
    ],
    [TrainerType.LUSAMINE]: [
        QuestUnlockables.PORYGON_Z_ANALYTIC_USE_QUEST,
        QuestUnlockables.SOLROCK_LUNATONE_WIN_QUEST,
        QuestUnlockables.KECLEON_COLOR_CHANGE_QUEST,
    ],
    [TrainerType.NEMONA]: [
        QuestUnlockables.GRENINJA_TRIO_WIN_QUEST,
        QuestUnlockables.ELECTIVIREMAGMORTAR_WIN_QUEST,
        QuestUnlockables.MILTANK_STEEL_MOVE_KNOCKOUT_QUEST,
    ],
    // [TrainerType.OLYMPIA]: [
    //     QuestUnlockables.PORYGON_Z_ANALYTIC_USE_QUEST,
    //     QuestUnlockables.CLAYDOL_POISON_QUEST,
    //     QuestUnlockables.KECLEON_COLOR_CHANGE_QUEST,
    // ],
    [TrainerType.NORMAN]: [
        QuestUnlockables.SLAKING_RIVAL_DEFEAT_QUEST,
        QuestUnlockables.SPINDA_CONFUSION_RECOVERY_QUEST,
        QuestUnlockables.AMBIPOM_GIGA_IMPACT_QUEST,
        QuestUnlockables.NORMAL_EFFECTIVENESS_QUEST,
    ],
    [TrainerType.ALLISTER]: [
        QuestUnlockables.GENGAR_SPECIAL_WAVE_QUEST,
        QuestUnlockables.MAROWAK_CUBONE_FAINT_QUEST,
        QuestUnlockables.KANGASKHAN_GHOST_MOVE_QUEST,
    ],
    [TrainerType.IRIS]: [
        QuestUnlockables.NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST,
        QuestUnlockables.DITTO_DRAGONITE_TRANSFORM_QUEST,
        QuestUnlockables.FERALIGATR_DRAGON_DEFEAT_QUEST,
    ],
    [TrainerType.ROXIE]: [
        QuestUnlockables.TRUBBISH_POISON_DEFEAT_QUEST,
        QuestUnlockables.DITTO_MACHAMP_TRANSFORM_QUEST,
        QuestUnlockables.HITMONCHAN_STAT_INCREASE_QUEST,
    ],
    [TrainerType.SABRINA]: [
        QuestUnlockables.VENUSAUR_PSYCHIC_MOVE_USE_QUEST,
        QuestUnlockables.DITTO_MEWTWO_TRANSFORM_QUEST,
        QuestUnlockables.CLAYDOL_POISON_QUEST,
    ],
};

export const rivalStageTwoQuestMap: Partial<Record<RivalTrainerType, QuestUnlockables[]>> = {
    [TrainerType.BLUE]: [
        QuestUnlockables.EEVEE_NIGHTMARE_QUEST,
        QuestUnlockables.EEVEE_STEEL_QUEST,
        QuestUnlockables.EEVEE_GROUND_QUEST,
        QuestUnlockables.EEVEE_GHOST_QUEST,
    ],
    [TrainerType.LANCE]: [
        QuestUnlockables.RAYQUAZA_SPECIAL_WIN_QUEST,
    ],
    [TrainerType.CYNTHIA]: [
        QuestUnlockables.MAMOSWINE_NIGHTMARE_QUEST,
        QuestUnlockables.LUCARIO_NIGHTMARE_QUEST,
    ],
    [TrainerType.GIOVANNI]: [
        QuestUnlockables.MEWTWO_NIGHTMARE_QUEST,
        QuestUnlockables.CLEFABLE_GENGAR_QUEST,
    ],
    [TrainerType.RED]: [
        QuestUnlockables.TAUROS_DARK_WAVE_QUEST,
        QuestUnlockables.PIKACHU_PLUS_ULTRA_QUEST,
        QuestUnlockables.PIKACHU_ROBO_NIGHTMARE_QUEST,
    ],
    [TrainerType.BROCK]: [
        QuestUnlockables.GOLEM_FIRE_QUEST,
        QuestUnlockables.EXCADRILL_NIGHTMARE_QUEST,
    ],
    [TrainerType.STEVEN]: [
        QuestUnlockables.REGIROCK_NIGHTMARE_QUEST,
    ],
    [TrainerType.CYRUS]: [
        QuestUnlockables.FARIGIRAF_NIGHTMARE_QUEST,
    ],
    [TrainerType.LT_SURGE]: [
        QuestUnlockables.ELECTIVIREMAGMORTAR_WIN_QUEST, // No change as stage 1 is sufficient
    ],
    [TrainerType.HAU]: [
        QuestUnlockables.BULBASAUR_TERROR_QUEST,
    ],
    [TrainerType.LARRY]: [
        QuestUnlockables.SNORLAX_NIGHTMARE_QUEST,
        QuestUnlockables.DODRIO_NIGHTMARE_QUEST,
    ],
    [TrainerType.WALLACE]: [
        QuestUnlockables.GRENINJA_YOKAI_WAVE_QUEST,
    ],
    [TrainerType.ALDER]: [
        QuestUnlockables.LANTURN_NIGHTMARE_QUEST,
    ],
    [TrainerType.MISTY]: [
        QuestUnlockables.SQUIRTLE_TORMENT_QUEST,
        QuestUnlockables.KINGDRA_NIGHTMARE_QUEST,
    ],
    [TrainerType.BLAINE]: [
        QuestUnlockables.TAUROS_DARK_WAVE_QUEST,
    ],
    [TrainerType.ARCHIE]: [
        QuestUnlockables.SHARPEDO_NIGHTMARE_QUEST,
    ],
    [TrainerType.MAXIE]: [
        QuestUnlockables.TYRANITAR_NIGHTMARE_QUEST,
    ],
    [TrainerType.GHETSIS]: [
        QuestUnlockables.MAROWAK_ZOMBIE_KNOCKOUT_QUEST,
        QuestUnlockables.DEINO_NIGHTMARE_QUEST,
    ],
    [TrainerType.LYSANDRE]: [
        QuestUnlockables.CHARIZARD_HELLFLAME_QUEST,
    ],
    [TrainerType.ROSE]: [
        QuestUnlockables.HARIYAMA_NIGHTMARE_QUEST,
        QuestUnlockables.SUNFLORA_NIGHTMARE_QUEST,
    ],
    [TrainerType.GUZMA]: [
        QuestUnlockables.DUSCLOPS_NIGHTMARE_QUEST,
    ],
    [TrainerType.LUSAMINE]: [
        QuestUnlockables.DITTO_SPECIAL_WIN_QUEST,
        QuestUnlockables.MORPEKO_NIGHTMARE_QUEST,
    ],
    [TrainerType.NEMONA]: [
        QuestUnlockables.OCTILLERY_NIGHTMARE_QUEST,
    ],
    // [TrainerType.OLYMPIA]: [
    //     QuestUnlockables.CLEFABLE_GENGAR_QUEST,
    // ],
    [TrainerType.NORMAN]: [
        QuestUnlockables.LICKITUNG_HYPER_WAVE_QUEST,
    ],
    [TrainerType.ALLISTER]: [
        QuestUnlockables.GASTLY_NIGHTMARE_WAVE_QUEST,
        QuestUnlockables.GOLURK_DREAD_QUEST,
    ],
    [TrainerType.IRIS]: [
        QuestUnlockables.CHARMANDER_NIGHTMARE_WIN_QUEST,
    ],
    [TrainerType.ROXIE]: [
        QuestUnlockables.MUK_RED_DEFEAT_QUEST, // No change as stage 1 is sufficient
    ],
    [TrainerType.SABRINA]: [
        QuestUnlockables.HYPNO_NIGHTMARE_QUEST,
    ],
};


function getAllQuestsForRival(rivalType: RivalTrainerType, gameData: GameData): QuestUnlockables[] {
    const baseQuests = rivalQuestMap[rivalType] || [];
    const stageTwo = gameData.unlocks[Unlockables.NIGHTMARE_MODE] ?
        (rivalStageTwoQuestMap[rivalType] || []) : [];

    return [...baseQuests, ...stageTwo];
}

export function getUnlockedQuestsForRival(rivalType: RivalTrainerType, gameData: GameData): QuestUnlockables[] {
    return getAllQuestsForRival(rivalType, gameData)
        .filter(quest => gameData.getQuestState(quest) === QuestState.UNLOCKED);
}

export function getLockedQuestsForRival(rivalType: RivalTrainerType, gameData: GameData): QuestUnlockables[] {
    return getAllQuestsForRival(rivalType, gameData)
        .filter(quest => gameData.getQuestState(quest) === undefined);
}

export function getRandomLockedQuestForRival(rivalType: RivalTrainerType, gameData: GameData): QuestUnlockables | null {
    const lockedQuests = getLockedQuestsForRival(rivalType, gameData);
    if (lockedQuests.length === 0) {
        return null;
    }
    return lockedQuests[Utils.randSeedInt(lockedQuests.length)];
}

export function getQuestUnlockableName(unlockable: QuestUnlockables): string {
    switch (unlockable) {
        case QuestUnlockables.TAUROS_ELECTRIC_HIT_QUEST:
            return i18next.t("quests:TAUROS_ELECTRIC_HIT_QUEST.name");
        case QuestUnlockables.KECLEON_COLOR_CHANGE_QUEST:
            return i18next.t("quests:KECLEON_COLOR_CHANGE_QUEST.name");
        case QuestUnlockables.GLISCOR_DARK_MOVE_KNOCKOUT_QUEST:
            return i18next.t("quests:GLISCOR_DARK_MOVE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.MAROWAK_CUBONE_FAINT_QUEST:
            return i18next.t("quests:MAROWAK_CUBONE_FAINT_QUEST.name");
        case QuestUnlockables.NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST:
            return i18next.t("quests:NOIVERN_DRAGON_MOVE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.FERALIGATR_DRAGON_DEFEAT_QUEST:
            return i18next.t("quests:FERALIGATR_DRAGON_DEFEAT_QUEST.name");
        case QuestUnlockables.CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST:
            return i18next.t("quests:CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.VENUSAUR_PSYCHIC_MOVE_USE_QUEST:
            return i18next.t("quests:VENUSAUR_PSYCHIC_MOVE_USE_QUEST.name");
        case QuestUnlockables.BLASTOISE_FAIRY_DEFEAT_QUEST:
            return i18next.t("quests:BLASTOISE_FAIRY_DEFEAT_QUEST.name");
        case QuestUnlockables.NIDOKING_DEFEAT_QUEST:
            return i18next.t("quests:NIDOKING_DEFEAT_QUEST.name");
        case QuestUnlockables.GENGAR_SPECIAL_WAVE_QUEST:
            return i18next.t("quests:GENGAR_SPECIAL_WAVE_QUEST.name");
        case QuestUnlockables.WEEZING_FIRE_MOVE_KNOCKOUT_QUEST:
            return i18next.t("quests:WEEZING_FIRE_MOVE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.HITMONLEE_NORMAL_WAVE_QUEST:
            return i18next.t("quests:HITMONLEE_NORMAL_WAVE_QUEST.name");
        case QuestUnlockables.HITMONCHAN_STAT_INCREASE_QUEST:
            return i18next.t("quests:HITMONCHAN_STAT_INCREASE_QUEST.name");
        case QuestUnlockables.HITMON_DUO_WIN_QUEST:
            return i18next.t("quests:HITMON_DUO_WIN_QUEST.name");
        case QuestUnlockables.KANGASKHAN_GHOST_MOVE_QUEST:
            return i18next.t("quests:KANGASKHAN_GHOST_MOVE_QUEST.name");
        case QuestUnlockables.SCYTHER_TRIO_WIN_QUEST:
            return i18next.t("quests:SCYTHER_TRIO_WIN_QUEST.name");
        case QuestUnlockables.GRENINJA_TRIO_WIN_QUEST:
            return i18next.t("quests:GRENINJA_TRIO_WIN_QUEST.name");
        case QuestUnlockables.SIMISAGE_TRIO_WIN_QUEST:
            return i18next.t("quests:SIMISAGE_TRIO_WIN_QUEST.name");
        case QuestUnlockables.ELEMENTAL_MONKEY_WIN_QUEST:
            return i18next.t("quests:ELEMENTAL_MONKEY_WIN_QUEST.name");
        case QuestUnlockables.ELECTIVIREMAGMORTAR_WIN_QUEST:
            return i18next.t("quests:ELECTIVIREMAGMORTAR_WIN_QUEST.name");
        case QuestUnlockables.GYARADOS_GROUND_SWITCH_QUEST:
            return i18next.t("quests:GYARADOS_GROUND_SWITCH_QUEST.name");
        case QuestUnlockables.LAPRAS_FIRE_MOVE_QUEST:
            return i18next.t("quests:LAPRAS_FIRE_MOVE_QUEST.name");
        case QuestUnlockables.PORYGON_Z_ANALYTIC_USE_QUEST:
            return i18next.t("quests:PORYGON_Z_ANALYTIC_USE_QUEST.name");
        case QuestUnlockables.DRAGONITE_LANCE_DEFEAT_QUEST:
            return i18next.t("quests:DRAGONITE_LANCE_DEFEAT_QUEST.name");
        case QuestUnlockables.SUDOWOODO_WOOD_HAMMER_QUEST:
            return i18next.t("quests:SUDOWOODO_WOOD_HAMMER_QUEST.name");
        case QuestUnlockables.AMBIPOM_GIGA_IMPACT_QUEST:
            return i18next.t("quests:AMBIPOM_GIGA_IMPACT_QUEST.name");
        case QuestUnlockables.MILTANK_STEEL_MOVE_KNOCKOUT_QUEST:
            return i18next.t("quests:MILTANK_STEEL_MOVE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.SLAKING_RIVAL_DEFEAT_QUEST:
            return i18next.t("quests:SLAKING_RIVAL_DEFEAT_QUEST.name");
        case QuestUnlockables.SOLROCK_LUNATONE_WIN_QUEST:
            return i18next.t("quests:SOLROCK_LUNATONE_WIN_QUEST.name");
        case QuestUnlockables.REGIGIGAS_REGI_DEFEAT_QUEST:
            return i18next.t("quests:REGIGIGAS_REGI_DEFEAT_QUEST.name");
        case QuestUnlockables.PIKACHU_RED_BLUE_WIN_QUEST:
            return i18next.t("quests:PIKACHU_RED_BLUE_WIN_QUEST.name");
        case QuestUnlockables.SNORLAX_GRASS_KNOCKOUT_QUEST:
            return i18next.t("quests:SNORLAX_GRASS_KNOCKOUT_QUEST.name");
        case QuestUnlockables.CLOYSTER_PRESENT_QUEST:
            return i18next.t("quests:CLOYSTER_PRESENT_QUEST.name");
        case QuestUnlockables.NUZLEAF_NOSEPASS_DEFEAT_QUEST:
            return i18next.t("quests:NUZLEAF_NOSEPASS_DEFEAT_QUEST.name");
        case QuestUnlockables.CHANDELURE_REST_QUEST:
            return i18next.t("quests:CHANDELURE_REST_QUEST.name");
        case QuestUnlockables.SMEARGLE_DEFEAT_QUEST:
            return i18next.t("quests:SMEARGLE_DEFEAT_QUEST.name");
        case QuestUnlockables.MIMIKYU_CHARIZARD_KNOCKOUT_QUEST:
            return i18next.t("quests:MIMIKYU_CHARIZARD_KNOCKOUT_QUEST.name");
        case QuestUnlockables.MIMIKYU_GRENINJA_KNOCKOUT_QUEST:
            return i18next.t("quests:MIMIKYU_GRENINJA_KNOCKOUT_QUEST.name");
        case QuestUnlockables.MIMIKYU_RAICHU_KNOCKOUT_QUEST:
            return i18next.t("quests:MIMIKYU_RAICHU_KNOCKOUT_QUEST.name");
        case QuestUnlockables.MIMIKYU_MEWTWO_KNOCKOUT_QUEST:
            return i18next.t("quests:MIMIKYU_MEWTWO_KNOCKOUT_QUEST.name");
        case QuestUnlockables.MIMIKYU_REGIROCK_KNOCKOUT_QUEST:
            return i18next.t("quests:MIMIKYU_REGIROCK_KNOCKOUT_QUEST.name");
        case QuestUnlockables.EISCUE_ROCK_KNOCKOUT_QUEST:
            return i18next.t("quests:EISCUE_ROCK_KNOCKOUT_QUEST.name");
        case QuestUnlockables.ZANGOOSE_SEVIPER_KNOCKOUT_QUEST:
            return i18next.t("quests:ZANGOOSE_SEVIPER_KNOCKOUT_QUEST.name");
        case QuestUnlockables.SEVIPER_ZANGOOSE_KNOCKOUT_QUEST:
            return i18next.t("quests:SEVIPER_ZANGOOSE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.TRUBBISH_POISON_DEFEAT_QUEST:
            return i18next.t("quests:TRUBBISH_POISON_DEFEAT_QUEST.name");
        case QuestUnlockables.HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST:
            return i18next.t("quests:HAWLUCHA_RIVAL_CHAMPION_DEFEAT_QUEST.name");
        case QuestUnlockables.DITTO_DRAGONITE_TRANSFORM_QUEST:
            return i18next.t("quests:DITTO_DRAGONITE_TRANSFORM_QUEST.name");
        case QuestUnlockables.DITTO_CHARIZARD_TRANSFORM_QUEST:
            return i18next.t("quests:DITTO_CHARIZARD_TRANSFORM_QUEST.name");
        case QuestUnlockables.DITTO_PIKACHU_TRANSFORM_QUEST:
            return i18next.t("quests:DITTO_PIKACHU_TRANSFORM_QUEST.name");
        case QuestUnlockables.DITTO_MACHAMP_TRANSFORM_QUEST:
            return i18next.t("quests:DITTO_MACHAMP_TRANSFORM_QUEST.name");
        case QuestUnlockables.DITTO_MEWTWO_TRANSFORM_QUEST:
            return i18next.t("quests:DITTO_MEWTWO_TRANSFORM_QUEST.name");
        case QuestUnlockables.FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST:
            return i18next.t("quests:FERALIGATOR_ROCK_MOVE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.WOBBUFFET_RIVAL_DEFEAT_QUEST:
            return i18next.t("quests:WOBBUFFET_RIVAL_DEFEAT_QUEST.name");
        case QuestUnlockables.MAGIKARP_DEFEAT_QUEST:
            return i18next.t("quests:MAGIKARP_DEFEAT_QUEST.name");
        case QuestUnlockables.KLINKLANG_GEAR_MOVE_QUEST:
            return i18next.t("quests:KLINKLANG_GEAR_MOVE_QUEST.name");
        case QuestUnlockables.SPINDA_CONFUSION_RECOVERY_QUEST:
            return i18next.t("quests:SPINDA_CONFUSION_RECOVERY_QUEST.name");
        case QuestUnlockables.NINETALES_STORED_POWER_KNOCKOUT_QUEST:
            return i18next.t("quests:NINETALES_STORED_POWER_KNOCKOUT_QUEST.name");
        case QuestUnlockables.MUK_RED_DEFEAT_QUEST:
            return i18next.t("quests:MUK_RED_DEFEAT_QUEST.name");
        case QuestUnlockables.SHUCKLE_DEFEAT_QUEST:
            return i18next.t("quests:SHUCKLE_DEFEAT_QUEST.name");
        case QuestUnlockables.TANGELA_RIVAL_DEFEAT_QUEST:
            return i18next.t("quests:TANGELA_RIVAL_DEFEAT_QUEST.name");
        case QuestUnlockables.LICKITUNG_GIGGLE_KNOCKOUT_QUEST:
            return i18next.t("quests:LICKITUNG_GIGGLE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.MAGICAL_PIKACHU_QUEST:
            return i18next.t("quests:MAGICAL_PIKACHU_QUEST.name");
        case QuestUnlockables.CHARMANDER_UNDERTALE_QUEST:
            return i18next.t("quests:CHARMANDER_UNDERTALE_QUEST.name");
        case QuestUnlockables.MEOWTH_JESTER_QUEST:
            return i18next.t("quests:MEOWTH_JESTER_QUEST.name");
        case QuestUnlockables.SHIFTRY_TENGU_QUEST:
            return i18next.t("quests:SHIFTRY_TENGU_QUEST.name");
        case QuestUnlockables.CLAYDOL_POISON_QUEST:
            return i18next.t("quests:CLAYDOL_POISON_QUEST.name");
        case QuestUnlockables.STARTER_CATCH_QUEST:
            return i18next.t("quests:STARTER_CATCH_QUEST.name");
        case QuestUnlockables.NUZLIGHT_UNLOCK_QUEST:
            return i18next.t("quests:NUZLIGHT_UNLOCK_QUEST.name");
        case QuestUnlockables.NUZLOCKE_UNLOCK_QUEST:
            return i18next.t("quests:NUZLOCKE_UNLOCK_QUEST.name");
        case QuestUnlockables.REVAROOM_EXTRA_QUEST:
            return i18next.t("quests:REVAROOM_EXTRA_QUEST.name");
        case QuestUnlockables.NORMAL_EFFECTIVENESS_QUEST:
            return i18next.t("quests:NORMAL_EFFECTIVENESS_QUEST.name");
        case QuestUnlockables.MAGIKARP_NEW_MOVES_QUEST:
            return i18next.t("quests:MAGIKARP_NEW_MOVES_QUEST.name");
        case QuestUnlockables.DITTO_NEW_MOVES_QUEST:
            return i18next.t("quests:DITTO_NEW_MOVES_QUEST.name");
        case QuestUnlockables.WOBBUFFET_NEW_MOVES_QUEST:
            return i18next.t("quests:WOBBUFFET_NEW_MOVES_QUEST.name");
        case QuestUnlockables.SMEARGLE_NEW_MOVES_QUEST:
            return i18next.t("quests:SMEARGLE_NEW_MOVES_QUEST.name");
        case QuestUnlockables.UNOWN_NEW_MOVES_QUEST:
            return i18next.t("quests:UNOWN_NEW_MOVES_QUEST.name");
        case QuestUnlockables.TYROGUE_NEW_MOVES_QUEST:
            return i18next.t("quests:TYROGUE_NEW_MOVES_QUEST.name");
        case QuestUnlockables.METAPOD_NEW_MOVES_QUEST:
            return i18next.t("quests:METAPOD_NEW_MOVES_QUEST.name");
        case QuestUnlockables.TAUROS_DARK_WAVE_QUEST:
            return i18next.t("quests:TAUROS_DARK_WAVE_QUEST.name");
        case QuestUnlockables.DITTO_SPECIAL_WIN_QUEST:
            return i18next.t("quests:DITTO_SPECIAL_WIN_QUEST.name");
        case QuestUnlockables.MAROWAK_ZOMBIE_KNOCKOUT_QUEST:
            return i18next.t("quests:MAROWAK_ZOMBIE_KNOCKOUT_QUEST.name");
        case QuestUnlockables.GRENINJA_YOKAI_WAVE_QUEST:
            return i18next.t("quests:GRENINJA_YOKAI_WAVE_QUEST.name");
        case QuestUnlockables.RAYQUAZA_SPECIAL_WIN_QUEST:
            return i18next.t("quests:RAYQUAZA_SPECIAL_WIN_QUEST.name");
        case QuestUnlockables.LICKITUNG_HYPER_WAVE_QUEST:
            return i18next.t("quests:LICKITUNG_HYPER_WAVE_QUEST.name");
        case QuestUnlockables.CHARMANDER_NIGHTMARE_WIN_QUEST:
            return i18next.t("quests:CHARMANDER_NIGHTMARE_WIN_QUEST.name");
        case QuestUnlockables.GASTLY_NIGHTMARE_WAVE_QUEST:
            return i18next.t("quests:GASTLY_NIGHTMARE_WAVE_QUEST.name");
        case QuestUnlockables.PIKACHU_PLUS_ULTRA_QUEST:
            return i18next.t("quests:PIKACHU_PLUS_ULTRA_QUEST.name");
        case QuestUnlockables.CHARIZARD_HELLFLAME_QUEST:
            return i18next.t("quests:CHARIZARD_HELLFLAME_QUEST.name");
        case QuestUnlockables.EEVEE_NIGHTMARE_QUEST:
            return i18next.t("quests:EEVEE_NIGHTMARE_QUEST.name");
        case QuestUnlockables.SNORLAX_NIGHTMARE_QUEST:
            return i18next.t("quests:SNORLAX_NIGHTMARE_QUEST.name");
        case QuestUnlockables.MEWTWO_NIGHTMARE_QUEST:
            return i18next.t("quests:MEWTWO_NIGHTMARE_QUEST.name");
        case QuestUnlockables.TYRANITAR_NIGHTMARE_QUEST:
            return i18next.t("quests:TYRANITAR_NIGHTMARE_QUEST.name");
        case QuestUnlockables.OCTILLERY_NIGHTMARE_QUEST:
            return i18next.t("quests:OCTILLERY_NIGHTMARE_QUEST.name");
        case QuestUnlockables.REGIROCK_NIGHTMARE_QUEST:
            return i18next.t("quests:REGIROCK_NIGHTMARE_QUEST.name");
        case QuestUnlockables.EEVEE_GHOST_QUEST:
            return i18next.t("quests:EEVEE_GHOST_QUEST.name");
        case QuestUnlockables.EEVEE_STEEL_QUEST:
            return i18next.t("quests:EEVEE_STEEL_QUEST.name");
        case QuestUnlockables.EEVEE_GROUND_QUEST:
            return i18next.t("quests:EEVEE_GROUND_QUEST.name");
        case QuestUnlockables.SQUIRTLE_TORMENT_QUEST:
            return i18next.t("quests:SQUIRTLE_TORMENT_QUEST.name");
        case QuestUnlockables.BULBASAUR_TERROR_QUEST:
            return i18next.t("quests:BULBASAUR_TERROR_QUEST.name");
        case QuestUnlockables.HYPNO_NIGHTMARE_QUEST:
            return i18next.t("quests:HYPNO_NIGHTMARE_QUEST.name");
        case QuestUnlockables.MAMOSWINE_NIGHTMARE_QUEST:
            return i18next.t("quests:MAMOSWINE_NIGHTMARE_QUEST.name");
        case QuestUnlockables.MORPEKO_NIGHTMARE_QUEST:
            return i18next.t("quests:MORPEKO_NIGHTMARE_QUEST.name");
        case QuestUnlockables.CLEFABLE_GENGAR_QUEST:
            return i18next.t("quests:CLEFABLE_GENGAR_QUEST.name");
        case QuestUnlockables.GOLEM_FIRE_QUEST:
            return i18next.t("quests:GOLEM_FIRE_QUEST.name");
        case QuestUnlockables.DEINO_NIGHTMARE_QUEST:
            return i18next.t("quests:DEINO_NIGHTMARE_QUEST.name");
        case QuestUnlockables.GOLURK_DREAD_QUEST:
            return i18next.t("quests:GOLURK_DREAD_QUEST.name");
        case QuestUnlockables.DUSCLOPS_NIGHTMARE_QUEST:
            return i18next.t("quests:DUSCLOPS_NIGHTMARE_QUEST.name");
        case QuestUnlockables.HARIYAMA_NIGHTMARE_QUEST:
            return i18next.t("quests:HARIYAMA_NIGHTMARE.name");
        case QuestUnlockables.SHARPEDO_NIGHTMARE_QUEST:
            return i18next.t("quests:SHARPEDO_NIGHTMARE_QUEST.name");
        case QuestUnlockables.FARIGIRAF_NIGHTMARE_QUEST:
            return i18next.t("quests:FARIGIRAF_NIGHTMARE_QUEST.name");
        case QuestUnlockables.KINGDRA_NIGHTMARE_QUEST:
            return i18next.t("quests:KINGDRA_NIGHTMARE_QUEST.name");
        case QuestUnlockables.EXCADRILL_NIGHTMARE_QUEST:
            return i18next.t("quests:EXCADRILL_NIGHTMARE_QUEST.name");
        case QuestUnlockables.PIKACHU_ROBO_NIGHTMARE_QUEST:
            return i18next.t("quests:PIKACHU_ROBO_NIGHTMARE_QUEST.name");
        case QuestUnlockables.LUCARIO_NIGHTMARE_QUEST:
            return i18next.t("quests:LUCARIO_NIGHTMARE_QUEST.name");
        case QuestUnlockables.SUNFLORA_NIGHTMARE_QUEST:
            return i18next.t("quests:SUNFLORA_NIGHTMARE_QUEST.name");
        case QuestUnlockables.DODRIO_NIGHTMARE_QUEST:
            return i18next.t("quests:DODRIO_NIGHTMARE_QUEST.name");
        case QuestUnlockables.LANTURN_NIGHTMARE_QUEST:
            return i18next.t("quests:LANTURN_NIGHTMARE_QUEST.name");
    }
}