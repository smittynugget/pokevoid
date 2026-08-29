import i18next from "i18next";
import { QuestUnlockables, QuestState } from "#enums/quest-unlockables";
import BattleScene, {PokeballCounts, RecoveryBossMode, bypassLogin, RunEndSummaryRunData} from "../battle-scene";
import Pokemon, {EnemyPokemon, PlayerPokemon, PokemonMove, PokemonSummonData} from "../field/pokemon";
import {pokemonEvolutions, pokemonPrevolutions} from "../data/pokemon-evolutions";
import PokemonSpecies, {
    allSpecies,
    getPokemonSpecies,
    noStarterFormKeys,
    speciesStarters
} from "../data/pokemon-species";
import * as Utils from "../utils";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
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
import {isIPhone} from "../loading-scene";
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
    PermaHitQuestModifier, PermaModifier, PersistentModifier, PokemonFormChangeItemModifier, PermaRunQuestModifier, TurnHeldItemTransferModifier
} from "../modifier/modifier";
import {StatusEffect} from "#app/data/status-effect.js";
import ChallengeData from "./challenge-data";
import {randSeedInt} from "../utils";
import {PokeballType, getActiveChampionData} from "#app/data/pokeball";
import {Device} from "#enums/devices";
import {GameDataType} from "#enums/game-data-type";
import {Moves} from "#enums/moves";
import {PlayerGender} from "#enums/player-gender";
import {Species} from "#enums/species";
import {RewardType} from "#enums/reward-type";
import {GameMechanicsID, GameMechanicsVersion} from "#enums/gameMechanicsID";
import { ActiveSkillTreeData } from "#app/system/skill-tree-data";
import { ensureSkillTreeTokenTracker } from "#app/system/skill-tree-progression";
import {applyChallenges, ChallengeType} from "#app/data/challenge.js";
import {WeatherType} from "#app/enums/weather-type.js";
import {TerrainType} from "#app/data/terrain.js";
import { ChampionUtils } from "./champion-utils";
import {OutdatedPhase} from "#app/phases/outdated-phase.js";
import {ReloadSessionPhase} from "#app/phases/reload-session-phase.js";
import { TitlePhase } from "#app/phases/title-phase";
import {RUN_HISTORY_LIMIT} from "#app/ui/run-history-ui-handler";

import {Abilities} from "#enums/abilities";
import {Gender} from "#app/data/gender";
import {
    ModifierTypeGenerator,
    ModifierTypeOption,
    getModifierType,
    modifierTypes,
    PermaModifierTypeGenerator,
    PermaPartyAbilityModifierTypeGenerator,
    PermaCollectedTypeModifierType,
    PokemonAltBuildModifierType,
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
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";
import { modStorage } from "./mod-storage";
import { UnlockModFormPhase } from "../phases/unlock-mod-form-phase";
import { RivalModUnlockPhase } from "../phases/rival-mod-unlock-phase.js";
import { getModPokemonName } from "../data/mod-glitch-form-utils";
import { getModFormSystemName } from "#app/data/mod-glitch-form-data.js";
import { PathNodeContext } from "#app/battle";
import { PathNodeType } from "#app/battle";
import { ChampionLevelUpData, SkillCategory } from "#app/system/playable-champions";
import { ChampionLevelUpPhase } from "#app/phases/champion-level-up-phase";
import { CHAMPION_DEFINITIONS } from "#app/system/champion-registry";
import { SlideshowCutscenePhase } from "#app/phases/slideshow-cutscene-phase.js";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";
import { runPowerUnlockOverlays } from "#app/utils/story-cutscene-power-overlays.js";
import { addCorruptedRivalOverlay, playCutsceneFaintAnim } from "#app/utils/story-cutscene-overlays.js";
export const defaultStarterSpecies: Species[] = [];

export const INTERNAL_BACKUP_VERSION = 5;

export const VERSIONS_REQUIRING_BACKUP: string[] = [
    "v2.0b [The Colossal Update]",
    "v2.4.3 [2 Year Update]"
];

export enum ChampionSkillVersion {
    INITIAL = 1,
    SKILL_SHUFFLE_V1 = 2,
    BOND_TO_XM_MIGRATION = 3,
    BOUNTY_NODES_V1 = 4,
}

export const CURRENT_CHAMPION_SKILL_VERSION = ChampionSkillVersion.BOUNTY_NODES_V1;

export interface BackupInfo {
    key: string;
    version: string;
    sanitizedVersion: string;
    timestamp?: number;
    displayName: string;
}

export const saveKey = "x0i2O7WRiANTqPmZ";

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
    lastLoadingSmitomReward?: number;
      lastSaveTime?: number;
  lastBackupTime?: number;
  lastBackupVersion?: number;
  defeatedRivals: RivalTrainerType[];
  defeatedSmittyFoes?: string[];
    uniSmittyUnlocks: string[];
    modFormsUnlocked?: string[];
    smitomTalks: number[];
    smitomTutorialFlags?: Record<string, boolean>;
    rewardOverlayOpacity: number;
    testSpeciesForMod: number[];
    testModsCount: number;
    isNewPlayer?: boolean;
    selectedChampionId?: string;
    championData?: Record<string, any>;
    pendingChampionLevelUps?: Record<string, ChampionLevelUpData[]>;
    championSkillVersion?: number;
    settings?: Record<string, number>;
    settingsGamepad?: Record<string, number>;
    settingsKeyboard?: Record<string, number>;
    mappingConfigs?: Record<string, unknown>;
    commandStripUsageCounts?: Record<number, number>;
    commandStripRecentOrder?: number[];
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
    typeBallCounts?: { [typeId: number]: number };
    money: integer;
    score: integer;
    waveIndex: integer;
    battleType: BattleType;
    trainer: TrainerData;
    battleStarted?: boolean;
    battleTurn?: integer;
    encounterInitComplete?: boolean;
    gameVersion: string;
    timestamp: integer;
    challenges: ChallengeData[];
    playerRival: RivalTrainerType;
    chaosAltRivals: RivalTrainerType[];
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
    lastBattleNodeWave?: integer;
    dynamicMode?: DynamicMode;
    hasSeenCurrentShopItems?: boolean;
    rivalWave?: integer;
    gameMechanicTracking?: Record<string, string>;
    activeSkillTree?: ActiveSkillTreeDataSerialized;
    moveUpgradesEnabledForRun?: boolean;
    statSwitchersEnabledForRun?: boolean;
    releaseItemsEnabledForRun?: boolean;
    ivScannerEnabledForRun?: boolean;
    mapEnabledForRun?: boolean;
    skillTreeEnabledForRun?: boolean;
    pendingSkillTreeAutoOpen?: boolean;
    skillTreeAutoOpenConsumed?: boolean;
    wave35UnlockedThisRun?: boolean;
    runEndSummaryRunData?: RunEndSummaryRunData;
}

