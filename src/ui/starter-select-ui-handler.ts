import {BattleSceneEventType, CandyUpgradeNotificationChangedEvent} from "../events/battle-scene";
import { getYuTuning, yuTuningLog } from "../yu-visual-tuning";
import {pokemonPrevolutions} from "#app/data/pokemon-evolutions";
import {Variant, getVariantTint, getVariantIcon} from "#app/data/variant";
import {argbFromRgba} from "@material/material-color-utilities";
import i18next from "i18next";
import BBCodeText from "phaser3-rex-plugins/plugins/bbcodetext";
import BattleScene, {starterColors} from "../battle-scene";
import {allAbilities} from "../data/ability";
import {speciesEggMoves} from "../data/egg-moves";
import {GrowthRate, getGrowthRateColor} from "../data/exp";
import {Gender, getGenderColor, getGenderSymbol} from "../data/gender";
import {allMoves} from "../data/move";
import {Nature, getNatureName} from "../data/nature";
import {pokemonFormChanges} from "../data/pokemon-forms";
import {LevelMoves, pokemonFormLevelMoves, pokemonSpeciesLevelMoves} from "../data/pokemon-level-moves";
import PokemonSpecies, {
    adjustDuelmonIconScale,
    allSpecies,
    getFusedSpeciesName,
    getPokemonSpecies,
    getPokemonSpeciesForm,
    getStarterValueFriendshipCap,
    speciesStarters,
    starterPassiveAbilities,
    getPokerusStarters
} from "../data/pokemon-species";
import {Type} from "../data/type";
import {GameModes, getGameMode} from "../game-mode";
import {
    AbilityAttr,
    DexAttr,
    DexAttrProps,
    DexEntry,
    StarterFormMoveData,
    StarterMoveset,
    StarterAttributes,
    StarterPreferences,
    StarterPrefs,
    StarterData
} from "../system/game-data";
import {Tutorial, handleTutorial} from "../tutorial";
import * as Utils from "../utils";
import {OptionSelectItem} from "./abstact-option-select-ui-handler";
import MessageUiHandler from "./message-ui-handler";
import PokemonIconAnimHandler, {PokemonIconAnimMode} from "./pokemon-icon-anim-handler";
import {StatsContainer} from "./stats-container";
import {TextStyle, addBBCodeTextObject, addTextObject} from "./text";
import { Mode } from "./mode";
import {addWindow, injectWindowCorners} from "./ui-theme";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import {Egg} from "#app/data/egg";
import Overrides from "#app/overrides";
import { YuSpriteTweakController, TweakOffsets, TweakBaseValues } from "./tweak/yu-sprite-tweak-controller";
import { TweakMetaMode, cycleMetaMode, TWEAK_META_CYCLE, formatMetaHud, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";
import {SettingKeyboard} from "#app/system/settings/settings-keyboard";
import {Passive as PassiveAttr} from "#enums/passive";
import * as Challenge from "../data/challenge";
import MoveInfoOverlay from "./move-info-overlay";
import {getEggTierForSpecies} from "#app/data/egg.js";
import {Device} from "#enums/devices";
import {Moves} from "#enums/moves";
import {Species} from "#enums/species";
import {Button} from "#enums/buttons";
import {EggSourceType} from "#app/enums/egg-source-types.js";
import AwaitableUiHandler from "./awaitable-ui-handler";
import {DropDown, DropDownLabel, DropDownOption, DropDownState, DropDownType} from "./dropdown";
import {StarterContainer} from "./starter-container";
import {DropDownColumn, FilterBar} from "./filter-bar";
import {ScrollBar} from "./scroll-bar";
import {DUELMON_SPECIES_IDS} from "../data/duelmon-rankups";
import {SelectChallengePhase} from "#app/phases/select-challenge-phase.js";
import {TitlePhase} from "#app/phases/title-phase.js";
import Pokemon, { PlayerPokemon, YU_BATTLE_FIT, YU_PLAYER_FIT_MULT, YU_SPECIES_PORTAL_OFFSETS, YU_SPECIES_PORTAL_IMAGE_OVERRIDE } from "#app/field/pokemon";
import { PokemonBattleTooltipUtils } from "./pokemon-battle-tooltip-utils";
import { isPrimaryPointer } from "./pointer-utils";
import {PermaType} from "#app/modifier/perma-modifiers";
import { isIPhone } from "#app/loading-scene";
import type { PlayableChampionData } from "#app/system/playable-champions";
import { ChampionUtils } from "../system/champion-utils";
import { PokemonAltBuildId, POKEMON_ALT_BUILDS } from "../data/pokemon-alt-buid";
import { PokemonAltBuildModifier } from "../modifier/modifier";
import { PokemonAltBuildModifierType } from "../modifier/modifier-type";
import { EnhancedTutorial } from "./tutorial-registry";

export type StarterSelectCallback = (starters: Starter[]) => void;

export type OptionItem = {
        label: string;
        handler: () => boolean;
        overrideSound?: boolean;
        labelColor?: string;
        item?: string;
        itemArgs?: any;
        onHover?: () => void;
        inputSetting?: string;
    };

export interface Starter {
    species: PokemonSpecies;
    dexAttr: bigint;
    abilityIndex: integer,

    fusionIndex: integer,
    passive: boolean;
    nature: Nature;
    moveset?: StarterMoveset;
    pokerus: boolean;
    nickname?: string;
    isSignature?: boolean;
}
export interface ChampionFilterConfig {
	availableStarters?: Species[];
	championData?: PlayableChampionData;
	onStarterSelected?: (species: Species) => void;
	onCancel?: () => void;
}

interface LanguageSetting {
    starterInfoTextSize: string,
    instructionTextSize: string,
    starterInfoXPos?: integer,
    starterInfoYOffset?: integer
}

const languageSettings: { [key: string]: LanguageSetting } = {
    "en": {
        starterInfoTextSize: "56px",
        instructionTextSize: "38px",
    },
    "de": {
        starterInfoTextSize: "48px",
        instructionTextSize: "35px",
        starterInfoXPos: 33,
    },
    "es": {
        starterInfoTextSize: "56px",
        instructionTextSize: "35px",
    },
    "fr": {
        starterInfoTextSize: "54px",
        instructionTextSize: "35px",
    },
    "it": {
        starterInfoTextSize: "56px",
        instructionTextSize: "38px",
    },
    "pt_BR": {
        starterInfoTextSize: "47px",
        instructionTextSize: "38px",
        starterInfoXPos: 33,
    },
    "zh": {
        starterInfoTextSize: "47px",
        instructionTextSize: "38px",
        starterInfoYOffset: 1,
        starterInfoXPos: 24,
    },
    "pt": {
        starterInfoTextSize: "48px",
        instructionTextSize: "42px",
        starterInfoXPos: 33,
    },
    "ko": {
        starterInfoTextSize: "52px",
        instructionTextSize: "38px",
    },
    "ja": {
        starterInfoTextSize: "51px",
        instructionTextSize: "38px",
    },
    "ca-ES": {
        starterInfoTextSize: "56px",
        instructionTextSize: "38px",
    },
};

const starterCandyCosts: { passive: integer, costReduction: [integer, integer], egg: integer }[] = [
    {passive: 40, costReduction: [25, 60], egg: 30},
    {passive: 40, costReduction: [25, 60], egg: 30},
    {passive: 35, costReduction: [20, 50], egg: 25},
    {passive: 30, costReduction: [15, 40], egg: 20},
    {passive: 25, costReduction: [12, 35], egg: 18},
    {passive: 20, costReduction: [10, 30], egg: 15},
    {passive: 15, costReduction: [8, 20], egg: 12},
    {passive: 10, costReduction: [5, 15], egg: 10},
    {passive: 10, costReduction: [5, 15], egg: 10},
    {passive: 10, costReduction: [5, 15], egg: 10},
];

const valueReductionMax = 2;
const filterBarHeight = 17;
const speciesContainerX = 109;
const teamWindowX = 285;
const fusionsButtonY = 18;
const fusionsButtonHeight = 15;
const teamWindowY = fusionsButtonY + fusionsButtonHeight;
const teamWindowWidth = 34;
const teamWindowHeight = 117;

function getPassiveCandyCount(baseValue: integer): integer {
    return starterCandyCosts[baseValue - 1].passive;
}

function getValueReductionCandyCounts(baseValue: integer): [integer, integer] {
    return starterCandyCosts[baseValue - 1].costReduction;
}

function getSameSpeciesEggCandyCounts(baseValue: integer): integer {
    return starterCandyCosts[baseValue - 1].egg;
}
function calcStarterPosition(index: number, scrollCursor: number = 0): { x: number, y: number } {
    const yOffset = 13;
    const height = 17;
    const x = (index % 9) * 18;
    const y = yOffset + (Math.floor(index / 9) - scrollCursor) * height;

    return {x: x, y: y};
}
function calcStarterIconY(index: number) {
    const starterSpacing = teamWindowHeight / 7;
    const firstStarterY = teamWindowY + starterSpacing / 2;
    return Math.round(firstStarterY + starterSpacing * index);
}
function findClosestStarterIndex(y: number, teamSize: number = 6): number {
    let smallestDistance = teamWindowHeight;
    let closestStarterIndex = 0;
    for (let i = 0; i < teamSize; i++) {
        const distance = Math.abs(y - (calcStarterIconY(i) - 13));
        if (distance < smallestDistance) {
            closestStarterIndex = i;
            smallestDistance = distance;
        }
    }
    return closestStarterIndex;
}
function findClosestStarterRow(index: number, numberOfRows: number) {
    const currentY = calcStarterIconY(index) - 13;
    let smallestDistance = teamWindowHeight;
    let closestRowIndex = 0;
    for (let i = 0; i < numberOfRows; i++) {
        const distance = Math.abs(currentY - calcStarterPosition(i * 9).y);
        if (distance < smallestDistance) {
            closestRowIndex = i;
            smallestDistance = distance;
        }
    }
    return closestRowIndex;
}
export default class StarterSelectUiHandler extends MessageUiHandler {
    private static readonly ST_TWEAK_ZERO_OFFSETS: TweakOffsets = {
        portalScaleOffset: 0,
        creatureScaleOffset: 0,
        yOffset: 0,
        xOffset: 0,
        creatureYOffset: 0,
        creatureXOffset: 0,
    };

    private static readonly ST_DEFAULT_OFFSETS: TweakOffsets = {
        portalScaleOffset: -0.28,
        creatureScaleOffset: -0.01,
        yOffset: -35,
        xOffset: -5.5,
        creatureYOffset: 32.5,
        creatureXOffset: -5,
    };

    private static readonly SPECIES_VISUAL_OFFSETS: Partial<Record<number, { creatureScaleOffset?: number; creatureYOffset?: number }>> = {
        [Species.GUARDIAN_GRARL]: { creatureScaleOffset: 0.035, creatureYOffset: 20 },
    };

    protected starterSelectContainer: Phaser.GameObjects.Container;
    protected starterSelectScrollBar: ScrollBar;
    protected filterBarContainer: Phaser.GameObjects.Container;
    protected filterBar: FilterBar;
    protected teamWindow: Phaser.GameObjects.NineSlice;
    protected pointsWindow: Phaser.GameObjects.NineSlice;
    protected shinyOverlay: Phaser.GameObjects.Image;

    protected starterContainers: StarterContainer[] = [];
    protected filteredStarterContainers: StarterContainer[] = [];
    protected fusionContainerPool: StarterContainer[] = [];
    protected starterBoxContainer: Phaser.GameObjects.Container;
    protected validStarterContainers: StarterContainer[] = [];
    protected pokemonNumberText: Phaser.GameObjects.Text;
    protected pokemonSprite: Phaser.GameObjects.Sprite;
    protected starterPortalSprite: Phaser.GameObjects.Sprite | null = null;
    private _spriteTweak: YuSpriteTweakController | null = null;
    private _stTweakHudText: Phaser.GameObjects.Text | null = null;
    private _stBaseCreatureScale: number = 1;
    private _stBaseCreatureX: number = 53;
    private _stBaseCreatureY: number = 96;
    private _stBasePortalScale: number = 0;
    private _stBasePortalX: number = 0;
    private _stBasePortalY: number = 0;
    private _lastTweakOffsets: TweakOffsets | null = null;
    get _tweakActive(): boolean { return this._spriteTweak?.tweakActive ?? false; }
    protected pokemonNameText: Phaser.GameObjects.Text;
    protected pokemonGrowthRateLabelText: Phaser.GameObjects.Text;
    protected pokemonGrowthRateText: Phaser.GameObjects.Text;
    protected type1Icon: Phaser.GameObjects.Sprite;
    protected type2Icon: Phaser.GameObjects.Sprite;
    protected pokemonGenderText: Phaser.GameObjects.Text;
    protected pokemonUncaughtText: Phaser.GameObjects.Text;
    protected pokemonAbilityLabelText: Phaser.GameObjects.Text;
    protected pokemonAbilityText: Phaser.GameObjects.Text;

    protected pokemonFusionLabelText: Phaser.GameObjects.Text;
    protected pokemonFusionText: Phaser.GameObjects.Text;
    protected pokemonFusionDnaIcon: Phaser.GameObjects.Image;
    protected pokemonFusionPartnerIcon: Phaser.GameObjects.Sprite;
    protected pokemonFusionInfoDnaIcon: Phaser.GameObjects.Image;
    protected pokemonFusionInfoSpeciesIcon: Phaser.GameObjects.Sprite;
    protected pokemonPassiveLabelText: Phaser.GameObjects.Text;
    protected pokemonPassiveText: Phaser.GameObjects.Text;
    protected pokemonNatureLabelText: Phaser.GameObjects.Text;
    protected pokemonNatureText: BBCodeText;
    protected pokemonMovesContainer: Phaser.GameObjects.Container;
    protected pokemonMoveContainers: Phaser.GameObjects.Container[];
    protected pokemonMoveBgs: Phaser.GameObjects.NineSlice[];
    protected pokemonMoveLabels: Phaser.GameObjects.Text[];
    protected pokemonAdditionalMoveCountLabel: Phaser.GameObjects.Text;
    protected pokemonEggMovesContainer: Phaser.GameObjects.Container;
    protected pokemonEggMoveContainers: Phaser.GameObjects.Container[];
    protected pokemonEggMoveBgs: Phaser.GameObjects.NineSlice[];
    protected pokemonEggMoveLabels: Phaser.GameObjects.Text[];
    protected pokemonCandyIcon: Phaser.GameObjects.Sprite;
    protected pokemonCandyDarknessOverlay: Phaser.GameObjects.Sprite;
    protected pokemonCandyOverlayIcon: Phaser.GameObjects.Sprite;
    protected pokemonCandyCountText: Phaser.GameObjects.Text;
    protected pokemonCaughtHatchedContainer: Phaser.GameObjects.Container;
    protected pokemonCaughtIcon: Phaser.GameObjects.Sprite;
    protected pokemonCaughtCountText: Phaser.GameObjects.Text;
    protected pokemonHatchedIcon: Phaser.GameObjects.Sprite;
    protected pokemonHatchedCountText: Phaser.GameObjects.Text;
    protected pokemonShinyIcon: Phaser.GameObjects.Sprite;

    private static readonly ST_UI_TWEAK_MODES = ["scale", "position", "alpha", "color"];
    private static readonly FUSION_BG_COLORS: number[] = [
      0x666688, 0x445566, 0x884444, 0x448844, 0x886644,
      0x664488, 0x228888, 0x555555, 0x333333, 0x000000,
      0x222244, 0x442222, 0x224422, 0x444400, 0x004444,
    ];
    private _fusionBgColorIndex: number = 9;
    private static readonly ST_UI_TWEAK_ASSETS = [
      "FusionOverlayIcon",
      "FusionOverlayBg",
      "CaughtIcon",
      "CaughtCountText",
      "HatchedIcon",
      "HatchedCountText",
      "FusionInfoDna",
      "FusionInfoSpecies",
      "FusionInfoBoth",
      "InfoGroup",
    ];
    private static readonly INFO_GROUP_MEMBERS = [2, 3, 4, 5, 6, 7];
    private _stUiMetaMode: TweakMetaMode = TweakMetaMode.NONE;
    get _stUiTweakActive(): boolean { return this._stUiMetaMode !== TweakMetaMode.NONE; }
    private _stUiTweakMode: number = 0;
    private _stUiTweakAssetIndex: number = 0;
    private _stUiTweakBaselines: Map<string, { x: number; y: number; scaleX: number; scaleY: number; displayWidth: number; displayHeight: number; alpha: number }> = new Map();
    private _stUiTweakHudText: Phaser.GameObjects.Text | null = null;
    private _stUiDropdownPanel: TweakDropdownPanel | null = null;
    private _stUiTweakKeyOneHandler: ((e?: KeyboardEvent) => void) | null = null;
    private _stUiTweakKeyTwoHandler: ((e?: KeyboardEvent) => void) | null = null;
    private _stUiTweakKeyThreeHandler: ((e?: KeyboardEvent) => void) | null = null;
    private _stUiTweakKeyVHandler: ((e?: KeyboardEvent) => void) | null = null;
    private _stUiTweakKeyFiveHandler: ((e?: KeyboardEvent) => void) | null = null;
    private _stUiTweakKeyHHandler: ((e?: KeyboardEvent) => void) | null = null;
    protected championAvailableSpecies?: Set<Species>;
    protected championOnStarterSelected?: (species: Species) => void;
    private isInitialCursorSet: boolean = false;
    protected championOnCancel?: () => void;
	protected originalAllSpecies?: PokemonSpecies[];
	protected championFilterConfig?: ChampionFilterConfig;
	protected filteredStarters?: Set<Species>;

    protected instructionsContainer: Phaser.GameObjects.Container;
    protected filterInstructionsContainer: Phaser.GameObjects.Container;
    protected shinyIconElement: Phaser.GameObjects.Sprite;
    protected formIconElement: Phaser.GameObjects.Sprite;
    protected abilityIconElement: Phaser.GameObjects.Sprite;
    protected genderIconElement: Phaser.GameObjects.Sprite;
    protected natureIconElement: Phaser.GameObjects.Sprite;
    protected variantIconElement: Phaser.GameObjects.Sprite;
    protected fusionIconElement: Phaser.GameObjects.Sprite;
    protected voidexIconElement: Phaser.GameObjects.Sprite;
    protected goFilterIconElement: Phaser.GameObjects.Sprite;
    protected shinyLabel: Phaser.GameObjects.Text;
    protected formLabel: Phaser.GameObjects.Text;
    protected genderLabel: Phaser.GameObjects.Text;
    protected abilityLabel: Phaser.GameObjects.Text;
    protected natureLabel: Phaser.GameObjects.Text;
    protected variantLabel: Phaser.GameObjects.Text;
    protected fusionLabel: Phaser.GameObjects.Text;
    protected voidexLabel: Phaser.GameObjects.Text;
    protected goFilterLabel: Phaser.GameObjects.Text;

    protected starterSelectMessageBox: Phaser.GameObjects.NineSlice;
    protected starterSelectMessageBoxContainer: Phaser.GameObjects.Container;
    private _starterMessagePattern: ModalBackgroundHandle | null = null;
    protected statsContainer: StatsContainer;
    protected pokemonFormText: Phaser.GameObjects.Text;
    protected moveInfoOverlay: MoveInfoOverlay;

    protected statsMode: boolean;
    protected starterIconsCursorXOffset: number = -3;
    protected starterIconsCursorYOffset: number = 1;
    protected starterIconsCursorIndex: number;
    protected filterMode: boolean;
    private filterDismissZone: Phaser.GameObjects.Zone | null = null;
    protected prevFusionsFilterKey: string | null = null;
    protected dexAttrCursor: bigint = 0n;
    protected abilityCursor: number = -1;
    protected natureCursor: number = -1;

    protected fusionCursor: number = -1;
    protected filterBarCursor: integer = 0;
    protected starterMoveset: StarterMoveset | null;
    protected scrollCursor: number;
    private _wheelHandler: ((p: Phaser.Input.Pointer, g: any, dx: number, dy: number) => void) | null = null;
    private _gridDragStartY: number | null = null;
    private _gridDragMoveHandler: ((p: Phaser.Input.Pointer) => void) | null = null;
    private _gridDragUpHandler: (() => void) | null = null;

    protected allSpecies: PokemonSpecies[] = [];
    protected lastSpecies: PokemonSpecies;
    protected speciesLoaded: Map<Species, boolean> = new Map<Species, boolean>();
    public starterSpecies: PokemonSpecies[] = [];
    protected pokerusSpecies: PokemonSpecies[] = [];
    protected starterAttr: bigint[] = [];
    protected starterAbilityIndexes: integer[] = [];

    protected starterFusionIndexes: integer[] = [];
    protected starterNatures: Nature[] = [];
    protected starterMovesets: StarterMoveset[] = [];
    protected starterSignatureFlags: boolean[] = [];
    protected speciesStarterDexEntry: DexEntry | null;
    protected speciesStarterMoves: Moves[];
    protected canCycleShiny: boolean;
    protected canCycleForm: boolean;
    protected canCycleGender: boolean;
    protected canCycleAbility: boolean;
    protected canCycleNature: boolean;
    protected canCycleVariant: boolean;

    protected canCycleFusion: boolean;
    protected canCycleSignature: boolean;
    protected signatureModeActive: boolean = true;
    protected signatureIconElement: Phaser.GameObjects.Sprite;
    protected signatureLabel: Phaser.GameObjects.Text;
    protected value: integer = 0;
    protected canAddParty: boolean;

    protected assetLoadCancelled: Utils.BooleanHolder | null;
    public cursorObj: Phaser.GameObjects.Image;
    protected starterCursorObjs: Phaser.GameObjects.Image[];
    protected pokerusCursorObjs: Phaser.GameObjects.Image[];
    protected starterIcons: Phaser.GameObjects.Sprite[];
    protected partyFusionOverlayBgs: Phaser.GameObjects.Image[] = [];
    protected partyFusionOverlayIcons: Phaser.GameObjects.Sprite[] = [];
    protected starterIconsCursorObj: Phaser.GameObjects.Image;
    protected valueLimitLabel: Phaser.GameObjects.Text;
    protected startCursorObj: Phaser.GameObjects.NineSlice;
    protected fusionsCursorObj: Phaser.GameObjects.NineSlice;
    protected fusionsButtonBg: Phaser.GameObjects.NineSlice;
    protected fusionsButtonIcon: Phaser.GameObjects.Image;
    protected fusionsButtonLabel: Phaser.GameObjects.Text;
    protected fusionsFilterActive: boolean = false;
    protected pokemon: Pokemon;
    private _summaryTooltipPokemon: PlayerPokemon | null = null;
    private _partyTooltipPokemon: PlayerPokemon | null = null;
    private _summaryTooltipDeferred: boolean = false;
    private _summaryDeferArm: (() => void) | null = null;
    private summaryHoverZone: Phaser.GameObjects.Zone | null = null;

    protected iconAnimHandler: PokemonIconAnimHandler;
    protected instructionRowX = 0;
    protected instructionRowY = 0;
    protected instructionRowTextOffset = 9;
    protected filterInstructionRowX = 0;
    protected filterInstructionRowY = 0;

    protected starterSelectCallback: StarterSelectCallback | null;

    protected starterPreferences: StarterPreferences;

    protected blockInput: boolean = false;
    protected _isSwapSelecting: boolean = false;

    constructor(scene: BattleScene, mode: Mode = Mode.STARTER_SELECT) {
        super(scene, mode);
    }

    setup() {
        const ui = this.getUi();
        const currentLanguage = i18next.resolvedLanguage ?? "en";
        const langSettingKey = Object.keys(languageSettings).find(lang => currentLanguage.includes(lang)) ?? "en";
        const textSettings = languageSettings[langSettingKey] ?? languageSettings["en"];

        this.starterSelectContainer = this.scene.add.container(0, -this.scene.game.canvas.height / 6);
        this.starterSelectContainer.setVisible(false);
        ui.add(this.starterSelectContainer);

        const bgColor = this.scene.add.rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6, 0x006860);
        bgColor.setOrigin(0, 0);
        this.starterSelectContainer.add(bgColor);

        const starterSelectBg = this.scene.add.image(0, 0, "starter_select_bg");
        starterSelectBg.setOrigin(0, 0);
        this.starterSelectContainer.add(starterSelectBg);

        this.shinyOverlay = this.scene.add.image(6, 6, "summary_overlay_shiny");
        this.shinyOverlay.setOrigin(0, 0);
        this.shinyOverlay.setVisible(false);
        this.starterSelectContainer.add(this.shinyOverlay);

        const starterContainerWindow = addWindow(this.scene, speciesContainerX, filterBarHeight + 1, 175, 161);
        const starterContainerBg = this.scene.add.image(speciesContainerX + 1, filterBarHeight + 2, "starter_container_bg");
        starterContainerBg.setOrigin(0, 0);
        this.starterSelectContainer.add(starterContainerBg);

        this.fusionsButtonBg = addWindow(this.scene, teamWindowX, fusionsButtonY, teamWindowWidth, fusionsButtonHeight);
        this.starterSelectContainer.add(this.fusionsButtonBg);

        this.fusionsButtonIcon = this.scene.add.image(teamWindowX + 5, fusionsButtonY + 6, "icon_spliced");
        this.fusionsButtonIcon.setScale(0.3);
        this.fusionsButtonIcon.setOrigin(0, 0);
        this.starterSelectContainer.add(this.fusionsButtonIcon);

        this.fusionsButtonLabel = addTextObject(this.scene, teamWindowX + 10, fusionsButtonY + 4, i18next.t("filterBar:fusionsFilter"), TextStyle.PARTY, { fontSize: textSettings.instructionTextSize });
        this.fusionsButtonLabel.setOrigin(0, 0);
        this.starterSelectContainer.add(this.fusionsButtonLabel);

        this.fusionsCursorObj = this.scene.add.nineslice(teamWindowX + 1, fusionsButtonY + 1, "select_cursor", undefined, teamWindowWidth - 2, fusionsButtonHeight - 2, 6, 6, 6, 6);
        this.fusionsCursorObj.setVisible(false);
        this.fusionsCursorObj.setOrigin(0, 0);
        this.starterSelectContainer.add(this.fusionsCursorObj);

        this.fusionsButtonBg.setInteractive(new Phaser.Geom.Rectangle(0, 0, teamWindowWidth, fusionsButtonHeight), Phaser.Geom.Rectangle.Contains);
        this.fusionsButtonBg.on("pointerover", () => {
          if (this.isPointerInputBlocked()) return;
          if (this.filterBar.openDropDown) return;
          if (this.filterMode) {
            this.filterBar.hideDropDowns();
            this.hideFilterDismissZone();
            this.setFilterMode(false);
          }
          this.cursorObj.setVisible(false);
          this.startCursorObj.setVisible(false);
          this.starterIconsCursorObj.setVisible(false);
          this.fusionsCursorObj.setVisible(true);
        });
        this.fusionsButtonBg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!isPrimaryPointer(pointer)) return;
          if (this.isPointerInputBlocked()) return;
          if (this.filterMode && this.filterBar.openDropDown) {
            this.filterBar.hideDropDowns();
            this.hideFilterDismissZone();
            this.setFilterMode(false);
            return;
          }
          if (this.filterMode) {
            this.filterBar.hideDropDowns();
            this.hideFilterDismissZone();
            this.setFilterMode(false);
          }
          this.cursorObj.setVisible(false);
          this.startCursorObj.setVisible(false);
          this.starterIconsCursorObj.setVisible(false);
          this.setSpecies(null);
          this.fusionsCursorObj.setVisible(true);
          this.fusionsFilterActive = !this.fusionsFilterActive;
          this.updateFusionsButtonVisual();
          this.updateStarters();
          this.refreshAllPartyIconPostFX();
          this.tryUpdateValue();
        });

        this.teamWindow = addWindow(this.scene, teamWindowX, teamWindowY, teamWindowWidth, teamWindowHeight);
        this.starterSelectContainer.add(this.teamWindow);

        this.pointsWindow = addWindow(this.scene, teamWindowX, teamWindowY + teamWindowHeight - 5, teamWindowWidth, teamWindowWidth, true);
        this.starterSelectContainer.add(this.pointsWindow);

        this.starterSelectContainer.add(starterContainerWindow);

        injectWindowCorners(this.scene, this.teamWindow, this.starterSelectContainer, true);
        injectWindowCorners(this.scene, this.pointsWindow, this.starterSelectContainer, true);
        this.filterBarContainer = this.scene.add.container(0, 0);
        this.filterBar = new FilterBar(this.scene, Math.min(speciesContainerX, teamWindowX), 1, 210, filterBarHeight);
        const genOptions: DropDownOption[] = [
            new DropDownOption(this.scene, 1, new DropDownLabel(i18next.t("starterSelectUiHandler:gen1"))),
            new DropDownOption(this.scene, 2, new DropDownLabel(i18next.t("starterSelectUiHandler:gen2"))),
            new DropDownOption(this.scene, 3, new DropDownLabel(i18next.t("starterSelectUiHandler:gen3"))),
            new DropDownOption(this.scene, 4, new DropDownLabel(i18next.t("starterSelectUiHandler:gen4"))),
            new DropDownOption(this.scene, 5, new DropDownLabel(i18next.t("starterSelectUiHandler:gen5"))),
            new DropDownOption(this.scene, 6, new DropDownLabel(i18next.t("starterSelectUiHandler:gen6"))),
            new DropDownOption(this.scene, 7, new DropDownLabel(i18next.t("starterSelectUiHandler:gen7"))),
            new DropDownOption(this.scene, 8, new DropDownLabel(i18next.t("starterSelectUiHandler:gen8"))),
            new DropDownOption(this.scene, 9, new DropDownLabel(i18next.t("starterSelectUiHandler:gen9"))),
            new DropDownOption(this.scene, 20, new DropDownLabel(i18next.t("starterSelectUiHandler:gen20"))),
        ];
        const genDropDown: DropDown = new DropDown(this.scene, 0, 0, genOptions, this.updateStarters, DropDownType.HYBRID);
        this.filterBar.addFilter(DropDownColumn.GEN, i18next.t("filterBar:genFilter"), genDropDown);
        const typeKeys = Object.keys(Type).filter(v => isNaN(Number(v)));
        const typeOptions: DropDownOption[] = [];
        typeKeys.forEach((type, index) => {
            if (index === 0 || index > 19) {
                return;
            }
            const typeSprite = this.scene.add.sprite(0, 0, Utils.getLocalizedSpriteKey("types"));
            typeSprite.setScale(0.5);
            typeSprite.setFrame(type.toLowerCase());
            typeOptions.push(new DropDownOption(this.scene, index, new DropDownLabel("", typeSprite)));
        });
        this.filterBar.addFilter(DropDownColumn.TYPES, i18next.t("filterBar:typeFilter"), new DropDown(this.scene, 0, 0, typeOptions, this.updateStarters, DropDownType.HYBRID, 0.5));
        const shiny1Sprite = this.scene.add.sprite(0, 0, "shiny_icons");
        shiny1Sprite.setOrigin(0.15, 0.2);
        shiny1Sprite.setScale(0.6);
        shiny1Sprite.setFrame(getVariantIcon(0));
        shiny1Sprite.setTint(getVariantTint(0));
        const shiny2Sprite = this.scene.add.sprite(0, 0, "shiny_icons");
        shiny2Sprite.setOrigin(0.15, 0.2);
        shiny2Sprite.setScale(0.6);
        shiny2Sprite.setFrame(getVariantIcon(1));
        shiny2Sprite.setTint(getVariantTint(1));
        const shiny3Sprite = this.scene.add.sprite(0, 0, "shiny_icons");
        shiny3Sprite.setOrigin(0.15, 0.2);
        shiny3Sprite.setScale(0.6);
        shiny3Sprite.setFrame(getVariantIcon(2));
        shiny3Sprite.setTint(getVariantTint(2));

        const caughtOptions = [
            new DropDownOption(this.scene, "SHINY3", new DropDownLabel("", shiny3Sprite)),
            new DropDownOption(this.scene, "SHINY2", new DropDownLabel("", shiny2Sprite)),
            new DropDownOption(this.scene, "SHINY", new DropDownLabel("", shiny1Sprite)),
            new DropDownOption(this.scene, "NORMAL", new DropDownLabel(i18next.t("filterBar:normal"))),
            new DropDownOption(this.scene, "UNCAUGHT", new DropDownLabel(i18next.t("filterBar:uncaught")))
        ];

        this.filterBar.addFilter(DropDownColumn.CAUGHT, i18next.t("filterBar:caughtFilter"), new DropDown(this.scene, 0, 0, caughtOptions, this.updateStarters, DropDownType.HYBRID));
        const passiveLabels = [
            new DropDownLabel(i18next.t("filterBar:passive"), undefined, DropDownState.OFF),
            new DropDownLabel(i18next.t("filterBar:passiveUnlocked"), undefined, DropDownState.ON),
            new DropDownLabel(i18next.t("filterBar:passiveUnlockable"), undefined, DropDownState.UNLOCKABLE),
            new DropDownLabel(i18next.t("filterBar:passiveLocked"), undefined, DropDownState.EXCLUDE),
        ];

        const costReductionLabels = [
            new DropDownLabel(i18next.t("filterBar:costReduction"), undefined, DropDownState.OFF),
            new DropDownLabel(i18next.t("filterBar:costReductionUnlocked"), undefined, DropDownState.ON),
            new DropDownLabel(i18next.t("filterBar:costReductionUnlockable"), undefined, DropDownState.UNLOCKABLE),
            new DropDownLabel(i18next.t("filterBar:costReductionLocked"), undefined, DropDownState.EXCLUDE),
        ];

        const unlocksOptions = [
            new DropDownOption(this.scene, "PASSIVE", passiveLabels),
            new DropDownOption(this.scene, "COST_REDUCTION", costReductionLabels),
        ];

        this.filterBar.addFilter(DropDownColumn.UNLOCKS, i18next.t("filterBar:unlocksFilter"), new DropDown(this.scene, 0, 0, unlocksOptions, this.updateStarters, DropDownType.RADIAL));
        const favoriteLabels = [
            new DropDownLabel(i18next.t("filterBar:favorite"), undefined, DropDownState.OFF),
            new DropDownLabel(i18next.t("filterBar:isFavorite"), undefined, DropDownState.ON),
            new DropDownLabel(i18next.t("filterBar:notFavorite"), undefined, DropDownState.EXCLUDE),
        ];
        const winLabels = [
            new DropDownLabel(i18next.t("filterBar:ribbon"), undefined, DropDownState.OFF),
            new DropDownLabel(i18next.t("filterBar:hasWon"), undefined, DropDownState.ON),
            new DropDownLabel(i18next.t("filterBar:hasNotWon"), undefined, DropDownState.EXCLUDE),
        ];
        const hiddenAbilityLabels = [
            new DropDownLabel(i18next.t("filterBar:hiddenAbility"), undefined, DropDownState.OFF),
            new DropDownLabel(i18next.t("filterBar:hasHiddenAbility"), undefined, DropDownState.ON),
            new DropDownLabel(i18next.t("filterBar:noHiddenAbility"), undefined, DropDownState.EXCLUDE),
        ];
        const eggLabels = [
            new DropDownLabel(i18next.t("filterBar:egg"), undefined, DropDownState.OFF),
            new DropDownLabel(i18next.t("filterBar:eggPurchasable"), undefined, DropDownState.ON),
        ];
        const pokerusLabels = [
            new DropDownLabel(i18next.t("filterBar:pokerus"), undefined, DropDownState.OFF),
            new DropDownLabel(i18next.t("filterBar:hasPokerus"), undefined, DropDownState.ON),
        ];
        const miscOptions = [
            new DropDownOption(this.scene, "FAVORITE", favoriteLabels),
            new DropDownOption(this.scene, "WIN", winLabels),
            new DropDownOption(this.scene, "HIDDEN_ABILITY", hiddenAbilityLabels),
            new DropDownOption(this.scene, "EGG", eggLabels),
            new DropDownOption(this.scene, "POKERUS", pokerusLabels),
        ];
        this.filterBar.addFilter(DropDownColumn.MISC, i18next.t("filterBar:miscFilter"), new DropDown(this.scene, 0, 0, miscOptions, this.updateStarters, DropDownType.RADIAL));
        const sortOptions = [
            new DropDownOption(this.scene, 0, new DropDownLabel(i18next.t("filterBar:sortByNumber"), undefined, DropDownState.ON)),
            new DropDownOption(this.scene, 1, new DropDownLabel(i18next.t("filterBar:sortByCost"))),
            new DropDownOption(this.scene, 2, new DropDownLabel(i18next.t("filterBar:sortByCandies"))),
            new DropDownOption(this.scene, 3, new DropDownLabel(i18next.t("filterBar:sortByIVs"))),
            new DropDownOption(this.scene, 4, new DropDownLabel(i18next.t("filterBar:sortByName")))
        ];
        this.filterBar.addFilter(DropDownColumn.SORT, i18next.t("filterBar:sortFilter"), new DropDown(this.scene, 0, 0, sortOptions, this.updateStarters, DropDownType.SINGLE));
        this.filterBarContainer.add(this.filterBar);

        this.starterSelectContainer.add(this.filterBarContainer);

        const filterBarHitZone = this.scene.add.zone(Math.min(speciesContainerX, teamWindowX), 1, 210, filterBarHeight);
        filterBarHitZone.setOrigin(0, 0);
        filterBarHitZone.setInteractive(new Phaser.Geom.Rectangle(0, 0, 210, filterBarHeight), Phaser.Geom.Rectangle.Contains);
        filterBarHitZone.on("pointermove", (_pointer: Phaser.Input.Pointer, localX: number) => {
          if (this.isPointerInputBlocked()) return;
          if (this.filterBar.openDropDown) return;
          const index = this.filterBar.getFilterIndexAtX(localX);
          if (!this.filterMode) {
            this.cursorObj.setVisible(false);
            this.startCursorObj.setVisible(false);
            this.starterIconsCursorObj.setVisible(false);
            this.fusionsCursorObj.setVisible(false);
          }
          this.filterBarCursor = index;
          this.setFilterMode(true);
          this.filterBar.setCursor(index);
        });
        filterBarHitZone.on("pointerdown", (pointer: Phaser.Input.Pointer, localX: number) => {
          if (!isPrimaryPointer(pointer)) return;
          if (this.isPointerInputBlocked()) return;
          if (this.filterBar.openDropDown) return;
          const index = this.filterBar.getFilterIndexAtX(localX);
          if (!this.filterMode) {
            this.cursorObj.setVisible(false);
            this.startCursorObj.setVisible(false);
            this.starterIconsCursorObj.setVisible(false);
            this.fusionsCursorObj.setVisible(false);
            this.setSpecies(null);
          }
          this.filterBarCursor = index;
          this.setFilterMode(true);
          this.filterBar.setCursor(index);
          this.filterBar.toggleDropDown(index);
          if (this.filterBar.openDropDown) {
            this.showFilterDismissZone();
          } else {
            this.hideFilterDismissZone();
          }
        });
        this.filterBarContainer.add(filterBarHitZone);
        this.filterBar.offsetHybridFilters();

        if (!this.scene.uiTheme) {
            starterContainerWindow.setVisible(false);
        }

        this.iconAnimHandler = new PokemonIconAnimHandler();
        this.iconAnimHandler.setup(this.scene);

        this.pokemonNumberText = addTextObject(this.scene, 17, 1, "0000", TextStyle.SUMMARY);
        this.pokemonNumberText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonNumberText);

        this.pokemonNameText = addTextObject(this.scene, 6, 112, "", TextStyle.SUMMARY);
        this.pokemonNameText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonNameText);

        this.pokemonGrowthRateLabelText = addTextObject(this.scene, 8, 106, i18next.t("starterSelectUiHandler:growthRate"), TextStyle.SUMMARY, {fontSize: "36px"});
        this.pokemonGrowthRateLabelText.setOrigin(0, 0);
        this.pokemonGrowthRateLabelText.setVisible(false);
        this.starterSelectContainer.add(this.pokemonGrowthRateLabelText);

        this.pokemonGrowthRateText = addTextObject(this.scene, 34, 106, "", TextStyle.SUMMARY_PINK, {fontSize: "36px"});
        this.pokemonGrowthRateText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonGrowthRateText);

        this.pokemonGenderText = addTextObject(this.scene, 96, 112, "", TextStyle.SUMMARY_ALT);
        this.pokemonGenderText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonGenderText);

        this.pokemonUncaughtText = addTextObject(this.scene, 6, 127, i18next.t("starterSelectUiHandler:uncaught"), TextStyle.SUMMARY_ALT, {fontSize: "56px"});
        this.pokemonUncaughtText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonUncaughtText);
        const starterInfoXPos = textSettings?.starterInfoXPos || 31;
        const starterInfoYOffset = textSettings?.starterInfoYOffset || 0;
        const starterInfoTextSize = textSettings?.starterInfoTextSize || 56;

        this.pokemonAbilityLabelText = addTextObject(this.scene, 6, 127 + starterInfoYOffset, i18next.t("starterSelectUiHandler:ability"), TextStyle.SUMMARY, {fontSize: starterInfoTextSize});
        this.pokemonAbilityLabelText.setOrigin(0, 0);
        this.pokemonAbilityLabelText.setVisible(false);
        this.starterSelectContainer.add(this.pokemonAbilityLabelText);

        this.pokemonAbilityText = addTextObject(this.scene, starterInfoXPos, 127 + starterInfoYOffset, "", TextStyle.SUMMARY, {fontSize: starterInfoTextSize});
        this.pokemonAbilityText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonAbilityText);
        this.pokemonFusionLabelText = addTextObject(this.scene, starterInfoXPos + 28, 114 + starterInfoYOffset, i18next.t("starterSelectUiHandler:Fusion"), TextStyle.SUMMARY, {fontSize: "36px"});
        this.pokemonFusionLabelText.setOrigin(0, 0);
        this.pokemonFusionLabelText.setVisible(false);
        this.starterSelectContainer.add(this.pokemonFusionLabelText);

        this.pokemonFusionText = addTextObject(this.scene, starterInfoXPos + 28, 117 + starterInfoYOffset, "", TextStyle.SUMMARY, {fontSize: starterInfoTextSize});
        this.pokemonFusionText.setOrigin(0, 0);
        this.pokemonFusionText.setVisible(false);
        this.starterSelectContainer.add(this.pokemonFusionText);

        this.pokemonFusionInfoSpeciesIcon = this.scene.add.sprite(starterInfoXPos + 46.5, 110 + starterInfoYOffset, "pokemon_icons_0");
        this.pokemonFusionInfoSpeciesIcon.setOrigin(0, 0);
        this.pokemonFusionInfoSpeciesIcon.setScale(0.5);
        this.pokemonFusionInfoSpeciesIcon.setVisible(false);
        this.starterSelectContainer.add(this.pokemonFusionInfoSpeciesIcon);

        this.pokemonFusionInfoDnaIcon = this.scene.add.image(starterInfoXPos + 58.5, 119 + starterInfoYOffset, "icon_spliced");
        this.pokemonFusionInfoDnaIcon.setOrigin(0, 0);
        this.pokemonFusionInfoDnaIcon.setScale(0.33);
        this.pokemonFusionInfoDnaIcon.setVisible(false);
        this.starterSelectContainer.add(this.pokemonFusionInfoDnaIcon);

        this.pokemonPassiveLabelText = addTextObject(this.scene, 6, 136 + starterInfoYOffset, i18next.t("starterSelectUiHandler:passive"), TextStyle.SUMMARY, {fontSize: starterInfoTextSize});
        this.pokemonPassiveLabelText.setOrigin(0, 0);
        this.pokemonPassiveLabelText.setVisible(false);
        this.starterSelectContainer.add(this.pokemonPassiveLabelText);

        this.pokemonPassiveText = addTextObject(this.scene, starterInfoXPos, 136 + starterInfoYOffset, "", TextStyle.SUMMARY_ALT, {fontSize: starterInfoTextSize});
        this.pokemonPassiveText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonPassiveText);

        this.pokemonNatureLabelText = addTextObject(this.scene, 6, 145 + starterInfoYOffset, i18next.t("starterSelectUiHandler:nature"), TextStyle.SUMMARY, {fontSize: starterInfoTextSize});
        this.pokemonNatureLabelText.setOrigin(0, 0);
        this.pokemonNatureLabelText.setVisible(false);
        this.starterSelectContainer.add(this.pokemonNatureLabelText);

        this.pokemonNatureText = addBBCodeTextObject(this.scene, starterInfoXPos, 145 + starterInfoYOffset, "", TextStyle.SUMMARY, {fontSize: starterInfoTextSize});
        this.pokemonNatureText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonNatureText);

        this.pokemonMoveContainers = [];
        this.pokemonMoveBgs = [];
        this.pokemonMoveLabels = [];

        this.pokemonEggMoveContainers = [];
        this.pokemonEggMoveBgs = [];
        this.pokemonEggMoveLabels = [];

        this.valueLimitLabel = addTextObject(this.scene, teamWindowX + 17, 150, "0/10", TextStyle.TOOLTIP_CONTENT);
        this.valueLimitLabel.setOrigin(0.5, 0);
        this.starterSelectContainer.add(this.valueLimitLabel);

        const startLabel = addTextObject(this.scene, teamWindowX + 17, 162, i18next.t("common:start"), TextStyle.TOOLTIP_CONTENT);
        startLabel.setOrigin(0.5, 0);
        this.starterSelectContainer.add(startLabel);

        this.startCursorObj = this.scene.add.nineslice(teamWindowX + 4, 160, "select_cursor", undefined, 26, 15, 6, 6, 6, 6);
        this.startCursorObj.setVisible(false);
        this.startCursorObj.setOrigin(0, 0);
        this.starterSelectContainer.add(this.startCursorObj);

        const startHitZone = this.scene.add.zone(teamWindowX + 17, 167, 30, 18);
        startHitZone.setOrigin(0.5, 0.5);
        startHitZone.setInteractive(new Phaser.Geom.Rectangle(-15, -9, 30, 18), Phaser.Geom.Rectangle.Contains);
        startHitZone.on("pointerover", () => {
          if (this.isPointerInputBlocked()) return;
          if (this.filterBar.openDropDown) return;
          this.cursorObj.setVisible(false);
          this.fusionsCursorObj.setVisible(false);
          this.starterIconsCursorObj.setVisible(false);
          this.startCursorObj.setVisible(true);
        });
        startHitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!isPrimaryPointer(pointer)) return;
          if (this.isPointerInputBlocked()) return;
          if (this.filterMode && this.filterBar.openDropDown) {
            this.filterBar.hideDropDowns();
            this.hideFilterDismissZone();
            this.setFilterMode(false);
            return;
          }
          if (this.filterMode) {
            this.filterBar.hideDropDowns();
            this.hideFilterDismissZone();
            this.setFilterMode(false);
          }
          this.cursorObj.setVisible(false);
          this.fusionsCursorObj.setVisible(false);
          this.starterIconsCursorObj.setVisible(false);
          this.setSpecies(null);
          this.startCursorObj.setVisible(true);
          this.tryStart(true);
        });
        this.starterSelectContainer.add(startHitZone);

        const starterSpecies: Species[] = [];

        const starterBoxContainer = this.scene.add.container(speciesContainerX + 6, 9);
        this.starterBoxContainer = starterBoxContainer;

        this.starterSelectScrollBar = new ScrollBar(this.scene, 161, 12, 0);

        starterBoxContainer.add(this.starterSelectScrollBar);

        this.pokerusCursorObjs = new Array(3).fill(null).map(() => {
            const cursorObj = this.scene.add.image(0, 0, "select_cursor_pokerus");
            cursorObj.setVisible(false);
            cursorObj.setOrigin(0, 0);
            starterBoxContainer.add(cursorObj);
            return cursorObj;
        });

        this.starterCursorObjs = new Array(6).fill(null).map(() => {
            const cursorObj = this.scene.add.image(0, 0, "select_cursor_highlight");
            cursorObj.setVisible(false);
            cursorObj.setOrigin(0, 0);
            starterBoxContainer.add(cursorObj);
            return cursorObj;
        });

        this.cursorObj = this.scene.add.image(0, 0, "select_cursor");
        this.cursorObj.setOrigin(0, 0);
        this.starterIconsCursorObj = this.scene.add.image(289, 64, "select_gen_cursor");
        this.starterIconsCursorObj.setName("starter-icons-cursor");
        this.starterIconsCursorObj.setVisible(false);
        this.starterIconsCursorObj.setOrigin(0, 0);
        this.starterSelectContainer.add(this.starterIconsCursorObj);

        starterBoxContainer.add(this.cursorObj);

        for (const species of allSpecies) {
            if (!speciesStarters.hasOwnProperty(species.speciesId) || !species.isObtainable()) {
                continue;
            }
            starterSpecies.push(species.speciesId);
            this.speciesLoaded.set(species.speciesId, false);
            this.allSpecies.push(species);

            const starterContainer = new StarterContainer(this.scene, species).setVisible(false);
            this.iconAnimHandler.addOrUpdate(starterContainer.icon, PokemonIconAnimMode.NONE);
            this.starterContainers.push(starterContainer);
            starterBoxContainer.add(starterContainer);
        }

        this.starterSelectContainer.add(starterBoxContainer);

        this.starterIcons = new Array(6).fill(null).map((_, i) => {
            const icon = this.scene.add.sprite(teamWindowX + 7, calcStarterIconY(i), "pokemon_icons_0");
            icon.setScale(0.5);
            icon.setOrigin(0, 0);
            icon.setFrame("unknown");
            icon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 32, 32), Phaser.Geom.Rectangle.Contains);
            icon.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
              if (!isPrimaryPointer(pointer)) return;
              if (this.isPointerInputBlocked()) return;
              if (this.filterMode && this.filterBar.openDropDown) {
                this.filterBar.hideDropDowns();
                this.hideFilterDismissZone();
                this.setFilterMode(false);
                return;
              }
              if (i < this.starterSpecies.length) {
                if (this.filterMode) {
                  this.filterBar.hideDropDowns();
                  this.hideFilterDismissZone();
                  this.setFilterMode(false);
                }
                this.cursorObj.setVisible(false);
                this.startCursorObj.setVisible(false);
                this.fusionsCursorObj.setVisible(false);
                this.starterIconsCursorIndex = i;
                this.moveStarterIconsCursor(i);
              }
            });
            icon.on("pointerover", () => {
              if (this.isPointerInputBlocked()) return;
              if (this._summaryTooltipDeferred) return;
              if (this.filterBar?.openDropDown) return;
              if (i >= this.starterSpecies.length) return;
              this.showPartySlotTooltip(i);
            });
            icon.on("pointerout", () => {
              this.hidePartySlotTooltip();
            });
            this.starterSelectContainer.add(icon);
            this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.PASSIVE);
            return icon;
        });

        this.partyFusionOverlayBgs = [];
        this.partyFusionOverlayIcons = [];
        for (let fi = 0; fi < 6; fi++) {
            const bg = this.scene.add.image(teamWindowX + 7 + 14, calcStarterIconY(fi) + 11, "passive_bg");
            bg.setOrigin(0.5, 0.5);
            bg.setScale(0.37);
            bg.setTint(0x000000);
            bg.setVisible(false);
            this.starterSelectContainer.add(bg);
            this.partyFusionOverlayBgs.push(bg);

            const overlayIcon = this.scene.add.sprite(teamWindowX + 7 + 14, calcStarterIconY(fi) + 10, "pokemon_icons_0");
            overlayIcon.setOrigin(0.5, 0.5);
            overlayIcon.setScale(0.25);
            overlayIcon.setFrame("unknown");
            overlayIcon.setVisible(false);
            this.starterSelectContainer.add(overlayIcon);
            this.partyFusionOverlayIcons.push(overlayIcon);
            this.iconAnimHandler.addOrUpdate([bg, overlayIcon], PokemonIconAnimMode.PASSIVE);
        }

        this.starterPortalSprite = this.scene.add.sprite(53, 96, "yu_portal_7");
        this.starterPortalSprite.setOrigin(0.5, 1);
        this.starterPortalSprite.setVisible(false);
        this.starterSelectContainer.add(this.starterPortalSprite);

        this.pokemonSprite = this.scene.add.sprite(53, 63, "pkmn__sub");
        this.pokemonSprite.setPipeline(this.scene.spritePipeline, {tone: [0.0, 0.0, 0.0, 0.0], ignoreTimeTint: true});
        this.starterSelectContainer.add(this.pokemonSprite);

        this.starterSelectContainer.moveBelow(this.starterPortalSprite, this.pokemonSprite);
        this.starterSelectContainer.moveBelow(this.starterPortalSprite, this.pokemonGrowthRateLabelText);

        this.summaryHoverZone = this.scene.add.zone(0, 17, 109, 139);
        this.summaryHoverZone.setOrigin(0, 0);
        this.summaryHoverZone.setInteractive({ useHandCursor: false });
        this.summaryHoverZone.on("pointerover", () => {
          if (this._summaryTooltipDeferred) return;
          if (this.isPointerInputBlocked()) return;
          if (!this.lastSpecies) return;
          if (this.filterBar?.openDropDown) return;
          this.showSummaryTooltip();
        });
        this.summaryHoverZone.on("pointerout", () => {
          this.hideSummaryTooltip();
        });
        this.starterSelectContainer.add(this.summaryHoverZone);

        if (Overrides.STARTER_SELECT_TWEAK_TOOL_OVERRIDE) {
          this._stTweakHudText = addTextObject(this.scene, Math.floor(this.scene.game.canvas.width / 12), 2, "", TextStyle.WINDOW, { fontSize: "28px", color: "#00FF00", align: "center" });
          this._stTweakHudText.setOrigin(0.5, 0);
          this._stTweakHudText.setDepth(2000);
          this._stTweakHudText.setVisible(false);
          this.starterSelectContainer.add(this._stTweakHudText);
          this._spriteTweak = new YuSpriteTweakController({
            scene: this.scene,
            logTag: "ST-TWEAK",
            modes: ["scale", "position"],
            assets: ["PokemonSprite", "PortalSprite", "BothSprites"],
            hudTextObject: this._stTweakHudText,
            applyOffsets: (offsets: TweakOffsets) => this.applyStarterTweakOffsets(offsets),
            onHydrate: () => ({
              player: this._lastTweakOffsets ?? StarterSelectUiHandler.ST_TWEAK_ZERO_OFFSETS,
              enemy: StarterSelectUiHandler.ST_TWEAK_ZERO_OFFSETS,
            }),
            getBaseValues: (): TweakBaseValues | null => {
              const g = getYuTuning();
              const d = StarterSelectUiHandler.ST_DEFAULT_OFFSETS;
              return {
                portalScale: this._stBasePortalScale + g.portalScaleOffset + d.portalScaleOffset,
                creatureScale: this._stBaseCreatureScale + g.creatureScaleOffset + d.creatureScaleOffset,
                portalX: this._stBasePortalX + g.xOffset + d.xOffset,
                portalY: this._stBasePortalY + g.yOffset + d.yOffset,
                creatureX: this._stBaseCreatureX + g.creatureXOffset + d.creatureXOffset,
                creatureY: this._stBaseCreatureY + g.yOffset + g.creatureYOffset + d.yOffset + d.creatureYOffset,
              };
            },
            getDropdownAnchor: () => ({ x: 10, y: 20 }),
          });
          this._stUiTweakHudText = addTextObject(this.scene, Math.floor(this.scene.game.canvas.width / 12), 14, "", TextStyle.WINDOW, { fontSize: "28px", color: "#00FF00", align: "center" });
          this._stUiTweakHudText.setOrigin(0.5, 0);
          this._stUiTweakHudText.setDepth(2000);
          this._stUiTweakHudText.setVisible(false);
          this.starterSelectContainer.add(this._stUiTweakHudText);
        }

        this.type1Icon = this.scene.add.sprite(8, 98, Utils.getLocalizedSpriteKey("types"));
        this.type1Icon.setScale(0.5);
        this.type1Icon.setOrigin(0, 0);
        this.starterSelectContainer.add(this.type1Icon);

        this.type2Icon = this.scene.add.sprite(26, 98, Utils.getLocalizedSpriteKey("types"));
        this.type2Icon.setScale(0.5);
        this.type2Icon.setOrigin(0, 0);
        this.starterSelectContainer.add(this.type2Icon);

        this.pokemonCandyIcon = this.scene.add.sprite(4.5 - 4, 18 - 6, "items", "candy");
        this.pokemonCandyIcon.setScale(0.5);
        this.pokemonCandyIcon.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonCandyIcon);

        this.pokemonFormText = addTextObject(this.scene, 6, 42, "Form", TextStyle.WINDOW_ALT, {fontSize: "42px"});
        this.pokemonFormText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonFormText);

        this.pokemonCandyOverlayIcon = this.scene.add.sprite(4.5, 18, "candy_overlay");
        this.pokemonCandyOverlayIcon.setScale(0.5);
        this.pokemonCandyOverlayIcon.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonCandyOverlayIcon);

        this.pokemonCandyDarknessOverlay = this.scene.add.sprite(4.5 - 4, 18 - 6, "items", "candy");
        this.pokemonCandyDarknessOverlay.setScale(0.5);
        this.pokemonCandyDarknessOverlay.setOrigin(0, 0);
        this.pokemonCandyDarknessOverlay.setTint(0x000000);
        this.pokemonCandyDarknessOverlay.setAlpha(0.50);
        this.pokemonCandyDarknessOverlay.setInteractive(new Phaser.Geom.Rectangle(0, 0, 16, 16), Phaser.Geom.Rectangle.Contains);
        this.starterSelectContainer.add(this.pokemonCandyDarknessOverlay);

        this.pokemonCandyCountText = addTextObject(this.scene, 14, 18, "x0", TextStyle.SUMMARY, {fontSize: "56px"});
        this.pokemonCandyCountText.setOrigin(0, 0);
        this.starterSelectContainer.add(this.pokemonCandyCountText);

        this.pokemonCaughtHatchedContainer = this.scene.add.container(2.5, 26.5);
        this.pokemonCaughtHatchedContainer.setScale(0.5);
        this.starterSelectContainer.add(this.pokemonCaughtHatchedContainer);

        this.pokemonCaughtIcon = this.scene.add.sprite(3.5, 3, "items", "pb");
        this.pokemonCaughtIcon.setOrigin(0.15, 0.2);
        this.pokemonCaughtIcon.setScale(0.71);
        this.pokemonCaughtHatchedContainer.add(this.pokemonCaughtIcon);

        this.pokemonCaughtCountText = addTextObject(this.scene, 24, 4, "0", TextStyle.SUMMARY);
        this.pokemonCaughtCountText.setOrigin(0, 0);
        this.pokemonCaughtHatchedContainer.add(this.pokemonCaughtCountText);

        this.pokemonHatchedIcon = this.scene.add.sprite(1, 14, "egg_icons");
        this.pokemonHatchedIcon.setOrigin(0.15, 0.2);
        this.pokemonHatchedIcon.setScale(0.8);
        this.pokemonCaughtHatchedContainer.add(this.pokemonHatchedIcon);

        this.pokemonFusionDnaIcon = null as any;
        this.pokemonFusionPartnerIcon = null as any;

        this.pokemonShinyIcon = this.scene.add.sprite(14, 76, "shiny_icons");
        this.pokemonShinyIcon.setOrigin(0.15, 0.2);
        this.pokemonShinyIcon.setScale(1);
        this.pokemonCaughtHatchedContainer.add((this.pokemonShinyIcon));

        this.pokemonHatchedCountText = addTextObject(this.scene, 24, 19, "0", TextStyle.SUMMARY);
        this.pokemonHatchedCountText.setOrigin(0, 0);
        this.pokemonCaughtHatchedContainer.add(this.pokemonHatchedCountText);

        this.pokemonMovesContainer = this.scene.add.container(102, 16);
        this.pokemonMovesContainer.setScale(0.5);

        for (let m = 0; m < 4; m++) {
            const moveContainer = this.scene.add.container(0, 14 * m);

            const moveBg = this.scene.add.nineslice(0, 0, "type_bgs", "unknown", 92, 14, 2, 2, 2, 2);
            moveBg.setOrigin(1, 0);

            const moveLabel = addTextObject(this.scene, -moveBg.width / 2, 0, "-", TextStyle.PARTY);
            moveLabel.setOrigin(0.5, 0);

            this.pokemonMoveBgs.push(moveBg);
            this.pokemonMoveLabels.push(moveLabel);

            moveContainer.add(moveBg);
            moveContainer.add(moveLabel);

            this.pokemonMoveContainers.push(moveContainer);
            this.pokemonMovesContainer.add(moveContainer);
        }

        this.pokemonAdditionalMoveCountLabel = addTextObject(this.scene, -this.pokemonMoveBgs[0].width / 2, 56, "(+0)", TextStyle.PARTY);
        this.pokemonAdditionalMoveCountLabel.setOrigin(0.5, 0);

        this.pokemonMovesContainer.add(this.pokemonAdditionalMoveCountLabel);

        this.starterSelectContainer.add(this.pokemonMovesContainer);

        this.pokemonEggMovesContainer = this.scene.add.container(102, 85);
        this.pokemonEggMovesContainer.setScale(0.375);

        const eggMovesLabel = addTextObject(this.scene, -46, 0, i18next.t("starterSelectUiHandler:eggMoves"), TextStyle.SUMMARY);
        eggMovesLabel.setOrigin(0.5, 0);

        this.pokemonEggMovesContainer.add(eggMovesLabel);

        for (let m = 0; m < 4; m++) {
            const eggMoveContainer = this.scene.add.container(0, 16 + 14 * m);

            const eggMoveBg = this.scene.add.nineslice(0, 0, "type_bgs", "unknown", 92, 14, 2, 2, 2, 2);
            eggMoveBg.setOrigin(1, 0);

            const eggMoveLabel = addTextObject(this.scene, -eggMoveBg.width / 2, 0, "???", TextStyle.PARTY);
            eggMoveLabel.setOrigin(0.5, 0);

            this.pokemonEggMoveBgs.push(eggMoveBg);
            this.pokemonEggMoveLabels.push(eggMoveLabel);

            eggMoveContainer.add(eggMoveBg);
            eggMoveContainer.add(eggMoveLabel);

            this.pokemonEggMoveContainers.push(eggMoveContainer);

            this.pokemonEggMovesContainer.add(eggMoveContainer);
        }

        this.starterSelectContainer.add(this.pokemonEggMovesContainer);
        const instructionTextSize = textSettings.instructionTextSize;

        this.instructionsContainer = this.scene.add.container(4, 156);
        this.instructionsContainer.setVisible(true);
        this.starterSelectContainer.add(this.instructionsContainer);
        this.shinyIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "R.png");
        this.shinyIconElement.setName("sprite-shiny-icon-element");
        this.shinyIconElement.setScale(0.625);
        this.shinyIconElement.setOrigin(0.0, 0.0);
        this.shinyLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, i18next.t("starterSelectUiHandler:cycleShiny"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.shinyLabel.setName("text-shiny-label");
        this.shinyLabel.setInteractive({ useHandCursor: true });
        this.shinyLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.CYCLE_SHINY); });

        this.formIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "F.png");
        this.formIconElement.setName("sprite-form-icon-element");
        this.formIconElement.setScale(0.625);
        this.formIconElement.setOrigin(0.0, 0.0);
        this.formLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, i18next.t("starterSelectUiHandler:cycleForm"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.formLabel.setName("text-form-label");
        this.formLabel.setInteractive({ useHandCursor: true });
        this.formLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.CYCLE_FORM); });

        this.genderIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "G.png");
        this.genderIconElement.setName("sprite-gender-icon-element");
        this.genderIconElement.setScale(0.625);
        this.genderIconElement.setOrigin(0.0, 0.0);
        this.genderLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, i18next.t("starterSelectUiHandler:cycleGender"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.genderLabel.setName("text-gender-label");
        this.genderLabel.setInteractive({ useHandCursor: true });
        this.genderLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.CYCLE_GENDER); });

        this.abilityIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "E.png");
        this.abilityIconElement.setName("sprite-ability-icon-element");
        this.abilityIconElement.setScale(0.625);
        this.abilityIconElement.setOrigin(0.0, 0.0);
        this.abilityLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, i18next.t("starterSelectUiHandler:cycleAbility"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.abilityLabel.setName("text-ability-label");
        this.abilityLabel.setInteractive({ useHandCursor: true });
        this.abilityLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.CYCLE_ABILITY); });

        this.natureIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "N.png");
        this.natureIconElement.setName("sprite-nature-icon-element");
        this.natureIconElement.setScale(0.625);
        this.natureIconElement.setOrigin(0.0, 0.0);
        this.natureLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, i18next.t("starterSelectUiHandler:cycleNature"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.natureLabel.setName("text-nature-label");
        this.natureLabel.setInteractive({ useHandCursor: true });
        this.natureLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.CYCLE_NATURE); });

        this.variantIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "V.png");
        this.variantIconElement.setName("sprite-variant-icon-element");
        this.variantIconElement.setScale(0.625);
        this.variantIconElement.setOrigin(0.0, 0.0);
        this.variantLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, i18next.t("starterSelectUiHandler:cycleVariant"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.variantLabel.setName("text-variant-label");
        this.variantLabel.setInteractive({ useHandCursor: true });
        this.variantLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.CYCLE_VARIANT); });

        this.fusionIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "U.png");
        this.fusionIconElement.setName("sprite-fusion-icon-element");
        this.fusionIconElement.setScale(0.625);
        this.fusionIconElement.setOrigin(0.0, 0.0);
        this.fusionLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, i18next.t("starterSelectUiHandler:cycleFusion"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.fusionLabel.setName("text-fusion-label");
        this.fusionLabel.setInteractive({ useHandCursor: true });
        this.fusionLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.CYCLE_FUSION); });

        this.voidexIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "P.png");
        this.voidexIconElement.setName("sprite-voidex-icon-element");
        this.voidexIconElement.setScale(0.625);
        this.voidexIconElement.setOrigin(0.0, 0.0);
        this.voidexLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, ": " + i18next.t("pokedex:voidex"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.voidexLabel.setColor(this.getTextColor(TextStyle.SUMMARY_GOLD));
        this.voidexLabel.setShadowColor(this.getTextColor(TextStyle.SUMMARY_GOLD, true));
        this.voidexLabel.setName("text-voidex-label");
        this.voidexLabel.setInteractive({ useHandCursor: true });
        this.voidexLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.VOIDEX); });

        this.signatureIconElement = new Phaser.GameObjects.Sprite(this.scene, this.instructionRowX, this.instructionRowY, "keyboard", "H.png");
        this.signatureIconElement.setName("sprite-signature-icon-element");
        this.signatureIconElement.setScale(0.625);
        this.signatureIconElement.setOrigin(0.0, 0.0);
        this.signatureLabel = addTextObject(this.scene, this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY, `: ${i18next.t("starterSelectUiHandler:signatureLabel")}`, TextStyle.PARTY, {fontSize: instructionTextSize});
        this.signatureLabel.setColor(this.getTextColor(TextStyle.SUMMARY_GOLD));
        this.signatureLabel.setShadowColor(this.getTextColor(TextStyle.SUMMARY_GOLD, true));
        this.signatureLabel.setName("text-signature-label");
        this.signatureLabel.setInteractive({ useHandCursor: true });
        this.signatureLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.TOGGLE_SIGNATURE); });

        this.goFilterIconElement = new Phaser.GameObjects.Sprite(this.scene, this.filterInstructionRowX, this.filterInstructionRowY, "keyboard", "C.png");
        this.goFilterIconElement.setName("sprite-goFilter-icon-element");
        this.goFilterIconElement.setScale(0.625);
        this.goFilterIconElement.setOrigin(0.0, 0.0);
        this.goFilterLabel = addTextObject(this.scene, this.filterInstructionRowX + this.instructionRowTextOffset, this.filterInstructionRowY, i18next.t("starterSelectUiHandler:goFilter"), TextStyle.PARTY, {fontSize: instructionTextSize});
        this.goFilterLabel.setName("text-goFilter-label");
        this.goFilterLabel.setInteractive({ useHandCursor: true });
        this.goFilterLabel.on("pointerdown", (pointer: Phaser.Input.Pointer) => { if (!isPrimaryPointer(pointer)) return; if (this.isPointerInputBlocked()) return; this.processInput(Button.STATS); });

        this.hideInstructions();

        this.filterInstructionsContainer = this.scene.add.container(50, 5);
        this.filterInstructionsContainer.setVisible(true);
        this.starterSelectContainer.add(this.filterInstructionsContainer);

        this.starterSelectMessageBoxContainer = this.scene.add.container(0, this.scene.game.canvas.height / 6);
        this.starterSelectMessageBoxContainer.setVisible(false);
        this.starterSelectContainer.add(this.starterSelectMessageBoxContainer);

        this.starterSelectMessageBox = addWindow(this.scene, 1, -1, 318, 28);
        this.starterSelectMessageBox.setOrigin(0, 1);
        this.starterSelectMessageBoxContainer.add(this.starterSelectMessageBox);

        injectWindowCorners(this.scene, this.starterSelectMessageBox, this.starterSelectMessageBoxContainer, true);

        this.message = addTextObject(this.scene, 8, 8, "", TextStyle.WINDOW);
        this.message.setOrigin(0, 0);
        this.starterSelectMessageBoxContainer.add(this.message);

        this.statsContainer = new StatsContainer(this.scene, 6, 16);

        this.scene.add.existing(this.statsContainer);

        this.statsContainer.setVisible(false);

        this.starterSelectContainer.add(this.statsContainer);
        const overlayScale = 1;
        this.moveInfoOverlay = new MoveInfoOverlay(this.scene, {
            scale: overlayScale,
            top: true,
            x: 1,
            y: this.scene.game.canvas.height / 6 - MoveInfoOverlay.getHeight(overlayScale) - 29,
        });
        this.starterSelectContainer.add(this.moveInfoOverlay);
        this.starterSelectContainer.bringToTop(this.filterBarContainer);

        this.scene.eventTarget.addEventListener(BattleSceneEventType.CANDY_UPGRADE_NOTIFICATION_CHANGED, (e) => this.onCandyUpgradeDisplayChanged(e));

        this.updateInstructions();
    }

    applyStarterPortal(species: PokemonSpecies): void {
      if (!this.starterPortalSprite) return;
      if (species?.generation !== 20) {
        this.starterPortalSprite.setVisible(false);
        return;
      }
      const spriteKey = species.getSpriteKey(false);
      const _rawSpriteState = this.scene.cache.json.exists(spriteKey)
        ? this.scene.cache.json.get(spriteKey)?.spriteState ?? null
        : null;
      const _portalOvr = YU_SPECIES_PORTAL_IMAGE_OVERRIDE[species.speciesId];
      const spriteState = _rawSpriteState && _portalOvr ? { ..._rawSpriteState, portal: _portalOvr } : _rawSpriteState;
      if (!spriteState?.portal) {
        this.starterPortalSprite.setVisible(false);
        return;
      }
      const stem = spriteState.portal.replace(/\.png$/i, "");
      const textureKey = `yu_portal_${stem}`;
      if (!this.scene.textures.exists(textureKey)) {
        this.starterPortalSprite.setVisible(false);
        return;
      }
      const basis = this.pokemonSprite.frame?.width;
      if (!basis || basis <= 1) return;
      this.starterPortalSprite.setTexture(textureKey);
      const STARTER_FEET_Y = 96;
      const _portalFit = YU_BATTLE_FIT * YU_PLAYER_FIT_MULT;
      const stateScale = spriteState.scale ?? 1;
      const frameHeight = this.pokemonSprite.frame?.height || 1;
      const portalNativeW = this.starterPortalSprite.frame?.width || 195;
      const portalNativeH = this.starterPortalSprite.frame?.height || 50;
      const portalSorterW = (spriteState.portalScale ?? 1) * basis;
      const portalSorterX = (spriteState.portalX ?? 0) * basis;
      const portalSorterY = (spriteState.portalY ?? 0) * basis;
      const portalSorterH = portalSorterW * (portalNativeH / portalNativeW);
      const sorterX = (spriteState.x ?? 0) * basis;
      const sorterY = (spriteState.y ?? 0) * basis;
      const displayH = stateScale * frameHeight;
      const displayW = stateScale * basis;
      const feetDeltaY = ((portalSorterY + portalSorterH) - (sorterY + displayH)) / stateScale;
      const centerDeltaX = ((portalSorterX - portalSorterW / 2) - (sorterX - displayW / 2)) / stateScale;
      const portalChildScale = portalSorterW / (portalNativeW * stateScale);
      const posScale = stateScale * _portalFit;
      this._stBasePortalScale = portalChildScale * posScale;
      this._stBasePortalX = this._stBaseCreatureX + centerDeltaX * posScale;
      const _stTuning = getYuTuning();
      const _stD = StarterSelectUiHandler.ST_DEFAULT_OFFSETS;
      const localOffsets = this._lastTweakOffsets;
      const localPortalScale = localOffsets?.portalScaleOffset ?? 0;
      const localYOffset = localOffsets?.yOffset ?? 0;
      const localXOffset = localOffsets?.xOffset ?? 0;
      const finalScale = this._stBasePortalScale + _stTuning.portalScaleOffset + _stD.portalScaleOffset + localPortalScale;
      const growthBottom = this.pokemonGrowthRateLabelText.y + Math.max(this.pokemonGrowthRateLabelText.displayHeight, 7);
      this._stBasePortalY = growthBottom + 1 + (portalNativeH * Math.abs(finalScale));
      const _stPortalOffsets = YU_SPECIES_PORTAL_OFFSETS[species.speciesId];
      if (_stPortalOffsets) {
        this._stBasePortalX += _stPortalOffsets.portalDeltaX ?? 0;
        this._stBasePortalY += _stPortalOffsets.portalDeltaY ?? 0;
      }
      let _stPortalX = this._stBasePortalX + _stTuning.xOffset + _stD.xOffset + localXOffset;
      let _stPortalY = this._stBasePortalY + _stTuning.yOffset + _stD.yOffset + localYOffset;
      const portalHalfW = (portalNativeW * Math.abs(finalScale)) / 2;
      const leftBound = 0;
      if (_stPortalX - portalHalfW < leftBound) {
        const shift = (leftBound - (_stPortalX - portalHalfW)) + 2;
        _stPortalX += shift;
        if (this.pokemonSprite) this.pokemonSprite.x += shift;
      }
      this.starterPortalSprite.setScale(finalScale);
      this.starterPortalSprite.setPosition(_stPortalX, _stPortalY);
      this.starterPortalSprite.setFlipX(!(spriteState.portalFlipped ?? false));
      this.starterPortalSprite.setVisible(true);
      yuTuningLog("StarterSelect", "portal", { _stPortalX, _stPortalY, finalScale, posScale });
    }

    show(args: any[]): boolean {
        if (!this.starterPreferences) {
            this.starterPreferences = StarterPrefs.load();
        }
        (this.scene as BattleScene).ui.setReplayHudSuppressed(true);
        (this.scene as BattleScene).ui.hideTooltip();
        this._summaryTooltipDeferred = true;
        if (this._summaryDeferArm) {
          this.scene.input.off("pointermove", this._summaryDeferArm);
        }
        this._summaryDeferArm = () => {
          this._summaryTooltipDeferred = false;
          this.scene.input.off("pointermove", this._summaryDeferArm!);
          this._summaryDeferArm = null;
        };
        this.scene.input.on("pointermove", this._summaryDeferArm);
        this.moveInfoOverlay.clear();

        this._wheelHandler = (_p: Phaser.Input.Pointer, _g: any, _dx: number, dy: number) => {
          if (this._stUiTweakActive || this.blockInput || this.filterMode || (this.scene as BattleScene).ui.getMode() !== this.getMode()) return;
          const maxColumns = 9;
          const numOfRows = Math.ceil(this.filteredStarterContainers.length / maxColumns);
          const maxScroll = Math.max(0, numOfRows - 9);
          if (dy > 0 && this.scrollCursor < maxScroll) {
            this.scrollCursor++;
            this.updateScroll();
          } else if (dy < 0 && this.scrollCursor > 0) {
            this.scrollCursor--;
            this.updateScroll();
          }
        };
        this.scene.input.on("wheel", this._wheelHandler);

        const rowHeight = 18;
        this._gridDragMoveHandler = (p: Phaser.Input.Pointer) => {
          if (this._gridDragStartY === null) return;
          if (this.isPointerInputBlocked()) { this._gridDragStartY = null; return; }
          const delta = p.y - this._gridDragStartY;
          if (Math.abs(delta) >= rowHeight) {
            const maxColumns = 9;
            const numOfRows = Math.ceil(this.filteredStarterContainers.length / maxColumns);
            const maxScroll = Math.max(0, numOfRows - 9);
            const rows = Math.trunc(delta / rowHeight);
            const newScroll = Math.max(0, Math.min(maxScroll, this.scrollCursor - rows));
            if (newScroll !== this.scrollCursor) {
              this.scrollCursor = newScroll;
              this.updateScroll();
            }
            this._gridDragStartY = p.y;
          }
        };
        this._gridDragUpHandler = () => {
          this._gridDragStartY = null;
        };
        this.scene.input.on("pointermove", this._gridDragMoveHandler);
        this.scene.input.on("pointerup", this._gridDragUpHandler);
        this.pokerusSpecies = getPokerusStarters(this.scene);

        if (Overrides.STARTER_SELECT_TWEAK_TOOL_OVERRIDE && !this._stUiTweakKeyHHandler) {
          this._stUiTweakKeyHHandler = (event?: KeyboardEvent) => {
            if (event?.repeat) return;
            const wasActive = this._stUiMetaMode !== TweakMetaMode.NONE;
            if (!wasActive) {
              (this.scene as BattleScene).uiEditModeActive = true;
            }
            this._stUiMetaMode = cycleMetaMode(this._stUiMetaMode, TWEAK_META_CYCLE);
            const isActive = this._stUiMetaMode !== TweakMetaMode.NONE;
            this.updateStUiTweakHUD();
            if (isActive && !wasActive) {
              this.setupStUiTweakKeyListeners();
              this._stUiTweakBaselines.clear();
              for (let i = 0; i < StarterSelectUiHandler.ST_UI_TWEAK_ASSETS.length; i++) {
                const t = this.getStUiTweakTarget(i);
                if (t) {
                  this._stUiTweakBaselines.set(StarterSelectUiHandler.ST_UI_TWEAK_ASSETS[i], {
                    x: t.x ?? 0, y: t.y ?? 0,
                    scaleX: t.scaleX ?? 1, scaleY: t.scaleY ?? 1,
                    displayWidth: t.displayWidth ?? 0, displayHeight: t.displayHeight ?? 0,
                    alpha: t.alpha ?? 1,
                  });
                }
              }
              this._stUiDropdownPanel = new TweakDropdownPanel({
                scene: this.scene as BattleScene,
                getAnchorGameCoords: () => ({ x: 240, y: 5 }),
                elements: [...StarterSelectUiHandler.ST_UI_TWEAK_ASSETS],
                modes: [...StarterSelectUiHandler.ST_UI_TWEAK_MODES],
                coordSpace: "logical",
                alphabeticalSort: true,
                onElementChange: (name: string, idx: number) => {
                  this._stUiTweakAssetIndex = idx;
                  this.updateStUiTweakHUD();
                },
                onModeChange: (name: string, idx: number) => {
                  this._stUiTweakMode = idx;
                  this.updateStUiTweakHUD();
                },
              });
              this._stUiDropdownPanel.create();
            } else if (!isActive && wasActive) {
              (this.scene as BattleScene).uiEditModeActive = false;
              this.cleanupStUiTweakKeyListeners();
              this._stUiTweakBaselines.clear();
              if (this._stUiDropdownPanel) {
                this._stUiDropdownPanel.destroy();
                this._stUiDropdownPanel = null;
              }
            }
          };
          this.scene.input.keyboard?.on("keydown-H", this._stUiTweakKeyHHandler);
        }

        if (!args?.length) {
            super.show(args);
            this.starterSelectContainer.setVisible(true);
            return true;
        }

        this.championAvailableSpecies = undefined;
        this.filteredStarters = undefined;
        this.championFilterConfig = undefined;
        this.championOnStarterSelected = undefined;
        this.championOnCancel = undefined;
		if (args.length >= 1 && !(args[0] instanceof Function) && typeof args[0] === 'object') {
			const config = args[0] as ChampionFilterConfig;
			this.championFilterConfig = config;
			if (config?.availableStarters?.length) {
				try {
					this.filteredStarters = new Set(config.availableStarters as Species[]);
					this.championAvailableSpecies = new Set(config.availableStarters as Species[]);
				} catch {}
			}
			if (typeof config?.onStarterSelected === 'function') {
				this.championOnStarterSelected = config.onStarterSelected as (s: Species) => void;
			}
			if (typeof config?.onCancel === 'function') {
				this.championOnCancel = config.onCancel as () => void;
			}
			if (!this.originalAllSpecies) {
				this.originalAllSpecies = (this.allSpecies || []).slice();
			}

			this.applyChampionStarterFilter();
			super.show([]);
			this.starterSelectContainer.setVisible(true);

			this.allSpecies.forEach((species, s) => {
				const icon = this.starterContainers[s].icon;
				const dexEntry = this.scene.gameData.dexData[species.speciesId];
				this.starterPreferences[species.speciesId] = this.initStarterPrefs(species);

				const isChampionAvailable = this.championAvailableSpecies?.has(species.speciesId as unknown as Species);

				if (dexEntry.caughtAttr || isChampionAvailable) {
					icon.clearTint();
				} else if (dexEntry.seenAttr && this.getMode() !== Mode.EGG_STARTER_SELECT) {
					icon.setTint(0x808080);
				}
				this.setUpgradeAnimation(icon, species);
			});

			this.resetFilters();
			this.updateStarters();

			this.isInitialCursorSet = true;
			this.setFilterMode(false);
			this.filterBarCursor = 0;
			this.setCursor(0);
			this.tryUpdateValue(0);
			this.isInitialCursorSet = false;

			handleTutorial(this.scene, Tutorial.Starter_Select);

			return true;
		}

		if (args.length >= 1 && args[0] instanceof Function) {

			const maybeConfig = args.length >= 2 && args[1] && typeof args[1] === 'object' ? (args[1] as ChampionFilterConfig) : undefined;
			if (maybeConfig) {
				this.championFilterConfig = maybeConfig;
				if (maybeConfig?.availableStarters?.length) {
					try {
						this.filteredStarters = new Set(maybeConfig.availableStarters as Species[]);
						this.championAvailableSpecies = new Set(maybeConfig.availableStarters as Species[]);
					} catch {}
				}
				if (!this.originalAllSpecies) {
					this.originalAllSpecies = (this.allSpecies || []).slice();
				}
				this.applyChampionStarterFilter();
			}

            super.show(args);
            this.starterSelectCallback = args[0] as StarterSelectCallback;

            this.starterSelectContainer.setVisible(true);

            this.allSpecies.forEach((species, s) => {
                const icon = this.starterContainers[s].icon;
                const dexEntry = this.scene.gameData.dexData[species.speciesId];
                this.starterPreferences[species.speciesId] = this.initStarterPrefs(species);

                const isChampionAvailable = this.championAvailableSpecies?.has(species.speciesId as unknown as Species);

                if (dexEntry.caughtAttr || isChampionAvailable) {
                    icon.clearTint();
                } else if (dexEntry.seenAttr && this.getMode() !== Mode.EGG_STARTER_SELECT) {
                    icon.setTint(0x808080);
                }

                this.setUpgradeAnimation(icon, species);
            });

            this.resetFilters();
			this.updateStarters();

            this.isInitialCursorSet = true;
            this.setFilterMode(false);
            this.filterBarCursor = 0;
            this.setCursor(0);
            this.tryUpdateValue(0);
            this.isInitialCursorSet = false;

            handleTutorial(this.scene, Tutorial.Starter_Select);

            if (this.championFilterConfig) {
                const starterTutorials: EnhancedTutorial[] = [];
                const championId = this.scene.gameData.selectedChampionId;

                if (starterTutorials.length > 0) {
                    this.scene.gameData.tutorialService.showCombinedTutorial("", starterTutorials, true, false, true);
                }
            }

            return true;
        }

        return false;
    }
	private applyChampionStarterFilter(): void {
		const poolSize = this.filteredStarters?.size ?? 0;
		if (poolSize) {
			this.championAvailableSpecies = new Set(this.filteredStarters);
		}
	}

	private rebuildStarterContainersFromAllSpecies(): void {

		this.updateStarters();
	}

	private isSignaturePokemon(speciesId: Species): boolean {
		const championId = this.scene.gameData.selectedChampionId;
		if (!championId) return false;
		const dataKey = (championId === "apollo" || championId === "diana") ? "apollo_diana" : championId;
		const championData = (this.scene.gameData as any).championData?.[dataKey];
		if (!championData) return false;

		const inBaseList = championData.signaturePokemon?.includes(speciesId) || false;

		const unlockedSignatures = (championData as any).unlockedSignaturePokemon as Species[] | undefined;
		const inUnlockedList = unlockedSignatures?.includes(speciesId) || false;

		return inBaseList || inUnlockedList;
	}

	private getSignatureAltBuildId(speciesId: Species): PokemonAltBuildId | null {
		if (!this.isSignaturePokemon(speciesId)) return null;

		const championId = this.scene.gameData.selectedChampionId;
		const dataKey = (championId === "apollo" || championId === "diana") ? "apollo_diana" : championId;
		const championData = (this.scene.gameData as any).championData?.[dataKey];
		if (!championData) return null;

		return ChampionUtils.getSignatureAltBuildId(speciesId, championData);
	}

	private isEffectivelySignature(speciesId: Species): boolean {
		return this.isSignaturePokemon(speciesId) && this.signatureModeActive && !this.fusionsFilterActive;
	}

	private refreshSignatureDisplay(): void {
		const species = this.lastSpecies;
		if (!species) return;

		const isSignature = this.isEffectivelySignature(species.speciesId as unknown as Species);

		if (isSignature) {
			const altBuildId = this.getSignatureAltBuildId(species.speciesId as unknown as Species);
			const signatureName = altBuildId
				? ChampionUtils.getAltBuildDisplayName(altBuildId)
				: i18next.t("starterSelectUiHandler:signatureLabel");
			this.fitPokemonNameToWidth(signatureName, species);
		} else {
			this.fitPokemonNameToWidth(species.name, species);
		}

		const container = this.filteredStarterContainers.find(c => c.species === species);
		if (container) {
			this.updateStarterValueLabel(container);
			if (isSignature) {
				if (container.icon.postFX && typeof container.icon.postFX.addColorMatrix === 'function') {
					container.icon.postFX.clear();
					const colorMatrix = container.icon.postFX.addColorMatrix();
					colorMatrix.negative();
				}
			} else {
				if (container.icon.postFX) {
					container.icon.postFX.clear();
				}
			}
		}
		this.tryUpdateValue();
		this.updateInstructions();
	}

	private getActualStarterValue(speciesId: Species, partyIndex?: number): number {
		let isSignature: boolean;
		if (partyIndex !== undefined && partyIndex >= 0 && partyIndex < this.starterSignatureFlags.length) {
			isSignature = this.isSignaturePokemon(speciesId) && this.starterSignatureFlags[partyIndex] && !this.fusionsFilterActive;
		} else {
			isSignature = this.isEffectivelySignature(speciesId);
		}
		if (isSignature) {
			let value: number = 6;
			const vr = this.scene.gameData.starterData[speciesId as unknown as number]?.valueReduction ?? 0;
			for (let v = 0; v < vr; v++) {
				value = value > 1 ? value - 1 : value / 2;
			}
			return value;
		}
		return this.scene.gameData.getSpeciesStarterValue(speciesId);
	}
    initStarterPrefs(species: PokemonSpecies): StarterAttributes {
        const starterAttributes = this.starterPreferences[species.speciesId];
        const dexEntry = this.scene.gameData.dexData[species.speciesId];
        const starterData = this.scene.gameData.starterData[species.speciesId];
        if (!starterAttributes || !dexEntry.caughtAttr) {
            return {};
        }

        const caughtAttr = dexEntry.caughtAttr;

        const hasShiny = caughtAttr & DexAttr.SHINY;
        const hasNonShiny = caughtAttr & DexAttr.NON_SHINY;
        if (starterAttributes.shiny && !hasShiny) {

            delete starterAttributes.shiny;
            delete starterAttributes.variant;
        } else if (starterAttributes.shiny === false && !hasNonShiny) {

            delete starterAttributes.shiny;
        }

        if (starterAttributes.variant !== undefined && !isNaN(starterAttributes.variant)) {
            const unlockedVariants = [
                hasNonShiny,
                hasShiny && caughtAttr & DexAttr.DEFAULT_VARIANT,
                hasShiny && caughtAttr & DexAttr.VARIANT_2,
                hasShiny && caughtAttr & DexAttr.VARIANT_3
            ];
            if (!unlockedVariants[starterAttributes.variant + 1]) {

                delete starterAttributes.variant;
            }
        }

        if (starterAttributes.female !== undefined) {
            if (!(starterAttributes.female ? caughtAttr & DexAttr.FEMALE : caughtAttr & DexAttr.MALE)) {

                delete starterAttributes.female;
            }
        }

        if (starterAttributes.ability !== undefined) {
            const speciesHasSingleAbility = species.ability2 === species.ability1;
            const abilityAttr = starterData.abilityAttr;
            const hasAbility1 = abilityAttr & AbilityAttr.ABILITY_1;
            const hasAbility2 = abilityAttr & AbilityAttr.ABILITY_2;
            const hasHiddenAbility = abilityAttr & AbilityAttr.ABILITY_HIDDEN;
            const unlockedAbilities = [
                hasAbility1,
                speciesHasSingleAbility ? hasAbility2 && !hasAbility1 : hasAbility2,
                hasHiddenAbility
            ];
            if (!unlockedAbilities[starterAttributes.ability]) {

                delete starterAttributes.ability;
            }
        }

        const selectedForm = starterAttributes.form;
        if (selectedForm !== undefined && (!species.forms[selectedForm]?.isStarterSelectable || !(caughtAttr & this.scene.gameData.getFormAttr(selectedForm)))) {

            delete starterAttributes.form;
        }

        if (starterAttributes.nature !== undefined) {
            const unlockedNatures = this.scene.gameData.getNaturesForAttr(dexEntry.natureAttr);
            if (unlockedNatures.indexOf(starterAttributes.nature as unknown as Nature) < 0) {

                delete starterAttributes.nature;
            }
        }
        if (starterAttributes.fusion !== undefined) {
            const obtainedFusions = this.scene.gameData.starterData[species.speciesId].obtainedFusions;
            if (starterAttributes.fusion >= obtainedFusions.length) {

                delete starterAttributes.fusion;
            }
        }

        return starterAttributes;
    }
    resetFilters(): void {
        const caughtDropDown: DropDown = this.filterBar.getFilter(DropDownColumn.CAUGHT);

        this.filterBar.setValsToDefault();

        for (let i = 0; i < caughtDropDown.options.length; i++) {
            if (caughtDropDown.options[i].val !== "ALL" && caughtDropDown.options[i].val !== "UNCAUGHT") {
                caughtDropDown.toggleOptionState(i);
            }
        }
    }

    showText(text: string, delay?: integer, callback?: Function, callbackDelay?: integer, prompt?: boolean, promptDelay?: integer) {
        super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);

        if (text?.indexOf("\n") === -1) {
            this.starterSelectMessageBox.setSize(318, 28);
            this.message.setY(-22);
        } else {
            this.starterSelectMessageBox.setSize(318, 42);
            this.message.setY(-37);
        }

        const isVisible = !!text?.length;
        this.starterSelectMessageBoxContainer.setVisible(isVisible);
        if (isVisible && !this._starterMessagePattern) {
            this._starterMessagePattern = attachModalBackground(
                this.scene,
                this.starterSelectMessageBoxContainer,
                () => ({ bgX: this.starterSelectMessageBox.x, bgY: this.starterSelectMessageBox.y - this.starterSelectMessageBox.height, bgWidth: this.starterSelectMessageBox.width, bgHeight: this.starterSelectMessageBox.height }),
                { mask: false, alphaMultiplier: 0.5, getTarget: () => this.starterSelectMessageBox }
            );
        } else if (!isVisible && this._starterMessagePattern) {
            this._starterMessagePattern.clear();
            this._starterMessagePattern = null;
        }
    }
    isUpgradeIconEnabled(): boolean {
        return this.scene.candyUpgradeNotification !== 0 && this.scene.candyUpgradeDisplay === 0;
    }
    isUpgradeAnimationEnabled(): boolean {
        return this.scene.candyUpgradeNotification !== 0 && this.scene.candyUpgradeDisplay === 1;
    }
    isPassiveAvailable(speciesId: number): boolean {

        const starterData = this.scene.gameData.starterData[speciesId];

        return starterData.candyCount >= getPassiveCandyCount(speciesStarters[speciesId])
            && !(starterData.passiveAttr & PassiveAttr.UNLOCKED);
    }
    isValueReductionAvailable(speciesId: number): boolean {
        const starterData = this.scene.gameData.starterData[speciesId];
        const isSignature = this.isEffectivelySignature(speciesId as unknown as Species);
        const requiredCandy = isSignature ? 1000 : getValueReductionCandyCounts(speciesStarters[speciesId])[starterData.valueReduction];
        return starterData.candyCount >= requiredCandy
            && starterData.valueReduction < valueReductionMax;
    }
    isSameSpeciesEggAvailable(speciesId: number): boolean {
        if (!this.scene.duelmonsEnabledForRun && getPokemonSpecies(speciesId).generation === 20) return false;
        const starterData = this.scene.gameData.starterData[speciesId];

        return starterData.candyCount >= getSameSpeciesEggCandyCounts(speciesStarters[speciesId]);
    }
    setUpgradeAnimation(icon: Phaser.GameObjects.Sprite, species: PokemonSpecies, startPaused: boolean = false): void {
        this.scene.tweens.killTweensOf(icon);

        if (this.scene.candyUpgradeDisplay === 0 || species.speciesId !== species.getRootSpeciesId(false)) {
            return;
        }

        icon.y = 2;

        const tweenChain: Phaser.Types.Tweens.TweenChainBuilderConfig = {
            targets: icon,
            loop: -1,

            delay: Utils.randIntRange(0, 50) * 5,
            loopDelay: 1000,
            tweens: [
                {
                    targets: icon,
                    y: 2 - 5,
                    duration: Utils.fixedInt(125),
                    ease: "Cubic.easeOut",
                    yoyo: true
                },
                {
                    targets: icon,
                    y: 2 - 3,
                    duration: Utils.fixedInt(150),
                    ease: "Cubic.easeOut",
                    yoyo: true
                }
            ],
        };

        const isPassiveAvailable = this.isPassiveAvailable(species.speciesId);
        const isValueReductionAvailable = this.isValueReductionAvailable(species.speciesId);
        const isSameSpeciesEggAvailable = this.isSameSpeciesEggAvailable(species.speciesId);
        if (this.scene.candyUpgradeNotification === 1) {
            if (isPassiveAvailable) {
                this.scene.tweens.chain(tweenChain).paused = startPaused;
            }

        } else if (this.scene.candyUpgradeNotification === 2) {
            if (isPassiveAvailable || isValueReductionAvailable || isSameSpeciesEggAvailable) {
                this.scene.tweens.chain(tweenChain).paused = startPaused;
            }
        }
    }
    setUpgradeIcon(starter: StarterContainer): void {
        const species = starter.species;
        const slotVisible = !!species?.speciesId;

        if (!species || this.scene.candyUpgradeNotification === 0 || species.speciesId !== species.getRootSpeciesId(false)) {
            starter.candyUpgradeIcon.setVisible(false);
            starter.candyUpgradeOverlayIcon.setVisible(false);
            return;
        }

        const isPassiveAvailable = this.isPassiveAvailable(species.speciesId);
        const isValueReductionAvailable = this.isValueReductionAvailable(species.speciesId);
        const isSameSpeciesEggAvailable = this.isSameSpeciesEggAvailable(species.speciesId);
        if (this.scene.candyUpgradeNotification === 1) {
            starter.candyUpgradeIcon.setVisible(slotVisible && isPassiveAvailable);
            starter.candyUpgradeOverlayIcon.setVisible(slotVisible && starter.candyUpgradeIcon.visible);
        } else if (this.scene.candyUpgradeNotification === 2) {
            starter.candyUpgradeIcon.setVisible(
                slotVisible && (isPassiveAvailable || isValueReductionAvailable || isSameSpeciesEggAvailable));
            starter.candyUpgradeOverlayIcon.setVisible(slotVisible && starter.candyUpgradeIcon.visible);
        }
    }
    onCandyUpgradeDisplayChanged(event: Event): void {
        const candyUpgradeDisplayEvent = event as CandyUpgradeNotificationChangedEvent;
        if (!candyUpgradeDisplayEvent) {
            return;
        }
        if (this.scene.candyUpgradeDisplay === 0) {
            this.filteredStarterContainers.forEach((starter) => {
                this.setUpgradeIcon(starter);
            });

            return;
        }
        this.filteredStarterContainers.forEach((starter, s) => {
            const icon = this.filteredStarterContainers[s].icon;

            this.setUpgradeAnimation(icon, starter.species);
        });
    }
    private addToPartyIfValid(ui: UI): void {
        const [isDupe, removeIndex] = this.isInParty(this.lastSpecies);
        const isValidForChallenge = new Utils.BooleanHolder(true);
        const isPartyValid = this.isPartyValid();

        Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_CHOICE, this.lastSpecies, isValidForChallenge, this.scene.gameData.getSpeciesDexAttrProps(this.lastSpecies, this.getCurrentDexProps(this.lastSpecies.speciesId)), isPartyValid);

        const currentPartyValue = this.starterSpecies.map(s => s.generation).reduce((total: number, gen: number, i: number) => total += this.getActualStarterValue(this.starterSpecies[i].speciesId as unknown as Species, i), 0);
        const newCost = this.getActualStarterValue(this.lastSpecies.speciesId as unknown as Species);

        if (!isDupe && isValidForChallenge.value && currentPartyValue + newCost <= this.getValueLimit() && this.starterSpecies.length < 6) {
            const isOverValueLimit = this.tryUpdateValue(this.getActualStarterValue(this.lastSpecies.speciesId as unknown as Species), true);
            if (!isDupe && isValidForChallenge.value && isOverValueLimit) {
                const cursorObj = this.starterCursorObjs[this.starterSpecies.length];
                cursorObj.setVisible(true);
                cursorObj.setPosition(this.cursorObj.x, this.cursorObj.y);
                this.addToParty(this.lastSpecies, this.dexAttrCursor, this.abilityCursor, this.natureCursor as unknown as Nature, this.starterMoveset?.slice(0) as StarterMoveset, this.fusionCursor);
                ui.playSelect();
            }
        }
        ui.setMode(this.getMode());
    }

    getStarterDetails (): {
        starterData: StarterData,
        starterAttributes: StarterAttributes,
        starterContainer: StarterContainer
    } {
        return {
            starterData: this.scene.gameData.starterData[this.lastSpecies.speciesId],
            starterAttributes: this.starterPreferences[this.lastSpecies.speciesId],
            starterContainer: !this.starterIconsCursorObj.visible
                ? this.filteredStarterContainers[this.cursor]
                : this.filteredStarterContainers[this.filteredStarterContainers.findIndex(container => container.species === this.lastSpecies)]
        }
    }

    private getVoidexPrelistOverlayArgs(): any[] {
        const focusSpeciesId = this.lastSpecies?.speciesId;
        const filteredSpecies = this.filteredStarterContainers.map(c => c.species.speciesId);
        const focusFormIndex = this.lastSpecies
            ? this.scene.gameData.getSpeciesDexAttrProps(this.lastSpecies, this.dexAttrCursor).formIndex
            : 0;

        const baseArgs: any[] = [focusSpeciesId, filteredSpecies, focusFormIndex];
        if (typeof focusSpeciesId !== "number") {
            return baseArgs;
        }

        let focusFusionSpeciesId: number | null = null;
        let focusFusionPrimaryFormIndex: number | null = null;
        let focusFusionFormIndex: number | null = null;

        if (this.pokemon?.isFusion() && this.pokemon.fusionSpecies) {
            focusFusionSpeciesId = this.pokemon.fusionSpecies.speciesId;
            focusFusionPrimaryFormIndex = this.pokemon.formIndex;
            focusFusionFormIndex = this.pokemon.fusionFormIndex;
        } else {
            if (this.fusionsFilterActive && this.lastSpecies) {
                const rootId = this.lastSpecies.getRootSpeciesId(true) as unknown as Species;
                const obtainedRoot = this.scene.gameData.starterData[rootId]?.obtainedFusions;
                const obtainedDirect = this.scene.gameData.starterData[this.lastSpecies.speciesId]?.obtainedFusions;
                const obtained = Array.isArray(obtainedRoot) ? obtainedRoot : Array.isArray(obtainedDirect) ? obtainedDirect : [];
                const first = obtained[0];
                if (typeof first === "number" && Number.isFinite(first)) {
                    focusFusionSpeciesId = first;
                    focusFusionPrimaryFormIndex = focusFormIndex;
                    focusFusionFormIndex = 0;
                }
            }
        }

        if (typeof focusFusionSpeciesId === "number" && Number.isFinite(focusFusionSpeciesId)) {
            return [...baseArgs, focusFusionSpeciesId, focusFusionPrimaryFormIndex, focusFusionFormIndex, "fusions"];
        }

        return baseArgs;
    }

    protected getPokemonSelectedOptions(): OptionItem[] {
        const ui = this.getUi();
        let options: any[] = [];

        const [isDupe, removeIndex]: [boolean, number] = this.isInParty(this.lastSpecies);

        const isPartyValid = this.isPartyValid();
        const isValidForChallenge = new Utils.BooleanHolder(true);

        Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_CHOICE, this.lastSpecies, isValidForChallenge, this.scene.gameData.getSpeciesDexAttrProps(this.lastSpecies, this.getCurrentDexProps(this.lastSpecies.speciesId)), isPartyValid);

        const currentPartyValue = this.starterSpecies.map(s => s.generation).reduce((total: number, gen: number, i: number) => total += this.getActualStarterValue(this.starterSpecies[i].speciesId as unknown as Species, i), 0);
        const newCost = this.getActualStarterValue(this.lastSpecies.speciesId as unknown as Species);
        if (!isDupe && isValidForChallenge.value && currentPartyValue + newCost <= this.getValueLimit() && this.starterSpecies.length < 6) {
            options = [
                {
                    label: i18next.t("starterSelectUiHandler:addToParty"),
                    handler: () => {
                        ui.setMode(this.getMode());
                        const isOverValueLimit = this.tryUpdateValue(this.getActualStarterValue(this.lastSpecies.speciesId as unknown as Species), true);
                        if (!isDupe && isValidForChallenge.value && isOverValueLimit) {
                            const cursorObj = this.starterCursorObjs[this.starterSpecies.length];
                            cursorObj.setVisible(true);
                            cursorObj.setPosition(this.cursorObj.x, this.cursorObj.y);

                            this.addToParty(this.lastSpecies, this.dexAttrCursor, this.abilityCursor, this.natureCursor as unknown as Nature, this.starterMoveset?.slice(0) as StarterMoveset, this.fusionCursor);
                            ui.playSelect();
                        } else {
                            ui.playError();
                        }
                        return true;
                    },
                    overrideSound: true
                }];
        } else if (isDupe) {
            options = [{
                label: i18next.t("starterSelectUiHandler:removeFromParty"),
                handler: () => {
                    this.popStarter(removeIndex);
                    ui.setMode(this.getMode());
                    return true;
                }
            }];
        }

        let { starterData, starterAttributes, starterContainer } = this.getStarterDetails();

        options.push(
            {
                label: i18next.t("starterSelectUiHandler:toggleIVs"),
                handler: () => {
                    this.toggleStatsMode();
                    ui.setMode(this.getMode());
                    return true;
                }
            });
        if (this.speciesStarterMoves.length > 1) {
            const showSwapOptions = (moveset: StarterMoveset) => {

                this.blockInput = true;

                ui.setMode(this.getMode()).then(() => {
                    ui.showText(i18next.t("starterSelectUiHandler:selectMoveSwapOut"), null, () => {
                        this.moveInfoOverlay.show(allMoves[moveset[0]]);

                        ui.setModeWithoutClear(Mode.OPTION_SELECT, {
                            options: moveset.map((m: Moves, i: number) => {
                                const option: OptionSelectItem = {
                                    label: allMoves[m].name,
                                    handler: () => {
                                        this.blockInput = true;
                                        ui.setMode(this.getMode()).then(() => {
                                            ui.showText(`${i18next.t("starterSelectUiHandler:selectMoveSwapWith")} ${allMoves[m].name}.`, null, () => {
                                                const possibleMoves = this.speciesStarterMoves.filter((sm: Moves) => sm !== m);
                                                this.moveInfoOverlay.show(allMoves[possibleMoves[0]]);

                                                ui.setModeWithoutClear(Mode.OPTION_SELECT, {
                                                    options: possibleMoves.map(sm => {

                                                        const option = {
                                                            label: allMoves[sm].name,
                                                            handler: () => {
                                                                this.switchMoveHandler(i, sm, m);
                                                                showSwapOptions(this.starterMoveset!);
                                                                return true;
                                                            },
                                                            onHover: () => {
                                                                this.moveInfoOverlay.show(allMoves[sm]);
                                                            },
                                                        };
                                                        return option;
                                                    }).concat({
                                                        label: i18next.t("menu:cancel"),
                                                        handler: () => {
                                                            showSwapOptions(this.starterMoveset!);
                                                            return true;
                                                        },
                                                        onHover: () => {
                                                            this.moveInfoOverlay.clear();
                                                        },
                                                    }),
                                                    supportHover: true,
                                                    maxOptions: 8,
                                                    yOffset: 19
                                                });
                                                this.blockInput = false;
                                            });
                                        });
                                        return true;
                                    },
                                    onHover: () => {
                                        this.moveInfoOverlay.show(allMoves[m]);
                                    },
                                };
                                return option;
                            }).concat({
                                label: i18next.t("menu:cancel"),
                                handler: () => {
                                    this.moveInfoOverlay.clear();
                                    this.clearText();
                                    ui.setMode(this.getMode());
                                    return true;
                                },
                                onHover: () => {
                                    this.moveInfoOverlay.clear();
                                },
                            }),
                            supportHover: true,
                            maxOptions: 8,
                            yOffset: 19
                        });
                        this.blockInput = false;
                    });
                });
            };
            options.push({
                label: i18next.t("starterSelectUiHandler:manageMoves"),
                handler: () => {
                    showSwapOptions(this.starterMoveset!);
                    return true;
                }
            });
        }
        const showFusionOptions = () => {
            this.blockInput = true;

            ui.setMode(this.getMode()).then(() => {
                ui.showText(i18next.t("starterSelectUiHandler:selectFusion"), null, () => {
                    const fusions = this.scene.gameData.starterData[this.lastSpecies.speciesId].obtainedFusions;
                    const fusionTaxCost = this.scene.gameData.getFusionTaxCost();
                    const currentPermaMoney = this.scene.gameData.permaMoney;

                    const currentTotalFusionTax = this.starterFusionIndexes.reduce((total, fusionIndex) => {
                        return total + (fusionIndex >= 0 ? this.scene.gameData.getFusionTaxCost() : 0);
                    }, 0);
                    const permaMoneyContainer = this.scene.add.container(80, -69);
                    this.starterSelectMessageBoxContainer.add(permaMoneyContainer);

                    const permaMoneyBg = addWindow(this.scene, 0, 0, 160, 40);
                    permaMoneyBg.setOrigin(0.5, 0);
                    permaMoneyContainer.add(permaMoneyBg);

                    const permaMoneyText = addTextObject(
                        this.scene,
                        0,
                        20,
                        i18next.t("starterSelectUiHandler:currentPermaMoney", {
                            currentFunds: `${currentPermaMoney}`
                        }),
                        TextStyle.PERFECT_IV
                    );
                    permaMoneyText.setOrigin(0.5, 0);
                    permaMoneyContainer.add(permaMoneyText);

                    const fusionTaxText = addTextObject(
                        this.scene,
                        0,
                        5,
                        i18next.t("starterSelectUiHandler:fusionTaxCost", {
                            fusionTax: `${currentTotalFusionTax}`
                        }),
                        TextStyle.TOOLTIP_CONTENT
                    );
                    fusionTaxText.setOrigin(0.5, 0);
                    permaMoneyContainer.add(fusionTaxText);

                    const options = [
                        {
                            label: this.lastSpecies.getName(),
                            handler: () => {
                                this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined, undefined, -1);
                                this.clearText();
                                permaMoneyContainer.destroy();
                                this.addToPartyIfValid(ui);
                                return true;
                            },
                            onHover: () => {
                                this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined, undefined, -1);

                                fusionTaxText.setText(i18next.t("starterSelectUiHandler:fusionTaxCost", {
                                    fusionTax: `${currentTotalFusionTax}`
                                }));

                                fusionTaxText.setColor(this.getTextColor(TextStyle.TOOLTIP_CONTENT));
                                fusionTaxText.setShadowColor(this.getTextColor(TextStyle.TOOLTIP_CONTENT, true));
                            },
                        },
                        ...fusions.map((fusionId, index) => {
                            const fusionSpecies = getPokemonSpecies(fusionId);
                            const fusionTaxIfSelected = currentTotalFusionTax + fusionTaxCost;
                            const canAfford = currentPermaMoney >= fusionTaxIfSelected;

                            return {
                                label: fusionSpecies.getName(),
                                labelColor: canAfford ? undefined : this.getTextColor(TextStyle.SUMMARY_PINK),
                                handler: () => {
                                    if (!canAfford) {
                                        ui.playError();
                                        return false;
                                    }

                                    this.blockInput = true;
                                    ui.setMode(this.getMode()).then(() => {
                                        this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined, undefined, index);
                                        this.clearText();
                                        permaMoneyContainer.destroy();
                                        this.blockInput = false;
                                        this.addToPartyIfValid(ui);
                                    });
                                    return true;
                                },
                                onHover: () => {
                                    this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined, undefined, index);

                                    fusionTaxText.setText(i18next.t("starterSelectUiHandler:fusionTaxCost", {
                                        fusionTax: `${fusionTaxIfSelected}`
                                    }));

                                    const textStyle = canAfford ? TextStyle.TOOLTIP_CONTENT : TextStyle.SUMMARY_PINK;
                                    fusionTaxText.setColor(this.getTextColor(textStyle));
                                    fusionTaxText.setShadowColor(this.getTextColor(textStyle, true));
                                },
                            };
                        }),
                        {
                            label: i18next.t("menu:cancel"),
                            handler: () => {
                                this.clearText();
                                permaMoneyContainer.destroy();
                                ui.setMode(this.getMode());
                                this.blockInput = false;
                                return true;
                            },
                            onHover: () => {
                                this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined, undefined, -1);

                                fusionTaxText.setText(i18next.t("starterSelectUiHandler:fusionTaxCost", {
                                    fusionTax: `${currentTotalFusionTax}`
                                }));

                                fusionTaxText.setColor(this.getTextColor(TextStyle.TOOLTIP_CONTENT));
                                fusionTaxText.setShadowColor(this.getTextColor(TextStyle.TOOLTIP_CONTENT, true));
                            },
                        }
                    ];

                    ui.setModeWithoutClear(Mode.OPTION_SELECT, {
                        options: options,
                        supportHover: true,
                        maxOptions: 8,
                        yOffset: 19
                    });
                    this.blockInput = false;
                });
            });
        };
        if (this.lastSpecies && this.canCycleFusion) {
            options.push({
                label: i18next.t("starterSelectUiHandler:manageFusions"),
                handler: () => {
                    showFusionOptions();
                    return true;
                }
            });
        }
        if (this.canCycleNature) {

            const showNatureOptions = () => {

                this.blockInput = true;

                ui.setMode(this.getMode()).then(() => {
                    ui.showText(i18next.t("starterSelectUiHandler:selectNature"), null, () => {
                        const natures = this.scene.gameData.getNaturesForAttr(this.speciesStarterDexEntry?.natureAttr);
                        ui.setModeWithoutClear(Mode.OPTION_SELECT, {
                            options: natures.map((n: Nature, i: number) => {
                                const option: OptionSelectItem = {
                                    label: getNatureName(n, true, true, true, this.scene.uiTheme),
                                    handler: () => {

                                        if (!starterAttributes) {
                                            starterAttributes =
                                                this.starterPreferences[this.lastSpecies.speciesId] = {};
                                        }
                                        starterAttributes.nature = n as unknown as integer;
                                        this.clearText();
                                        ui.setMode(this.getMode());

                                        this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, n, undefined);
                                        this.blockInput = false;
                                        return true;
                                    }
                                };
                                return option;
                            }).concat({
                                label: i18next.t("menu:cancel"),
                                handler: () => {
                                    this.clearText();
                                    ui.setMode(this.getMode());
                                    this.blockInput = false;
                                    return true;
                                }
                            }),
                            maxOptions: 8,
                            yOffset: 19
                        });
                    });
                });
            };
            options.push({
                label: i18next.t("starterSelectUiHandler:manageNature"),
                handler: () => {
                    showNatureOptions();
                    return true;
                }
            });
        }
        const candyCount = starterData.candyCount;
        const passiveAttr = starterData.passiveAttr;
        if (passiveAttr & PassiveAttr.UNLOCKED) {
            if (!(passiveAttr & PassiveAttr.ENABLED)) {
                options.push({
                    label: i18next.t("starterSelectUiHandler:enablePassive"),
                    handler: () => {
                        starterData.passiveAttr |= PassiveAttr.ENABLED;
                        ui.setMode(this.getMode());
                        this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined);
                        return true;
                    }
                });
            } else {
                options.push({
                    label: i18next.t("starterSelectUiHandler:disablePassive"),
                    handler: () => {
                        starterData.passiveAttr ^= PassiveAttr.ENABLED;
                        ui.setMode(this.getMode());
                        this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined);
                        return true;
                    }
                });
            }
        }

        const isFavorite = starterAttributes?.favorite ?? false;
        if (!isFavorite) {
            options.push({
                label: i18next.t("starterSelectUiHandler:addToFavorites"),
                handler: () => {
                    starterAttributes.favorite = true;

                    if (starterContainer) {
                        starterContainer.favoriteIcon.setVisible(starterAttributes.favorite);
                    }
                    ui.setMode(this.getMode());
                    return true;
                }
            });
        } else {
            options.push({
                label: i18next.t("starterSelectUiHandler:removeFromFavorites"),
                handler: () => {
                    starterAttributes.favorite = false;

                    if (starterContainer) {
                        starterContainer.favoriteIcon.setVisible(starterAttributes.favorite);
                    }
                    ui.setMode(this.getMode());
                    return true;
                }
            });
        }
        options.push({
            label: i18next.t("menu:rename"),
            handler: () => {
                ui.playSelect();
                let nickname = starterAttributes.nickname ? String(starterAttributes.nickname) : "";
                nickname = decodeURIComponent(escape(atob(nickname)));
                ui.setModeWithoutClear(Mode.RENAME_POKEMON, {
                    buttonActions: [
                        (sanitizedName: string) => {
                            ui.playSelect();
                            starterAttributes.nickname = sanitizedName;
                            const name = decodeURIComponent(escape(atob(starterAttributes.nickname)));
                            if (name.length > 0) {
                                this.fitPokemonNameToWidth(name, this.lastSpecies);
                            } else {
                                this.fitPokemonNameToWidth(this.lastSpecies.name, this.lastSpecies);
                            }
                            ui.setMode(this.getMode());
                        },
                        () => {
                            ui.setMode(this.getMode());
                        }
                    ]
                }, nickname);
                return true;
            }
        });
        const showUseCandies = () => {
            const options: any[] = [];
            if (!(passiveAttr & PassiveAttr.UNLOCKED) && starterPassiveAbilities[this.lastSpecies.speciesId] !== undefined) {
                const passiveCost = getPassiveCandyCount(speciesStarters[this.lastSpecies.speciesId]);
                options.push({
                    label: `x${passiveCost} ${i18next.t("starterSelectUiHandler:unlockPassive")} (${allAbilities[starterPassiveAbilities[this.lastSpecies.speciesId]].name})`,
                    handler: () => {
                        if (Overrides.FREE_CANDY_UPGRADE_OVERRIDE || candyCount >= passiveCost) {
                            starterData.passiveAttr |= PassiveAttr.UNLOCKED | PassiveAttr.ENABLED;
                            if (!Overrides.FREE_CANDY_UPGRADE_OVERRIDE) {
                                starterData.candyCount -= passiveCost;
                            }
                            this.pokemonCandyCountText.setText(`x${starterData.candyCount}`);
                            this.scene.gameData.saveSystem().then(success => {
                                if (!success) {
                                    return this.scene.reset(true);
                                }
                            });
                            ui.setMode(this.getMode());
                            this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined);
                            if (starterContainer) {

                                if (this.isUpgradeIconEnabled()) {
                                    this.setUpgradeIcon(starterContainer);
                                }
                                if (this.isUpgradeAnimationEnabled()) {
                                    this.setUpgradeAnimation(starterContainer.icon, this.lastSpecies, true);
                                }

                                starterContainer.starterPassiveBgs.setVisible(!!this.scene.gameData.starterData[this.lastSpecies.speciesId].passiveAttr);
                            }
                            return true;
                        }
                        return false;
                    },
                    item: "candy",
                    itemArgs: starterColors?.[this.lastSpecies.speciesId]
                });
            }
            const valueReduction = starterData.valueReduction;
            if (valueReduction < valueReductionMax) {
                const isSignature = this.isEffectivelySignature(this.lastSpecies.speciesId as unknown as Species);
                const reductionCost = isSignature ? 1000 : getValueReductionCandyCounts(speciesStarters[this.lastSpecies.speciesId])[valueReduction];
                options.push({
                    label: `x${reductionCost} ${i18next.t("starterSelectUiHandler:reduceCost")}`,
                    handler: () => {
                        if (Overrides.FREE_CANDY_UPGRADE_OVERRIDE || candyCount >= reductionCost) {
                            starterData.valueReduction++;
                            if (!Overrides.FREE_CANDY_UPGRADE_OVERRIDE) {
                                starterData.candyCount -= reductionCost;
                            }
                            this.pokemonCandyCountText.setText(`x${starterData.candyCount}`);
                            this.scene.gameData.saveSystem().then(success => {
                                if (!success) {
                                    return this.scene.reset(true);
                                }
                            });
                            this.tryUpdateValue(0);
                            ui.setMode(this.getMode());
                            this.scene.playSound("se/buy");
                            if (starterContainer) {
                                this.updateStarterValueLabel(starterContainer);
                                if (this.scene.candyUpgradeNotification === 2) {
                                    if (this.isUpgradeIconEnabled()) {
                                        this.setUpgradeIcon(starterContainer);
                                    }
                                    if (this.isUpgradeAnimationEnabled()) {
                                        this.setUpgradeAnimation(starterContainer.icon, this.lastSpecies, true);
                                    }
                                }
                            }
                            return true;
                        }
                        return false;
                    },
                    item: "candy",
                    itemArgs: starterColors?.[this.lastSpecies.speciesId]
                });
            }
            const sameSpeciesEggCost = getSameSpeciesEggCandyCounts(speciesStarters[this.lastSpecies.speciesId]);
            options.push({
                label: `x${sameSpeciesEggCost} ${i18next.t("starterSelectUiHandler:sameSpeciesEgg")}`,
                handler: () => {
                    if (this.scene.gameData.eggs.length < 99 && (Overrides.FREE_CANDY_UPGRADE_OVERRIDE || candyCount >= sameSpeciesEggCost)) {
                        if (!Overrides.FREE_CANDY_UPGRADE_OVERRIDE) {
                            starterData.candyCount -= sameSpeciesEggCost;
                        }
                        this.pokemonCandyCountText.setText(`x${starterData.candyCount}`);

                        const egg = new Egg({
                            scene: this.scene,
                            species: this.lastSpecies.speciesId,
                            sourceType: EggSourceType.SAME_SPECIES_EGG
                        });
                        egg.addEggToGameData(this.scene);

                        this.scene.gameData.saveSystem().then(success => {
                            if (!success) {
                                return this.scene.reset(true);
                            }
                        });
                        ui.setMode(this.getMode());
                        this.scene.playSound("se/buy");

                        return true;
                    }
                    return false;
                },
                item: "candy",
                itemArgs: starterColors?.[this.lastSpecies.speciesId]
            });
            options.push({
                label: i18next.t("menu:cancel"),
                handler: () => {
                    ui.setMode(this.getMode());
                    return true;
                }
            });
            ui.setModeWithoutClear(Mode.OPTION_SELECT, {
                options: options,
                yOffset: 47
            });
        };
        if (!pokemonPrevolutions.hasOwnProperty(this.lastSpecies.speciesId)) {
            options.push({
                label: i18next.t("starterSelectUiHandler:useCandies"),
                handler: () => {
                    ui.setMode(this.getMode()).then(() => showUseCandies());
                    return true;
                }
            });
        }
        options.push({
            label: i18next.t("pokedex:voidex"),
            handler: () => {
                const overlayArgs = this.getVoidexPrelistOverlayArgs();
                ui.setMode(this.getMode()).then(() => {
                    ui.setOverlayMode(Mode.VOIDEX_PRELIST, ...overlayArgs);
                });
                return true;
            }
        });
        options.push({
            label: i18next.t("menu:cancel"),
            handler: () => {
                ui.setMode(this.getMode());
                return true;
            }
        });
        return options;
    }

    processInput(button: Button): boolean {
        if (button === Button.CYCLE_ABILITY && this.scene.uiEditModeActive && Overrides.STARTER_SELECT_TWEAK_TOOL_OVERRIDE && this._spriteTweak) {
            return this._spriteTweak.onCycleAbility();
        }
        if (this._spriteTweak?.tweakActive) {
            return this._spriteTweak.processInput(button);
        }
        if (this._stUiTweakActive) {
            return this.handleStUiTweakInput(button);
        }
        if (this.blockInput) {
            return false;
        }
        this._summaryTooltipDeferred = false;

        const maxColumns = 9;
        const maxRows = 9;
        const numberOfStarters = this.filteredStarterContainers.length;
        const numOfRows = Math.ceil(numberOfStarters / maxColumns);
        const currentRow = Math.floor(this.cursor / maxColumns);
        const onScreenFirstIndex = this.scrollCursor * maxColumns;
        const onScreenLastIndex = Math.min(this.filteredStarterContainers.length - 1, onScreenFirstIndex + maxRows * maxColumns - 1);
        const onScreenNumberOfStarters = onScreenLastIndex - onScreenFirstIndex + 1;
        const onScreenNumberOfRows = Math.ceil(onScreenNumberOfStarters / maxColumns);
        const onScreenCurrentRow = Math.floor((this.cursor - onScreenFirstIndex) / maxColumns);

        const ui = this.getUi();

        let success = false;
        let error = false;
		if (!this.filterMode && ((this.championOnStarterSelected || this.championOnCancel) || (this.championFilterConfig?.onStarterSelected || this.championFilterConfig?.onCancel))) {
            if (button === Button.ACTION || button === Button.SUBMIT) {
                const idx = this.cursor ?? 0;
                const container = this.filteredStarterContainers[idx];
				if (container?.species?.speciesId !== undefined) {
                    const championAllowedSpecies = this.championFilterConfig?.availableStarters?.length
                        ? new Set(this.championFilterConfig.availableStarters as Species[])
                        : (this.championAvailableSpecies?.size ? this.championAvailableSpecies : null);
                    if (this.championFilterConfig) {
                        if (!championAllowedSpecies || !championAllowedSpecies.has(container.species.speciesId as unknown as Species)) {
                            this.scene.ui.playError();
                            return false;
                        }
                        this.championAvailableSpecies = championAllowedSpecies;
                    }
					if (this.championOnStarterSelected) {
						this.championOnStarterSelected(container.species.speciesId as unknown as Species);
					} else if (this.championFilterConfig?.onStarterSelected) {
						this.championFilterConfig.onStarterSelected(container.species.speciesId as unknown as Species);
					}
                    return true;
                }
			} else if (button === Button.CANCEL) {
				if (this.championOnCancel) {
					this.championOnCancel();
				} else if (this.championFilterConfig?.onCancel) {
					this.championFilterConfig.onCancel();
				}
                return true;
            }
        }

        if (button === Button.SUBMIT) {
            if (this.tryStart(true)) {
                success = true;
            } else {
                error = true;
            }
        } else if (button === Button.CANCEL) {
            if (this.filterMode && this.filterBar.openDropDown) {
                this.filterBar.toggleDropDown(this.filterBarCursor);
                this.hideFilterDismissZone();

                if (numberOfStarters > 0) {
                    this.setFilterMode(false);
                    this.scrollCursor = 0;
                    this.updateScroll();
                    this.setCursor(0);
                }
                success = true;

            } else if (this.statsMode) {
                this.toggleStatsMode(false);
                success = true;
            } else if (this.starterSpecies.length && this.mode === Mode.STARTER_SELECT) {
                this.popStarter(this.starterSpecies.length - 1);
                success = true;
                this.updateInstructions();
            } else {
                this.tryExit();
                success = true;
            }
        } else if (button === Button.STATS) {
            if (!this.filterMode) {
                this.startCursorObj.setVisible(false);
                this.starterIconsCursorObj.setVisible(false);
                this.fusionsCursorObj.setVisible(false);
                this.setSpecies(null);
                this.filterBarCursor = 0;
                this.setFilterMode(true);
                this.filterBar.toggleDropDown(this.filterBarCursor);
            }
        } else if (button === Button.VOIDEX) {
            const overlayArgs = this.getVoidexPrelistOverlayArgs();
            ui.setOverlayMode(Mode.VOIDEX_PRELIST, ...overlayArgs);
            success = true;
        } else if (this.fusionsCursorObj.visible) {
            switch (button) {
                case Button.ACTION:
                    this.fusionsFilterActive = !this.fusionsFilterActive;
                    this.updateFusionsButtonVisual();
                    this.updateStarters();
                    this.refreshAllPartyIconPostFX();
                    this.tryUpdateValue();
                    success = true;
                    break;
                case Button.UP:
                    this.fusionsCursorObj.setVisible(false);
                    this.filterBarCursor = Math.max(1, this.filterBar.numFilters - 1);
                    this.setFilterMode(true);
                    success = true;
                    break;
                case Button.DOWN:
                    this.fusionsCursorObj.setVisible(false);
                    if (this.starterSpecies.length > 0) {
                        this.starterIconsCursorIndex = 0;
                        this.moveStarterIconsCursor(this.starterIconsCursorIndex);
                    } else {
                        this.startCursorObj.setVisible(true);
                    }
                    success = true;
                    break;
                case Button.LEFT:
                    this.fusionsCursorObj.setVisible(false);
                    this.cursorObj.setVisible(true);
                    this.setCursor(Math.floor(this.cursor / 9) * 9 + 8);
                    success = true;
                    break;
                case Button.RIGHT:
                    this.fusionsCursorObj.setVisible(false);
                    this.cursorObj.setVisible(true);
                    this.setCursor(Math.floor(this.cursor / 9) * 9);
                    success = true;
                    break;
            }
        } else if (this.startCursorObj.visible) {
            switch (button) {
                case Button.ACTION:
                    if (this.tryStart(true)) {
                        success = true;
                    } else {
                        error = true;
                    }
                    break;
                case Button.UP:
                    this.startCursorObj.setVisible(false);
                    if (this.starterSpecies.length > 0) {
                        this.starterIconsCursorIndex = this.starterSpecies.length - 1;
                        this.moveStarterIconsCursor(this.starterIconsCursorIndex);
                    } else {
                        this.fusionsCursorObj.setVisible(true);
                    }
                    success = true;
                    break;
                case Button.DOWN:
                    this.startCursorObj.setVisible(false);
                    if (this.starterSpecies.length > 0) {
                        this.starterIconsCursorIndex = 0;
                        this.moveStarterIconsCursor(this.starterIconsCursorIndex);
                    } else {
                        this.fusionsCursorObj.setVisible(true);
                    }
                    success = true;
                    break;
                case Button.LEFT:
                    this.startCursorObj.setVisible(false);
                    this.cursorObj.setVisible(true);
                    success = this.setCursor(onScreenFirstIndex + (onScreenNumberOfRows - 1) * 9 + 8);
                    success = true;
                    break;
                case Button.RIGHT:
                    this.startCursorObj.setVisible(false);
                    this.cursorObj.setVisible(true);
                    success = this.setCursor(onScreenFirstIndex + (onScreenNumberOfRows - 1) * 9);
                    success = true;
                    break;
            }
        } else if (this.filterMode) {
            switch (button) {
                case Button.LEFT:
                    if (this.filterBarCursor > 0) {
                        success = this.setCursor(this.filterBarCursor - 1);
                    } else {
                        success = this.setCursor(this.filterBar.numFilters - 1);
                    }
                    break;
                case Button.RIGHT:
                    if (this.filterBarCursor < this.filterBar.numFilters - 1) {
                        success = this.setCursor(this.filterBarCursor + 1);
                    } else {
                        success = this.setCursor(0);
                    }
                    break;
                case Button.UP:
                    if (this.filterBar.openDropDown) {
                        success = this.filterBar.decDropDownCursor();

                    } else if (numberOfStarters > 0) {

                        this.setFilterMode(false);
                        this.scrollCursor = Math.max(0, numOfRows - 9);
                        this.updateScroll();
                        const proportion = (this.filterBarCursor + 0.5) / this.filterBar.numFilters;
                        const targetCol = Math.min(8, Math.floor(proportion * 11));
                        if (numberOfStarters % 9 > targetCol) {
                            this.setCursor(numberOfStarters - (numberOfStarters) % 9 + targetCol);
                        } else {
                            this.setCursor(Math.max(numberOfStarters - (numberOfStarters) % 9 + targetCol - 9, 0));
                        }
                        success = true;
                    }
                    break;
                case Button.DOWN:
                    if (this.filterBar.openDropDown) {
                        success = this.filterBar.incDropDownCursor();
                    } else if (this.filterBarCursor === this.filterBar.numFilters - 1) {
                        this.filterMode = false;
                        this.filterBar.cursorObj.setVisible(false);
                        this.cursorObj.setVisible(false);
                        this.fusionsCursorObj.setVisible(true);
                        success = true;
                    } else if (numberOfStarters > 0) {
                        this.setFilterMode(false);
                        this.scrollCursor = 0;
                        this.updateScroll();
                        const proportion = this.filterBarCursor / Math.max(1, this.filterBar.numFilters - 1);
                        const targetCol = Math.min(8, Math.floor(proportion * 11));
                        this.setCursor(Math.min(targetCol, numberOfStarters));
                        success = true;
                    }
                    break;
                case Button.ACTION:
                    if (!this.filterBar.openDropDown) {
                        this.filterBar.toggleDropDown(this.filterBarCursor);
                    } else {
                        this.filterBar.toggleOptionState();
                    }
                    success = true;
                    break;
            }
        } else {

            let { starterData, starterAttributes, starterContainer } = this.getStarterDetails();

            if (button === Button.ACTION) {
                if (!this.speciesStarterDexEntry?.caughtAttr) {
                    error = true;
                } else if (this.starterSpecies.length <= 6) {

                    const options = this.getPokemonSelectedOptions();
                    if (options) {
                        ui.setModeWithoutClear(Mode.OPTION_SELECT, {
                            options: options,
                            yOffset: 47,
                            maxOptions: 9
                        });
                    }
                    success = true;
                }
            } else {

                if (!this.lastSpecies) {

                    if (this.filteredStarterContainers.length > 0) {
                        this.setSpecies(this.filteredStarterContainers[0].species);
                    } else {
                        return false;
                    }
                }

                const props = this.scene.gameData.getSpeciesDexAttrProps(this.lastSpecies, this.getCurrentDexProps(this.lastSpecies.speciesId));
                switch (button) {
                    case Button.UP:
                        if (!this.starterIconsCursorObj.visible) {
                            if (currentRow > 0) {
                                if (this.scrollCursor > 0 && currentRow - this.scrollCursor === 0) {
                                    this.scrollCursor--;
                                    this.updateScroll();
                                }
                                success = this.setCursor(this.cursor - 9);
                            } else {
                                this.filterBarCursor = this.filterBar.getNearestFilter(this.filteredStarterContainers[this.cursor]);
                                this.setFilterMode(true);
                                success = true;
                            }
                        } else {
                            if (this.starterIconsCursorIndex === 0) {
                                this.starterIconsCursorObj.setVisible(false);
                                this.setSpecies(null);
                                this.fusionsCursorObj.setVisible(true);
                            } else {
                                this.starterIconsCursorIndex--;
                                this.moveStarterIconsCursor(this.starterIconsCursorIndex);
                            }
                            success = true;
                        }
                        break;
                    case Button.DOWN:
                        if (!this.starterIconsCursorObj.visible) {
                            if (currentRow < numOfRows - 1) {
                                if (currentRow - this.scrollCursor === 8) {
                                    this.scrollCursor++;
                                }
                                success = this.setCursor(this.cursor + 9);
                                this.updateScroll();
                            } else if (numOfRows > 1) {

                                this.scrollCursor = 0;
                                this.updateScroll();
                                success = this.setCursor(this.cursor % 9);
                            } else {

                                this.filterBarCursor = this.filterBar.getNearestFilter(this.filteredStarterContainers[this.cursor]);
                                this.setFilterMode(true);
                                success = true;
                            }
                        } else {
                            if (this.starterIconsCursorIndex <= this.starterSpecies.length - 2) {
                                this.starterIconsCursorIndex++;
                                this.moveStarterIconsCursor(this.starterIconsCursorIndex);
                            } else {
                                this.starterIconsCursorObj.setVisible(false);
                                this.setSpecies(null);
                                this.startCursorObj.setVisible(true);
                            }
                            success = true;
                        }
                        break;
                    case Button.LEFT:
                        if (!this.starterIconsCursorObj.visible) {
                            if (this.cursor % 9 !== 0) {
                                success = this.setCursor(this.cursor - 1);
                            } else {
                                if (this.starterSpecies.length === 0 && currentRow === 0) {
                                    this.cursorObj.setVisible(false);
                                    this.setSpecies(null);
                                    this.fusionsCursorObj.setVisible(true);

                                } else if (this.starterSpecies.length === 0) {
                                    success = this.setCursor(this.cursor + Math.min(8, numberOfStarters - this.cursor - 1));

                                } else if (onScreenCurrentRow < 7) {

                                    this.cursorObj.setVisible(false);
                                    this.starterIconsCursorIndex = findClosestStarterIndex(this.cursorObj.y - 1, this.starterSpecies.length);
                                    this.moveStarterIconsCursor(this.starterIconsCursorIndex);

                                } else {

                                    this.cursorObj.setVisible(false);
                                    this.setSpecies(null);
                                    this.startCursorObj.setVisible(true);
                                }
                                success = true;
                            }
                        } else if (numberOfStarters > 0) {

                            const closestRowIndex = findClosestStarterRow(this.starterIconsCursorIndex, onScreenNumberOfRows);
                            this.starterIconsCursorObj.setVisible(false);
                            this.cursorObj.setVisible(true);
                            this.setCursor(Math.min(onScreenFirstIndex + closestRowIndex * 9 + 8, onScreenLastIndex));
                            success = true;
                        } else {

                            success = false;
                        }
                        break;
                    case Button.RIGHT:
                        if (!this.starterIconsCursorObj.visible) {
                            if (this.cursor % 9 < (currentRow < numOfRows - 1 ? 8 : (numberOfStarters - 1) % 9)) {
                                success = this.setCursor(this.cursor + 1);
                            } else {
                                if (this.starterSpecies.length === 0 && currentRow === 0) {
                                    this.cursorObj.setVisible(false);
                                    this.setSpecies(null);
                                    this.fusionsCursorObj.setVisible(true);

                                } else if (this.starterSpecies.length === 0) {
                                    success = this.setCursor(this.cursor - (this.cursor % 9));

                                } else if (onScreenCurrentRow < 7) {

                                    this.cursorObj.setVisible(false);
                                    this.starterIconsCursorIndex = findClosestStarterIndex(this.cursorObj.y - 1, this.starterSpecies.length);
                                    this.moveStarterIconsCursor(this.starterIconsCursorIndex);

                                } else {

                                    this.cursorObj.setVisible(false);
                                    this.setSpecies(null);
                                    this.startCursorObj.setVisible(true);
                                }
                                success = true;
                            }
                        } else if (numberOfStarters > 0) {

                            const closestRowIndex = findClosestStarterRow(this.starterIconsCursorIndex, onScreenNumberOfRows);
                            this.starterIconsCursorObj.setVisible(false);
                            this.cursorObj.setVisible(true);
                            this.setCursor(Math.min(onScreenFirstIndex + closestRowIndex * 9, onScreenLastIndex - (onScreenLastIndex % 9)));
                            success = true;
                        } else {

                            success = false;
                        }
                        break;
                }
                if (!this.isEggModePartyPokemonSelected()) {
                    switch (button) {
                        case Button.CYCLE_SHINY:
                        if (this.canCycleShiny) {
                            const newVariant = starterAttributes.variant ? starterAttributes.variant as Variant : props.variant;
                            starterAttributes.shiny = starterAttributes.shiny ? !starterAttributes.shiny : true;
                            this.setSpeciesDetails(this.lastSpecies, !props.shiny, undefined, undefined, props.shiny ? 0 : newVariant, undefined, undefined, false, this.fusionCursor);
                            if (starterAttributes.shiny) {
                                this.scene.playSound("se/sparkle");

                                const tint = getVariantTint(newVariant);
                                this.pokemonShinyIcon.setFrame(getVariantIcon(newVariant));
                                this.pokemonShinyIcon.setTint(tint);
                                this.pokemonShinyIcon.setVisible(true);
                            } else {
                                this.pokemonShinyIcon.setVisible(false);
                            }
                            success = true;
                        }
                        break;
                    case Button.CYCLE_FORM:
                        if (this.canCycleForm) {
                            const formCount = this.lastSpecies.forms.length;
                            let newFormIndex = props.formIndex;
                            do {
                                newFormIndex = (newFormIndex + 1) % formCount;
                                if (this.lastSpecies.forms[newFormIndex].isStarterSelectable && this.speciesStarterDexEntry!.caughtAttr! & this.scene.gameData.getFormAttr(newFormIndex)) {
                                    break;
                                }
                            } while (newFormIndex !== props.formIndex);
                            starterAttributes.form = newFormIndex;
                            this.setSpeciesDetails(this.lastSpecies, undefined, newFormIndex, undefined, undefined, undefined, undefined, false, this.fusionCursor);
                            success = true;
                        }
                        break;
                    case Button.CYCLE_GENDER:
                        if (this.canCycleGender) {
                            starterAttributes.female = !props.female;
                            this.setSpeciesDetails(this.lastSpecies, undefined, undefined, !props.female, undefined, undefined, undefined, false, this.fusionCursor);
                            success = true;
                        }
                        break;
                    case Button.CYCLE_ABILITY:
                        if (this.canCycleAbility) {
                            const abilityCount = this.lastSpecies.getAbilityCount();
                            const abilityAttr = this.scene.gameData.starterData[this.lastSpecies.speciesId].abilityAttr;
                            const hasAbility1 = abilityAttr & AbilityAttr.ABILITY_1;
                            let newAbilityIndex = this.abilityCursor;
                            do {
                                newAbilityIndex = (newAbilityIndex + 1) % abilityCount;
                                if (newAbilityIndex === 0) {
                                    if (hasAbility1) {
                                        break;
                                    }
                                } else if (newAbilityIndex === 1) {

                                    if (this.lastSpecies.ability1 === this.lastSpecies.ability2 && hasAbility1) {
                                        newAbilityIndex = (newAbilityIndex + 1) % abilityCount;
                                    }
                                    break;
                                } else {
                                    if (abilityAttr & AbilityAttr.ABILITY_HIDDEN) {
                                        break;
                                    }
                                }
                            } while (newAbilityIndex !== this.abilityCursor);
                            starterAttributes.ability = newAbilityIndex;
                            this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, newAbilityIndex, undefined, false, this.fusionCursor);
                            success = true;
                        }
                        break;

                    case Button.CYCLE_FUSION:
                        if (this.canCycleFusion) {
                            const obtained = this.scene.gameData.starterData[this.lastSpecies.speciesId]?.obtainedFusions ?? [];
                            const nextFusionIndex = this.fusionCursor + 1;
                            const resolvedFusionIndex = nextFusionIndex >= obtained.length ? -1 : nextFusionIndex;
                            if (resolvedFusionIndex >= 0) {
                                starterAttributes.fusion = resolvedFusionIndex as unknown as integer;
                            } else {
                                delete starterAttributes.fusion;
                            }
                            this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined, undefined, resolvedFusionIndex);
                            const fusionPartyIdx = this.starterSpecies.indexOf(this.lastSpecies);
                            if (fusionPartyIdx >= 0) {
                                this.starterFusionIndexes[fusionPartyIdx] = resolvedFusionIndex;
                                this.updatePartyFusionOverlay(fusionPartyIdx);
                            }
                            success = true;
                        }
                        break;
                    case Button.CYCLE_NATURE:
                        if (this.canCycleNature) {
                            const natures = this.scene.gameData.getNaturesForAttr(this.speciesStarterDexEntry?.natureAttr);
                            const natureIndex = natures.indexOf(this.natureCursor);
                            const newNature = natures[natureIndex < natures.length - 1 ? natureIndex + 1 : 0];

                            starterAttributes.nature = newNature as unknown as integer;
                            this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, newNature, false, this.fusionCursor);
                            success = true;
                        }
                        break;
                    case Button.TOGGLE_SIGNATURE:
                        if (this.canCycleSignature) {
                            this.signatureModeActive = !this.signatureModeActive;
                            const partySlotIdx = this.lastSpecies ? this.starterSpecies.indexOf(this.lastSpecies) : -1;
                            if (partySlotIdx >= 0 && partySlotIdx < this.starterSignatureFlags.length) {
                                this.starterSignatureFlags[partySlotIdx] = this.signatureModeActive;
                                this.refreshPartyIconPostFX(partySlotIdx);
                            }
                            this.refreshSignatureDisplay();
                            success = true;
                        }
                        break;
                    case Button.CYCLE_VARIANT:
                        if (this.canCycleVariant) {
                                let newVariant = props.variant;
                                do {
                                    newVariant = (newVariant + 1) % 3;
                                    if (!newVariant) {
                                        if (this.speciesStarterDexEntry!.caughtAttr & DexAttr.DEFAULT_VARIANT) {
                                            break;
                                        }
                                    } else if (newVariant === 1) {
                                        if (this.speciesStarterDexEntry!.caughtAttr & DexAttr.VARIANT_2) {
                                            break;
                                        }
                                    } else {
                                        if (this.speciesStarterDexEntry!.caughtAttr & DexAttr.VARIANT_3) {
                                            break;
                                        }
                                    }
                                } while (newVariant !== props.variant);
                                starterAttributes.variant = newVariant;
                                this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, newVariant as Variant, undefined, undefined, false, this.fusionCursor);

                                const tint = getVariantTint(newVariant as Variant);
                                this.pokemonShinyIcon.setFrame(getVariantIcon(newVariant as Variant));
                                this.pokemonShinyIcon.setTint(tint);
                                success = true;
                            }
                            break;
                    }
                }
            }
        }

        if (success) {
            ui.playSelect();
        } else if (error) {
            ui.playError();
        }

        return success || error;
    }

    isInParty(species: PokemonSpecies): [boolean, number] {
        let removeIndex = 0;
        let isDupe = false;
        for (let s = 0; s < this.starterSpecies.length; s++) {
            if (this.starterSpecies[s] === species) {
                isDupe = true;
                removeIndex = s;
                break;
            }
        }
        return [isDupe, removeIndex];
    }
    addToParty(species: PokemonSpecies, dexAttr: bigint, abilityIndex: integer, nature: Nature, moveset: StarterMoveset, fusionIndex: number) {
        const props = this.scene.gameData.getSpeciesDexAttrProps(species, dexAttr);
        const formSource = (species.forms.length > 0 && props.formIndex !== undefined && species.forms[props.formIndex]) ? species.forms[props.formIndex] : species;
        this.starterIcons[this.starterSpecies.length].setTexture(formSource.getIconAtlasKey(props.formIndex, props.shiny, props.variant));
        this.starterIcons[this.starterSpecies.length].setFrame(formSource.getIconId(props.female, props.formIndex, props.shiny, props.variant));
        this.checkIconId(this.starterIcons[this.starterSpecies.length], species, props.female, props.formIndex, props.shiny, props.variant);
        const isGen20 = species.generation === 20;
        this.starterIcons[this.starterSpecies.length].setScale(
          isGen20 ? adjustDuelmonIconScale(0.5, 20) * 0.8 : 0.5
        );

        const isSignature = this.isEffectivelySignature(species.speciesId as unknown as Species);
        if (isSignature) {
            const icon = this.starterIcons[this.starterSpecies.length];
            if (icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {
                icon.postFX.clear();
                const colorMatrix = icon.postFX.addColorMatrix();
                colorMatrix.negative();
            }
        } else {
            const icon = this.starterIcons[this.starterSpecies.length];
            if (icon.postFX) {
                icon.postFX.clear();
            }
        }

        this.starterSpecies.push(species);
        this.starterSignatureFlags.push(
            this.isEffectivelySignature(species.speciesId as unknown as Species)
        );
        this.starterAttr.push(dexAttr);
        this.starterAbilityIndexes.push(abilityIndex);
        this.starterNatures.push(nature);
        this.starterMovesets.push(moveset);
        if (this.speciesLoaded.get(species.speciesId)) {
            getPokemonSpeciesForm(species.speciesId, props.formIndex).cry(this.scene);
        }

        this.starterFusionIndexes.push(fusionIndex);
        this.updatePartyFusionOverlay(this.starterSpecies.length - 1);

        const starterAttributes = this.starterPreferences[species.speciesId];
        if (starterAttributes) {
            if (fusionIndex > -1) {
                starterAttributes.fusion = fusionIndex as unknown as integer;
            } else {
                delete starterAttributes.fusion;
            }
        }
        this.updateInstructions();

        const championId = this.scene.gameData.selectedChampionId;
        if (championId && championId !== "apollo" && championId !== "diana" &&
            !this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.STARTER_SELECT_CATCH_REQUIREMENTS)) {
            this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.STARTER_SELECT_CATCH_REQUIREMENTS, true, false);
        }
    }

    updatePartyIcon(species: PokemonSpecies, index: number) {
        const props = this.scene.gameData.getSpeciesDexAttrProps(species, this.getCurrentDexProps(species.speciesId));
        const formSource = (species.forms.length > 0 && props.formIndex !== undefined && species.forms[props.formIndex]) ? species.forms[props.formIndex] : species;
        this.starterIcons[index].setTexture(formSource.getIconAtlasKey(props.formIndex, props.shiny, props.variant));
        this.starterIcons[index].setFrame(formSource.getIconId(props.female, props.formIndex, props.shiny, props.variant));
        this.checkIconId(this.starterIcons[index], species, props.female, props.formIndex, props.shiny, props.variant);
        const isGen20 = species.generation === 20;
        this.starterIcons[index].setScale(
          isGen20 ? adjustDuelmonIconScale(0.5, 20) * 0.8 : 0.5
        );
        this.refreshPartyIconPostFX(index);
        this.updatePartyFusionOverlay(index);
    }

    private refreshPartyIconPostFX(index: number): void {
        const icon = this.starterIcons[index];
        if (icon.postFX) {
            icon.postFX.clear();
        }
        if (index >= this.starterSpecies.length) return;
        const species = this.starterSpecies[index];
        const slotIsSignature = this.isSignaturePokemon(species.speciesId as unknown as Species)
            && this.starterSignatureFlags[index]
            && !this.fusionsFilterActive;
        if (slotIsSignature && icon.postFX && typeof icon.postFX.addColorMatrix === 'function') {
            icon.postFX.addColorMatrix().negative();
        }
    }

    private refreshAllPartyIconPostFX(): void {
        for (let i = 0; i < this.starterSpecies.length; i++) {
            this.refreshPartyIconPostFX(i);
        }
    }

    private updatePartyFusionOverlay(index: number): void {
        if (index < 0 || index >= 6) return;
        const bg = this.partyFusionOverlayBgs[index];
        const overlayIcon = this.partyFusionOverlayIcons[index];
        if (!bg || !overlayIcon) return;

        if (index >= this.starterSpecies.length || this.starterFusionIndexes[index] < 0) {
            bg.setVisible(false);
            overlayIcon.setVisible(false);
            this.iconAnimHandler.remove([bg, overlayIcon]);
            return;
        }

        const baseSpeciesId = this.starterSpecies[index].speciesId;
        const fusionIdx = this.starterFusionIndexes[index];
        const obtainedFusions = this.scene.gameData.starterData[baseSpeciesId]?.obtainedFusions;
        if (!obtainedFusions || fusionIdx >= obtainedFusions.length) {
            bg.setVisible(false);
            overlayIcon.setVisible(false);
            this.iconAnimHandler.remove([bg, overlayIcon]);
            return;
        }

        const fusionSpecies = getPokemonSpecies(obtainedFusions[fusionIdx]);
        if (!fusionSpecies) {
            bg.setVisible(false);
            overlayIcon.setVisible(false);
            this.iconAnimHandler.remove([bg, overlayIcon]);
            return;
        }

        const defaultAttr = this.scene.gameData.getSpeciesDefaultDexAttr(fusionSpecies, false, true);
        const props = this.scene.gameData.getSpeciesDexAttrProps(fusionSpecies, defaultAttr);
        overlayIcon.setTexture(fusionSpecies.getIconAtlasKey(props.formIndex, props.shiny, props.variant));
        overlayIcon.setFrame(fusionSpecies.getIconId(props.female, props.formIndex, props.shiny, props.variant));
        overlayIcon.setScale(adjustDuelmonIconScale(0.25, fusionSpecies.generation));
        bg.setVisible(true);
        overlayIcon.setVisible(true);
        this.iconAnimHandler.addOrUpdate([bg, overlayIcon], PokemonIconAnimMode.PASSIVE);
    }

    private refreshAllPartyFusionOverlays(): void {
        for (let i = 0; i < 6; i++) {
            this.updatePartyFusionOverlay(i);
        }
    }

    switchMoveHandler(i: number, newMove: Moves, move: Moves) {
        const speciesId = this.lastSpecies.speciesId;
        const existingMoveIndex = this.starterMoveset?.indexOf(newMove)!;
        this.starterMoveset![i] = newMove;
        if (existingMoveIndex > -1) {
            this.starterMoveset![existingMoveIndex] = move;
        }
        const props: DexAttrProps = this.scene.gameData.getSpeciesDexAttrProps(this.lastSpecies, this.dexAttrCursor);

        if (pokemonFormLevelMoves.hasOwnProperty(speciesId)) {

            if (!this.scene.gameData.starterData[speciesId].moveset || Array.isArray(this.scene.gameData.starterData[speciesId].moveset)) {
                this.scene.gameData.starterData[speciesId].moveset = {[props.formIndex]: this.starterMoveset?.slice(0) as StarterMoveset};
            }
            const starterMoveData = this.scene.gameData.starterData[speciesId].moveset;
            if (!starterMoveData.hasOwnProperty(props.formIndex)) {
                this.scene.gameData.starterData[speciesId].moveset[props.formIndex] = this.starterMoveset?.slice(0) as StarterMoveset;
            }
            if (starterMoveData.hasOwnProperty(props.formIndex)) {

                if (starterMoveData[props.formIndex][existingMoveIndex] !== newMove) {
                    this.scene.gameData.starterData[speciesId].moveset[props.formIndex] = this.starterMoveset?.slice(0) as StarterMoveset;
                }
            }
        } else {
            this.scene.gameData.starterData[speciesId].moveset = this.starterMoveset?.slice(0) as StarterMoveset;
        }
        if(this.pokemon && this.pokemon.isFusion()) {
            if(!this.scene.gameData.starterData[speciesId].fusionMovesets) {
                this.scene.gameData.starterData[speciesId].fusionMovesets = [];
            }
            this.scene.gameData.starterData[speciesId].fusionMovesets[this.pokemon.fusionFormIndex] = this.starterMoveset?.slice(0) as StarterMoveset;
        }
        this.setSpeciesDetails(this.lastSpecies, undefined, undefined, undefined, undefined, undefined, undefined, false, this.fusionCursor, true);
        if (this.starterMovesets.length) {
            Array.from({length: this.starterSpecies.length}, (_, i) => {
                const starterSpecies = this.starterSpecies[i];
                if (starterSpecies.speciesId === speciesId) {
                    this.starterMovesets[i] = this.starterMoveset!;
                }
            });
        }
    }

    updateButtonIcon(iconSetting, gamepadType, iconElement, controlLabel): void {
        let iconPath;
        if (gamepadType === "touch") {
            gamepadType = "keyboard";
            switch (iconSetting) {
                case SettingKeyboard.Button_Cycle_Shiny:
                    iconPath = "R.png";
                    break;
                case SettingKeyboard.Button_Cycle_Form:
                    iconPath = "F.png";
                    break;
                case SettingKeyboard.Button_Cycle_Gender:
                    iconPath = "G.png";
                    break;
                case SettingKeyboard.Button_Cycle_Ability:
                    iconPath = "E.png";
                    break;
                case SettingKeyboard.Button_Cycle_Nature:
                    iconPath = "N.png";
                    break;
                case SettingKeyboard.Button_Cycle_Variant:
                    iconPath = "V.png";
                    break;
                case SettingKeyboard.Button_Cycle_Fusion:
                    iconPath = "U.png";
                    break;
                case SettingKeyboard.Button_Voidex:
                    iconPath = "P.png";
                    break;
                case SettingKeyboard.Button_Toggle_Signature:
                    iconPath = "H.png";
                    break;
                case SettingKeyboard.Button_Stats:
                    iconPath = "C.png";
                    break;
                default:
                    break;
            }
        } else {
            iconPath = this.scene.inputController?.getIconForLatestInputRecorded(iconSetting);
        }
        iconElement.setTexture(gamepadType, iconPath);
        iconElement.setPosition(this.instructionRowX, this.instructionRowY);
        controlLabel.setPosition(this.instructionRowX + this.instructionRowTextOffset, this.instructionRowY);
        iconElement.setVisible(true);
        controlLabel.setVisible(true);
        this.instructionsContainer.add([iconElement, controlLabel]);
        this.instructionRowY += 8;
        if (this.instructionRowY >= 24) {
            this.instructionRowY = 0;
            this.instructionRowX += 35;
        }
    }

    updateFilterButtonIcon(iconSetting, gamepadType, iconElement, controlLabel): void {
        let iconPath;
        if (gamepadType === "touch") {
            gamepadType = "keyboard";
            iconPath = "C.png";
        } else {
            iconPath = this.scene.inputController?.getIconForLatestInputRecorded(iconSetting);
        }
        iconElement.setTexture(gamepadType, iconPath);
        iconElement.setPosition(this.filterInstructionRowX, this.filterInstructionRowY);
        controlLabel.setPosition(this.filterInstructionRowX + this.instructionRowTextOffset, this.filterInstructionRowY);
        iconElement.setVisible(true);
        controlLabel.setVisible(true);
        this.filterInstructionsContainer.add([iconElement, controlLabel]);
        this.filterInstructionRowY += 8;
        if (this.filterInstructionRowY >= 24) {
            this.filterInstructionRowY = 0;
            this.filterInstructionRowX += 50;
        }
    }

    updateInstructions(): void {
        this.instructionRowX = 0;
        this.instructionRowY = 0;
        this.filterInstructionRowX = 0;
        this.filterInstructionRowY = 0;
        this.hideInstructions();
        this.instructionsContainer.removeAll();
        this.filterInstructionsContainer.removeAll();
        let gamepadType;
        if (this.scene.inputMethod === "gamepad") {
            gamepadType = this.scene.inputController.getConfig(this.scene.inputController.selectedDevice[Device.GAMEPAD])?.padType || "keyboard";
        } else {
            gamepadType = this.scene.inputMethod || "keyboard";
        }

        if (this.speciesStarterDexEntry?.caughtAttr) {
            if (this.canCycleShiny) {
                this.updateButtonIcon(SettingKeyboard.Button_Cycle_Shiny, gamepadType, this.shinyIconElement, this.shinyLabel);
            }
            if (this.canCycleForm) {
                this.updateButtonIcon(SettingKeyboard.Button_Cycle_Form, gamepadType, this.formIconElement, this.formLabel);
            }
            if (this.canCycleGender) {
                this.updateButtonIcon(SettingKeyboard.Button_Cycle_Gender, gamepadType, this.genderIconElement, this.genderLabel);
            }
            if (this.canCycleAbility) {
                this.updateButtonIcon(SettingKeyboard.Button_Cycle_Ability, gamepadType, this.abilityIconElement, this.abilityLabel);
            }
            if (this.canCycleNature) {
                this.updateButtonIcon(SettingKeyboard.Button_Cycle_Nature, gamepadType, this.natureIconElement, this.natureLabel);
            }
            if (this.canCycleVariant) {
                this.updateButtonIcon(SettingKeyboard.Button_Cycle_Variant, gamepadType, this.variantIconElement, this.variantLabel);
            }
            if (this.canCycleFusion) {
                this.updateButtonIcon(SettingKeyboard.Button_Cycle_Fusion, gamepadType, this.fusionIconElement, this.fusionLabel);
            }

            this.updateButtonIcon(SettingKeyboard.Button_Voidex, gamepadType, this.voidexIconElement, this.voidexLabel);

            if (this.canCycleSignature) {
                this.updateButtonIcon(SettingKeyboard.Button_Toggle_Signature, gamepadType, this.signatureIconElement, this.signatureLabel);
            }
            if (!this.filterMode) {
                this.updateFilterButtonIcon(SettingKeyboard.Button_Stats, gamepadType, this.goFilterIconElement, this.goFilterLabel);
            }
        }
    }

    getValueLimit(): integer {
        const valueLimit = new Utils.IntegerHolder(0);
        switch (this.scene.gameMode.modeId) {
            case GameModes.ENDLESS:
            case GameModes.SPLICED_ENDLESS:
                valueLimit.value = 15;
                break;
            default:
                valueLimit.value = 10;
        }
        if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_STARTER_POINT_LIMIT_INC_3)) {
            valueLimit.value += 6;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_STARTER_POINT_LIMIT_INC_2)) {
            valueLimit.value += 4;
        } else if (this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_STARTER_POINT_LIMIT_INC_1)) {
            valueLimit.value += 2;
        }

        Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_POINTS, valueLimit);

        return valueLimit.value;
    }

    updateStarters = () => {
        const caughtValsDebug = this.filterBar.getVals(DropDownColumn.CAUGHT);
        const hasFusionsOnlyFilter = this.fusionsFilterActive;
        const nextFusionsKey = hasFusionsOnlyFilter ? "HAS_FUSIONS" : "";
        const prevFusionsKey = this.prevFusionsFilterKey;
        this.scrollCursor = 0;
        for (const fc of this.fusionContainerPool) {
            fc.setVisible(false);
            fc.destroy();
        }
        this.fusionContainerPool = [];
        this.filteredStarterContainers = [];
        this.validStarterContainers = [];

        this.starterContainers.forEach(container => container.setVisible(false));

        this.pokerusCursorObjs.forEach(cursor => cursor.setVisible(false));
        this.starterCursorObjs.forEach(cursor => cursor.setVisible(false));

        this.filterBar.updateFilterLabels();
        if (this.scene.gameMode.modeId === GameModes.CHALLENGE) {
            this.starterContainers.forEach(container => {
                const species = container.species;
                let allFormsValid = false;
                if (species.forms?.length > 0) {
                    for (let i = 0; i < species.forms.length; i++) {
                        const tempFormProps = BigInt(Math.pow(2, i)) * DexAttr.DEFAULT_FORM;
                        const isValidForChallenge = new Utils.BooleanHolder(true);
                        Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_CHOICE, container.species, isValidForChallenge, this.scene.gameData.getSpeciesDexAttrProps(species, tempFormProps), true);
                        allFormsValid = allFormsValid || isValidForChallenge.value;
                    }
                } else {
                    const isValidForChallenge = new Utils.BooleanHolder(true);
                    Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_CHOICE, container.species, isValidForChallenge, this.scene.gameData.getSpeciesDexAttrProps(species, this.scene.gameData.getSpeciesDefaultDexAttr(container.species, false, true)), true);
                    allFormsValid = isValidForChallenge.value;
                }
                if (allFormsValid) {
                    this.validStarterContainers.push(container);
                } else {
                    container.setVisible(false);
                }
            });
        } else {
            this.validStarterContainers = this.starterContainers;
        }

        const championAllowedSpecies = this.championFilterConfig?.availableStarters?.length
            ? new Set(this.championFilterConfig.availableStarters as Species[])
            : (this.championAvailableSpecies?.size ? this.championAvailableSpecies : null);
        if (championAllowedSpecies) {
            this.championAvailableSpecies = championAllowedSpecies;
            this.validStarterContainers = this.validStarterContainers.filter(c => championAllowedSpecies.has(c.species.speciesId as unknown as Species));
        } else if (this.championFilterConfig) {
            this.validStarterContainers = [];
        }
        for (let i = 0; i < this.validStarterContainers.length; i++) {
            const currentFilteredContainer = this.validStarterContainers[i];
            const starterSprite = currentFilteredContainer.icon as Phaser.GameObjects.Sprite;

            const currentDexAttr = this.getCurrentDexProps(currentFilteredContainer.species.speciesId);
            const props = this.scene.gameData.getSpeciesDexAttrProps(currentFilteredContainer.species, currentDexAttr);

            const formSource = (currentFilteredContainer.species.forms.length > 0 && props.formIndex !== undefined && currentFilteredContainer.species.forms[props.formIndex]) ? currentFilteredContainer.species.forms[props.formIndex] : currentFilteredContainer.species;
            starterSprite.setTexture(formSource.getIconAtlasKey(props.formIndex, props.shiny, props.variant), formSource.getIconId(props.female!, props.formIndex, props.shiny, props.variant));
            currentFilteredContainer.checkIconId(props.female, props.formIndex, props.shiny, props.variant);
        }
        this.validStarterContainers.forEach(container => {
            container.setVisible(false);

            container.cost = this.getActualStarterValue(container.species.speciesId as unknown as Species);
            const caughtAttr = this.scene.gameData.dexData[container.species.speciesId]?.caughtAttr || BigInt(0);
            const starterData = this.scene.gameData.starterData[container.species.speciesId];
            const fitsGen = this.filterBar.getVals(DropDownColumn.GEN).includes(container.species.generation);
            const fitsType = this.filterBar.getVals(DropDownColumn.TYPES).some(type => container.species.isOfType((type as number) - 1));
            const isNonShinyCaught = !!(caughtAttr & DexAttr.NON_SHINY);
            const isShinyCaught = !!(caughtAttr & DexAttr.SHINY);
            const isVariant1Caught = isShinyCaught && !!(caughtAttr & DexAttr.DEFAULT_VARIANT);
            const isVariant2Caught = isShinyCaught && !!(caughtAttr & DexAttr.VARIANT_2);
            const isVariant3Caught = isShinyCaught && !!(caughtAttr & DexAttr.VARIANT_3);
            const isUncaught = !isNonShinyCaught && !isVariant1Caught && !isVariant2Caught && !isVariant3Caught;

            const isChampionAvailable = this.championAvailableSpecies?.has(container.species.speciesId as unknown as Species);
            const caughtFilterValues = this.filterBar.getVals(DropDownColumn.CAUGHT);

            const fitsCaught = caughtFilterValues.some(caught => {
                if (caught === "SHINY3") {
                    return isVariant3Caught;
                } else if (caught === "SHINY2") {
                    return isVariant2Caught && !isVariant3Caught;
                } else if (caught === "SHINY") {
                    return isVariant1Caught && !isVariant2Caught && !isVariant3Caught;
                } else if (caught === "NORMAL") {
                    return (isNonShinyCaught && !isVariant1Caught && !isVariant2Caught && !isVariant3Caught) || isChampionAvailable;
                } else if (caught === "UNCAUGHT") {
                    return isUncaught && !isChampionAvailable;
                } else if (caught === "ALL") {
                    return true;
                }
                return true;
            });
            const isPassiveUnlocked = starterData.passiveAttr > 0;
            const isPassiveUnlockable = this.isPassiveAvailable(container.species.speciesId) && !isPassiveUnlocked;
            const fitsPassive = this.filterBar.getVals(DropDownColumn.UNLOCKS).some(unlocks => {
                if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.ON) {
                    return isPassiveUnlocked;
                } else if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.EXCLUDE) {
                    return !isPassiveUnlocked;
                } else if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.UNLOCKABLE) {
                    return isPassiveUnlockable;
                } else if (unlocks.val === "PASSIVE" && unlocks.state === DropDownState.OFF) {
                    return true;
                }
            });
            const isCostReduced = starterData.valueReduction > 0;
            const isCostReductionUnlockable = this.isValueReductionAvailable(container.species.speciesId);
            const fitsCostReduction = this.filterBar.getVals(DropDownColumn.UNLOCKS).some(unlocks => {
                if (unlocks.val === "COST_REDUCTION" && unlocks.state === DropDownState.ON) {
                    return isCostReduced;
                } else if (unlocks.val === "COST_REDUCTION" && unlocks.state === DropDownState.EXCLUDE) {
                    return !isCostReduced;
                } else if (unlocks.val === "COST_REDUCTION" && unlocks.state === DropDownState.UNLOCKABLE) {
                    return isCostReductionUnlockable;
                } else if (unlocks.val === "COST_REDUCTION" && unlocks.state === DropDownState.OFF) {
                    return true;
                }
            });
            const isFavorite = this.starterPreferences[container.species.speciesId]?.favorite ?? false;
            const fitsFavorite = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
                if (misc.val === "FAVORITE" && misc.state === DropDownState.ON) {
                    return isFavorite;
                }
                if (misc.val === "FAVORITE" && misc.state === DropDownState.EXCLUDE) {
                    return !isFavorite;
                }
                if (misc.val === "FAVORITE" && misc.state === DropDownState.OFF) {
                    return true;
                }
            });
            const hasWon = starterData.classicWinCount > 0;
            const hasNotWon = starterData.classicWinCount === 0;
            const isUndefined = starterData.classicWinCount === undefined;
            const fitsWin = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
                if (misc.val === "WIN" && misc.state === DropDownState.ON) {
                    return hasWon;
                } else if (misc.val === "WIN" && misc.state === DropDownState.EXCLUDE) {
                    return hasNotWon || isUndefined;
                } else if (misc.val === "WIN" && misc.state === DropDownState.OFF) {
                    return true;
                }
            });
            const hasHA = starterData.abilityAttr & AbilityAttr.ABILITY_HIDDEN;
            const fitsHA = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
                if (misc.val === "HIDDEN_ABILITY" && misc.state === DropDownState.ON) {
                    return hasHA;
                } else if (misc.val === "HIDDEN_ABILITY" && misc.state === DropDownState.EXCLUDE) {
                    return !hasHA;
                } else if (misc.val === "HIDDEN_ABILITY" && misc.state === DropDownState.OFF) {
                    return true;
                }
            });
            const isEggPurchasable = this.isSameSpeciesEggAvailable(container.species.speciesId);
            const fitsEgg = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
                if (misc.val === "EGG" && misc.state === DropDownState.ON) {
                    return isEggPurchasable;
                } else if (misc.val === "EGG" && misc.state === DropDownState.EXCLUDE) {
                    return !isEggPurchasable;
                } else if (misc.val === "EGG" && misc.state === DropDownState.OFF) {
                    return true;
                }
            });
            const fitsPokerus = this.filterBar.getVals(DropDownColumn.MISC).some(misc => {
                if (misc.val === "POKERUS" && misc.state === DropDownState.ON) {
                    return this.pokerusSpecies.includes(container.species);
                } else if (misc.val === "POKERUS" && misc.state === DropDownState.EXCLUDE) {
                    return !this.pokerusSpecies.includes(container.species);
                } else if (misc.val === "POKERUS" && misc.state === DropDownState.OFF) {
                    return true;
                }
            });

            let fitsFusions = true;
            if (hasFusionsOnlyFilter) {
                const obtainedFusions = starterData?.obtainedFusions;
                fitsFusions = Array.isArray(obtainedFusions) && obtainedFusions.length > 0;
            }

            if (fitsGen && fitsType && fitsCaught && fitsPassive && fitsCostReduction && fitsFavorite && fitsWin && fitsHA && fitsEgg && fitsPokerus && fitsFusions) {
                this.filteredStarterContainers.push(container);
                if (hasFusionsOnlyFilter) {
                    const fusions = starterData?.obtainedFusions;
                    if (Array.isArray(fusions) && fusions.length > 0) {
                        fusions.forEach((fusionId: number, idx: number) => {
                            const fusionSpecies = getPokemonSpecies(fusionId);
                            if (fusionSpecies) {
                                const fusionContainer = new StarterContainer(this.scene as BattleScene, container.species);
                                fusionContainer.fusionSpeciesId = fusionId;
                                fusionContainer.fusionIndex = idx;
                                fusionContainer.setFusionOverlay(fusionSpecies);
                                fusionContainer.icon.clearTint();
                                fusionContainer.setVisible(false);
                                if (this.starterBoxContainer) {
                                    this.starterBoxContainer.add(fusionContainer);
                                }
                                this.fusionContainerPool.push(fusionContainer);
                                this.filteredStarterContainers.push(fusionContainer);
                            }
                        });
                    }
                }
            }
        });

        this.starterSelectScrollBar.setPages(Math.max(Math.ceil(this.filteredStarterContainers.length / 9), 1));
        this.starterSelectScrollBar.setPage(0);

        const sort = this.filterBar.getVals(DropDownColumn.SORT)[0];
        this.filteredStarterContainers.sort((a, b) => {
            if (!this.fusionsFilterActive) {
                const aIsSignature = this.isSignaturePokemon(a.species.speciesId as unknown as Species);
                const bIsSignature = this.isSignaturePokemon(b.species.speciesId as unknown as Species);

                if (aIsSignature && !bIsSignature) return -1;
                if (!aIsSignature && bIsSignature) return 1;
            }

            switch (sort.val) {
                default:
                    break;
                case 0:
                    const aRoot = a.species.getRootSpeciesId(true);
                    const bRoot = b.species.getRootSpeciesId(true);
                    if (aRoot !== bRoot) {
                        return (aRoot - bRoot) * -sort.dir;
                    }
                    return (a.species.speciesId - b.species.speciesId) * -sort.dir;
                case 1:
                    return (a.cost - b.cost) * -sort.dir;
                case 2:
                    const candyCountA = this.scene.gameData.starterData[a.species.speciesId].candyCount;
                    const candyCountB = this.scene.gameData.starterData[b.species.speciesId].candyCount;
                    return (candyCountA - candyCountB) * -sort.dir;
                case 3:
                    const avgIVsA = this.scene.gameData.dexData[a.species.speciesId].ivs.reduce((a, b) => a + b, 0) / this.scene.gameData.dexData[a.species.speciesId].ivs.length;
                    const avgIVsB = this.scene.gameData.dexData[b.species.speciesId].ivs.reduce((a, b) => a + b, 0) / this.scene.gameData.dexData[b.species.speciesId].ivs.length;
                    return (avgIVsA - avgIVsB) * -sort.dir;
                case 4:
                    return a.species.name.localeCompare(b.species.name) * -sort.dir;
            }
            return 0;
        });

        if (!this.fusionsFilterActive) {
            if (this.lastSpecies) {
                const partyIdx = this.starterSpecies.indexOf(this.lastSpecies);
                if (partyIdx >= 0 && partyIdx < this.starterSignatureFlags.length) {
                    this.signatureModeActive = this.starterSignatureFlags[partyIdx];
                } else {
                    this.signatureModeActive = this.isSignaturePokemon(
                        this.lastSpecies.speciesId as unknown as Species
                    );
                }
            } else {
                this.signatureModeActive = true;
            }
        }

        this.updateScroll();
        const fusionsKeyChanged = prevFusionsKey !== null && prevFusionsKey !== nextFusionsKey;
        this.prevFusionsFilterKey = nextFusionsKey;
        if (fusionsKeyChanged && !this.filterMode) {
            const current = (this.lastSpecies as any) as PokemonSpecies | null;
            if (current) {
                const stillVisible = this.filteredStarterContainers.some(c => c.species === current);
                if (stillVisible) {
                    this.setSpecies(current);
                } else if (this.filteredStarterContainers.length > 0) {
                    this.setSpecies(this.filteredStarterContainers[0].species);
                } else {
                    this.setSpecies(null);
                }
            }
        }
    };

    updateScroll = () => {
        this.pokerusCursorObjs.forEach(cursor => cursor.setVisible(false));

        const maxColumns = 9;
        const maxRows = 9;
        const onScreenFirstIndex = this.scrollCursor * maxColumns;
        const onScreenLastIndex = Math.min(this.filteredStarterContainers.length - 1, onScreenFirstIndex + maxRows * maxColumns - 1);

        this.starterSelectScrollBar.setPage(this.scrollCursor);

        let pokerusCursorIndex = 0;
        this.filteredStarterContainers.forEach((container, i) => {
            const pos = calcStarterPosition(i, this.scrollCursor);
            container.setPosition(pos.x, pos.y);
            if (container.hitZone) {
              container.hitZone.off("pointerdown");
              container.hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
                if (!isPrimaryPointer(pointer)) return;
                if (this.isPointerInputBlocked()) return;
                this._gridDragStartY = pointer.y;
                if (this.filterMode && this.filterBar.openDropDown) {
                  this.filterBar.hideDropDowns();
                  this.hideFilterDismissZone();
                  this.setFilterMode(false);
                  return;
                }
                if (this.filterMode) {
                  this.filterBar.hideDropDowns();
                  this.hideFilterDismissZone();
                  this.setFilterMode(false);
                  return;
                }
                this.startCursorObj.setVisible(false);
                this.starterIconsCursorObj.setVisible(false);
                this.fusionsCursorObj.setVisible(false);
                this.cursorObj.setVisible(true);
                if (this.cursor === i && !this.filterMode) {
                  this.processInput(Button.ACTION);
                } else {
                  this.setCursor(i);
                }
              });
            }
            if (i < onScreenFirstIndex || i > onScreenLastIndex) {
                container.setVisible(false);

                if (this.pokerusSpecies.includes(container.species)) {
                    this.pokerusCursorObjs[pokerusCursorIndex].setPosition(pos.x - 1, pos.y + 1);
                    this.pokerusCursorObjs[pokerusCursorIndex].setVisible(false);
                    pokerusCursorIndex++;
                }

                if (this.starterSpecies.includes(container.species)) {
                    this.starterCursorObjs[this.starterSpecies.indexOf(container.species)].setPosition(pos.x - 1, pos.y + 1);
                    this.starterCursorObjs[this.starterSpecies.indexOf(container.species)].setVisible(false);
                }
                return;
            } else {
                container.setVisible(true);

                if (this.pokerusSpecies.includes(container.species)) {
                    this.pokerusCursorObjs[pokerusCursorIndex].setPosition(pos.x - 1, pos.y + 1);
                    this.pokerusCursorObjs[pokerusCursorIndex].setVisible(true);
                    pokerusCursorIndex++;
                }

                if (this.starterSpecies.includes(container.species)) {
                    this.starterCursorObjs[this.starterSpecies.indexOf(container.species)].setPosition(pos.x - 1, pos.y + 1);
                    this.starterCursorObjs[this.starterSpecies.indexOf(container.species)].setVisible(true);
                }

                const speciesId = container.species.speciesId;
                this.updateStarterValueLabel(container);

                const isEggStarterMode = this.getMode() === Mode.EGG_STARTER_SELECT;
                const isSignature = !isEggStarterMode && this.isEffectivelySignature(speciesId as unknown as Species);
                if (isSignature) {
                    if (container.icon.postFX && typeof container.icon.postFX.addColorMatrix === 'function') {
                        container.icon.postFX.clear();
                        const colorMatrix = container.icon.postFX.addColorMatrix();
                        colorMatrix.negative();
                    }
                } else {
                    if (container.icon.postFX) {
                        container.icon.postFX.clear();
                    }
                }

                container.label.setVisible(this.getMode() !== Mode.EGG_STARTER_SELECT);
                const speciesVariants = speciesId && this.scene.gameData.dexData[speciesId].caughtAttr & DexAttr.SHINY
                    ? [DexAttr.DEFAULT_VARIANT, DexAttr.VARIANT_2, DexAttr.VARIANT_3].filter(v => !!(this.scene.gameData.dexData[speciesId].caughtAttr & v))
                    : [];
                for (let v = 0; v < 3; v++) {
                    const hasVariant = speciesVariants.length > v;
                    container.shinyIcons[v].setVisible(hasVariant);
                    if (hasVariant) {
                        container.shinyIcons[v].setTint(getVariantTint(speciesVariants[v] === DexAttr.DEFAULT_VARIANT ? 0 : speciesVariants[v] === DexAttr.VARIANT_2 ? 1 : 2));
                    }
                }

                container.starterPassiveBgs.setVisible(!!this.scene.gameData.starterData[speciesId].passiveAttr);
                container.hiddenAbilityIcon.setVisible(!!this.scene.gameData.dexData[speciesId].caughtAttr && !!(this.scene.gameData.starterData[speciesId].abilityAttr & 4));
                container.classicWinIcon.setVisible(this.scene.gameData.starterData[speciesId].classicWinCount > 0);
                container.favoriteIcon.setVisible(this.starterPreferences[speciesId]?.favorite ?? false);
                if (this.scene.candyUpgradeDisplay === 0) {

                    if (!starterColors || !starterColors[speciesId]) {
                    if (starterColors) {
                        starterColors[speciesId] = ["ffffff", "ffffff"];
                    }
                }

                    const candyScheme = starterColors?.[speciesId] ?? ["ffffff", "ffffff"];
                    container.candyUpgradeIcon.setTint(argbFromRgba(Utils.rgbHexToRgba(candyScheme[0])));
                    container.candyUpgradeOverlayIcon.setTint(argbFromRgba(Utils.rgbHexToRgba(candyScheme[1])));

                    this.setUpgradeIcon(container);
                } else if (this.scene.candyUpgradeDisplay === 1) {
                    container.candyUpgradeIcon.setVisible(false);
                    container.candyUpgradeOverlayIcon.setVisible(false);
                }
            }
        });
    };

    setCursor(cursor: integer): boolean {
        let changed = false;

        if (this.filterMode) {
            changed = this.filterBarCursor !== cursor;
            this.filterBarCursor = cursor;

            this.filterBar.setCursor(cursor);
        } else {
            if (this.filteredStarterContainers.length === 0) {
                return false;
            }

            cursor = Math.max(Math.min(this.filteredStarterContainers.length - 1, cursor), 0);
            changed = super.setCursor(cursor);

            const pos = calcStarterPosition(cursor, this.scrollCursor);
            this.cursorObj.setPosition(pos.x - 1, pos.y + 1);

            const cursorContainer = this.filteredStarterContainers[cursor];
            const species = cursorContainer?.species;

            if (species) {
                const defaultDexAttr = this.getCurrentDexProps(species.speciesId);
                const defaultProps = this.scene.gameData.getSpeciesDexAttrProps(species, defaultDexAttr);
                const variant = this.starterPreferences[species.speciesId]?.variant ? this.starterPreferences[species.speciesId].variant as Variant : defaultProps.variant;
                const tint = getVariantTint(variant);
                this.pokemonShinyIcon.setFrame(getVariantIcon(variant));
                this.pokemonShinyIcon.setTint(tint);
                const gridFusionIndex = cursorContainer?.fusionIndex ?? -1;
                this.setSpecies(species, gridFusionIndex);
                this.updateInstructions();
            } else {
                console.warn("Species is undefined for cursor position", cursor);
                this.setFilterMode(true);
            }
        }

        return changed;
    }

    setFilterMode(filterMode: boolean): boolean {
        this.cursorObj.setVisible(!filterMode);
        this.filterBar.cursorObj.setVisible(filterMode);

        if (filterMode !== this.filterMode) {
            this.filterMode = filterMode;
            this.setCursor(filterMode ? this.filterBarCursor : this.cursor);
            if (filterMode) {
                this.setSpecies(null);
                this.updateInstructions();
            }

            return true;
        }

        return false;
    }

    private setGridInteractive(enabled: boolean): void {
        for (const sc of this.starterContainers) {
            if (sc.hitZone) {
                if (enabled) {
                    sc.hitZone.setInteractive();
                } else {
                    sc.hitZone.disableInteractive();
                }
            }
        }
    }

    private showFilterDismissZone(): void {
        if (this.filterDismissZone) return;
        const w = this.scene.game.canvas.width / 6;
        const h = this.scene.game.canvas.height / 6;
        this.filterDismissZone = this.scene.add.zone(0, 0, w, h);
        this.filterDismissZone.setOrigin(0, 0);
        this.filterDismissZone.setInteractive(
            new Phaser.Geom.Rectangle(0, 0, w, h),
            Phaser.Geom.Rectangle.Contains
        );
        this.filterDismissZone.setDepth(this.filterBarContainer.depth - 1);
        this.filterDismissZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (!isPrimaryPointer(pointer)) return;
            const openDD = this.filterBar.getOpenDropDown();
            if (openDD) {
                const ddBounds = openDD.getBounds();
                if (ddBounds.contains(pointer.x, pointer.y)) {
                    return;
                }
            }
            const barBounds = this.filterBar.getBounds();
            if (barBounds.contains(pointer.x, pointer.y)) {
                return;
            }
            this.filterBar.hideDropDowns();
            this.setFilterMode(false);
            this.hideFilterDismissZone();
        });
        this.starterSelectContainer.add(this.filterDismissZone);
        this.starterSelectContainer.bringToTop(this.filterBarContainer);
        this.setGridInteractive(false);
    }

    private hideFilterDismissZone(): void {
        if (this.filterDismissZone) {
            this.filterDismissZone.removeAllListeners();
            this.filterDismissZone.destroy();
            this.filterDismissZone = null;
        }
        this.setGridInteractive(true);
    }

    moveStarterIconsCursor(index: number): void {
        if (index < 0 || index >= this.starterIcons.length) {
            console.warn("Invalid starterIcons index:", index);
            this.starterIconsCursorObj.setVisible(false);
            return;
        }

        this.starterIconsCursorObj.x = this.starterIcons[index].x + this.starterIconsCursorXOffset;
        this.starterIconsCursorObj.y = this.starterIcons[index].y + this.starterIconsCursorYOffset;
        if (this.starterSpecies.length > 0 && index < this.starterSpecies.length) {
            this.starterIconsCursorObj.setVisible(true);

            this.setSpecies(this.starterSpecies[index]);
            this.showPartySlotTooltip(index);
        } else {
            this.starterIconsCursorObj.setVisible(false);
            this.setSpecies(null);
            this.hidePartySlotTooltip();
        }
    }

    setSpecies(species: PokemonSpecies | null, gridFusionIndex: number = -1) {
        this.hideSummaryTooltip();
        if (!species) {
          this.hidePartySlotTooltip();
        }
        this.speciesStarterDexEntry = species ? this.scene.gameData.dexData[species.speciesId] : null;
        this.dexAttrCursor = species ? this.getCurrentDexProps(species.speciesId) : 0n;
        this.abilityCursor = species ? this.scene.gameData.getStarterSpeciesDefaultAbilityIndex(species) : 0;
        this.natureCursor = species ? this.scene.gameData.getSpeciesDefaultNature(species) : 0;

        const partyIdx = species ? this.starterSpecies.indexOf(species) : -1;
        if (partyIdx >= 0 && partyIdx < this.starterSignatureFlags.length) {
            this.signatureModeActive = this.starterSignatureFlags[partyIdx];
        } else {
            this.signatureModeActive = species ? this.isSignaturePokemon(species.speciesId as unknown as Species) : true;
        }
        if (this.fusionsFilterActive) {
            this.signatureModeActive = false;
        }

        const starterAttributes: StarterAttributes | null = species ? this.initStarterPrefs(species) : null;
        this.fusionCursor = -1;

        if (starterAttributes?.nature !== undefined) {
            this.natureCursor = starterAttributes.nature;
        }
        if (starterAttributes?.ability && !isNaN(starterAttributes.ability)) {

            this.abilityCursor = starterAttributes.ability;
        }

        if (this.statsMode) {
            if (this.speciesStarterDexEntry?.caughtAttr) {
                this.statsContainer.setVisible(true);
                this.showStats();
            } else {
                this.statsContainer.setVisible(false);

                this.statsContainer.updateIvs(null);
            }
        }

        if (this.lastSpecies) {
            const dexAttr = this.getCurrentDexProps(this.lastSpecies.speciesId);
            const props = this.scene.gameData.getSpeciesDexAttrProps(this.lastSpecies, dexAttr);
            const speciesIndex = this.allSpecies.indexOf(this.lastSpecies);

            if (speciesIndex >= 0 && speciesIndex < this.starterContainers.length) {
                const lastSpeciesIcon = this.starterContainers[speciesIndex].icon;
                this.checkIconId(lastSpeciesIcon, this.lastSpecies, props.female, props.formIndex, props.shiny, props.variant);
                this.iconAnimHandler.addOrUpdate(lastSpeciesIcon, PokemonIconAnimMode.NONE);
                const icon = this.starterContainers[speciesIndex].icon;
                this.scene.tweens.getTweensOf(icon).forEach(tween => tween.resume());
            }
        }

        this.lastSpecies = species!;

        const isEggStarterMode = this.getMode() === Mode.EGG_STARTER_SELECT;

        if (species && (isEggStarterMode || this.speciesStarterDexEntry?.seenAttr || this.speciesStarterDexEntry?.caughtAttr)) {
            this.pokemonNumberText.setText(Utils.padInt(species.speciesId, 4));
            if (starterAttributes?.nickname) {
                const name = decodeURIComponent(escape(atob(starterAttributes.nickname)));
                this.fitPokemonNameToWidth(name, species);
            } else {
                const isSignature = this.isEffectivelySignature(species.speciesId as unknown as Species);
                if (isSignature) {
                    if (!this.isInitialCursorSet && !this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.STARTER_SELECT_SIGNATURE)) {
                        this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.STARTER_SELECT_SIGNATURE, true, false);
                    }
                    const altBuildId = this.getSignatureAltBuildId(species.speciesId as unknown as Species);
                    const signatureName = altBuildId
                        ? ChampionUtils.getAltBuildDisplayName(altBuildId)
                        : i18next.t("starterSelectUiHandler:signatureLabel");
                    this.fitPokemonNameToWidth(signatureName, species);
                } else {
                    this.fitPokemonNameToWidth(species.name, species);
                }
            }

            if (isEggStarterMode || this.speciesStarterDexEntry?.caughtAttr) {
                const colorScheme = starterColors?.[species.speciesId];
                let growthReadable = Utils.toReadableString(GrowthRate[species.growthRate]);
                const growthAux = growthReadable.replace(" ", "_");
                if (i18next.exists("growth:" + growthAux)) {
                    growthReadable = i18next.t("growth:" + growthAux as any);
                }
                this.pokemonGrowthRateText.setText(growthReadable);

                this.pokemonGrowthRateText.setColor(getGrowthRateColor(species.growthRate));
                this.pokemonGrowthRateText.setShadowColor(getGrowthRateColor(species.growthRate, true));
                this.pokemonGrowthRateLabelText.setVisible(true);
                this.pokemonUncaughtText.setVisible(false);
                this.pokemonAbilityLabelText.setVisible(true);

                const hasDefinedPassive = starterPassiveAbilities[species.speciesId] !== undefined;
                const isDuelmon = DUELMON_SPECIES_IDS.has(species.speciesId);
                this.pokemonPassiveLabelText.setVisible(hasDefinedPassive);
                this.pokemonNatureLabelText.setVisible(true);
                if (isDuelmon && !hasDefinedPassive) {
                    const passiveY = this.pokemonPassiveLabelText.y;
                    this.pokemonNatureLabelText.setY(passiveY);
                    this.pokemonNatureText.setY(passiveY);
                } else {
                    const defaultNatureY = this.pokemonPassiveLabelText.y + 9;
                    this.pokemonNatureLabelText.setY(defaultNatureY);
                    this.pokemonNatureText.setY(defaultNatureY);
                }
                if (this.speciesStarterDexEntry?.caughtAttr) {
                    this.pokemonCaughtCountText.setText(`${this.speciesStarterDexEntry.caughtCount}`);
                    if (species.speciesId === Species.MANAPHY || species.speciesId === Species.PHIONE) {
                        this.pokemonHatchedIcon.setFrame("manaphy");
                    } else {
                        this.pokemonHatchedIcon.setFrame(getEggTierForSpecies(species));
                    }
                    this.pokemonHatchedCountText.setText(`${this.speciesStarterDexEntry.hatchedCount}`);
                } else if (isEggStarterMode) {
                    this.pokemonCaughtCountText.setText("0");
                    if (species.speciesId === Species.MANAPHY || species.speciesId === Species.PHIONE) {
                        this.pokemonHatchedIcon.setFrame("manaphy");
                    } else {
                        this.pokemonHatchedIcon.setFrame(getEggTierForSpecies(species));
                    }
                    this.pokemonHatchedCountText.setText("1");
                }

                const defaultDexAttr = this.getCurrentDexProps(species.speciesId);
                const defaultProps = this.scene.gameData.getSpeciesDexAttrProps(species, defaultDexAttr);
                const variant = defaultProps.variant;
                const tint = getVariantTint(variant);
                this.pokemonShinyIcon.setFrame(getVariantIcon(variant));
                this.pokemonShinyIcon.setTint(tint);
                this.pokemonShinyIcon.setVisible(defaultProps.shiny);
                this.pokemonCaughtHatchedContainer.setVisible(!isEggStarterMode);
                if (pokemonPrevolutions.hasOwnProperty(species.speciesId)) {
                    this.pokemonCaughtHatchedContainer.setY(16);
                    this.pokemonShinyIcon.setY(135);
                    this.pokemonShinyIcon.setFrame(getVariantIcon(variant));
                    [
                        this.pokemonCandyIcon,
                        this.pokemonCandyOverlayIcon,
                        this.pokemonCandyDarknessOverlay,
                        this.pokemonCandyCountText,
                        this.pokemonHatchedIcon,
                        this.pokemonHatchedCountText,
                        this.pokemonFusionDnaIcon,
                        this.pokemonFusionPartnerIcon
                    ].filter(c => !!c).map(c => c.setVisible(false));
                    this.pokemonFormText.setY(25);
                } else {
                    this.pokemonCaughtHatchedContainer.setY(25);
                    this.pokemonShinyIcon.setY(117);
                    this.pokemonCandyIcon.setTint(argbFromRgba(Utils.rgbHexToRgba(colorScheme?.[0] ?? "ffffff")));
                    this.pokemonCandyIcon.setVisible(!isEggStarterMode);
                    this.pokemonCandyOverlayIcon.setTint(argbFromRgba(Utils.rgbHexToRgba(colorScheme?.[1] ?? "ffffff")));
                    this.pokemonCandyOverlayIcon.setVisible(!isEggStarterMode);
                    this.pokemonCandyDarknessOverlay.setVisible(!isEggStarterMode);

                    if (!isEggStarterMode && this.scene.gameData.starterData[species.speciesId]) {
                        this.pokemonCandyCountText.setText(`x${this.scene.gameData.starterData[species.speciesId].candyCount}`);
                    } else {
                        this.pokemonCandyCountText.setText("x0");
                    }

                    this.pokemonCandyCountText.setVisible(!isEggStarterMode);
                    this.pokemonFormText.setVisible(true);
                    this.pokemonFormText.setY(42);
                    this.pokemonHatchedIcon.setVisible(!isEggStarterMode);
                    this.pokemonHatchedCountText.setVisible(!isEggStarterMode);

                    let currentFriendship = 0;
                    if (!isEggStarterMode && this.lastSpecies && this.scene.gameData.starterData[this.lastSpecies.speciesId]) {
                        currentFriendship = this.scene.gameData.starterData[this.lastSpecies.speciesId].friendship || 0;
                    }

                    const friendshipCap = getStarterValueFriendshipCap(speciesStarters[this.lastSpecies.speciesId] || 0);
                    const candyCropY = 16 - (16 * (currentFriendship / friendshipCap));

                    if (this.pokemonCandyDarknessOverlay.visible) {
                        this.pokemonCandyDarknessOverlay.on("pointerover", () => (this.scene as BattleScene).ui.showTooltip("", `${currentFriendship}/${friendshipCap}`, true));
                        this.pokemonCandyDarknessOverlay.on("pointerout", () => (this.scene as BattleScene).ui.hideTooltip());
                    }

                    this.pokemonCandyDarknessOverlay.setCrop(0, 0, 16, candyCropY);
                }
                const speciesIndex = this.allSpecies.indexOf(species);
                if (speciesIndex >= 0 && speciesIndex < this.starterContainers.length) {

                    const icon = this.starterContainers[speciesIndex].icon;

                    if (this.isUpgradeAnimationEnabled()) {
                        this.scene.tweens.getTweensOf(icon).forEach(tween => tween.pause());

                        icon.x = 7;
                        icon.y = 2;
                    }
                    this.iconAnimHandler.addOrUpdate(icon, PokemonIconAnimMode.PASSIVE);
                }

                const starterIndex = this.starterSpecies.indexOf(species);

                let props: DexAttrProps;

                if (starterIndex > -1) {
                    props = this.scene.gameData.getSpeciesDexAttrProps(species, this.starterAttr[starterIndex]);
                    if (isEggStarterMode && this.isEggModePartyPokemonSelected()) {
                        this.setPartyPokemonDetails();
                    } else {
                        this.setSpeciesDetails(species, props.shiny, props.formIndex, props.female, props.variant, this.starterAbilityIndexes[starterIndex], this.starterNatures[starterIndex], false, this.starterFusionIndexes[starterIndex]);
                    }
                } else {
                    const defaultDexAttr = this.getCurrentDexProps(species.speciesId);
                    const defaultAbilityIndex = starterAttributes?.ability ?? this.scene.gameData.getStarterSpeciesDefaultAbilityIndex(species);

                    const defaultNature = starterAttributes?.nature ?? this.scene.gameData.getSpeciesDefaultNature(species);
                    props = this.scene.gameData.getSpeciesDexAttrProps(species, defaultDexAttr);
                    if (starterAttributes?.variant && !isNaN(starterAttributes.variant)) {
                        if (props.shiny) {
                            props.variant = starterAttributes.variant as Variant;
                        }
                    }
                    props.formIndex = starterAttributes?.form ?? props.formIndex;
                    props.female = starterAttributes?.female ?? props.female;

                    const hasFusionsOnlyFilter = this.fusionsFilterActive;

                    const rawObtainedFusions = this.scene.gameData.starterData[species.speciesId]?.obtainedFusions;
                    const obtainedFusions = Array.isArray(rawObtainedFusions) ? rawObtainedFusions : [];
                    let defaultFusionIndex = -1;
                    if (gridFusionIndex >= 0 && gridFusionIndex < obtainedFusions.length) {
                        defaultFusionIndex = gridFusionIndex;
                    } else {
                        const savedFusionIndex = starterAttributes?.fusion;
                        if (savedFusionIndex !== undefined && Number.isInteger(savedFusionIndex) && savedFusionIndex >= 0 && savedFusionIndex < obtainedFusions.length) {
                            defaultFusionIndex = savedFusionIndex;
                        }
                    }
                    this.setSpeciesDetails(species, props.shiny, props.formIndex, props.female, props.variant, defaultAbilityIndex, defaultNature, false, defaultFusionIndex);
                }

                if (!this.pokemon?.isFusion()) {
                    const speciesForm = getPokemonSpeciesForm(species.speciesId, props.formIndex);
                    this.setTypeIcons(speciesForm.type1, speciesForm!.type2!);
                    this.pokemonSprite.clearTint();
                }
                if (this.pokerusSpecies.includes(species)) {
                    handleTutorial(this.scene, Tutorial.Pokerus);
                }
            } else {

                this.pokemonGrowthRateText.setText("");
                this.pokemonGrowthRateLabelText.setVisible(false);
                this.type1Icon.setVisible(false);
                this.type2Icon.setVisible(false);
                this.pokemonGenderText.setText("");
                this.pokemonUncaughtText.setVisible(true);
                this.pokemonAbilityLabelText.setVisible(false);
                this.pokemonAbilityText.setText("");
                this.pokemonFusionLabelText.setVisible(false);
                this.pokemonFusionText.setText("");
                if (this.pokemonFusionDnaIcon) this.pokemonFusionDnaIcon.setVisible(false);
                if (this.pokemonFusionPartnerIcon) this.pokemonFusionPartnerIcon.setVisible(false);
                this.pokemonFusionInfoDnaIcon?.setVisible(false);
                this.pokemonFusionInfoSpeciesIcon?.setVisible(false);
                this.pokemonPassiveLabelText.setVisible(false);
                this.pokemonPassiveText.setText("");
                this.pokemonNatureLabelText.setVisible(false);
                this.pokemonNatureText.setText("");
                this.pokemonCaughtHatchedContainer.setVisible(false);
                this.pokemonShinyIcon.setVisible(false);
                this.pokemonMovesContainer.setVisible(false);
                this.pokemonFormText.setVisible(false);

                const defaultDexAttr = this.scene.gameData.getSpeciesDefaultDexAttr(species, true, true);
                const defaultAbilityIndex = this.scene.gameData.getStarterSpeciesDefaultAbilityIndex(species);
                const defaultNature = this.scene.gameData.getSpeciesDefaultNature(species);
                const props = this.scene.gameData.getSpeciesDexAttrProps(species, defaultDexAttr);

                this.setSpeciesDetails(species, props.shiny, props.formIndex, props.female, props.variant, defaultAbilityIndex, defaultNature, true);
                if(!isEggStarterMode) {
                    this.pokemonSprite.setTint(0x808080);
                }
            }
        } else {
            this.pokemonNumberText.setText("");
            this.fitPokemonNameToWidth("", null);
            this.pokemonGrowthRateText.setText("");
            this.pokemonGrowthRateLabelText.setVisible(false);
            this.type1Icon.setVisible(false);
            this.type2Icon.setVisible(false);
            this.pokemonGenderText.setText("");
            this.pokemonUncaughtText.setVisible(false);
            this.pokemonAbilityLabelText.setVisible(false);
            this.pokemonAbilityText.setText("");
            this.pokemonPassiveLabelText.setVisible(false);
            this.pokemonPassiveText.setText("");
            this.pokemonFusionLabelText.setVisible(false);
            this.pokemonFusionText.setText("");
            if (this.pokemonFusionDnaIcon) this.pokemonFusionDnaIcon.setVisible(false);
            if (this.pokemonFusionPartnerIcon) this.pokemonFusionPartnerIcon.setVisible(false);
            this.pokemonFusionInfoDnaIcon?.setVisible(false);
            this.pokemonFusionInfoSpeciesIcon?.setVisible(false);
            this.pokemonNatureLabelText.setVisible(false);
            this.pokemonNatureText.setText("");
            this.pokemonFormText.setVisible(false);
            this.pokemonCaughtHatchedContainer.setVisible(false);
            this.pokemonShinyIcon.setVisible(false);
            this.pokemonMovesContainer.setVisible(false);
            this.pokemonSprite.setCrop();
            this.pokemonSprite.setTexture("blank");
            this.starterPortalSprite?.setVisible(false);
            this.shinyOverlay.visible = false;
            this.setSpeciesDetails(species!, false, 0, false, 0, 0, 0);
            this.pokemonSprite.clearTint();
        }
    }

    setSpeciesDetails(species: PokemonSpecies, shiny?: boolean, formIndex?: integer, female?: boolean, variant?: Variant, abilityIndex?: integer, natureIndex?: integer, forSeen: boolean = false, fusionIndex: integer = -1, ignoreFusionMoveCombining: boolean = false): void {
        const isEggStarterMode = this.getMode() === Mode.EGG_STARTER_SELECT;
        const oldProps = species ? this.scene.gameData.getSpeciesDexAttrProps(species, this.dexAttrCursor) : null;
        const oldAbilityIndex = this.abilityCursor > -1 ? this.abilityCursor : this.scene.gameData.getStarterSpeciesDefaultAbilityIndex(species);

        const oldFusionIndex = this.fusionCursor > -1 ? this.fusionCursor : -1;
        const oldNatureIndex = this.natureCursor > -1 ? this.natureCursor : this.scene.gameData.getSpeciesDefaultNature(species);
        this.dexAttrCursor = 0n;
        this.abilityCursor = -1;
        this.natureCursor = -1;

        this.fusionCursor = -1;

        if (species?.forms?.find(f => f.formKey === "female")) {
            if (female !== undefined) {
                formIndex = female ? 1 : 0;
            } else if (formIndex !== undefined) {
                female = formIndex === 1;
            }
        }

        if (species) {
            this.dexAttrCursor |= (shiny !== undefined ? !shiny : !(shiny = oldProps?.shiny)) ? DexAttr.NON_SHINY : DexAttr.SHINY;
            this.dexAttrCursor |= (female !== undefined ? !female : !(female = oldProps?.female)) ? DexAttr.MALE : DexAttr.FEMALE;
            this.dexAttrCursor |= (variant !== undefined ? !variant : !(variant = oldProps?.variant)) ? DexAttr.DEFAULT_VARIANT : variant === 1 ? DexAttr.VARIANT_2 : DexAttr.VARIANT_3;
            this.dexAttrCursor |= this.scene.gameData.getFormAttr(formIndex !== undefined ? formIndex : (formIndex = oldProps!.formIndex));
            this.abilityCursor = abilityIndex !== undefined ? abilityIndex : (abilityIndex = oldAbilityIndex);

            this.fusionCursor = fusionIndex !== undefined ? fusionIndex : (fusionIndex = oldFusionIndex);
            this.natureCursor = natureIndex !== undefined ? natureIndex : (natureIndex = oldNatureIndex);
            const [isInParty, partyIndex]: [boolean, number] = this.isInParty(species);
            if (isInParty) {
                this.updatePartyIcon(species, partyIndex);
            }
            if (fusionIndex >= 0 && (!this.isEffectivelySignature(species.speciesId as unknown as Species) || this.fusionsFilterActive)) {
                this.pokemon = this.scene.addPlayerPokemon(species, 5, abilityIndex ?? 0, formIndex ?? 0, female ? Gender.FEMALE : Gender.MALE, shiny, variant);
                this.pokemon.generateFusionViaSpeciesID(this.scene.gameData.starterData[species.speciesId].obtainedFusions[fusionIndex], true);
                if (this.pokemonFusionDnaIcon) {
                    this.pokemonFusionDnaIcon.setVisible(true);
                }
                if (this.pokemonFusionPartnerIcon && this.pokemon.fusionSpecies) {
                    const fSpecies = this.pokemon.fusionSpecies;
                    const fDexAttr = this.scene.gameData.getSpeciesDefaultDexAttr(fSpecies, false, true);
                    const fProps = this.scene.gameData.getSpeciesDexAttrProps(fSpecies, fDexAttr);
                    this.pokemonFusionPartnerIcon.setTexture(
                        fSpecies.getIconAtlasKey(fProps.formIndex, fProps.shiny, fProps.variant)
                    );
                    this.pokemonFusionPartnerIcon.setFrame(
                        fSpecies.getIconId(fProps.female, fProps.formIndex, fProps.shiny, fProps.variant)
                    );
                    this.pokemonFusionPartnerIcon.setVisible(true);
                }
                if (this.pokemonFusionInfoDnaIcon) {
                    this.pokemonFusionInfoDnaIcon.setVisible(true);
                }
                if (this.pokemonFusionInfoSpeciesIcon && this.pokemon.fusionSpecies) {
                    const fSpecies = this.pokemon.fusionSpecies;
                    const fDexAttr = this.scene.gameData.getSpeciesDefaultDexAttr(fSpecies, false, true);
                    const fProps = this.scene.gameData.getSpeciesDexAttrProps(fSpecies, fDexAttr);
                    this.pokemonFusionInfoSpeciesIcon.setTexture(
                        fSpecies.getIconAtlasKey(fProps.formIndex, fProps.shiny, fProps.variant)
                    );
                    this.pokemonFusionInfoSpeciesIcon.setFrame(
                        fSpecies.getIconId(fProps.female, fProps.formIndex, fProps.shiny, fProps.variant)
                    );
                    this.pokemonFusionInfoSpeciesIcon.setVisible(true);
                }
            } else if (this.pokemon) {
                this.pokemonSprite.clearTint();
                this.pokemonSprite.setPipeline(this.scene.spritePipeline, {
                    tone: [0.0, 0.0, 0.0, 0.0],
                    ignoreTimeTint: true
                })
                this.pokemon = null;
                if (this.pokemonFusionDnaIcon) {
                    this.pokemonFusionDnaIcon.setVisible(false);
                }
                if (this.pokemonFusionPartnerIcon) {
                    this.pokemonFusionPartnerIcon.setVisible(false);
                }
                if (this.pokemonFusionInfoDnaIcon) {
                    this.pokemonFusionInfoDnaIcon.setVisible(false);
                }
                if (this.pokemonFusionInfoSpeciesIcon) {
                    this.pokemonFusionInfoSpeciesIcon.setVisible(false);
                }
            }
        }

        this.pokemonSprite.setVisible(false);

        if (this.assetLoadCancelled) {
            this.assetLoadCancelled.value = true;
            this.assetLoadCancelled = null;
        }

        this.starterMoveset = null;
        this.speciesStarterMoves = [];

        if (species) {
            const dexEntry = this.scene.gameData.dexData[species.speciesId];
            const abilityAttr = this.scene.gameData.starterData[species.speciesId].abilityAttr;

            const caughtAttr = this.scene.gameData.dexData[species.speciesId]?.caughtAttr || BigInt(0);

            if (!dexEntry.caughtAttr) {
                const props = this.scene.gameData.getSpeciesDexAttrProps(species, this.getCurrentDexProps(species.speciesId));
                const defaultAbilityIndex = this.scene.gameData.getStarterSpeciesDefaultAbilityIndex(species);
                const defaultNature = this.scene.gameData.getSpeciesDefaultNature(species);
                if (shiny === undefined || shiny !== props.shiny) {
                    shiny = props.shiny;
                }
                if (formIndex === undefined || formIndex !== props.formIndex) {
                    formIndex = props.formIndex;
                }
                if (female === undefined || female !== props.female) {
                    female = props.female;
                }
                if (variant === undefined || variant !== props.variant) {
                    variant = props.variant;
                }
                if (abilityIndex === undefined || abilityIndex !== defaultAbilityIndex) {
                    abilityIndex = defaultAbilityIndex;
                }
                if (natureIndex === undefined || natureIndex !== defaultNature) {
                    natureIndex = defaultNature;
                }
            }

            this.shinyOverlay.setVisible(false);
            this.pokemonNumberText.setColor(this.getTextColor(shiny ? TextStyle.SUMMARY_GOLD : TextStyle.SUMMARY, false));
            this.pokemonNumberText.setShadowColor(this.getTextColor(shiny ? TextStyle.SUMMARY_GOLD : TextStyle.SUMMARY, true));
            let speciesForDetails = this.pokemon && this.pokemon.isFusion() ? this.pokemon.fusionSpecies! : species!;
            if (forSeen ? this.speciesStarterDexEntry?.seenAttr : (this.speciesStarterDexEntry?.caughtAttr || isEggStarterMode)) {
                const starterIndex = this.starterSpecies.indexOf(species);

                if (starterIndex > -1) {
                    this.starterAttr[starterIndex] = this.dexAttrCursor;
                    this.starterAbilityIndexes[starterIndex] = this.abilityCursor;
                    this.starterNatures[starterIndex] = this.natureCursor;
                    this.starterFusionIndexes[starterIndex] = this.fusionCursor;
                }

                const assetLoadCancelled = new Utils.BooleanHolder(false);
                this.assetLoadCancelled = assetLoadCancelled;

                const previousSpriteKey = isIPhone() ? this.pokemonSprite.texture?.key : null;

                this.lastSpecies.loadAssets(this.scene, female!, formIndex, shiny, variant, true).then(() => {
                    const loadSpeciesDetails = () => {
                        if (assetLoadCancelled.value) {
                            return;
                        }
                        this.assetLoadCancelled = null;
                        this.speciesLoaded.set(species.speciesId, true);
                        const spriteKey = this.lastSpecies.getSpriteKey(female, formIndex, shiny, variant);

                        if (previousSpriteKey && previousSpriteKey !== spriteKey && previousSpriteKey !== "pkmn__sub" && previousSpriteKey !== "blank") {
                            if (this.scene.textures.exists(previousSpriteKey)) {
                                this.scene.textures.remove(previousSpriteKey);
                            }
                            if (this.scene.anims.exists(previousSpriteKey)) {
                                this.scene.anims.remove(previousSpriteKey);
                            }
                            if (this.scene.cache.json.exists(previousSpriteKey)) {
                                this.scene.cache.json.remove(previousSpriteKey);
                            }
                        }

                        const setBasicPipelineData = (sprite, shiny, variant, spriteKey) => {
                            sprite.setPipelineData("shiny", shiny);
                            sprite.setPipelineData("variant", variant);
                            sprite.setPipelineData("spriteKey", spriteKey);
                        };

                        if (this.pokemon && this.pokemon.isFusion()) {
                            this.pokemon.updateFusionPalette();
                            const fusionSpriteColors = this.pokemon.getTintSprite().pipelineData[`fusionSpriteColors`];
                            const spriteColors = this.pokemon.getSprite().pipelineData[`spriteColors`];
                            const fusionRecolorMode = (this.pokemon.getSprite().pipelineData as any)["fusionRecolorMode"] || 0;
                            const setFusionPipelineData = (sprite, shiny, variant, spriteKey, fusionSpriteColors, spriteColors) => {
                                setBasicPipelineData(sprite, shiny, variant, spriteKey);
                                sprite.setPipelineData("fusionSpriteColors", fusionSpriteColors);
                                sprite.setPipelineData("spriteColors", spriteColors);
                                sprite.setPipelineData("fusionRecolorMode", fusionRecolorMode);
                            };
                            setFusionPipelineData(this.pokemonSprite, shiny, variant, spriteKey, fusionSpriteColors, spriteColors);
                        } else {
                            setBasicPipelineData(this.pokemonSprite, shiny, variant, spriteKey);
                            [ "spriteColors", "fusionSpriteColors", "fusionRecolorMode" ].forEach((k) => {
                                delete this.pokemonSprite.pipelineData[k];
                                delete this.pokemonSprite.pipelineData[`${k}Base`];
                            });
                            this.pokemonSprite.setPipelineData("fusionRecolorMode", 0);
                            this.pokemonSprite.setPipelineData("fusionRecolorModeBase", 0);
                            delete this.pokemonSprite.pipelineData["altBuildSpriteColors"];
                            delete this.pokemonSprite.pipelineData["altBuildTargetColors"];
                            delete this.pokemonSprite.pipelineData["altBuildBlendMode"];
                            delete this.pokemonSprite.pipelineData["altBuildInversionFactor"];
                        }
                        this.pokemonSprite.play(spriteKey);
                        const _st1Tuning = getYuTuning();
                        if (species?.generation === 20) {
                          this.pokemonSprite.setOrigin(0.5, 1);
                          this.pokemonSprite.setPipelineData("ignoreFieldPos", true);
                          const _ssKey = species.getSpriteKey(false);
                          const _ss = this.scene.cache.json.exists(_ssKey) ? this.scene.cache.json.get(_ssKey)?.spriteState ?? null : null;
                          const _stScale = _ss?.scale ?? 1;
                          const _stFit = YU_BATTLE_FIT * YU_PLAYER_FIT_MULT;
                          this._stBaseCreatureScale = _stScale * _stFit;
                          const _ssX1 = (_ss?.x ?? 0);
                          const _ssY1 = (_ss?.y ?? 0);
                          const _basis1 = this.pokemonSprite.frame?.width || 1;
                          const _displayW1 = _stScale * _basis1;
                          const _displayH1 = _stScale * (this.pokemonSprite.frame?.height || 1);
                          const _sorterX1 = _ssX1 * _basis1;
                          const _sorterY1 = _ssY1 * _basis1;
                          const _ST_BG_REF = 1107;
                          const _ST_SLOT_CENTER = 639.5;
                          const _ST_SLOT_FEET = 311;
                          const _centerOff1 = ((_ST_BG_REF + _sorterX1 - _displayW1 / 2) - _ST_SLOT_CENTER) / _stScale;
                          const _feetOff1 = ((_sorterY1 + _displayH1) - _ST_SLOT_FEET) / _stScale;
                          this._stBaseCreatureX = 53 + _centerOff1 * _stFit;
                          this._stBaseCreatureY = 96 + _feetOff1 * _stFit;
                          const _st1D = StarterSelectUiHandler.ST_DEFAULT_OFFSETS;
                          const _st1Sp = StarterSelectUiHandler.SPECIES_VISUAL_OFFSETS[species.speciesId] ?? {};
                          const _st1CreatureScale = this._stBaseCreatureScale + _st1Tuning.creatureScaleOffset + _st1D.creatureScaleOffset + (_st1Sp.creatureScaleOffset ?? 0);
                          this.pokemonSprite.setScale(_st1CreatureScale);
                          this.pokemonSprite.setPosition(this._stBaseCreatureX + _st1Tuning.creatureXOffset + _st1D.creatureXOffset, this._stBaseCreatureY + _st1Tuning.yOffset + _st1Tuning.creatureYOffset + _st1D.yOffset + _st1D.creatureYOffset + (_st1Sp.creatureYOffset ?? 0));
                          this.pokemonSprite.setFlipX(!(_ss?.flipped ?? false));
                          yuTuningLog("StarterSelect", "creature-path1", { scale: _st1CreatureScale, x: this._stBaseCreatureX + _st1Tuning.creatureXOffset + _st1D.creatureXOffset, y: this._stBaseCreatureY + _st1Tuning.yOffset + _st1Tuning.creatureYOffset + _st1D.yOffset + _st1D.creatureYOffset, _stScale });
                        } else {
                          this.pokemonSprite.setOrigin(0.5, 0.5);
                          this.pokemonSprite.setScale(1);
                          this.pokemonSprite.setPipelineData("ignoreFieldPos", false);
                          this.pokemonSprite.setPosition(53, 63);
                          this.pokemonSprite.setFlipX(false);
                        }
                        this.pokemonSprite.setVisible(!this.statsMode);
                        this.applyStarterPortal(species);
                        if (species?.generation === 20 && this._lastTweakOffsets) {
                            this.applyStarterTweakOffsets(this._lastTweakOffsets, species);
                        }
                    }
                    if (this.pokemon && this.pokemon.isFusion()) {
                        this.pokemon.loadAssets().then(loadSpeciesDetails);
                    } else {
                        loadSpeciesDetails();
                    }
                });

                const isValidForChallenge = new Utils.BooleanHolder(true);
                Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_CHOICE, species, isValidForChallenge, this.scene.gameData.getSpeciesDexAttrProps(species, this.dexAttrCursor), !!this.starterSpecies.length);
                const currentFilteredContainer = this.filteredStarterContainers.find(p => p.species.speciesId === species.speciesId);
                if (currentFilteredContainer) {
                    const starterSprite = currentFilteredContainer.icon as Phaser.GameObjects.Sprite;
                    starterSprite.setTexture(species.getIconAtlasKey(formIndex, shiny, variant), species.getIconId(female!, formIndex, shiny, variant));
                    currentFilteredContainer.checkIconId(female, formIndex, shiny, variant);
                    this.iconAnimHandler.addOrUpdate(starterSprite, PokemonIconAnimMode.NONE);

                    const icon = currentFilteredContainer.icon;
                    this.scene.tweens.getTweensOf(icon).forEach(tween => tween.resume());
                }

                const isNonShinyCaught = !!(caughtAttr & DexAttr.NON_SHINY);
                const isShinyCaught = !!(caughtAttr & DexAttr.SHINY);
                const isVariant1Caught = isShinyCaught && !!(caughtAttr & DexAttr.DEFAULT_VARIANT);
                const isVariant2Caught = isShinyCaught && !!(caughtAttr & DexAttr.VARIANT_2);
                const isVariant3Caught = isShinyCaught && !!(caughtAttr & DexAttr.VARIANT_3);

                this.canCycleShiny = isNonShinyCaught && isShinyCaught;
                this.canCycleVariant = !!shiny && [isVariant1Caught, isVariant2Caught, isVariant3Caught].filter(v => v).length > 1;

                const isMaleCaught = !!(caughtAttr & DexAttr.MALE);
                const isFemaleCaught = !!(caughtAttr & DexAttr.FEMALE);
                this.canCycleGender = isMaleCaught && isFemaleCaught;

                const hasAbility1 = abilityAttr & AbilityAttr.ABILITY_1;
                let hasAbility2 = abilityAttr & AbilityAttr.ABILITY_2;
                const hasHiddenAbility = abilityAttr & AbilityAttr.ABILITY_HIDDEN;

                if (hasAbility1 && hasAbility2 && species.ability1 === species.ability2) {
                    hasAbility2 = 0;
                }

                this.canCycleForm = species.forms.filter(f => f.isStarterSelectable || !pokemonFormChanges[species.speciesId]?.find(fc => fc.formKey))
                    .map((_, f) => dexEntry.caughtAttr & this.scene.gameData.getFormAttr(f)).filter(f => f).length > 1;
                this.canCycleNature = this.scene.gameData.getNaturesForAttr(dexEntry.natureAttr).length > 1;
                this.canCycleAbility = [hasAbility1, hasAbility2, hasHiddenAbility].filter(a => a).length > 1;
                this.canCycleFusion = this.scene.gameData.starterData[species.speciesId].obtainedFusions.length > 0
                  && (!this.isEffectivelySignature(species.speciesId as unknown as Species) || this.fusionsFilterActive);

                this.canCycleSignature = this.isSignaturePokemon(species.speciesId as unknown as Species) && !this.fusionsFilterActive;
            }

            if ((dexEntry.caughtAttr || isEggStarterMode) && species.malePercent !== null) {
                const gender = !female ? Gender.MALE : Gender.FEMALE;
                this.pokemonGenderText.setText(getGenderSymbol(gender));
                this.pokemonGenderText.setColor(getGenderColor(gender));
                this.pokemonGenderText.setShadowColor(getGenderColor(gender, true));
            } else {
                this.pokemonGenderText.setText("");
            }
            speciesForDetails = this.pokemon && this.pokemon.isFusion() ? this.pokemon.fusionSpecies! : this.lastSpecies!;

            if (dexEntry.caughtAttr || isEggStarterMode) {
                this.pokemonMovesContainer.setVisible(true);
                const ability = speciesForDetails.getAbility(abilityIndex!);
                this.pokemonAbilityText.setText(allAbilities[ability].name);

                const isHidden = abilityIndex === (speciesForDetails.ability2 ? 2 : 1);
                const isDuelmonOrFusion = species.generation === 20 || (this.pokemon?.isFusion() ?? false);
                const abilityStyle = (isHidden || isDuelmonOrFusion) ? TextStyle.SUMMARY_GOLD : TextStyle.SUMMARY;
                this.pokemonAbilityText.setColor(this.getTextColor(abilityStyle));
                this.pokemonAbilityText.setShadowColor(this.getTextColor(abilityStyle, true));

                if (starterPassiveAbilities[speciesForDetails.speciesId] !== undefined) {
                  const passiveAttr = this.scene.gameData.starterData[speciesForDetails.speciesId].passiveAttr;
                  this.pokemonPassiveText.setText(passiveAttr & PassiveAttr.UNLOCKED ? passiveAttr & PassiveAttr.ENABLED ? allAbilities[starterPassiveAbilities[speciesForDetails.speciesId]].name : i18next.t("starterSelectUiHandler:disabled") : i18next.t("starterSelectUiHandler:locked"));
                  this.pokemonPassiveText.setColor(this.getTextColor(passiveAttr === (PassiveAttr.UNLOCKED | PassiveAttr.ENABLED) ? TextStyle.SUMMARY : TextStyle.SUMMARY_GRAY));
                  this.pokemonPassiveText.setShadowColor(this.getTextColor(passiveAttr === (PassiveAttr.UNLOCKED | PassiveAttr.ENABLED) ? TextStyle.SUMMARY : TextStyle.SUMMARY_GRAY, true));
                } else {
                  this.pokemonPassiveText.setText("");
                  this.pokemonPassiveText.setVisible(false);
                }

                this.pokemonNatureText.setText(getNatureName(natureIndex as unknown as Nature, true, true, false, this.scene.uiTheme));

                if (this.pokemon && this.pokemon.isFusion()) {
                    const fusionAbility = this.pokemon.getFusionSpeciesForm().getAbility(this.pokemon.fusionAbilityIndex);
                    this.pokemonAbilityText.setText(`${allAbilities[fusionAbility].name}`);

                    const fusionSpecies = this.pokemon.getFusionSpeciesForm();

                    let fusionLevelMoves: LevelMoves;

                    if (pokemonFormLevelMoves.hasOwnProperty(fusionSpecies.speciesId) && pokemonFormLevelMoves[fusionSpecies.speciesId].hasOwnProperty(this.pokemon.fusionFormIndex)) {
                        fusionLevelMoves = pokemonFormLevelMoves[fusionSpecies.speciesId][this.pokemon.fusionFormIndex];
                    } else {
                        fusionLevelMoves = pokemonSpeciesLevelMoves[fusionSpecies.speciesId];
                    }

                    this.speciesStarterMoves.push(...fusionLevelMoves.filter(lm => lm[0] > 0 && lm[0] <= 5).map(lm => lm[1]));
                }

                let levelMoves: LevelMoves;
                if (pokemonFormLevelMoves.hasOwnProperty(species.speciesId) && formIndex && pokemonFormLevelMoves[species.speciesId].hasOwnProperty(formIndex)) {
                    levelMoves = pokemonFormLevelMoves[species.speciesId][formIndex];
                } else {
                    levelMoves = pokemonSpeciesLevelMoves[species.speciesId];
                }
                this.speciesStarterMoves.push(...levelMoves.filter(lm => lm[0] > 0 && lm[0] <= 5).map(lm => lm[1]));
                if (speciesEggMoves.hasOwnProperty(species.speciesId)) {
                    for (let em = 0; em < 4; em++) {
                        if (this.scene.gameData.starterData[species.speciesId].eggMoves & (1 << em)) {
                            this.speciesStarterMoves.push(speciesEggMoves[species.speciesId][em]);
                        }
                    }
                }

                const speciesMoveData = this.scene.gameData.starterData[species.speciesId].moveset;
                const moveData: StarterMoveset | null = speciesMoveData
                    ? Array.isArray(speciesMoveData)
                        ? speciesMoveData
                        : speciesMoveData[formIndex!]
                    : null;

                const availableStarterMoves = this.speciesStarterMoves.concat(speciesEggMoves.hasOwnProperty(speciesForDetails.speciesId) ? speciesEggMoves[speciesForDetails.speciesId].filter((_, em: integer) => this.scene.gameData.starterData[speciesForDetails.speciesId].eggMoves & (1 << em)) : []);
                this.starterMoveset = (moveData || (this.speciesStarterMoves.slice(0, 4) as StarterMoveset)).filter(m => availableStarterMoves.find(sm => sm === m)) as StarterMoveset;

                if (this.starterMoveset.length < 4 && this.starterMoveset.length < availableStarterMoves.length) {
                    this.starterMoveset.push(...availableStarterMoves.filter(sm => this.starterMoveset?.indexOf(sm) === -1).slice(0, 4 - this.starterMoveset.length));
                }

                this.starterMoveset = this.starterMoveset.filter(
                    (move, i) => {
                        return this.starterMoveset?.indexOf(move) === i;
                    }) as StarterMoveset;
                if (this.pokemon && this.pokemon.isFusion() && !ignoreFusionMoveCombining) {

                    const fusionMoveData = this.scene.gameData.starterData[species.speciesId].fusionMovesets?.[this.pokemon.fusionFormIndex];
                    const fusionMoveSet = fusionMoveData
                        ? Array.isArray(fusionMoveData)
                            ? fusionMoveData as StarterMoveset
                            : (fusionMoveData as StarterFormMoveData)[this.pokemon.fusionFormIndex]
                        : null;
                    if(fusionMoveSet) {
                        this.starterMoveset = fusionMoveSet;
                    } else {
                        const fusionAvailableStarterMoves = this.pokemon.getFusionSpeciesForm().getLevelMoves();

                    const fusionStarterMoveset = (fusionMoveSet || fusionAvailableStarterMoves.slice(0, 4).map(m => m[1])) as Moves[];
                        const combinedMoveset = [...new Set([...this.starterMoveset.slice(2, 4), ...fusionStarterMoveset.slice(0, 2)])].slice(0, 4) as [Moves, Moves, Moves, Moves];
                        this.starterMoveset = combinedMoveset;
                    }
                }

                const speciesForm = getPokemonSpeciesForm(speciesForDetails.speciesId, formIndex!);
                const formText = Utils.capitalizeString(speciesForDetails?.forms[formIndex!]?.formKey, "-", false, false);

                const speciesName = Utils.capitalizeString(Species[speciesForDetails.speciesId], "_", true, false);
                if (this.pokemon && this.pokemon.isFusion()) {
                    this.fitPokemonNameToWidth(getFusedSpeciesName(this.pokemon.species.getName(this.pokemon.formIndex), this.pokemon.fusionSpecies!.getName(this.pokemon.fusionFormIndex)), species, shiny, formIndex);
                } else if (this.isEffectivelySignature(species.speciesId as unknown as Species)) {
                    const altBuildId = this.getSignatureAltBuildId(species.speciesId as unknown as Species);
                    const signatureName = altBuildId
                        ? ChampionUtils.getAltBuildDisplayName(altBuildId)
                        : i18next.t("starterSelectUiHandler:signatureLabel");
                    this.fitPokemonNameToWidth(signatureName, species, shiny, formIndex);
                } else {
                    this.fitPokemonNameToWidth(speciesForDetails.getName(formIndex), species, shiny, formIndex);
                }

                if (species.speciesId === Species.ARCEUS) {
                    this.pokemonFormText.setText(i18next.t(`pokemonInfo:Type.${formText?.toUpperCase()}`));
                } else {
                    this.pokemonFormText.setText(formText ? i18next.t(`pokemonForm:${speciesName}${formText}`) : "");
                }

                if (this.pokemon && this.pokemon.isFusion()) {
                    const types = this.pokemon && this.pokemon.isFusion() ? this.pokemon.getTypes(true)! : [speciesForm.type1, speciesForm.type2]!;
                    const [type1, type2] = types.length === 2 ? types : [types[0], null];
                    this.setTypeIcons(type1, type2);
                } else {
                    this.setTypeIcons(speciesForm.type1, speciesForm.type2);
                }

                if (isEggStarterMode) {
                    this.pokemonCaughtHatchedContainer.setVisible(false);
                    this.pokemonUncaughtText.setVisible(false);
                    this.pokemonAbilityLabelText.setVisible(true);
                    const eggHasPassive = species ? starterPassiveAbilities[species.speciesId] !== undefined : true;
                    this.pokemonPassiveLabelText.setVisible(eggHasPassive);
                    this.pokemonNatureLabelText.setVisible(true);
                    if (species && DUELMON_SPECIES_IDS.has(species.speciesId) && !eggHasPassive) {
                        const passiveY = this.pokemonPassiveLabelText.y;
                        this.pokemonNatureLabelText.setY(passiveY);
                        this.pokemonNatureText.setY(passiveY);
                    }
                }
            } else {
                this.pokemonAbilityText.setText("");

                this.pokemonFusionText.setText("");
                if (this.pokemonFusionDnaIcon) this.pokemonFusionDnaIcon.setVisible(false);
                if (this.pokemonFusionPartnerIcon) this.pokemonFusionPartnerIcon.setVisible(false);
                this.pokemonFusionInfoDnaIcon?.setVisible(false);
                this.pokemonFusionInfoSpeciesIcon?.setVisible(false);
                this.pokemonPassiveText.setText("");
                this.pokemonNatureText.setText("");

                this.setTypeIcons(null, null);
            }
        } else {
            this.shinyOverlay.setVisible(false);
            this.pokemonNumberText.setColor(this.getTextColor(TextStyle.SUMMARY));
            this.pokemonNumberText.setShadowColor(this.getTextColor(TextStyle.SUMMARY, true));
            this.pokemonGenderText.setText("");
            this.pokemonAbilityText.setText("");

            this.pokemonFusionText.setText("");
            if (this.pokemonFusionDnaIcon) this.pokemonFusionDnaIcon.setVisible(false);
            if (this.pokemonFusionPartnerIcon) this.pokemonFusionPartnerIcon.setVisible(false);
            this.pokemonFusionInfoDnaIcon?.setVisible(false);
            this.pokemonFusionInfoSpeciesIcon?.setVisible(false);
            this.pokemonPassiveText.setText("");
            this.pokemonNatureText.setText("");

            this.setTypeIcons(null, null);
        }

        if (!this.starterMoveset) {
            this.starterMoveset = this.speciesStarterMoves.slice(0, 4) as StarterMoveset;
        }

        for (let m = 0; m < 4; m++) {
            const move = m < this.starterMoveset.length ? allMoves[this.starterMoveset[m]] : null;
            this.pokemonMoveBgs[m].setFrame(Type[move ? move.type : Type.UNKNOWN].toString().toLowerCase());
            this.pokemonMoveLabels[m].setText(move ? move.name : "-");
            this.pokemonMoveContainers[m].setVisible(!!move);
        }

        const hasEggMoves = species && speciesEggMoves.hasOwnProperty(species.speciesId);

        for (let em = 0; em < 4; em++) {
            const eggMove = hasEggMoves ? allMoves[speciesEggMoves[species.speciesId][em]] : null;
            const eggMoveUnlocked = eggMove && this.scene.gameData.starterData[species.speciesId].eggMoves & (1 << em);
            this.pokemonEggMoveBgs[em].setFrame(Type[eggMove ? eggMove.type : Type.UNKNOWN].toString().toLowerCase());
            this.pokemonEggMoveLabels[em].setText(eggMove && eggMoveUnlocked ? eggMove.name : "???");
        }

        this.pokemonEggMovesContainer.setVisible((!!this.speciesStarterDexEntry?.caughtAttr || isEggStarterMode) && hasEggMoves);

        this.pokemonAdditionalMoveCountLabel.setText(`(+${Math.max(this.speciesStarterMoves.length - 4, 0)})`);
        this.pokemonAdditionalMoveCountLabel.setVisible(this.speciesStarterMoves.length > 4);

        this.tryUpdateValue();

        this.updateInstructions();
    }

    isEggModePartyPokemonSelected(): boolean {
        return this.getMode() == Mode.EGG_STARTER_SELECT && this.starterIconsCursorObj.visible && this.starterIconsCursorIndex >= 0 && this.starterIconsCursorIndex < this.scene.getParty().length;
    }
    setPartyPokemonDetails(): void {
        const party = this.scene.getParty();

        if (this.starterIconsCursorIndex === undefined || this.starterIconsCursorIndex < 0 || this.starterIconsCursorIndex >= party.length) {
            this.shinyOverlay.setVisible(false);
            this.pokemonNumberText.setColor(this.getTextColor(TextStyle.SUMMARY));
            this.pokemonNumberText.setShadowColor(this.getTextColor(TextStyle.SUMMARY, true));
            this.pokemonGenderText.setText("");
            this.pokemonAbilityText.setText("");
            this.pokemonFusionText.setText("");
            if (this.pokemonFusionDnaIcon) this.pokemonFusionDnaIcon.setVisible(false);
            if (this.pokemonFusionPartnerIcon) this.pokemonFusionPartnerIcon.setVisible(false);
            this.pokemonFusionInfoDnaIcon?.setVisible(false);
            this.pokemonFusionInfoSpeciesIcon?.setVisible(false);
            this.pokemonPassiveText.setText("");
            this.pokemonNatureText.setText("");

            this.setTypeIcons(null, null);

            for (let m = 0; m < 4; m++) {
                this.pokemonMoveBgs[m].setFrame(Type[Type.UNKNOWN].toString().toLowerCase());
                this.pokemonMoveLabels[m].setText("-");
                this.pokemonMoveContainers[m].setVisible(false);
            }
            this.tryUpdateValue();
            this.updateInstructions();
            return;
        }

        this.pokemonEggMovesContainer.setVisible(false);

        const partyPokemon = party[this.starterIconsCursorIndex];
        const isEggStarterMode = this.getMode() === Mode.EGG_STARTER_SELECT;

        this.dexAttrCursor = 0n;
        this.abilityCursor = -1;
        this.natureCursor = -1;
        this.fusionCursor = -1;

        const pokemonSpecies = partyPokemon.species;

        const isShiny = partyPokemon.shiny;
        const formIndex = partyPokemon.formIndex;
        const isFemale = partyPokemon.isFemale();
        const pokemonVariant = partyPokemon.variant;
        const pokemonAbilityIndex = partyPokemon.abilityIndex;
        const pokemonNatureIndex = partyPokemon.nature;
        const pokemonFusionIndex = partyPokemon.isFusion() ? partyPokemon.fusionFormIndex : -1;

        this.dexAttrCursor |= !isShiny ? DexAttr.NON_SHINY : DexAttr.SHINY;
        this.dexAttrCursor |= !isFemale ? DexAttr.MALE : DexAttr.FEMALE;
        this.dexAttrCursor |= !pokemonVariant ? DexAttr.DEFAULT_VARIANT : pokemonVariant === 1 ? DexAttr.VARIANT_2 : DexAttr.VARIANT_3;
        this.dexAttrCursor |= this.scene.gameData.getFormAttr(formIndex);
        this.abilityCursor = pokemonAbilityIndex;
        this.natureCursor = pokemonNatureIndex;
        this.fusionCursor = pokemonFusionIndex;

        this.speciesStarterDexEntry = this.scene.gameData.dexData[pokemonSpecies.speciesId];
        this.pokemon = partyPokemon;

        this.pokemonSprite.setVisible(false);

        if (this.assetLoadCancelled) {
            this.assetLoadCancelled.value = true;
            this.assetLoadCancelled = null;
        }

        this.starterMoveset = null;
        this.speciesStarterMoves = [];

        this.shinyOverlay.setVisible(false);
        this.pokemonNumberText.setColor(this.getTextColor(isShiny ? TextStyle.SUMMARY_GOLD : TextStyle.SUMMARY, false));
        this.pokemonNumberText.setShadowColor(this.getTextColor(isShiny ? TextStyle.SUMMARY_GOLD : TextStyle.SUMMARY, true));

        let speciesForDetails = partyPokemon.isFusion() ? partyPokemon.fusionSpecies! : pokemonSpecies;

        this.pokemonNumberText.setText(Utils.padInt(pokemonSpecies.speciesId, 4));

        if (partyPokemon.nickname) {
            this.fitPokemonNameToWidth(partyPokemon.getNameToRender(), pokemonSpecies, partyPokemon.isShiny(), formIndex);
        } else {
            this.fitPokemonNameToWidth(pokemonSpecies.getName(formIndex), pokemonSpecies, partyPokemon.isShiny(), formIndex);
        }

        if (pokemonSpecies.malePercent !== null) {
            const gender = !isFemale ? Gender.MALE : Gender.FEMALE;
            this.pokemonGenderText.setText(getGenderSymbol(gender));
            this.pokemonGenderText.setColor(getGenderColor(gender));
            this.pokemonGenderText.setShadowColor(getGenderColor(gender, true));
        } else {
            this.pokemonGenderText.setText("");
        }

        const assetLoadCancelled = new Utils.BooleanHolder(false);
        this.assetLoadCancelled = assetLoadCancelled;

        pokemonSpecies.loadAssets(this.scene, isFemale, formIndex, isShiny, pokemonVariant, true).then(() => {
            const loadSpeciesDetails = () => {
                if (assetLoadCancelled.value) {
                    return;
                }
                this.assetLoadCancelled = null;
                this.speciesLoaded.set(pokemonSpecies.speciesId, true);
                const spriteKey = pokemonSpecies.getSpriteKey(isFemale, formIndex, isShiny, pokemonVariant);

                const setBasicPipelineData = (sprite, shiny, variant, spriteKey) => {
                    sprite.setPipelineData("shiny", shiny);
                    sprite.setPipelineData("variant", variant);
                    sprite.setPipelineData("spriteKey", spriteKey);
                };

                if (partyPokemon.isFusion()) {
                    partyPokemon.updateFusionPalette();
                    const fusionSpriteColors = partyPokemon.getTintSprite().pipelineData[`fusionSpriteColors`];
                    const spriteColors = partyPokemon.getSprite().pipelineData[`spriteColors`];
                    const fusionRecolorMode = (partyPokemon.getSprite().pipelineData as any)["fusionRecolorMode"] || 0;
                    const setFusionPipelineData = (sprite, shiny, variant, spriteKey, fusionSpriteColors, spriteColors) => {
                        setBasicPipelineData(sprite, shiny, variant, spriteKey);
                        sprite.setPipelineData("fusionSpriteColors", fusionSpriteColors);
                        sprite.setPipelineData("spriteColors", spriteColors);
                        sprite.setPipelineData("fusionRecolorMode", fusionRecolorMode);
                    };
                    setFusionPipelineData(this.pokemonSprite, isShiny, pokemonVariant, spriteKey, fusionSpriteColors, spriteColors);
                } else {
                    setBasicPipelineData(this.pokemonSprite, isShiny, pokemonVariant, spriteKey);
                    [ "spriteColors", "fusionSpriteColors", "fusionRecolorMode" ].forEach((k) => {
                        delete this.pokemonSprite.pipelineData[k];
                        delete this.pokemonSprite.pipelineData[`${k}Base`];
                    });
                    this.pokemonSprite.setPipelineData("fusionRecolorMode", 0);
                    this.pokemonSprite.setPipelineData("fusionRecolorModeBase", 0);
                    delete this.pokemonSprite.pipelineData["altBuildSpriteColors"];
                    delete this.pokemonSprite.pipelineData["altBuildTargetColors"];
                    delete this.pokemonSprite.pipelineData["altBuildBlendMode"];
                    delete this.pokemonSprite.pipelineData["altBuildInversionFactor"];
                }
                this.pokemonSprite.play(spriteKey);
                const _st2Tuning = getYuTuning();
                if (pokemonSpecies?.generation === 20) {
                  this.pokemonSprite.setOrigin(0.5, 1);
                  this.pokemonSprite.setPipelineData("ignoreFieldPos", true);
                  const _ssKey2 = pokemonSpecies.getSpriteKey(false);
                  const _ss2 = this.scene.cache.json.exists(_ssKey2) ? this.scene.cache.json.get(_ssKey2)?.spriteState ?? null : null;
                  const _stScale2 = _ss2?.scale ?? 1;
                  const _stFit2 = YU_BATTLE_FIT * YU_PLAYER_FIT_MULT;
                  this._stBaseCreatureScale = _stScale2 * _stFit2;
                  const _ssX2 = (_ss2?.x ?? 0);
                  const _ssY2 = (_ss2?.y ?? 0);
                  const _basis2 = this.pokemonSprite.frame?.width || 1;
                  const _displayW2 = _stScale2 * _basis2;
                  const _displayH2 = _stScale2 * (this.pokemonSprite.frame?.height || 1);
                  const _sorterX2 = _ssX2 * _basis2;
                  const _sorterY2 = _ssY2 * _basis2;
                  const _ST_BG_REF2 = 1107;
                  const _ST_SLOT_CENTER2 = 639.5;
                  const _ST_SLOT_FEET2 = 311;
                  const _centerOff2 = ((_ST_BG_REF2 + _sorterX2 - _displayW2 / 2) - _ST_SLOT_CENTER2) / _stScale2;
                  const _feetOff2 = ((_sorterY2 + _displayH2) - _ST_SLOT_FEET2) / _stScale2;
                  this._stBaseCreatureX = 53 + _centerOff2 * _stFit2;
                  this._stBaseCreatureY = 96 + _feetOff2 * _stFit2;
                  const _st2D = StarterSelectUiHandler.ST_DEFAULT_OFFSETS;
                  const _st2Sp = StarterSelectUiHandler.SPECIES_VISUAL_OFFSETS[pokemonSpecies.speciesId] ?? {};
                  const _st2CreatureScale = this._stBaseCreatureScale + _st2Tuning.creatureScaleOffset + _st2D.creatureScaleOffset + (_st2Sp.creatureScaleOffset ?? 0);
                  this.pokemonSprite.setScale(_st2CreatureScale);
                  this.pokemonSprite.setPosition(this._stBaseCreatureX + _st2Tuning.creatureXOffset + _st2D.creatureXOffset, this._stBaseCreatureY + _st2Tuning.yOffset + _st2Tuning.creatureYOffset + _st2D.yOffset + _st2D.creatureYOffset + (_st2Sp.creatureYOffset ?? 0));
                  this.pokemonSprite.setFlipX(!(_ss2?.flipped ?? false));
                  yuTuningLog("StarterSelect", "creature-path2", { scale: _st2CreatureScale, x: this._stBaseCreatureX + _st2Tuning.creatureXOffset + _st2D.creatureXOffset, y: this._stBaseCreatureY + _st2Tuning.yOffset + _st2Tuning.creatureYOffset + _st2D.yOffset + _st2D.creatureYOffset, _stScale2 });
                } else {
                  this.pokemonSprite.setOrigin(0.5, 0.5);
                  this.pokemonSprite.setScale(1);
                  this.pokemonSprite.setPipelineData("ignoreFieldPos", false);
                  this.pokemonSprite.setPosition(53, 63);
                  this.pokemonSprite.setFlipX(false);
                }
                this.pokemonSprite.setVisible(!this.statsMode);
                this.applyStarterPortal(pokemonSpecies);
                if (pokemonSpecies?.generation === 20 && this._lastTweakOffsets) {
                    this.applyStarterTweakOffsets(this._lastTweakOffsets, pokemonSpecies);
                }
            };

            if (partyPokemon.isFusion()) {
                speciesForDetails.loadAssets(this.scene, partyPokemon.fusionGender === Gender.FEMALE, partyPokemon.fusionFormIndex, partyPokemon.fusionShiny, partyPokemon.fusionVariant, true).then(loadSpeciesDetails);
            } else {
                loadSpeciesDetails();
            }
        });

        const ability = speciesForDetails.getAbility(pokemonAbilityIndex);
        this.pokemonAbilityText.setText(allAbilities[ability].name);

        const isHidden = pokemonAbilityIndex === (speciesForDetails.ability2 ? 2 : 1);
        const isDuelmonOrFusionParty = pokemonSpecies.generation === 20 || partyPokemon.isFusion();
        const abilityStyleParty = (isHidden || isDuelmonOrFusionParty) ? TextStyle.SUMMARY_GOLD : TextStyle.SUMMARY;
        this.pokemonAbilityText.setColor(this.getTextColor(abilityStyleParty));
        this.pokemonAbilityText.setShadowColor(this.getTextColor(abilityStyleParty, true));

        if (partyPokemon.isFusion()) {
            if (this.pokemonFusionDnaIcon) this.pokemonFusionDnaIcon.setVisible(true);
            if (this.pokemonFusionPartnerIcon && partyPokemon.fusionSpecies) {
                const fSpecies = partyPokemon.fusionSpecies;
                const fDexAttr = this.scene.gameData.getSpeciesDefaultDexAttr(fSpecies, false, true);
                const fProps = this.scene.gameData.getSpeciesDexAttrProps(fSpecies, fDexAttr);
                this.pokemonFusionPartnerIcon.setTexture(
                    fSpecies.getIconAtlasKey(fProps.formIndex, fProps.shiny, fProps.variant)
                );
                this.pokemonFusionPartnerIcon.setFrame(
                    fSpecies.getIconId(fProps.female, fProps.formIndex, fProps.shiny, fProps.variant)
                );
                this.pokemonFusionPartnerIcon.setVisible(true);
            }
            if (this.pokemonFusionInfoDnaIcon) this.pokemonFusionInfoDnaIcon.setVisible(true);
            if (this.pokemonFusionInfoSpeciesIcon && partyPokemon.fusionSpecies) {
                const fSpecies = partyPokemon.fusionSpecies;
                const fDexAttr = this.scene.gameData.getSpeciesDefaultDexAttr(fSpecies, false, true);
                const fProps = this.scene.gameData.getSpeciesDexAttrProps(fSpecies, fDexAttr);
                this.pokemonFusionInfoSpeciesIcon.setTexture(
                    fSpecies.getIconAtlasKey(fProps.formIndex, fProps.shiny, fProps.variant)
                );
                this.pokemonFusionInfoSpeciesIcon.setFrame(
                    fSpecies.getIconId(fProps.female, fProps.formIndex, fProps.shiny, fProps.variant)
                );
                this.pokemonFusionInfoSpeciesIcon.setVisible(true);
            }
        } else {
            this.pokemonFusionText.setText("");
            if (this.pokemonFusionDnaIcon) this.pokemonFusionDnaIcon.setVisible(false);
            if (this.pokemonFusionPartnerIcon) this.pokemonFusionPartnerIcon.setVisible(false);
            this.pokemonFusionInfoDnaIcon?.setVisible(false);
            this.pokemonFusionInfoSpeciesIcon?.setVisible(false);
        }

        const passiveAttr = partyPokemon.hasPassive() ? (partyPokemon.getPassiveAbility() ? PassiveAttr.UNLOCKED | PassiveAttr.ENABLED : PassiveAttr.UNLOCKED) : 0;
        this.pokemonPassiveText.setText(passiveAttr & PassiveAttr.UNLOCKED ? passiveAttr & PassiveAttr.ENABLED ? allAbilities[partyPokemon.getPassiveAbility().id].name : i18next.t("starterSelectUiHandler:disabled") : i18next.t("starterSelectUiHandler:locked"));
        this.pokemonPassiveText.setColor(this.getTextColor(passiveAttr === (PassiveAttr.UNLOCKED | PassiveAttr.ENABLED) ? TextStyle.SUMMARY : TextStyle.SUMMARY_GRAY));
        this.pokemonPassiveText.setShadowColor(this.getTextColor(passiveAttr === (PassiveAttr.UNLOCKED | PassiveAttr.ENABLED) ? TextStyle.SUMMARY : TextStyle.SUMMARY_GRAY, true));

        this.pokemonNatureText.setText(getNatureName(pokemonNatureIndex as unknown as Nature, true, true, false, this.scene.uiTheme));

        let growthReadable = Utils.toReadableString(GrowthRate[pokemonSpecies.growthRate]);
        const growthAux = growthReadable.replace(" ", "_");
        if (i18next.exists("growth:" + growthAux)) {
            growthReadable = i18next.t("growth:" + growthAux as any);
        }
        this.pokemonGrowthRateText.setText(growthReadable);
        this.pokemonGrowthRateText.setColor(getGrowthRateColor(pokemonSpecies.growthRate));
        this.pokemonGrowthRateText.setShadowColor(getGrowthRateColor(pokemonSpecies.growthRate, true));
        this.pokemonGrowthRateLabelText.setVisible(true);

        const formText = Utils.capitalizeString(pokemonSpecies?.forms[formIndex]?.formKey, "-", false, false);
        const speciesName = Utils.capitalizeString(Species[pokemonSpecies.speciesId], "_", true, false);

        if (partyPokemon.isFusion()) {
            const types = partyPokemon.getTypes(true)!;
            const [type1, type2] = types.length === 2 ? types : [types[0], null];
            this.setTypeIcons(type1, type2);
        } else {
            const speciesForm = getPokemonSpeciesForm(speciesForDetails.speciesId, formIndex);
            this.setTypeIcons(speciesForm.type1, speciesForm.type2);
        }

        this.pokemonFormText.setVisible(false);
        this.pokemonMovesContainer.setVisible(true);
        this.pokemonUncaughtText.setVisible(false);
        this.pokemonAbilityLabelText.setVisible(true);
        const partyHasPassive = pokemonSpecies ? starterPassiveAbilities[pokemonSpecies.speciesId] !== undefined : true;
        this.pokemonPassiveLabelText.setVisible(partyHasPassive);
        this.pokemonNatureLabelText.setVisible(true);
        if (pokemonSpecies && DUELMON_SPECIES_IDS.has(pokemonSpecies.speciesId) && !partyHasPassive) {
            const passiveY = this.pokemonPassiveLabelText.y;
            this.pokemonNatureLabelText.setY(passiveY);
            this.pokemonNatureText.setY(passiveY);
        }

        this.starterMoveset = partyPokemon.getMoveset() as StarterMoveset;

        for (let m = 0; m < 4; m++) {
            if (m < this.starterMoveset.length) {
                const move = allMoves[this.starterMoveset[m].moveId];
                this.pokemonMoveBgs[m].setFrame(Type[move.type].toString().toLowerCase());
                this.pokemonMoveLabels[m].setText(move.name);
                this.pokemonMoveContainers[m].setVisible(true);
            } else {
                this.pokemonMoveBgs[m].setFrame(Type[Type.UNKNOWN].toString().toLowerCase());
                this.pokemonMoveLabels[m].setText("-");
                this.pokemonMoveContainers[m].setVisible(false);
            }
        }

        this.hideInstructions();
    }

    setTypeIcons(type1: Type, type2: Type): void {
        if (type1 !== null) {
            this.type1Icon.setVisible(true);
            this.type1Icon.setFrame(Type[type1].toLowerCase());
        } else {
            this.type1Icon.setVisible(false);
        }
        if (type2 !== null) {
            this.type2Icon.setVisible(true);
            this.type2Icon.setFrame(Type[type2].toLowerCase());
        } else {
            this.type2Icon.setVisible(false);
        }
    }
    popStarter(index: number): void {
        this.starterSpecies.splice(index, 1);
        this.starterSignatureFlags.splice(index, 1);
        this.starterAttr.splice(index, 1);
        this.starterAbilityIndexes.splice(index, 1);
        this.starterFusionIndexes.splice(index, 1);
        this.starterNatures.splice(index, 1);
        this.starterMovesets.splice(index, 1);

        for (let s = 0; s < this.starterSpecies.length; s++) {
            const species = this.starterSpecies[s];
            const currentDexAttr = this.getCurrentDexProps(species.speciesId);
            const props = this.scene.gameData.getSpeciesDexAttrProps(species, currentDexAttr);
            const formSource = (species.forms.length > 0 && props.formIndex !== undefined && species.forms[props.formIndex]) ? species.forms[props.formIndex] : species;
            this.starterIcons[s].setTexture(formSource.getIconAtlasKey(props.formIndex, props.shiny, props.variant));
            this.starterIcons[s].setFrame(formSource.getIconId(props.female, props.formIndex, props.shiny, props.variant));
            this.checkIconId(this.starterIcons[s], species, props.female, props.formIndex, props.shiny, props.variant);
            const isGen20 = species.generation === 20;
            this.starterIcons[s].setScale(
              isGen20 ? adjustDuelmonIconScale(0.5, 20) * 0.8 : 0.5
            );

            if (this.starterIcons[s].postFX) {
                this.starterIcons[s].postFX.clear();
            }

            const slotIsSignature = this.isSignaturePokemon(species.speciesId as unknown as Species) && this.starterSignatureFlags[s] && !this.fusionsFilterActive;
            if (slotIsSignature) {
                if (this.starterIcons[s].postFX && typeof this.starterIcons[s].postFX.addColorMatrix === 'function') {
                    const colorMatrix = this.starterIcons[s].postFX.addColorMatrix();
                    colorMatrix.negative();
                }
            }

            if (s >= index) {
                this.starterCursorObjs[s].setPosition(this.starterCursorObjs[s + 1].x, this.starterCursorObjs[s + 1].y);
                this.starterCursorObjs[s].setVisible(this.starterCursorObjs[s + 1].visible);
            }
        }
        this.starterCursorObjs[this.starterSpecies.length].setVisible(false);
        this.starterIcons[this.starterSpecies.length].setTexture("pokemon_icons_0");
        this.starterIcons[this.starterSpecies.length].setFrame("unknown");
        this.starterIcons[this.starterSpecies.length].setScale(0.5);

        if (this.starterIcons[this.starterSpecies.length].postFX) {
            this.starterIcons[this.starterSpecies.length].postFX.clear();
        }

        this.refreshAllPartyFusionOverlays();

        if (this.starterIconsCursorObj.visible) {
            if (this.starterIconsCursorIndex === this.starterSpecies.length) {
                if (this.starterSpecies.length > 0) {
                    this.starterIconsCursorIndex--;
                } else {
                    this.starterIconsCursorObj.setVisible(false);
                    this.setSpecies(null);
                    this.filterBarCursor = Math.max(1, this.filterBar.numFilters - 1);
                    this.setFilterMode(true);
                }
            }
            this.moveStarterIconsCursor(this.starterIconsCursorIndex);
        }

        this.tryUpdateValue();
    }

    updateStarterValueLabel(starter: StarterContainer): void {
        if(this.getMode() === Mode.EGG_STARTER_SELECT) {
            return;
        }
        const speciesId = starter.species.speciesId;
        const slotIdx = this.starterSpecies.findIndex(s => s.speciesId === speciesId);
        const useSlotFlag = slotIdx >= 0 && slotIdx < this.starterSignatureFlags.length;
        const isSlotSignature = useSlotFlag
            ? (this.isSignaturePokemon(speciesId as unknown as Species) && this.starterSignatureFlags[slotIdx] && !this.fusionsFilterActive)
            : this.isEffectivelySignature(speciesId as unknown as Species);
        const baseStarterValue = isSlotSignature ? 6 : speciesStarters[speciesId];

        const starterValue = this.getActualStarterValue(speciesId as unknown as Species, useSlotFlag ? slotIdx : undefined);

        starter.cost = starterValue;
        let valueStr = starterValue.toString();
        if (valueStr.startsWith("0.")) {
            valueStr = valueStr.slice(1);
        }
        starter.label.setText(valueStr);
        let textStyle: TextStyle;
        switch (baseStarterValue - starterValue) {
            case 0:
                textStyle = TextStyle.WINDOW;
                break;
            case 1:
            case 0.5:
                textStyle = TextStyle.SUMMARY_BLUE;
                break;
            default:
                textStyle = TextStyle.SUMMARY_GOLD;
                break;
        }
        if (baseStarterValue - starterValue > 0) {
            starter.label.setColor(this.getTextColor(textStyle));
            starter.label.setShadowColor(this.getTextColor(textStyle, true));
        }
    }

    tryUpdateValue(add?: integer, addingToParty?: boolean): boolean {
        const value = this.starterSpecies.map(s => s.generation).reduce((total: integer, gen: integer, i: integer) => total += this.getActualStarterValue(this.starterSpecies[i].speciesId as unknown as Species, i), 0);
        const newValue = value + (add || 0);
        const valueLimit = this.getValueLimit();
        const overLimit = newValue > valueLimit;
        let newValueStr = newValue.toString();
        if (newValueStr.startsWith("0.")) {
            newValueStr = newValueStr.slice(1);
        }
        this.valueLimitLabel.setText(`${newValueStr}/${valueLimit}`);
        this.valueLimitLabel.setColor(this.getTextColor(!overLimit ? TextStyle.TOOLTIP_CONTENT : TextStyle.SUMMARY_PINK));
        this.valueLimitLabel.setShadowColor(this.getTextColor(!overLimit ? TextStyle.TOOLTIP_CONTENT : TextStyle.SUMMARY_PINK, true));
        if (overLimit) {
            this.scene.time.delayedCall(Utils.fixedInt(500), () => this.tryUpdateValue());
            return false;
        }
        let isPartyValid: boolean = this.isPartyValid();
        if (addingToParty) {
            const isNewPokemonValid = new Utils.BooleanHolder(true);
            const species = this.filteredStarterContainers[this.cursor].species;
            Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_CHOICE, species, isNewPokemonValid, this.scene.gameData.getSpeciesDexAttrProps(species, this.getCurrentDexProps(species.speciesId)), false);
            isPartyValid = isPartyValid || isNewPokemonValid.value;
        }

        this.canAddParty = false;
        const remainValue = valueLimit - newValue;
        for (let s = 0; s < this.allSpecies.length; s++) {
            const speciesStarterValue = this.getActualStarterValue(this.allSpecies[s].speciesId as unknown as Species);
            const speciesStarterDexEntry = this.scene.gameData.dexData[this.allSpecies[s].speciesId];

            const speciesSprite = this.starterContainers[s].icon;

            const isValidForChallenge = new Utils.BooleanHolder(true);
            Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_CHOICE, this.allSpecies[s], isValidForChallenge, this.scene.gameData.getSpeciesDexAttrProps(this.allSpecies[s], this.getCurrentDexProps(this.allSpecies[s].speciesId)), isPartyValid);

            const canBeChosen = remainValue >= speciesStarterValue && isValidForChallenge.value;

            const isPokemonInParty = this.isInParty(this.allSpecies[s])[0];

            if (canBeChosen || this.getMode() == Mode.EGG_STARTER_SELECT || (isPokemonInParty && remainValue >= speciesStarterValue)) {
                speciesSprite.setAlpha(1);
                if (speciesStarterDexEntry?.caughtAttr) {
                    this.canAddParty = true;
                }
            } else {
                speciesSprite.setAlpha(0.375);
            }
        }

        this.value = newValue;
        return true;
    }

    exitStarterSelect(): void {
        const ui = this.getUi();
        ui.setMode(this.getMode());
        this.clearText();
        (this.scene as BattleScene).clearAllPhaseQueues();
        this.scene.sessionSlotId = -1;
        this.scene.gameMode = getGameMode(GameModes.CLASSIC);
        (this.scene as BattleScene).gameData.selectedChampionId = undefined;
        (this.scene as BattleScene).gameData.resetBattlePathData();
        if (this.scene.gameMode.isChallenge) {
            this.scene.pushPhase(new SelectChallengePhase(this.scene));
        }
        else {
            this.scene.pushPhase(new TitlePhase(this.scene, false, true));
        }
        this.clearText();
        this.scene.getCurrentPhase()?.end();
    }

    tryExit(): boolean {
        this.blockInput = true;
        const ui = this.getUi();

        const cancel = () => {
            ui.setMode(this.getMode());
            this.clearText();
            this.blockInput = false;

            if (!this.lastSpecies && this.filteredStarterContainers.length > 0) {
                this.setSpecies(this.filteredStarterContainers[0].species);
            }
        };

        ui.showText(i18next.t("starterSelectUiHandler:confirmExit"), null, () => {
            ui.setModeWithoutClear(Mode.CONFIRM, () => {
                this.exitStarterSelect(ui);
            }, cancel, null, null, 19);
        });

        return true;
    }

    tryStart(manualTrigger: boolean = false): boolean {
        if (!this.starterSpecies.length) {
            return false;
        }

        const ui = this.getUi();

        const cancel = () => {
            ui.setMode(this.getMode());
            if (!manualTrigger) {
                this.popStarter(this.starterSpecies.length - 1);
            }
            this.clearText();
        };

        const isEggStarterMode = this.getMode() === Mode.EGG_STARTER_SELECT;

        const canStart = isEggStarterMode ? true : this.isPartyValid();

        const fusionTax = this.starterFusionIndexes.reduce((total, fusionIndex) => {
            return total + (fusionIndex >= 0 ? this.scene.gameData.getFusionTaxCost() : 0);
        }, 0);

        const hasFusions = isEggStarterMode ? false : fusionTax > 0;
        const canAffordFusions = this.scene.gameData.permaMoney >= fusionTax;

        if (canStart) {
            if (hasFusions) {
                const confirmMessage = canAffordFusions
                    ? i18next.t("starterSelectUiHandler:confirmStartTeamWithFusion", {
                        fusionTax: `${fusionTax}`
                    })
                    : i18next.t("starterSelectUiHandler:cannotStartTeamInsufficientFunds", {
                        fusionTax: `${fusionTax}`,
                        currentFunds: `${this.scene.gameData.permaMoney}`
                    });

                ui.showText(confirmMessage, null, () => {
                    if (canAffordFusions) {
                        ui.setModeWithoutClear(Mode.CONFIRM, () => {
                            this.scene.addPermaMoney(-fusionTax);
                            this.scene.updateUIPermaMoneyText();

                            this.scene.gameData.reducePermaModifierByType([
                                PermaType.PERMA_CHEAPER_FUSIONS_1,
                                PermaType.PERMA_CHEAPER_FUSIONS_2,
                                PermaType.PERMA_CHEAPER_FUSIONS_3
                            ], this.scene);

                            this.startRun();
                        }, cancel, null, null, 19);
                    } else {
                        ui.setModeWithoutClear(Mode.CONFIRM, () => {
                            ui.showText(i18next.t("starterSelectUiHandler:insufficientFundsGuidance"), null, () => {
                                ui.setMode(this.getMode());
                            });
                        }, () => {
                            ui.setMode(this.getMode());
                        }, null, null, 19);
                    }
                });
            } else {
                ui.showText(i18next.t("starterSelectUiHandler:confirmStartTeam"), null, () => {
                    ui.setModeWithoutClear(Mode.CONFIRM, () => {
                        if (isEggStarterMode) {
                           this.exitStarterSelect();
                        }
                        else {
                            this.startRun();
                        }
                    }, cancel, null, null, 19);
                });
            }
        } else {
            const handler = this.scene.ui.getHandler() as AwaitableUiHandler;
            handler.tutorialActive = true;
            this.scene.ui.showText(i18next.t("starterSelectUiHandler:invalidParty"), null, () => this.scene.ui.showText("", 0, () => handler.tutorialActive = false), null, true);
        }
        return true;
    }

    protected getMode(): Mode {
        return Mode.STARTER_SELECT;
    }

    private isPointerInputBlocked(): boolean {
        return this._stUiTweakActive || this.blockInput || (this.scene as BattleScene).ui.getMode() !== this.getMode();
    }

    private startRun(): void {
        const ui = this.getUi();
        this.scene.money = this.scene.gameMode.getStartingMoney(this.scene);
        ui.setMode(this.getMode());

        this.scene.gameData.clearTemporaryPokemon();

        const thisObj = this;
        const originalStarterSelectCallback = this.starterSelectCallback;
        this.starterSelectCallback = null;
        originalStarterSelectCallback && originalStarterSelectCallback(new Array(this.starterSpecies.length).fill(0).map(function (_, i) {
            const starterSpecies = thisObj.starterSpecies[i];
            return {
                species: starterSpecies,
                dexAttr: thisObj.starterAttr[i],
                abilityIndex: thisObj.starterAbilityIndexes[i],
                fusionIndex: thisObj.starterFusionIndexes[i],
                passive: !(thisObj.scene.gameData.starterData[starterSpecies.speciesId].passiveAttr ^ (PassiveAttr.ENABLED | PassiveAttr.UNLOCKED)),
                nature: thisObj.starterNatures[i] as Nature,
                moveset: thisObj.starterMovesets[i],
                pokerus: thisObj.pokerusSpecies.includes(starterSpecies),
                nickname: thisObj.starterPreferences[starterSpecies.speciesId]?.nickname,
                isSignature: thisObj.isSignaturePokemon(starterSpecies.speciesId as unknown as Species) && thisObj.starterSignatureFlags[i],
            };
        }));

        this.scene.gameData.reducePermaModifierByType([
            PermaType.PERMA_STARTER_POINT_LIMIT_INC_1,
            PermaType.PERMA_STARTER_POINT_LIMIT_INC_2,
            PermaType.PERMA_STARTER_POINT_LIMIT_INC_3
        ], this.scene);
    }
    isPartyValid(): boolean {
        let canStart = false;
        for (let s = 0; s < this.starterSpecies.length; s++) {
            const isValidForChallenge = new Utils.BooleanHolder(true);
            const species = this.starterSpecies[s];
            Challenge.applyChallenges(this.scene.gameMode, Challenge.ChallengeType.STARTER_CHOICE, species, isValidForChallenge, this.scene.gameData.getSpeciesDexAttrProps(species, this.getCurrentDexProps(species.speciesId)), false);
            canStart = canStart || isValidForChallenge.value;
        }
        return canStart;
    }
    getCurrentDexProps(speciesId: number): bigint {
        let props = 0n;
        const caughtAttr = this.scene.gameData.dexData[speciesId].caughtAttr;
        if (this.starterPreferences[speciesId]?.female || ((caughtAttr & DexAttr.FEMALE) > 0n && (caughtAttr & DexAttr.MALE) === 0n)) {
            props += DexAttr.FEMALE;
        } else {
            props += DexAttr.MALE;
        }

        if (this.starterPreferences[speciesId]?.shiny || ((caughtAttr & DexAttr.SHINY) > 0n && (caughtAttr & DexAttr.NON_SHINY) === 0n)) {
            props += DexAttr.SHINY;
            if (this.starterPreferences[speciesId]?.variant) {
                props += BigInt(Math.pow(2, this.starterPreferences[speciesId]?.variant)) * DexAttr.DEFAULT_VARIANT;
            } else {

                if ((caughtAttr & DexAttr.DEFAULT_VARIANT) > 0) {
                    props += DexAttr.DEFAULT_VARIANT;
                }
                if ((caughtAttr & DexAttr.VARIANT_2) > 0) {
                    props += DexAttr.VARIANT_2;
                } else if ((caughtAttr & DexAttr.VARIANT_3) > 0) {
                    props += DexAttr.VARIANT_3;
                }
            }
        } else {
            props += DexAttr.NON_SHINY;
            props += DexAttr.DEFAULT_VARIANT;
        }
        if (this.starterPreferences[speciesId]?.form !== undefined) {
            props += BigInt(Math.pow(2, this.starterPreferences[speciesId]?.form)) * DexAttr.DEFAULT_FORM;
        } else {
            let resolvedFormIndex = this.scene.gameData.getFormIndex(caughtAttr);
            const speciesData = getPokemonSpecies(speciesId);
            if (speciesData?.forms?.length && speciesData.forms[resolvedFormIndex] && !speciesData.forms[resolvedFormIndex].isStarterSelectable) {
                resolvedFormIndex = 0;
            }
            props += this.scene.gameData.getFormAttr(resolvedFormIndex);
        }

        return props;
    }

    toggleStatsMode(on?: boolean): void {
        if (on === undefined) {
            on = !this.statsMode;
        }
        if (on) {
            this.showStats();
            this.statsMode = true;
            this.pokemonSprite.setVisible(false);
        } else {
            this.statsMode = false;
            this.statsContainer.setVisible(false);
            this.pokemonSprite.setVisible(!!this.speciesStarterDexEntry?.caughtAttr);

            this.statsContainer.updateIvs(null);
        }
    }

    showStats(): void {
        if (!this.speciesStarterDexEntry) {
            return;
        }

        this.statsContainer.setVisible(true);

        this.statsContainer.updateIvs(this.speciesStarterDexEntry.ivs);
    }

    clearText() {
        this.starterSelectMessageBoxContainer.setVisible(false);
        if (this._starterMessagePattern) {
            this._starterMessagePattern.clear();
            this._starterMessagePattern = null;
        }
        super.clearText();
    }

    updateFusionsButtonVisual(): void {
        if (this.fusionsFilterActive) {
            this.fusionsButtonLabel.setColor(this.getTextColor(TextStyle.SUMMARY_GOLD));
            this.fusionsButtonLabel.setShadowColor(this.getTextColor(TextStyle.SUMMARY_GOLD, true));
        } else {
            this.fusionsButtonLabel.setColor(this.getTextColor(TextStyle.PARTY));
            this.fusionsButtonLabel.setShadowColor(this.getTextColor(TextStyle.PARTY, true));
        }
    }

    hideInstructions(): void {
        this.shinyIconElement.setVisible(false);
        this.shinyLabel.setVisible(false);
        this.formIconElement.setVisible(false);
        this.formLabel.setVisible(false);
        this.genderIconElement.setVisible(false);
        this.genderLabel.setVisible(false);
        this.abilityIconElement.setVisible(false);
        this.abilityLabel.setVisible(false);
        this.natureIconElement.setVisible(false);
        this.natureLabel.setVisible(false);
        this.variantIconElement.setVisible(false);
        this.variantLabel.setVisible(false);
        this.fusionIconElement.setVisible(false);
        this.fusionLabel.setVisible(false);
        this.voidexIconElement.setVisible(false);
        this.voidexLabel.setVisible(false);
        this.signatureIconElement.setVisible(false);
        this.signatureLabel.setVisible(false);
        this.goFilterIconElement.setVisible(false);
        this.goFilterLabel.setVisible(false);
    }

    private static readonly NAME_DEFAULT_SCALE = 0.1666666667;
    private static readonly NAME_MAX_WIDTH = 86;

    private fitPokemonNameToWidth(name: string, species?: PokemonSpecies | null, shiny?: boolean, formIndex?: number): void {
        this.pokemonNameText.setScale(StarterSelectUiHandler.NAME_DEFAULT_SCALE);
        this.pokemonNameText.setText(name);

        const maxWidth = this.pokemonGenderText.text
            ? this.pokemonGenderText.x - this.pokemonNameText.x - 4
            : StarterSelectUiHandler.NAME_MAX_WIDTH;

        if (this.pokemonNameText.displayWidth > maxWidth) {
            const ratio = maxWidth / this.pokemonNameText.displayWidth;
            this.pokemonNameText.setScale(
                this.pokemonNameText.scaleX * ratio,
                this.pokemonNameText.scaleY
            );
        }

        this.applyGoldNameStyling(species, shiny, formIndex);
    }

    private applyGoldNameStyling(species?: PokemonSpecies | null, shiny?: boolean, formIndex?: number): void {
        const isDuelmon = (species ?? this.lastSpecies)?.generation === 20;
        const isFusion = this.pokemon?.isFusion() ?? false;
        const isShinyPokemon = this.pokemon?.isShiny() ?? shiny ?? false;
        const resolvedSpecies = species ?? this.lastSpecies;
        let isGlitchSmitty = this.pokemon?.isGlitchOrSmittyForm() ?? false;
        if (!isGlitchSmitty && resolvedSpecies && formIndex !== undefined) {
            const form = resolvedSpecies.forms?.[formIndex];
            if (form) {
                isGlitchSmitty = form.isGlitchOrSmittyForm(form.formKey) ?? false;
            }
        }
        const useGold = isDuelmon || isFusion || isShinyPokemon || isGlitchSmitty;
        const style = useGold ? TextStyle.SUMMARY_GOLD : TextStyle.SUMMARY;
        this.pokemonNameText.setColor(this.getTextColor(style));
        this.pokemonNameText.setShadowColor(this.getTextColor(style, true));
    }

    private applyStarterTweakOffsets(offsets: TweakOffsets, species?: PokemonSpecies): void {
        const activeSpecies = species ?? this.lastSpecies;
        if (!activeSpecies || activeSpecies.generation !== 20) return;
        this._lastTweakOffsets = { ...offsets };
        const g = getYuTuning();
        const d = StarterSelectUiHandler.ST_DEFAULT_OFFSETS;
        this.pokemonSprite.setPosition(
            this._stBaseCreatureX + g.creatureXOffset + d.creatureXOffset + offsets.creatureXOffset,
            this._stBaseCreatureY + g.yOffset + g.creatureYOffset + d.yOffset + d.creatureYOffset + offsets.creatureYOffset
        );
        this.pokemonSprite.setScale(this._stBaseCreatureScale + g.creatureScaleOffset + d.creatureScaleOffset + offsets.creatureScaleOffset);
        if (this.starterPortalSprite?.visible && this._stBasePortalScale !== 0) {
            this.starterPortalSprite.setScale(this._stBasePortalScale + g.portalScaleOffset + d.portalScaleOffset + offsets.portalScaleOffset);
            this.starterPortalSprite.setPosition(
                this._stBasePortalX + g.xOffset + d.xOffset + offsets.xOffset,
                this._stBasePortalY + g.yOffset + d.yOffset + offsets.yOffset
            );
        }
    }

    private getStUiTweakTarget(index: number): any | null {
      const currentContainer = this.filteredStarterContainers[this.cursor];
      switch (index) {
        case 0: return currentContainer?.fusionOverlayIcon ?? null;
        case 1: return currentContainer?.fusionOverlayBg ?? null;
        case 2: return this.pokemonCaughtIcon ?? null;
        case 3: return this.pokemonCaughtCountText ?? null;
        case 4: return this.pokemonHatchedIcon ?? null;
        case 5: return this.pokemonHatchedCountText ?? null;
        case 6: return this.pokemonFusionInfoDnaIcon ?? null;
        case 7: return this.pokemonFusionInfoSpeciesIcon ?? null;
        case 8: return this.pokemonFusionInfoDnaIcon ?? null;
        case 9: return this.pokemonCaughtHatchedContainer ?? null;
        default: return null;
      }
    }

    private handleStUiTweakInput(button: Button): boolean {
      if (button === Button.CANCEL) {
        this._stUiMetaMode = TweakMetaMode.NONE;
        this.cleanupStUiTweakKeyListeners();
        this._stUiTweakBaselines.clear();
        this.updateStUiTweakHUD();
        (this.scene as BattleScene).uiEditModeActive = false;
        if (this._stUiDropdownPanel) {
          this._stUiDropdownPanel.destroy();
          this._stUiDropdownPanel = null;
        }
        return true;
      }

      if (button === Button.SUBMIT) {
        if (this._stUiMetaMode === TweakMetaMode.EDIT_TYPE || this._stUiMetaMode === TweakMetaMode.ELEMENT) {
          this._stUiMetaMode = TweakMetaMode.EDIT;
          this.updateStUiTweakHUD();
        }
        return true;
      }

      if (this._stUiMetaMode === TweakMetaMode.EDIT_TYPE) {
        if (button === Button.LEFT) {
          this._stUiTweakMode = (this._stUiTweakMode - 1 + StarterSelectUiHandler.ST_UI_TWEAK_MODES.length) % StarterSelectUiHandler.ST_UI_TWEAK_MODES.length;
          this.updateStUiTweakHUD();
        } else if (button === Button.RIGHT) {
          this._stUiTweakMode = (this._stUiTweakMode + 1) % StarterSelectUiHandler.ST_UI_TWEAK_MODES.length;
          this.updateStUiTweakHUD();
        }
        return true;
      }

      if (this._stUiMetaMode === TweakMetaMode.ELEMENT) {
        if (button === Button.LEFT) {
          this._stUiTweakAssetIndex = (this._stUiTweakAssetIndex - 1 + StarterSelectUiHandler.ST_UI_TWEAK_ASSETS.length) % StarterSelectUiHandler.ST_UI_TWEAK_ASSETS.length;
          this.updateStUiTweakHUD();
        } else if (button === Button.RIGHT) {
          this._stUiTweakAssetIndex = (this._stUiTweakAssetIndex + 1) % StarterSelectUiHandler.ST_UI_TWEAK_ASSETS.length;
          this.updateStUiTweakHUD();
        }
        return true;
      }

      const mode = StarterSelectUiHandler.ST_UI_TWEAK_MODES[this._stUiTweakMode];
      const assetName = StarterSelectUiHandler.ST_UI_TWEAK_ASSETS[this._stUiTweakAssetIndex];
      const target = this.getStUiTweakTarget(this._stUiTweakAssetIndex);
      if (!target) {
        console.log(`[ST-UI-TWEAK] ${assetName} target not available`);
        return true;
      }

      const direction = button === Button.UP ? "up" : button === Button.DOWN ? "down" : button === Button.LEFT ? "left" : button === Button.RIGHT ? "right" : null;
      if (!direction) return true;

      this.applyStUiTweak(target, mode, direction);

      if ((assetName === "FusionOverlayBg" || assetName === "FusionOverlayIcon") && mode !== "color") {
        for (const container of this.filteredStarterContainers) {
          const gridTarget = assetName === "FusionOverlayBg" ? container.fusionOverlayBg : container.fusionOverlayIcon;
          if (gridTarget && gridTarget !== target) {
            if (mode === "scale") gridTarget.setScale(target.scaleX);
            else if (mode === "position") { gridTarget.x = target.x; gridTarget.y = target.y; }
            else if (mode === "alpha") gridTarget.alpha = target.alpha;
          }
        }
      }

      if (assetName === "FusionInfoBoth") {
        const secondary = this.pokemonFusionInfoSpeciesIcon;
        if (secondary) {
          this.applyStUiTweak(secondary, mode, direction);
        }
      }

      this.logStUiTweakState(assetName, target, `${mode} ${direction.toUpperCase()}`);
      this.updateStUiTweakHUD();
      return true;
    }

    private applyStUiTweak(target: any, mode: string, direction: string): void {
      const scaleStep = 0.01;
      const posStep = 0.5;
      const alphaStep = 0.05;

      if (mode === "scale") {
        if (direction === "up") target.setScale(Math.max(0.01, (target.scaleX ?? 1) + scaleStep));
        else if (direction === "down") target.setScale(Math.max(0.01, (target.scaleX ?? 1) - scaleStep));
      } else if (mode === "position") {
        if (direction === "up") target.y -= posStep;
        else if (direction === "down") target.y += posStep;
        else if (direction === "left") target.x -= posStep;
        else if (direction === "right") target.x += posStep;
      } else if (mode === "alpha") {
        if (direction === "up") target.alpha = Math.min(1, (target.alpha ?? 1) + alphaStep);
        else if (direction === "down") target.alpha = Math.max(0, (target.alpha ?? 1) - alphaStep);
      } else if (mode === "color") {
        const colors = StarterSelectUiHandler.FUSION_BG_COLORS;
        if (direction === "up" || direction === "right") {
          this._fusionBgColorIndex = (this._fusionBgColorIndex + 1) % colors.length;
        } else {
          this._fusionBgColorIndex = (this._fusionBgColorIndex - 1 + colors.length) % colors.length;
        }
        const newColor = colors[this._fusionBgColorIndex];
        for (const container of this.filteredStarterContainers) {
          if (container.fusionOverlayBg) {
            container.fusionOverlayBg.setTint(newColor);
          }
        }
        console.log(`[ST-UI-TWEAK] BG color → 0x${newColor.toString(16).padStart(6, "0")} (index ${this._fusionBgColorIndex})`);
      }
    }

    private logStUiTweakState(assetName: string, target: any, action: string): void {
      const x = target.x ?? 0;
      const y = target.y ?? 0;
      const sx = target.scaleX ?? 1;
      const sy = target.scaleY ?? 1;
      const a = target.alpha ?? 1;
      const baseline = this._stUiTweakBaselines.get(assetName);
      if (baseline) {
        const dx = x - baseline.x;
        const dy = y - baseline.y;
        const dsx = sx - baseline.scaleX;
        const dsy = sy - baseline.scaleY;
        const da = a - baseline.alpha;
        console.log(`[ST-UI-TWEAK] ${action} | asset=${assetName}\n  current: x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)}\n  delta:   Δx=${dx >= 0 ? "+" : ""}${dx.toFixed(1)} Δy=${dy >= 0 ? "+" : ""}${dy.toFixed(1)} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}`);
      } else {
        console.log(`[ST-UI-TWEAK] ${action} | asset=${assetName} | x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} alpha=${a.toFixed(2)}`);
      }
    }

    private updateStUiTweakHUD(): void {
      if (!this._stUiTweakHudText) return;
      if (this._stUiMetaMode === TweakMetaMode.NONE) {
        this._stUiTweakHudText.setVisible(false);
        return;
      }
      const modeName = StarterSelectUiHandler.ST_UI_TWEAK_MODES[this._stUiTweakMode].toUpperCase();
      const assetName = StarterSelectUiHandler.ST_UI_TWEAK_ASSETS[this._stUiTweakAssetIndex];
      const { text, color } = formatMetaHud(this._stUiMetaMode, modeName, assetName);
      this._stUiTweakHudText.setText(text);
      this._stUiTweakHudText.setColor(color);
      this._stUiTweakHudText.setVisible(true);
    }

    private outputAllStUiTweakStates(): void {
      const changed: string[] = [];
      const unchanged: string[] = [];
      const unavailable: string[] = [];

      for (let i = 0; i < StarterSelectUiHandler.ST_UI_TWEAK_ASSETS.length; i++) {
        const name = StarterSelectUiHandler.ST_UI_TWEAK_ASSETS[i];
        const t = this.getStUiTweakTarget(i);
        if (!t) {
          unavailable.push(name);
          continue;
        }
        const baseline = this._stUiTweakBaselines.get(name);
        if (!baseline) {
          unavailable.push(name);
          continue;
        }
        const x = t.x ?? 0;
        const y = t.y ?? 0;
        const sx = t.scaleX ?? 1;
        const sy = t.scaleY ?? 1;
        const a = t.alpha ?? 1;
        const dx = x - baseline.x;
        const dy = y - baseline.y;
        const dsx = sx - baseline.scaleX;
        const dsy = sy - baseline.scaleY;
        const da = a - baseline.alpha;

        const isChanged = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001 || Math.abs(da) > 0.001;
        if (isChanged) {
          changed.push(`${name}:\n  ORIGINAL: x=${baseline.x.toFixed(1)} y=${baseline.y.toFixed(1)} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} α=${baseline.alpha.toFixed(2)}\n  CHANGE:   Δx=${dx >= 0 ? "+" : ""}${dx.toFixed(1)} Δy=${dy >= 0 ? "+" : ""}${dy.toFixed(1)} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}\n  APPLIED:  x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)}`);
        } else {
          unchanged.push(name);
        }
      }

      const sections: string[] = ["[ST-UI-TWEAK-SNAPSHOT]", "NOTE: CHANGE values are deltas for code adjustments."];
      if (changed.length > 0) { sections.push("\n── CHANGED ──"); sections.push(changed.join("\n\n")); }
      if (unchanged.length > 0) { sections.push("\n── UNCHANGED ──"); sections.push(unchanged.join(", ")); }
      if (unavailable.length > 0) { sections.push("\n── UNAVAILABLE ──"); sections.push(unavailable.join(", ")); }

      const bgColor = StarterSelectUiHandler.FUSION_BG_COLORS[this._fusionBgColorIndex];
      sections.push(`\n── BG COLOR ──\nIndex: ${this._fusionBgColorIndex} | Color: 0x${bgColor.toString(16).padStart(6, "0")}`);

      const output = sections.join("\n");
      console.log(output);
      tweakCopyToClipboard(output);
    }

    private setupStUiTweakKeyListeners(): void {
      this._stUiTweakKeyOneHandler = (e?: KeyboardEvent) => {
        if (e?.repeat) return;
        if (this._stUiMetaMode === TweakMetaMode.NONE) return;
        this._stUiMetaMode = cycleMetaMode(this._stUiMetaMode, TWEAK_META_CYCLE);
        this.updateStUiTweakHUD();
        if (this._stUiMetaMode === TweakMetaMode.NONE) {
          (this.scene as BattleScene).uiEditModeActive = false;
          this.cleanupStUiTweakKeyListeners();
          this._stUiTweakBaselines.clear();
          if (this._stUiDropdownPanel) {
            this._stUiDropdownPanel.destroy();
            this._stUiDropdownPanel = null;
          }
        }
      };
      this._stUiTweakKeyTwoHandler = (e?: KeyboardEvent) => {
        if (e?.repeat) return;
        this._stUiTweakAssetIndex = (this._stUiTweakAssetIndex + 1) % StarterSelectUiHandler.ST_UI_TWEAK_ASSETS.length;
        if (this._stUiDropdownPanel) this._stUiDropdownPanel.markUsed(StarterSelectUiHandler.ST_UI_TWEAK_ASSETS[this._stUiTweakAssetIndex]);
        this.updateStUiTweakHUD();
      };
      this._stUiTweakKeyThreeHandler = (e?: KeyboardEvent) => {
        if (e?.repeat) return;
        this._stUiTweakAssetIndex = (this._stUiTweakAssetIndex - 1 + StarterSelectUiHandler.ST_UI_TWEAK_ASSETS.length) % StarterSelectUiHandler.ST_UI_TWEAK_ASSETS.length;
        this.updateStUiTweakHUD();
      };
      this._stUiTweakKeyVHandler = (e?: KeyboardEvent) => {
        if (e?.repeat) return;
        this.outputAllStUiTweakStates();
      };
      this._stUiTweakKeyFiveHandler = (e?: KeyboardEvent) => {
        if (e?.repeat) return;
        if (this._stUiDropdownPanel) this._stUiDropdownPanel.toggle();
      };
      this.scene.input.keyboard?.on("keydown-ONE", this._stUiTweakKeyOneHandler);
      this.scene.input.keyboard?.on("keydown-TWO", this._stUiTweakKeyTwoHandler);
      this.scene.input.keyboard?.on("keydown-THREE", this._stUiTweakKeyThreeHandler);
      this.scene.input.keyboard?.on("keydown-V", this._stUiTweakKeyVHandler);
      this.scene.input.keyboard?.on("keydown-FIVE", this._stUiTweakKeyFiveHandler);
    }

    private cleanupStUiTweakKeyListeners(): void {
      if (this._stUiTweakKeyOneHandler) {
        this.scene.input.keyboard?.off("keydown-ONE", this._stUiTweakKeyOneHandler);
        this._stUiTweakKeyOneHandler = null;
      }
      if (this._stUiTweakKeyTwoHandler) {
        this.scene.input.keyboard?.off("keydown-TWO", this._stUiTweakKeyTwoHandler);
        this._stUiTweakKeyTwoHandler = null;
      }
      if (this._stUiTweakKeyThreeHandler) {
        this.scene.input.keyboard?.off("keydown-THREE", this._stUiTweakKeyThreeHandler);
        this._stUiTweakKeyThreeHandler = null;
      }
      if (this._stUiTweakKeyVHandler) {
        this.scene.input.keyboard?.off("keydown-V", this._stUiTweakKeyVHandler);
        this._stUiTweakKeyVHandler = null;
      }
      if (this._stUiTweakKeyFiveHandler) {
        this.scene.input.keyboard?.off("keydown-FIVE", this._stUiTweakKeyFiveHandler);
        this._stUiTweakKeyFiveHandler = null;
      }
    }

    private showSummaryTooltip(): void {
      if (!this.lastSpecies) return;
      const dexEntry = this.scene.gameData.dexData[this.lastSpecies.speciesId];
      if (!dexEntry || !dexEntry.caughtAttr) return;

      this.hideSummaryTooltip();

      if (this.pokemon && this.pokemon.species) {
        const natureName = getNatureName(this.pokemon.nature);
        const opts: any = { replaceFieldWithType: true, natureSuffix: natureName };
        if (this.pokemon.fusionSpecies) {
          opts.comparisonStats = this.pokemon.getSpeciesForm().baseStats.slice(0);
        }
        if (!opts.comparisonStats && this.isEffectivelySignature(this.lastSpecies.speciesId as unknown as Species)) {
          const altBuildId = this.getSignatureAltBuildId(this.lastSpecies.speciesId as unknown as Species);
          if (altBuildId != null) {
            const def = POKEMON_ALT_BUILDS[altBuildId];
            if (def) {
              opts.comparisonStats = this.pokemon.getSpeciesForm().baseStats.slice(0);
              const modType = new PokemonAltBuildModifierType(def);
              const mod = new PokemonAltBuildModifier(modType, this.pokemon.id, def);
              mod.applyAltBuildToPokemon(this.pokemon, true);
            }
          }
        }
        PokemonBattleTooltipUtils.showView(
          this.scene as BattleScene, this.pokemon, 0, false,
          { x: 113 },
          opts
        );
        return;
      }

      const props = this.scene.gameData.getSpeciesDexAttrProps(this.lastSpecies, this.dexAttrCursor);
      this._summaryTooltipPokemon = (this.scene as BattleScene).addPlayerPokemon(
        this.lastSpecies,
        5,
        this.abilityCursor,
        props.formIndex,
        props.female ? Gender.FEMALE : Gender.MALE,
        props.shiny,
        props.variant,
        dexEntry.ivs?.slice(),
        this.natureCursor
      );
      if (this.starterMoveset?.length) {
        this._summaryTooltipPokemon.tryPopulateMoveset(this.starterMoveset);
      }

      const natureName = getNatureName(this._summaryTooltipPokemon.nature);
      const opts: any = { replaceFieldWithType: true, natureSuffix: natureName };
      if (this.isEffectivelySignature(this.lastSpecies.speciesId as unknown as Species)) {
        const altBuildId = this.getSignatureAltBuildId(this.lastSpecies.speciesId as unknown as Species);
        if (altBuildId != null) {
          const def = POKEMON_ALT_BUILDS[altBuildId];
          if (def) {
            opts.comparisonStats = this._summaryTooltipPokemon.getSpeciesForm().baseStats.slice(0);
            const modType = new PokemonAltBuildModifierType(def);
            const mod = new PokemonAltBuildModifier(modType, this._summaryTooltipPokemon.id, def);
            mod.applyAltBuildToPokemon(this._summaryTooltipPokemon, true);
          }
        }
      }
      PokemonBattleTooltipUtils.showView(
        this.scene as BattleScene, this._summaryTooltipPokemon, 0, false,
        { x: 113 },
        opts
      );
    }

    private hideSummaryTooltip(): void {
      PokemonBattleTooltipUtils.hide();
      if (this._summaryTooltipPokemon) {
        this._summaryTooltipPokemon.destroy();
        this._summaryTooltipPokemon = null;
      }
    }

    private showPartySlotTooltip(index: number): void {
      if (this._isSwapSelecting) return;
      this.hidePartySlotTooltip();
      const species = this.starterSpecies[index];
      if (!species) return;
      const dexEntry = this.scene.gameData.dexData[species.speciesId];
      if (!dexEntry?.caughtAttr) return;

      const props = this.scene.gameData.getSpeciesDexAttrProps(species, this.starterAttr[index]);
      this._partyTooltipPokemon = (this.scene as BattleScene).addPlayerPokemon(
        species, 5, this.starterAbilityIndexes[index],
        props.formIndex,
        props.female ? Gender.FEMALE : Gender.MALE,
        props.shiny, props.variant,
        dexEntry.ivs?.slice(), this.starterNatures[index]
      );
      if (this.starterMovesets[index]?.length) {
        this._partyTooltipPokemon.tryPopulateMoveset(this.starterMovesets[index]);
      }
      const fusionIndex = this.starterFusionIndexes[index];
      if (fusionIndex >= 0) {
        const fusionPartnerId = this.scene.gameData.starterData[species.speciesId]?.obtainedFusions?.[fusionIndex];
        if (fusionPartnerId) {
          this._partyTooltipPokemon.generateFusionViaSpeciesID(fusionPartnerId, true);
        }
      }

      const natureName = getNatureName(this.starterNatures[index]);
      const opts: any = { replaceFieldWithType: true, natureSuffix: natureName };
      if (this._partyTooltipPokemon.fusionSpecies) {
        opts.comparisonStats = this._partyTooltipPokemon.getSpeciesForm().baseStats.slice(0);
      }
      const slotIsSignature = this.starterSignatureFlags[index]
        && this.isSignaturePokemon(species.speciesId as unknown as Species);
      if (!opts.comparisonStats && slotIsSignature) {
        const altBuildId = this.getSignatureAltBuildId(species.speciesId as unknown as Species);
        if (altBuildId != null) {
          const def = POKEMON_ALT_BUILDS[altBuildId];
          if (def) {
            opts.comparisonStats = this._partyTooltipPokemon.getSpeciesForm().baseStats.slice(0);
            const modType = new PokemonAltBuildModifierType(def);
            const mod = new PokemonAltBuildModifier(modType, this._partyTooltipPokemon.id, def);
            mod.applyAltBuildToPokemon(this._partyTooltipPokemon, true);
          }
        }
      }
      PokemonBattleTooltipUtils.showView(
        this.scene as BattleScene, this._partyTooltipPokemon, 0, false,
        { x: 113 },
        opts
      );
    }

    private hidePartySlotTooltip(): void {
      PokemonBattleTooltipUtils.hide();
      if (this._partyTooltipPokemon) {
        this._partyTooltipPokemon.destroy();
        this._partyTooltipPokemon = null;
      }
    }

    clear(): void {
        this.hideSummaryTooltip();
        this.hidePartySlotTooltip();
        this._summaryTooltipDeferred = false;
        if (this._summaryDeferArm) {
          this.scene.input.off("pointermove", this._summaryDeferArm);
          this._summaryDeferArm = null;
        }
        (this.scene as BattleScene).ui.setReplayHudSuppressed(false);
        if (this._wheelHandler) {
          this.scene.input.off("wheel", this._wheelHandler);
          this._wheelHandler = null;
        }
        if (this._gridDragMoveHandler) {
          this.scene.input.off("pointermove", this._gridDragMoveHandler);
          this._gridDragMoveHandler = null;
        }
        if (this._gridDragUpHandler) {
          this.scene.input.off("pointerup", this._gridDragUpHandler);
          this._gridDragUpHandler = null;
        }
        this._gridDragStartY = null;
        if (this._stUiTweakKeyHHandler) {
          this.scene.input.keyboard?.off("keydown-H", this._stUiTweakKeyHHandler);
          this._stUiTweakKeyHHandler = null;
        }
        this.cleanupStUiTweakKeyListeners();
        this._stUiMetaMode = TweakMetaMode.NONE;
        this._stUiTweakBaselines.clear();
        if (this._stUiTweakHudText) this._stUiTweakHudText.setVisible(false);
        if (this._stUiDropdownPanel) {
          this._stUiDropdownPanel.destroy();
          this._stUiDropdownPanel = null;
        }
        this._spriteTweak?.clear();
        if (this._starterMessagePattern) {
            this._starterMessagePattern.clear();
            this._starterMessagePattern = null;
        }
        super.clear();

        StarterPrefs.save(this.starterPreferences);
        this.cursor = -1;
        this.fusionsCursorObj.setVisible(false);
        this.fusionsFilterActive = false;
        this.updateFusionsButtonVisual();
        this.hideInstructions();
        this.starterSelectContainer.setVisible(false);
        this.blockInput = false;

        while (this.starterSpecies.length) {
            this.popStarter(this.starterSpecies.length - 1);
        }

        if (this.statsMode) {
            this.toggleStatsMode(false);
        }

        this.championAvailableSpecies = undefined;
        this.championFilterConfig = undefined;
        this.championOnStarterSelected = undefined;
        this.championOnCancel = undefined;
    }

    checkIconId(icon: Phaser.GameObjects.Sprite, species: PokemonSpecies, female: boolean, formIndex: number, shiny: boolean, variant: number) {
        if (icon.frame.name !== species.getIconId(female, formIndex, shiny, variant)) {
            icon.setTexture(species.getIconAtlasKey(formIndex, false, variant));
            icon.setFrame(species.getIconId(female, formIndex, false, variant));
            if (icon.frame.name !== species.getIconId(female, formIndex, false, variant)) {
                icon.setTexture("pokemon_icons_0");
                icon.setFrame("unknown");
            }
        }
    }
}