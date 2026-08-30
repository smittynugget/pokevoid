import i18next from "i18next";
import RoundRectangle from "phaser3-rex-plugins/plugins/roundrectangle.js";
import BattleScene from "../battle-scene";
import { allAbilities } from "../data/ability";
import { speciesEggMoves } from "../data/egg-moves";
import { pokemonEvolutions, pokemonPrevolutions } from "../data/pokemon-evolutions";
import { SMITTY_FORM_ITEMS } from "../data/pokemon-forms";
import { getModPokemonName } from "../data/mod-glitch-form-utils";
import { getAllRivalTrainerTypes, trainerConfigs, trainerPokemonPools } from "../data/trainer-config";
import PokemonSpecies, { UniversalSmittyForm, getFusedSpeciesName, getPokemonSpecies, pokemonSmittyForms, speciesStarters, starterPassiveAbilities, universalSmittyForms } from "../data/pokemon-species";
import { Type, getTypeRgb } from "../data/type";
import { Abilities } from "../enums/abilities";
import { Button } from "../enums/buttons";
import { FormChangeItem } from "../enums/form-change-items";
import { Moves } from "../enums/moves";
import { RewardType } from "../enums/reward-type";
import { Species } from "../enums/species";
import { SpeciesFormKey } from "../enums/species-form-key";
import { allMoves } from "../data/move";
import { AddPokemonModifierType } from "../modifier/modifier-type";
import UiHandler from "./ui-handler";
import { Mode } from "./mode";
import ModifierSelectUiHandler from "./modifier-select-ui-handler";
import { SmitomTipConfig } from "./smitom-tip-ui-handler";
import Overrides from "#app/overrides";
import { getPokedexMethodDescription } from "./pokedex-method-description";
import { addBBCodeTextObject, addTextInputObject, addTextObject, TextStyle } from "./text";
import * as Utils from "../utils";
import { DexAttr, QuestUnlockables, getQuestUnlockableName, rivalQuestMap, rivalStageTwoQuestMap } from "../system/game-data";
import { TrainerType } from "../enums/trainer-type";
import { Unlockables } from "../system/unlockables";

type Bucket = "modifier" | "party" | "enemy" | "other";
type TargetKind = "species" | "evolution";
type SortKey = "id" | "caught" | "bst" | "hp" | "atk" | "def" | "spa" | "spd" | "spe" | "cost";
type SortDir = "asc" | "desc";
type CompletionCategory = "caught" | "glitch" | "smitty" | "smittyFoes" | "complete" | "rivals" | "fusions" | "shiniesV1" | "shiniesV2" | "shiniesV3";
type ViewMode = "pokemonAll" | "pokemonGlitch" | "pokemonSmitty" | "rivals" | "smittyFoes" | "fusions" | "shiniesV1" | "shiniesV2" | "shiniesV3";

type VoidexTarget = {
  bucket: Bucket;
  kind: TargetKind;
  speciesId: Species;
  partyIndex?: number;
};

type RowStats = {
  id: number;
  bst: number;
  hp: number;
  atk: number;
  def: number;
  spa: number;
  spd: number;
  spe: number;
  cost: number;
};

type VoidexRow =
  | {
      kind: "speciesForm";
      target: VoidexTarget;
      species: PokemonSpecies;
      formIndex: number;
      stats: RowStats;
      search: string;
    }
  | {
      kind: "universalSmitty";
      formName: string;
      form: UniversalSmittyForm;
      stats: RowStats;
      search: string;
    }
  | {
      kind: "fusion";
      primarySpeciesId: Species;
      fusionSpeciesId: Species;
      primaryFormIndex: number;
      fusionFormIndex: number;
      primarySpecies: PokemonSpecies;
      fusionSpecies: PokemonSpecies;
      fusedBaseStats: [number, number, number, number, number, number];
      fusedTypes: [Type, Type | null];
      activeFusionAbilityName: string;
      stats: RowStats;
      search: string;
    }
  | {
      kind: "rival";
      rivalType: number;
      defeated: boolean;
      signatureSpeciesId: Species;
      signatureType: Type;
      offersStage1: RivalOffer[];
      offersStage2: RivalOffer[];
    }
  | {
      kind: "smittyFoesRow";
      frames: string[];
    };

type ListRow = Extract<VoidexRow, { kind: "speciesForm" | "universalSmitty" | "fusion" }>;

type MoveTileView = {
  bg: any;
  label: Phaser.GameObjects.Text;
  icon: Phaser.GameObjects.Sprite;
};

type RivalOffer = {
  rewardSpeciesId: Species;
  displaySpeciesId: Species;
  displayFormIndex: number;
  rewardType: RewardType;
  primaryType: Type;
  unlocked: boolean;
};

type SquareTileView = {
  bg: any;
  border: Phaser.GameObjects.Rectangle;
  icon: Phaser.GameObjects.Sprite;
  label?: Phaser.GameObjects.Text;
};

type RowView = {
  container: Phaser.GameObjects.Container;
  bg: any;
  icon: Phaser.GameObjects.Sprite;
  fusionIcon: Phaser.GameObjects.Sprite;
  caughtIcon: Phaser.GameObjects.Sprite;
  nameText: Phaser.GameObjects.Text;
  type1Icon: Phaser.GameObjects.Sprite;
  type2Icon: Phaser.GameObjects.Sprite;
  abilityText: any;
  statLabelCells: Phaser.GameObjects.Text[];
  statValueCells: Phaser.GameObjects.Text[];
  eggLabel: Phaser.GameObjects.Text;
  eggTiles: MoveTileView[];
  hintLabelText: Phaser.GameObjects.Text;
  hintBodyText: Phaser.GameObjects.Text;
  hintMaxWidth: number;
  abilityMaxWidth: number;
  rivalOfferTiles: SquareTileView[];
  smittyFoeTiles: SquareTileView[];
  hitZone?: Phaser.GameObjects.Zone;
};

export default class VoidexPrelistUiHandler extends UiHandler {
  private static readonly NAME_DEFAULT_SCALE = 0.1666666667;
  private static readonly NAME_MAX_WIDTH = 44;
  private static smitomVoidexDebugShown = false;

  private root: Phaser.GameObjects.Container;
  private list: Phaser.GameObjects.Container;
  private sortText: Phaser.GameObjects.Text;
  private subtitleText: Phaser.GameObjects.Text | null = null;
  private smittyFoesGrid: Phaser.GameObjects.Container | null = null;
  private smittyFoesGridTiles: { bg: any; border: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text; frame: string | null }[] = [];
  private smittyFoesGridFrames: string[] = [];
  private smittyFoesSelectedIndex: number = 0;
  private smittyFoesGridCols: number = 3;
  private smittyFoesGridVisibleCount: number = 0;
  private shiniesGrid: Phaser.GameObjects.Container | null = null;
  private shiniesGridTiles: { bg: any; border: Phaser.GameObjects.Rectangle; icon: Phaser.GameObjects.Sprite; label: Phaser.GameObjects.Text; speciesId: Species | null }[] = [];
  private shiniesGridEntries: { speciesId: Species; formIndex: number; caught: boolean }[] = [];
  private shiniesSelectedIndex: number = 0;
  private shiniesGridCols: number = 6;
  private shiniesGridVisibleCount: number = 0;
  private shiniesGridLastTileSize: number = 0;
  private completionContainer: Phaser.GameObjects.Container | null = null;
  private completionLabelText: Phaser.GameObjects.Text | null = null;
  private completionKeySprite: Phaser.GameObjects.Sprite | null = null;
  private completionCategoryText: Phaser.GameObjects.Text | null = null;
  private completionBarBorder: Phaser.GameObjects.Rectangle | null = null;
  private completionBarBg: Phaser.GameObjects.Rectangle | null = null;
  private completionBarFill: Phaser.GameObjects.Rectangle | null = null;
  private completionAvailableCategories: CompletionCategory[] = [];
  private completionCategoryIndex: number = 0;
  private sortLeftArrow: Phaser.GameObjects.Sprite | null = null;
  private sortRightArrow: Phaser.GameObjects.Sprite | null = null;
  private sortDirKeySprite: Phaser.GameObjects.Sprite | null = null;
  private searchBlurHandler: ((event: MouseEvent) => void) | null = null;
  private searchKeydownHandler: ((event: KeyboardEvent) => void) | null = null;
  private searchContextMenuHandler: ((event: Event) => void) | null = null;
  private searchMouseDownHandler: ((event: MouseEvent) => void) | null = null;
  private rowHeight: number = 36;
  private visibleRows: number = 10;

  private searchContainer: Phaser.GameObjects.Container | null = null;
  private inputEl: any | null = null;
  private searchQuery: string = "";
  private viewWidth: number = 0;
  private _wheelHandler: ((...args: any[]) => void) | null = null;
  private unlockHintMap: Map<string, { questId: QuestUnlockables; rivalType: number | null }> = new Map();

  private allRows: ListRow[] = [];
  private rows: VoidexRow[] = [];
  private views: RowView[] = [];
  private cursorIndex: number = 0;
  private scrollOffset: number = 0;
  private restrictedSpeciesIds: Set<Species> | null = null;
  private focusSpeciesId: Species | null = null;
  private focusFormIndex: number | null = null;
  private focusFusionSpeciesId: Species | null = null;
  private focusFusionPrimaryFormIndex: number | null = null;
  private focusFusionFormIndex: number | null = null;
  private initialViewMode: ViewMode | null = null;
  private viewMode: ViewMode = "pokemonAll";
  private rivalOfferIndex: number = 0;
  private smittyFoeColIndex: number = 0;
  private smittyFoeCols: number = 3;

  private sortKey: SortKey = "id";
  private sortDir: SortDir = "asc";
  private lastNonCategorySortDir: SortDir = "asc";

  private sortKeys: SortKey[] = ["id", "caught", "bst", "hp", "atk", "def", "spa", "spd", "spe", "cost"];

  constructor(scene: BattleScene) {
    super(scene, Mode.VOIDEX_PRELIST);
  }

  override setup(): void {
    this.root = this.scene.add.container(0, -this.scene.game.canvas.height / 6);
    this.root.setVisible(false);
  }