export interface ActiveSkillTreeDataSerialized {
    championId: string;
    runtimeType1?: number;
    runtimeType2?: number;
    treeLevel: number;
    maxVisibleDepth: number;
    depth1BountyPresent?: boolean;
    unlockedNodes: string[];
    skillEffects: Record<string, any>;
    seed: number;
    selectedPokemon: { signature?: Species; general?: Species };
    selectedPokemonPicks?: Array<{ species: Species; isSignature: boolean }>;
    unlockedGlitchForms: string[];
    sessionQuestUnlockables?: Record<string, { questUnlockData?: QuestUnlockData }>;
    sessionModFormsUnlocked?: string[];
    sessionUniSmittyUnlocks?: string[];
    unlockedBranches?: string[];
    skillPoints: number;
    tokens: number;
    starterPokemon?: Species;
    catchRateBonusByType?: Record<string, number>;
    reviveChanceByType?: Record<string, number>;
    reviveChanceBySpecies?: Record<string, number>;
    essenceTypeWeights?: Record<string, number>;
    fusionPriorityChanceByType?: Record<string, number>;
    fusionPriorityChanceBySpecies?: Record<string, number>;
    legendaryEncounterChanceBySpecies?: Record<string, number>;
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
    championObtainedBy?: bigint;
    temporary?: boolean;
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

export const ChampionBit = {
    APOLLO_DIANA: 1n << 0n,
    BROCK: 1n << 1n,
    MISTY: 1n << 2n,
    LT_SURGE: 1n << 3n,
    ERIKA: 1n << 4n,
    KOGA: 1n << 5n,
    SABRINA: 1n << 6n,
    BLAINE: 1n << 7n,
    GIOVANNI: 1n << 8n,
    RED: 1n << 9n,
};

export const CHAMPION_ID_TO_BIT: Record<string, bigint> = {
    "apollo_diana": ChampionBit.APOLLO_DIANA,
    "brock": ChampionBit.BROCK,
    "misty": ChampionBit.MISTY,
    "lt_surge": ChampionBit.LT_SURGE,
    "erika": ChampionBit.ERIKA,
    "koga": ChampionBit.KOGA,
    "sabrina": ChampionBit.SABRINA,
    "blaine": ChampionBit.BLAINE,
    "giovanni": ChampionBit.GIOVANNI,
    "red": ChampionBit.RED,
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
const StarterPrefers_DEFAULT: string = "{}";
let StarterPrefers_private_latest: string = StarterPrefers_DEFAULT;

export class StarterPrefs {

    static load(): StarterPreferences {
        return JSON.parse(
            StarterPrefers_private_latest = (localStorage.getItem(`starterPrefs_${loggedInUser?.username}`) || StarterPrefers_DEFAULT)
        );
    }
    static save(prefs: StarterPreferences): void {
        const pStr: string = JSON.stringify(prefs);
        if (pStr !== StarterPrefers_private_latest) {

            localStorage.setItem(`starterPrefs_${loggedInUser?.username}`, pStr);

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
    public testModsCount: number = 0;
    public isNewPlayer: boolean = false;
    public selectedChampionId?: string;
    public championData?: Record<string, any>;
    public pendingChampionLevelUps?: Record<string, ChampionLevelUpData[]>;
    public championSkillVersion: number = ChampionSkillVersion.INITIAL;
    private migrationOccurred: boolean = false;
    public resumeInBattle: boolean = false;
    public activeSkillTree?: ActiveSkillTreeData;
    public pendingSkillTreeAutoOpen: boolean = false;
    public skillTreeAutoOpenConsumed: boolean = false;
    public tempSkillTreeConfig?: any;

    public currentPermaShopOptions: ModifierTypeOption[] | null = null;
    public lastPermaShopRefreshTime: number = 0;
    public permaShopRerollCount: number = 0;
    public lastSmitomReward: number = 0;
    public lastLoadingSmitomReward: number = 0;
      public lastSaveTime: number = 0;
  public lastBackupTime: number = 0;
  public lastBackupVersion: number = 0;
  public rewardOverlayOpacity: number = 1;
    public questUnlockables: Partial<Record<QuestUnlockables, QuestProgress>>;
    public playerRival: RivalTrainerType | null = null;
    public chaosAltRivals: RivalTrainerType[] = [];
    public defeatedRivals: RivalTrainerType[] = [];
    public defeatedSmittyFoes: string[] = [];
    private sessionQuestModifierData: Record<string, number> = {};
    private activeConsoleCodeQuests: string[] = [];
    public uniSmittyUnlocks: string[] = [];
    public modFormsUnlocked: string[] = [];
    public dataLoadAttempted: boolean = false;
    private dataLoaded: boolean = false;
    public nightmareBattleSeeds: NightmareBattleSeeds | null = null;
    public fixedBattleSeeds: FixedBattleSeeds | null = null;
    public sacrificeToggleOn: boolean = false;
    public hasSeenCurrentShopItems: boolean = false;
    public preargsForShop: Record<number, PreargsForShop> = {};

    public smitomTalks: number[] = [];
    public nightmareRivalInfo: Record<number, NightmareRivalInfo> = {};
    public combinedData: { systemData?: SystemSaveData, sessionData?: string[] } = {};
    public tutorialService: TutorialService;
    public smitomTutorialFlags: Record<string, boolean> = {};
    public tutorialOnboardActive: boolean = false;
    public tutorialBattleScript: {
      step: string;
      turnsSinceLastReward: number;
      rewardSubstep: string;
      tutorialGlitchTriggered: boolean;
      wakeUpTriggered: boolean;
      voidCaptureTipTriggered: boolean;
      reviverSeedPendingTrigger: boolean;
      playerStarterSpecies: number | null;
      foeSpecies: number | null;
    } | null = null;
    public tutorialStarterSelectCallback: (() => void) | null = null;
    public moveUsageCount: Record<number, number> = {};
    public commandStripUsageCounts: Record<number, number> = {};

    public commandStripRecentOrder: number[] = [];
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
        this.isNewPlayer = this.gameStats?.sessionsPlayed === 0;
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
            [Unlockables.NUZLIGHT_DRAFT_MODE]: false,
            [Unlockables.NUZLOCKE_DRAFT_MODE]: false,
            [Unlockables.CHAOS_JOURNEY_MODE]: false,
            [Unlockables.CHAOS_VOID_MODE]: false,
            [Unlockables.CHAOS_ROGUE_VOID_MODE]: false,
            [Unlockables.CHAOS_INFINITE_MODE]: false,
            [Unlockables.CHAOS_INFINITE_ROGUE_MODE]: false,

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
        this.defeatedSmittyFoes = [];
        initializePermaModifierChecker(this);
        this.initDexData();
        this.initStarterData();
        this.tutorialService = new TutorialService(this.scene);
        this.moveUsageCount = {};
        this.upgradedMoves = {};
        this.tempHatchedPokemon = [];
        this.pendingMoveUpgrades = -1;
        this.testSpeciesForMod = [];
        this.testModsCount = 0;
        this.biomeChange = BiomeChange.NONE;
        this.championSkillVersion = ChampionSkillVersion.INITIAL;
    }

    private ensureChampionDataIntegrity(): void {
        if (!this.championData) {
            this.championData = {};
        }
        if (!this.pendingChampionLevelUps) {
            this.pendingChampionLevelUps = {} as Record<string, ChampionLevelUpData[]>;
        }
        Object.keys(this.championData).forEach((championId) => {
            const champ: any = this.championData![championId] || {};
            champ.unlockedSkills = champ.unlockedSkills || {};
            champ.unlockedTMs = champ.unlockedTMs || [];
            champ.unlockedXMs = champ.unlockedXMs || [];
            champ.unlockedAbilities = champ.unlockedAbilities || [];
            champ.unlockedSmittyAbilities = champ.unlockedSmittyAbilities || [];
            champ.unlockedMegaStones = champ.unlockedMegaStones || [];
            champ.unlockedMaxMushrooms = champ.unlockedMaxMushrooms || false;
            champ.unlockedTypeSwitchers = champ.unlockedTypeSwitchers || [];
            champ.unlockedEssenceBundles = champ.unlockedEssenceBundles || [];
            champ.unlockedPermaItems = champ.unlockedPermaItems || [];
            champ.unlockedStatBoosts = champ.unlockedStatBoosts || [];
            champ.unlockedAltBuilds = champ.unlockedAltBuilds || [];
            champ.unlockedConditionalAbilities = champ.unlockedConditionalAbilities || [];
            champ.unlockedMoveUpgrades = champ.unlockedMoveUpgrades || [];
            this.championData![championId] = champ;
        });
    }

    public validateChampionGlitchForms(championId: string): void {
        const champ = this.championData?.[championId] as any;
        if (!champ) return;

        let defId = championId;
        if (championId === "apollo" || championId === "diana") {
            defId = "apollo_diana";
        }
        const def = CHAMPION_DEFINITIONS[defId];
        if (!def) return;

        const baseUnlocked = (def as any).unlockedGlitchForms || [];
        const lockedSkills = def.lockedSkills || {};
        const savedUnlocked = Array.isArray((champ as any).unlockedGlitchForms) ? (champ as any).unlockedGlitchForms : [];
        const savedUnlockableIds =
            (champ as any).glitchFormUnlockableIds && typeof (champ as any).glitchFormUnlockableIds === "object"
                ? (champ as any).glitchFormUnlockableIds
                : {};

        const normalizeKey = (k: any) => (typeof k === "string" ? k.toLowerCase() : "");
        const validForms = [...baseUnlocked, ...savedUnlocked]
            .map(normalizeKey)
            .filter(k => !!k && k !== "unknown");

        const validUnlockableIds: Record<string, any> = {};
        for (const [k, v] of Object.entries(((def as any).glitchFormUnlockableIds || {}) as Record<string, any>)) {
            const key = normalizeKey(k);
            if (key && key !== "unknown") validUnlockableIds[key] = v;
        }
        for (const [k, v] of Object.entries((savedUnlockableIds || {}) as Record<string, any>)) {
            const key = normalizeKey(k);
            if (key && key !== "unknown") validUnlockableIds[key] = v;
        }

        for (const [skillId, skill] of Object.entries(lockedSkills)) {
            const s = skill as any;
            if (s.category === SkillCategory.GLITCH_FORMS &&
                s.unlockLevel <= (champ.level || 1) &&
                champ.unlockedSkills?.[skillId]) {
                try {
                    const questData = this.getQuestUnlockDataFromModifierTypes(s.unlockableId);
                    if (questData?.rewardId) {
                        const species = getPokemonSpecies(questData.rewardId as any);
                        const formKey = species?.getGlitchFormName?.(true, undefined, questData.rewardType);
                        if (formKey && formKey !== "unknown") {
                            const lowerKey = normalizeKey(formKey);
                            if (lowerKey && !validForms.includes(lowerKey)) validForms.push(lowerKey);
                            if (lowerKey) validUnlockableIds[lowerKey] = s.unlockableId;
                        }
                    }
                } catch {}
            }
        }
        for (const k of Object.keys(validUnlockableIds)) {
            if (k && k !== "unknown" && !validForms.includes(k)) validForms.push(k);
        }

        champ.unlockedGlitchForms = [...new Set(validForms)];
        champ.glitchFormUnlockableIds = validUnlockableIds;
    }

    public applyChampionLevelUnlocks(championId: string): void {
        try {
            if (!this.championData) return;
            const champ: any = this.championData[championId];
            if (!champ) return;
            const def = CHAMPION_DEFINITIONS?.[championId];
            const lockedSkills = (def && def.lockedSkills) ? def.lockedSkills : {};

            this.ensureChampionDataIntegrity();
            champ.unlockedSkills = champ.unlockedSkills || {};

            const now = Date.now();
            const currentLevel = champ.level || 1;

            for (const [skillId, skill] of Object.entries(lockedSkills)) {
                const s: any = skill;
                const unlockLevel = s?.unlockLevel ?? 0;
                if (unlockLevel <= currentLevel && !champ.unlockedSkills[skillId]) {
                    champ.unlockedSkills[skillId] = { skillId, unlockedAt: now, level: currentLevel };

                    const unlockId = s?.unlockableId;
                    switch (s?.category) {
                        case SkillCategory.TMS:
                            champ.unlockedTMs = champ.unlockedTMs || [];
                            if (unlockId !== undefined && !champ.unlockedTMs.includes(unlockId)) champ.unlockedTMs.push(unlockId);
                            break;
                        case SkillCategory.XMS:
                            champ.unlockedXMs = champ.unlockedXMs || [];
                            if (unlockId !== undefined && !champ.unlockedXMs.includes(unlockId)) champ.unlockedXMs.push(unlockId);
                            break;
                        case SkillCategory.PASSIVE_ABILITIES:
                        case SkillCategory.ABILITY_POOL:
                            champ.unlockedAbilities = champ.unlockedAbilities || [];
                            if (unlockId !== undefined && !champ.unlockedAbilities.includes(unlockId)) {
                                champ.unlockedAbilities.push(unlockId);
                            }
                            break;
                        case SkillCategory.SMITTY_ABILITIES:
                            champ.unlockedSmittyAbilities = champ.unlockedSmittyAbilities || [];
                            if (unlockId !== undefined && !champ.unlockedSmittyAbilities.includes(unlockId)) {
                                champ.unlockedSmittyAbilities.push(unlockId);
                            }
                            break;
                        case SkillCategory.TRAINER_BOND_ABILITIES:
                            champ.unlockedConditionalAbilities = champ.unlockedConditionalAbilities || [];
                            if (unlockId !== undefined && !champ.unlockedConditionalAbilities.includes(unlockId)) champ.unlockedConditionalAbilities.push(unlockId);
                            break;
                        case SkillCategory.MEGA_STONES:
                            champ.unlockedMegaStones = champ.unlockedMegaStones || [];
                            if (unlockId !== undefined && !champ.unlockedMegaStones.includes(unlockId)) champ.unlockedMegaStones.push(unlockId);
                            break;
                        case SkillCategory.DYNA_MUSHROOMS:
                            champ.unlockedMaxMushrooms = true;
                            break;
                        case SkillCategory.TYPE_SWITCHERS:
                            champ.unlockedTypeSwitchers = champ.unlockedTypeSwitchers || [];
                            if (unlockId !== undefined && !champ.unlockedTypeSwitchers.includes(unlockId)) champ.unlockedTypeSwitchers.push(unlockId);
                            break;
                        case SkillCategory.ESSENCE_BUNDLES:
                            champ.unlockedEssenceBundles = champ.unlockedEssenceBundles || [];
                            if (unlockId !== undefined && !champ.unlockedEssenceBundles.includes(unlockId)) champ.unlockedEssenceBundles.push(unlockId);
                            break;
                        case SkillCategory.PERMA_ITEMS:
                            champ.unlockedPermaItems = champ.unlockedPermaItems || [];
                            if (unlockId !== undefined && !champ.unlockedPermaItems.includes(unlockId)) champ.unlockedPermaItems.push(unlockId);
                            break;
                        case SkillCategory.STAT_BOOSTS:
                            champ.unlockedStatBoosts = champ.unlockedStatBoosts || [];
                            if (unlockId !== undefined && !champ.unlockedStatBoosts.includes(unlockId)) champ.unlockedStatBoosts.push(unlockId);
                            break;
                        case SkillCategory.MOVE_UPGRADES:
                            champ.unlockedMoveUpgrades = champ.unlockedMoveUpgrades || [];
                            if (unlockId !== undefined && !champ.unlockedMoveUpgrades.includes(unlockId)) champ.unlockedMoveUpgrades.push(unlockId);
                            break;

                        case SkillCategory.SIGNATURE_POKEMON: {
                            try {
                                if (unlockId !== undefined) {
                                  const species = unlockId as Species;
                                  (champ as any).unlockedSignaturePokemon = (champ as any).unlockedSignaturePokemon || [];
                                  const arr = (champ as any).unlockedSignaturePokemon as Species[];
                                  if (!arr.includes(species)) {
                                    arr.push(species);
                                    const altBuildId = ChampionUtils.getAutoUnlockAltBuildId(species, { id: championId } as any);
                                    if (altBuildId) {
                                        champ.unlockedAltBuilds = champ.unlockedAltBuilds || [];
                                        if (!champ.unlockedAltBuilds.includes(altBuildId)) {
                                            champ.unlockedAltBuilds.push(altBuildId);
                                        }
                                    }
                                  }
                                }
                            } catch {}
                            break;
                        }
                        case SkillCategory.LEGENDARY_POKEMON: {
                            try {
                                if (unlockId !== undefined) {
                                  const species = unlockId as Species;
                                  (champ as any).unlockedLegendaryPokemon = (champ as any).unlockedLegendaryPokemon || [];
                                  const arr = (champ as any).unlockedLegendaryPokemon as Species[];
                                  if (!arr.includes(species)) arr.push(species);
                                }
                            } catch {}
                            break;
                        }
                        case SkillCategory.MOVE_UPGRADES_SPECIFIC:
                            champ.unlockedMoveAttrUpgrades = champ.unlockedMoveAttrUpgrades || [];
                            if (typeof unlockId === "string" && !champ.unlockedMoveAttrUpgrades.includes(unlockId)) champ.unlockedMoveAttrUpgrades.push(unlockId);
                            break;
                        case SkillCategory.TYPE_BOOSTERS:
                            champ.unlockedTypeBoosters = champ.unlockedTypeBoosters || [];
                            if (unlockId !== undefined && !champ.unlockedTypeBoosters.includes(unlockId)) champ.unlockedTypeBoosters.push(unlockId);
                            break;
                        case SkillCategory.VOUCHERS:
                            champ.unlockedVoucherTiers = champ.unlockedVoucherTiers || [];
                            if (unlockId !== undefined && !champ.unlockedVoucherTiers.includes(unlockId)) champ.unlockedVoucherTiers.push(unlockId);
                            break;
                        case SkillCategory.RARITY_SELECT_ROGUE:
                            champ.unlockedBallRaritySelect = champ.unlockedBallRaritySelect || {};
                            champ.unlockedBallRaritySelect.rogue = true;
                            break;
                        case SkillCategory.RARITY_SELECT_MASTER:
                            champ.unlockedBallRaritySelect = champ.unlockedBallRaritySelect || {};
                            champ.unlockedBallRaritySelect.master = true;
                            break;
                        case SkillCategory.MONEY_REWARDS:
                            champ.unlockedMoneyReward = true;
                            break;
                        case SkillCategory.PERMA_MONEY:
                            champ.unlockedPermaMoney = true;
                            break;
                        case SkillCategory.ESSENCE_TYPE_WEIGHTS:
                            champ.unlockedEssenceWeightTypes = champ.unlockedEssenceWeightTypes || [];
                            if (unlockId !== undefined && !champ.unlockedEssenceWeightTypes.includes(unlockId)) champ.unlockedEssenceWeightTypes.push(unlockId);
                            break;
                        case SkillCategory.TERA_TYPES:
                        case SkillCategory.TERA_TYPE_REWARDS:
                            champ.unlockedTeraTypes = champ.unlockedTeraTypes || [];
                            if (unlockId !== undefined && !champ.unlockedTeraTypes.includes(unlockId)) champ.unlockedTeraTypes.push(unlockId);
                            break;
                        case SkillCategory.CATCHING:
                            champ.unlockedCatchRateTypes = champ.unlockedCatchRateTypes || [];
                            if (unlockId !== undefined && !champ.unlockedCatchRateTypes.includes(unlockId)) champ.unlockedCatchRateTypes.push(unlockId);
                            break;
                        case SkillCategory.FUSION:
                        case SkillCategory.FUSION_PRIORITIES: {
                            try {
                                const upd = { types: [] as any[], species: [] as any[] };
                                if (unlockId && typeof unlockId === "object") {
                                    if ((unlockId as any).types) upd.types = (unlockId as any).types;
                                    if ((unlockId as any).species) upd.species = (unlockId as any).species;
                                }
                                champ.preferredFusionSecondary = champ.preferredFusionSecondary || { types: [], species: [] };
                                champ.preferredFusionSecondary.types = [
                                    ...(champ.preferredFusionSecondary.types || []),
                                    ...upd.types
                                ];
                                champ.preferredFusionSecondary.species = [
                                    ...(champ.preferredFusionSecondary.species || []),
                                    ...upd.species
                                ];
                            } catch {}
                            break;
                        }
                        case SkillCategory.REVIVAL: {
                            try {
                                const inc = unlockId && typeof unlockId === "object" ? unlockId as any : {};
                                champ.reviveBoostTargets = champ.reviveBoostTargets || { types: [], species: [], amount: 0 };
                                champ.reviveBoostTargets.types = [
                                    ...(champ.reviveBoostTargets.types || []),
                                    ...((inc.types || []) as any[])
                                ];
                                champ.reviveBoostTargets.species = [
                                    ...(champ.reviveBoostTargets.species || []),
                                    ...((inc.species || []) as any[])
                                ];
                                champ.reviveBoostTargets.amount = (champ.reviveBoostTargets.amount || 0) + (inc.amount || 0);
                            } catch {}
                            break;
                        }
                        case SkillCategory.POKEBALLS: {
                            try {
                                if (typeof unlockId === "string") {
                                    const key = unlockId.toLowerCase();
                                    if (key.includes("gold")) champ.unlockedGoldenPokeball = true;
                                    if (key.includes("master")) champ.unlockedMasterBall = true;
                                }
                            } catch {}
                            break;
                        }
                        case SkillCategory.POKEMON_ALT_BUILDS:
                            champ.unlockedAltBuilds = champ.unlockedAltBuilds || [];
                            if (unlockId !== undefined && !champ.unlockedAltBuilds.includes(unlockId)) champ.unlockedAltBuilds.push(unlockId);
                            break;
                        case SkillCategory.GLITCH_FORMS: {
                            try {
                                const questId = unlockId as QuestUnlockables;
                                if (!questId) break;
                                const questData = this.getQuestUnlockDataFromModifierTypes(questId);
                                if (!questData || !questData.rewardId) break;
                                const species = getPokemonSpecies(questData.rewardId);
                                if (!species) break;
                                const formKey = species.getGlitchFormName?.(true, undefined, questData.rewardType);
                                if (!formKey || formKey === "unknown") break;
                                champ.unlockedGlitchForms = champ.unlockedGlitchForms || [];
                                champ.glitchFormUnlockableIds = champ.glitchFormUnlockableIds || {};
                                if (!champ.unlockedGlitchForms.includes(formKey.toLowerCase())) {
                                    champ.unlockedGlitchForms.push(formKey.toLowerCase());
                                }
                                champ.glitchFormUnlockableIds[formKey.toLowerCase()] = questId;
                                this.setQuestState(questId, QuestState.COMPLETED, questData);
                            } catch {}
                            break;
                        }
                        case SkillCategory.SKILL_TREE_STARTER_NODES:
                            champ.starterNodeUpgradesUnlocked = Math.min(6, Math.max(0, (champ.starterNodeUpgradesUnlocked || 0) + 1));
                            break;
                        default:

                            break;
                    }
                }
            }

            this.saveSystem();
        } catch (e) {
            console.warn("applyChampionLevelUnlocks failed:", e);
        }
    }

    private migrateChampionSkillsIfNeeded(savedVersion: number | undefined): void {
        const currentVersion = CURRENT_CHAMPION_SKILL_VERSION;
        const effectiveVersion = savedVersion ?? ChampionSkillVersion.INITIAL;

        if (effectiveVersion >= currentVersion) {
            return;
        }

        console.log(`[MIGRATION] Champion skills: v${effectiveVersion} → v${currentVersion}`);

        if (!this.championData) return;

        for (const championId of Object.keys(this.championData)) {
            const champ = this.championData[championId] as any;

            let defId = championId;
            if (championId === "apollo" || championId === "diana") {
                defId = "apollo_diana";
            }

            const def = CHAMPION_DEFINITIONS[defId];
            if (!champ || !def) continue;

            const savedLevel = champ.level || 1;
            const savedXp = champ.xp || 0;
            const savedIsUnlocked = champ.isUnlocked;

            champ.unlockedSkills = {};

            champ.unlockedTMs = [...(def.unlockedTMs || [])];
            champ.unlockedXMs = [...(def.unlockedXMs || [])];
            champ.unlockedAbilities = [...(def.unlockedAbilities || [])];
            champ.unlockedSmittyAbilities = [...(def.unlockedSmittyAbilities || [])];
            champ.unlockedMegaStones = [...(def.unlockedMegaStones || [])];
            champ.unlockedMaxMushrooms = def.unlockedMaxMushrooms || false;
            champ.unlockedTypeSwitchers = [...(def.unlockedTypeSwitchers || [])];
            champ.unlockedEssenceBundles = [...(def.unlockedEssenceBundles || [])];
            champ.unlockedPermaItems = [...(def.unlockedPermaItems || [])];
            champ.unlockedStatBoosts = [...(def.unlockedStatBoosts || [])];
            champ.unlockedAltBuilds = [...(def.unlockedAltBuilds || [])];
            champ.unlockedMoveUpgrades = [...(def.unlockedMoveUpgrades || [])];
            champ.unlockedConditionalAbilities = [...(def.unlockedConditionalAbilities || [])];
            champ.unlockedTypeBoosters = [...(def.unlockedTypeBoosters || [])];
            champ.unlockedTeraTypes = [...(def.unlockedTeraTypes || [])];
            champ.unlockedVoucherTiers = [...(def.unlockedVoucherTiers || [])];
            champ.unlockedGlitchForms = [...(def.unlockedGlitchForms || [])];
            champ.glitchFormUnlockableIds = { ...(def.glitchFormUnlockableIds || {}) };
            champ.unlockedSignaturePokemon = [...(def.signaturePokemon || [])];
            champ.unlockedLegendaryPokemon = [...(def.legendaryPokemon || [])];

            champ.unlockedMoneyReward = def.unlockedMoneyReward || false;
            champ.unlockedPermaMoney = def.unlockedPermaMoney || false;
            champ.unlockedHealingItems = def.unlockedHealingItems || false;
            champ.unlockedMemoryMushroom = def.unlockedMemoryMushroom || false;
            champ.unlockedBerries = def.unlockedBerries || false;
            champ.unlockedAbilitySwitchers = def.unlockedAbilitySwitchers || false;
            champ.unlockedGeneralItems = def.unlockedGeneralItems || false;
            champ.unlockedBaton = def.unlockedBaton || false;
            champ.unlockedPPMax = def.unlockedPPMax || false;
            champ.unlockedRogueBall = def.unlockedRogueBall || false;
            champ.unlockedGoldenPokeball = def.unlockedGoldenPokeball || false;
            champ.unlockedMasterBall = def.unlockedMasterBall || false;
            champ.unlockedBallRaritySelect = { ...(def.unlockedBallRaritySelect || {}) };

            champ.level = savedLevel;
            champ.xp = savedXp;
            champ.isUnlocked = savedIsUnlocked;

            console.log(`[MIGRATION] Reset champion ${championId} (level ${savedLevel}) to starter defaults`);
        }

        this.championSkillVersion = currentVersion;
        this.migrationOccurred = true;
    }

    public resetBattlePathData(): void {
        this.battlePath = null;
        this.nightmareBattleSeeds = null;
        this.fixedBattleSeeds = null;
        this.selectedPath = "";
        this.currentPathPosition = 0;
        this.activeSkillTree = undefined;
        (this as any).tempSkillTreeNodes = undefined;
        (this as any).tempSkillTreeTransform = undefined;
        this.tempSkillTreeConfig = undefined;
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

    private isReplayMode(): boolean {
        return false;
    }

    setLocalStorageItem(key: string, value: any): void {
        if (this.isReplayMode()) {
            return;
        }
        try {
            localStorage.setItem(key, value);
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.error(`[STORAGE QUOTA] Failed to write key "${key}" (${typeof value === 'string' ? (value.length / 1024).toFixed(1) + 'KB' : 'unknown size'})`);
                this.emergencyStorageCleanup();
                localStorage.setItem(key, value);
            } else {
                throw e;
            }
        }
    }

    private emergencyStorageCleanup(): void {
        if (this.isReplayMode()) {
            return;
        }
        const username = loggedInUser?.username;
        if (!username) return;

        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key.startsWith('data_backup_') && key.endsWith(`_${username}`)) {
                const isCurrentVersion = key.includes(`VERSION_${INTERNAL_BACKUP_VERSION}_`);
                if (!isCurrentVersion) {
                    localStorage.removeItem(key);
                }
            }
        }
        if (this.estimateStorageUsageBytes() > GameData.IOS_PROACTIVE_CLEANUP_THRESHOLD_BYTES) {
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (!key) {
                    continue;
                }
                if (key.startsWith("data_backup_") && key.endsWith(`_${username}`)) {
                    localStorage.removeItem(key);
                }
            }
        }

        const activeSlotId = this.scene?.sessionSlotId ?? -1;
        for (let s = 0; s < 5; s++) {
            if (s === activeSlotId) continue;
            if (!isIPhone() && this.scene?.loadBattleFromMode === 0) continue;
            const [, battleKey] = this.getSessionKeys(s);
            if (localStorage.getItem(battleKey)) {
                localStorage.removeItem(battleKey);
            }
        }

        const runHistoryKey = `runHistoryData_${username}`;
        const runHistoryStr = localStorage.getItem(runHistoryKey);
        if (runHistoryStr && runHistoryStr.length > 50000) {
            try {
                const runHistory = JSON.parse(runHistoryStr);
                const timestamps = Object.keys(runHistory).map(Number).sort((a: number, b: number) => b - a);
                const keepCount = Math.min(timestamps.length, 5);
                for (let i = keepCount; i < timestamps.length; i++) {
                    delete runHistory[timestamps[i].toString()];
                }
                for (let i = 0; i < keepCount; i++) {
                    const entry = runHistory[timestamps[i].toString()]?.entry;
                    if (entry) {
                        delete entry.battlePath;
                        delete entry.nightmareBattleSeeds;
                        delete entry.fixedBattleSeeds;
                        delete entry.runEndSummaryRunData;
                    }
                }
                localStorage.setItem(runHistoryKey, JSON.stringify(runHistory));
            } catch (_) {}
        }
        const activeSlot = this.scene?.sessionSlotId ?? -1;
        if (activeSlot >= 0
            && (isIPhone() || this.scene?.loadBattleFromMode !== 0)
            && this.estimateStorageUsageBytes() > GameData.IOS_PROACTIVE_CLEANUP_THRESHOLD_BYTES) {
            const [, activeBattleKey] = this.getSessionKeys(activeSlot);
            localStorage.removeItem(activeBattleKey);
        }
    }
    public compactStoredData(): void {
        if (this.isReplayMode() || !loggedInUser?.username) {
            return;
        }
        this.purgeAllBackupKeys();
        if (this.scene?.loadBattleFromMode !== 0) {
            for (let s = 0; s < 5; s++) {
                const [, battleKey] = this.getSessionKeys(s);
                localStorage.removeItem(battleKey);
            }
        }
        if (this.estimateStorageUsageBytes() <= GameData.IOS_PROACTIVE_CLEANUP_THRESHOLD_BYTES) {
            return;
        }
        for (let s = 0; s < 5; s++) {
            this.compactSessionSlot(s);
        }
    }
    private compactSessionSlot(slotId: integer): void {
        const [primaryKey] = this.getSessionKeys(slotId);
        const existing = localStorage.getItem(primaryKey);
        if (!existing) {
            return;
        }
        try {
            const session = JSON.parse(decrypt(existing, bypassLogin));
            let changed = false;

            for (const layer of session?.battlePath?.layers ?? []) {
                for (const node of layer?.nodes ?? []) {
                    if (node?.previousConnections !== undefined) {
                        delete node.previousConnections;
                        changed = true;
                    }
                }
            }
            const runData = session?.runEndSummaryRunData;
            if (runData && isIPhone()) {
                for (const key of GameData.RUN_END_SUMMARY_KEYS) {
                    const arr = runData[key];
                    if (Array.isArray(arr) && arr.length > GameData.RUN_END_SUMMARY_MAX_ENTRIES) {
                        runData[key] = arr.slice(-GameData.RUN_END_SUMMARY_MAX_ENTRIES);
                        changed = true;
                    }
                }
            }

            if (!changed) {
                return;
            }
            const rewritten = encrypt(JSON.stringify(session), bypassLogin);

            if (rewritten.length < existing.length) {
                localStorage.setItem(primaryKey, rewritten);
                console.log(`[STORAGE] Compacted ${primaryKey}: ${(existing.length * 2 / 1024).toFixed(0)}KB -> ${(rewritten.length * 2 / 1024).toFixed(0)}KB`);
            }
        } catch (e) {

            console.warn(`[STORAGE] Compaction skipped for ${primaryKey}.`, e);
        }
    }

    getLocalStorageItem(key: string): any {
        return localStorage.getItem(key);
    }