  override show(_args: any[] = []): boolean {
    super.show(_args);

    this.restrictedSpeciesIds = null;
    this.focusSpeciesId = null;
    this.focusFormIndex = null;
    this.focusFusionSpeciesId = null;
    this.focusFusionPrimaryFormIndex = null;
    this.focusFusionFormIndex = null;
    this.initialViewMode = null;
    if (typeof _args[0] === "number") {
      this.focusSpeciesId = _args[0] as Species;
    }
    if (Array.isArray(_args[1]) && _args[1].length > 0) {
      this.restrictedSpeciesIds = new Set(_args[1].filter((s: any): s is Species => typeof s === "number"));
    }
    if (typeof _args[2] === "number" && _args[2] >= 0) {
      this.focusFormIndex = _args[2];
    }
    if (typeof _args[3] === "number" && Number.isFinite(_args[3])) {
      this.focusFusionSpeciesId = _args[3] as Species;
    }
    if (typeof _args[4] === "number" && Number.isFinite(_args[4]) && _args[4] >= 0 && Number.isInteger(_args[4])) {
      this.focusFusionPrimaryFormIndex = _args[4];
    }
    if (typeof _args[5] === "number" && Number.isFinite(_args[5]) && _args[5] >= 0 && Number.isInteger(_args[5])) {
      this.focusFusionFormIndex = _args[5];
    }
    if (_args[6] === "pokemonAll" || _args[6] === "fusions") {
      this.initialViewMode = _args[6] as ViewMode;
    }

    const width = this.scene.game.canvas.width / 6;
    const height = this.scene.game.canvas.height / 6;
    this.viewWidth = width;

    this.destroySearchInput();
    this.root.removeAll(true);
    this.sortLeftArrow = null;
    this.sortRightArrow = null;
    this.sortDirKeySprite = null;
    this.subtitleText = null;
    this.smittyFoesGrid = null;
    this.smittyFoesGridTiles = [];
    this.smittyFoesGridFrames = [];
    this.smittyFoesSelectedIndex = 0;
    this.smittyFoesGridVisibleCount = 0;
    this.shiniesGrid = null;
    this.shiniesGridTiles = [];
    this.shiniesGridEntries = [];
    this.shiniesSelectedIndex = 0;
    this.shiniesGridVisibleCount = 0;
    this.shiniesGridLastTileSize = 0;
    this.completionContainer = null;
    this.completionLabelText = null;
    this.completionKeySprite = null;
    this.completionCategoryText = null;
    this.completionBarBorder = null;
    this.completionBarBg = null;
    this.completionBarFill = null;
    this.completionAvailableCategories = [];
    this.completionCategoryIndex = 0;
    this.viewMode = this.initialViewMode ?? "pokemonAll";
    this.rivalOfferIndex = 0;
    this.smittyFoeColIndex = 0;
    this.root.setPosition(0, -this.scene.game.canvas.height / 6);
    this.root.setVisible(true);

    const bg = this.scene.add.nineslice(0, 0, "default_bg", undefined, width, height, 0, 0, 16, 0);
    bg.setOrigin(0, 0);
    try {
      if ((bg as any).postFX && typeof (bg as any).postFX.addColorMatrix === "function") {
        const colorMatrix = (bg as any).postFX.addColorMatrix();
        colorMatrix.negative();
      } else {
        bg.setTint(0xffffff);
        bg.setBlendMode(Phaser.BlendModes.DIFFERENCE);
      }
    } catch (e) {
      bg.setTint(0x000000);
      bg.setBlendMode(Phaser.BlendModes.SCREEN);
    }
    this.root.add(bg);

    const titleContainer = this.scene.add.container(0, -4);
    titleContainer.setDepth(1000);

    const voidexIcon = this.scene.add.sprite(0, 0, "smitems", "modPassiveAbility");
    voidexIcon.setScale(0.12);
    voidexIcon.setOrigin(0, 0);

    voidexIcon.setPosition(4, 10);
    titleContainer.add(voidexIcon);

    const titleText = addTextObject(this.scene, 0, 0, i18next.t("pokedex:voidex"), TextStyle.SETTINGS_LABEL, { fontSize: "56px", align: "left" });
    titleText.setOrigin(0, 0);
    titleText.setAlpha(1.0);
    titleText.setPosition(voidexIcon.x + voidexIcon.displayWidth + 4, 8.6);
    titleContainer.add(titleText);
    voidexIcon.setX(voidexIcon.x + 3);

    const subtitleText = addTextObject(this.scene, 0, 0, i18next.t("pokedex:prelistTagline"), TextStyle.WINDOW, { fontSize: "40px", align: "left" });
    subtitleText.setOrigin(0, 0);
    subtitleText.setTint(0xffffff);
    subtitleText.setAlpha(0.8);
    subtitleText.setPosition(titleText.x + titleText.displayWidth + 10, 10.2);
    titleContainer.add(subtitleText);
    this.subtitleText = subtitleText;

    this.sortText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "41px", align: "left" });
    this.sortText.setOrigin(0, 0);
    this.sortText.setTint(0xffffff);
    this.sortText.setAlpha(0.8);
    this.sortText.setPosition(Math.min(subtitleText.x + subtitleText.displayWidth + 20, width - 115), 9.2);
    titleContainer.add(this.sortText);

    const maxSubtitleWidth = this.sortText.x - subtitleText.x - 10;
    let tagline = i18next.t("pokedex:prelistTagline");
    subtitleText.setText(tagline);
    while (subtitleText.displayWidth > maxSubtitleWidth && tagline.length > 1) {
      tagline = tagline.slice(0, -1);
      subtitleText.setText(tagline + "…");
    }

    this.sortLeftArrow = this.scene.add.sprite(0, 16.2, "cursor_reverse");
    this.sortLeftArrow.setScale(0.75);
    this.sortLeftArrow.setInteractive({ useHandCursor: true });
    if ((this.sortLeftArrow as any)?.anims?.exists && (this.sortLeftArrow as any).anims.exists("cursor_reverse")) {
      (this.sortLeftArrow as any).play("cursor_reverse");
    }
    this.sortLeftArrow.on("pointerup", () => {
      this.cycleSortKey(-1);
      this.getUi().playSelect();
    });
    titleContainer.add(this.sortLeftArrow);

    this.sortRightArrow = this.scene.add.sprite(0, 16.2, "cursor");
    this.sortRightArrow.setScale(0.75);
    this.sortRightArrow.setInteractive({ useHandCursor: true });
    if ((this.sortRightArrow as any)?.anims?.exists && (this.sortRightArrow as any).anims.exists("cursor")) {
      (this.sortRightArrow as any).play("cursor");
    }
    this.sortRightArrow.on("pointerup", () => {
      this.cycleSortKey(1);
      this.getUi().playSelect();
    });
    titleContainer.add(this.sortRightArrow);

    const sortDirIcon = this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_CYCLE_ABILITY");
    const sortDirType = this.scene.inputController?.getLastSourceType() || "keyboard";
    this.sortDirKeySprite = this.scene.add.sprite(0, 0, sortDirType);
    if (sortDirIcon) {
      this.sortDirKeySprite.setFrame(sortDirIcon);
    }
    this.sortDirKeySprite.setScale(0.5);
    this.sortDirKeySprite.setInteractive({ useHandCursor: true });
    this.sortDirKeySprite.on("pointerup", () => {
      this.sortDir = this.sortDir === "desc" ? "asc" : "desc";
      this.applyFilterAndSort(false);
      this.updateSortText();
      this.refreshViews();
      this.getUi().playSelect();
    });
    titleContainer.add(this.sortDirKeySprite);

    this.root.add(titleContainer);

    this.updateSortText();
    this.updateSubtitleText(true);
    this.createSearchInput(width);
    this.createCompletionWidget(titleContainer, width);

    const listY = 34;
    this.list = this.scene.add.container(0, listY);
    this.root.add(this.list);
    this.smittyFoesGrid = this.scene.add.container(0, listY);
    this.smittyFoesGrid.setVisible(false);
    this.root.add(this.smittyFoesGrid);
    this.shiniesGrid = this.scene.add.container(0, listY);
    this.shiniesGrid.setVisible(false);
    this.root.add(this.shiniesGrid);

    this.allRows = this.buildAllRows();
    this.applyFilterAndSort(true);
    if (this.viewMode === "fusions" && this.rows.length === 0) {
      this.viewMode = "pokemonAll";
      this.applyFilterAndSort(true);
      this.updateSortText();
      this.updateSubtitleText(true);
    }
    this.buildUnlockHintMap();
    this.updateCompletionWidget();
    if (this.viewMode === "fusions" && this.completionAvailableCategories.includes("fusions")) {
      const idx = this.completionAvailableCategories.indexOf("fusions");
      if (idx >= 0 && this.completionCategoryIndex !== idx) {
        this.completionCategoryIndex = idx;
        this.updateCompletionWidget();
      }
    }

    const availableHeight = height - listY - 2;
    this.visibleRows = Math.max(1, Math.floor(availableHeight / this.rowHeight));
    this.buildViews(width);
    if (this.focusSpeciesId != null && this.focusFusionSpeciesId != null) {
      const primaryId = this.focusSpeciesId;
      const fusionId = this.focusFusionSpeciesId;

      const shouldTryFormMatch =
        this.viewMode === "fusions" &&
        this.focusFusionPrimaryFormIndex != null &&
        this.focusFusionFormIndex != null;

      let idx = -1;
      if (shouldTryFormMatch) {
        idx = this.rows.findIndex(r =>
          r.kind === "fusion" &&
          r.primarySpeciesId === primaryId &&
          r.fusionSpeciesId === fusionId &&
          r.primaryFormIndex === this.focusFusionPrimaryFormIndex &&
          r.fusionFormIndex === this.focusFusionFormIndex
        );
      }
      if (idx < 0) {
        idx = this.rows.findIndex(r =>
          r.kind === "fusion" &&
          r.primarySpeciesId === primaryId &&
          r.fusionSpeciesId === fusionId
        );
      }
      if (idx < 0) {
        const expanded = this.expandFusionEvolutionPairs(primaryId, fusionId);
        const expandedSet = new Set(expanded.map(([p, f]) => `${p as unknown as number}:${f as unknown as number}`));
        idx = this.rows.findIndex(r =>
          r.kind === "fusion" &&
          expandedSet.has(`${r.primarySpeciesId as unknown as number}:${r.fusionSpeciesId as unknown as number}`)
        );
      }
      if (idx < 0) {
        idx = this.rows.findIndex(r =>
          r.kind === "fusion" && r.primarySpeciesId === primaryId
        );
      }
      if (idx >= 0) {
        this.cursorIndex = idx;
      }
    } else if (this.focusSpeciesId != null && this.viewMode !== "fusions") {
      const focusId = this.focusSpeciesId;
      const idx = this.rows.findIndex(r =>
        r.kind === "speciesForm" &&
        r.species.speciesId === focusId &&
        (this.focusFormIndex == null || r.formIndex === this.focusFormIndex)
      );
      if (idx >= 0) {
        this.cursorIndex = idx;
      } else {
        const fallback = this.rows.findIndex(r =>
          r.kind === "speciesForm" && r.species.speciesId === focusId
        );
        if (fallback >= 0) {
          this.cursorIndex = fallback;
        }
      }
    }
    this.refreshViews();

    this.root.setInteractive(new Phaser.Geom.Rectangle(0, 0, width, height), Phaser.Geom.Rectangle.Contains);
    this.getUi().bringToTop(this.root);
    this.getUi().add(this.root);

    this._wheelHandler = (_p: any, _g: any, _dx: number, dy: number) => {
      const maxScroll = Math.max(0, this.rows.length - this.visibleRows);
      if (dy > 0 && this.scrollOffset < maxScroll) {
        this.scrollOffset = Math.min(this.scrollOffset + 1, maxScroll);
        this.refreshViews();
      } else if (dy < 0 && this.scrollOffset > 0) {
        this.scrollOffset = Math.max(this.scrollOffset - 1, 0);
        this.refreshViews();
      }
    };
    this.scene.input.on("wheel", this._wheelHandler);

    this.triggerSmitomVoidexTipIfNeeded();

    return true;
  }

  private triggerSmitomVoidexTipIfNeeded(): void {
    const scene = this.scene as BattleScene;
    const flags = scene.gameData.smitomTutorialFlags;
    if (Overrides.DEBUG_FORCE_SMITOM_TUTORIAL && !VoidexPrelistUiHandler.smitomVoidexDebugShown) {
      VoidexPrelistUiHandler.smitomVoidexDebugShown = true;
      flags["voidex_welcome"] = false;
    }
    if (!flags["voidex_welcome"]) {
      scene.time.delayedCall(350, () => {
        if (scene.ui.getMode() !== Mode.VOIDEX_PRELIST) return;
        const tipConfig: SmitomTipConfig = {
          tutorialKey: "voidex_welcome",
          title: i18next.t("tutorial:smitomTip.voidexWelcome.title"),
          texts: [
            i18next.t("tutorial:smitomTip.voidexWelcome.1"),
            i18next.t("tutorial:smitomTip.voidexWelcome.2"),
          ],
          offerReplay: true,
          onComplete: () => {
            flags["voidex_welcome"] = true;
            scene.gameData.saveSystem();
          }
        };
        scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
      });
    }
  }

  private getRivalTypeForQuest(questId: QuestUnlockables): number | null {
    for (const [rivalKey, quests] of Object.entries(rivalQuestMap)) {
      if (quests && quests.includes(questId)) {
        const v = Number(rivalKey);
        return Number.isFinite(v) ? v : null;
      }
    }
    for (const [rivalKey, quests] of Object.entries(rivalStageTwoQuestMap)) {
      if (quests && quests.includes(questId)) {
        const v = Number(rivalKey);
        return Number.isFinite(v) ? v : null;
      }
    }
    return null;
  }

  private buildUnlockHintMap(): void {
    this.unlockHintMap.clear();
    const gameData = this.scene.gameData;
    if (!gameData) {
      return;
    }
    const questValues = Object.values(QuestUnlockables).filter(v => typeof v === "number") as QuestUnlockables[];
    for (const questId of questValues) {
      let questUnlockData: any;
      try {
        questUnlockData = gameData.getQuestUnlockDataFromModifierTypes(questId);
      } catch {
        continue;
      }
      const rewardType = questUnlockData?.rewardType as RewardType | undefined;
      if (rewardType !== RewardType.GLITCH_FORM_A &&
          rewardType !== RewardType.GLITCH_FORM_B &&
          rewardType !== RewardType.GLITCH_FORM_C &&
          rewardType !== RewardType.GLITCH_FORM_D &&
          rewardType !== RewardType.GLITCH_FORM_E) {
        continue;
      }
      const rewardId: any = questUnlockData?.rewardId;
      const speciesIds: Species[] = [];
      if (Array.isArray(rewardId)) {
        for (const rid of rewardId) {
          if (typeof rid === "number" && getPokemonSpecies(rid as Species)) {
            speciesIds.push(rid as Species);
          }
        }
      } else if (typeof rewardId === "number" && getPokemonSpecies(rewardId as Species)) {
        speciesIds.push(rewardId as Species);
      }
      if (!speciesIds.length) {
        continue;
      }
      const rivalType = this.getRivalTypeForQuest(questId);
      for (const speciesId of speciesIds) {
        const key = `${rewardType}:${speciesId}`;
        if (!this.unlockHintMap.has(key)) {
          this.unlockHintMap.set(key, { questId, rivalType });
        }
      }
    }
  }

  private getSmittyItemFrame(item: FormChangeItem): string | null {
    const raw = FormChangeItem[item];
    if (!raw) {
      return null;
    }
    return raw.toLowerCase().replace(/_([a-z])/g, (_m, letter) => letter.toUpperCase());
  }

  private getGlitchAndSmittyTotals(): { glitchTotal: number; glitchUnlocked: number; smittyTotal: number; smittyUnlocked: number } {
    const gameData = this.scene.gameData;
    if (!gameData) {
      return { glitchTotal: 0, glitchUnlocked: 0, smittyTotal: 0, smittyUnlocked: 0 };
    }

    let glitchTotal = 0;
    let glitchUnlocked = 0;
    for (const k of this.unlockHintMap.keys()) {
      const parts = k.split(":");
      if (parts.length !== 2) {
        continue;
      }
      const rewardType = parseInt(parts[0], 10);
      const speciesId = parseInt(parts[1], 10);
      if (!Number.isFinite(rewardType) || !Number.isFinite(speciesId)) {
        continue;
      }
      glitchTotal++;
      if (gameData.canUseGlitchOrSmittyForm(speciesId as Species, rewardType as RewardType)) {
        glitchUnlocked++;
      }
    }

    const smittyNames = new Set<string>();
    for (const forms of pokemonSmittyForms.values()) {
      for (const f of forms) {
        const name = (f as any)?.formName as string | undefined;
        if (name) {
          smittyNames.add(name);
        }
      }
    }
    for (const uf of universalSmittyForms) {
      if (uf?.formName) {
        smittyNames.add(uf.formName);
      }
    }

    let smittyTotal = 0;
    let smittyUnlocked = 0;
    for (const name of smittyNames) {
      smittyTotal++;
      if (gameData.isUniSmittyFormUnlocked(name)) {
        smittyUnlocked++;
      }
    }

    return { glitchTotal, glitchUnlocked, smittyTotal, smittyUnlocked };
  }

  private createCompletionWidget(titleContainer: Phaser.GameObjects.Container, width: number): void {
    const container = this.scene.add.container(width - 10, 0);
    const iconType = this.scene.inputController?.getLastSourceType() || "keyboard";
    const iconFrame = this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_STATS") || "C.png";
    const keySprite = this.scene.add.sprite(0, 0, iconType);
    keySprite.setFrame(iconFrame);
    keySprite.setScale(0.5);
    keySprite.setOrigin(0, 0.5);

    const labelText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "35px", align: "left" });
    labelText.setOrigin(0, 0.5);
    labelText.setTint(0xffd700);
    labelText.setAlpha(0.9);
    labelText.setInteractive({ useHandCursor: true });
    labelText.on("pointerup", () => {
      this.cycleCompletionCategory();
      this.getUi().playSelect();
    });

    const categoryText = addTextObject(this.scene, 0, 0, "", TextStyle.WINDOW, { fontSize: "38px", align: "center", stroke: "#000000", strokeThickness: 3 });
    categoryText.setOrigin(0.5, 0.5);
    categoryText.setAlpha(0.85);
    categoryText.setShadow(3, 3, "#000000", 6, true, true);

    const barWidth = 10;
    const barHeight = 10;
    const barBorder = this.scene.add.rectangle(0, 0, barWidth + 2, barHeight + 2, 0xffffff, 0.25);
    barBorder.setOrigin(0, 0.5);
    const barBg = this.scene.add.rectangle(0, 0, barWidth, barHeight, 0x000000, 0.35);
    barBg.setOrigin(0, 0.5);
    const barFill = this.scene.add.rectangle(0, 0, 0, barHeight, 0xffd700, 0.9);
    barFill.setOrigin(0, 0.5);

    keySprite.setInteractive({ useHandCursor: true });
    keySprite.on("pointerup", () => {
      this.cycleCompletionCategory();
      this.getUi().playSelect();
    });

    container.add([barBorder, barBg, barFill, categoryText, labelText, keySprite]);
    titleContainer.add(container);
    this.completionContainer = container;
    this.completionLabelText = labelText;
    this.completionKeySprite = keySprite;
    this.completionCategoryText = categoryText;
    this.completionBarBorder = barBorder;
    this.completionBarBg = barBg;
    this.completionBarFill = barFill;
  }

  private cycleCompletionCategory(): void {
    if (this.completionAvailableCategories.length === 0) {
      this.updateCompletionWidget();
      return;
    }
    this.completionCategoryIndex = (this.completionCategoryIndex + 1) % this.completionAvailableCategories.length;
    this.applyViewFromCompletionCategory(true);
    this.updateCompletionWidget();
  }

  private applyViewFromCompletionCategory(resetCursor: boolean): void {
    const active = this.completionAvailableCategories[this.completionCategoryIndex] || "caught";
    let nextMode: ViewMode = "pokemonAll";
    if (active === "glitch") nextMode = "pokemonGlitch";
    else if (active === "smitty") nextMode = "pokemonSmitty";
    else if (active === "rivals") nextMode = "rivals";
    else if (active === "smittyFoes") nextMode = "smittyFoes";
    else if (active === "fusions") nextMode = "fusions";
    else if (active === "shiniesV1") nextMode = "shiniesV1";
    else if (active === "shiniesV2") nextMode = "shiniesV2";
    else if (active === "shiniesV3") nextMode = "shiniesV3";

    const prevMode = this.viewMode;
    this.viewMode = nextMode;
    const isShinies = this.viewMode === "shiniesV1" || this.viewMode === "shiniesV2" || this.viewMode === "shiniesV3";
    const showSort = this.viewMode !== "rivals" && this.viewMode !== "smittyFoes" && !isShinies;
    this.sortText?.setVisible(showSort);
    this.sortLeftArrow?.setVisible(showSort);
    this.sortRightArrow?.setVisible(showSort);
    this.sortDirKeySprite?.setVisible(showSort);
    if (this.sortLeftArrow) {
      if (showSort) this.sortLeftArrow.setInteractive({ useHandCursor: true });
      else this.sortLeftArrow.disableInteractive();
    }
    if (this.sortRightArrow) {
      if (showSort) this.sortRightArrow.setInteractive({ useHandCursor: true });
      else this.sortRightArrow.disableInteractive();
    }
    if (this.sortDirKeySprite) {
      if (showSort) this.sortDirKeySprite.setInteractive({ useHandCursor: true });
      else this.sortDirKeySprite.disableInteractive();
    }

    if (prevMode !== this.viewMode) {
      this.rivalOfferIndex = 0;
      this.smittyFoesSelectedIndex = 0;
      this.shiniesSelectedIndex = 0;
      this.searchQuery = "";
      if (this.inputEl && typeof this.inputEl.setText === "function") {
        this.inputEl.setText("");
      }
    }

    const showList = this.viewMode !== "smittyFoes" && !isShinies;
    this.list?.setVisible(showList);
    this.smittyFoesGrid?.setVisible(this.viewMode === "smittyFoes");
    this.shiniesGrid?.setVisible(isShinies);

    this.applySearchVisibilityAndLayout();
    this.applyFilterAndSort(resetCursor);
    if (showSort) {
      this.updateSortText();
    }
    this.updateSubtitleText(showSort);
    if (this.viewMode === "smittyFoes") {
      this.buildOrRefreshSmittyFoesGrid();
    }
    this.refreshViews();
  }

  private updateSubtitleText(showSort: boolean): void {
    if (!this.subtitleText) {
      return;
    }
    const width = this.viewWidth;
    const key =
      this.viewMode === "rivals" ? "pokedex:prelistTaglineRivals" :
      this.viewMode === "smittyFoes" ? "pokedex:prelistTaglineSmittyFoes" :
      this.viewMode === "fusions" ? "pokedex:prelistTaglineFusions" :
      this.viewMode === "shiniesV1" ? "pokedex:prelistTaglineShiniesV1" :
      this.viewMode === "shiniesV2" ? "pokedex:prelistTaglineShiniesV2" :
      this.viewMode === "shiniesV3" ? "pokedex:prelistTaglineShiniesV3" :
      "pokedex:prelistTagline";
    const full = i18next.t(key);
    this.subtitleText.setText(full);
    const rightLimit = showSort ? (this.sortText?.x ?? (width - 10)) : (width - 10);
    const maxWidth = Math.max(0, rightLimit - this.subtitleText.x - 10);
    let truncated = full;
    while (this.subtitleText.displayWidth > maxWidth && truncated.length > 1) {
      truncated = truncated.slice(0, -1);
      this.subtitleText.setText(truncated + "…");
    }
  }

  private applySearchVisibilityAndLayout(): void {
    const showSearch = this.viewMode !== "rivals" && this.viewMode !== "smittyFoes";
    this.setSearchVisible(showSearch);
    this.setListY(showSearch ? 34 : 22);
  }

  private setSearchVisible(visible: boolean): void {
    this.searchContainer?.setVisible(visible);
    const el: any = this.inputEl as any;
    const node: any = el?.node;
    if (node?.style) {
      node.style.display = visible ? "" : "none";
    }
    if (!visible && typeof el?.setBlur === "function") {
      el.setBlur();
    }
  }

  private setListY(listY: number): void {
    this.list?.setY(listY);
    this.smittyFoesGrid?.setY(listY);
    this.shiniesGrid?.setY(listY);
    const height = this.scene.game.canvas.height / 6;
    const availableHeight = Math.max(0, height - listY - 2);
    const nextVisibleRows = Math.max(1, Math.floor(availableHeight / this.rowHeight));
    if (nextVisibleRows !== this.visibleRows) {
      this.visibleRows = nextVisibleRows;
      this.buildViews(this.viewWidth);
    }
  }

  private updateCompletionWidget(): void {
    if (!this.scene.gameData ||
        !this.completionContainer ||
        !this.completionLabelText ||
        !this.completionKeySprite ||
        !this.completionCategoryText ||
        !this.completionBarBorder ||
        !this.completionBarBg ||
        !this.completionBarFill) {
      return;
    }

    const gameData = this.scene.gameData;
    const { glitchTotal, glitchUnlocked, smittyTotal, smittyUnlocked } = this.getGlitchAndSmittyTotals();
    const caughtUnlocked = gameData.getSpeciesCount(d => !!d.caughtAttr);
    const caughtTotal = Object.keys(gameData.dexData).length;
    const rivalsTotal = getAllRivalTrainerTypes().length;
    const rivalsDefeated = gameData.defeatedRivals.length;
    const smittyFoeFrames = this.getSmittyFoeFrameNames();
    const smittyFoesTotal = smittyFoeFrames.length;
    const defeatedSmittyFoes = new Set<string>(gameData.defeatedSmittyFoes ?? []);
    let smittyFoesDefeated = 0;
    if (smittyFoesTotal > 0 && defeatedSmittyFoes.size > 0) {
      for (const f of smittyFoeFrames) {
        if (defeatedSmittyFoes.has(f)) {
          smittyFoesDefeated++;
        }
      }
    }
    const completeUnlocked = caughtUnlocked + glitchUnlocked + smittyUnlocked + rivalsDefeated;
    const completeTotal = caughtTotal + glitchTotal + smittyTotal + rivalsTotal;

    let fusionsUnlocked = 0;
    if (gameData.starterData) {
      for (const k of Object.keys(gameData.starterData)) {
        const entry: any = (gameData.starterData as any)[k];
        const arr = entry?.obtainedFusions as any;
        if (Array.isArray(arr)) {
          fusionsUnlocked += arr.length;
        }
      }
    }
    const fusionsTotal = caughtTotal > 1 ? caughtTotal * (caughtTotal - 1) : 0;

    let shiniesV1Unlocked = 0;
    let shiniesV2Unlocked = 0;
    let shiniesV3Unlocked = 0;
    for (const k of Object.keys(gameData.dexData)) {
      const entry: any = (gameData.dexData as any)[k];
      const attr: bigint = entry?.caughtAttr ?? 0n;
      const hasShiny = !!(attr & DexAttr.SHINY);
      if (!hasShiny) {
        continue;
      }
      if (attr & DexAttr.DEFAULT_VARIANT) shiniesV1Unlocked++;
      if (attr & DexAttr.VARIANT_2) shiniesV2Unlocked++;
      if (attr & DexAttr.VARIANT_3) shiniesV3Unlocked++;
    }

    const available: CompletionCategory[] = [];
    available.push("caught");
    if (glitchUnlocked > 0) {
      available.push("glitch");
    }
    if (smittyUnlocked > 0) {
      available.push("smitty");
    }
    if (smittyFoesTotal > 0) {
      available.push("smittyFoes");
    }
    if (fusionsUnlocked > 0) {
      available.push("fusions");
    }
    available.push("shiniesV1");
    available.push("shiniesV2");
    available.push("shiniesV3");
    if (glitchUnlocked > 0 && smittyUnlocked > 0) {
      available.push("complete");
    }
    available.push("rivals");
    const showCycle = available.length > 1;
    this.completionAvailableCategories = available;
    if (this.completionCategoryIndex < 0 || this.completionCategoryIndex >= available.length) {
      this.completionCategoryIndex = 0;
    }
    const active = available[this.completionCategoryIndex] || "caught";

    const iconType = this.scene.inputController?.getLastSourceType() || "keyboard";
    const iconFrame = this.scene.inputController?.getIconForLatestInputRecorded("BUTTON_STATS") || "C.png";
    this.completionKeySprite.setTexture(iconType);
    this.completionKeySprite.setFrame(iconFrame);
    this.completionKeySprite.setScale(0.5);
    this.completionKeySprite.setOrigin(0, 0.5);
    this.completionKeySprite.setVisible(showCycle);
    if (!showCycle) {
      this.completionKeySprite.disableInteractive();
    } else {
      this.completionKeySprite.setInteractive({ useHandCursor: true });
    }

    const isCollectedLabel = !(active === "rivals" || active === "smittyFoes");
    const label = !isCollectedLabel
      ? i18next.t("pokedex:completionLabelDefeated")
      : i18next.t("pokedex:completionLabelCollected");
    this.completionLabelText.setText(label);
    this.completionLabelText.setTint(0xffd700);
    this.completionLabelText.setOrigin(0, 0.5);

    let categoryLabel = "";
    let unlocked = 0;
    let total = 0;
    if (active === "caught") {
      categoryLabel = i18next.t("pokedex:completionCategoryCaught");
      unlocked = caughtUnlocked;
      total = caughtTotal;
    } else if (active === "glitch") {
      categoryLabel = i18next.t("pokedex:sortGlitch");
      unlocked = glitchUnlocked;
      total = glitchTotal;
    } else if (active === "smitty") {
      categoryLabel = i18next.t("pokedex:sortSmitty");
      unlocked = smittyUnlocked;
      total = smittyTotal;
    } else if (active === "smittyFoes") {
      categoryLabel = i18next.t("pokedex:completionCategorySmittyFoes");
      unlocked = smittyFoesDefeated;
      total = smittyFoesTotal;
    } else if (active === "fusions") {
      categoryLabel = i18next.t("pokedex:completionCategoryFusions");
      unlocked = fusionsUnlocked;
      total = fusionsTotal;
    } else if (active === "shiniesV1") {
      categoryLabel = i18next.t("pokedex:completionCategoryShiniesV1");
      unlocked = shiniesV1Unlocked;
      total = caughtTotal;
    } else if (active === "shiniesV2") {
      categoryLabel = i18next.t("pokedex:completionCategoryShiniesV2");
      unlocked = shiniesV2Unlocked;
      total = caughtTotal;
    } else if (active === "shiniesV3") {
      categoryLabel = i18next.t("pokedex:completionCategoryShiniesV3");
      unlocked = shiniesV3Unlocked;
      total = caughtTotal;
    } else if (active === "complete") {
      categoryLabel = i18next.t("pokedex:completionCategoryComplete");
      unlocked = completeUnlocked;
      total = completeTotal;
    } else {
      categoryLabel = i18next.t("pokedex:completionCategoryRivals");
      unlocked = rivalsDefeated;
      total = rivalsTotal;
    }

    const pctRaw = total > 0 ? (unlocked / total) * 100 : 0;
    const decimals =
      pctRaw === 0 ? 0 :
      pctRaw < 0.1 ? 3 :
      pctRaw < 1 ? 2 :
      1;
    const pctText = decimals === 0
      ? String(Math.round(pctRaw))
      : String(Number(pctRaw.toFixed(decimals)));
    const categoryLine = `${categoryLabel}: ${pctText}%`;
    this.completionCategoryText.setText(categoryLine);
    this.completionCategoryText.setOrigin(0.5, 0.5);

    const width = this.viewWidth;
    const rightEdgeX = width - 10;
    const rowY = this.sortRightArrow?.y ?? ((this.sortText?.y ?? 0) + 3);
    this.completionContainer.setPosition(rightEdgeX, rowY);

    const sortVisible = !!(this.sortRightArrow?.visible || this.sortText?.visible);
    const sortRightEdge =
      this.sortRightArrow
        ? (this.sortRightArrow.x + (this.sortRightArrow.displayWidth / 2))
        : (this.sortText ? (this.sortText.x + this.sortText.displayWidth) : 0);
    const subtitleRightEdge = this.subtitleText ? (this.subtitleText.x + this.subtitleText.displayWidth) : 0;
    const anchorRightEdge = sortVisible ? sortRightEdge : subtitleRightEdge;
    const leftEdgeX = Math.min(rightEdgeX - 10, anchorRightEdge + 10);
    const labelX = leftEdgeX - rightEdgeX;

    this.completionLabelText.setPosition(labelX, 0);
    const labelWidth = this.completionLabelText.displayWidth;

    if (showCycle) {
      this.completionKeySprite.setPosition(labelX + labelWidth + 2, 0);
    } else {
      this.completionKeySprite.setPosition(0, 0);
    }

    const barLeftX = showCycle
      ? (this.completionKeySprite.x + this.completionKeySprite.displayWidth + 8)
      : (labelX + labelWidth + 8);
    const barWidth = Math.max(0, 0 - barLeftX);
    const barHeight = 10;

    this.completionBarBorder.setOrigin(0, 0.5);
    this.completionBarBg.setOrigin(0, 0.5);
    this.completionBarFill.setOrigin(0, 0.5);

    this.completionBarBorder.setPosition(barLeftX - 1, 0);
    this.completionBarBorder.setSize(barWidth + 2, barHeight + 2);
    this.completionBarBg.setPosition(barLeftX, 0);
    this.completionBarBg.setSize(barWidth, barHeight);
    const unclamped = (barWidth * pctRaw) / 100;
    const fillWidth = pctRaw > 0 ? Math.max(1, Math.min(barWidth, unclamped)) : 0;
    this.completionBarFill.setPosition(barLeftX, 0);
    this.completionBarFill.setSize(fillWidth, barHeight);

    this.completionCategoryText.setPosition(barLeftX + (barWidth / 2), 0);
  }

  override clear(): void {
    if (this._wheelHandler) {
      this.scene.input.off("wheel", this._wheelHandler);
      this._wheelHandler = null;
    }
    this.restrictedSpeciesIds = null;
    this.focusSpeciesId = null;
    this.focusFormIndex = null;
    this.focusFusionSpeciesId = null;
    this.focusFusionPrimaryFormIndex = null;
    this.focusFusionFormIndex = null;
    this.initialViewMode = null;
    this.searchQuery = "";
    this.destroySearchInput();
    this.root.removeAll(true);
    this.root.setVisible(false);
    super.clear();
  }

  override processInput(button: Button): boolean {
    const ui = this.getUi();
    let success = false;

    const isShiniesView = this.viewMode === "shiniesV1" || this.viewMode === "shiniesV2" || this.viewMode === "shiniesV3";
    const inputOpen = this.inputEl?.isFocused === true;
    if (inputOpen) {
      if (button === Button.ACTION) {
        if (typeof this.inputEl.setBlur === "function") {
          this.inputEl.setBlur();
        }
        ui.playSelect();
        return true;
      }
      if (button !== Button.CANCEL && button !== Button.MENU && button !== Button.VOIDEX && button !== Button.UP && button !== Button.DOWN && button !== Button.LEFT && button !== Button.RIGHT) {
        return false;
      }
    }

    if (this.viewMode === "smittyFoes" && button === Button.ACTION) {
      return true;
    }

    switch (button) {
    case Button.CANCEL:
    case Button.MENU:
    case Button.VOIDEX:
      this.clear();
      this.scene.ui.revertMode();
      success = true;
      break;
    case Button.UP:
      if (this.viewMode === "smittyFoes") {
        const cols = Math.max(1, this.smittyFoesGridCols | 0);
        const next = this.smittyFoesSelectedIndex - cols;
        if (next >= 0) {
          this.smittyFoesSelectedIndex = next;
          this.buildOrRefreshSmittyFoesGrid();
          success = true;
        }
        break;
      }
      if (isShiniesView) {
        const cols = Math.max(1, this.shiniesGridCols | 0);
        const next = this.shiniesSelectedIndex - cols;
        if (next >= 0) {
          this.shiniesSelectedIndex = next;
          this.buildOrRefreshShiniesGrid();
          success = true;
        }
        break;
      }
      if (this.cursorIndex > 0) {
        this.cursorIndex--;
        this.ensureCursorVisible();
        if (this.viewMode === "rivals") {
          const r = this.rows[this.cursorIndex];
          if (r && r.kind === "rival") {
            const offers = this.getRivalCombinedOffers(r);
            const visibleCount = Math.min(offers.length, 8);
            if (visibleCount) {
              this.rivalOfferIndex = Math.min(this.rivalOfferIndex, visibleCount - 1);
            } else {
              this.rivalOfferIndex = 0;
            }
          }
        }
        this.refreshViews();
        success = true;
      }
      break;
    case Button.DOWN:
      if (this.viewMode === "smittyFoes") {
        const cols = Math.max(1, this.smittyFoesGridCols | 0);
        const max = this.smittyFoesGridFrames.length - 1;
        if (max < 0) {
          break;
        }
        const row = Math.floor(this.smittyFoesSelectedIndex / cols);
        const col = this.smittyFoesSelectedIndex % cols;
        let next = (row + 1) * cols + col;
        if (next > max) {
          const lastRowStart = Math.floor(max / cols) * cols;
          if (this.smittyFoesSelectedIndex < lastRowStart) {
            next = max;
          } else {
            next = this.smittyFoesSelectedIndex;
          }
        }
        if (next !== this.smittyFoesSelectedIndex) {
          this.smittyFoesSelectedIndex = next;
          this.buildOrRefreshSmittyFoesGrid();
          success = true;
        }
        break;
      }
      if (isShiniesView) {
        const cols = Math.max(1, this.shiniesGridCols | 0);
        const max = this.shiniesGridEntries.length - 1;
        if (max < 0) {
          break;
        }
        const row = Math.floor(this.shiniesSelectedIndex / cols);
        const col = this.shiniesSelectedIndex % cols;
        let next = (row + 1) * cols + col;
        if (next > max) {
          const lastRowStart = Math.floor(max / cols) * cols;
          if (this.shiniesSelectedIndex < lastRowStart) {
            next = max;
          } else {
            next = this.shiniesSelectedIndex;
          }
        }
        if (next !== this.shiniesSelectedIndex) {
          this.shiniesSelectedIndex = next;
          this.buildOrRefreshShiniesGrid();
          success = true;
        }
        break;
      }
      if (this.cursorIndex < this.rows.length - 1) {
        this.cursorIndex++;
        this.ensureCursorVisible();
        if (this.viewMode === "rivals") {
          const r = this.rows[this.cursorIndex];
          if (r && r.kind === "rival") {
            const offers = this.getRivalCombinedOffers(r);
            const visibleCount = Math.min(offers.length, 8);
            if (visibleCount) {
              this.rivalOfferIndex = Math.min(this.rivalOfferIndex, visibleCount - 1);
            } else {
              this.rivalOfferIndex = 0;
            }
          }
        }
        this.refreshViews();
        success = true;
      }
      break;
    case Button.LEFT:
      if (this.viewMode === "rivals") {
        const r = this.rows[this.cursorIndex];
        if (r && r.kind === "rival") {
          const offers = this.getRivalCombinedOffers(r);
          const visibleCount = Math.min(offers.length, 8);
          if (visibleCount) {
            const next = Math.max(0, Math.min(visibleCount - 1, this.rivalOfferIndex - 1));
            if (next !== this.rivalOfferIndex) {
              this.rivalOfferIndex = next;
              this.refreshViews();
              success = true;
            }
          }
        }
      } else if (this.viewMode === "smittyFoes") {
        if (this.smittyFoesSelectedIndex > 0) {
          this.smittyFoesSelectedIndex--;
          this.buildOrRefreshSmittyFoesGrid();
          success = true;
        }
      } else if (isShiniesView) {
        if (this.shiniesSelectedIndex > 0) {
          this.shiniesSelectedIndex--;
          this.buildOrRefreshShiniesGrid();
          success = true;
        }
      } else {
      success = this.cycleSortKey(-1);
      }
      break;
    case Button.RIGHT:
      if (this.viewMode === "rivals") {
        const r = this.rows[this.cursorIndex];
        if (r && r.kind === "rival") {
          const offers = this.getRivalCombinedOffers(r);
          const visibleCount = Math.min(offers.length, 8);
          if (visibleCount) {
            const next = Math.max(0, Math.min(visibleCount - 1, this.rivalOfferIndex + 1));
            if (next !== this.rivalOfferIndex) {
              this.rivalOfferIndex = next;
              this.refreshViews();
              success = true;
            }
          }
        }
      } else if (this.viewMode === "smittyFoes") {
        const max = this.smittyFoesGridFrames.length - 1;
        if (this.smittyFoesSelectedIndex < max) {
          this.smittyFoesSelectedIndex++;
          this.buildOrRefreshSmittyFoesGrid();
          success = true;
        }
      } else if (isShiniesView) {
        const max = this.shiniesGridEntries.length - 1;
        if (this.shiniesSelectedIndex < max) {
          this.shiniesSelectedIndex++;
          this.buildOrRefreshShiniesGrid();
          success = true;
        }
      } else {
      success = this.cycleSortKey(1);
      }
      break;
    case Button.CYCLE_ABILITY:
      if (this.viewMode !== "rivals" && this.viewMode !== "smittyFoes" && !isShiniesView) {
      this.sortDir = this.sortDir === "desc" ? "asc" : "desc";
      this.applyFilterAndSort(false);
      this.updateSortText();
      this.refreshViews();
        success = true;
      }
      break;
    case Button.STATS:
      this.cycleCompletionCategory();
      success = true;
      break;
    case Button.ACTION:
      success = isShiniesView ? this.openShinySelected() : this.openSelected();
      if (!success) {
        ui.playError();
        return true;
      }
      break;
    }

    if (success) {
      ui.playSelect();
    }
    return success;
  }

  private cycleSortKey(delta: number): boolean {
    const idx = this.sortKeys.indexOf(this.sortKey);
    if (idx < 0) {
      return false;
    }
    const next = (idx + delta + this.sortKeys.length) % this.sortKeys.length;
    const prevKey = this.sortKey;
    const nextKey = this.sortKeys[next];
    const isCategory = (k: SortKey) => k === "caught";
    const prevIsCategory = isCategory(prevKey);
    const nextIsCategory = isCategory(nextKey);
    const prevIsNonStat = prevKey === "id" || prevKey === "cost";
    const nextIsNonStat = nextKey === "id" || nextKey === "cost";
    if (nextIsCategory) {
      if (!prevIsCategory) {
        this.lastNonCategorySortDir = this.sortDir;
      }
      this.sortDir = "desc";
    } else if (prevIsCategory && !nextIsCategory) {
      this.sortDir = this.lastNonCategorySortDir;
    } else if (!prevIsCategory && !nextIsCategory && prevIsNonStat !== nextIsNonStat) {
      this.sortDir = this.sortDir === "desc" ? "asc" : "desc";
    }
    this.sortKey = nextKey;
    this.applyFilterAndSort(false);
    this.updateSortText();
    this.ensureCursorVisible(true);
    this.refreshViews();
    return true;
  }

  private updateSortText(): void {
    const keyLabel = this.getSortKeyLabel(this.sortKey);
    const dirLabel = this.sortDir === "desc" ? "↓" : "↑";
    this.sortText?.setText(`${keyLabel} ${dirLabel}`);
    if (this.sortText && this.sortLeftArrow) {
      this.sortLeftArrow.setX(this.sortText.x - 10);
      this.sortLeftArrow.setY(this.sortText.y + 3);
    }
    const baseRightX = this.sortText ? this.sortText.x + this.sortText.displayWidth : 0;
    if (this.sortText && this.sortDirKeySprite) {
      this.sortDirKeySprite.setX(baseRightX + 7);
      this.sortDirKeySprite.setY(this.sortText.y + 3);
    }
    if (this.sortText && this.sortRightArrow) {
      const iconOffset = this.sortDirKeySprite ? this.sortDirKeySprite.displayWidth + 4 : 0;
      this.sortRightArrow.setX(baseRightX + 10 + iconOffset);
      this.sortRightArrow.setY(this.sortText.y + 3);
    }
  }

  private getSortKeyLabel(key: SortKey): string {
    switch (key) {
    case "id": return i18next.t("pokedex:sortNo");
    case "caught": return i18next.t("pokedex:completionCategoryCaught");
    case "bst": return i18next.t("pokedex:sortBST");
    case "hp": return i18next.t("pokedex:sortHP");
    case "atk": return i18next.t("pokedex:sortAtk");
    case "def": return i18next.t("pokedex:sortDef");
    case "spa": return i18next.t("pokedex:sortSpA");
    case "spd": return i18next.t("pokedex:sortSpD");
    case "spe": return i18next.t("pokedex:sortSpe");
    case "cost": return i18next.t("filterBar:sortByCost", { defaultValue: "Cost" });
    }
    return i18next.t("pokedex:sortNo");
  }

  private ensureCursorVisible(reset = false): void {
    if (reset) {
      this.cursorIndex = Math.min(this.cursorIndex, Math.max(0, this.rows.length - 1));
    }
    if (this.cursorIndex < this.scrollOffset) {
      this.scrollOffset = this.cursorIndex;
    } else if (this.cursorIndex >= this.scrollOffset + this.visibleRows) {
      this.scrollOffset = this.cursorIndex - this.visibleRows + 1;
    }
    this.scrollOffset = Math.max(0, Math.min(this.scrollOffset, Math.max(0, this.rows.length - this.visibleRows)));
  }

  private getRivalCombinedOffers(row: Extract<VoidexRow, { kind: "rival" }>): RivalOffer[] {
    const stage2Unlocked = !!this.scene.gameData && !!this.scene.gameData.unlocks?.[Unlockables.NIGHTMARE_MODE];
    const offers = ([] as RivalOffer[]).concat(row.offersStage1, stage2Unlocked ? row.offersStage2 : []);
    offers.sort((a, b) => {
      const au = a.unlocked ? 1 : 0;
      const bu = b.unlocked ? 1 : 0;
      if (au !== bu) return bu - au;
      const av = a.displaySpeciesId as number;
      const bv = b.displaySpeciesId as number;
      if (av !== bv) return av - bv;
      return (a.rewardSpeciesId as number) - (b.rewardSpeciesId as number);
    });
    return offers;
  }

  private openSelected(): boolean {
    const row = this.rows[this.cursorIndex];
    if (!row) {
      return false;
    }
    const onClose = () => {
      this.resumeInteractivity();
      this.applySearchVisibilityAndLayout();
    };
    this.suspendInteractivity();
    if (row.kind === "rival") {
      const offers = this.getRivalCombinedOffers(row).slice(0, 8);
      const offer = offers[this.rivalOfferIndex];
      if (!offer) {
        return false;
      }
      if (!offer.unlocked) {
        return false;
      }
      this.setSearchVisible(false);
      this.scene.ui.setOverlayMode(Mode.POKEDEX, offer.displaySpeciesId, offer.displayFormIndex, { onClose });
      return true;
    }
    if (row.kind === "smittyFoesRow") {
      return false;
    }
    if (row.kind === "fusion") {
      const fusionNavRows = this.rows.filter((r): r is Extract<VoidexRow, { kind: "fusion" }> => r.kind === "fusion");
      const nav = fusionNavRows.map(r => ({
        kind: "fusion",
        speciesId: r.primarySpeciesId,
        formIndex: 0,
        primarySpeciesId: r.primarySpeciesId,
        fusionSpeciesId: r.fusionSpeciesId,
        primaryFormIndex: r.primaryFormIndex,
        fusionFormIndex: r.fusionFormIndex
      }));
      const navIndex = Math.max(0, fusionNavRows.indexOf(row));
      this.setSearchVisible(false);
      this.scene.ui.setOverlayMode(Mode.POKEDEX, row.primarySpeciesId, 0, { nav, navIndex, onClose });
      return true;
    }
    const navRows = this.rows.filter((r): r is Extract<VoidexRow, { kind: "speciesForm" | "universalSmitty" }> => {
      if (r.kind === "speciesForm") {
        return !this.isLockedForm(r.species, r.formIndex) || this.isCurrentEnemyForm(r);
      }
      if (r.kind === "universalSmitty") {
        return !!this.scene.gameData && (this.scene.gameData.isUniSmittyFormUnlocked(r.formName) || this.isCurrentEnemyUniversalSmittyFormName(r.formName));
      }
      return false;
    });
    const nav = navRows.map(r => {
      if (r.kind === "universalSmitty") {
        return {
          kind: "universalSmitty",
          formName: r.formName,
          bucket: this.isCurrentEnemyUniversalSmittyFormName(r.formName) ? "enemy" : "other"
        };
      }
      return {
        speciesId: r.species.speciesId,
        formIndex: r.formIndex,
        bucket: r.target.bucket,
        kind: r.target.kind,
        partyIndex: r.target.partyIndex
      };
    });
    const navIndex = (row.kind === "speciesForm" || row.kind === "universalSmitty")
      ? Math.max(0, navRows.indexOf(row as any))
      : 0;
    const fallbackSpeciesId = (navRows.find((r): r is Extract<VoidexRow, { kind: "speciesForm" }> => r.kind === "speciesForm")?.species.speciesId) ?? Species.BULBASAUR;

    if (row.kind === "universalSmitty") {
      if (this.scene.gameData && !this.scene.gameData.isUniSmittyFormUnlocked(row.formName) && !this.isCurrentEnemyUniversalSmittyFormName(row.formName)) {
        return false;
      }
      this.setSearchVisible(false);
      this.scene.ui.setOverlayMode(Mode.POKEDEX, fallbackSpeciesId, 0, { nav, navIndex, onClose });
      return true;
    }

    if (row.kind !== "speciesForm") {
      return false;
    }
    if (this.isLockedForm(row.species, row.formIndex) && !this.isCurrentEnemyForm(row)) {
      return false;
    }
    this.setSearchVisible(false);
    this.scene.ui.setOverlayMode(Mode.POKEDEX, row.species.speciesId, row.formIndex, { nav, navIndex, onClose });
    return true;
  }

  private openShinySelected(): boolean {
    const entry = this.shiniesGridEntries[this.shiniesSelectedIndex];
    if (!entry) {
      return false;
    }
    if (!entry.caught) {
      return false;
    }
    const onClose = () => {
      this.resumeInteractivity();
      this.applySearchVisibilityAndLayout();
    };
    this.suspendInteractivity();
    const variant = this.viewMode === "shiniesV2" ? 1 : (this.viewMode === "shiniesV3" ? 2 : 0);
    const caughtEntries = this.shiniesGridEntries.filter(e => e.caught);
    const nav = caughtEntries.map(e => ({
      kind: "shiny",
      speciesId: e.speciesId,
      formIndex: e.formIndex,
      shiny: true,
      variant,
      caught: e.caught
    }));
    const navIndex = Math.max(0, caughtEntries.indexOf(entry));
    this.setSearchVisible(false);
    this.scene.ui.setOverlayMode(Mode.POKEDEX, entry.speciesId, entry.formIndex, { nav, navIndex, shiny: true, variant, onClose });
    return true;
  }

  private suspendInteractivity(): void {
    for (const v of this.views) {
      if (v.hitZone) v.hitZone.disableInteractive();
    }
    if (this._wheelHandler) {
      this.scene.input.off("wheel", this._wheelHandler);
    }
    if (this.sortLeftArrow) this.sortLeftArrow.disableInteractive();
    if (this.sortRightArrow) this.sortRightArrow.disableInteractive();
    if (this.sortDirKeySprite) this.sortDirKeySprite.disableInteractive();
    if (this.completionKeySprite) this.completionKeySprite.disableInteractive();
    if (this.root) this.root.disableInteractive();
  }

  private resumeInteractivity(): void {
    for (const v of this.views) {
      if (v.hitZone) v.hitZone.setInteractive({ useHandCursor: true });
    }
    if (this._wheelHandler) {
      this.scene.input.on("wheel", this._wheelHandler);
    }
    if (this.sortLeftArrow) this.sortLeftArrow.setInteractive({ useHandCursor: true });
    if (this.sortRightArrow) this.sortRightArrow.setInteractive({ useHandCursor: true });
    if (this.sortDirKeySprite) this.sortDirKeySprite.setInteractive({ useHandCursor: true });
    if (this.completionKeySprite) this.completionKeySprite.setInteractive({ useHandCursor: true });
    if (this.root) this.root.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.viewWidth, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);
  }

  private isCurrentEnemyForm(row: Extract<VoidexRow, { kind: "speciesForm" }>): boolean {
    if (!this.scene.currentBattle) {
      return false;
    }
    const currentPhase = this.scene.getCurrentPhase();
    if (currentPhase?.constructor?.name !== "CommandPhase") {
      return false;
    }
    const enemy = this.scene.getEnemyField();
    const first = enemy?.[0];
    if (!first) {
      return false;
    }
    const enemyForm = first.getSpeciesForm();
    if (enemyForm.speciesId !== row.species.speciesId) {
      return false;
    }
    const enemyFormAny: any = enemyForm as any;
    const enemyFormKey = enemyFormAny?.formKey as string | undefined;
    const forms = row.species.forms || [];
    if (!forms.length) {
      return row.formIndex === 0;
    }
    if (!enemyFormKey) {
      return false;
    }
    const idx = forms.findIndex(f => ((f as any)?.formKey as string | undefined) === enemyFormKey);
    if (idx < 0) {
      return false;
    }
    return idx === row.formIndex;
  }

  private getCurrentEnemyUniversalSmittyForm(): UniversalSmittyForm | null {
    if (!this.scene.currentBattle) {
      return null;
    }
    const currentPhase = this.scene.getCurrentPhase();
    if (currentPhase?.constructor?.name !== "CommandPhase") {
      return null;
    }
    const enemy = this.scene.getEnemyField();
    const first: any = enemy?.[0];
    const uf = first?.universalSmittyForm as UniversalSmittyForm | undefined;
    return uf ?? null;
  }

  private isCurrentEnemyUniversalSmittyFormName(formName: string): boolean {
    const uf = this.getCurrentEnemyUniversalSmittyForm();
    return !!uf && uf.formName === formName;
  }

  private isLockedForm(species: PokemonSpecies, formIndex: number): boolean {
    if (!this.scene.gameData) {
      return false;
    }
    const forms = species.forms || [];
    if (!forms.length) {
      return false;
    }
    const form = forms[formIndex] as any;
    const formKey = form?.formKey as SpeciesFormKey | undefined;
    const formName = form?.formName as string | undefined;
    if (!formKey || !formName) {
      return false;
    }
    if (formKey.includes("smitty")) {
      return !this.scene.gameData.isUniSmittyFormUnlocked(formName)
        && !this.scene.gameData.activeSkillTree?.sessionUniSmittyUnlocks?.includes(formName);
    }
    if (formKey.includes("glitch")) {
      if (getModPokemonName(species.speciesId, formName)) {
        return false;
      }
      const rewardTypeMap: { [key in SpeciesFormKey]?: RewardType } = {
        [SpeciesFormKey.GLITCH]: RewardType.GLITCH_FORM_A,
        [SpeciesFormKey.GLITCH_B]: RewardType.GLITCH_FORM_B,
        [SpeciesFormKey.GLITCH_C]: RewardType.GLITCH_FORM_C,
        [SpeciesFormKey.GLITCH_D]: RewardType.GLITCH_FORM_D,
        [SpeciesFormKey.GLITCH_E]: RewardType.GLITCH_FORM_E,
        [SpeciesFormKey.SMITTY]: RewardType.SMITTY_FORM,
        [SpeciesFormKey.SMITTY_B]: RewardType.SMITTY_FORM_B
      };
      const rewardType = rewardTypeMap[formKey];
      return !(rewardType !== undefined && this.scene.gameData.canUseGlitchOrSmittyForm(species.speciesId, rewardType));
    }
    return false;
  }

  private getUnlockedFormIndex(species: PokemonSpecies, desiredFormIndex: number): number {
    const forms = species.forms || [];
    if (!forms.length) {
      return 0;
    }
    if (!this.isLockedForm(species, desiredFormIndex)) {
      return desiredFormIndex;
    }
    for (let i = 0; i < forms.length; i++) {
      if (!this.isLockedForm(species, i)) {
        return i;
      }
    }
    return 0;
  }

  private buildViews(width: number): void {
    this.list.removeAll(true);
    this.views = [];

    for (let i = 0; i < this.visibleRows; i++) {
      const c = this.scene.add.container(width / 2, i * this.rowHeight + this.rowHeight / 2);
      const bg = new RoundRectangle(this.scene, 0, 0, width - 8, this.rowHeight - 2, 4);

      const icon = this.scene.add.sprite(-width / 2 + 24, -this.rowHeight / 2 + 2, "pokemon_icons_1");
      icon.setOrigin(0.5, 0);
      icon.setScale(0.55);

      const fusionIcon = this.scene.add.sprite(icon.x, icon.y, "pokemon_icons_1");
      fusionIcon.setOrigin(0.5, 0);
      fusionIcon.setScale(0.55);
      fusionIcon.setVisible(false);

      const caughtIcon = this.scene.add.sprite(icon.x + 11, icon.y + 2, "icon_owned");
      caughtIcon.setOrigin(0.5, 0);
      caughtIcon.setScale(0.5);
      caughtIcon.setVisible(false);

      const nameText = addTextObject(this.scene, -width / 2 + 24, -this.rowHeight / 2 + 19, "-", TextStyle.WINDOW, { fontSize: "39px" });
      nameText.setOrigin(0.5, 0);

      const type1Icon = this.scene.add.sprite(-width / 2 + 18, -this.rowHeight / 2 + 29, Utils.getLocalizedSpriteKey("types"));
      type1Icon.setOrigin(0.5, 0.5);
      type1Icon.setScale(0.45);
      const type2Icon = this.scene.add.sprite(-width / 2 + 30, -this.rowHeight / 2 + 29, Utils.getLocalizedSpriteKey("types"));
      type2Icon.setOrigin(0.5, 0.5);
      type2Icon.setScale(0.45);

      const statsBaseX = -65;

      const abilityText = addBBCodeTextObject(this.scene, -width / 2 + 45, -this.rowHeight / 2 + 4, "-", TextStyle.SUMMARY, { fontSize: "43px", lineSpacing: 1 });
      abilityText.setOrigin(0, 0);
      const abilityMaxWidth = Math.max(0, (statsBaseX) - (-width / 2 + 45) - 4);
      if (abilityText.scaleX) {
        abilityText.setStyle({
          ...(abilityText.style as any),
          wordWrap: { width: abilityMaxWidth / abilityText.scaleX, useAdvancedWrap: true }
        } as any);
      }

      const statLabelCells: Phaser.GameObjects.Text[] = [];
      const statValueCells: Phaser.GameObjects.Text[] = [];
      const labelY = -this.rowHeight / 2 + 5;
      const valueY = -this.rowHeight / 2 + 13;
      const colX = [0, 22, 38, 54, 70, 86, 102, 118];
      const labels = [
        i18next.t("filterBar:sortByCost", { defaultValue: "Cost" }),
        i18next.t("pokedex:sortBST"),
        i18next.t("pokemonInfo:Stat.HPshortened"),
        i18next.t("pokemonInfo:Stat.ATKshortened"),
        i18next.t("pokemonInfo:Stat.DEFshortened"),
        i18next.t("pokemonInfo:Stat.SPATKshortened"),
        i18next.t("pokemonInfo:Stat.SPDEFshortened"),
        i18next.t("pokemonInfo:Stat.SPDshortened")
      ];
      for (let idx = 0; idx < 8; idx++) {
        const label = addTextObject(this.scene, statsBaseX + colX[idx], labelY, labels[idx], TextStyle.SETTINGS_LABEL, { fontSize: "39px" });
        label.setOrigin(0, 0);
        const value = addTextObject(this.scene, statsBaseX + colX[idx], valueY, "-", TextStyle.SUMMARY, { fontSize: "45px" });
        value.setOrigin(0, 0);
        statLabelCells.push(label);
        statValueCells.push(value);
      }

      const eggLeftEdge = (width / 2) - 6 - 46 - (86 * 0.5);
      const unlockMaxWidth = Math.max(0, (eggLeftEdge - 2) - statsBaseX);
      const hintLabelText = addTextObject(this.scene, statsBaseX, -this.rowHeight / 2 + 23, "", TextStyle.WINDOW, { fontSize: "30px" });
      hintLabelText.setOrigin(0, 0);
      hintLabelText.setTint(0xffd700);
      hintLabelText.setVisible(false);

      const hintBodyText = addTextObject(this.scene, statsBaseX, -this.rowHeight / 2 + 23, "", TextStyle.WINDOW, { fontSize: "30px" });
      hintBodyText.setOrigin(0, 0);
      hintBodyText.setVisible(false);
      if (hintBodyText.scaleX) {
        hintBodyText.setStyle({ ...(hintBodyText.style as any), wordWrap: { width: unlockMaxWidth / hintBodyText.scaleX, useAdvancedWrap: true } });
      }

      const eggTiles: MoveTileView[] = [];
      const eggContainer = this.scene.add.container((width / 2) - 6, -this.rowHeight / 2 + 9);
      const eggLabel = addTextObject(this.scene, -45, -7, i18next.t("pokedex:eggMoves"), TextStyle.SETTINGS_LABEL, { fontSize: "39px" });
      eggLabel.setOrigin(0.5, 0);
      const tilePositions = [[-46, 4], [0, 4], [-46, 14], [0, 14]];
      for (let t = 0; t < 4; t++) {
        const tileContainer = this.scene.add.container(tilePositions[t][0], tilePositions[t][1]);
        tileContainer.setScale(0.5);
        const tileBg = this.scene.add.nineslice(0, 0, "type_bgs", "unknown", 86, 16, 2, 2, 2, 2);
        tileBg.setOrigin(1, 0);
        const tileLabel = addTextObject(this.scene, -tileBg.width / 2, 2, "-", TextStyle.PARTY, { fontSize: "75px" });
        tileLabel.setOrigin(0.5, 0);
        const tileIcon = this.scene.add.sprite(-tileBg.width / 2, tileBg.height / 2, "smitems", "quest");
        tileIcon.setOrigin(0.5, 0.5);
        tileIcon.setScale(0.5);
        tileIcon.setVisible(false);
        tileContainer.add(tileBg);
        tileContainer.add(tileLabel);
        tileContainer.add(tileIcon);
        eggContainer.add(tileContainer);
        eggTiles.push({ bg: tileBg, label: tileLabel, icon: tileIcon });
      }
      eggContainer.add(eggLabel);

      const rivalOfferTiles: SquareTileView[] = [];
      const rivalOfferObjects: Phaser.GameObjects.GameObject[] = [];
      const rivalTileSize = 24;
      const rivalGap = 4;
      const rivalCols = 8;
      const rivalStartX = -((rivalCols * rivalTileSize + (rivalCols - 1) * rivalGap) / 2) + (rivalTileSize / 2);
      const rivalY = 0;
      for (let t = 0; t < 8; t++) {
        const col = t;
        const x = rivalStartX + col * (rivalTileSize + rivalGap);
        const y = rivalY;
        const tileBg = this.scene.add.nineslice(x, y, "type_bgs", "unknown", rivalTileSize, rivalTileSize, 2, 2, 2, 2);
        tileBg.setOrigin(0.5, 0.5);
        const border = this.scene.add.rectangle(x, y, rivalTileSize + 2, rivalTileSize + 2, 0x000000, 0);
        border.setOrigin(0.5, 0.5);
        border.setStrokeStyle(1, 0xffffff, 0);
        const tileIcon = this.scene.add.sprite(x, y, "pokemon_icons_1");
        tileIcon.setOrigin(0.5, 0.5);
        tileIcon.setScale(0.55);
        tileBg.setVisible(false);
        border.setVisible(false);
        tileIcon.setVisible(false);
        rivalOfferTiles.push({ bg: tileBg, border, icon: tileIcon });
        rivalOfferObjects.push(tileBg, border, tileIcon);
      }

      const smittyFoeTiles: SquareTileView[] = [];
      const smittyFoeObjects: Phaser.GameObjects.GameObject[] = [];
      const foeCols = Math.max(1, this.smittyFoeCols | 0);
      const foeTileSize = 30;
      const foeGap = 4;
      const foeTotalWidth = foeCols * foeTileSize + (foeCols - 1) * foeGap;
      const foeStartX = -(foeTotalWidth / 2) + (foeTileSize / 2);
      for (let cidx = 0; cidx < foeCols; cidx++) {
        const x = foeStartX + cidx * (foeTileSize + foeGap);
        const y = 0;
        const tileBg = this.scene.add.nineslice(x, y, "type_bgs", "unknown", foeTileSize, foeTileSize, 2, 2, 2, 2);
        tileBg.setOrigin(0.5, 0.5);
        const border = this.scene.add.rectangle(x, y, foeTileSize + 2, foeTileSize + 2, 0x000000, 0);
        border.setOrigin(0.5, 0.5);
        border.setStrokeStyle(2, 0xffffff, 0);
        const tileIcon = this.scene.add.sprite(x, y - 6, "smitty_trainers");
        tileIcon.setOrigin(0.5, 0.5);
        tileIcon.setScale(0.19);
        const tileLabel = addTextObject(this.scene, x, y + 9, "-", TextStyle.WINDOW, { fontSize: "18px", align: "center" });
        tileLabel.setOrigin(0.5, 0.5);
        if (tileLabel.scaleX) {
          tileLabel.setStyle({ ...(tileLabel.style as any), wordWrap: { width: (foeTileSize - 2) / tileLabel.scaleX, useAdvancedWrap: true } });
        }
        tileBg.setVisible(false);
        border.setVisible(false);
        tileIcon.setVisible(false);
        tileLabel.setVisible(false);
        smittyFoeTiles.push({ bg: tileBg, border, icon: tileIcon, label: tileLabel });
        smittyFoeObjects.push(tileBg, border, tileIcon, tileLabel);
      }

      c.add([bg, icon, fusionIcon, caughtIcon, nameText, type1Icon, type2Icon, abilityText, eggContainer, hintLabelText, hintBodyText, ...statLabelCells, ...statValueCells, ...rivalOfferObjects, ...smittyFoeObjects]);

      const slotIndex = i;
      const hitZone = this.scene.add.zone(0, 0, width - 8, this.rowHeight);
      hitZone.setOrigin(0.5, 0.5);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on("pointerover", () => {
        const rowIndex = this.scrollOffset + slotIndex;
        if (rowIndex >= this.rows.length) return;
        if (this.cursorIndex !== rowIndex) {
          this.cursorIndex = rowIndex;
          this.refreshViews();
        }
      });
      hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!pointer.leftButtonDown()) {
          return;
        }
        const rowIndex = this.scrollOffset + slotIndex;
        if (rowIndex >= this.rows.length) return;
        if (this.cursorIndex === rowIndex) {
          this.processInput(Button.ACTION);
        } else {
          this.cursorIndex = rowIndex;
          this.refreshViews();
        }
      });
      c.add(hitZone);

      this.list.add(c);

      this.views.push({ container: c, bg, icon, fusionIcon, caughtIcon, nameText, type1Icon, type2Icon, abilityText, statLabelCells, statValueCells, eggLabel, eggTiles, hintLabelText, hintBodyText, hintMaxWidth: unlockMaxWidth, abilityMaxWidth, rivalOfferTiles, smittyFoeTiles, hitZone });
    }
  }

  private refreshViews(): void {
    this.ensureCursorVisible();
    for (let i = 0; i < this.views.length; i++) {
      const rowIndex = this.scrollOffset + i;
      const view = this.views[i];
      const row = this.rows[rowIndex];
      if (!row) {
        view.container.setVisible(false);
        continue;
      }
      view.container.setVisible(true);
      this.renderRow(view, row, rowIndex === this.cursorIndex, rowIndex);
    }
  }

  private renderRow(view: RowView, row: VoidexRow, selected: boolean, rowIndex: number): void {
    for (const t of view.rivalOfferTiles) {
      t.bg.setVisible(false);
      t.border.setVisible(false);
      t.icon.setVisible(false);
      t.icon.clearTint();
    }
    for (const t of view.smittyFoeTiles) {
      t.bg.setVisible(false);
      t.border.setVisible(false);
      t.icon.setVisible(false);
      t.icon.clearTint();
      if (t.label) {
        t.label.setVisible(false);
        t.label.setText("-");
      }
    }
    view.fusionIcon.setVisible(false);
    view.fusionIcon.clearTint();
    view.fusionIcon.setAlpha(1);
    view.icon.clearTint();
    view.icon.setAlpha(1);
    view.nameText.setTint(0xffffff);
    if (typeof (view.abilityText as any).setStyle === "function") {
      (view.abilityText as any).setStyle({ ...((view.abilityText as any).style ?? {}), fontSize: "43px", lineSpacing: 1 });
    }
    if (view.abilityText.scaleX) {
      view.abilityText.setStyle({
        ...(view.abilityText.style as any),
        wordWrap: { width: view.abilityMaxWidth / view.abilityText.scaleX, useAdvancedWrap: true }
      } as any);
    }
    view.abilityText.setY(-this.rowHeight / 2 + 4);

    if (row.kind === "smittyFoesRow") {
      view.icon.setVisible(false);
      view.fusionIcon.setVisible(false);
      view.caughtIcon.setVisible(false);
      view.type1Icon.setVisible(false);
      view.type2Icon.setVisible(false);
      view.nameText.setVisible(false);
      view.abilityText.setVisible(false);
      view.hintLabelText.setVisible(false);
      view.hintBodyText.setVisible(false);
      view.eggLabel.setVisible(false);
      for (const tile of view.eggTiles) {
        tile.bg.setVisible(false);
        tile.label.setVisible(false);
        tile.icon.setVisible(false);
      }
      for (const c of view.statLabelCells) c.setVisible(false);
      for (const c of view.statValueCells) c.setVisible(false);

      view.bg.setFillStyle(0x223344);
      view.bg.setStrokeStyle(selected ? 2 : 1, 0xffffff, selected ? 1 : 0.2);

      const defeated = new Set<string>((this.scene.gameData?.defeatedSmittyFoes ?? []) as string[]);
      const maxCol = Math.max(0, row.frames.length - 1);
      if (selected) {
        this.smittyFoeColIndex = Math.max(0, Math.min(maxCol, this.smittyFoeColIndex));
      }
      for (let i = 0; i < view.smittyFoeTiles.length; i++) {
        const tile = view.smittyFoeTiles[i];
        const frameName = row.frames[i];
        if (!frameName) {
          continue;
        }
        tile.bg.setVisible(true);
        tile.border.setVisible(true);
        tile.icon.setVisible(true);
        tile.bg.setFrame("unknown");
        tile.icon.setTexture("smitty_trainers");
        tile.icon.setFrame(frameName);
        const n = parseInt(frameName.match(/\d+/)?.[0] || "0", 10);
        if (tile.label) {
          tile.label.setText(i18next.t("pokedex:smittyFoeName", { n }));
          tile.label.setVisible(true);
        }
        const isDefeated = defeated.has(frameName);
        if (!isDefeated) {
          tile.icon.setTintFill(0x000000);
          tile.icon.setAlpha(0.85);
        } else {
          tile.icon.clearTint();
          tile.icon.setAlpha(1);
        }
        const isSelectedTile = selected && i === this.smittyFoeColIndex;
        if (isSelectedTile) {
          tile.border.setStrokeStyle(2, 0xffffff, 1);
        } else {
          tile.border.setStrokeStyle(2, 0xffffff, selected ? 0.25 : 0);
        }
      }
      return;
    }

    if (row.kind === "rival") {
      view.icon.setVisible(true);
      view.fusionIcon.setVisible(false);
      view.icon.setOrigin(0.5, 0);
      view.icon.setScale(0.35);
      view.nameText.setVisible(true);
      view.nameText.setOrigin(0.5, 0);
      view.type1Icon.setVisible(true);
      view.type2Icon.setVisible(false);
      view.caughtIcon.setVisible(false);
      view.abilityText.setVisible(false);
      view.hintLabelText.setVisible(false);
      view.hintBodyText.setVisible(false);
      view.eggLabel.setVisible(false);
      for (const tile of view.eggTiles) {
        tile.bg.setVisible(false);
        tile.label.setVisible(false);
        tile.icon.setVisible(false);
      }
      for (const c of view.statLabelCells) c.setVisible(false);
      for (const c of view.statValueCells) c.setVisible(false);

      const type1Rgb = getTypeRgb(row.signatureType);
      const type1Color = new Phaser.Display.Color(type1Rgb[0], type1Rgb[1], type1Rgb[2]);
      const bgColor = type1Color.clone().darken(45);
      view.bg.setFillStyle(bgColor.color);
      if (selected) {
        view.bg.setStrokeStyle(2, 0xffffff, 1);
      } else {
        view.bg.setStrokeStyle(1, type1Color.color, 0.95);
      }

      const trainerConfig: any = (trainerConfigs as any)[row.rivalType];
      const spriteKey = trainerConfig ? trainerConfig.getSpriteKey(false, false) : null;
      if (spriteKey && this.scene.textures.exists(spriteKey)) {
        view.icon.setTexture(spriteKey);
        const texture = this.scene.textures.get(spriteKey);
        const frames = texture.getFrameNames().sort((a, b) => {
          const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
          const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
          return na - nb;
        });
        if (frames.length > 1) {
          view.icon.setFrame(frames[frames.length - 1]);
        }
      }
      const whiteSilhouette = !row.defeated && (row.signatureType === Type.GHOST || row.signatureType === Type.DARK);
      if (!row.defeated) {
        view.icon.setTintFill(whiteSilhouette ? 0xffffff : 0x000000);
        view.icon.setAlpha(0.85);
      } else {
        view.icon.clearTint();
        view.icon.setAlpha(1);
      }

      view.type1Icon.setTexture(Utils.getLocalizedSpriteKey("types"));
      view.type1Icon.setFrame(Type[row.signatureType].toLowerCase());
      view.type1Icon.setX(view.icon.x);

      const rivalName = i18next.t(`trainerNames:${TrainerType[row.rivalType as any].toLowerCase()}`);
      this.condenseVoidexName(view.nameText, rivalName);
      view.nameText.setTint(whiteSilhouette ? 0xffd700 : 0xffffff);

      const offers = this.getRivalCombinedOffers(row).slice(0, view.rivalOfferTiles.length);
      if (selected) {
        this.rivalOfferIndex = Math.max(0, Math.min(Math.max(0, offers.length - 1), this.rivalOfferIndex));
      }
      for (let i = 0; i < view.rivalOfferTiles.length; i++) {
        const tile = view.rivalOfferTiles[i];
        const offer = offers[i];
        if (!offer) {
          continue;
        }
        tile.bg.setVisible(true);
        tile.border.setVisible(true);
        tile.icon.setVisible(true);
        tile.bg.setFrame(Type[offer.primaryType].toLowerCase());
        const ds = getPokemonSpecies(offer.displaySpeciesId);
        const df = ds.forms && ds.forms.length > 0 ? ds.forms[offer.displayFormIndex] : ds;
        let iconAtlasKey = (df as any).getIconAtlasKey(offer.displayFormIndex, false, 0) as string;
        let iconId = (df as any).getIconId(false, offer.displayFormIndex, false, 0) as string;
        if (!this.scene.textures.exists(iconAtlasKey)) {
          iconAtlasKey = ds.getIconAtlasKey(0, false, 0);
          iconId = ds.getIconId(false, 0, false, 0);
        }
        tile.icon.setTexture(iconAtlasKey);
        if (!iconAtlasKey.startsWith("pokemon_icons_mod_")) {
          tile.icon.setFrame(iconId);
        }
        tile.icon.setScale(0.55);
        if (!offer.unlocked) {
          tile.icon.setTintFill(offer.primaryType === Type.GHOST || offer.primaryType === Type.DARK ? 0xffffff : 0x000000);
          tile.icon.setAlpha(0.85);
        } else {
          tile.icon.clearTint();
          tile.icon.setAlpha(1);
        }
        const isSelectedTile = selected && i === this.rivalOfferIndex;
        if (isSelectedTile) {
          tile.border.setStrokeStyle(1, 0xffffff, 1);
        } else {
          tile.border.setStrokeStyle(1, 0xffffff, selected ? 0.25 : 0);
        }
      }
      return;
    }

    if (row.kind === "universalSmitty") {
      const form = row.form;
      const type1 = form.primaryType !== null ? form.primaryType : Type.UNKNOWN;
      const type2 = form.secondaryType !== null ? form.secondaryType : null;
      const types = [type1, type2].filter(t => t !== null) as Type[];

      view.icon.setVisible(true);
      view.nameText.setVisible(true);
      view.type1Icon.setVisible(true);
      view.abilityText.setVisible(true);
      for (const c of view.statLabelCells) c.setVisible(true);
      for (const c of view.statValueCells) c.setVisible(true);
      if (view.statLabelCells.length >= 1) view.statLabelCells[0].setVisible(false);
      if (view.statValueCells.length >= 1) view.statValueCells[0].setVisible(false);
      view.eggLabel.setVisible(true);
      for (const tile of view.eggTiles) {
        tile.bg.setVisible(true);
      }

      const type1Rgb = getTypeRgb(types[0]);
      const type1Color = new Phaser.Display.Color(type1Rgb[0], type1Rgb[1], type1Rgb[2]);
      const bgColor = type1Color.clone().darken(45);
      view.bg.setFillStyle(bgColor.color);
      if (selected) {
        view.bg.setStrokeStyle(2, 0xffffff, 1);
      } else {
        view.bg.setStrokeStyle(1, type1Color.color, 0.95);
      }

      const iconAtlasKey = "pokemon_icons_glitch";
      const iconId = row.formName.toLowerCase();
      view.icon.setTexture(iconAtlasKey);
      view.icon.setFrame(iconId);
      view.icon.setOrigin(0.5, 0);
      view.icon.setScale(0.55);

      const locked = this.scene.gameData ? !this.scene.gameData.isUniSmittyFormUnlocked(row.formName) : false;
      if (locked) {
        view.icon.setTintFill(type1 === Type.GHOST || type1 === Type.DARK ? 0xffffff : 0x000000);
      } else {
        view.icon.clearTint();
      }
      view.caughtIcon.setVisible(false);

      view.type1Icon.setTexture(Utils.getLocalizedSpriteKey("types"));
      view.type1Icon.setFrame(Type[type1].toLowerCase());
      if (type2 !== null && type2 !== type1) {
        view.type2Icon.setVisible(true);
        view.type2Icon.setTexture(Utils.getLocalizedSpriteKey("types"));
        view.type2Icon.setFrame(Type[type2].toLowerCase());
      } else {
        view.type2Icon.setVisible(false);
      }
      if (!view.type2Icon.visible) {
        view.type1Icon.setX(view.icon.x);
      } else {
        view.type1Icon.setX(view.icon.x - 7);
        view.type2Icon.setX(view.icon.x + 7);
      }

      const displayName = row.formName ? (row.formName.charAt(0).toUpperCase() + row.formName.slice(1)) : "-";
      this.condenseVoidexName(view.nameText, displayName);
      view.nameText.setTint(0xffd700);

      const a1 = form.ability1 !== Abilities.NONE ? allAbilities[form.ability1]?.name : "-";
      const hasAbility2 = form.ability2 !== Abilities.NONE && form.ability2 !== form.ability1;
      const a2 = hasAbility2 ? allAbilities[form.ability2]?.name : "-";
      const a3 = form.abilityHidden !== Abilities.NONE ? allAbilities[form.abilityHidden]?.name : "-";
      if (typeof (view.abilityText as any).setStyle === "function") {
        (view.abilityText as any).setStyle({ ...((view.abilityText as any).style ?? {}), fontSize: "47px", lineSpacing: 6 });
      }
      if (view.abilityText.scaleX) {
        view.abilityText.setStyle({
          ...(view.abilityText.style as any),
          wordWrap: { width: view.abilityMaxWidth / view.abilityText.scaleX, useAdvancedWrap: true }
        } as any);
      }
      view.abilityText.setY(-this.rowHeight / 2 + 12);
      view.abilityText.setText("");
      view.abilityText.appendText(`A1: ${a1}`, false);
      if (hasAbility2) {
        view.abilityText.appendText(`A2: ${a2}`, true);
      }
      view.abilityText.appendText(`H: ${a3}`, true);

      if (view.statValueCells.length >= 8) {
        view.statValueCells[0].setText("-");
        view.statValueCells[1].setText(String(row.stats.bst));
        view.statValueCells[2].setText(String(row.stats.hp));
        view.statValueCells[3].setText(String(row.stats.atk));
        view.statValueCells[4].setText(String(row.stats.def));
        view.statValueCells[5].setText(String(row.stats.spa));
        view.statValueCells[6].setText(String(row.stats.spd));
        view.statValueCells[7].setText(String(row.stats.spe));
      }

      if (locked) {
        const label = i18next.t("pokedex:unlockLabel");
        const body = i18next.t("pokedex:unlockHintSmittyGeneric");
        view.hintLabelText.setText(label);
        view.hintBodyText.setText(body);
        view.hintLabelText.setVisible(true);
        view.hintBodyText.setVisible(true);
        const labelWidth = view.hintLabelText.displayWidth;
        view.hintBodyText.setX(view.hintLabelText.x + labelWidth + 2);
        if (view.hintBodyText.scaleX) {
          const wrap = Math.max(0, (view.hintMaxWidth - labelWidth - 2) / view.hintBodyText.scaleX);
          view.hintBodyText.setStyle({ ...(view.hintBodyText.style as any), wordWrap: { width: wrap, useAdvancedWrap: true } });
        }
      } else {
        view.hintLabelText.setVisible(false);
        view.hintLabelText.setText("");
        view.hintBodyText.setVisible(false);
        view.hintBodyText.setText("");
      }

      view.eggLabel.setText(i18next.t("pokedex:forbiddenFormula"));
      view.eggLabel.setTint(0xb060ff);
      view.eggLabel.setStyle({ ...(view.eggLabel.style as any), fontStyle: "bold" });
      const formKey = (row.formName || "").toLowerCase();
      const requiredItems = (SMITTY_FORM_ITEMS as any)[formKey] as FormChangeItem[] | undefined;
      for (let i = 0; i < view.eggTiles.length; i++) {
        const item = requiredItems?.[i];
        const frame = item !== undefined ? this.getSmittyItemFrame(item) : null;
        view.eggTiles[i].bg.setFrame("unknown");
        if (locked) {
          view.eggTiles[i].icon.setVisible(false);
          view.eggTiles[i].label.setVisible(true);
          view.eggTiles[i].label.setText("???");
        } else if (frame) {
          view.eggTiles[i].icon.setTexture("smitems");
          view.eggTiles[i].icon.setFrame(frame);
          view.eggTiles[i].icon.setVisible(true);
          view.eggTiles[i].label.setVisible(false);
          view.eggTiles[i].label.setText("-");
        } else {
          view.eggTiles[i].icon.setVisible(false);
          view.eggTiles[i].label.setVisible(true);
        view.eggTiles[i].label.setText("-");
        }
      }

      return;
    }

    if (row.kind === "fusion") {
      view.icon.setVisible(true);
      view.fusionIcon.setVisible(true);
      view.nameText.setVisible(true);
      view.type1Icon.setVisible(true);
      view.abilityText.setVisible(true);
      for (const c of view.statLabelCells) c.setVisible(true);
      for (const c of view.statValueCells) c.setVisible(true);
      view.eggLabel.setVisible(true);
      for (const tile of view.eggTiles) {
        tile.bg.setVisible(true);
      }

      const types: Type[] = [row.fusedTypes[0]];
      if (row.fusedTypes[1] !== null && row.fusedTypes[1] !== row.fusedTypes[0]) {
        types.push(row.fusedTypes[1]);
      }
      const type1Rgb = getTypeRgb(types[0]);
      const type1Color = new Phaser.Display.Color(type1Rgb[0], type1Rgb[1], type1Rgb[2]);
      const bgColor = type1Color.clone().darken(45);
      view.bg.setFillStyle(bgColor.color);

      const type2Rgb = types[1] ? getTypeRgb(types[1]) : undefined;
      const type2Color = type2Rgb ? new Phaser.Display.Color(type2Rgb[0], type2Rgb[1], type2Rgb[2]) : undefined;
      if (selected) {
        view.bg.setStrokeStyle(2, 0xffffff, 1);
      } else {
        view.bg.setStrokeStyle(1, (type2Color ?? type1Color).color, 0.95);
      }

      const primarySpecies = row.primarySpecies;
      const fusionSpecies = row.fusionSpecies;
      const primaryForms = primarySpecies.forms && primarySpecies.forms.length > 0 ? primarySpecies.forms : null;
      const fusionForms = fusionSpecies.forms && fusionSpecies.forms.length > 0 ? fusionSpecies.forms : null;
      const primaryForm = primaryForms ? (primaryForms[row.primaryFormIndex] ?? primaryForms[0] ?? primarySpecies) : primarySpecies;
      const fusionForm = fusionForms ? (fusionForms[row.fusionFormIndex] ?? fusionForms[0] ?? fusionSpecies) : fusionSpecies;

      let primaryAtlasKey = (primaryForm as any).getIconAtlasKey(row.primaryFormIndex, false, 0) as string;
      let primaryIconId = (primaryForm as any).getIconId(false, row.primaryFormIndex, false, 0) as string;
      if (!this.scene.textures.exists(primaryAtlasKey)) {
        primaryAtlasKey = primarySpecies.getIconAtlasKey(row.primaryFormIndex, false, 0);
        primaryIconId = primarySpecies.getIconId(false, row.primaryFormIndex, false, 0);
      }
      let fusionAtlasKey = (fusionForm as any).getIconAtlasKey(row.fusionFormIndex, false, 0) as string;
      let fusionIconId = (fusionForm as any).getIconId(false, row.fusionFormIndex, false, 0) as string;
      if (!this.scene.textures.exists(fusionAtlasKey)) {
        fusionAtlasKey = fusionSpecies.getIconAtlasKey(row.fusionFormIndex, false, 0);
        fusionIconId = fusionSpecies.getIconId(false, row.fusionFormIndex, false, 0);
      }

      view.icon.setTexture(primaryAtlasKey);
      if (!primaryAtlasKey.startsWith("pokemon_icons_mod_")) {
        view.icon.setFrame(primaryIconId);
      }
      view.icon.setOrigin(0.5, 0);
      view.icon.setScale(0.55);

      view.fusionIcon.setTexture(fusionAtlasKey);
      if (!fusionAtlasKey.startsWith("pokemon_icons_mod_")) {
        view.fusionIcon.setFrame(fusionIconId);
      }
      view.fusionIcon.setOrigin(0.5, 0);
      view.fusionIcon.setScale(0.55);

      if (!primaryAtlasKey.startsWith("pokemon_icons_mod_") && !fusionAtlasKey.startsWith("pokemon_icons_mod_")) {
        const originalTopFrame = view.icon.frame;
        const originalBottomFrame = view.fusionIcon.frame;
        const topHeight = (originalTopFrame.cutHeight <= originalBottomFrame.cutHeight ? Math.ceil : Math.floor)((originalTopFrame.cutHeight + originalBottomFrame.cutHeight) / 4);
        const topFrameId = `${originalTopFrame.name}f${originalBottomFrame.name}`;
        if (!originalTopFrame.texture.has(topFrameId)) {
          originalTopFrame.texture.add(topFrameId, originalTopFrame.sourceIndex, originalTopFrame.cutX, originalTopFrame.cutY, originalTopFrame.cutWidth, topHeight);
        }
        view.icon.setFrame(topFrameId);

        const bottomY = originalBottomFrame.cutY + topHeight;
        const bottomHeight = originalBottomFrame.cutHeight - topHeight;
        const bottomFrameId = `${originalBottomFrame.name}f${originalTopFrame.name}`;
        if (!originalBottomFrame.texture.has(bottomFrameId)) {
          originalBottomFrame.texture.add(bottomFrameId, originalBottomFrame.sourceIndex, originalBottomFrame.cutX, bottomY, originalBottomFrame.cutWidth, bottomHeight);
        }
        view.fusionIcon.setFrame(bottomFrameId);

        view.fusionIcon.setY(view.icon.y + view.icon.frame.cutHeight * view.icon.scaleY);

        const frameY = (originalTopFrame.y + originalBottomFrame.y) / 2;
        view.icon.frame.y = frameY;
        view.fusionIcon.frame.y = frameY;
      } else {
        view.fusionIcon.setY(view.icon.y + 10);
      }

      view.caughtIcon.setVisible(false);

      view.type1Icon.setTexture(Utils.getLocalizedSpriteKey("types"));
      view.type1Icon.setFrame(Type[row.fusedTypes[0]].toLowerCase());
      if (row.fusedTypes[1] !== null && row.fusedTypes[1] !== row.fusedTypes[0]) {
        view.type2Icon.setVisible(true);
        view.type2Icon.setTexture(Utils.getLocalizedSpriteKey("types"));
        view.type2Icon.setFrame(Type[row.fusedTypes[1]].toLowerCase());
      } else {
        view.type2Icon.setVisible(false);
      }
      if (!view.type2Icon.visible) {
        view.type1Icon.setX(view.icon.x);
      } else {
        view.type1Icon.setX(view.icon.x - 7);
        view.type2Icon.setX(view.icon.x + 7);
      }

      const fusedName = getFusedSpeciesName(primarySpecies.getName(row.primaryFormIndex), fusionSpecies.getName(row.fusionFormIndex));
      this.condenseVoidexName(view.nameText, fusedName);
      view.nameText.setTint(0xffd700);

      const a1 = fusionForm.ability1 !== Abilities.NONE ? allAbilities[fusionForm.ability1]?.name : "-";
      const hasAbility2 = fusionForm.ability2 !== Abilities.NONE && fusionForm.ability2 !== fusionForm.ability1;
      const a2 = hasAbility2 ? allAbilities[fusionForm.ability2]?.name : "-";
      const a3 = fusionForm.abilityHidden !== Abilities.NONE ? allAbilities[fusionForm.abilityHidden]?.name : "-";
      const primaryRootPassiveSpecies = primarySpecies.getRootSpeciesId(false);
      const passiveId = starterPassiveAbilities[primaryRootPassiveSpecies];

      view.abilityText.setText("");
      const active = row.activeFusionAbilityName || "-";
      view.abilityText.appendText(`A1${a1 === active ? "*" : ""}: ${a1}`, false);
      if (hasAbility2) {
        view.abilityText.appendText(`A2${a2 === active ? "*" : ""}: ${a2}`, true);
      }
      if (primarySpecies.generation !== 20) {
        view.abilityText.appendText(`H${a3 === active ? "*" : ""}: ${a3}`, true);
      }
      if (passiveId !== undefined) {
        view.abilityText.appendText(`P: ${allAbilities[passiveId]?.name ?? "-"}`, true);
      }

      if (view.statValueCells.length >= 8) {
        view.statValueCells[0].setText(String(row.stats.cost));
        view.statValueCells[1].setText(String(row.stats.bst));
        view.statValueCells[2].setText(String(row.stats.hp));
        view.statValueCells[3].setText(String(row.stats.atk));
        view.statValueCells[4].setText(String(row.stats.def));
        view.statValueCells[5].setText(String(row.stats.spa));
        view.statValueCells[6].setText(String(row.stats.spd));
        view.statValueCells[7].setText(String(row.stats.spe));
      }

      const fusionOfLine = i18next.t("pokedex:fusionOfLine", { a: primarySpecies.getName(row.primaryFormIndex), b: fusionSpecies.getName(row.fusionFormIndex) });
      view.hintLabelText.setVisible(false);
      view.hintLabelText.setText("");
      view.hintBodyText.setVisible(true);
      view.hintBodyText.setText(fusionOfLine);
      view.hintBodyText.setX(view.hintLabelText.x);
      if (view.hintBodyText.scaleX) {
        view.hintBodyText.setStyle({ ...(view.hintBodyText.style as any), wordWrap: { width: view.hintMaxWidth / view.hintBodyText.scaleX, useAdvancedWrap: true } });
      }

      view.eggLabel.setText(i18next.t("pokedex:eggMoves"));
      view.eggLabel.setTint(0xffffff);
      view.eggLabel.setStyle({ ...(view.eggLabel.style as any), fontStyle: "normal" });

      const eggMoveIds = (speciesEggMoves[primaryRootPassiveSpecies] || []) as Moves[];
      for (let i = 0; i < view.eggTiles.length; i++) {
        const moveId = eggMoveIds[i];
        const move = moveId !== undefined ? allMoves[moveId] : undefined;
        const typeFrame = Type[move ? move.type : Type.UNKNOWN].toString().toLowerCase();
        view.eggTiles[i].bg.setFrame(typeFrame);
        view.eggTiles[i].icon.setVisible(false);
        view.eggTiles[i].label.setVisible(true);
        if (!move) {
          view.eggTiles[i].label.setText("-");
        } else {
          view.eggTiles[i].label.setText(move.name);
        }
      }

      if (localStorage.getItem("voidexPrelistDebug") === "1" && selected) {
        const bounds = view.container.getBounds();
        console.debug("VoidexPrelist row layout", {
          rowIndex,
          kind: row.kind,
          primarySpeciesId: row.primarySpeciesId,
          fusionSpeciesId: row.fusionSpeciesId,
          bounds: { x: bounds.x, y: bounds.y, w: bounds.width, h: bounds.height }
        });
      }
      return;
    }

    view.icon.setVisible(true);
    view.nameText.setVisible(true);
    view.type1Icon.setVisible(true);
    view.abilityText.setVisible(true);
    for (const c of view.statLabelCells) c.setVisible(true);
    for (const c of view.statValueCells) c.setVisible(true);
    view.eggLabel.setVisible(true);
    for (const tile of view.eggTiles) {
      tile.bg.setVisible(true);
    }

    const species = row.species;
    const costRoot = species.getRootSpeciesId(true);
    if (!speciesStarters.hasOwnProperty(costRoot)) {
      if (view.statLabelCells.length >= 1) view.statLabelCells[0].setVisible(false);
      if (view.statValueCells.length >= 1) view.statValueCells[0].setVisible(false);
    }
    const form = species.forms && species.forms.length > 0 ? species.forms[row.formIndex] : species;
    const types = [form.type1, form.type2].filter(t => t !== null) as Type[];

    const type1Rgb = getTypeRgb(types[0]);
    const type1Color = new Phaser.Display.Color(type1Rgb[0], type1Rgb[1], type1Rgb[2]);
    const bgColor = type1Color.clone().darken(45);
    view.bg.setFillStyle(bgColor.color);

    const type2Rgb = types[1] ? getTypeRgb(types[1]) : undefined;
    const type2Color = type2Rgb ? new Phaser.Display.Color(type2Rgb[0], type2Rgb[1], type2Rgb[2]) : undefined;
    if (selected) {
      view.bg.setStrokeStyle(2, 0xffffff, 1);
    } else {
      view.bg.setStrokeStyle(1, (type2Color ?? type1Color).color, 0.95);
    }

    const lockedForm = this.isLockedForm(species, row.formIndex);
    let iconAtlasKey = (form as any).getIconAtlasKey(row.formIndex, false, 0) as string;
    let iconId = (form as any).getIconId(false, row.formIndex, false, 0) as string;
    if (!this.scene.textures.exists(iconAtlasKey)) {
      iconAtlasKey = species.getIconAtlasKey(0, false, 0);
      iconId = species.getIconId(false, 0, false, 0);
    }
    if (iconAtlasKey.startsWith("pokemon_icons_mod_")) {
      view.icon.setTexture(iconAtlasKey);
    } else {
      view.icon.setTexture(iconAtlasKey);
      view.icon.setFrame(iconId);
    }
    view.icon.setOrigin(0.5, 0);
    view.icon.setScale(0.55);
    if (lockedForm) {
      const primaryType = form.type1;
      view.icon.setTintFill(primaryType === Type.GHOST || primaryType === Type.DARK ? 0xffffff : 0x000000);
    } else {
      view.icon.clearTint();
    }
    const dexEntry: any = this.scene.gameData ? (this.scene.gameData as any).dexData?.[species.speciesId] : null;
    view.caughtIcon.setVisible(!!dexEntry?.caughtAttr);

    view.type1Icon.setTexture(Utils.getLocalizedSpriteKey("types"));
    view.type1Icon.setFrame(Type[form.type1].toLowerCase());

    if (form.type2 !== null && form.type2 !== form.type1) {
      view.type2Icon.setVisible(true);
      view.type2Icon.setTexture(Utils.getLocalizedSpriteKey("types"));
      view.type2Icon.setFrame(Type[form.type2].toLowerCase());
    } else {
      view.type2Icon.setVisible(false);
    }
    if (!view.type2Icon.visible) {
      view.type1Icon.setX(view.icon.x);
    } else {
      view.type1Icon.setX(view.icon.x - 7);
      view.type2Icon.setX(view.icon.x + 7);
    }

    const prefix = this.getRowPrefix(row.target);
    const name = species.getName(row.formIndex);
    const displayName = prefix ? `${prefix} ${name}` : name;
    this.condenseVoidexName(view.nameText, displayName);
    const formKey = (form as any).getFormKey?.() ?? (form as any).formKey ?? "";
    if (species.generation === 20 || form.isGlitchOrSmittyForm(formKey)) {
      view.nameText.setTint(0xffd700);
    }

    const a1 = form.ability1 !== Abilities.NONE ? allAbilities[form.ability1]?.name : "-";
    const hasAbility2 = form.ability2 !== Abilities.NONE && form.ability2 !== form.ability1;
    const a2 = hasAbility2 ? allAbilities[form.ability2]?.name : "-";
    const a3 = form.abilityHidden !== Abilities.NONE ? allAbilities[form.abilityHidden]?.name : "-";

    const rootPassiveSpecies = species.getRootSpeciesId(false);
    const passiveId = starterPassiveAbilities[rootPassiveSpecies];

    view.abilityText.setText("");
    view.abilityText.appendText(`A1: ${a1}`, false);
    if (hasAbility2) {
      view.abilityText.appendText(`A2: ${a2}`, true);
    }
    if (species.generation !== 20) {
      view.abilityText.appendText(`H: ${a3}`, true);
    }
    if (passiveId !== undefined) {
      view.abilityText.appendText(`P: ${allAbilities[passiveId]?.name ?? "-"}`, true);
    }

    if (view.statValueCells.length >= 8) {
      view.statValueCells[0].setText(String(row.stats.cost));
      view.statValueCells[1].setText(String(row.stats.bst));
      view.statValueCells[2].setText(String(row.stats.hp));
      view.statValueCells[3].setText(String(row.stats.atk));
      view.statValueCells[4].setText(String(row.stats.def));
      view.statValueCells[5].setText(String(row.stats.spa));
      view.statValueCells[6].setText(String(row.stats.spd));
      view.statValueCells[7].setText(String(row.stats.spe));
    }

    const hideHint = () => {
      view.hintLabelText.setVisible(false);
      view.hintLabelText.setText("");
      view.hintBodyText.setVisible(false);
      view.hintBodyText.setText("");
    };
    const setHint = (label: string, body: string, fontSize: number) => {
      const px = `${fontSize}px`;
      view.hintLabelText.setStyle({ ...(view.hintLabelText.style as any), fontSize: px });
      view.hintBodyText.setStyle({ ...(view.hintBodyText.style as any), fontSize: px });
      view.hintLabelText.setText(label);
      view.hintBodyText.setText(body);
      view.hintLabelText.setVisible(true);
      view.hintBodyText.setVisible(true);
      const labelWidth = view.hintLabelText.displayWidth;
      view.hintBodyText.setX(view.hintLabelText.x + labelWidth + 2);
      if (view.hintBodyText.scaleX) {
        const wrap = Math.max(0, (view.hintMaxWidth - labelWidth - 2) / view.hintBodyText.scaleX);
        view.hintBodyText.setStyle({ ...(view.hintBodyText.style as any), wordWrap: { width: wrap, useAdvancedWrap: true } });
      }
    };
    if (lockedForm) {
      const formKey = (form as any)?.formKey as SpeciesFormKey | undefined;
      if (formKey && formKey.includes("smitty")) {
        setHint(i18next.t("pokedex:unlockLabel"), i18next.t("pokedex:unlockHintSmittyGeneric"), 30);
      } else if (formKey) {
        const rewardTypeMap: { [key in SpeciesFormKey]?: RewardType } = {
          [SpeciesFormKey.GLITCH]: RewardType.GLITCH_FORM_A,
          [SpeciesFormKey.GLITCH_B]: RewardType.GLITCH_FORM_B,
          [SpeciesFormKey.GLITCH_C]: RewardType.GLITCH_FORM_C,
          [SpeciesFormKey.GLITCH_D]: RewardType.GLITCH_FORM_D,
          [SpeciesFormKey.GLITCH_E]: RewardType.GLITCH_FORM_E
        };
        const rewardType = rewardTypeMap[formKey];
        if (rewardType !== undefined) {
          const info = this.unlockHintMap.get(`${rewardType}:${species.speciesId}`);
          if (info) {
            const questName = getQuestUnlockableName(info.questId);
            const rivalName = info.rivalType !== null
              ? i18next.t(`trainerNames:${TrainerType[info.rivalType as any].toLowerCase()}`)
              : "";
            setHint(i18next.t("pokedex:unlockLabel"), i18next.t("pokedex:unlockHintGlitchDetailed", { rival: rivalName, quest: questName }), 30);
          } else {
            hideHint();
          }
        } else {
          hideHint();
        }
      } else {
        hideHint();
      }
    } else {
      const fk = (form as any)?.formKey as string | undefined;
      const description = getPokedexMethodDescription(species.speciesId, fk);
      if (description) {
        setHint(i18next.t("pokedex:evolveBy"), description, 35);
      } else {
        hideHint();
      }
    }

    const smittyFormKey = (form as any)?.formKey as SpeciesFormKey | undefined;
    const formName = (form as any)?.formName as string | undefined;
    const isSmittyForm = !!smittyFormKey && smittyFormKey.includes("smitty") && !!formName;
    if (isSmittyForm) {
      view.eggLabel.setText(i18next.t("pokedex:forbiddenFormula"));
      view.eggLabel.setTint(0xb060ff);
      view.eggLabel.setStyle({ ...(view.eggLabel.style as any), fontStyle: "bold" });
      const key = formName.toLowerCase();
      const requiredItems = (SMITTY_FORM_ITEMS as any)[key] as FormChangeItem[] | undefined;
      for (let i = 0; i < view.eggTiles.length; i++) {
        const item = requiredItems?.[i];
        const frame = item !== undefined ? this.getSmittyItemFrame(item) : null;
        view.eggTiles[i].bg.setFrame("unknown");
        if (lockedForm) {
          view.eggTiles[i].icon.setVisible(false);
          view.eggTiles[i].label.setVisible(true);
          view.eggTiles[i].label.setText("???");
        } else if (frame) {
          view.eggTiles[i].icon.setTexture("smitems");
          view.eggTiles[i].icon.setFrame(frame);
          view.eggTiles[i].icon.setVisible(true);
          view.eggTiles[i].label.setVisible(false);
          view.eggTiles[i].label.setText("-");
        } else {
          view.eggTiles[i].icon.setVisible(false);
          view.eggTiles[i].label.setVisible(true);
          view.eggTiles[i].label.setText("-");
        }
      }
    } else {
      view.eggLabel.setText(i18next.t("pokedex:eggMoves"));
      view.eggLabel.setTint(0xffffff);
      view.eggLabel.setStyle({ ...(view.eggLabel.style as any), fontStyle: "normal" });
    const eggRoot = species.getRootSpeciesId(false);
    const eggMoveIds = (speciesEggMoves[eggRoot] || []) as Moves[];
    for (let i = 0; i < view.eggTiles.length; i++) {
      const moveId = eggMoveIds[i];
      const move = moveId !== undefined ? allMoves[moveId] : undefined;
      const typeFrame = Type[move ? move.type : Type.UNKNOWN].toString().toLowerCase();
      view.eggTiles[i].bg.setFrame(typeFrame);
        view.eggTiles[i].icon.setVisible(false);
        view.eggTiles[i].label.setVisible(true);
      view.eggTiles[i].label.setText(move ? move.name : "-");
      }
    }

  }

  private condenseVoidexName(text: Phaser.GameObjects.Text, name: string): void {
    text.setScale(VoidexPrelistUiHandler.NAME_DEFAULT_SCALE);
    text.setText(name);
    const trigger = name.length > 16
      ? VoidexPrelistUiHandler.NAME_MAX_WIDTH * 0.82
      : VoidexPrelistUiHandler.NAME_MAX_WIDTH;
    if (text.displayWidth > trigger) {
      const ratio = trigger / text.displayWidth;
      text.setScale(text.scaleX * ratio, text.scaleY);
    }
  }

  private getRowPrefix(target: VoidexTarget): string {
    if (target.bucket === "party") {
      return "";
    }
    if (target.bucket === "enemy") {
      return "";
    }
    if (target.kind === "evolution") {
      return "";
    }
    return "";
  }

  private buildAllRows(): ListRow[] {
    const targets = this.buildTargets();
    const rows: ListRow[] = [];

    for (const t of targets) {
      let species: PokemonSpecies;
      try {
        species = getPokemonSpecies(t.speciesId);
      } catch {
        continue;
      }
      const forms = species.forms && species.forms.length > 0 ? species.forms.length : 1;
      for (let f = 0; f < forms; f++) {
        const form = species.forms && species.forms.length > 0 ? species.forms[f] : species;
        const stats = this.getRowStats(species, form);
        const search = this.getSearchBlob(t, species, f, form, stats);
        rows.push({ kind: "speciesForm", target: t, species, formIndex: f, stats, search });
      }
    }

    if (!this.restrictedSpeciesIds) {
      const enemyUniversalSmittyForm = this.getCurrentEnemyUniversalSmittyForm();
      const enemyUniversalSmittyFormName = enemyUniversalSmittyForm?.formName ?? null;
      const hasAnyUniversalSmittyUnlocked =
        !!this.scene.gameData &&
        universalSmittyForms.some(uf => this.scene.gameData.isUniSmittyFormUnlocked(uf.formName));
      for (const uf of universalSmittyForms) {
        const isUnlocked = !!this.scene.gameData && this.scene.gameData.isUniSmittyFormUnlocked(uf.formName);
        const isEnemyForm = !!enemyUniversalSmittyFormName && uf.formName === enemyUniversalSmittyFormName;
        if (!isEnemyForm && !hasAnyUniversalSmittyUnlocked && !isUnlocked) {
          continue;
        }
        const stats: RowStats = {
          id: 999999,
          bst: uf.totalStats,
          hp: uf.hp,
          atk: uf.attack,
          def: uf.defense,
          spa: uf.spAttack,
          spd: uf.spDefense,
          spe: uf.speed,
          cost: 0
        };
        const search = this.getUniversalSearchBlob(uf, stats);
        rows.push({ kind: "universalSmitty", formName: uf.formName, form: uf, stats, search });
      }

      if (enemyUniversalSmittyForm && !rows.some(r => r.kind === "universalSmitty" && r.formName === enemyUniversalSmittyForm.formName)) {
        const uf = enemyUniversalSmittyForm;
        const stats: RowStats = {
          id: 999999,
          bst: uf.totalStats,
          hp: uf.hp,
          atk: uf.attack,
          def: uf.defense,
          spa: uf.spAttack,
          spd: uf.spDefense,
          spe: uf.speed,
          cost: 0
        };
        const search = this.getUniversalSearchBlob(uf, stats);
        rows.push({ kind: "universalSmitty", formName: uf.formName, form: uf, stats, search });
      }
    }

    return rows;
  }

  private computeNeutralFusionBaseStats(primaryBaseStats: number[], fusionBaseStats: number[]): [number, number, number, number, number, number] {
    const HP = 0;
    const SPD = 5;
    const firstPickStatType = HP;

    const assignedStats = new Set<number>();
    const finalBaseStats = primaryBaseStats.slice(0);

    const firstPickValue = Math.max(primaryBaseStats[firstPickStatType], fusionBaseStats[firstPickStatType]);
    finalBaseStats[firstPickStatType] = firstPickValue;
    assignedStats.add(firstPickStatType);

    const primaryFullRanked: Array<{ value: number; stat: number }> = [];
    const fusionFullRanked: Array<{ value: number; stat: number }> = [];
    for (let s = 0; s < 6; s++) {
      primaryFullRanked.push({ value: primaryBaseStats[s], stat: s });
      fusionFullRanked.push({ value: fusionBaseStats[s], stat: s });
    }
    primaryFullRanked.sort((a, b) => b.value - a.value);
    fusionFullRanked.sort((a, b) => b.value - a.value);

    const allStatsEqual =
      primaryFullRanked.every(s => s.value === primaryFullRanked[0].value) &&
      fusionFullRanked.every(s => s.value === fusionFullRanked[0].value) &&
      primaryFullRanked[0].value === fusionFullRanked[0].value;

    let secondPickStat: number;
    let secondPickValue: number;

    if (allStatsEqual) {
      secondPickStat = firstPickStatType === HP ? SPD : HP;
      secondPickValue = primaryBaseStats[secondPickStat];
    } else {
      const primaryMax = primaryFullRanked[0].value;
      const fusionMax = fusionFullRanked[0].value;

      const primarySecondHighest = primaryFullRanked.find(s => s.value < primaryMax) || primaryFullRanked[1];
      const fusionSecondHighest = fusionFullRanked.find(s => s.value < fusionMax) || fusionFullRanked[1];

      const primarySecondIsNatureStat = primarySecondHighest.stat === firstPickStatType;
      const fusionSecondIsNatureStat = fusionSecondHighest.stat === firstPickStatType;

      const primaryThirdCandidate =
        primaryFullRanked.find(s => s.stat !== firstPickStatType && s.stat !== primaryFullRanked[0].stat) || null;
      const fusionThirdCandidate =
        fusionFullRanked.find(s => s.stat !== firstPickStatType && s.stat !== fusionFullRanked[0].stat) || null;

      if (primarySecondIsNatureStat && fusionSecondIsNatureStat) {
        const p = primaryThirdCandidate ?? primarySecondHighest;
        const f = fusionThirdCandidate ?? fusionSecondHighest;
        if (p.value > f.value) {
          secondPickStat = p.stat;
          secondPickValue = p.value;
        } else {
          secondPickStat = f.stat;
          secondPickValue = f.value;
        }
      } else if (primarySecondIsNatureStat) {
        const p = primaryThirdCandidate ?? primarySecondHighest;
        if (p.value > fusionSecondHighest.value) {
          secondPickStat = p.stat;
          secondPickValue = p.value;
        } else {
          secondPickStat = fusionSecondHighest.stat;
          secondPickValue = fusionSecondHighest.value;
        }
      } else if (fusionSecondIsNatureStat) {
        const f = fusionThirdCandidate ?? fusionSecondHighest;
        if (f.value > primarySecondHighest.value) {
          secondPickStat = f.stat;
          secondPickValue = f.value;
        } else {
          secondPickStat = primarySecondHighest.stat;
          secondPickValue = primarySecondHighest.value;
        }
      } else {
        if (primarySecondHighest.value > fusionSecondHighest.value) {
          secondPickStat = primarySecondHighest.stat;
          secondPickValue = primarySecondHighest.value;
        } else if (fusionSecondHighest.value > primarySecondHighest.value) {
          secondPickStat = fusionSecondHighest.stat;
          secondPickValue = fusionSecondHighest.value;
        } else {
          secondPickStat = primarySecondHighest.stat;
          secondPickValue = primarySecondHighest.value;
        }
      }

      if (secondPickStat === firstPickStatType) {
        const primaryThird = primaryFullRanked.find(s => s.stat !== firstPickStatType);
        const fusionThird = fusionFullRanked.find(s => s.stat !== firstPickStatType);
        if (primaryThird && fusionThird) {
          if (primaryThird.value > fusionThird.value) {
            secondPickStat = primaryThird.stat;
            secondPickValue = primaryThird.value;
          } else {
            secondPickStat = fusionThird.stat;
            secondPickValue = fusionThird.value;
          }
        }
      }
    }

    finalBaseStats[secondPickStat] = secondPickValue;
    assignedStats.add(secondPickStat);

    for (let s = 0; s < 6; s++) {
      if (!assignedStats.has(s)) {
        finalBaseStats[s] = Math.ceil((primaryBaseStats[s] + fusionBaseStats[s]) / 2);
      }
    }

    return [
      finalBaseStats[0],
      finalBaseStats[1],
      finalBaseStats[2],
      finalBaseStats[3],
      finalBaseStats[4],
      finalBaseStats[5]
    ];
  }

  private computeFusionTypes(primaryForm: any, fusionForm: any): [Type, Type | null] {
    const types: Type[] = [];
    const type1 = primaryForm?.type1 ?? Type.UNKNOWN;
    types.push(type1);
    if (fusionForm) {
      if (fusionForm.type2 !== null && fusionForm.type2 !== type1) {
        types.push(fusionForm.type2);
      } else if (fusionForm.type1 !== type1) {
        types.push(fusionForm.type1);
      }
    }
    if (types.length === 1 && primaryForm?.type2 !== null && primaryForm?.type2 !== undefined) {
      types.push(primaryForm.type2);
    }
    const t1 = types[0] ?? Type.UNKNOWN;
    const t2 = types[1] ?? null;
    return [t1, t2];
  }

  private getEvolutionSpeciesIds(speciesId: Species): Species[] {
    const evos = pokemonEvolutions[speciesId] || [];
    const ids = evos.map(e => e.speciesId).filter((n): n is Species => typeof n === "number");
    ids.sort((a, b) => (a as number) - (b as number));
    return ids;
  }

  private collectEvolutionClosure(start: Species): Species[] {
    const visited = new Set<number>();
    const out: Species[] = [];
    const queue: Species[] = [start];
    while (queue.length) {
      const cur = queue.shift()!;
      const key = cur as unknown as number;
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      out.push(cur);
      const next = this.getEvolutionSpeciesIds(cur);
      for (const n of next) {
        const nk = n as unknown as number;
        if (!visited.has(nk)) {
          queue.push(n);
        }
      }
    }
    return out;
  }

  private expandFusionEvolutionPairs(primaryId: Species, fusionId: Species): Array<[Species, Species]> {
    const pairs: Array<[Species, Species]> = [];
    const seen = new Set<string>();
    const add = (p: Species, f: Species) => {
      const k = `${p as unknown as number}:${f as unknown as number}`;
      if (seen.has(k)) {
        return;
      }
      seen.add(k);
      pairs.push([p, f]);
    };

    const primaryStages = this.collectEvolutionClosure(primaryId);
    for (const p of primaryStages) {
      add(p, fusionId);
    }

    const primaryLeaves = primaryStages.filter(p => this.getEvolutionSpeciesIds(p).length === 0);
    const leaves = primaryLeaves.length ? primaryLeaves : [primaryId];

    const fusionStages = this.collectEvolutionClosure(fusionId);
    for (const p of leaves) {
      for (const f of fusionStages) {
        add(p, f);
      }
    }

    return pairs;
  }

  private buildFusionRow(primaryId: Species, fusionId: Species, primaryFormIndex: number = 0, fusionFormIndex: number = 0): Extract<VoidexRow, { kind: "fusion" }> | null {
    if (primaryId === fusionId) {
      return null;
    }

    const gameData = this.scene.gameData;
    const primarySpecies = getPokemonSpecies(primaryId);
    const fusionSpecies = getPokemonSpecies(fusionId);
    if (!primarySpecies || !fusionSpecies) {
      return null;
    }

    const primaryForms = primarySpecies.forms && primarySpecies.forms.length > 0 ? primarySpecies.forms : null;
    const fusionForms = fusionSpecies.forms && fusionSpecies.forms.length > 0 ? fusionSpecies.forms : null;
    const primaryForm = primaryForms ? (primaryForms[primaryFormIndex] ?? primaryForms[0] ?? primarySpecies) : primarySpecies;
    const fusionForm = fusionForms ? (fusionForms[fusionFormIndex] ?? fusionForms[0] ?? fusionSpecies) : fusionSpecies;

    const fusedBaseStats = this.computeNeutralFusionBaseStats(primaryForm.baseStats, fusionForm.baseStats);
    const fusedTypes = this.computeFusionTypes(primaryForm, fusionForm);

    const bst = fusedBaseStats.reduce((t, v) => t + v, 0);
    const costRoot = primarySpecies.getRootSpeciesId(true);
    const cost = gameData ? gameData.getSpeciesStarterValue(costRoot) : 0;
    const compositeId = (primaryId as number) * 10000000 + (fusionId as number) * 100 + (primaryFormIndex * 10) + fusionFormIndex;
    const stats: RowStats = {
      id: compositeId,
      bst,
      hp: fusedBaseStats[0],
      atk: fusedBaseStats[1],
      def: fusedBaseStats[2],
      spa: fusedBaseStats[3],
      spd: fusedBaseStats[4],
      spe: fusedBaseStats[5],
      cost
    };

    let activeFusionAbilityName = "-";
    try {
      if (gameData) {
        const baseAbilityIndex = gameData.getStarterSpeciesDefaultAbilityIndex(primarySpecies);
        const hasHidden = fusionForm.abilityHidden !== Abilities.NONE;
        const hasAbility2 = fusionForm.ability2 !== Abilities.NONE && fusionForm.ability2 !== fusionForm.ability1;
        const fusionAbilityIndex = hasHidden ? baseAbilityIndex : (hasAbility2 ? (baseAbilityIndex === 2 ? 1 : baseAbilityIndex) : 0);
        const activeAbilityId = fusionForm.getAbility ? fusionForm.getAbility(fusionAbilityIndex) : fusionForm.ability1;
        activeFusionAbilityName = allAbilities[activeAbilityId]?.name ?? "-";
      }
    } catch {
      activeFusionAbilityName = "-";
    }

    const fusedName = getFusedSpeciesName(primarySpecies.getName(primaryFormIndex), fusionSpecies.getName(fusionFormIndex));
    const parts: string[] = [];
    parts.push(fusedName);
    parts.push(primarySpecies.getName(primaryFormIndex));
    parts.push(fusionSpecies.getName(fusionFormIndex));
    const t1 = Type[fusedTypes[0]];
    parts.push(t1);
    parts.push(i18next.t(`pokemonInfo:Type.${t1}` as const));
    if (fusedTypes[1] !== null) {
      const t2 = Type[fusedTypes[1]];
      parts.push(t2);
      parts.push(i18next.t(`pokemonInfo:Type.${t2}` as const));
    }
    parts.push(activeFusionAbilityName);
    const a1 = fusionForm.ability1 !== Abilities.NONE ? allAbilities[fusionForm.ability1]?.name : "-";
    const a2 = fusionForm.ability2 !== Abilities.NONE ? allAbilities[fusionForm.ability2]?.name : "-";
    const a3 = fusionForm.abilityHidden !== Abilities.NONE ? allAbilities[fusionForm.abilityHidden]?.name : "-";
    parts.push(a1 ?? "");
    parts.push(a2 ?? "");
    parts.push(a3 ?? "");
    const rootPassiveSpecies = primarySpecies.getRootSpeciesId(false);
    const passiveId = starterPassiveAbilities[rootPassiveSpecies];
    if (passiveId !== undefined) {
      parts.push(allAbilities[passiveId]?.name ?? "");
    }
    parts.push(String(stats.cost));
    parts.push(String(stats.bst));
    parts.push(String(stats.hp));
    parts.push(String(stats.atk));
    parts.push(String(stats.def));
    parts.push(String(stats.spa));
    parts.push(String(stats.spd));
    parts.push(String(stats.spe));

    const search = parts.join(" ").toLowerCase();

    return {
      kind: "fusion",
      primarySpeciesId: primaryId,
      fusionSpeciesId: fusionId,
      primaryFormIndex,
      fusionFormIndex,
      primarySpecies,
      fusionSpecies,
      fusedBaseStats,
      fusedTypes,
      activeFusionAbilityName,
      stats,
      search
    };
  }

  private buildFusionRows(): Extract<VoidexRow, { kind: "fusion" }>[] {
    const gameData = this.scene.gameData;
    if (!gameData || !gameData.starterData) {
      return [];
    }
    const rows: Extract<VoidexRow, { kind: "fusion" }>[] = [];
    const seenPairs = new Set<string>();

    const primaryIds = Object.keys(gameData.starterData)
      .map(k => parseInt(k, 10))
      .filter(n => Number.isFinite(n)) as Species[];

    for (const primaryId of primaryIds) {
      if (this.restrictedSpeciesIds && !this.restrictedSpeciesIds.has(primaryId)) {
        continue;
      }
      const starterEntry: any = (gameData.starterData as any)[primaryId];
      const obtained = starterEntry?.obtainedFusions as any;
      if (!Array.isArray(obtained) || obtained.length === 0) {
        continue;
      }
      const primarySpecies = getPokemonSpecies(primaryId);
      if (!primarySpecies) {
        continue;
      }

      for (const fusionIdRaw of obtained) {
        if (typeof fusionIdRaw !== "number") {
          continue;
        }
        const fusionId = fusionIdRaw as Species;
        const pairs = this.expandFusionEvolutionPairs(primaryId, fusionId);
        for (const [p, f] of pairs) {
          const primarySpecies2 = getPokemonSpecies(p);
          const fusionSpecies2 = getPokemonSpecies(f);
          const primaryFormCount = primarySpecies2?.forms && primarySpecies2.forms.length > 0 ? primarySpecies2.forms.length : 1;
          const fusionFormCount = fusionSpecies2?.forms && fusionSpecies2.forms.length > 0 ? fusionSpecies2.forms.length : 1;
          const primaryFormIndexes = new Array(primaryFormCount).fill(0).map((_, i) => i).filter(i => !this.isLockedForm(primarySpecies2, i));
          const fusionFormIndexes = new Array(fusionFormCount).fill(0).map((_, i) => i).filter(i => !this.isLockedForm(fusionSpecies2, i));
          const primaryIter = primaryFormIndexes.length ? primaryFormIndexes : [0];
          const fusionIter = fusionFormIndexes.length ? fusionFormIndexes : [0];
          for (const pf of primaryIter) {
            for (const ff of fusionIter) {
              const key = `${p as unknown as number}:${f as unknown as number}:${pf}:${ff}`;
              if (seenPairs.has(key)) {
                continue;
              }
              seenPairs.add(key);
              const row = this.buildFusionRow(p, f, pf, ff);
              if (row) {
                rows.push(row);
              }
            }
          }
        }
      }
    }

    return rows;
  }

  private getUniversalSearchBlob(form: UniversalSmittyForm, stats: RowStats): string {
    const parts: string[] = [];
    parts.push(form.formName);
    const t1 = form.primaryType !== null ? Type[form.primaryType] : Type[Type.UNKNOWN];
    parts.push(t1);
    parts.push(i18next.t(`pokemonInfo:Type.${t1}` as const));
    if (form.secondaryType !== null) {
      const t2 = Type[form.secondaryType];
      parts.push(t2);
      parts.push(i18next.t(`pokemonInfo:Type.${t2}` as const));
    }
    const a1 = form.ability1 !== Abilities.NONE ? allAbilities[form.ability1]?.name : "-";
    const a2 = form.ability2 !== Abilities.NONE ? allAbilities[form.ability2]?.name : "-";
    const a3 = form.abilityHidden !== Abilities.NONE ? allAbilities[form.abilityHidden]?.name : "-";
    parts.push(a1 ?? "");
    parts.push(a2 ?? "");
    parts.push(a3 ?? "");
    parts.push(String(stats.bst));
    parts.push(String(stats.hp));
    parts.push(String(stats.atk));
    parts.push(String(stats.def));
    parts.push(String(stats.spa));
    parts.push(String(stats.spd));
    parts.push(String(stats.spe));
    return parts.join(" ").toLowerCase();
  }

  private getRowStats(species: PokemonSpecies, form: any): RowStats {
    const bst = form.baseTotal ?? species.baseTotal;
    const baseStats = form.baseStats ?? species.baseStats;
    const costRoot = species.getRootSpeciesId(true);
    const cost = this.scene.gameData ? this.scene.gameData.getSpeciesStarterValue(costRoot) : 0;
    return {
      id: species.speciesId,
      bst,
      hp: baseStats[0],
      atk: baseStats[1],
      def: baseStats[2],
      spa: baseStats[3],
      spd: baseStats[4],
      spe: baseStats[5],
      cost
    };
  }

  private getSearchBlob(target: VoidexTarget, species: PokemonSpecies, formIndex: number, form: any, stats: RowStats): string {
    const parts: string[] = [];
    const name = species.getName(formIndex);
    parts.push(name);
    const t1 = Type[form.type1];
    parts.push(t1);
    parts.push(i18next.t(`pokemonInfo:Type.${t1}` as const));
    if (form.type2 !== null) {
      const t2 = Type[form.type2];
      parts.push(t2);
      parts.push(i18next.t(`pokemonInfo:Type.${t2}` as const));
    }
    const abIds = [form.ability1, form.ability2, form.abilityHidden].filter(a => a !== Abilities.NONE) as Abilities[];
    for (const a of abIds) {
      parts.push(allAbilities[a]?.name ?? "");
    }
    const rootPassiveSpecies = species.getRootSpeciesId(false);
    const passiveId = starterPassiveAbilities[rootPassiveSpecies];
    if (passiveId !== undefined) {
      parts.push(allAbilities[passiveId]?.name ?? "");
    }
    if (target.bucket === "party") parts.push("party");
    if (target.bucket === "enemy") parts.push("enemy");
    if (target.bucket === "modifier") parts.push("modifier");
    if (target.kind === "evolution") parts.push("evolution");
    parts.push(String(stats.cost));
    parts.push(String(stats.bst));
    return parts.join(" ").toLowerCase();
  }

  private applyFilterAndSort(resetCursor: boolean): void {
    if (this.viewMode === "rivals") {
      this.rows = this.buildRivalRows();
      if (resetCursor) {
        this.cursorIndex = 0;
        this.scrollOffset = 0;
        this.rivalOfferIndex = 0;
      }
      this.ensureCursorVisible(true);
      return;
    }
    if (this.viewMode === "smittyFoes") {
      this.rows = [];
      if (resetCursor) {
        this.cursorIndex = 0;
        this.scrollOffset = 0;
        this.smittyFoesSelectedIndex = 0;
      }
      return;
    }
    if (this.viewMode === "shiniesV1" || this.viewMode === "shiniesV2" || this.viewMode === "shiniesV3") {
      this.rows = [];
      if (resetCursor) {
        this.cursorIndex = 0;
        this.scrollOffset = 0;
        this.shiniesSelectedIndex = 0;
      }
      this.buildOrRefreshShiniesGrid();
      return;
    }
    if (this.viewMode === "fusions") {
      const q = (this.searchQuery ?? "").trim().toLowerCase();
      let fusionRows = this.buildFusionRows();
      if (q) {
        fusionRows = fusionRows.filter(r => r.search.includes(q));
      }

      const sortKey = this.sortKey;
      const sortMultiplier = this.sortDir === "desc" ? -1 : 1;
      const getVal = (r: Extract<VoidexRow, { kind: "fusion" }>): number => {
        switch (sortKey) {
        case "id": return r.stats.id;
        case "bst": return r.stats.bst;
        case "hp": return r.stats.hp;
        case "atk": return r.stats.atk;
        case "def": return r.stats.def;
        case "spa": return r.stats.spa;
        case "spd": return r.stats.spd;
        case "spe": return r.stats.spe;
        case "cost": return r.stats.cost;
        default: return r.stats.id;
        }
      };
      fusionRows.sort((a, b) => {
        const av = getVal(a);
        const bv = getVal(b);
        if (av !== bv) return (av < bv ? -1 : 1) * sortMultiplier;
        if (a.primarySpeciesId !== b.primarySpeciesId) return (a.primarySpeciesId as number) - (b.primarySpeciesId as number);
        if (a.primaryFormIndex !== b.primaryFormIndex) return a.primaryFormIndex - b.primaryFormIndex;
        if (a.fusionSpeciesId !== b.fusionSpeciesId) return (a.fusionSpeciesId as number) - (b.fusionSpeciesId as number);
        if (a.fusionFormIndex !== b.fusionFormIndex) return a.fusionFormIndex - b.fusionFormIndex;
        return 0;
      });

      this.rows = fusionRows;
      if (resetCursor) {
        this.cursorIndex = 0;
        this.scrollOffset = 0;
      } else {
        this.ensureCursorVisible(true);
      }
      return;
    }

    const q = (this.searchQuery ?? "").trim().toLowerCase();
    const buckets: Record<Bucket, ListRow[]> = { modifier: [], party: [], enemy: [], other: [] };
    for (const r of this.allRows) {
      if (this.viewMode === "pokemonGlitch") {
        if (r.kind !== "speciesForm") {
          continue;
        }
        const forms = r.species.forms || [];
        const form = forms.length ? forms[r.formIndex] : r.species;
        const fk = (form as any)?.formKey as string | undefined;
        if (!fk || !fk.includes("glitch")) {
          continue;
        }
      } else if (this.viewMode === "pokemonSmitty") {
        if (r.kind === "speciesForm") {
          const forms = r.species.forms || [];
          const form = forms.length ? forms[r.formIndex] : r.species;
          const fk = (form as any)?.formKey as string | undefined;
          if (!fk || !fk.includes("smitty")) {
            continue;
          }
        }
      }

      if (!q || r.search.includes(q)) {
        const bucket =
          r.kind === "speciesForm"
            ? r.target.bucket
            : (r.kind === "universalSmitty" && this.isCurrentEnemyUniversalSmittyFormName(r.formName) ? "enemy" : "other");
        buckets[bucket].push(r);
      }
    }

    const sortKey = this.sortKey;
    const isCategoryKey = sortKey === "caught";
    const sortMultiplier = this.sortDir === "desc" ? -1 : 1;
    const isGlitchSmittyView = this.viewMode === "pokemonGlitch" || this.viewMode === "pokemonSmitty";
    const getUnlockedRankForGlitchSmittyView = (r: ListRow): number => {
      if (!isGlitchSmittyView) {
        return 0;
      }
      if (!this.scene.gameData) {
        return 1;
      }
      if (r.kind === "universalSmitty") {
        return this.scene.gameData.isUniSmittyFormUnlocked(r.formName) ? 1 : 0;
      }
      if (r.kind === "speciesForm") {
        return this.isLockedForm(r.species, r.formIndex) ? 0 : 1;
      }
      return 1;
    };
    const getCategoryRank = (r: ListRow): number => {
      if (!this.scene.gameData) {
        return 0;
      }
      if (r.kind !== "speciesForm") {
        return 0;
      }
      const entry: any = (this.scene.gameData as any).dexData?.[r.species.speciesId];
      return entry?.caughtAttr ? 1 : 0;
    };
    const cmp = (a: ListRow, b: ListRow) => {
      if (isGlitchSmittyView) {
        const au = getUnlockedRankForGlitchSmittyView(a);
        const bu = getUnlockedRankForGlitchSmittyView(b);
        if (au !== bu) return bu - au;
      }
      if (isCategoryKey) {
        const av = getCategoryRank(a);
        const bv = getCategoryRank(b);
        if (av !== bv) return (av < bv ? -1 : 1) * sortMultiplier;
      } else {
        if (sortKey === "id" && a.kind === "speciesForm" && b.kind === "speciesForm") {
          const aRoot = a.species.getRootSpeciesId(false) as number;
          const aFirstEvo = pokemonEvolutions[aRoot]?.[0]?.speciesId as number | undefined;
          const aGroupKey = aFirstEvo !== undefined ? Math.min(aRoot, aFirstEvo) : aRoot;
          const bRoot = b.species.getRootSpeciesId(false) as number;
          const bFirstEvo = pokemonEvolutions[bRoot]?.[0]?.speciesId as number | undefined;
          const bGroupKey = bFirstEvo !== undefined ? Math.min(bRoot, bFirstEvo) : bRoot;
          if (aGroupKey !== bGroupKey) return (aGroupKey < bGroupKey ? -1 : 1) * sortMultiplier;
          let aDepth = 0;
          let aCur = a.species.speciesId as number;
          while (pokemonPrevolutions.hasOwnProperty(aCur)) { aCur = pokemonPrevolutions[aCur]; aDepth++; }
          let bDepth = 0;
          let bCur = b.species.speciesId as number;
          while (pokemonPrevolutions.hasOwnProperty(bCur)) { bCur = pokemonPrevolutions[bCur]; bDepth++; }
          if (aDepth !== bDepth) return (aDepth - bDepth) * sortMultiplier;
        } else {
          const av = a.stats[sortKey as keyof RowStats];
          const bv = b.stats[sortKey as keyof RowStats];
          if (av !== bv) return (av < bv ? -1 : 1) * sortMultiplier;
        }
      }
      if (a.kind === "speciesForm" && b.kind === "speciesForm") {
        if (a.species.speciesId !== b.species.speciesId) return a.species.speciesId - b.species.speciesId;
        if (a.formIndex !== b.formIndex) return a.formIndex - b.formIndex;
        const an = a.species.getName(a.formIndex);
        const bn = b.species.getName(b.formIndex);
        if (an !== bn) return an.localeCompare(bn);
      } else if (a.kind === "universalSmitty" && b.kind === "universalSmitty") {
        const an = a.formName;
        const bn = b.formName;
        if (an !== bn) return an.localeCompare(bn);
      } else {
        return a.kind === "speciesForm" ? -1 : 1;
      }
      return 0;
    };

    buckets.modifier.sort(cmp);
    buckets.party.sort(cmp);
    buckets.enemy.sort(cmp);
    if (!this.restrictedSpeciesIds) {
      buckets.other.sort(cmp);
    }

    if (this.viewMode === "pokemonAll") {
      const addFusionToBucket = (bucket: Bucket, primarySpeciesId: Species, fusionSpeciesId: Species) => {
        const row = this.buildFusionRow(primarySpeciesId, fusionSpeciesId);
        if (!row) {
          return;
        }
        if (q && !row.search.includes(q)) {
          return;
        }
        buckets[bucket].unshift(row);
      };

      if (this.restrictedSpeciesIds) {
        const gameData = this.scene.gameData;
        for (const primaryId of this.restrictedSpeciesIds) {
          const obtained = gameData?.starterData?.[primaryId]?.obtainedFusions;
          if (!Array.isArray(obtained) || obtained.length === 0) continue;
          for (const fusionIdRaw of obtained) {
            if (typeof fusionIdRaw !== "number") continue;
            const pairs = this.expandFusionEvolutionPairs(primaryId, fusionIdRaw as Species);
            for (const [pId, fId] of pairs) {
              addFusionToBucket("other", pId, fId);
            }
          }
        }
      } else {
        if (this.scene.currentBattle) {
          const party = this.scene.getParty();
          party?.forEach((p) => {
            if (p && p.isFusion() && p.fusionSpecies) {
              const rootPrimary = p.species.getRootSpeciesId(true) as Species;
              const rootFusion = p.fusionSpecies.getRootSpeciesId(true) as Species;
              const pairs = this.expandFusionEvolutionPairs(rootPrimary, rootFusion);
              for (const [pId, fId] of pairs) {
                  addFusionToBucket("party", pId, fId);
              }
            }
          });

          const currentPhase = this.scene.getCurrentPhase();
          if (currentPhase?.constructor?.name === "CommandPhase") {
            const enemy = this.scene.getEnemyField();
            enemy?.forEach((e) => {
              if (e && e.isFusion() && e.fusionSpecies) {
                const rootPrimary = e.species.getRootSpeciesId(true) as Species;
                const rootFusion = e.fusionSpecies.getRootSpeciesId(true) as Species;
                const pairs = this.expandFusionEvolutionPairs(rootPrimary, rootFusion);
                for (const [pId, fId] of pairs) {
                  addFusionToBucket("enemy", pId, fId);
                }
              }
            });
          }
        }

        const modifierFusions = this.getModifierFusions();
        modifierFusions.forEach(f => {
          const pairs = this.expandFusionEvolutionPairs(f.primarySpeciesId, f.fusionSpeciesId);
          for (const [pId, fId] of pairs) {
            addFusionToBucket("modifier", pId, fId);
          }
        });
      }
    }

    const currentPhase = this.scene.getCurrentPhase();
    const isCommandPhase = !!this.scene.currentBattle && currentPhase?.constructor?.name === "CommandPhase";

    this.rows = ([] as VoidexRow[]).concat(
      buckets.modifier,
      ...(isCommandPhase ? [buckets.enemy, buckets.party] : [buckets.party, buckets.enemy]),
      buckets.other
    );

    if (resetCursor) {
      this.cursorIndex = 0;
      this.scrollOffset = 0;
    } else {
      this.ensureCursorVisible(true);
    }
  }

  private getSmittyFoeFrameNames(): string[] {
    if (!this.scene.textures.exists("smitty_trainers")) {
      return [];
    }
    const texture = this.scene.textures.get("smitty_trainers");
    const frames = texture.getFrameNames()
      .filter(f => {
        const m = f.match(/\d+/);
        if (!m) return false;
        const n = parseInt(m[0], 10);
        return Number.isFinite(n) && n > 0;
      })
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
        const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
        return na - nb;
      });
    return frames;
  }

  private buildOrRefreshSmittyFoesGrid(): void {
    if (!this.smittyFoesGrid) {
      return;
    }
    const width = this.viewWidth;
    const height = this.scene.game.canvas.height / 6;
    const listY = this.list?.y ?? 34;
    const availableHeight = Math.max(0, height - listY - 2);

    const defeated = new Set<string>(this.scene.gameData?.defeatedSmittyFoes ?? []);
    const frames = this.getSmittyFoeFrameNames();
    frames.sort((a, b) => {
      const da = defeated.has(a) ? 1 : 0;
      const db = defeated.has(b) ? 1 : 0;
      if (da !== db) return db - da;
      const na = parseInt(a.match(/\d+/)?.[0] || "0", 10);
      const nb = parseInt(b.match(/\d+/)?.[0] || "0", 10);
      return na - nb;
    });
    this.smittyFoesGridFrames = frames;
    const total = frames.length;
    if (!total) {
      this.smittyFoesGrid.removeAll(true);
      this.smittyFoesGridTiles = [];
      this.smittyFoesGridVisibleCount = 0;
      return;
    }
    const maxIndex = total - 1;
    this.smittyFoesSelectedIndex = Math.max(0, Math.min(maxIndex, this.smittyFoesSelectedIndex));

    const gap = 8;
    const minTile = 60;
    const rows = 2;
    let cols = Math.floor((width - 12 + gap) / (minTile + gap));
    cols = Math.max(2, Math.min(5, cols));
    let tileSize = Math.floor((width - 12 - (cols - 1) * gap) / cols);
    while (cols > 2 && tileSize < minTile) {
      cols--;
      tileSize = Math.floor((width - 12 - (cols - 1) * gap) / cols);
    }
    tileSize = Math.max(minTile, tileSize);
    const maxTileByHeight = Math.floor((availableHeight - (rows - 1) * gap) / rows);
    if (Number.isFinite(maxTileByHeight) && maxTileByHeight > 0) {
      tileSize = Math.min(tileSize, maxTileByHeight);
    }
    tileSize = Math.max(1, tileSize);
    const visibleCount = Math.max(1, cols * rows);
    this.smittyFoesGridCols = cols;

    const page = Math.floor(this.smittyFoesSelectedIndex / visibleCount);
    const startIndex = page * visibleCount;

    const needsRebuild = this.smittyFoesGridVisibleCount !== visibleCount || this.smittyFoesGridTiles.length !== visibleCount;
    if (needsRebuild) {
      this.smittyFoesGrid.removeAll(true);
      this.smittyFoesGridTiles = [];
      this.smittyFoesGridVisibleCount = visibleCount;

      const gridW = cols * tileSize + (cols - 1) * gap;
      const gridH = rows * tileSize + (rows - 1) * gap;
      const left = Math.floor((width - gridW) / 2);
      const top = Math.floor(Math.max(0, (availableHeight - gridH) / 2));
      const iconScale = 0.30;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = left + c * (tileSize + gap) + Math.floor(tileSize / 2);
          const y = top + r * (tileSize + gap) + Math.floor(tileSize / 2);
          const bg = this.scene.add.nineslice(x, y, "type_bgs", "unknown", tileSize, tileSize, 2, 2, 2, 2);
          bg.setOrigin(0.5, 0.5);
          const border = this.scene.add.rectangle(x, y, tileSize + 4, tileSize + 4, 0x000000, 0);
          border.setOrigin(0.5, 0.5);
          border.setStrokeStyle(3, 0xffffff, 0.25);
          const icon = this.scene.add.sprite(x, y - Math.floor(tileSize * 0.12), "smitty_trainers");
          icon.setOrigin(0.5, 0.5);
          icon.setScale(iconScale);
          const label = addTextObject(this.scene, x, y + Math.floor(tileSize * 0.33), "-", TextStyle.WINDOW, { fontSize: "38px", align: "center" });
          label.setOrigin(0.5, 0.5);
          if (label.scaleX) {
            label.setStyle({ ...(label.style as any), wordWrap: { width: (tileSize - 6) / label.scaleX, useAdvancedWrap: true } });
          }
          this.smittyFoesGrid.add([bg, border, icon, label]);
          this.smittyFoesGridTiles.push({ bg, border, icon, label, frame: null });
        }
      }
    }

    for (let i = 0; i < this.smittyFoesGridTiles.length; i++) {
      const tile = this.smittyFoesGridTiles[i];
      const idx = startIndex + i;
      const frameName = frames[idx] ?? null;
      tile.frame = frameName;
      if (!frameName) {
        tile.bg.setVisible(false);
        tile.border.setVisible(false);
        tile.icon.setVisible(false);
        tile.label.setVisible(false);
        continue;
      }
      tile.bg.setVisible(true);
      tile.border.setVisible(true);
      tile.icon.setVisible(true);
      tile.label.setVisible(true);
      tile.bg.setFrame("unknown");
      tile.icon.setTexture("smitty_trainers");
      tile.icon.setFrame(frameName);
      const n = parseInt(frameName.match(/\d+/)?.[0] || "0", 10);
      tile.label.setText(i18next.t("pokedex:smittyFoeName", { n }));
      const isDefeated = defeated.has(frameName);
      if (!isDefeated) {
        tile.icon.setTintFill(0x000000);
        tile.icon.setAlpha(0.85);
      } else {
        tile.icon.clearTint();
        tile.icon.setAlpha(1);
      }
      const isSelected = (startIndex + i) === this.smittyFoesSelectedIndex;
      tile.border.setStrokeStyle(3, 0xffffff, isSelected ? 1 : 0.25);
    }
  }

  private getShinyVariantForViewMode(): number {
    if (this.viewMode === "shiniesV2") return 1;
    if (this.viewMode === "shiniesV3") return 2;
    return 0;
  }

  private buildOrRefreshShiniesGrid(): void {
    if (!this.shiniesGrid) {
      return;
    }
    if (!this.scene.gameData) {
      this.shiniesGrid.removeAll(true);
      this.shiniesGridTiles = [];
      this.shiniesGridEntries = [];
      this.shiniesGridVisibleCount = 0;
      this.shiniesGridLastTileSize = 0;
      return;
    }

    const width = this.viewWidth;
    const height = this.scene.game.canvas.height / 6;
    const listY = this.list?.y ?? 34;
    const availableHeight = Math.max(0, height - listY - 2);

    const cols = 6;
    const rows = 3;
    this.shiniesGridCols = cols;
    const gap = 6;
    const minTile = 36;
    const maxTileByWidth = Math.floor((width - 12 - (cols - 1) * gap) / cols);
    const maxTileByHeight = Math.floor((availableHeight - (rows - 1) * gap) / rows);
    const tileSize = Math.max(1, Math.max(minTile, Math.min(maxTileByWidth, maxTileByHeight)));
    const visibleCount = cols * rows;

    const variant = this.getShinyVariantForViewMode();
    const q = (this.searchQuery ?? "").trim().toLowerCase();
    const dexKeys = Object.keys(this.scene.gameData.dexData);
    const speciesIds = dexKeys.map(k => parseInt(k, 10)).filter(n => Number.isFinite(n)) as Species[];
    speciesIds.sort((a, b) => (a as number) - (b as number));

    const entries: { speciesId: Species; formIndex: number; caught: boolean }[] = [];
    for (const sid of speciesIds) {
      const species = getPokemonSpecies(sid);
      if (!species) {
        continue;
      }
      const form: any = species.forms && species.forms.length > 0 ? species.forms[0] : species;
      if (q) {
        const stats = this.getRowStats(species, form);
        const blob = this.getSearchBlob({ bucket: "other", kind: "species", speciesId: sid }, species, 0, form, stats);
        if (!blob.includes(q) && !String(sid).includes(q)) {
          continue;
        }
      }
      const dexEntry: any = (this.scene.gameData as any).dexData?.[sid];
      const attr: bigint = dexEntry?.caughtAttr ?? 0n;
      const hasShiny = !!(attr & DexAttr.SHINY);
      const caught =
        hasShiny &&
        (variant === 0 ? !!(attr & DexAttr.DEFAULT_VARIANT) : variant === 1 ? !!(attr & DexAttr.VARIANT_2) : !!(attr & DexAttr.VARIANT_3));
      entries.push({ speciesId: sid, formIndex: 0, caught });
    }
    entries.sort((a, b) => {
      const ac = a.caught ? 1 : 0;
      const bc = b.caught ? 1 : 0;
      if (ac !== bc) return bc - ac;
      return (a.speciesId as number) - (b.speciesId as number);
    });
    this.shiniesGridEntries = entries;

    const total = entries.length;
    if (!total) {
      this.shiniesGrid.removeAll(true);
      this.shiniesGridTiles = [];
      this.shiniesGridVisibleCount = 0;
      this.shiniesGridLastTileSize = 0;
      return;
    }
    const maxIndex = total - 1;
    this.shiniesSelectedIndex = Math.max(0, Math.min(maxIndex, this.shiniesSelectedIndex));

    const page = Math.floor(this.shiniesSelectedIndex / visibleCount);
    const startIndex = page * visibleCount;

    const needsRebuild =
      this.shiniesGridVisibleCount !== visibleCount ||
      this.shiniesGridTiles.length !== visibleCount ||
      this.shiniesGridLastTileSize !== tileSize;
    if (needsRebuild) {
      this.shiniesGrid.removeAll(true);
      this.shiniesGridTiles = [];
      this.shiniesGridVisibleCount = visibleCount;
      this.shiniesGridLastTileSize = tileSize;

      const gridW = cols * tileSize + (cols - 1) * gap;
      const gridH = rows * tileSize + (rows - 1) * gap;
      const left = Math.floor((width - gridW) / 2);
      const top = Math.floor(Math.max(0, (availableHeight - gridH) / 2));
      const iconScale = tileSize / 86;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = left + c * (tileSize + gap) + Math.floor(tileSize / 2);
          const y = top + r * (tileSize + gap) + Math.floor(tileSize / 2);
          const bg = this.scene.add.nineslice(x, y, "type_bgs", "unknown", tileSize, tileSize, 2, 2, 2, 2);
          bg.setOrigin(0.5, 0.5);
          const border = this.scene.add.rectangle(x, y, tileSize + 4, tileSize + 4, 0x000000, 0);
          border.setOrigin(0.5, 0.5);
          border.setStrokeStyle(3, 0xffffff, 0.25);
          const icon = this.scene.add.sprite(x, y - Math.floor(tileSize * 0.08), "pokemon_icons_1");
          icon.setOrigin(0.5, 0.5);
          icon.setScale(iconScale);
          const label = addTextObject(this.scene, x, y + Math.floor(tileSize * 0.33), "-", TextStyle.WINDOW, { fontSize: "34px", align: "center" });
          label.setOrigin(0.5, 0.5);
          if (label.scaleX) {
            label.setStyle({ ...(label.style as any), wordWrap: { width: (tileSize - 6) / label.scaleX, useAdvancedWrap: true } });
          }
          this.shiniesGrid.add([bg, border, icon, label]);
          this.shiniesGridTiles.push({ bg, border, icon, label, speciesId: null });
        }
      }
    }

    for (let i = 0; i < this.shiniesGridTiles.length; i++) {
      const tile = this.shiniesGridTiles[i];
      const idx = startIndex + i;
      const entry = entries[idx];
      if (!entry) {
        tile.bg.setVisible(false);
        tile.border.setVisible(false);
        tile.icon.setVisible(false);
        tile.label.setVisible(false);
        tile.speciesId = null;
        continue;
      }

      const species = getPokemonSpecies(entry.speciesId);
      if (!species) {
        tile.bg.setVisible(false);
        tile.border.setVisible(false);
        tile.icon.setVisible(false);
        tile.label.setVisible(false);
        tile.speciesId = null;
        continue;
      }

      const form: any = species.forms && species.forms.length > 0 ? species.forms[entry.formIndex] : species;
      const type1 = form.type1 ?? Type.UNKNOWN;
      tile.bg.setVisible(true);
      tile.border.setVisible(true);
      tile.icon.setVisible(true);
      tile.label.setVisible(true);
      tile.bg.setFrame(Type[type1].toLowerCase());

      const iconAtlasKey = (form as any).getIconAtlasKey(entry.formIndex, true, variant) as string;
      const iconId = (form as any).getIconId(false, entry.formIndex, true, variant) as string;
      tile.icon.setTexture(iconAtlasKey);
      if (!iconAtlasKey.startsWith("pokemon_icons_mod_")) {
        tile.icon.setFrame(iconId);
      }

      const displayName = species.getName(entry.formIndex);
      tile.label.setText(displayName);
      let truncated = displayName;
      const maxNameWidth = tile.bg.width - 4;
      while (tile.label.displayWidth > maxNameWidth && truncated.length > 1) {
        truncated = truncated.slice(0, -1);
        tile.label.setText(truncated + "…");
      }

      if (!entry.caught) {
        tile.icon.setTintFill(0x000000);
        tile.icon.setAlpha(0.85);
      } else {
        tile.icon.clearTint();
        tile.icon.setAlpha(1);
      }

      const isSelected = idx === this.shiniesSelectedIndex;
      tile.border.setStrokeStyle(3, 0xffffff, isSelected ? 1 : 0.25);
      tile.speciesId = entry.speciesId;
    }
  }

  private buildSmittyFoeRows(): VoidexRow[] {
    const frames = this.getSmittyFoeFrameNames();
    const cols = Math.max(1, this.smittyFoeCols | 0);
    const rows: VoidexRow[] = [];
    for (let i = 0; i < frames.length; i += cols) {
      rows.push({ kind: "smittyFoesRow", frames: frames.slice(i, i + cols) });
    }
    return rows;
  }

  private resolveGlitchFormTarget(speciesId: Species, rewardType: RewardType, visited?: Set<number>): { speciesId: Species; formIndex: number } | null {
    const formKeyMap: Partial<Record<RewardType, SpeciesFormKey>> = {
      [RewardType.GLITCH_FORM_A]: SpeciesFormKey.GLITCH,
      [RewardType.GLITCH_FORM_B]: SpeciesFormKey.GLITCH_B,
      [RewardType.GLITCH_FORM_C]: SpeciesFormKey.GLITCH_C,
      [RewardType.GLITCH_FORM_D]: SpeciesFormKey.GLITCH_D,
      [RewardType.GLITCH_FORM_E]: SpeciesFormKey.GLITCH_E
    };
    const targetFormKey = formKeyMap[rewardType];
    if (!targetFormKey) {
      return null;
    }
    const seen = visited ?? new Set<number>();
    if (seen.has(speciesId as number)) {
      return null;
    }
    seen.add(speciesId as number);
    const species = getPokemonSpecies(speciesId);
    const forms = species.forms || [];
    const idx = forms.findIndex(f => (f as any)?.formKey === targetFormKey);
    if (idx >= 0) {
      return { speciesId, formIndex: idx };
    }
    const evolutions = pokemonEvolutions[speciesId] || [];
    for (const evo of evolutions) {
      const es = evo.speciesId as Species;
      const found = this.resolveGlitchFormTarget(es, rewardType, seen);
      if (found) {
        return found;
      }
    }
    return null;
  }

  private getSignatureSpeciesIdForRival(rivalType: number): Species {
    const pools = (trainerPokemonPools as any)[rivalType] as Species[][] | undefined;
    const s = pools?.[0]?.[0];
    if (typeof s === "number") {
      return s as Species;
    }
    return Species.BULBASAUR;
  }

  private buildRivalOffers(questIds: QuestUnlockables[]): RivalOffer[] {
    const gameData = this.scene.gameData;
    if (!gameData) {
      return [];
    }
    const offers: RivalOffer[] = [];
    for (const questId of questIds) {
      let questUnlockData: any;
      try {
        questUnlockData = gameData.getQuestUnlockDataFromModifierTypes(questId);
      } catch {
        continue;
      }
      const rewardType = questUnlockData?.rewardType as RewardType | undefined;
      if (rewardType !== RewardType.GLITCH_FORM_A &&
          rewardType !== RewardType.GLITCH_FORM_B &&
          rewardType !== RewardType.GLITCH_FORM_C &&
          rewardType !== RewardType.GLITCH_FORM_D &&
          rewardType !== RewardType.GLITCH_FORM_E) {
        continue;
      }
      const rewardId: any = questUnlockData?.rewardId;
      const speciesIds: Species[] = [];
      if (Array.isArray(rewardId)) {
        for (const rid of rewardId) {
          if (typeof rid === "number" && getPokemonSpecies(rid as Species)) {
            speciesIds.push(rid as Species);
          }
        }
      } else if (typeof rewardId === "number" && getPokemonSpecies(rewardId as Species)) {
        speciesIds.push(rewardId as Species);
      }
      for (const rid of speciesIds) {
        const resolved = this.resolveGlitchFormTarget(rid, rewardType);
        if (!resolved) {
          continue;
        }
        const ds = getPokemonSpecies(resolved.speciesId);
        const forms = ds.forms || [];
        const form = forms.length ? forms[resolved.formIndex] : ds;
        const primaryType = form.type1;
        const unlocked = gameData.canUseGlitchOrSmittyForm(rid as Species, rewardType);
        offers.push({
          rewardSpeciesId: rid as Species,
          displaySpeciesId: resolved.speciesId,
          displayFormIndex: resolved.formIndex,
          rewardType,
          primaryType,
          unlocked
        });
      }
    }
    offers.sort((a, b) => {
      const au = a.unlocked ? 1 : 0;
      const bu = b.unlocked ? 1 : 0;
      if (au !== bu) return bu - au;
      return (a.displaySpeciesId as number) - (b.displaySpeciesId as number);
    });
    return offers;
  }

  private ensureRivalTrainerTextures(rivalTypes: number[]): void {
    const loader = this.scene.load;
    if (loader.isLoading()) {
      return;
    }
    const toLoad: string[] = [];
    for (const rt of rivalTypes) {
      const config: any = (trainerConfigs as any)[rt];
      if (!config) continue;
      const spriteKey = config.getSpriteKey(false, false);
      if (spriteKey && !this.scene.textures.exists(spriteKey)) {
        toLoad.push(spriteKey);
      }
    }
    const unique = Array.from(new Set(toLoad));
    if (!unique.length) {
      return;
    }
    for (const spriteKey of unique) {
      loader.atlas(spriteKey, `images/trainer/${spriteKey}.png`, `images/trainer/${spriteKey}.json`);
    }
    loader.once(Phaser.Loader.Events.COMPLETE, () => {
      if (this.viewMode === "rivals") {
        this.refreshViews();
      }
    });
    loader.start();
  }

  private buildRivalRows(): VoidexRow[] {
    const gameData = this.scene.gameData;
    const rivalTypes = getAllRivalTrainerTypes().map(v => Number(v));
    this.ensureRivalTrainerTextures(rivalTypes);
    const stage2Unlocked = !!gameData && !!gameData.unlocks?.[Unlockables.NIGHTMARE_MODE];
    const rows: VoidexRow[] = [];
    for (const rt of rivalTypes) {
      const defeated = !!gameData && gameData.defeatedRivals.includes(rt as any);
      const sigSpeciesId = this.getSignatureSpeciesIdForRival(rt);
      const sigSpecies = getPokemonSpecies(sigSpeciesId);
      const sigType = sigSpecies.type1;
      const q1 = ((rivalQuestMap as any)[rt] ?? []) as QuestUnlockables[];
      const q2 = ((rivalStageTwoQuestMap as any)[rt] ?? []) as QuestUnlockables[];
      const offersStage1 = this.buildRivalOffers(q1);
      const offersStage2 = stage2Unlocked ? this.buildRivalOffers(q2) : [];
      rows.push({
        kind: "rival",
        rivalType: rt,
        defeated,
        signatureSpeciesId: sigSpeciesId,
        signatureType: sigType,
        offersStage1,
        offersStage2
      });
    }
    rows.sort((a, b) => {
      if (a.kind !== "rival" || b.kind !== "rival") return 0;
      const ad = a.defeated ? 1 : 0;
      const bd = b.defeated ? 1 : 0;
      if (ad !== bd) return bd - ad;
      return (a.rivalType as number) - (b.rivalType as number);
    });
    return rows;
  }

  private buildTargets(): VoidexTarget[] {
    const targets: VoidexTarget[] = [];
    const addedSpecies = new Set<Species>();
    const addedEvos = new Set<Species>();

    if (this.restrictedSpeciesIds) {
      for (const s of this.restrictedSpeciesIds) {
        if (addedSpecies.has(s)) continue;
        targets.push({ bucket: "other", kind: "species", speciesId: s });
        addedSpecies.add(s);
      }
    } else {
      const modifierSpecies = this.getModifierSpecies();
      for (const s of modifierSpecies) {
        targets.push({ bucket: "modifier", kind: "species", speciesId: s });
        addedSpecies.add(s);
        this.addEvolutionsToTargets("modifier", s, targets, addedSpecies, addedEvos);
      }

      if (this.scene.currentBattle) {
        const currentPhase = this.scene.getCurrentPhase();
        const isCommandPhase = currentPhase?.constructor?.name === "CommandPhase";
        if (isCommandPhase) {
          const enemy = this.scene.getEnemyField();
          const first = enemy?.[0];
          if (first) {
            const s = first.getSpeciesForm().speciesId;
            targets.push({ bucket: "enemy", kind: "species", speciesId: s });
            addedSpecies.add(s);
            this.addEvolutionsToTargets("enemy", s, targets, addedSpecies, addedEvos);
          }
        }
      }

      if (this.scene.currentBattle) {
        const party = this.scene.getParty();
        party?.forEach((p, idx) => {
          if (!p) return;
          const s = p.getSpeciesForm().speciesId;
          targets.push({ bucket: "party", kind: "species", speciesId: s, partyIndex: idx });
          addedSpecies.add(s);
          this.addEvolutionsToTargets("party", s, targets, addedSpecies, addedEvos);
        });
      }

      Object.entries(Species)
        .filter(([k, v]) => typeof v === "number" && (v as number) > 0 && isNaN(Number(k)))
        .sort((a, b) => (a[1] as number) - (b[1] as number))
        .forEach(([, v]) => {
          const s = v as Species;
          if (addedSpecies.has(s)) return;
          targets.push({ bucket: "other", kind: "species", speciesId: s });
        });
    }

    return targets;
  }

  private addEvolutionsToTargets(bucket: Bucket, speciesId: Species, targets: VoidexTarget[], addedSpecies: Set<Species>, addedEvos: Set<Species>): void {
    const evolutions = pokemonEvolutions[speciesId] || [];
    for (const evo of evolutions) {
      const es = evo.speciesId as Species;
      if (addedEvos.has(es)) continue;
      addedEvos.add(es);
      targets.push({ bucket, kind: "evolution", speciesId: es });
      addedSpecies.add(es);
      this.addEvolutionsToTargets(bucket, es, targets, addedSpecies, addedEvos);
    }
  }

  private getModifierSpecies(): Species[] {
    const ret: Species[] = [];
    try {
      const currentPhase = this.scene.getCurrentPhase();
      if (currentPhase?.constructor?.name !== "SelectModifierPhase") {
        return ret;
      }
      const rewardOptions = (currentPhase as any).getCurrentRewardOptions?.();
      if (rewardOptions) {
        rewardOptions.forEach((opt: any) => {
          if (opt.type instanceof AddPokemonModifierType) {
            const pokemon = opt.type.getPokemon();
            const s = pokemon.species.speciesId as Species;
            if (!ret.includes(s)) ret.push(s);
          }
        });
      }
      const lootHandler = this.scene.ui.handlers[Mode.LOOT_REWARD_SELECT] as ModifierSelectUiHandler;
      const baseHandler = this.scene.ui.handlers[Mode.MODIFIER_SELECT] as ModifierSelectUiHandler;
      const lootShopOpts = (lootHandler as any)?.getCurrentShopOptions?.();
      const shopOptions = (lootShopOpts?.length ? lootShopOpts : (baseHandler as any)?.getCurrentShopOptions?.());
      if (shopOptions) {
        shopOptions.forEach((opt: any) => {
          if (opt.type instanceof AddPokemonModifierType) {
            const pokemon = opt.type.getPokemon();
            const s = pokemon.species.speciesId as Species;
            if (!ret.includes(s)) ret.push(s);
          }
        });
      }
    } catch (e) { console.warn("[VoidexPrelist] getModifierSpecies error:", e); }
    return ret;
  }

  private getModifierFusions(): Array<{ primarySpeciesId: Species; fusionSpeciesId: Species }> {
    const ret: Array<{ primarySpeciesId: Species; fusionSpeciesId: Species }> = [];
    const seen = new Set<string>();
    try {
      const currentPhase = this.scene.getCurrentPhase();
      if (currentPhase?.constructor?.name !== "SelectModifierPhase") {
        return ret;
      }
      const addPokemon = (pokemon: any) => {
        if (!pokemon || typeof pokemon.isFusion !== "function" || !pokemon.isFusion() || !pokemon.fusionSpecies) {
          return;
        }
        const primarySpeciesId = pokemon.species.getRootSpeciesId(true) as Species;
        const fusionSpeciesId = pokemon.fusionSpecies.getRootSpeciesId(true) as Species;
        if (primarySpeciesId === fusionSpeciesId) {
          return;
        }
        const key = `${primarySpeciesId}:${fusionSpeciesId}`;
        if (seen.has(key)) {
          return;
        }
        seen.add(key);
        ret.push({ primarySpeciesId, fusionSpeciesId });
      };

      const rewardOptions = (currentPhase as any).getCurrentRewardOptions?.();
      if (rewardOptions) {
        rewardOptions.forEach((opt: any) => {
          if (opt.type instanceof AddPokemonModifierType) {
            addPokemon(opt.type.getPokemon());
          }
        });
      }
      const lootHandler = this.scene.ui.handlers[Mode.LOOT_REWARD_SELECT] as ModifierSelectUiHandler;
      const baseHandler = this.scene.ui.handlers[Mode.MODIFIER_SELECT] as ModifierSelectUiHandler;
      const lootShopOpts = (lootHandler as any)?.getCurrentShopOptions?.();
      const shopOptions = (lootShopOpts?.length ? lootShopOpts : (baseHandler as any)?.getCurrentShopOptions?.());
      if (shopOptions) {
        shopOptions.forEach((opt: any) => {
          if (opt.type instanceof AddPokemonModifierType) {
            addPokemon(opt.type.getPokemon());
          }
        });
      }
    } catch (e) { console.warn("[VoidexPrelist] getModifierFusions error:", e); }
    return ret;
  }

  private createSearchInput(width: number): void {
    this.destroySearchInput();

    const container = this.scene.add.container(0, 0);
    const y = 19;
    const h = 14;
    const bg = new RoundRectangle(this.scene, width / 2, y + (h / 2), width - 8, h, 3);
    bg.setFillStyle(0x223344);
    bg.setStrokeStyle(1, 0x6688aa, 1);
    container.add(bg);

    const placeholder = i18next.t("pokedex:searchPlaceholder");
    const input = addTextInputObject(this.scene, 6, y, (width - 32) * 6, h * 6, TextStyle.WINDOW, { fontSize: "46px", maxLength: 64, id: "voidexPrelistSearch", placeholder });
    input.setOrigin(0, 0);
    input.setText(this.searchQuery);
    input.on("click", () => input.setFocus());
    input.on("focus", () => {
      input.setPlaceholder("");
    });
    input.on("blur", () => {
      if ((input.text ?? "") === "") {
        input.setPlaceholder(placeholder);
      }
    });
    input.on("textchange", (el: any) => {
      this.searchQuery = el.text ?? "";
      this.applyFilterAndSort(true);
      this.refreshViews();
    });

    container.add(input);
    this.inputEl = input;
    const node: any = (input as any).node;
    const inputHeightPx = `${h * 6}px`;

    const css = [
      "#voidexPrelistSearch::placeholder { opacity: 0.5; }",
    ].join("\n");
    let styleEl = document.getElementById("voidexPrelistSearchPlaceholderStyle") as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "voidexPrelistSearchPlaceholderStyle";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = css;
    if (node && typeof node.addEventListener === "function") {
      this.searchContextMenuHandler = (e: Event) => {
        e.preventDefault();
      };
      this.searchMouseDownHandler = (e: MouseEvent) => {
        if (e.button === 2) {
          e.preventDefault();
          e.stopPropagation();
          this.getUi().processInput(Button.CANCEL);
        }
      };
      node.addEventListener("contextmenu", this.searchContextMenuHandler);
      node.addEventListener("mousedown", this.searchMouseDownHandler);
      this.searchKeydownHandler = (event: KeyboardEvent) => {
        const c = event.code;
        if (c === "KeyW" || c === "KeyA" || c === "KeyS" || c === "KeyD" || c === "KeyZ") {
          event.stopPropagation();
        }
        if (c === "Space" || c === "Enter") {
          event.preventDefault();
          event.stopPropagation();
          const el: any = this.inputEl as any;
          if (el && typeof el.setBlur === "function") {
            el.setBlur();
          }
          this.getUi().playSelect();
        }
      };
      node.addEventListener("keydown", this.searchKeydownHandler);
    }
    this.searchBlurHandler = (event: MouseEvent) => {
      const el: any = this.inputEl as any;
      const node: any = el?.node;
      const target = event.target as any;
      if (!el || !node) {
        return;
      }
      if (target === node) {
        return;
      }
      if (typeof node.contains === "function" && node.contains(target)) {
        return;
      }
      if (typeof el.setBlur === "function") {
        el.setBlur();
      }
    };
    document.addEventListener("mousedown", this.searchBlurHandler);

    const clearX = width - 12;
    const clearY = y + (h / 2);
    const clearBg = new RoundRectangle(this.scene, clearX, clearY, 14, h, 3);
    clearBg.setFillStyle(0x223344);
    clearBg.setStrokeStyle(1, 0x6688aa, 1);
    clearBg.setInteractive({ useHandCursor: true });
    const clearText = addTextObject(this.scene, clearX, clearY, "X", TextStyle.WINDOW, { fontSize: "34px", align: "center" });
    clearText.setOrigin(0.5, 0.5);
    clearBg.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!pointer.leftButtonDown()) {
        return;
      }
      this.searchQuery = "";
      input.setText("");
      if (typeof input.setBlur === "function") {
        input.setBlur();
      }
      this.applyFilterAndSort(true);
      this.refreshViews();
    });
    container.add(clearBg);
    container.add(clearText);
    this.root.add(container);
    this.searchContainer = container;
  }

  private destroySearchInput(): void {
    if (this.searchBlurHandler) {
      document.removeEventListener("mousedown", this.searchBlurHandler);
      this.searchBlurHandler = null;
    }
    const node: any = (this.inputEl as any)?.node;
    if (node && typeof node.removeEventListener === "function") {
      if (this.searchKeydownHandler) {
        node.removeEventListener("keydown", this.searchKeydownHandler);
      }
      if (this.searchContextMenuHandler) {
        node.removeEventListener("contextmenu", this.searchContextMenuHandler);
      }
      if (this.searchMouseDownHandler) {
        node.removeEventListener("mousedown", this.searchMouseDownHandler);
      }
    }
    this.searchKeydownHandler = null;
    this.searchContextMenuHandler = null;
    this.searchMouseDownHandler = null;
    if (this.inputEl && typeof this.inputEl.destroy === "function") {
      this.inputEl.destroy();
    }
    this.inputEl = null;
    if (this.searchContainer && typeof this.searchContainer.destroy === "function") {
      this.searchContainer.destroy(true);
    }
    this.searchContainer = null;
  }
}