    private shouldCreateVersionBackup(savedVersion: string): boolean {
        let versionToCheck = savedVersion;
        if (Overrides.FAKE_PREVIOUS_VERSION_OVERRIDE && VERSIONS_REQUIRING_BACKUP.length > 0) {
            versionToCheck = VERSIONS_REQUIRING_BACKUP[0];
        }

        if (!versionToCheck || !loggedInUser?.username) {
            return false;
        }

        if (!VERSIONS_REQUIRING_BACKUP.includes(versionToCheck)) {
            return false;
        }

        const currentVersion = this.getDisplayVersion();
        if (!currentVersion || versionToCheck === currentVersion) {
            return false;
        }

        const sanitizedVersion = versionToCheck.replace(/[^a-zA-Z0-9]/g, '_');
        const backupKey = `data_backup_${sanitizedVersion}_${loggedInUser.username}`;

        return localStorage.getItem(backupKey) === null;
    }

    private createVersionBackup(systemDataStr: string, savedVersion: string): void {
        if (this.isReplayMode()) {
            return;
        }
        const sanitizedVersion = savedVersion.replace(/[^a-zA-Z0-9]/g, '_');
        const backupKey = `data_backup_${sanitizedVersion}_${loggedInUser.username}`;

        const sessionDataArray: (string | null)[] = [];
        for (let slotId = 0; slotId < 5; slotId++) {
            const sessionDataStr = this.getLocalStorageItem(`sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`);
            sessionDataArray.push(sessionDataStr || null);
        }

        const combinedBackupData = {
            systemData: systemDataStr,
            sessionData: sessionDataArray
        };

        const backupData = {
            data: JSON.stringify(combinedBackupData),
            timestamp: Date.now(),
            version: savedVersion,
            isCombined: true
        };
        const serializedBackup = JSON.stringify(backupData);
        const projectedUsage = this.estimateStorageUsageBytes() + (backupKey.length + serializedBackup.length) * 2;
        if (projectedUsage > GameData.IOS_PROACTIVE_CLEANUP_THRESHOLD_BYTES) {
            console.warn(`[STORAGE] Skipping combined version backup - would use ${(projectedUsage / 1024 / 1024).toFixed(2)}MB, over budget.`);
            return;
        }
        try {
            localStorage.setItem(backupKey, serializedBackup);
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.error("Version backup failed: Storage quota exceeded.", e);
                return;
            }
            throw e;
        }
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
            gameVersion: this.getDisplayVersion(),
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
            defeatedSmittyFoes: this.defeatedSmittyFoes,
            uniSmittyUnlocks: this.uniSmittyUnlocks,
            modFormsUnlocked: this.modFormsUnlocked,
            smitomTalks: this.smitomTalks,
            smitomTutorialFlags: this.smitomTutorialFlags,
            lastSmitomReward: this.lastSmitomReward,
            lastLoadingSmitomReward: this.lastLoadingSmitomReward,
            lastSaveTime: this.lastSaveTime,
            lastBackupTime: this.lastBackupTime,
            lastBackupVersion: this.lastBackupVersion,
            rewardOverlayOpacity: this.rewardOverlayOpacity,
            testSpeciesForMod: this.testSpeciesForMod,
            testModsCount: this.testModsCount,
            isNewPlayer: this.isNewPlayer,
            selectedChampionId: this.selectedChampionId ?? null,
            championData: this.championData ?? null,
            pendingChampionLevelUps: this.pendingChampionLevelUps ?? null,
            championSkillVersion: this.championSkillVersion,
            settings: this.getSettingsSnapshot(),
            settingsGamepad: localStorage.hasOwnProperty("settingsGamepad")
                ? JSON.parse(this.getLocalStorageItem("settingsGamepad")!) : undefined,
            settingsKeyboard: localStorage.hasOwnProperty("settingsKeyboard")
                ? JSON.parse(this.getLocalStorageItem("settingsKeyboard")!) : undefined,
            mappingConfigs: localStorage.hasOwnProperty("mappingConfigs")
                ? JSON.parse(this.getLocalStorageItem("mappingConfigs")!) : undefined,
            commandStripUsageCounts: this.commandStripUsageCounts ?? {},
            commandStripRecentOrder: this.commandStripRecentOrder ?? [],
        };
    }

    public isFirstTimeFtlAutoStartEligible(): boolean {
        return this.gender !== PlayerGender.UNSET && this.gameStats.firstTimeFtlAutoStartComplete !== true;
    }

    public saveSystem(): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            if (this.isReplayMode()) {
                resolve(true);
                return;
            }
            if (!this.dataLoaded) {
                resolve(false);
                return;
            }
            try {
                this.scene.ui.savingIcon.show();
                const data = this.getSystemSaveData();

                const serializedData = this.serializeBigInt(data);

                if (!serializedData || serializedData === 'undefined' || serializedData === 'null') {
                    console.error('[SAVE ERROR] Serialization produced invalid data. Save aborted.');
                    alert('[SAVE ERROR] Serialization produced invalid data. Save aborted.');
                    resolve(false);
                    return;
                }

                this.setLocalStorageItem(`data_${loggedInUser?.username}`, encrypt(serializedData, bypassLogin));
                this.scene.ui.savingIcon.hide();
                resolve(true);
            } catch (error) {
                if (error instanceof DOMException && error.name === "QuotaExceededError") {
                    this.notifyQuotaError("System save", error);
                } else {
                    console.error('[SAVE ERROR]', error);
                    alert('[SAVE ERROR] ' + (error as Error).message);
                }
                resolve(false);
            }
        });
    }
    public async loadSystem(): Promise<boolean> {
        this.dataLoaded = false;

        try {
            if (bypassLogin && !this.getLocalStorageItem(`data_${loggedInUser?.username}`)) {
                this.updatePermaMoney(this.scene, 22500);
                this.dataLoaded = true;
                return false;
            }

            if (bypassLogin) {
                const systemDataStr = decrypt(this.getLocalStorageItem(`data_${loggedInUser?.username}`)!, bypassLogin);

                if (!systemDataStr || systemDataStr === 'null' || systemDataStr === 'undefined') {
                    console.error('[LOAD ERROR] System data is corrupted or missing');
                    alert('[LOAD ERROR] System data is corrupted or missing');
                    this.dataLoaded = true;
                    return false;
                }

                const sessionDataStrArray = [];
                for (let slotId = 0; slotId < 5; slotId++) {
                    const sessionDataStr = this.getLocalStorageItem(`sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`);
                    if (sessionDataStr) {
                        sessionDataStrArray.push(decrypt(sessionDataStr, bypassLogin));
                    } else {
                        sessionDataStrArray.push(null);
                    }
                }
                return await this.initSystemWithStr(systemDataStr, sessionDataStrArray);
            } else {
                this.dataLoaded = true;
                return false;
            }
        } catch (error) {
            console.error('[LOAD ERROR]', error);
            alert('[LOAD ERROR] ' + (error as Error).message);
            this.dataLoaded = true;
            return false;
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
                            dataStr = AES.decrypt(encryptedData.trim(), saveKey).toString(enc.Utf8);
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
                                    dataStr = AES.decrypt(encryptedData.trim(), altKey).toString(enc.Utf8);
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
                            const [primaryKey, battleKey] = this.getSessionKeys(i);
                            localStorage.removeItem(primaryKey);
                            localStorage.removeItem(battleKey);
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
            console.error('[LOAD ERROR] initSystemWithStr failed:', error);
            alert('[LOAD ERROR] initSystemWithStr failed: ' + (error as Error).message);
            return false;
        }
    }
    async initSystem(systemData: SystemSaveData, sessionData: SessionSaveData[]): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            try {
                this.dataLoaded = false;
                const isImportBoot = this.getLocalStorageItem("justImportedSave") === "true";
                if (isImportBoot) {
                    this.setLocalStorageItem("justImportedSave", "");
                }
                const maxIntAttrValue = 0x80000000;

                const lsItemKey = `runHistoryData_${loggedInUser?.username}`;
                const lsItem = this.getLocalStorageItem(lsItemKey);
                if (!lsItem) {
                    this.setLocalStorageItem(lsItemKey, "");
                }

                this.trainerId = systemData.trainerId;
                this.secretId = systemData.secretId;

                this.gender = systemData.gender;

                this.saveSetting(SettingKeys.Player_Gender, systemData.gender === PlayerGender.FEMALE ? 1 : 0);

                if (systemData.settings && Object.keys(systemData.settings).length) {
                    this.applySettingsFromSave(systemData.settings);
                }
                if (systemData.settingsGamepad) {
                    this.setLocalStorageItem("settingsGamepad", JSON.stringify(systemData.settingsGamepad));
                    this.loadGamepadSettings();
                }
                if (systemData.settingsKeyboard) {
                    const consoleKeys: (keyof typeof systemData.settingsKeyboard)[] = ["BUTTON_CONSOLE", "ALT_BUTTON_CONSOLE"];
                    for (const key of consoleKeys) {
                        if (systemData.settingsKeyboard[key] === Phaser.Input.Keyboard.KeyCodes.ALT) {
                            systemData.settingsKeyboard[key] = -1;
                        }
                    }
                    this.setLocalStorageItem("settingsKeyboard", JSON.stringify(systemData.settingsKeyboard));
                }
                if (systemData.mappingConfigs) {
                    for (const layout of Object.keys(systemData.mappingConfigs)) {
                        const custom = (systemData.mappingConfigs[layout] as any)?.custom;
                        if (!custom) {
                            continue;
                        }
                        if (custom.KEY_ALT === "BUTTON_CONSOLE" || custom.KEY_ALT === "ALT_BUTTON_CONSOLE") {
                            custom.KEY_ALT = -1;
                        }
                    }
                    this.setLocalStorageItem("mappingConfigs", JSON.stringify(systemData.mappingConfigs));
                    this.loadMappingConfigs();
                }

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
                    this.initStarterData();
                    const mergedStarterData = this.starterData as any;

                    for (const sd of Object.keys(systemData.starterData)) {
                        try {
                            mergedStarterData[sd] = {
                                ...(mergedStarterData[sd] || {}),
                                ...(systemData.starterData as any)[sd]
                            };
                        } catch (err) {
                        }
                    }

                    Object.keys(mergedStarterData).forEach(sd => {
                        try {
                            if (systemData.dexData[sd].caughtAttr && !mergedStarterData[sd].abilityAttr) {
                                mergedStarterData[sd].abilityAttr = 1;
                            }
                        }
                        catch (err) {
                        }
                    });

                    Object.keys(mergedStarterData).forEach(speciesId => {
                        if (!mergedStarterData[speciesId].obtainedFusions) {
                            mergedStarterData[speciesId].obtainedFusions = [];
                        }
                        if (!mergedStarterData[speciesId].fusionMovesets) {
                            mergedStarterData[speciesId].fusionMovesets = [];
                        }
                    });

                    systemData.starterData = mergedStarterData;
                    this.starterData = mergedStarterData;
                }
                    this.selectedChampionId = (systemData as any).selectedChampionId;

                    if (this.selectedChampionId === "apollo_diana" || !this.selectedChampionId) {
                        this.selectedChampionId = this.gender === PlayerGender.FEMALE ? "diana" : "apollo";
                    }

                    this.championData = (systemData as any).championData || {};
                    this.pendingChampionLevelUps = (systemData as any).pendingChampionLevelUps || {};
                    this.championSkillVersion = (systemData as any).championSkillVersion ?? ChampionSkillVersion.INITIAL;
                    this.ensureChampionDataIntegrity();
                    if (!this.activeSkillTree) {
                        const pendingSkillTreeStr = this.getLocalStorageItem(`activeSkillTree_${loggedInUser?.username}`);
                        if (pendingSkillTreeStr) {
                            try {
                                const decrypted = decrypt(pendingSkillTreeStr, bypassLogin);
                                const parsed = JSON.parse(decrypted);
                                this.activeSkillTree = this.deserializeActiveSkillTree(parsed);
                            } catch {}
                        }
                    }

                    this.migrateChampionSkillsIfNeeded((systemData as any).championSkillVersion);

                    if (this.championData) {
                        Object.keys(this.championData).forEach(id => {
                            this.applyChampionLevelUnlocks(id);
                            this.validateChampionGlitchForms(id);
                        });

                        const _adRec = (this.championData as any)?.['apollo_diana'];
                        const _apolloRec = (this.championData as any)?.['apollo'];
                        const _dianaRec = (this.championData as any)?.['diana'];
                        if (_adRec || _apolloRec || _dianaRec) {
                            const _mSig = [...new Set([
                                ...(_adRec?.unlockedSignaturePokemon || []),
                                ...(_apolloRec?.unlockedSignaturePokemon || []),
                                ...(_dianaRec?.unlockedSignaturePokemon || []),
                            ])];
                            const _mAlt = [...new Set([
                                ...(_adRec?.unlockedAltBuilds || []),
                                ...(_apolloRec?.unlockedAltBuilds || []),
                                ...(_dianaRec?.unlockedAltBuilds || []),
                            ])];
                            for (const _id of ['apollo', 'diana', 'apollo_diana'] as const) {
                                const _dst = ((this.championData as any)[_id] ||= {}) as any;
                                if (_mSig.length) _dst.unlockedSignaturePokemon = [..._mSig];
                                if (_mAlt.length) _dst.unlockedAltBuilds = [..._mAlt];
                            }
                        }
                    }

                if (systemData.gameStats) {
                    if (systemData.gameStats.legendaryPokemonCaught !== undefined && systemData.gameStats.subLegendaryPokemonCaught === undefined) {
                        this.fixLegendaryStats(systemData);
                    }
                    this.addNewStats(systemData);
                    this.gameStats = new GameStats(systemData.gameStats);
                }

                if (systemData.unlocks) {
                    for (const key of Object.keys(systemData.unlocks)) {
                        if (this.unlocks.hasOwnProperty(key)) {
                            this.unlocks[key] = systemData.unlocks[key];
                        }
                    }
                }

                if (systemData.defeatedRivals) {
                    this.defeatedRivals = systemData.defeatedRivals.filter(
                        (rival: number) => rival !== TrainerType.SMITTY
                    );
                }

                if (systemData.defeatedSmittyFoes) {
                    this.defeatedSmittyFoes = systemData.defeatedSmittyFoes;
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
                const defaultStarterAttr = DexAttr.NON_SHINY | DexAttr.MALE | DexAttr.DEFAULT_VARIANT | DexAttr.DEFAULT_FORM;
                for (const starterId of defaultStarterSpecies) {
                    const entry = this.dexData[starterId];
                    if (entry && !entry.caughtAttr) {
                        entry.seenAttr = defaultStarterAttr;
                        entry.caughtAttr = defaultStarterAttr;
                    }

                    const starterEntry = (this.starterData as any)?.[starterId];
                    if (starterEntry) {
                        starterEntry.abilityAttr = Number(starterEntry.abilityAttr) | AbilityAttr.ABILITY_1;
                    }
                }

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

                if (systemData.lastLoadingSmitomReward) {
                    this.lastLoadingSmitomReward = systemData.lastLoadingSmitomReward;
                }

                if (systemData.smitomTalks) {
                    this.smitomTalks = systemData.smitomTalks;
                }

                this.smitomTutorialFlags = systemData.smitomTutorialFlags || {};

                this.commandStripUsageCounts = systemData.commandStripUsageCounts ?? {};
                this.commandStripRecentOrder = systemData.commandStripRecentOrder
                    ?? Object.keys(this.commandStripUsageCounts)
                        .map(Number)
                        .sort((a, b) => (this.commandStripUsageCounts[b] || 0) - (this.commandStripUsageCounts[a] || 0));

                if (systemData.lastSaveTime) {
                    this.lastSaveTime = systemData.lastSaveTime;
                }

                if (systemData.lastBackupTime !== undefined) {
                    this.lastBackupTime = systemData.lastBackupTime;
                } else {
                    const totalSessionsPlayed = this.gameStats.sessionsPlayed;
                    if (totalSessionsPlayed >= 1) {
                        this.lastBackupTime = Date.now() - (7 * 24 * 60 * 60 * 1000);
                    } else {
                        this.lastBackupTime = Date.now();
                    }
                }

                if (systemData.lastBackupVersion !== undefined) {
                    this.lastBackupVersion = systemData.lastBackupVersion;
                } else {
                    this.lastBackupVersion = 0;
                }

                if (systemData.rewardOverlayOpacity) {
                    this.rewardOverlayOpacity = systemData.rewardOverlayOpacity;
                }

                if (systemData.testSpeciesForMod) {
                    this.testSpeciesForMod = systemData.testSpeciesForMod;
                }

                if (systemData.testModsCount) {
                    this.testModsCount = systemData.testModsCount;
                }

                this.isNewPlayer = systemData.isNewPlayer ?? false;

                this.updatePermaMoney(this.scene, systemData.permaMoney != undefined ? systemData.permaMoney : 10000);
                this.scene.ui?.updatePermaMoneyText(this.scene);

                this.permaModifiers = new PermaModifiers();

                if (systemData.permaModifiers) {
                    for (const modifierDataPlain of systemData.permaModifiers) {
                        try {
                            const modifierData = new PersistentModifierData(modifierDataPlain, true);
                            const modifier = modifierData.toModifier(this.scene, (Modifiers as any)[modifierData.className]);
                            if (modifier) {
                                this.permaModifiers.addModifier(this.scene, modifier);
                            } else {
                                console.error('[LOAD WARNING] Modifier returned null:', modifierData.className, modifierDataPlain);
                                alert('[LOAD WARNING] Modifier returned null: ' + modifierData.className);
                            }
                        } catch (modError) {
                            console.error('[LOAD WARNING] Failed to load modifier:', modifierDataPlain?.className, modError);
                            alert('[LOAD WARNING] Failed to load modifier: ' + modifierDataPlain?.className);
                        }
                    }
                }

                try {
                    const questModifiers = this.permaModifiers.findModifiers(m => m instanceof Modifiers.PermaRunQuestModifier) as any;
                    for (const modifier of questModifiers || []) {
                        if (typeof modifier?.reconcileGoalMetGameModeQuest === "function") {
                            modifier.reconcileGoalMetGameModeQuest(this.scene);
                        }
                    }
                } catch (e) {
                    console.warn("[LOAD WARNING] Quest completion reconciliation failed:", e);
                }

                let permaModifier = this.permaModifiers?.getModifiers().find((m: any) => m.constructor.name === 'PermaCollectedTypeModifier') as any;

                if (!permaModifier) {
                    const permaType = new PermaCollectedTypeModifierType();
                    permaModifier = new Modifiers.PermaCollectedTypeModifier(permaType);
                    this.permaModifiers.addModifier(this.scene, permaModifier, true);
                }

                if (Overrides.DEBUG_GRANT_ALL_ESSENCE) {
                    const targetAmountRaw = Overrides.DEBUG_GRANT_ALL_ESSENCE_AMOUNT ?? 1000;
                    const targetAmount = Math.max(0, Number(targetAmountRaw) || 0);
                    const typeKeys = Utils.getEnumKeys(Type);
                    for (const key of typeKeys) {
                        const typeValue = (Type as any)[key];
                        if (typeof typeValue !== "number") continue;
                        if (typeValue < Type.NORMAL) continue;
                        if (typeValue === Type.ALL) continue;
                        let current = 0;
                        try {
                            current = permaModifier.getTypeCount?.(typeValue) || (permaModifier.collectedTypes?.[typeValue] || 0);
                        } catch {
                            current = 0;
                        }
                        const missing = targetAmount - current;
                        if (missing > 0) {
                            try {
                                permaModifier.addCollected?.(typeValue, missing);
                            } catch {
                            }
                        }
                    }
                    try {
                        console.log("[DEBUG] Granted essence totals up to", targetAmount);
                    } catch {
                    }
                }
                this.scene.ui?.updatePermaModifierBar(this.permaModifiers);

                for (const questId in this.questUnlockables) {
                    const questUnlockData = this.questUnlockables[questId]?.questUnlockData;
                    if (questUnlockData && questUnlockData.rewardType === RewardType.NEW_MOVES_FOR_SPECIES) {
                        const speciesId = questUnlockData.rewardId;
                        if (this.getCompletedQuestForSpecies(speciesId, RewardType.NEW_MOVES_FOR_SPECIES)) {
                            this.addSpeciesQuestMoves(speciesId);
                        }
                    }
                }

                if (isImportBoot) {
                    this.gameStats.onboardingTutorialComplete = true;
                    this.gameStats.firstTimeFtlAutoStartComplete = true;
                    this.isNewPlayer = false;
                    this.tutorialOnboardActive = false;
                    this.tutorialBattleScript = null;
                    localStorage.setItem("wave35_stat_switchers_unlocked", "1");
                    localStorage.setItem("wave35_move_upgrades_unlocked", "1");
                    localStorage.setItem("wave35_release_items_unlocked", "1");
                    this.saveSetting(SettingKeys.Disable_Stat_Switchers, 0);
                    this.saveSetting(SettingKeys.Disable_Move_Upgrades, 0);
                    this.saveSetting(SettingKeys.Disable_Release_Items, 0);
                    this.smitomTutorialFlags["wave35_stat_switchers"] = true;
                    this.smitomTutorialFlags["wave35_move_upgrades"] = true;
                    this.smitomTutorialFlags["wave35_release_items"] = true;
                }

                this.dataLoaded = true;

                if (this.migrationOccurred) {
                    this.migrationOccurred = false;
                    await this.saveSystem();
                }

                resolve(true);
            } catch (err) {
                console.error('[LOAD ERROR] initSystem failed:', err);
                alert('[LOAD ERROR] initSystem failed: ' + (err as Error).message);
                resolve(false);
            }
        });
    }
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
    async saveRunHistory(scene: BattleScene, runEntry: SessionSaveData, isVictory: boolean): Promise<boolean> {
        const runHistoryData = await this.getRunHistoryData(scene);

        let timestamps = Object.keys(runHistoryData).map(Number);
        while (timestamps.length >= RUN_HISTORY_LIMIT) {
            const oldestTimestamp = (Math.min.apply(Math, timestamps)).toString();
            delete runHistoryData[oldestTimestamp];
            timestamps = Object.keys(runHistoryData).map(Number);
        }

        const timestamp = (runEntry.timestamp).toString();
        const trimmedEntry = { ...runEntry };
        delete (trimmedEntry as any).battlePath;
        delete (trimmedEntry as any).nightmareBattleSeeds;
        delete (trimmedEntry as any).fixedBattleSeeds;
        delete (trimmedEntry as any).runEndSummaryRunData;
        runHistoryData[timestamp] = {
            entry: trimmedEntry,
            isVictory: isVictory,
            isFavorite: false,
        };
        this.setLocalStorageItem(`runHistoryData_${loggedInUser?.username}`, encrypt(JSON.stringify(runHistoryData), bypassLogin));

        return true;
    }

    parseSystemData(dataStr: string): SystemSaveData {
        try {
        return JSON.parse(dataStr, (k: string, v: any) => {
            if (k === "gameStats") {
                try {
                    return new GameStats(v);
                } catch (gsError) {
                    console.error('[PARSE ERROR] Failed to parse game stats:', gsError);
                    alert('[PARSE ERROR] Failed to parse game stats');
                    return new GameStats({});
                }
            } else if (k === "eggs") {
                const ret: EggData[] = [];
                if (v === null) {
                    v = [];
                }
                for (const e of v) {
                    try {
                        ret.push(new EggData(e));
                    } catch (eggError) {
                    }
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

            if (k === "lastPermaShopRefreshTime" || k === "lastSmitomReward" || k === "lastLoadingSmitomReward" || k === "lastSaveTime" || k === "lastBackupTime" || k === "rewardOverlayOpacity" || k === "permaShopRerollCount" || k === "testModsCount") {
                return v as number;
            }

            if (k === "smitomTalks" || k === "testSpeciesForMod") {
                return v as number[];
            }

            if (k === "questUnlockables") {
                return this.parseQuestUnlockables(v);
            }

            if (k === "permaModifiers") {
                return v.map((modifierData: any) => {
                    try {
                        return new PersistentModifierData(modifierData, true);
                    } catch (pmError) {
                        console.error('[PARSE ERROR] Failed to parse perma modifier:', modifierData?.className, pmError);
                        alert('[PARSE ERROR] Failed to parse perma modifier: ' + modifierData?.className);
                        return null;
                    }
                }).filter(Boolean);
            }

            return k.endsWith("Attr") && !["natureAttr", "abilityAttr", "passiveAttr"].includes(k) ? BigInt(v) : v;
        }) as SystemSaveData;
        } catch (error) {
            console.error('[PARSE ERROR] System data parsing failed:', error);
            alert('[PARSE ERROR] System data parsing failed: ' + (error as Error).message);
            throw error;
        }
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
        if (this.isReplayMode()) {
            return;
        }
        localStorage.removeItem(`data_${loggedInUser?.username}`);
        for (let s = 0; s < 5; s++) {
            const [primaryKey, battleKey] = this.getSessionKeys(s);
            localStorage.removeItem(primaryKey);
            localStorage.removeItem(battleKey);
        }
    }
    public saveSetting(setting: string, valueIndex: integer): boolean {
        let settings: object = {};
        if (localStorage.hasOwnProperty("settings")) {
            settings = JSON.parse(this.getLocalStorageItem("settings")!);
        }

        setSetting(this.scene, setting, valueIndex);
        if (Overrides.DEBUG_SAVE_TRACE && setting === SettingKeys.Auto_Save) {
            console.debug("[SAVE_TRACE] saveSetting AUTO_SAVE", { valueIndex, sceneAutoSaveMode: this.scene.autoSaveMode });
        }

        settings[setting] = valueIndex;

        this.setLocalStorageItem("settings", JSON.stringify(settings));

        return true;
    }

    private getSettingsSnapshot(): Record<string, number> {
        if (!localStorage.hasOwnProperty("settings")) return {};
        try { return JSON.parse(this.getLocalStorageItem("settings")!); }
        catch { return {}; }
    }

    public applySettingsFromSave(saved: Record<string, number>): void {
        const current = this.getSettingsSnapshot();
        const merged = { ...current, ...saved };
        this.setLocalStorageItem("settings", JSON.stringify(merged));
        for (const key of Object.keys(saved)) {
            if (key === "__schemaVersion") continue;
            setSetting(this.scene, key, saved[key]);
        }
    }
    public saveMappingConfigs(deviceName: string, config): boolean {
        const key = deviceName.toLowerCase();
        let mappingConfigs: object = {};
        if (localStorage.hasOwnProperty("mappingConfigs")) {
            mappingConfigs = JSON.parse(this.getLocalStorageItem("mappingConfigs")!);
        }
        if (!mappingConfigs[key]) {
            mappingConfigs[key] = {};
        }
        mappingConfigs[key].custom = config.custom;
        this.setLocalStorageItem("mappingConfigs", JSON.stringify(mappingConfigs));
        return true;
    }
    public loadMappingConfigs(): boolean {
        if (!localStorage.hasOwnProperty("mappingConfigs")) {
            return false;
        }

        const mappingConfigs = JSON.parse(this.getLocalStorageItem("mappingConfigs")!);

        for (const key of Object.keys(mappingConfigs)) {
            const config = mappingConfigs[key];
            this.scene.inputController.injectConfig(key, config);
        }

        return true;
    }

    public resetMappingToFactory(): boolean {
        if (this.isReplayMode()) {
            return false;
        }
        if (!localStorage.hasOwnProperty("mappingConfigs")) {
            return false;
        }
        localStorage.removeItem("mappingConfigs");
        this.scene.inputController.resetConfigs();
        return true;
    }
    public saveControlSetting(device: Device, localStoragePropertyName: string, setting: SettingGamepad | SettingKeyboard, settingDefaults, valueIndex: integer): boolean {
        let settingsControls: object = {};

        if (localStorage.hasOwnProperty(localStoragePropertyName)) {
            settingsControls = JSON.parse(this.getLocalStorageItem(localStoragePropertyName)!);
        }

        if (device === Device.GAMEPAD) {
            setSettingGamepad(this.scene, setting as SettingGamepad, valueIndex);
        } else if (device === Device.KEYBOARD) {
            setSettingKeyboard(this.scene, setting as SettingKeyboard, valueIndex);
        }

        Object.keys(settingDefaults).forEach(s => {
            if (s === setting) {
                settingsControls[s] = valueIndex;
            }
        });

        this.setLocalStorageItem(localStoragePropertyName, JSON.stringify(settingsControls));

        return true;
    }
    private loadSettings(): boolean {
        resetSettings(this.scene);

        if (!localStorage.hasOwnProperty("settings")) {
            this.saveSetting(SettingKeys.Modifier_Tooltips, 0);
            return false;
        }

        const settings = JSON.parse(this.getLocalStorageItem("settings")!);
        const schemaKey = "__schemaVersion";
        const targetSchemaVersion = 1;
        const schemaVersion = typeof settings?.[schemaKey] === "number" ? settings[schemaKey] : 0;

        if (schemaVersion < targetSchemaVersion) {
            const legacySpeedOptions = ["1x", "1.5x", "2x", "2.5x", "3x", "3.5x", "4x", "5x", "6x", "7x", "8x", "9x", "10x"];
            const newSpeedOptions = ["1x", "3x", "6x", "10x", "12x", "15x", "20x"];

            const legacyIdx = settings?.[SettingKeys.Game_Speed];
            if (Number.isInteger(legacyIdx) && legacyIdx >= 0 && legacyIdx < legacySpeedOptions.length) {
                const legacyValue = legacySpeedOptions[legacyIdx];
                let mappedIdx = newSpeedOptions.indexOf(legacyValue);

                if (mappedIdx < 0) {

                    const legacyNum = parseFloat(legacyValue.replace("x", ""));
                    let bestIdx = 0;
                    let bestDiff = Number.POSITIVE_INFINITY;
                    for (let i = 0; i < newSpeedOptions.length; i++) {
                        const num = parseFloat(newSpeedOptions[i].replace("x", ""));
                        const diff = Math.abs(num - legacyNum);
                        const bestNum = parseFloat(newSpeedOptions[bestIdx].replace("x", ""));
                        if (diff < bestDiff || (diff === bestDiff && num < bestNum)) {
                            bestIdx = i;
                            bestDiff = diff;
                        }
                    }
                    mappedIdx = bestIdx;
                }

                settings[SettingKeys.Game_Speed] = mappedIdx;
            }

            settings[schemaKey] = targetSchemaVersion;
            this.setLocalStorageItem("settings", JSON.stringify(settings));
        }

        for (const setting of Object.keys(settings)) {
            setSetting(this.scene, setting, settings[setting]);
        }

        if (settings[SettingKeys.Disable_Stat_Switchers] === 0 && localStorage.getItem("wave35_stat_switchers_unlocked") !== "1") {
            localStorage.setItem("wave35_stat_switchers_unlocked", "1");
        }
        if (settings[SettingKeys.Disable_Move_Upgrades] === 0 && localStorage.getItem("wave35_move_upgrades_unlocked") !== "1") {
            localStorage.setItem("wave35_move_upgrades_unlocked", "1");
        }
        if (settings[SettingKeys.Disable_Release_Items] === 0 && localStorage.getItem("wave35_release_items_unlocked") !== "1") {
            localStorage.setItem("wave35_release_items_unlocked", "1");
        }

        if (Overrides.DEBUG_SAVE_TRACE) {
            console.debug("[SAVE_TRACE] loadSettings applied", { storedAutoSave: settings?.[SettingKeys.Auto_Save], sceneAutoSaveMode: this.scene.autoSaveMode });
        }

        return true;
    }

    private loadGamepadSettings(): boolean {
        Object.values(SettingGamepad).map(setting => setting as SettingGamepad).forEach(setting => setSettingGamepad(this.scene, setting, settingGamepadDefaults[setting]));

        if (!localStorage.hasOwnProperty("settingsGamepad")) {
            return false;
        }
        const settingsGamepad = JSON.parse(this.getLocalStorageItem("settingsGamepad")!);

        for (const setting of Object.keys(settingsGamepad)) {
            setSettingGamepad(this.scene, setting as SettingGamepad, settingsGamepad[setting]);
        }

        return true;
    }

    public saveTutorialFlag(tutorial: Tutorial, flag: boolean): boolean {
        const key = getDataTypeKey(GameDataType.TUTORIALS);
        let tutorials: object = {};
        if (localStorage.hasOwnProperty(key)) {
            tutorials = JSON.parse(this.getLocalStorageItem(key)!);
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

        const tutorials = JSON.parse(this.getLocalStorageItem(key)!);

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

        const dialogues = JSON.parse(this.getLocalStorageItem(key)!);

        for (const dialogue of Object.keys(dialogues)) {
            ret[dialogue] = dialogues[dialogue];
        }

        return ret;
    }
    private stripRegeneratedBattlePathConfigs(battlePath: any): any {
        if (!battlePath?.layers) {
            return battlePath;
        }
        const REGENERATED_NODE_TYPES = new Set<PathNodeType>([
            PathNodeType.RIVAL_BATTLE,
            PathNodeType.MAJOR_BOSS_BATTLE,
            PathNodeType.RECOVERY_BOSS,
            PathNodeType.EVIL_BOSS_BATTLE,
            PathNodeType.ELITE_FOUR,
            PathNodeType.CHAMPION,
            PathNodeType.SMITTY_BATTLE,
            PathNodeType.EVIL_GRUNT_BATTLE,
            PathNodeType.EVIL_ADMIN_BATTLE,
            PathNodeType.CHALLENGE_BOSS,
            PathNodeType.CHALLENGE_RIVAL,
            PathNodeType.CHALLENGE_EVIL_BOSS,
            PathNodeType.CHALLENGE_CHAMPION,
        ]);
        return {
            ...battlePath,
            layers: battlePath.layers.map((layer: any) => ({
                ...layer,
                nodes: (layer.nodes || []).map((node: any) =>
                    REGENERATED_NODE_TYPES.has(node.nodeType)
                        ? { ...node, battleConfig: undefined, previousConnections: undefined }
                        : { ...node, previousConnections: undefined }
                ),
            })),
        };
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
            typeBallCounts: scene.typeBallCounts,
            money: scene.money,
            score: scene.score,
            waveIndex: scene.currentBattle?.waveIndex ?? 0,
            battleType: scene.currentBattle?.battleType ?? "",
            trainer: scene.currentBattle?.battleType === BattleType.TRAINER ? new TrainerData(scene.currentBattle.trainer) : null,
            battleStarted: !!scene.getParty()[0]?.isOnField() && !!scene.getEnemyParty()[0]?.isOnField(),
            battleTurn: scene.currentBattle?.turn ?? 0,
            encounterInitComplete: !!scene.encounterInitComplete,
            gameVersion: this.getDisplayVersion(),
            timestamp: new Date().getTime(),
            challenges: scene.gameMode.challenges.map(c => new ChallengeData(c)),
            playerRival: this.playerRival,
            chaosAltRivals: this.chaosAltRivals,
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
            battlePath: this.stripRegeneratedBattlePathConfigs(this.battlePath),
            selectedPath: this.selectedPath,
            battlePathWave: scene.battlePathWave,
            lastBattleNodeWave: scene.lastBattleNodeWave,
            dynamicMode: scene.dynamicMode,
            hasSeenCurrentShopItems: scene.gameData.hasSeenCurrentShopItems,
            rivalWave: scene.rivalWave,
            gameMechanicTracking: scene.gameMechanicTracking,
            activeSkillTree: this.activeSkillTree ? this.serializeActiveSkillTree() : undefined,
            moveUpgradesEnabledForRun: scene.moveUpgradesEnabledForRun,
            statSwitchersEnabledForRun: scene.statSwitchersEnabledForRun,
            releaseItemsEnabledForRun: scene.releaseItemsEnabledForRun,
            ivScannerEnabledForRun: scene.ivScannerEnabledForRun,
            mapEnabledForRun: scene.mapEnabledForRun,
            skillTreeEnabledForRun: scene.skillTreeEnabledForRun,
            pendingSkillTreeAutoOpen: this.pendingSkillTreeAutoOpen ?? false,
            skillTreeAutoOpenConsumed: this.skillTreeAutoOpenConsumed ?? false,
            wave35UnlockedThisRun: scene.wave35UnlockedThisRun,
            runEndSummaryRunData: scene.runEndSummaryRunData,
        } as SessionSaveData;
    }
    public getSessionSavedData(scene: BattleScene, slotId: integer): SessionSaveData {
          const sessionDataStr = this.getLocalStorageItem(`sessionData${slotId ? slotId : ""}_${loggedInUser?.username}`);
          return JSON.parse(sessionDataStr);
    }

    private serializeActiveSkillTree(): ActiveSkillTreeDataSerialized | undefined {
        if (!this.activeSkillTree) return undefined;
        return {
            championId: this.activeSkillTree.championId,
            runtimeType1: this.activeSkillTree.runtimeType1,
            runtimeType2: this.activeSkillTree.runtimeType2,
            treeLevel: this.activeSkillTree.treeLevel,
            maxVisibleDepth: this.activeSkillTree.maxVisibleDepth,
            depth1BountyPresent: this.activeSkillTree.depth1BountyPresent ?? false,
            unlockedNodes: Array.from(this.activeSkillTree.unlockedNodes),
            skillEffects: Object.fromEntries(this.activeSkillTree.skillEffects),
            seed: this.activeSkillTree.seed,
            selectedPokemon: this.activeSkillTree.selectedPokemon,
            selectedPokemonPicks: this.activeSkillTree.selectedPokemonPicks,
            unlockedGlitchForms: this.activeSkillTree.unlockedGlitchForms,
            sessionQuestUnlockables: this.activeSkillTree.sessionQuestUnlockables as any,
            sessionModFormsUnlocked: this.activeSkillTree.sessionModFormsUnlocked,
            sessionUniSmittyUnlocks: this.activeSkillTree.sessionUniSmittyUnlocks,
            unlockedBranches: this.activeSkillTree.unlockedBranches ? Array.from(this.activeSkillTree.unlockedBranches) : [],
            skillPoints: this.activeSkillTree.skillPoints,
            tokens: this.activeSkillTree.tokens,
            starterPokemon: this.activeSkillTree.starterPokemon,
            catchRateBonusByType: this.activeSkillTree.catchRateBonusByType as any,
            reviveChanceByType: this.activeSkillTree.reviveChanceByType,
            reviveChanceBySpecies: this.activeSkillTree.reviveChanceBySpecies,
            essenceTypeWeights: this.activeSkillTree.essenceTypeWeights as any,
            fusionPriorityChanceByType: this.activeSkillTree.fusionPriorityChanceByType,
            fusionPriorityChanceBySpecies: this.activeSkillTree.fusionPriorityChanceBySpecies,
            legendaryEncounterChanceBySpecies: this.activeSkillTree.legendaryEncounterChanceBySpecies
        };
    }

    private deserializeActiveSkillTree(data: ActiveSkillTreeDataSerialized): ActiveSkillTreeData {
        const isRedMigration = data.championId === "red";
        return {
            championId: data.championId,
            runtimeType1: isRedMigration ? undefined : data.runtimeType1,
            runtimeType2: isRedMigration ? undefined : data.runtimeType2,
            treeLevel: data.treeLevel,
            maxVisibleDepth: data.maxVisibleDepth,
            depth1BountyPresent: data.depth1BountyPresent ?? false,
            unlockedNodes: new Set(data.unlockedNodes || []),
            skillEffects: new Map(Object.entries(data.skillEffects || {})),
            seed: data.seed,
            selectedPokemon: data.selectedPokemon || {},
            selectedPokemonPicks: data.selectedPokemonPicks,
            unlockedGlitchForms: data.unlockedGlitchForms || [],
            sessionQuestUnlockables: (data as any).sessionQuestUnlockables || undefined,
            sessionModFormsUnlocked: Array.isArray((data as any).sessionModFormsUnlocked) ? (data as any).sessionModFormsUnlocked : [],
            sessionUniSmittyUnlocks: Array.isArray((data as any).sessionUniSmittyUnlocks) ? (data as any).sessionUniSmittyUnlocks : [],
            unlockedBranches: new Set(data.unlockedBranches || []),
            skillPoints: data.skillPoints,
            tokens: data.tokens,
            starterPokemon: data.starterPokemon,
            catchRateBonusByType: data.catchRateBonusByType as any,
            reviveChanceByType: data.reviveChanceByType || {},
            reviveChanceBySpecies: data.reviveChanceBySpecies || {},
            essenceTypeWeights: data.essenceTypeWeights as any,
            fusionPriorityChanceByType: data.fusionPriorityChanceByType || {},
            fusionPriorityChanceBySpecies: data.fusionPriorityChanceBySpecies || {},
            legendaryEncounterChanceBySpecies: data.legendaryEncounterChanceBySpecies || {}
        };
    }

    public ensureActiveSkillTreeOnLegacyLoad(scene: BattleScene): void {
        const mechanicsVersion = scene.gameMechanicTracking?.[GameMechanicsID.CHAMPION_MODE] ?? GameMechanicsVersion.PRE_CHAMPION;
        if (!this.activeSkillTree && mechanicsVersion === GameMechanicsVersion.PRE_CHAMPION) {
            const championId = this.selectedChampionId || (this.gender === PlayerGender.FEMALE ? "diana" : "apollo");
            this.initializeSkillTree(championId);
        }
    }

    public initializeSkillTree(championId: string): ActiveSkillTreeData {
        if (championId === "apollo_diana") {
            championId = this.gender === PlayerGender.FEMALE ? "diana" : "apollo";
        }

        let runtimeType1: Type | undefined;
        let runtimeType2: Type | undefined;

        if (championId === "apollo" || championId === "diana") {
            const allTypes = Object.values(Type).filter(t =>
                typeof t === 'number' &&
                t >= Type.NORMAL &&
                t <= Type.FAIRY
            ) as Type[];

            const shuffled = Utils.randSeedShuffle([...allTypes]);
            runtimeType1 = shuffled[0];
            runtimeType2 = shuffled.find(t => t !== runtimeType1) ?? shuffled[1];
        }

        this.activeSkillTree = {
            championId,
            runtimeType1,
            runtimeType2,
            treeLevel: 999,
            maxVisibleDepth: 2,
            unlockedNodes: new Set(["root_0"]),
            skillEffects: new Map(),
            seed: this.scene.seed,
            selectedPokemon: {},
            unlockedGlitchForms: [],
            unlockedBranches: new Set(),
            skillPoints: Overrides.SKILL_TREE_DEFAULT_SKILL_POINTS_OVERRIDE ?? 6,
            tokens: 0,
            catchRateBonusByType: {},
            reviveChanceByType: {},
            reviveChanceBySpecies: {},
            essenceTypeWeights: {},
            fusionPriorityChanceByType: {},
            fusionPriorityChanceBySpecies: {},
            legendaryEncounterChanceBySpecies: {}
        };
        return this.activeSkillTree;
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

                    const migratedGameMode = this.migrateGameMode(_sessionData);
                    scene.gameMode = getGameMode(migratedGameMode, scene);
                    if (_sessionData.challenges) {
                        scene.gameMode.challenges = _sessionData.challenges.map(c => c.toChallenge());
                    }

                    scene.setSeed(_sessionData.seed || scene.game.config.seed[0]);
                    scene.resetSeed();

                    scene.moveUpgradesEnabledForRun = _sessionData.moveUpgradesEnabledForRun !== undefined
                        ? _sessionData.moveUpgradesEnabledForRun
                        : true;

                    scene.statSwitchersEnabledForRun = _sessionData.statSwitchersEnabledForRun !== undefined
                        ? _sessionData.statSwitchersEnabledForRun
                        : true;

                    scene.releaseItemsEnabledForRun = _sessionData.releaseItemsEnabledForRun !== undefined
                        ? _sessionData.releaseItemsEnabledForRun
                        : true;

                    scene.ivScannerEnabledForRun = _sessionData.ivScannerEnabledForRun !== undefined
                        ? _sessionData.ivScannerEnabledForRun
                        : true;

                    scene.mapEnabledForRun = _sessionData.mapEnabledForRun !== undefined
                        ? _sessionData.mapEnabledForRun
                        : true;

                    scene.skillTreeEnabledForRun = _sessionData.skillTreeEnabledForRun !== undefined
                        ? _sessionData.skillTreeEnabledForRun
                        : true;

                    scene.wave35UnlockedThisRun = _sessionData.wave35UnlockedThisRun !== undefined
                        ? _sessionData.wave35UnlockedThisRun
                        : false;

                    scene.resetRunEndSummaryRunData();
                    if (_sessionData.runEndSummaryRunData) {
                        scene.runEndSummaryRunData = { ...scene.runEndSummaryRunData, ..._sessionData.runEndSummaryRunData };
                        scene.trimRunEndSummaryRunData();
                    }

                    scene.sessionPlayTime = _sessionData.playTime || 0;
                    scene.lastSavePlayTime = 0;

                    scene.majorBossWave = _sessionData.majorBossWave || 0;
                    this.nightmareBattleSeeds = _sessionData.nightmareBattleSeeds || null;
                    this.fixedBattleSeeds = _sessionData.fixedBattleSeeds || null;
                    this.sacrificeToggleOn = _sessionData.sacrificeToggleOn || false;
                    this.moveUsageCount = _sessionData.moveUsageCount || {};
                    this.pendingMoveUpgrades = _sessionData.pendingMoveUpgrades || -1;
                    this.pendingSkillTreeAutoOpen = _sessionData.pendingSkillTreeAutoOpen ?? false;
                    this.skillTreeAutoOpenConsumed = false;
                    this.preargsForShop = _sessionData.preargsForShop || {};
                    this.biomeChange = _sessionData.biomeChange || BiomeChange.NONE;
                    this.recoveryBossMode = _sessionData.recoveryBossMode || RecoveryBossMode.NONE;
                    scene.recoveryBossMode = _sessionData.recoveryBossMode || RecoveryBossMode.NONE;
                    scene.pathNodeContext = _sessionData.pathNodeContext === undefined || _sessionData.pathNodeContext === null ? null : _sessionData.pathNodeContext;
                    scene.selectedNodeType = _sessionData.selectedNodeType === undefined || _sessionData.selectedNodeType === null ? null : _sessionData.selectedNodeType;
                    this.battlePath = _sessionData.battlePath || null;
                    scene.gameMechanicTracking = _sessionData.gameMechanicTracking || {
                        [GameMechanicsID.CHAOS_MODE]: GameMechanicsVersion.CHAOS_V1,
                        [GameMechanicsID.COLLECTED_TYPE_MODIFIER]: GameMechanicsVersion.COLLECTED_TYPE_MODIFIER_V1,
                        [GameMechanicsID.CHAMPION_MODE]: GameMechanicsVersion.PRE_CHAMPION
                    };

                    const { setCurrentBattlePath, reconstructBattlePathFromLayers, regenerateSpecialNodeProperties } = await import("../battle");
                    if (this.battlePath) {
                        const reconstructedBattlePath = reconstructBattlePathFromLayers(this.battlePath);
                        regenerateSpecialNodeProperties(scene, reconstructedBattlePath);
                        this.battlePath = reconstructedBattlePath;
                        setCurrentBattlePath(reconstructedBattlePath);
                    } else {
                        setCurrentBattlePath(null);
                    }
                    this.compactStoredData();

                    this.selectedPath = Overrides.STARTING_SELECTED_PATH_OVERRIDE || _sessionData.selectedPath || "";
                    scene.battlePathWave = Overrides.STARTING_BATTLE_PATH_WAVE_OVERRIDE || _sessionData.battlePathWave || 1;
                    scene.lastBattleNodeWave = _sessionData.lastBattleNodeWave || 0;
                    scene.dynamicMode = _sessionData.dynamicMode || undefined;
                    scene.gameData.hasSeenCurrentShopItems = _sessionData.hasSeenCurrentShopItems || false;
                    scene.rivalWave = _sessionData.rivalWave || 0;
                    const loadPokemonAssets: Promise<void>[] = [];

                    let waveDebug = _sessionData.waveIndex;
                    const party = scene.getParty();
                    const seenIds = new Set<number>();
                    for (const p of _sessionData.party) {
                        if (seenIds.has(p.id) || party.length >= 6) continue;
                        seenIds.add(p.id);
                        const pokemon = p.toPokemon(scene) as PlayerPokemon;
                        pokemon.setVisible(false);
                        loadPokemonAssets.push(pokemon.loadAssets());
                        party.push(pokemon);
                    }

                    for (const pokemon of party) {
                        pokemon.randomRankUpBandPending = null;
                    }

                    Object.keys(scene.pokeballCounts).forEach((key: string) => {
                        scene.pokeballCounts[key] = _sessionData.pokeballCounts[key] || 0;
                    });
                    if (Overrides.POKEBALL_OVERRIDE.active) {
                        scene.pokeballCounts = { ...Overrides.POKEBALL_OVERRIDE.pokeballs };
                    }

                    scene.typeBallCounts = _sessionData.typeBallCounts || {};
                    if (!_sessionData.typeBallCounts) {
                        const championData = getActiveChampionData(scene);
                        if (championData) {
                            const oldCount1 = scene.pokeballCounts[6] || 0;
                            const oldCount2 = scene.pokeballCounts[7] || 0;
                            if (oldCount1 > 0 && championData.type1 !== undefined) {
                                scene.typeBallCounts[championData.type1] = (scene.typeBallCounts[championData.type1] || 0) + oldCount1;
                            }
                            if (oldCount2 > 0 && championData.type2 !== undefined) {
                                scene.typeBallCounts[championData.type2] = (scene.typeBallCounts[championData.type2] || 0) + oldCount2;
                            }
                        }
                        delete scene.pokeballCounts[6];
                        delete scene.pokeballCounts[7];
                    }
                    if (Overrides.TYPE_BALL_OVERRIDE?.active) {
                        scene.typeBallCounts = { ...Overrides.TYPE_BALL_OVERRIDE.typeBalls };
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
                    scene.encounterInitComplete = !!_sessionData.encounterInitComplete;
                    if (_sessionData.encounterInitComplete !== undefined) {
                        this.resumeInBattle = !!_sessionData.encounterInitComplete;
                    } else {
                        this.resumeInBattle = !!_sessionData.battleStarted;
                        if (_sessionData.battleStarted === undefined && typeof _sessionData.battleTurn === "number" && _sessionData.battleTurn > 0) {
                            this.resumeInBattle = true;
                        }
                        scene.encounterInitComplete = this.resumeInBattle;
                    }
                    if (typeof _sessionData.battleTurn === "number" && _sessionData.battleTurn > 0) {
                        battle.turn = _sessionData.battleTurn;
                    }
                    if (Overrides.DEBUG_SAVE_TRACE) {
                        console.debug("[SAVE_TRACE] loadSession decision", {
                            slotId,
                            autoSaveMode: scene.autoSaveMode,
                            battleTurn: _sessionData.battleTurn,
                            battleStarted: _sessionData.battleStarted,
                            encounterInitComplete: _sessionData.encounterInitComplete,
                            derivedResumeInBattle: this.resumeInBattle
                        });
                    }

                    battle.enemyLevels = _sessionData.enemyParty.map(p => p.level);

                        scene.arena.init();

                        if(_sessionData.trainer?.trainerType === TrainerType.SMITTY) {
                            const isInBattlePathSelection = (scene.battlePathWave > waveDebug);

                            if (isInBattlePathSelection) {
                                battle.enemyParty = [];
                            } else if (_sessionData.enemyParty?.length > 0) {
                                _sessionData.enemyParty.forEach((enemyData, e) => {
                                    if (enemyData.universalSmittyForm != null) {
                                        const enemyPokemon = enemyData.toPokemon(scene, battleType, e, _sessionData.trainer?.variant === TrainerVariant.DOUBLE) as EnemyPokemon;
                                        battle.enemyParty[e] = enemyPokemon;
                                        loadPokemonAssets.push(enemyPokemon.loadAssets());
                                    } else {
                                        battle.enemyParty[e] = battle.trainer?.genPartyMember(e)!;
                                        loadPokemonAssets.push(battle.enemyParty[e].loadAssets());
                                    }
                                });
                            } else {
                                battle.enemyLevels?.forEach((level, e) => {
                                    battle.enemyParty[e] = battle.trainer?.genPartyMember(e)!;
                                    loadPokemonAssets.push(battle.enemyParty[e].loadAssets());
                                });
                            }
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
                    scene.arena.eventTarget.dispatchEvent(new WeatherChangedEvent(WeatherType.NONE, scene.arena.weather?.weatherType!, scene.arena.weather?.turnsLeft!));

                    scene.arena.terrain = _sessionData.arena.terrain;
                    scene.arena.eventTarget.dispatchEvent(new TerrainChangedEvent(TerrainType.NONE, scene.arena.terrain?.terrainType!, scene.arena.terrain?.turnsLeft!));

                    if (_sessionData.arena.tags) {
                        scene.arena.tags = _sessionData.arena.tags;
                    }

                    const loaded: PersistentModifier[] = [];
                    for (const modifierData of _sessionData.modifiers) {
                        const modifier = modifierData.toModifier(scene, (Modifiers as any)[modifierData.className]);
                        if (modifier) {
                            loaded.push(modifier);
                        }
                    }

                    try {
                        const altBuildModule = await import("../data/pokemon-alt-buid");

                        for (const pokemon of scene.getParty()) {
                            if (!pokemon?.altBuildId) {
                                continue;
                            }
                            const hasAltBuildModifier = loaded.some(
                                m => m instanceof Modifiers.PokemonAltBuildModifier && m.pokemonId === pokemon.id
                            );
                            if (hasAltBuildModifier) {
                                continue;
                            }
                            const def = altBuildModule.POKEMON_ALT_BUILDS[pokemon.altBuildId];
                            if (!def) {
                                continue;
                            }
                            const rank = (pokemon as any).altBuildRank ?? def.rank ?? 1;
                            const modType = new PokemonAltBuildModifierType(def, rank);
                            modType.id = "POKEMON_ALT_BUILD";
                            const modifier = modType.newModifier(pokemon);
                            if (modifier) {
                                loaded.push(modifier as any);
                            }
                        }
                    } catch {}

                    const late: PersistentModifier[] = loaded.filter(m => m instanceof Modifiers.TypeSwitcherModifier);
                    const lateSet = new Set<PersistentModifier>(late);
                    const early = loaded.filter(m => !lateSet.has(m));

                    for (const m of early) {
                        scene.addModifier(m, true);
                    }

                    for (const m of late) {
                        scene.addModifier(m, true);
                    }

                    scene.updateModifiers(true);

                    scene.consolidateCollectedTypeModifiers();

                    for (const enemyModifierData of _sessionData.enemyModifiers) {
                        const modifier = enemyModifierData.toModifier(scene, (Modifiers as any)[enemyModifierData.className]);
                        if (modifier) {
                            scene.addEnemyModifier(modifier, true);
                        }
                    }

                    scene.updateModifiers(false);
                    const mbhTypeId = getModifierType(modifierTypes.MINI_BLACK_HOLE).id;
                    scene.getEnemyParty().forEach(enemy => {
                        if (!enemy) return;
                        if ((enemy as any).is2ndStageBoss) return;
                        const hasMBH = !!scene.findModifiers(
                            m => m instanceof TurnHeldItemTransferModifier && m.pokemonId === enemy.id && m.type.id === mbhTypeId,
                            false
                        ).length;
                        if (hasMBH) {
                            (enemy as EnemyPokemon).is2ndStageBoss = true;
                        }
                    });
                    this.playerRival = _sessionData.playerRival || null;
                    if (_sessionData.activeSkillTree) {
                        this.activeSkillTree = this.deserializeActiveSkillTree(_sessionData.activeSkillTree);
                        if (this.activeSkillTree?.championId && !this.selectedChampionId) {
                            let syncId = this.activeSkillTree.championId;
                            if (syncId === "apollo_diana") {
                                syncId = this.gender === PlayerGender.FEMALE ? "diana" : "apollo";
                            }
                            this.selectedChampionId = syncId;
                        }
                    } else {
                        this.activeSkillTree = undefined;
                    }
                    this.ensureActiveSkillTreeOnLegacyLoad(scene);
                    ensureSkillTreeTokenTracker(scene);
                    this.chaosAltRivals = _sessionData.chaosAltRivals || []
                    this.sessionQuestModifierData = _sessionData.sessionQuestModifierData || {};
                    this.activeConsoleCodeQuests = _sessionData.activeConsoleCodeQuests || [];

                    if (battle?.trainer && battleType === BattleType.TRAINER) {
                        loadPokemonAssets.push(battle.trainer.loadAssets().then(() => battle.trainer.initSprite()));
                    }

                    await Promise.all(loadPokemonAssets);
                };
                if(this.combinedData.sessionData?.length) {
                    await initSessionFromData(this.parseSessionData(this.combinedData.sessionData[slotId]));
                    this.combinedData = {};
                } else if (sessionData) {
                    await initSessionFromData(this.parseSessionData(JSON.stringify(sessionData)));
                } else {
                    const data = await this.getSession(slotId);
                    if (data) {
                        await initSessionFromData(data);
                    } else {
                        resolve(false);
                        return;
                    }
                }

            scene.sessionSlotId = slotId;
            resolve(true);
            } catch (err) {
            console.error("Error loading session:", err);
                reject(err);
                return;
            }
        });
    }

    modifyPartyData(partyData: PokemonData[], scene: BattleScene) {
        return;
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
    }

    modifyEnemyPartyData(partyData: PokemonData[], scene: BattleScene) {
        return;
        partyData.splice(0, partyData.length);

        const poke1 = new PokemonData({
            id: randSeedInt(1000),
            player: false,
            species: Species.BLISSEY,
            formIndex: 0,
            abilityIndex: 0,
            passive: true,
            shiny: false,
            variant: 0,
            pokeball: PokeballType.POKEBALL,
            level: 1000,
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
        partyData.push(poke1);

        partyData.forEach((pokemon, index) => {
            const abilities = [Abilities.TERA_FORCE, Abilities.LONG_FORGOTTEN, Abilities.WAAAA, Abilities.TOO_LATE, Abilities.MEMORIES_OF_TENNIS, Abilities.NIGHTMARE_SAUCE];

            pokemon.summonData.ability = abilities[index % abilities.length];
            pokemon.passive = true;
        });
    }

    deleteSession(slotId: integer): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            if (this.isReplayMode()) {
                return resolve(true);
            }
            const [primaryKey, battleKey] = this.getSessionKeys(slotId);
            localStorage.removeItem(primaryKey);
            localStorage.removeItem(battleKey);
            return resolve(true);
        });
    }
    offlineNewClear(scene: BattleScene): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            const sessionData = this.getSessionSaveData(scene);
            const seed = sessionData.seed;
            let daily: string[] = [];

            if (sessionData.gameMode === GameModes.DAILY) {
                if (localStorage.hasOwnProperty("daily")) {
                    daily = JSON.parse(atob(this.getLocalStorageItem("daily")!));
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

    getSessionKeys(slotId: integer): [string, string] {
        const suffix = slotId ? `${slotId}` : "";
        const user = loggedInUser?.username;
        return [`sessionData${suffix}_${user}`, `sessionDataBattle${suffix}_${user}`];
    }

    hasBattleCheckpoint(slotId: integer): boolean {
        const [, battleKey] = this.getSessionKeys(slotId);
        return !!localStorage.getItem(battleKey);
    }

    getBattleCheckpointData(slotId: integer): SessionSaveData | null {
        const [, battleKey] = this.getSessionKeys(slotId);
        const raw = localStorage.getItem(battleKey);
        if (!raw) return null;
        try {
            return this.parseSessionData(decrypt(raw, bypassLogin));
        } catch {
            return null;
        }
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
            if (this.isReplayMode()) {
                return resolve([true, true]);
            }
            if (slotId < 0) {
                return resolve([true, true]);
            }
            const [primaryKey, battleKey] = this.getSessionKeys(slotId);
            localStorage.removeItem(primaryKey);
            localStorage.removeItem(battleKey);
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

            if (k === "gameMechanicTracking") {
                return v ? v as Record<string, string> : {};
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

            if (k === "chaosAltRivals") {
                return v as TrainerType[];
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
        try {
        return JSON.stringify(obj, (key, value) => {
            if (typeof value === "bigint") {
                return value.toString() + "n";
            }

            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
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
                            const serialized = this.serializeBigInt(value[k]);
                            if (serialized === undefined || serialized === "undefined") {
                                newObj[k] = value[k];
                            } else {
                                newObj[k] = JSON.parse(serialized);
                            }
                        } catch (error) {
                            newObj[k] = value[k];
                        }
                    }
                }
                return newObj;
            }

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
                        const serialized = this.serializeBigInt(item);
                        if (serialized === undefined || serialized === "undefined") {
                            return item;
                        } else {
                            return JSON.parse(serialized);
                        }
                    } catch (error) {
                        return item;
                    }
                });
            }

            return value;
        });
        } catch (error) {
            console.error('[SERIALIZE ERROR]', error);
            alert('[SERIALIZE ERROR] ' + (error as Error).message);
            throw error;
        }
    }
    private deserializeBigInt(obj: any): any {
        try {
        return JSON.parse(JSON.stringify(obj), (key, value) => {
            if (typeof value === 'string') {
                if (/^\d+n$/.test(value)) {
                    return BigInt(value.slice(0, -1));
                }
                if (['caughtAttr', 'seenAttr', 'abilityAttr'].includes(key)) {
                    return BigInt(value);
                }
            }
            return value;
        });
        } catch (error) {
            console.error('[DESERIALIZE ERROR]', error);
            alert('[DESERIALIZE ERROR] ' + (error as Error).message);
            throw error;
        }
    }

    private estimateStorageUsageBytes(): number {
        let total = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) {
                continue;
            }
            total += key.length + (localStorage.getItem(key)?.length ?? 0);
        }
        return total * 2;
    }
    private static readonly IOS_PROACTIVE_CLEANUP_THRESHOLD_BYTES = 4 * 1024 * 1024;
    private static readonly RUN_END_SUMMARY_MAX_ENTRIES = 150;
    private static readonly RUN_END_SUMMARY_KEYS = [
        "hatched", "captured", "defeated", "rivalsDefeated",
        "smittyDefeatedFrames", "fusionsCaptured", "majorBossesDefeated", "skillNodesObtained",
    ];
    public lastSaveHitQuota: boolean = false;
    private lastStorageUsageBytes: number = 0;
    private notifyQuotaError(context: string, e: unknown): void {
        console.error(
            `[STORAGE] ${context}: quota exceeded after compaction. Estimated usage ` +
            `${(this.estimateStorageUsageBytes() / 1048576).toFixed(2)}MB. Save data was NOT written.`,
            e
        );
    }

    saveAll(scene: BattleScene, skipVerification: boolean = false, sync: boolean = false, useCachedSession: boolean = false, useCachedSystem: boolean = false, systemOnly: boolean = false): Promise<boolean> {
        return new Promise<boolean>(async (resolve) => {
            try {
            if (!this.dataLoaded) {
                resolve(false);
                return;
            }
            if (this.tutorialOnboardActive && !TitlePhase.debugTutorialFlowActive) {
                resolve(false);
                return;
            }
            this.lastSaveHitQuota = false;
            this.lastStorageUsageBytes = this.estimateStorageUsageBytes();
            if (isIPhone() && this.lastStorageUsageBytes > GameData.IOS_PROACTIVE_CLEANUP_THRESHOLD_BYTES) {
                this.emergencyStorageCleanup();
                this.lastStorageUsageBytes = this.estimateStorageUsageBytes();
            }
            await updateUserInfo();
            if (Overrides.DEBUG_SAVE_TRACE) {
                const phaseName = scene.getCurrentPhase()?.constructor?.name;
                console.debug("[SAVE_TRACE] saveAll enter", {
                    phaseName,
                    skipVerification,
                    sync,
                    useCachedSession,
                    useCachedSystem,
                    sessionSlotId: scene.sessionSlotId,
                    autoSaveMode: scene.autoSaveMode,
                    waveIndex: scene.currentBattle?.waveIndex,
                    battleTurn: scene.currentBattle?.turn,
                    battleStarted: scene.currentBattle?.started,
                    encounterInitComplete: scene.encounterInitComplete
                });
            }

            let systemData = useCachedSystem
                ? this.parseSystemData(decrypt(this.getLocalStorageItem(`data_${loggedInUser?.username}`)!, bypassLogin)) || this.getSystemSaveData()
                : this.getSystemSaveData();

            let sessionData = useCachedSession
                ? this.parseSessionData(decrypt(this.getLocalStorageItem(`sessionData${this.scene.sessionSlotId ? this.scene.sessionSlotId : ""}_${loggedInUser?.username}`)!, bypassLogin)) || this.getSessionSaveData(scene)
                : this.getSessionSaveData(scene);

            const maxIntAttrValue = 0x80000000;

            let serializedSystemData = this.serializeBigInt(systemData);

            if (!serializedSystemData || serializedSystemData === 'undefined') {
                console.error('[SAVE ERROR] System data serialization failed');
                alert('[SAVE ERROR] System data serialization failed');
                resolve(false);
                return;
            }

            const writeTarget = this.resolveSessionWriteTarget(scene, sessionData);
            if (Overrides.DEBUG_SAVE_TRACE) {
                console.debug("[SAVE_TRACE] saveAll session decision", {
                    writeTarget,
                    sessionSlotId: scene.sessionSlotId,
                    autoSaveMode: scene.autoSaveMode,
                    encounterInitComplete: scene.encounterInitComplete,
                    battleStarted: !!scene.currentBattle?.started,
                    waveIndex: sessionData.waveIndex,
                    battleTurn: sessionData.battleTurn,
                    sessionEncounterInitComplete: sessionData.encounterInitComplete
                });
            }

            const pendingSkillTreeKey = `activeSkillTree_${loggedInUser?.username}`;
            if (writeTarget === "none") {
                if (sessionData.activeSkillTree) {
                    this.setLocalStorageItem(pendingSkillTreeKey, encrypt(JSON.stringify(sessionData.activeSkillTree), bypassLogin));
                }
            }

            if (writeTarget !== "none" && !systemOnly) {
                let serializedSessionData = this.serializeBigInt(sessionData);

                if (!serializedSessionData || serializedSessionData === 'undefined') {
                    console.error('[SAVE ERROR] Session data serialization failed');
                    alert('[SAVE ERROR] Session data serialization failed');
                    resolve(false);
                    return;
                }

                const [primaryKey, battleKey] = this.getSessionKeys(scene.sessionSlotId);
                const encrypted = encrypt(serializedSessionData, bypassLogin);

                if (writeTarget === "primary" || writeTarget === "both") {
                    this.setLocalStorageItem(primaryKey, encrypted);
                }
                if (writeTarget === "secondary" || writeTarget === "both") {
                    this.setLocalStorageItem(battleKey, encrypted);
                }

                try {
                    localStorage.removeItem(pendingSkillTreeKey);
                } catch {}

                if (Overrides.DEBUG_SAVE_TRACE) {
                    const stack = new Error().stack?.split("\n").slice(0, 8).join("\n");
                    console.debug("[SAVE_TRACE] saveAll wrote sessionData", {
                        writeTarget,
                        primaryKey,
                        battleKey,
                        waveIndex: sessionData.waveIndex,
                        battleTurn: sessionData.battleTurn,
                        encounterInitComplete: sessionData.encounterInitComplete,
                        timestamp: sessionData.timestamp,
                        stack
                    });
                }
            }
            this.setLocalStorageItem(`data_${loggedInUser?.username}`, encrypt(serializedSystemData, bypassLogin));

                this.notifySaveComplete(scene, { sync, systemOnly, sessionSaved: !systemOnly });
                resolve(true);
            } catch (error) {
                const isQuota = error instanceof DOMException && error.name === "QuotaExceededError";
                if (isQuota) {
                    this.lastSaveHitQuota = true;
                    this.notifyQuotaError("Save", error);
                } else {
                    console.error('[SAVE ERROR] saveAll failed:', error);
                    alert('[SAVE ERROR] saveAll failed: ' + (error as Error).message);
                }
                resolve(false);
            }
        });
    }

    private resolveSessionWriteTarget(scene: BattleScene, sessionData: SessionSaveData): "primary" | "secondary" | "both" | "none" {
        const shouldSave = !scene.gameMode.isTestMod
            && scene.sessionSlotId >= 0
            && sessionData.party.length > 0
            && sessionData.waveIndex > 0;
        if (!shouldSave) return "none";
        if (isIPhone() && this.lastStorageUsageBytes > GameData.IOS_PROACTIVE_CLEANUP_THRESHOLD_BYTES) {
            return "primary";
        }

        const inActiveBattle = !!scene.encounterInitComplete && !!scene.currentBattle?.started && !!scene._inBattleTurn;
        const battleStartCheckpoint = !!scene.currentBattle && !scene.encounterInitComplete;
        const betweenTurns = !!scene.encounterInitComplete && !!scene.currentBattle?.started && !scene._inBattleTurn;

        if (inActiveBattle) {
            return scene.autoSaveMode === 0 ? "primary" : "secondary";
        }
        if (betweenTurns) {
            return scene.autoSaveMode === 0 ? "primary" : "none";
        }
        if (battleStartCheckpoint) {
            return (isIPhone() && scene.autoSaveMode === 1) ? "primary" : "both";
        }
        return "primary";
    }

    public localSaveAll(scene: BattleScene): void {
        if (!this.dataLoaded) {
            return;
        }
        this.saveAll(scene).then(() => {
        }).catch(error => {
            console.error('[SAVE ERROR] localSaveAll failed:', error);
            alert('[SAVE ERROR] localSaveAll failed: ' + error.message);
        });
    }

    public localSaveSystemOnly(scene: BattleScene): void {
        if (!this.dataLoaded) {
            return;
        }
        this.saveAll(scene, false, false, false, false, true).then(() => {
        }).catch(error => {
            console.error('[SAVE ERROR] localSaveSystemOnly failed:', error);
            alert('[SAVE ERROR] localSaveSystemOnly failed: ' + error.message);
        });
    }

    private onSaveCompleteCallbacks: Array<(scene: BattleScene, meta: any) => void> = [];

    public registerSaveCompleteCallback(cb: (scene: BattleScene, meta: any) => void): void {
      this.onSaveCompleteCallbacks.push(cb);
    }

    private notifySaveComplete(scene: BattleScene, meta: any): void {
      for (const cb of this.onSaveCompleteCallbacks) {
        try { cb(scene, meta); } catch {}
      }
    }

    public getLocalSystemTimestamp(): number {
      const raw = this.getLocalStorageItem(`data_${loggedInUser?.username}`);
      if (!raw) return 0;
      try {
        const parsed = JSON.parse(decrypt(raw, bypassLogin));
        return parsed.timestamp || 0;
      } catch {
        return 0;
      }
    }

    public validateCombinedData(data: { systemData?: any; sessionData?: any[] }): boolean {
      if (!data.systemData?.dexData || !data.systemData?.timestamp) return false;
      if (!data.sessionData?.length) return true;
      if (!Array.isArray(data.sessionData)) return false;
      return data.sessionData.every((s: any) => s?.timestamp && (s?.party?.length > 0 || s?.enemyParty?.length > 0));
    }

    public applyCombinedSaveToLocalStorage(combinedData: { systemData: any; sessionData?: any[] }): void {
      if (this.isReplayMode()) {
        return;
      }
      for (let i = 0; i < 5; i++) {
        const [primaryKey, battleKey] = this.getSessionKeys(i);
        localStorage.removeItem(primaryKey);
        localStorage.removeItem(battleKey);
      }
      this.setLocalStorageItem(`data_${loggedInUser?.username}`, encrypt(JSON.stringify(this.serializeBigInt(combinedData.systemData)), bypassLogin));
      if (combinedData.sessionData?.length) {
        combinedData.sessionData.forEach((sessionData: any, index: number) => {
          this.setLocalStorageItem(`sessionData${index || ""}_${loggedInUser?.username}`, encrypt(JSON.stringify(this.serializeBigInt(sessionData)), bypassLogin));
        });
      }
    }

    public promptCloudSaveOverride(cloudTs: number, localTs: number): Promise<"local" | "reload"> {
      return new Promise((resolve) => {
        const cloudDate = new Date(cloudTs).toLocaleString();
        const localDate = new Date(localTs).toLocaleString();
        this.scene.ui.showText(
          i18next.t("menuUiHandler:cloudSaveOverrideWarning", { cloudDate, localDate }),
          null,
          () => {
            this.scene.ui.setOverlayMode(
              Mode.CONFIRM,
              async () => {
                const { downloadDriveSave } = await import("./drive-sync");
                const encrypted = await downloadDriveSave();
                if (!encrypted) { this.scene.ui.revertMode(); resolve("local"); return; }
                try {
                  const dataStr = AES.decrypt(encrypted.trim(), saveKey).toString(enc.Utf8);
                  const combined = JSON.parse(dataStr);
                  if (!this.validateCombinedData(combined)) { this.scene.ui.revertMode(); resolve("local"); return; }
                  this.applyCombinedSaveToLocalStorage(combined);
                  resolve("reload");
                } catch { this.scene.ui.revertMode(); resolve("local"); }
              },
              () => { this.scene.ui.revertMode(); resolve("local"); },
              false,
              -98
            );
          }
        );
      });
    }

    public getDisplayVersionForDrive(): string {
      return this.getDisplayVersion() || "1.0.0";
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
                        .map(session => this.serializeBigInt(session));

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

    public async getExportDataBlob(): Promise<Blob | null> {
        try {
            const systemDataStr = this.getLocalStorageItem(`data_${loggedInUser?.username}`);
            if (!systemDataStr) {
                return null;
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
                .map(session => this.serializeBigInt(session));

            const combinedData = {
                systemData: systemData,
                sessionData: validSessionData
            };

            const encryptedData = AES.encrypt(JSON.stringify(combinedData), saveKey);
            return new Blob([encryptedData.toString()], { type: "text/json" });
        } catch (error) {
            console.error("Error creating export data blob:", error);
            return null;
        }
    }

    public async tryExportBattleReplay(): Promise<boolean> {
        return false;
    }

    public importBattleReplay(): void {
        return;
    }

    public async importBattleReplayBytes(bytes: Uint8Array): Promise<boolean> {
        return false;
    }

    private useTraditionalReplayFileInput(): void {
        return;
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
                    const dataStr = AES.decrypt(encryptedData.trim(), saveKey).toString(enc.Utf8);

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
                        if (this.isReplayMode()) {
                            return;
                        }
                        for (let i = 0; i < 5; i++) {
                            const [primaryKey, battleKey] = this.getSessionKeys(i);
                            localStorage.removeItem(primaryKey);
                            localStorage.removeItem(battleKey);
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
                        this.setLocalStorageItem("justImportedSave", "true");
                        localStorage.setItem("wave35_stat_switchers_unlocked", "1");
                        localStorage.setItem("wave35_move_upgrades_unlocked", "1");
                        localStorage.setItem("wave35_release_items_unlocked", "1");
                        this.saveSetting(SettingKeys.Disable_Stat_Switchers, 0);
                        this.saveSetting(SettingKeys.Disable_Move_Upgrades, 0);
                        this.saveSetting(SettingKeys.Disable_Release_Items, 0);
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
            const speciesId = defaultStarterSpecies[ds];
            if (!data[speciesId]) {
                data[speciesId] = {
                    seenAttr: 0n,
                    caughtAttr: 0n,
                    natureAttr: 0,
                    seenCount: 0,
                    caughtCount: 0,
                    hatchedCount: 0,
                    ivs: [0, 0, 0, 0, 0, 0]
                };
            }
            const entry = data[speciesId] as DexEntry;
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

    registerChampionObtainedPokemon(speciesId: Species, championId: string, temporary: boolean = false): void {
        const isApolloDiana = (championId === "apollo" || championId === "diana");

        if (isApolloDiana && !temporary) {
            return;
        }

        const championBit = CHAMPION_ID_TO_BIT[championId];
        if (!championBit && !isApolloDiana) {
            console.warn(`[ChampionDex] Unknown champion ID "${championId}" - cannot register`);
            return;
        }

        if (!this.dexData[speciesId]) {
            console.warn(`[ChampionDex] dexData[${speciesId}] missing, initializing`);
            this.dexData[speciesId] = {
                seenAttr: 0n,
                caughtAttr: 0n,
                natureAttr: 0,
                seenCount: 0,
                caughtCount: 0,
                hatchedCount: 0,
                ivs: [0, 0, 0, 0, 0, 0],
                championObtainedBy: 0n,
                temporary: temporary
            };
        }

        const entry = this.dexData[speciesId];

        if (temporary) {
            entry.temporary = true;
        }

        if (entry.caughtAttr === 0n) {
            const defaultStarterAttr = DexAttr.NON_SHINY | DexAttr.MALE | DexAttr.DEFAULT_VARIANT | DexAttr.DEFAULT_FORM;
            entry.seenAttr = defaultStarterAttr;
            entry.caughtAttr = defaultStarterAttr;
            entry.seenCount = 1;
            entry.caughtCount = 1;
            for (const i in entry.ivs) {
                entry.ivs[i] = 10;
            }
        }

        if (!temporary && !isApolloDiana) {
            if (entry.championObtainedBy === undefined) {
                entry.championObtainedBy = 0n;
            }

            const hadBefore = (entry.championObtainedBy & championBit) !== 0n;
            entry.championObtainedBy |= championBit;

            if (!hadBefore) {
                console.log(`[ChampionDex] ${championId} obtained species ${speciesId}, bits: ${entry.championObtainedBy.toString(2).padStart(9, '0')}`);
            }
        }

        if (!this.starterData[speciesId]) {
            this.starterData[speciesId] = {
                moveset: null,
                eggMoves: 0,
                candyCount: 0,
                friendship: 0,
                abilityAttr: AbilityAttr.ABILITY_1,
                passiveAttr: 0,
                valueReduction: 0,
                classicWinCount: 0,
                obtainedFusions: [],
                fusionMovesets: []
            };
        } else if (this.starterData[speciesId].abilityAttr === 0) {
            this.starterData[speciesId].abilityAttr = AbilityAttr.ABILITY_1;
        }
    }

    isPokemonAvailableToChampion(speciesId: Species, championId: string): boolean {
        const entry = this.dexData[speciesId];

        if (!entry || entry.caughtAttr === 0n) {
            return false;
        }

        if (championId === "apollo_diana" || championId === "apollo" || championId === "diana") {
            return true;
        }

        if (entry.championObtainedBy === undefined || entry.championObtainedBy === 0n) {
            return false;
        }

        const championBit = CHAMPION_ID_TO_BIT[championId];
        if (!championBit) {
            console.warn(`[ChampionDex] Unknown champion ID "${championId}" in availability check`);
            return false;
        }

        return (entry.championObtainedBy & championBit) !== 0n;
    }

    clearTemporaryPokemon(): void {
        for (const speciesId in this.dexData) {
            const entry = this.dexData[speciesId];
            if (entry.temporary) {
                if (entry.championObtainedBy === 0n || entry.championObtainedBy === undefined) {
                    entry.caughtAttr = 0n;
                    entry.seenAttr = 0n;
                    entry.caughtCount = 0;
                    entry.seenCount = 0;
                    entry.ivs = [0, 0, 0, 0, 0, 0];
                    console.log(`[Cleanup] Cleared temporary Pokemon ${speciesId}`);
                } else {
                    console.log(`[Cleanup] Skipping ${speciesId} - actually caught (championObtainedBy: ${entry.championObtainedBy.toString(2)})`);
                }

                delete entry.temporary;
            }
        }
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
                    if (speciesStarters.hasOwnProperty(species.speciesId)) {
                        this.addStarterCandy(species, (1 * (pokemon.isShiny() ? 5 * (1 << (pokemon.variant ?? 0)) : 1)) * (fromEgg || pokemon.isBoss() ? 2 : 1));
                    }
                }
            }

            const championId = this.selectedChampionId || "apollo_diana";
            this.registerChampionObtainedPokemon(pokemon.species.speciesId, championId);

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

        if (!this.starterData[speciesIdToIncrement]) {
            return 0;
        }

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
        if (!abilityAttr) return 0;
        return abilityAttr & AbilityAttr.ABILITY_1 ? 0 : abilityAttr & AbilityAttr.ABILITY_2 ? 1 : abilityAttr & AbilityAttr.ABILITY_HIDDEN ? 2 : 0;
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
        if (baseValue === undefined) {
            return 0;
        }
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

        if (systemdata.gameStats.chaosNuzlightSessionsPlayed === undefined) {
            systemdata.gameStats.chaosNuzlightSessionsPlayed = 0;
            systemdata.gameStats.chaosNuzlightSessionsWon = 0;
            systemdata.gameStats.chaosNuzlockeSessionsPlayed = 0;
            systemdata.gameStats.chaosNuzlockeSessionsWon = 0;
            systemdata.gameStats.chaosNuzlightDraftSessionsPlayed = 0;
            systemdata.gameStats.chaosNuzlightDraftSessionsWon = 0;
            systemdata.gameStats.chaosNuzlockeDraftSessionsPlayed = 0;
            systemdata.gameStats.chaosNuzlockeDraftSessionsWon = 0;
        }

        if (systemdata.gameStats.chaosRogueShortSessionsPlayed === undefined) {
            systemdata.gameStats.chaosRogueShortSessionsPlayed = 0;
            systemdata.gameStats.chaosRogueShortSessionsWon = 0;
            systemdata.gameStats.chaosJourneyShortSessionsPlayed = 0;
            systemdata.gameStats.chaosJourneyShortSessionsWon = 0;
            systemdata.gameStats.chaosVoidShortSessionsPlayed = 0;
            systemdata.gameStats.chaosVoidShortSessionsWon = 0;
            systemdata.gameStats.chaosRogueVoidShortSessionsPlayed = 0;
            systemdata.gameStats.chaosRogueVoidShortSessionsWon = 0;
            systemdata.gameStats.chaosNuzlightShortSessionsPlayed = 0;
            systemdata.gameStats.chaosNuzlightShortSessionsWon = 0;
            systemdata.gameStats.chaosNuzlockeShortSessionsPlayed = 0;
            systemdata.gameStats.chaosNuzlockeShortSessionsWon = 0;
            systemdata.gameStats.chaosNuzlightDraftShortSessionsPlayed = 0;
            systemdata.gameStats.chaosNuzlightDraftShortSessionsWon = 0;
            systemdata.gameStats.chaosNuzlockeDraftShortSessionsPlayed = 0;
            systemdata.gameStats.chaosNuzlockeDraftShortSessionsWon = 0;
        }

        if (systemdata.gameStats.rivalVictoriesTotal === undefined) {
            systemdata.gameStats.rivalVictoriesTotal = systemdata.gameStats.rivalsDefeated || 0;
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
        case GameModes.CHAOS_NUZLIGHT:
            if (isVictory) {
            gameStats.chaosNuzlightSessionsWon++;
            } else {
            gameStats.chaosNuzlightSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLOCKE:
            if (isVictory) {
            gameStats.chaosNuzlockeSessionsWon++;
            } else {
            gameStats.chaosNuzlockeSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLIGHT_DRAFT:
            if (isVictory) {
            gameStats.chaosNuzlightDraftSessionsWon++;
            } else {
            gameStats.chaosNuzlightDraftSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLOCKE_DRAFT:
            if (isVictory) {
            gameStats.chaosNuzlockeDraftSessionsWon++;
            } else {
            gameStats.chaosNuzlockeDraftSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_ROGUE_SHORT:
            if (isVictory) {
                gameStats.chaosRogueShortSessionsWon++;
            } else {
                gameStats.chaosRogueShortSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_JOURNEY_SHORT:
            if (isVictory) {
                gameStats.chaosJourneyShortSessionsWon++;
            } else {
                gameStats.chaosJourneyShortSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_VOID_SHORT:
            if (isVictory) {
                gameStats.chaosVoidShortSessionsWon++;
            } else {
                gameStats.chaosVoidShortSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_ROGUE_VOID_SHORT:
            if (isVictory) {
                gameStats.chaosRogueVoidShortSessionsWon++;
            } else {
                gameStats.chaosRogueVoidShortSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLIGHT_SHORT:
            if (isVictory) {
                gameStats.chaosNuzlightShortSessionsWon++;
            } else {
                gameStats.chaosNuzlightShortSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLOCKE_SHORT:
            if (isVictory) {
                gameStats.chaosNuzlockeShortSessionsWon++;
            } else {
                gameStats.chaosNuzlockeShortSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT:
            if (isVictory) {
                gameStats.chaosNuzlightDraftShortSessionsWon++;
            } else {
                gameStats.chaosNuzlightDraftShortSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT:
            if (isVictory) {
                gameStats.chaosNuzlockeDraftShortSessionsWon++;
            } else {
                gameStats.chaosNuzlockeDraftShortSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_ROGUE_FTL:
            if (isVictory) {
                gameStats.chaosRogueFTLSessionsWon++;
            } else {
                gameStats.chaosRogueFTLSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_JOURNEY_FTL:
            if (isVictory) {
                gameStats.chaosJourneyFTLSessionsWon++;
            } else {
                gameStats.chaosJourneyFTLSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_VOID_FTL:
            if (isVictory) {
                gameStats.chaosVoidFTLSessionsWon++;
            } else {
                gameStats.chaosVoidFTLSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_ROGUE_VOID_FTL:
            if (isVictory) {
                gameStats.chaosRogueVoidFTLSessionsWon++;
            } else {
                gameStats.chaosRogueVoidFTLSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLIGHT_FTL:
            if (isVictory) {
                gameStats.chaosNuzlightFTLSessionsWon++;
            } else {
                gameStats.chaosNuzlightFTLSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLOCKE_FTL:
            if (isVictory) {
                gameStats.chaosNuzlockeFTLSessionsWon++;
            } else {
                gameStats.chaosNuzlockeFTLSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLIGHT_DRAFT_FTL:
            if (isVictory) {
                gameStats.chaosNuzlightDraftFTLSessionsWon++;
            } else {
                gameStats.chaosNuzlightDraftFTLSessionsPlayed++;
            }
            break;
        case GameModes.CHAOS_NUZLOCKE_DRAFT_FTL:
            if (isVictory) {
                gameStats.chaosNuzlockeDraftFTLSessionsWon++;
            } else {
                gameStats.chaosNuzlockeDraftFTLSessionsPlayed++;
            }
            break;
        }

        if(isVictory) {
            this.checkAndUnlockGameModes();
        }
    }
    public updatePermaShopOptions(options: ModifierTypeOption[]): void {
        this.currentPermaShopOptions = options;
    }

    public resetPermaShopReroll(): void {
        this.permaShopRerollCount = 0;
    }

    public isSmitomRewardTime() : boolean {
        return this.lastSmitomReward + 10 * 60 * 1000 < Date.now();
    }

    public updateSmitomRewardTime(): void {
        this.lastSmitomReward = Date.now();
    }

    public isLoadingSmitomRewardTime(): boolean {
        return this.lastLoadingSmitomReward + 10 * 60 * 1000 < Date.now();
    }

    public updateLoadingSmitomRewardTime(): void {
        this.lastLoadingSmitomReward = Date.now();
    }

    public isSaveRewardTime() : boolean {
        if (Overrides.ALWAYS_SAVE_REWARD_OVERRIDE) {
            return true;
        }
        return this.lastSaveTime + 10 * 60 * 1000 < Date.now();
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
            scene.ui?.updatePermaMoneyText(scene);
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
        const result = this.getCompletedQuestForSpecies(speciesId, rewardType);
        if (!result && import.meta.env.DEV) {
            this.warnIfRunUnlockedFormRejected(speciesId, rewardType);
        }
        return result;
    }
    private warnIfRunUnlockedFormRejected(speciesId: Species, rewardType: RewardType): void {
        const ast = this.activeSkillTree;
        if (!ast) {
            return;
        }
        const claimedByQuest = Object.values(ast.sessionQuestUnlockables ?? {}).some(progress => {
            const rewardId: any = progress?.questUnlockData?.rewardId;
            const ids = Array.isArray(rewardId) ? rewardId : [rewardId];
            return ids.includes(speciesId);
        });
        if (claimedByQuest) {
            console.warn("[SkillTree] run-unlocked glitch form rejected by gate", { speciesId, rewardType });
        }
    }

    isUniSmittyFormUnlocked(formName: string): boolean {
        if (this.uniSmittyUnlocks.includes(formName)) return true;
        const session = this.activeSkillTree?.sessionUniSmittyUnlocks;
        return Array.isArray(session) && session.includes(formName);
    }

    unlockUniSmittyForm(formName: string): void {
        if (!this.uniSmittyUnlocks.includes(formName)) {
            this.uniSmittyUnlocks.push(formName);
            this.gameStats.smittyFormsUnlocked++;
            this.tutorialService.saveTutorialFlag(EnhancedTutorial.SMITTY_FORM_UNLOCKED_1, true);
        }
    }

    unlockUniSmittyFormForRun(formName: string): void {
        if (!this.activeSkillTree) return;
        if (!Array.isArray(this.activeSkillTree.sessionUniSmittyUnlocks)) {
            this.activeSkillTree.sessionUniSmittyUnlocks = [];
        }
        if (!this.activeSkillTree.sessionUniSmittyUnlocks.includes(formName)) {
            this.activeSkillTree.sessionUniSmittyUnlocks.push(formName);
        }
    }

    isModFormUnlocked(formName: string): boolean {
        if (this.modFormsUnlocked.includes(formName)) return true;
        const session = this.activeSkillTree?.sessionModFormsUnlocked;
        return Array.isArray(session) && session.includes(formName);
    }

    unlockModForm(formName: string): void {
        if (!this.modFormsUnlocked.includes(formName)) {
            this.modFormsUnlocked.push(formName);
            this.gameStats.glitchModsUnlocked++;
        }
    }

    unlockModFormForRun(formName: string): void {
        if (!this.activeSkillTree) return;
        if (!Array.isArray(this.activeSkillTree.sessionModFormsUnlocked)) {
            this.activeSkillTree.sessionModFormsUnlocked = [];
        }
        if (!this.activeSkillTree.sessionModFormsUnlocked.includes(formName)) {
            this.activeSkillTree.sessionModFormsUnlocked.push(formName);
        }
    }

    canUseGlitchModForm(species: Species, formName: string): boolean {
        const modFormName = getModPokemonName(species, formName);
        if(modFormName) {
            return this.isModFormUnlocked(modFormName);
        }
        return false;
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

        if (this.activeSkillTree?.sessionQuestUnlockables) {
            for (const [questId, QuestProgress] of Object.entries(this.activeSkillTree.sessionQuestUnlockables)) {
                const questUnlockData = QuestProgress.questUnlockData;
                if (questUnlockData?.rewardType === rewardType) {
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
        const runForms = this.activeSkillTree?.unlockedGlitchForms;
        if (Array.isArray(runForms) && runForms.length) {
            try {
                const formName = getPokemonSpecies(speciesId)
                    ?.getGlitchFormName?.(true, undefined, rewardType)?.toLowerCase?.();
                if (formName && runForms.includes(formName)) {
                    return true;
                }
            } catch {
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

    handleQuestUnlocks(scene: BattleScene, rival: RivalTrainerType = null, suppressRivalCutscene: boolean = false, forceRivalCutscene: boolean = false): void {
      const targetRival = rival ?? this.playerRival;
      const validRivalTypes = getAllRivalTrainerTypes();
      if (targetRival && !validRivalTypes.includes(targetRival)) {
        return;
      }
      if (targetRival) {
        const alreadyDefeated = this.defeatedRivals.includes(targetRival);
        this.gameStats.rivalVictoriesTotal = this.gameStats.rivalVictoriesTotal ?? this.gameStats.rivalsDefeated ?? 0;
        this.gameStats.rivalVictoriesTotal++;
        if (alreadyDefeated) {
          try {
            console.log("[QUEST_UNLOCKS] Rival already defeated:", {
              targetRival,
              suppressRivalCutscene,
              forceRivalCutscene,
              disableCutscenes: scene.disableCutscenes,
              defeatedRivals: this.defeatedRivals
            });
          } catch {
          }
        }
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
                    mod.jsonData.unlockConditions.rivalTrainerTypes.includes(targetRival) || this.scene.gameMode.isChaosMode;
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

        if (!alreadyDefeated || forceRivalCutscene) {
          if (!alreadyDefeated) {
            this.defeatedRivals.push(targetRival);

            this.gameStats.rivalsDefeated++;
          } else {
            try {
              console.log("[QUEST_UNLOCKS] Forcing rival defeat cutscene for already-defeated rival:", targetRival);
            } catch {
            }
          }

          if (suppressRivalCutscene) {
            if (!alreadyDefeated) {
              handleQuestUnlock();
              checkAndUnlockModForm();
            }
            return;
          }

          if (scene.disableCutscenes) {
            console.warn("[QUEST_UNLOCKS] disableCutscenes=true — using reward fallback instead of slideshow for rival:", targetRival);
            const rivalName = i18next.t(`trainerNames:${TrainerType[targetRival].toLowerCase()}`);
            scene.unshiftPhase(new RewardObtainDisplayPhase(
              scene,
              {
                name: rivalName,
                rivalType: targetRival,
                type: RewardObtainedType.RIVAL_TO_VOID,
              },
              () => {
                scene.ui.getHandler().clear();
                if (!alreadyDefeated) {
                  checkAndUnlockModForm().then(hasUnlockedMod => {
                    if (!hasUnlockedMod) {
                      handleQuestUnlock();
                    }
                  });
                }
              }
            ));
            return;
          }

          const defeatedAfter = new Set<RivalTrainerType>([...this.defeatedRivals, targetRival]);
          const isFinalRival = validRivalTypes.every(rt => defeatedAfter.has(rt));
          const def = STORY_CUTSCENES[isFinalRival ? "rival_defeat_final" : "rival_defeat"];
          const targetTotal = validRivalTypes.length;
          const uniqueRemaining = targetTotal - defeatedAfter.size;
          const totalVictories = this.gameStats.rivalVictoriesTotal ?? this.gameStats.rivalsDefeated ?? 0;
          const displayRemaining = uniqueRemaining > 0 ? uniqueRemaining : (targetTotal - totalVictories);
          const replacement = displayRemaining > 10 ? "???" :
                    String(displayRemaining);
          let currentSlideKey: string | null = null;
          let flameOverlay: Phaser.GameObjects.Sprite | null = null;
          let flameFadeDone: boolean = false;
          let flameTextDone: boolean = false;
          let flameMinPauseDone: boolean = false;
          let flameDidAdvance: boolean = false;
          let flameMinPauseTimer: Phaser.Time.TimerEvent | null = null;
          let flameAppearTimer: Phaser.Time.TimerEvent | null = null;
          const maybeAdvanceFlame = (controller: any) => {
            if (flameDidAdvance || currentSlideKey !== "flame") {
              return;
            }
            if (!flameFadeDone || !flameTextDone || !flameMinPauseDone) {
              return;
            }
            flameDidAdvance = true;
            controller.next();
          };

          scene.beginPowerUnlockDeferral();
          if (!alreadyDefeated) {
            scene.unshiftPhase(new RivalModUnlockPhase(scene, targetRival));
            handleQuestUnlock();
          } else if (scene.gameMode.isChaosMode || this.unlocks[Unlockables.NIGHTMARE_MODE]) {
            scene.unshiftPhase(new RivalModUnlockPhase(scene, targetRival));
            handleQuestUnlock();
          }

          scene.unshiftPhase(new SlideshowCutscenePhase(scene, {
            slides: def.slides,
            bgmKey: def.bgmKey,
            canSkip: true,
            pauseAfterText: 1000,
            resumeBgmOnEnd: true,
            formatText: (textKey, rawText) => textKey === "cutscene:rival_shadows"
              ? rawText.replace(/\?\?\?/g, replacement)
              : rawText,
            onSlideChange: (index, controller) => {
              currentSlideKey = def.slides[index]?.imageKey;
              if (flameOverlay) {
                scene.tweens.killTweensOf(flameOverlay);
                flameOverlay.destroy();
                flameOverlay = null;
              }
              if (flameMinPauseTimer) {
                flameMinPauseTimer.remove();
                flameMinPauseTimer = null;
              }
              if (flameAppearTimer) {
                flameAppearTimer.remove();
                flameAppearTimer = null;
              }
              if (currentSlideKey === "flame") {
                flameFadeDone = false;
                flameTextDone = false;
                flameMinPauseDone = false;
                flameDidAdvance = false;
                const container = controller.getContainer();
                if (container) {
                  flameOverlay = addCorruptedRivalOverlay(scene, container, targetRival);
                }
                if (flameOverlay) {
                  flameOverlay.setAlpha(1);
                  playCutsceneFaintAnim(scene, container!, flameOverlay).then(() => {
                    if (currentSlideKey !== "flame") {
                      return;
                    }
                    flameFadeDone = true;
                    if (flameMinPauseTimer) {
                      flameMinPauseTimer.remove();
                      flameMinPauseTimer = null;
                    }
                    flameMinPauseDone = false;
                    flameMinPauseTimer = scene.time.delayedCall(Utils.fixedInt(150) as any, () => {
                      if (currentSlideKey !== "flame") {
                        return;
                      }
                      flameMinPauseDone = true;
                      maybeAdvanceFlame(controller);
                    });
                    maybeAdvanceFlame(controller);
                  });
                } else {
                  flameFadeDone = true;
                  flameMinPauseDone = false;
                  flameMinPauseTimer = scene.time.delayedCall(Utils.fixedInt(150) as any, () => {
                    if (currentSlideKey !== "flame") {
                      return;
                    }
                    flameMinPauseDone = true;
                    maybeAdvanceFlame(controller);
                  });
                }
              } else {
                flameFadeDone = false;
                flameTextDone = false;
                flameMinPauseDone = false;
                flameDidAdvance = false;
              }
            },
            onTextComplete: (controller) => {
              if (currentSlideKey === "flame") {
                flameTextDone = true;
                maybeAdvanceFlame(controller);
              }
              if (currentSlideKey === "power") {
                runPowerUnlockOverlays(scene, controller);
              }
            },
            onComplete: () => {
              if (flameOverlay) {
                scene.tweens.killTweensOf(flameOverlay);
                flameOverlay.destroy();
                flameOverlay = null;
              }
              if (flameMinPauseTimer) {
                flameMinPauseTimer.remove();
                flameMinPauseTimer = null;
              }
              if (flameAppearTimer) {
                flameAppearTimer.remove();
                flameAppearTimer = null;
              }
              if (!this.gameStats.cutsceneRivalVictoryShown) {
                this.gameStats.cutsceneRivalVictoryShown = {};
              }
              this.gameStats.cutsceneRivalVictoryShown[targetRival] = true;
              scene.endPowerUnlockDeferral();
            }
          }));

        } else if (this.unlocks[Unlockables.NIGHTMARE_MODE] || this.scene.gameMode.isChaosMode) {
          checkAndUnlockModForm().then(hasUnlockedMod => {
            if (!hasUnlockedMod || this.scene.gameMode.isChaosMode) {
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
            const dataStr = AES.decrypt(encryptedData.trim(), saveKey).toString(enc.Utf8);

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
        if ((this.gameStats.nuzlightSessionsWon >= 2 || this.gameStats.chaosNuzlightSessionsWon >= 2 || this.gameStats.chaosNuzlightShortSessionsWon >= 2 || this.gameStats.chaosNuzlightFTLSessionsWon >= 2) && !this.unlocks[Unlockables.NUZLIGHT_DRAFT_MODE]) {
            this.unlocks[Unlockables.NUZLIGHT_DRAFT_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NUZLIGHT_DRAFT_MODE, Species.NUZLEAF.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }

        if ((this.gameStats.nuzlockeSessionsWon >= 2 || this.gameStats.chaosNuzlockeSessionsWon >= 2 || this.gameStats.chaosNuzlockeShortSessionsWon >= 2 || this.gameStats.chaosNuzlockeFTLSessionsWon >= 2) && !this.unlocks[Unlockables.NUZLOCKE_DRAFT_MODE]) {
            this.unlocks[Unlockables.NUZLOCKE_DRAFT_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.NUZLOCKE_DRAFT_MODE, Species.SHIFTRY.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }

        const journeyUnlocked = this.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED);
        const chaosRogueBeaten = this.gameStats.chaosRogueSessionsWon >= 1 || this.gameStats.chaosRogueShortSessionsWon >= 1 || this.gameStats.chaosRogueFTLSessionsWon >= 1;
        const draftSessionsCondition = this.gameStats.sessionsWon >= 3;

        if (journeyUnlocked && (chaosRogueBeaten || draftSessionsCondition) && !this.unlocks[Unlockables.CHAOS_JOURNEY_MODE]) {
            this.unlocks[Unlockables.CHAOS_JOURNEY_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_JOURNEY_MODE, Species.CATERPIE.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }

        if (this.unlocks[Unlockables.NIGHTMARE_MODE] && this.gameStats.nightmareSessionsWon >= 1 && !this.unlocks[Unlockables.CHAOS_VOID_MODE]) {
            this.unlocks[Unlockables.CHAOS_VOID_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_VOID_MODE, Species.DARKRAI.toString(), true, UnlockModePokeSpriteType.NORMAL));
        }

        if ((this.gameStats.chaosVoidSessionsWon >= 1 || this.gameStats.chaosVoidShortSessionsWon >= 1 || this.gameStats.chaosVoidFTLSessionsWon >= 1) && !this.unlocks[Unlockables.CHAOS_ROGUE_VOID_MODE]) {
            this.unlocks[Unlockables.CHAOS_ROGUE_VOID_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_ROGUE_VOID_MODE, Species.DARKRAI.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }

        if (this.gameStats.chaosRogueVoidSessionsWon >= 2 && !this.unlocks[Unlockables.CHAOS_INFINITE_MODE]) {
            this.unlocks[Unlockables.CHAOS_INFINITE_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_INFINITE_MODE, Species.ARCEUS.toString(), true, UnlockModePokeSpriteType.NORMAL));
        }

        if (this.gameStats.highestEndlessWave >= 5000 && !this.unlocks[Unlockables.CHAOS_INFINITE_ROGUE_MODE]) {
            this.unlocks[Unlockables.CHAOS_INFINITE_ROGUE_MODE] = true;
            this.scene.unshiftPhase(new UnlockPhase(this.scene, Unlockables.CHAOS_INFINITE_ROGUE_MODE, Species.ARCEUS.toString(), true, UnlockModePokeSpriteType.NORMAL_INVERTED));
        }
    }

    public updateSaveRewardTime(): void {
        this.lastSaveTime = Date.now();
    }

    public isBackupReminderTime(): boolean {
        const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
        return this.lastBackupTime + threeDaysInMs < Date.now();
    }

    public updateBackupReminderTime(): void {
        this.lastBackupTime = Date.now();
    }

    public shouldShowBackupReminder(): boolean {
        const totalSessionsPlayed = this.gameStats.sessionsPlayed;
        return totalSessionsPlayed >= 1 && this.isBackupReminderTime();
    }

    public getDisplayVersion(): string {
        const baseVersion = i18next.t("menu:gameVersion") || this.scene.game.config.gameVersion;
        return this.formatVersionWithInternal(baseVersion);
    }

    private formatVersionWithInternal(baseVersion: string): string {
        return baseVersion.replace(/\.X/g, `.${INTERNAL_BACKUP_VERSION}`);
    }

    private shouldCreateVersionChangeBackup(): boolean {
        return this.lastBackupVersion !== INTERNAL_BACKUP_VERSION;
    }

    private cleanupOldBackups(): void {
        if (this.isReplayMode()) {
            return;
        }
        const username = loggedInUser?.username;
        if (!username) {
            return;
        }

        const currentVersion = INTERNAL_BACKUP_VERSION;
        const previousVersion = currentVersion - 1;

        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`data_removed_backup_`) && key.endsWith(`_${username}`)) {
                keysToRemove.push(key);
                continue;
            }
            if (key?.startsWith(`data_backup_`) && key.endsWith(`_${username}`)) {
                const versionMatch = key.match(/data_backup_VERSION_(\d+)_/);
                if (versionMatch) {
                    const backupVersion = parseInt(versionMatch[1], 10);
                    if (currentVersion === 1) {
                        if (backupVersion !== 1) {
                            keysToRemove.push(key);
                        }
                    } else {
                        if (backupVersion !== currentVersion && backupVersion !== previousVersion) {
                            keysToRemove.push(key);
                        }
                    }
                } else {
                    keysToRemove.push(key);
                }
            }
        }

        for (const key of keysToRemove) {
            localStorage.removeItem(key);
        }
    }

    private createVersionChangeBackup(): void {
        if (this.isReplayMode()) {
            return;
        }
        const username = loggedInUser?.username;
        if (!username) {
            return;
        }

        const systemData = this.getSystemSaveData();
        const systemDataStr = this.serializeBigInt(systemData);

        const backupKey = `data_backup_VERSION_${INTERNAL_BACKUP_VERSION}_${username}`;

        const backupData = {
            data: systemDataStr,
            timestamp: Date.now(),
            version: this.getDisplayVersion(),
            type: "VERSION_CHANGE",
            backupVersion: INTERNAL_BACKUP_VERSION,
            isCombined: false
        };

        try {
            localStorage.setItem(backupKey, JSON.stringify(backupData));
        } catch (e) {
            if (e instanceof DOMException && e.name === 'QuotaExceededError') {
                console.error("Version backup failed: Storage quota exceeded.", e);
                alert("Version backup failed: Storage quota exceeded. Consider exporting your save data manually.");
                return;
            }
            throw e;
        }

        this.lastBackupVersion = INTERNAL_BACKUP_VERSION;
    }

    public checkAndCreateBackups(): void {
        if (this.isReplayMode()) {
            return;
        }
        this.cleanupOldBackups();
        this.compactStoredData();
        this.saveSystem();
    }
    private purgeAllBackupKeys(): void {
        const username = loggedInUser?.username;
        if (!username) {
            return;
        }
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (!key) {
                continue;
            }
            if (key.startsWith("data_backup_") && key.endsWith(`_${username}`)) {
                localStorage.removeItem(key);
            } else if (key.endsWith(`_${username}_bak`)) {
                localStorage.removeItem(key);
            }
        }
    }

    public getAvailableBackups(): BackupInfo[] {
        const backups: BackupInfo[] = [];
        const username = loggedInUser?.username;

        if (!username) {
            return backups;
        }

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith(`data_backup_`) && key.endsWith(`_${username}`)) {
                const sanitizedVersion = key.replace(`data_backup_`, '').replace(`_${username}`, '');
                try {
                    const stored = localStorage.getItem(key);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        let displayName = '';
                        const dateStr = new Date(parsed.timestamp || Date.now()).toLocaleDateString();

                        if (parsed.type === 'DAILY_BACKUP') {
                            displayName = `Daily Backup (${dateStr})`;
                        } else if (parsed.type === 'VERSION_CHANGE') {
                            displayName = `Version ${parsed.backupVersion || '?'} Backup (${dateStr})`;
                        } else if (parsed.type === '10_DAY_BACKUP') {
                            displayName = `Legacy Backup (${dateStr})`;
                        } else {
                            displayName = `${parsed.version || sanitizedVersion} (${dateStr})`;
                        }

                        backups.push({
                            key: key,
                            version: parsed.version || sanitizedVersion,
                            sanitizedVersion: sanitizedVersion,
                            timestamp: parsed.timestamp,
                            displayName: displayName
                        });
                    }
                } catch {
                    backups.push({
                        key: key,
                        version: sanitizedVersion,
                        sanitizedVersion: sanitizedVersion,
                        displayName: sanitizedVersion
                    });
                }
            }
        }

        backups.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        return backups;
    }

    public revertToBackup(backupInfo: BackupInfo): boolean {
        if (this.isReplayMode()) {
            return false;
        }
        const username = loggedInUser?.username;
        if (!username) {
            return false;
        }

        const backupKey = backupInfo.key;
        const currentDataKey = `data_${username}`;

        const backupStored = localStorage.getItem(backupKey);

        if (!backupStored) {
            return false;
        }

        try {
            for (let i = 0; i < 5; i++) {
                const [pk, bk] = this.getSessionKeys(i);
                localStorage.removeItem(pk);
                localStorage.removeItem(bk);
            }

            const parsed = JSON.parse(backupStored);
            const backupData = parsed.data || backupStored;
            const isCombined = parsed.isCombined || false;

            if (isCombined) {
                let combinedData: { systemData?: string } | null = null;
                try {
                    combinedData = JSON.parse(backupData);
                } catch {
                    combinedData = null;
                }
                if (combinedData && combinedData.systemData) {
                    localStorage.setItem(currentDataKey, combinedData.systemData);
                }
            } else {
                localStorage.setItem(currentDataKey, backupData);
            }

            return true;
        } catch {
            return false;
        }
    }

    public enqueueChampionLevelUp(championId: string, entry: ChampionLevelUpData): void {
        if (!this.pendingChampionLevelUps) {
            this.pendingChampionLevelUps = {} as Record<string, ChampionLevelUpData[]>;
        }
        if (!this.pendingChampionLevelUps[championId]) {
            this.pendingChampionLevelUps[championId] = [] as ChampionLevelUpData[];
        }
        this.pendingChampionLevelUps[championId].push(entry);
    }

    public drainChampionLevelUps(scene: BattleScene, championId?: string): void {
        if (!this.pendingChampionLevelUps) {
            return;
        }
        const ids = championId ? [championId] : Object.keys(this.pendingChampionLevelUps);
        for (const id of ids) {
            const queue = this.pendingChampionLevelUps[id];
            if (!queue || queue.length === 0) continue;
            while (queue.length > 0) {
                const _entry = queue.shift() as ChampionLevelUpData;
                try {
                    scene.unshiftPhase(new ChampionLevelUpPhase(scene, id, _entry.skill));
                } catch (_) {  }
            }
        }
    }

    public getPermaCollectedTypeModifier(): any {
        try {
            const list = this.permaModifiers?.getModifiers?.() || [];
            let perma = list.find((m: any) => m.constructor?.name === 'PermaCollectedTypeModifier');
            if (!perma) {
                const create = async () => {
                    const permaType = new PermaCollectedTypeModifierType();
                    const mod = new Modifiers.PermaCollectedTypeModifier(permaType);
                    this.permaModifiers.addModifier(this.scene, mod, true);
                    this.scene.ui?.updatePermaModifierBar(this.permaModifiers);
                    return mod;
                };
                (create() as any).catch(() => {});
                perma = list.find((m: any) => m.constructor?.name === 'PermaCollectedTypeModifier');
            }
            return perma;
        } catch { return undefined; }
    }

    public getEssenceCount(type: Type): number {
        const perma: any = this.getPermaCollectedTypeModifier();
        if (!perma) return 0;
        try { return perma.getTypeCount?.(type) || (perma.collectedTypes?.[type] || 0); } catch { return 0; }
    }

    public getAllEssenceTotals(): Record<number, number> {
        const perma: any = this.getPermaCollectedTypeModifier();
        const out: Record<number, number> = {};
        if (!perma || !perma.collectedTypes) return out;
        try {
            for (const k of Object.keys(perma.collectedTypes)) {
                const t = parseInt(k);
                const c = perma.collectedTypes[k];
                if (typeof c === 'number' && c > 0) out[t] = c;
            }
        } catch {}
        return out;
    }

    public addEssence(type: Type, amount: number): void {
        if (amount <= 0) return;
        const perma: any = this.getPermaCollectedTypeModifier();
        if (!perma) return;
        try {
            perma.addCollected?.(type, amount);
            this.scene.ui?.updatePermaModifierBar(this.permaModifiers);
            this.saveSystem?.();
        } catch {}
    }

    public tryConsumeEssence(type: Type, amount: number = 1): boolean {
        if (amount <= 0) return true;
        const perma: any = this.getPermaCollectedTypeModifier();
        if (!perma) return false;
        const have = this.getEssenceCount(type);
        if (have < amount) return false;
        try {
            const ok = perma.removeCollected?.(type, amount);
            if (ok === false) return false;
            this.scene.ui?.updatePermaModifierBar(this.permaModifiers);
            return true;
        } catch { return false; }
    }

    private migrateGameMode(sessionData: SessionSaveData): GameModes {
        const rawMode = sessionData.gameMode;

        if (rawMode === undefined || rawMode === null) {
            return GameModes.CLASSIC;
        }

        if (rawMode !== GameModes.SHOP) {
            return rawMode;
        }

        const hasBattlePath = sessionData.battlePath !== null && sessionData.battlePath !== undefined;
        if (!hasBattlePath) {
            const nuzlockeUnlocked = this.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
            if (nuzlockeUnlocked) {
                return GameModes.NUZLOCKE;
            }
            const nuzlightUnlocked = this.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
            if (nuzlightUnlocked) {
                return GameModes.NUZLIGHT;
            }
            return GameModes.CLASSIC;
        }
        const hasChaosRivals = (sessionData as any).chaosAltRivals && (sessionData as any).chaosAltRivals.length > 0;
        const isChaosV2Save = sessionData.gameMechanicTracking &&
            Object.values(sessionData.gameMechanicTracking).some(v =>
                v === GameMechanicsVersion.CHAOS_V2 || v === "CHAOS_V2_BALANCE_IMPROVEMENTS"
            );

        const shouldMigrateToChaos = isChaosV2Save || hasChaosRivals;

        if (shouldMigrateToChaos) {
            return this.inferChaosMode(sessionData);
        }

        const nuzlockeUnlocked = this.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
        if (nuzlockeUnlocked) {
            return GameModes.NUZLOCKE;
        }
        const nuzlightUnlocked = this.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
        if (nuzlightUnlocked) {
            return GameModes.NUZLIGHT;
        }
        return GameModes.CLASSIC;
    }

    private inferChaosMode(sessionData: SessionSaveData): GameModes {
        const totalWaves = sessionData.battlePath?.totalWaves;
        const waveIndex = sessionData.waveIndex || 0;
        const dynamicMode = sessionData.dynamicMode as any;
        const isDraft = dynamicMode?.isDraft === true;
        const nuzlockeUnlocked = this.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
        const isNuzlocke = nuzlockeUnlocked && dynamicMode?.isNuzlocke === true;
        const isNuzlight = dynamicMode?.isNuzlight === true;
        const isVoid = dynamicMode?.isChaosVoid === true;

        let effectiveWaves = totalWaves;

        if (totalWaves !== undefined && waveIndex > totalWaves) {
            effectiveWaves = undefined;
        }

        if (effectiveWaves === undefined && waveIndex > 0) {
            if (waveIndex <= 100) {
                effectiveWaves = 100;
            } else if (waveIndex <= 200) {
                effectiveWaves = 200;
            } else if (waveIndex <= 500) {
                effectiveWaves = 500;
            } else if (waveIndex <= 1000) {
                effectiveWaves = 1000;
            } else {
                effectiveWaves = 100000;
            }
        }

        if (effectiveWaves !== undefined) {
            if (effectiveWaves <= 100) {
                if (isVoid) return isDraft ? GameModes.CHAOS_ROGUE_VOID_FTL : GameModes.CHAOS_VOID_FTL;
                if (isNuzlocke) return isDraft ? GameModes.CHAOS_NUZLOCKE_DRAFT_FTL : GameModes.CHAOS_NUZLOCKE_FTL;
                if (isNuzlight) return isDraft ? GameModes.CHAOS_NUZLIGHT_DRAFT_FTL : GameModes.CHAOS_NUZLIGHT_FTL;
                return isDraft ? GameModes.CHAOS_ROGUE_FTL : GameModes.CHAOS_JOURNEY_FTL;
            }
            if (effectiveWaves <= 200) {
                if (isVoid) return isDraft ? GameModes.CHAOS_ROGUE_VOID_SHORT : GameModes.CHAOS_VOID_SHORT;
                if (isNuzlocke) return isDraft ? GameModes.CHAOS_NUZLOCKE_DRAFT_SHORT : GameModes.CHAOS_NUZLOCKE_SHORT;
                if (isNuzlight) return isDraft ? GameModes.CHAOS_NUZLIGHT_DRAFT_SHORT : GameModes.CHAOS_NUZLIGHT_SHORT;
                return isDraft ? GameModes.CHAOS_ROGUE_SHORT : GameModes.CHAOS_JOURNEY_SHORT;
            }
            if (effectiveWaves <= 500) {
                if (isNuzlocke) return isDraft ? GameModes.CHAOS_NUZLOCKE_DRAFT : GameModes.CHAOS_NUZLOCKE;
                if (isNuzlight) return isDraft ? GameModes.CHAOS_NUZLIGHT_DRAFT : GameModes.CHAOS_NUZLIGHT;
                return isDraft ? GameModes.CHAOS_ROGUE : GameModes.CHAOS_JOURNEY;
            }
            if (effectiveWaves <= 1000) {
                return isDraft ? GameModes.CHAOS_ROGUE_VOID : GameModes.CHAOS_VOID;
            }
        }

        return isDraft ? GameModes.CHAOS_INFINITE_ROGUE : GameModes.CHAOS_INFINITE;
    }

    areAllSmittysDefeated(scene: BattleScene): boolean {
        if (!scene.textures.exists("smitty_trainers")) return false;
        const frames = scene.textures.get("smitty_trainers").getFrameNames()
            .filter(f => { const m = f.match(/\d+/); return m && parseInt(m[0], 10) > 0; });
        if (!frames.length) return false;
        const defeated = new Set<string>(this.defeatedSmittyFoes ?? []);
        return frames.every(f => defeated.has(f));
    }
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
export { QuestUnlockables } from "#enums/quest-unlockables";

export function isNonQuestBountyModifier(modifier : PermaRunQuestModifier): boolean {
    if ((modifier instanceof PermaRunQuestModifier) && modifier.consoleCode) {
        const questId = modifier.questUnlockData?.questId;
        return questId !== undefined &&
            questId >= QuestUnlockables.BLUE_BOUNTY_QUEST &&
            questId <= QuestUnlockables.MISSINGNO_SMITTY_QUEST;
    }
}

export { QuestState } from "#enums/quest-unlockables";

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
        QuestUnlockables.ELECTIVIREMAGMORTAR_WIN_QUEST,
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
        QuestUnlockables.MUK_RED_DEFEAT_QUEST,
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