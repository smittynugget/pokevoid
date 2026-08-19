import BattleScene from "../battle-scene";
import { addTextObject, TextStyle } from "./text";
import PartyUiHandler, { PartyUiMode } from "./party-ui-handler";
import { Mode } from "./mode";
import UiHandler from "./ui-handler";
import i18next from "i18next";
import {Button} from "../enums/buttons";
import { CommandPhase } from "#app/phases/command-phase.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { ShopModifierSelectPhase } from "../phases/shop-modifier-select-phase";
import { adjustDuelmonIconScale } from "#app/data/pokemon-species.js";
import { PokemonBattleTooltipUtils } from "./pokemon-battle-tooltip-utils";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import { isPrimaryPointer } from "./pointer-utils";
import { TweakMetaMode, TWEAK_META_CYCLE, cycleMetaMode, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";
import { DEBUG_YU_VISUAL_TUNING } from "../overrides";
import BattleInfo from "./battle-info";

export enum Command {
  FIGHT = 0,
  BALL,
  POKEMON,
  RUN,
  SKILLTREE,
  TEAM,
  CHECK,
  EGGS,
  SHOP,
  MAP
}

interface CommandUILayoutConfig {
  fontSize: number;
  textX: number;
  textY: number;
  gapX: number;
  gapY: number;
  stripX: number;
  stripY: number;
  stripAlpha: number;
  iconScaleMap: number;
  iconScaleScanner: number;
  iconScaleSkilltree: number;
  iconScaleShop: number;
  iconScaleEggs: number;
  iconScaleTeam: number;
  iconScalePokemon: number;
  iconGap: number;
  stripBgWidth: number;
  stripBgHeight: number;
  stripVertical: boolean;
  stripBgColor: number;
  stripPatternEnabled: boolean;
  stripPatternAlpha: number;
  stripGrayscaleUnfocused: boolean;
  stripBgRadius: number;
  stripBgCornerMode: string;
  promptX: number;
  promptY: number;
  promptAlpha: number;
  promptFontSize: number;
}

const CMD_LAYOUT_DEFAULTS: CommandUILayoutConfig = {
  fontSize: 96,
  textX: 225,
  textY: -39.7,
  gapX: 55.8,
  gapY: 16,
  stripX: 207.5,
  stripY: -46,
  stripAlpha: 0.82,
  iconScaleMap: 0.25,
  iconScaleScanner: 0.10,
  iconScaleSkilltree: 0.10,
  iconScaleShop: 0.10,
  iconScaleEggs: 0.15,
  iconScaleTeam: 0.10,
  iconScalePokemon: 0.30,
  iconGap: 18,
  stripBgWidth: 7,
  stripBgHeight: 44,
  stripVertical: true,
  stripBgColor: 0x0d1117,
  stripPatternEnabled: false,
  stripPatternAlpha: 0.6,
  stripGrayscaleUnfocused: false,
  stripBgRadius: 20.5,
  stripBgCornerMode: "left",
  promptX: 0,
  promptY: 0,
  promptAlpha: 1,
  promptFontSize: 96,
};

const STRIP_BG_COLOR_PRESETS: { name: string; value: number }[] = [
  { name: "black", value: 0x000000 },
  { name: "charcoal", value: 0x212121 },
  { name: "dark-grey", value: 0x333333 },
  { name: "slate", value: 0x2d2d2d },
  { name: "command-backing", value: 0x0d1117 },
  { name: "navy", value: 0x1a1a2e },
  { name: "midnight-blue", value: 0x0a1628 },
  { name: "dark-slate", value: 0x2f4f4f },
  { name: "tinted-navy", value: 0x12182b },
  { name: "tinted-plum", value: 0x1a1225 },
  { name: "tinted-teal", value: 0x0f1f1f },
  { name: "tinted-wine", value: 0x1f0f14 },
  { name: "tinted-forest", value: 0x0f1a12 },
  { name: "dark-red", value: 0x8b0000 },
  { name: "dark-green", value: 0x1b3a1b },
  { name: "dark-blue", value: 0x0b1929 },
  { name: "dark-purple", value: 0x2d1b4e },
  { name: "dark-brown", value: 0x3e2723 },
  { name: "red", value: 0xff0000 },
  { name: "orange", value: 0xff8c00 },
  { name: "yellow", value: 0xffff00 },
  { name: "green", value: 0x22c55e },
  { name: "cyan", value: 0x00ced1 },
  { name: "blue", value: 0x0066ff },
  { name: "magenta", value: 0xff00ff },
  { name: "purple", value: 0x9333ea },
  { name: "grey", value: 0x666666 },
  { name: "light-grey", value: 0x999999 },
  { name: "silver", value: 0xc0c0c0 },
  { name: "off-white", value: 0xf5f5f5 },
  { name: "white", value: 0xffffff },
];

const STRIP_BG_CORNER_MODES = ["none", "all", "bottom", "top", "left", "right"];

const TWEAK_G8_MULTIPLIER = 8;

const COMMAND_TWEAK_ASSETS = [
  "0command-fontSize", "0command-textX", "0command-textY",
  "0command-gapX", "0command-gapY",
  "0command-stripX", "0command-stripY", "0command-stripAlpha",
  "0command-stripBgColor", "0command-stripVertical",
  "0command-stripPatternEnabled", "0command-stripPatternAlpha", "0command-stripGrayscaleUnfocused",
  "0command-stripBgRadius", "0command-stripBgCornerMode",
  "0command-iconScale-map", "0command-iconScale-scanner",
  "0command-iconScale-skilltree", "0command-iconScale-shop",
  "0command-iconScale-eggs", "0command-iconScale-team",
  "0command-iconScale-pokemon",
  "0command-iconGap",
  "0command-promptX", "0command-promptY", "0command-promptAlpha", "0command-promptFontSize",
  "1cmd-FightText", "1cmd-BallText", "1cmd-PokemonText", "1cmd-RunText",
  "1cmd-CommandsContainer", "1cmd-IconStripContainer", "1cmd-IconsContainer", "1cmd-StripBg",
  "1cmd-IconMap", "1cmd-IconScanner", "1cmd-IconSkilltree",
  "1cmd-IconShop", "1cmd-IconEggs", "1cmd-IconTeam",
  "1cmd-PromptText", "1cmd-PromptContainer", "1cmd-CommandBacking", "1cmd-CommandWindow",
];

const COMMAND_TWEAK_MODES = ["position", "scale", "alpha", "fontSize", "width", "height", "alphaG8", "positionG8"];

const COMMAND_TWEAK_ASSET_GROUPS: Record<string, string[]> = {
  "0CommandText": ["0command-fontSize", "0command-textX", "0command-textY", "0command-gapX", "0command-gapY"],
  "0CommandStrip": ["0command-stripX", "0command-stripY", "0command-stripAlpha", "0command-stripBgColor", "0command-stripVertical", "0command-stripPatternEnabled", "0command-stripPatternAlpha", "0command-stripGrayscaleUnfocused", "0command-stripBgRadius", "0command-stripBgCornerMode"],
  "0CommandIcons": ["0command-iconScale-map", "0command-iconScale-scanner", "0command-iconScale-skilltree", "0command-iconScale-shop", "0command-iconScale-eggs", "0command-iconScale-team", "0command-iconScale-pokemon", "0command-iconGap"],
  "0CommandPrompt": ["0command-promptX", "0command-promptY", "0command-promptAlpha", "0command-promptFontSize"],
  "1Elements": ["1cmd-FightText", "1cmd-BallText", "1cmd-PokemonText", "1cmd-RunText", "1cmd-CommandsContainer", "1cmd-IconStripContainer", "1cmd-IconsContainer", "1cmd-StripBg", "1cmd-IconMap", "1cmd-IconScanner", "1cmd-IconSkilltree", "1cmd-IconShop", "1cmd-IconEggs", "1cmd-IconTeam", "1cmd-PromptText", "1cmd-PromptContainer", "1cmd-CommandBacking", "1cmd-CommandWindow"],
};

function getCommandTweakStep(assetName: string): number {
  if (assetName.includes("iconScale")) return 0.01;
  if (assetName === "0command-stripAlpha" || assetName === "0command-stripPatternAlpha" || assetName === "0command-promptAlpha") return 0.01;
  if (assetName === "0command-fontSize" || assetName === "0command-promptFontSize") return 1;
  if (assetName === "0command-iconGap") return 0.5;
  if (assetName === "0command-stripBgRadius") return 0.5;
  return 0.5;
}

function getCommandTweakMinMax(assetName: string): { min: number; max: number } {
  switch (assetName) {
    case "0command-fontSize": return { min: 40, max: 100 };
    case "0command-textX": return { min: 150, max: 310 };
    case "0command-textY": return { min: -80, max: 0 };
    case "0command-gapX": return { min: 40, max: 90 };
    case "0command-gapY": return { min: 8, max: 40 };
    case "0command-stripX": return { min: 150, max: 320 };
    case "0command-stripY": return { min: -60, max: 20 };
    case "0command-stripAlpha": return { min: 0, max: 1 };
    case "0command-stripPatternAlpha": return { min: 0, max: 1 };
    case "0command-iconGap": return { min: 8, max: 28 };
    case "0command-stripBgRadius": return { min: 0, max: 24 };
    case "0command-promptX": return { min: -100, max: 200 };
    case "0command-promptY": return { min: -60, max: 60 };
    case "0command-promptAlpha": return { min: 0, max: 1 };
    case "0command-promptFontSize": return { min: 40, max: 150 };
    default: return { min: 0.01, max: 1.5 };
  }
}

function resolveTweakMode(modeName: string): { base: string; multiplier: number } {
  if (modeName === "alphaG8") return { base: "alpha", multiplier: TWEAK_G8_MULTIPLIER };
  if (modeName === "positionG8") return { base: "position", multiplier: TWEAK_G8_MULTIPLIER };
  return { base: modeName, multiplier: 1 };
}

export default class CommandUiHandler extends UiHandler {
  private commandsContainer: Phaser.GameObjects.Container;
  private iconGridContainer: Phaser.GameObjects.Container;
  private iconsContainer: Phaser.GameObjects.Container;
  private cursorObj: Phaser.GameObjects.Image | null;
  private newCommandPositions: { x: number; y: number }[] = [];

  private baseCommandLabels: string[] = [];
  private commandTextByCursor: Map<number, Phaser.GameObjects.Text> = new Map();
  private commandIconByCursor: Map<number, Phaser.GameObjects.Sprite> = new Map();
  private _commandHitZones: Phaser.GameObjects.Zone[] = [];
  private _stripIconHitZones: Phaser.GameObjects.Zone[] = [];
  private playerPokemonIcon: Phaser.GameObjects.Container | null = null;
  private enemyPokemonIcon: Phaser.GameObjects.Container | null = null;

  private stripBg: Phaser.GameObjects.Graphics | null = null;
  private patternContainer: Phaser.GameObjects.Container | null = null;
  private _stripPattern?: ModalBackgroundHandle;
  private _stripTooltipBg: Phaser.GameObjects.NineSlice | null = null;
  private _commandPattern?: ModalBackgroundHandle;
  private _layoutConfig: CommandUILayoutConfig = { ...CMD_LAYOUT_DEFAULTS };
  private _cmdTweak: CommandUiTweakController | null = null;
  private _tweakedElements: Set<string> = new Set();
  private _visibleStripOrder: number[] = [];
  private _stripColByCursor: Map<number, number> = new Map();
  private _dynamicCellSize: number = 14;
  private _stripScrollOffset: number = 0;
  private _stripScrollUpArrow: Phaser.GameObjects.Sprite | null = null;
  private _stripScrollDownArrow: Phaser.GameObjects.Sprite | null = null;
  private _suppressHoverCursor: boolean = false;
  private eggHatchCounterText: Phaser.GameObjects.Text | null = null;
  private static readonly STRIP_TARGET_WIDTH = 118;
  private static readonly STRIP_PAGE_SIZE = 3;

  private static readonly NEW_COMMAND_UNFOCUSED_ALPHA = 0.20;
  private static readonly NEW_COMMAND_FOCUSED_ALPHA = 1.0;
  private static readonly NEW_COMMAND_FOCUSED_SCALE_DELTA = 0.2;
  private static readonly MAP_DISABLED_ALPHA = 0.15;

  private static readonly ICON_GRID_COLS = 8;
  private static readonly ICON_GRID_ROWS = 1;
  private static readonly ICON_CELL_SIZE = 14;
  private static readonly CURSOR_PLAYER_ICON = 10;
  private static readonly CURSOR_ENEMY_ICON = 11;
  private static readonly ICON_COMMANDS: { cursor: number; atlas: string; frame: string; scale: number }[] = [
    { cursor: 9, atlas: "items", frame: "map", scale: 0.25 },
    { cursor: 6, atlas: "smitems", frame: "modPassiveAbility", scale: 0.10 },
    { cursor: 5, atlas: "smitems", frame: "permaMoreRevive", scale: 0.10 },
    { cursor: 8, atlas: "smitems", frame: "permaMoney", scale: 0.10 },
    { cursor: 7, atlas: "egg", frame: "egg_0", scale: 0.15 },
    { cursor: 4, atlas: "smitems", frame: "permaPartyAbility", scale: 0.10 },
  ];

  private static readonly STRIP_VISIBLE_ORDER: number[] = [11, 10, 8, 4, 6, 7, 9];

  protected fieldIndex: integer = 0;
  protected cursor2: integer = 0;

  constructor(scene: BattleScene) {
    super(scene, Mode.COMMAND);
  }

  setup() {
    const ui = this.getUi();

    const cfg = this._layoutConfig;
    const originalCommands = [
      { text: i18next.t("commandUiHandler:fight"), x: 0, y: 0 },
      { text: i18next.t("commandUiHandler:ball"), x: cfg.gapX, y: 0 },
      { text: i18next.t("commandUiHandler:pokemon"), x: 0, y: cfg.gapY },
      { text: i18next.t("commandUiHandler:run"), x: cfg.gapX, y: cfg.gapY }
    ];

    this.commandsContainer = this.scene.add.container(cfg.textX, cfg.textY);
    this.commandsContainer.setName("commands");
    this.commandsContainer.setVisible(false);
    ui.add(this.commandsContainer);

    this.baseCommandLabels = originalCommands.map(c => c.text);
    originalCommands.forEach((cmd, index) => {
      const commandText = addTextObject(this.scene, cmd.x, cmd.y, cmd.text, TextStyle.WINDOW, { fontSize: cfg.fontSize + "px" });
      commandText.setName(cmd.text);
      this.commandTextByCursor.set(index, commandText);
      this.commandsContainer.add(commandText);
    });

    const CELL = CommandUiHandler.ICON_CELL_SIZE;
    const COLS = CommandUiHandler.ICON_GRID_COLS;
    const gridWidth = COLS * CELL;
    const gridHeight = CommandUiHandler.ICON_GRID_ROWS * CELL;

    this.iconGridContainer = this.scene.add.container(cfg.stripX, cfg.stripY);
    this.iconGridContainer.setName("command-icon-grid");
    this.iconGridContainer.setVisible(false);
    ui.add(this.iconGridContainer);

    this.patternContainer = this.scene.add.container(0, 0);
    this.patternContainer.setName("command-strip-pattern");
    this.iconGridContainer.add(this.patternContainer);

    this.stripBg = this.scene.add.graphics();
    this.stripBg.setPosition(-1.0, 2.0);
    this.redrawStripBg();
    this.iconGridContainer.add(this.stripBg);

    this.iconsContainer = this.scene.add.container(-6.0, 3.0);
    this.iconsContainer.setScale(0.71, 0.71);
    this.iconsContainer.setName("command-icons");
    this.iconGridContainer.add(this.iconsContainer);

    this._stripScrollUpArrow = this.scene.add.sprite(0, 0, "prompt");
    this._stripScrollUpArrow.flipY = true;
    this._stripScrollUpArrow.setScale(0.4);
    this._stripScrollUpArrow.setVisible(false);
    this.iconsContainer.add(this._stripScrollUpArrow);

    this._stripScrollDownArrow = this.scene.add.sprite(0, 0, "prompt");
    this._stripScrollDownArrow.setScale(0.4);
    this._stripScrollDownArrow.setVisible(false);
    this.iconsContainer.add(this._stripScrollDownArrow);

    this._stripScrollUpArrow.setInteractive({ useHandCursor: true });
    this._stripScrollUpArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
      if (!isPrimaryPointer(pointer)) return;
      this.scrollStripPage(-1);
    });

    this._stripScrollDownArrow.setInteractive({ useHandCursor: true });
    this._stripScrollDownArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
      if (!isPrimaryPointer(pointer)) return;
      this.scrollStripPage(1);
    });

    CommandUiHandler.ICON_COMMANDS.forEach((def, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = col * CELL + CELL / 2;
      const y = row * CELL + CELL / 2;

         const icon = this.scene.add.sprite(x, y, def.atlas, def.frame);
             icon.setScale(def.scale);
             icon.setAlpha(CommandUiHandler.NEW_COMMAND_UNFOCUSED_ALPHA);
      this.iconsContainer.add(icon);
      this.commandIconByCursor.set(def.cursor, icon);

    });

    this.newCommandPositions = CommandUiHandler.ICON_COMMANDS.map((_, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      return { x: col * CELL + CELL / 2, y: row * CELL + CELL / 2 };
    });

    this.eggHatchCounterText = addTextObject(this.scene, 0, 0, "", TextStyle.PARTY, { fontSize: "36px", color: "#ffd700" });
    this.eggHatchCounterText.setShadow(0, 0, undefined);
    this.eggHatchCounterText.setStroke("#222222", 14);
    this.eggHatchCounterText.setOrigin(0, 0.5);
    this.eggHatchCounterText.setVisible(false);
    this.iconsContainer.add(this.eggHatchCounterText);

    if (DEBUG_YU_VISUAL_TUNING) {
      this.initCommandTweak();
    }
  }
  private getVisibleStripIcons(): number[] {
    const visible: number[] = [];
    const isChaosMode = (this.scene as any).gameMode?.isChaosMode;
    const isTutorial = (this.scene as BattleScene).gameData?.tutorialOnboardActive;

    for (const cursor of CommandUiHandler.STRIP_VISIBLE_ORDER) {
      if (cursor === 9 && !isChaosMode) continue;
      if ((cursor === 8 || cursor === 9) && isTutorial) continue;
      visible.push(cursor);
    }
    const order = (this.scene as BattleScene).gameData?.commandStripRecentOrder ?? [];
    const rank = (c: number) => { const i = order.indexOf(c); return i === -1 ? Number.MAX_SAFE_INTEGER : i; };
    const pinned = visible.filter(c => c === 11 || c === 10);
    const sortable = visible.filter(c => c !== 11 && c !== 10);
    sortable.sort((a, b) => rank(a) - rank(b));
    return [...pinned, ...sortable];
  }

  recordCommandStripUsage(cursor: number): void {
    const gd = (this.scene as BattleScene).gameData;
    if (!gd.commandStripUsageCounts) gd.commandStripUsageCounts = {};
    gd.commandStripUsageCounts[cursor] = (gd.commandStripUsageCounts[cursor] || 0) + 1;
    if (!gd.commandStripRecentOrder) gd.commandStripRecentOrder = [];
    const order = gd.commandStripRecentOrder;
    const at = order.indexOf(cursor);
    if (at > -1) order.splice(at, 1);
    order.unshift(cursor);
    this._stripScrollOffset = 0;
    this.relayoutStrip();
  }

  private relayoutStrip(): void {
    const visibleCursors = this.getVisibleStripIcons();
    this._visibleStripOrder = visibleCursors;

    const total = visibleCursors.length;
    const maxOffset = Math.max(0, total - CommandUiHandler.STRIP_PAGE_SIZE);
    if (this._stripScrollOffset > maxOffset) this._stripScrollOffset = maxOffset;

    for (const def of CommandUiHandler.ICON_COMMANDS) {
      const icon = this.commandIconByCursor.get(def.cursor);
      if (!icon) continue;
      icon.setVisible(visibleCursors.includes(def.cursor));
    }

    this.applyCommandLayout();
  }

  show(args: any[]): boolean {
    this.eraseCursor();
    this._stripScrollOffset = 0;
    this._suppressHoverCursor = false;

    super.show(args);

    this.fieldIndex = args.length ? args[0] as integer : 0;

    this.commandsContainer.setVisible(true);
    this.iconGridContainer.setVisible(true);

    this._commandHitZones.forEach(z => z.destroy());
    this._commandHitZones = [];

    this.commandTextByCursor.forEach((text, index) => {
      const w = Math.max(text.displayWidth + 4, 20);
      const h = text.displayHeight + 4;
      const zone = this.scene.add.zone(text.x + w / 2, text.y + h / 2, w, h);
      zone.setOrigin(0.5, 0.5);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => {
        if (this._suppressHoverCursor) return;
        if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
        if (this.getCursor() !== index) this.setCursor(index);
      });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
        if (!isPrimaryPointer(pointer)) return;
        this._suppressHoverCursor = false;
        if (this.getCursor() !== index) {
          this.setCursor(index);
        } else {
          this.processInput(Button.ACTION);
        }
      });
      this.commandsContainer.add(zone);
      this._commandHitZones.push(zone);
    });

    this.relayoutStrip();

    let commandPhase: CommandPhase;
    const currentPhase = this.scene.getCurrentPhase();
    if (currentPhase instanceof CommandPhase) {
      commandPhase = currentPhase;
    } else {
      commandPhase = this.scene.getStandbyPhase() as CommandPhase;
    }

    const messageHandler = this.getUi().getMessageHandler();
    messageHandler.bg.setAlpha(1);
    messageHandler.bg.setVisible(true);
    messageHandler.commandBacking.setVisible(true);
    messageHandler.commandWindow.setVisible(true);
    messageHandler.movesWindowContainer.setVisible(false);

    if (!this._commandPattern) {
      this._commandPattern = attachModalBackground(
        this.scene,
        this.getUi() as Phaser.GameObjects.Container,
        () => ({
          bgX: messageHandler.commandWindow.x,
          bgY: messageHandler.commandWindow.y - messageHandler.commandWindow.height,
          bgWidth: messageHandler.commandWindow.width,
          bgHeight: messageHandler.commandWindow.height,
        }),
        {
          mask: false,
          alphaMultiplier: 0.6,
          gridInc: -2,
          getTarget: () => messageHandler.commandWindow,
        }
      );
    } else {
      this._commandPattern.redraw();
    }

    this.applyCommandLayout();
    this.scene.time.delayedCall(1, () => {
      if (!this.playerPokemonIcon && this.active) {
        this.refreshPokemonIcons();
      }
    });
    this.updateEggHatchCounter();

    if (!commandPhase) {
      this.setCursor(this.getCursor());
      return false;
    }

    messageHandler.message.setWordWrapWidth(1110);
    messageHandler.showText(i18next.t("commandUiHandler:actionMessage", { pokemonName: getPokemonNameWithAffix(commandPhase.getPokemon()) }), 0);
    this.setCursor(this.getCursor());

    if (this._stripScrollUpArrow) { this._stripScrollUpArrow.play("prompt"); this._stripScrollUpArrow.setInteractive({ useHandCursor: true }); }
    if (this._stripScrollDownArrow) { this._stripScrollDownArrow.play("prompt"); this._stripScrollDownArrow.setInteractive({ useHandCursor: true }); }
    this.updateStripScrollArrows(this.getCursor());

    return true;
  }

  private resolveCommandPhase(): CommandPhase | null {
    const current = this.scene.getCurrentPhase();
    if (current instanceof CommandPhase) return current;
    const standby = this.scene.getStandbyPhase();
    if (standby instanceof CommandPhase) return standby as CommandPhase;
    return null;
  }

  processInput(button: Button): boolean {
    this._suppressHoverCursor = true;
    const ui = this.getUi();

    let success = false;

    const cursor = this.getCursor();

    if (button === Button.CANCEL || button === Button.ACTION) {

      if (button === Button.ACTION) {
        switch (cursor) {
        case 0: {
          const cp = this.resolveCommandPhase();
          if (!cp) return true;
          if (cp.checkFightOverride()) {
            return true;
          }
          if (cp.tryTriggerVoidCaptureChain()) {
            return true;
          }
          if (cp.tryTriggerWakeUpChain()) {
            return true;
          }
          ui.setMode(Mode.FIGHT, cp.getFieldIndex());
          success = true;
          this.recordCommandStripUsage(cursor);
          break;
        }
        case 1:
          ui.setModeWithoutClear(Mode.BALL);
          success = true;
          this.recordCommandStripUsage(cursor);
          break;
        case 2: {
          const cp2 = this.resolveCommandPhase();
          if (!cp2) return true;
          ui.setMode(Mode.PARTY, PartyUiMode.SWITCH, cp2.getPokemon().getFieldIndex(), null, PartyUiHandler.FilterNonFainted);
          success = true;
          this.recordCommandStripUsage(cursor);
          break;
        }
        case 3: {
          const cp3 = this.resolveCommandPhase();
          if (!cp3) return true;
          cp3.handleCommand(Command.RUN, 0);
          success = true;
          this.recordCommandStripUsage(cursor);
          break;
        }
        case 4: {
          const scene4 = this.scene as BattleScene;
          const cp4 = this.resolveCommandPhase();
          const pokemon4 = cp4?.getPokemon ? cp4.getPokemon() : null;
          if (pokemon4) {
            this.scene.time.delayedCall(1, () => {
              ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, pokemon4, 2);
            });
            success = true;
            this.recordCommandStripUsage(cursor);
          }
          break; }
        case 6:
          ui.setOverlayMode(Mode.VOIDEX_PRELIST);
          success = true;
          this.recordCommandStripUsage(cursor);
          break;
        case 7:
          ui.setOverlayMode(Mode.EGG_GACHA);
          success = true;
          this.recordCommandStripUsage(cursor);
          break;
        case 8:
          if ((this.scene as BattleScene).gameData?.tutorialOnboardActive) break;
          if ((this.scene as BattleScene).uiEditModeActive) { success = true; this.recordCommandStripUsage(cursor); break; }
          ui.setMode(Mode.MESSAGE);
          this.scene.unshiftPhase(new ShopModifierSelectPhase(this.scene));
          const currentPhase = this.scene.getCurrentPhase();
          if (currentPhase) {
            this.scene.unshiftPhase(currentPhase);
          }
          this.scene.shiftPhase();
          success = true;
          this.recordCommandStripUsage(cursor);
          break;
        case 9:
          if ((this.scene as BattleScene).gameData?.tutorialOnboardActive) break;
          if ((this.scene as any).gameMode?.isChaosMode) {
            ui.setOverlayMode(Mode.BATTLE_PATH, { viewOnly: true });
            success = true;
            this.recordCommandStripUsage(cursor);
          }
          break;
        case 10: {
          const cp10 = this.resolveCommandPhase();
          const player = cp10?.getPokemon ? cp10.getPokemon() : null;
          if (player) {
            this.scene.time.delayedCall(1, () => {
              ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, player, 0);
            });
            success = true;
            this.recordCommandStripUsage(cursor);
          }
          break; }
        case 11: {
          const scene11 = this.scene as BattleScene;
          const foe = scene11.getEnemyPokemon();
          if (foe) {
            this.scene.time.delayedCall(1, () => {
              ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, foe, 0);
            });
            success = true;
            this.recordCommandStripUsage(cursor);
          }
          break; }
        }
      } else {
        const cancelCp = this.resolveCommandPhase();
        if (!cancelCp) return true;
        if (this.fieldIndex) {
          cancelCp.cancel();
          success = true;
          this.recordCommandStripUsage(cursor);
        }
      }
    } else {
      const vert = this._layoutConfig.stripVertical;
      switch (button) {
      case Button.UP:
        if (cursor === 2) success = this.setCursor(0);
        else if (cursor === 3) success = this.setCursor(1);
        else if (cursor === 0 || cursor === 1) {
          if (!vert) {
            success = this._visibleStripOrder.length > 0 ? this.setCursor(this._visibleStripOrder[0]) : false;
          }
        }
        else if (cursor >= 4) {
          if (vert) {
            const lIdx = this._visibleStripOrder.indexOf(cursor);
            if (lIdx <= this._stripScrollOffset && this._stripScrollOffset > 0) {
              this._stripScrollOffset--;
              this.applyCommandLayout();
              success = this.setCursor(this._visibleStripOrder[this._stripScrollOffset]);
            } else if (lIdx > 0) {
              success = this.setCursor(this._visibleStripOrder[lIdx - 1]);
            } else if (lIdx === 0) {
              const total = this._visibleStripOrder.length;
              const pageSize = CommandUiHandler.STRIP_PAGE_SIZE;
              const maxOff = Math.max(0, total - pageSize);
              this._stripScrollOffset = maxOff;
              this.applyCommandLayout();
              success = this.setCursor(this._visibleStripOrder[total - 1]);
            }
          } else {
            success = this.setCursor(0);
          }
        }
        break;
      case Button.DOWN:
        if (cursor === 0) success = this.setCursor(2);
        else if (cursor === 1) success = this.setCursor(3);
        else if (cursor === 2 || cursor === 3) {
          if (!vert) {
            success = this._visibleStripOrder.length > 0 ? this.setCursor(this._visibleStripOrder[0]) : false;
          }
        }
        else if (cursor >= 4) {
          if (vert) {
            const total = this._visibleStripOrder.length;
            const pageSize = CommandUiHandler.STRIP_PAGE_SIZE;
            const maxOff = Math.max(0, total - pageSize);
            const rIdx = this._visibleStripOrder.indexOf(cursor);
            const pageEnd = this._stripScrollOffset + pageSize - 1;
            if (rIdx >= pageEnd && this._stripScrollOffset < maxOff) {
              this._stripScrollOffset++;
              this.applyCommandLayout();
              const newEnd = this._stripScrollOffset + pageSize - 1;
              success = this.setCursor(this._visibleStripOrder[Math.min(newEnd, total - 1)]);
            } else if (rIdx >= 0 && rIdx < total - 1) {
              success = this.setCursor(this._visibleStripOrder[rIdx + 1]);
            } else if (rIdx === total - 1) {
              this._stripScrollOffset = 0;
              this.applyCommandLayout();
              success = this.setCursor(this._visibleStripOrder[0]);
            }
          } else {
            success = this.setCursor(2);
          }
        }
        break;
      case Button.LEFT: {
        if (cursor === 1) { success = this.setCursor(0); break; }
        if (cursor === 3) { success = this.setCursor(2); break; }
        if (vert && (cursor === 0 || cursor === 2) && this._visibleStripOrder.length > 0) {
          const total = this._visibleStripOrder.length;
          const pageSize = CommandUiHandler.STRIP_PAGE_SIZE;
          const lastIdx = Math.min(this._stripScrollOffset + pageSize - 1, total - 1);
          const target = cursor === 0
            ? this._visibleStripOrder[this._stripScrollOffset]
            : this._visibleStripOrder[lastIdx];
          success = this.setCursor(target);
          break;
        }
        if (cursor >= 4 && !vert) {
          const lIdx = this._visibleStripOrder.indexOf(cursor);
          if (lIdx > 0) success = this.setCursor(this._visibleStripOrder[lIdx - 1]);
          else if (lIdx === 0) success = this.setCursor(3);
        }
        break; }
      case Button.RIGHT: {
        if (cursor === 0) { success = this.setCursor(1); break; }
        if (cursor === 2) { success = this.setCursor(3); break; }
        if (vert) {
          if (cursor >= 4) {
            const slot = this._stripColByCursor.get(cursor);
            const target = slot !== undefined && slot >= CommandUiHandler.STRIP_PAGE_SIZE - 1 ? 2 : 0;
            success = this.setCursor(target);
          }
        } else {
          if (cursor === 3 && this._visibleStripOrder.length > 0) {
            success = this.setCursor(this._visibleStripOrder[0]);
            break;
          }
          if (cursor >= 4) {
            const rIdx = this._visibleStripOrder.indexOf(cursor);
            if (rIdx >= 0 && rIdx < this._visibleStripOrder.length - 1) {
              success = this.setCursor(this._visibleStripOrder[rIdx + 1]);
            }
          }
        }
        break; }
      }
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  getCursor(): integer {
    return !this.fieldIndex ? this.cursor : this.cursor2;
  }

  private refreshPokemonIcons(): void {
    this._commandHitZones = this._commandHitZones.filter(z => {
      if (z.getData?.("pokemonZone")) { z.destroy(); return false; }
      return true;
    });

    const scene = this.scene as BattleScene;
    const CELL = this._dynamicCellSize;
    const baseIconScale = 0.30;
    const pVisible = this._stripColByCursor.has(10);
    const eVisible = this._stripColByCursor.has(11);
    const pCol = this._stripColByCursor.get(10) ?? 0;
    const eCol = this._stripColByCursor.get(11) ?? 0;
    const pPos = this.getStripSlotPosition(pCol, CELL);
    const ePos = this.getStripSlotPosition(eCol, CELL);
    const px = pPos.x;
    const ex = ePos.x;
    const baseIconY = pPos.y - 5;

    if (this.playerPokemonIcon) {
      this.playerPokemonIcon.destroy();
      this.playerPokemonIcon = null;
    }
    if (this.enemyPokemonIcon) {
      this.enemyPokemonIcon.destroy();
      this.enemyPokemonIcon = null;
    }

    if (!pVisible && !eVisible) return;

    const commandPhase = this.resolveCommandPhase();
    const playerPokemon = commandPhase?.getPokemon
      ? commandPhase.getPokemon()
      : scene.getPlayerPokemon();
    const enemyPokemon = scene.getEnemyPokemon();

    if (playerPokemon && pVisible) {
      const pScale = adjustDuelmonIconScale(baseIconScale, playerPokemon.species.generation, playerPokemon.isGlitchOrSmittyForm?.());
      const py = playerPokemon.usesCustomFieldSpriteLayout() ? pPos.y - 3 : baseIconY;
      this.playerPokemonIcon = scene.addPokemonIcon(playerPokemon, px, py, 0.5, 0);
      this.playerPokemonIcon.setScale(pScale);
      this.playerPokemonIcon.setData("baseScale", pScale);
      this.iconsContainer.add(this.playerPokemonIcon);

      const pZoneY = py + (30 * pScale) / 2;
      const pZone = scene.add.zone(px, pZoneY, CELL, CELL);
      pZone.setOrigin(0.5, 0.5);
      pZone.setInteractive({ useHandCursor: true });
      pZone.on("pointerover", () => {
        if (this._suppressHoverCursor) return;
        if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
        if (this.getCursor() !== CommandUiHandler.CURSOR_PLAYER_ICON) {
          this.setCursor(CommandUiHandler.CURSOR_PLAYER_ICON);
        }
      });
      pZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
        if (!isPrimaryPointer(pointer)) return;
        this._suppressHoverCursor = false;
        this.scene.time.delayedCall(1, () => {
          (this.scene as BattleScene).ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, playerPokemon, 0);
        });
      });
      pZone.setData("pokemonZone", true);
      this.iconsContainer.add(pZone);
      this._commandHitZones.push(pZone);
    }

    if (enemyPokemon && eVisible) {
      const eScale = adjustDuelmonIconScale(baseIconScale, enemyPokemon.species.generation, enemyPokemon.isGlitchOrSmittyForm?.());
      const eBaseY = ePos.y - 5;
      const ey = enemyPokemon.usesCustomFieldSpriteLayout() ? ePos.y - 3 : eBaseY;
      this.enemyPokemonIcon = scene.addPokemonIcon(enemyPokemon, ex, ey, 0.5, 0);
      this.enemyPokemonIcon.setScale(eScale);
      this.enemyPokemonIcon.setData("baseScale", eScale);
      this.iconsContainer.add(this.enemyPokemonIcon);

      const eZoneY = ey + (30 * eScale) / 2;
      const eZone = scene.add.zone(ex, eZoneY, CELL, CELL);
      eZone.setOrigin(0.5, 0.5);
      eZone.setInteractive({ useHandCursor: true });
      eZone.on("pointerover", () => {
        if (this._suppressHoverCursor) return;
        if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
        if (this.getCursor() !== CommandUiHandler.CURSOR_ENEMY_ICON) {
          this.setCursor(CommandUiHandler.CURSOR_ENEMY_ICON);
        }
      });
      eZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
        if (!isPrimaryPointer(pointer)) return;
        this._suppressHoverCursor = false;
        this.scene.time.delayedCall(1, () => {
          (this.scene as BattleScene).ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, enemyPokemon, 0);
        });
      });
      eZone.setData("pokemonZone", true);
      this.iconsContainer.add(eZone);
      this._commandHitZones.push(eZone);
    }
  }
  private scrollStripPage(direction: -1 | 1): boolean {
    if (!this._layoutConfig.stripVertical) return false;
    const total = this._visibleStripOrder.length;
    const pageSize = CommandUiHandler.STRIP_PAGE_SIZE;
    const maxOffset = Math.max(0, total - pageSize);
    const newOffset = this._stripScrollOffset + direction;
    if (newOffset < 0 || newOffset > maxOffset) return false;
    this._stripScrollOffset = newOffset;
    this.applyCommandLayout();
    const pageStart = this._stripScrollOffset;
    const pageEnd = Math.min(pageStart + pageSize, total) - 1;
    const targetCursor = direction < 0
      ? this._visibleStripOrder[pageStart]
      : this._visibleStripOrder[pageEnd];
    this.setCursor(targetCursor);
    this.getUi().playSelect();
    return true;
  }

  private updateStripScrollArrows(focusedCursor: integer = this.getCursor()): void {
    if (!this._stripScrollUpArrow || !this._stripScrollDownArrow) return;
    if (!this._layoutConfig.stripVertical || focusedCursor < 4) {
      this._stripScrollUpArrow.setVisible(false);
      this._stripScrollDownArrow.setVisible(false);
      this._stripScrollUpArrow.disableInteractive();
      this._stripScrollDownArrow.disableInteractive();
      return;
    }
    const total = this._visibleStripOrder.length;
    const pageSize = CommandUiHandler.STRIP_PAGE_SIZE;
    const maxOffset = Math.max(0, total - pageSize);
    const cell = this._dynamicCellSize;
    this._stripScrollUpArrow.setPosition(cell / 2, -6);
    this._stripScrollDownArrow.setPosition(cell / 2, pageSize * cell + 6);
    const upVisible = this._stripScrollOffset > 0;
    const downVisible = this._stripScrollOffset < maxOffset;
    this._stripScrollUpArrow.setVisible(upVisible);
    this._stripScrollDownArrow.setVisible(downVisible);
    if (upVisible) this._stripScrollUpArrow.setInteractive({ useHandCursor: true }); else this._stripScrollUpArrow.disableInteractive();
    if (downVisible) this._stripScrollDownArrow.setInteractive({ useHandCursor: true }); else this._stripScrollDownArrow.disableInteractive();
  }

  private getStripSlotPosition(slot: number, cellSize: number): { x: number; y: number } {
    if (this._layoutConfig.stripVertical) {
      return { x: cellSize / 2, y: slot * cellSize + cellSize / 2 };
    }
    return { x: slot * cellSize + cellSize / 2, y: cellSize / 2 };
  }

  private resolveStripBgRadii(): Phaser.Types.GameObjects.Graphics.RoundedRectRadius {
    const cfg = this._layoutConfig;
    const r = Math.max(0, cfg.stripBgRadius);
    if (r === 0 || cfg.stripBgCornerMode === "none") return { tl: 0, tr: 0, bl: 0, br: 0 };
    switch (cfg.stripBgCornerMode) {
      case "top": return { tl: r, tr: r, bl: 0, br: 0 };
      case "bottom": return { tl: 0, tr: 0, bl: r, br: r };
      case "left": return { tl: r, tr: 0, bl: r, br: 0 };
      case "right": return { tl: 0, tr: r, bl: 0, br: r };
      default: return { tl: r, tr: r, bl: r, br: r };
    }
  }

  private redrawStripBg(): void {
    if (!this.stripBg) return;
    const cfg = this._layoutConfig;
    this.stripBg.clear();
    const patternActive = cfg.stripPatternEnabled;
    this.stripBg.fillStyle(cfg.stripBgColor, patternActive ? 0 : cfg.stripAlpha);
    const w = cfg.stripBgWidth;
    const h = cfg.stripBgHeight;
    const clampedRadii = this.resolveStripBgRadii();
    const maxR = Math.floor(Math.min(w, h) / 2);
    if (maxR > 0) {
      clampedRadii.tl = Math.min(clampedRadii.tl, maxR);
      clampedRadii.tr = Math.min(clampedRadii.tr, maxR);
      clampedRadii.bl = Math.min(clampedRadii.bl, maxR);
      clampedRadii.br = Math.min(clampedRadii.br, maxR);
    }
    this.stripBg.fillRoundedRect(-2, -2, w, h, clampedRadii);
  }

  private getStripBgBounds(): { bgX: number; bgY: number; bgWidth: number; bgHeight: number } {
    const cfg = this._layoutConfig;
    const w = cfg.stripBgWidth;
    const h = cfg.stripBgHeight;
    const bx = (this.stripBg?.x ?? 0) + (-2);
    const by = (this.stripBg?.y ?? 0) + (-2);
    return { bgX: bx, bgY: by, bgWidth: w, bgHeight: h };
  }

  private ensureStripPattern(): void {
    if (!this._layoutConfig.stripPatternEnabled) {
      this._stripPattern?.clear();
      this._stripPattern = undefined;
      if (this._stripTooltipBg) {
        this._stripTooltipBg.destroy();
        this._stripTooltipBg = null;
      }
      return;
    }
    const bounds = this.getStripBgBounds();
    if (!this._stripTooltipBg) {
      this._stripTooltipBg = this.scene.add.nineslice(
        bounds.bgX, bounds.bgY, "tooltip_info", undefined,
        bounds.bgWidth, bounds.bgHeight, 12, 12, 12, 12
      );
      this._stripTooltipBg.setOrigin(0, 0);
      this.iconGridContainer.addAt(this._stripTooltipBg, 0);
    } else {
      this._stripTooltipBg.setDisplaySize(bounds.bgWidth, bounds.bgHeight);
      this._stripTooltipBg.setPosition(bounds.bgX, bounds.bgY);
    }
    if (!this._stripPattern) {
      this._stripPattern = attachModalBackground(
        this.scene as BattleScene,
        this.patternContainer!,
        () => this.getStripBgBounds(),
        {
          mask: false,
          alphaMultiplier: this._layoutConfig.stripPatternAlpha,
          gridInc: -2,
        }
      );
    } else {
      this._stripPattern.redraw(this.getStripBgBounds());
    }
  }

  private rebuildStripHitZones(): void {
    this._stripIconHitZones.forEach(z => z.destroy());
    this._stripIconHitZones = [];

    const CELL = this._dynamicCellSize;
    CommandUiHandler.ICON_COMMANDS.forEach((def) => {
      if (!this._stripColByCursor.has(def.cursor)) return;
      const col = this._stripColByCursor.get(def.cursor)!;
      const pos = this.getStripSlotPosition(col, CELL);
      const zone = this.scene.add.zone(pos.x, pos.y, CELL, CELL);
      zone.setOrigin(0.5, 0.5);
      zone.setInteractive({ useHandCursor: true });
      zone.on("pointerover", () => {
        if (this._suppressHoverCursor) return;
        if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
        if (this.getCursor() !== def.cursor) this.setCursor(def.cursor);
      });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if ((this.scene as BattleScene).ui.getMode() !== Mode.COMMAND) return;
        if (!isPrimaryPointer(pointer)) return;
        this._suppressHoverCursor = false;
        if (this.getCursor() !== def.cursor) {
          this.setCursor(def.cursor);
        } else {
          this.processInput(Button.ACTION);
        }
      });
      zone.on("pointerout", () => {
        this._suppressHoverCursor = false;
      });
      this.iconsContainer.add(zone);
      this._stripIconHitZones.push(zone);
    });
  }

  setCursor(cursor: integer): boolean {
    const prevCursor = this.getCursor();
    const changed = prevCursor !== cursor;
    if (changed) {
      if (!this.fieldIndex) {
        this.cursor = cursor;
      } else {
        this.cursor2 = cursor;
      }
    }

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.image(0, 0, "cursor");
      this.cursorObj.setAlpha(1.0);
      this.cursorObj.setTint(0xffffff);
    }

    if (cursor <= 3) {
      if (this.cursorObj.parentContainer !== this.commandsContainer) {
        this.cursorObj.parentContainer?.remove(this.cursorObj);
        this.commandsContainer.add(this.cursorObj);
      }
      const x = -5 + (cursor % 2 === 1 ? 56 : 0);
      const y = 8 + (cursor >= 2 ? 16 : 0);
      this.cursorObj.setPosition(x, y);
    } else {
      if (this.cursorObj.parentContainer !== this.iconsContainer) {
        this.cursorObj.parentContainer?.remove(this.cursorObj);
        this.iconsContainer.add(this.cursorObj);
      }
      const cSize = this._dynamicCellSize;
      const col = this._stripColByCursor.get(cursor);
      if (col !== undefined) {
        const pos = this.getStripSlotPosition(col, cSize);
        const cursorYOffset = (cursor === 7 || cursor === 9) ? -2 : (cursor === 4 || cursor === 6) ? -1 : 0;
        this.cursorObj.setPosition(pos.x - 8, pos.y + 3 + cursorYOffset);
      }
    }

    this.updateCommandTransparency(cursor);
    this.updateStripScrollArrows(cursor);

    this.cursorObj.setAlpha(1.0);
    this.cursorObj.setTint(0xffffff);

    if (changed && prevCursor === 2) {
      PokemonBattleTooltipUtils.hide();
    }

    this.updateEggHatchCounter();

    return changed;
  }
  private setIconContainerAlpha(container: Phaser.GameObjects.Container, alpha: number): void {
    container.setAlpha(1);
    container.list.forEach(child => {
      const sprite = child as any;
      if (sprite.getData?.("invertedFx") && sprite.postFX?.addColorMatrix) {
        sprite.setAlpha(1);
        sprite.postFX.clear();
        const cm = sprite.postFX.addColorMatrix();
        cm.negative();
        if (alpha < 1) {
          cm.brightness(alpha, true);
        }
      } else {
        sprite.setAlpha?.(alpha);
      }
    });
  }

  private updateCommandTransparency(focusedCursor: integer): void {
    if (this._cmdTweak?.tweakActive) return;
    this.commandIconByCursor.forEach((icon, cursorIdx) => {
      if (!this._visibleStripOrder.includes(cursorIdx)) return;
      const isFocused = cursorIdx === focusedCursor;

      const alpha = isFocused
        ? CommandUiHandler.NEW_COMMAND_FOCUSED_ALPHA
        : CommandUiHandler.NEW_COMMAND_UNFOCUSED_ALPHA;

      icon.setAlpha(alpha);

      const scaleMap: Record<number, string> = {9:"iconScaleMap",6:"iconScaleScanner",5:"iconScaleSkilltree",8:"iconScaleShop",7:"iconScaleEggs",4:"iconScaleTeam"};
      const scaleKey = scaleMap[cursorIdx];
      if (scaleKey) {
        const base = (this._layoutConfig as any)[scaleKey] as number;
        icon.setScale(isFocused ? base + CommandUiHandler.NEW_COMMAND_FOCUSED_SCALE_DELTA : base);
      }

      const shouldGray = this._layoutConfig.stripGrayscaleUnfocused && !isFocused;
      if (shouldGray) {
        if (icon.postFX && typeof icon.postFX.addColorMatrix === "function") {
          icon.postFX.clear();
          icon.postFX.addColorMatrix().grayscale(1);
        }
      } else {
        if (icon.postFX) icon.postFX.clear();
      }
    });

    if (this.playerPokemonIcon) {
      const pFocused = focusedCursor === 10;
      this.setIconContainerAlpha(this.playerPokemonIcon,
        pFocused ? CommandUiHandler.NEW_COMMAND_FOCUSED_ALPHA : CommandUiHandler.NEW_COMMAND_UNFOCUSED_ALPHA);
      const pBase = this.playerPokemonIcon.getData("baseScale") || 0.30;
      this.playerPokemonIcon.setScale(pFocused ? pBase + CommandUiHandler.NEW_COMMAND_FOCUSED_SCALE_DELTA : pBase);
    }
    if (this.enemyPokemonIcon) {
      const eFocused = focusedCursor === 11;
      this.setIconContainerAlpha(this.enemyPokemonIcon,
        eFocused ? CommandUiHandler.NEW_COMMAND_FOCUSED_ALPHA : CommandUiHandler.NEW_COMMAND_UNFOCUSED_ALPHA);
      const eBase = this.enemyPokemonIcon.getData("baseScale") || 0.30;
      this.enemyPokemonIcon.setScale(eFocused ? eBase + CommandUiHandler.NEW_COMMAND_FOCUSED_SCALE_DELTA : eBase);
    }
  }

  clear(): void {
    super.clear();
    this._commandHitZones.forEach(z => z.destroy());
    this._commandHitZones = [];
    this._stripIconHitZones.forEach(z => z.destroy());
    this._stripIconHitZones = [];
    this._stripScrollOffset = 0;
    if (this._stripScrollUpArrow) { this._stripScrollUpArrow.setVisible(false); this._stripScrollUpArrow.disableInteractive(); }
    if (this._stripScrollDownArrow) { this._stripScrollDownArrow.setVisible(false); this._stripScrollDownArrow.disableInteractive(); }
    if (this.playerPokemonIcon) {
      this.playerPokemonIcon.destroy();
      this.playerPokemonIcon = null;
    }
    if (this.enemyPokemonIcon) {
      this.enemyPokemonIcon.destroy();
      this.enemyPokemonIcon = null;
    }
    PokemonBattleTooltipUtils.hide();
    this._stripPattern?.clear();
    this._stripPattern = undefined;
    if (this._stripTooltipBg) {
      this._stripTooltipBg.destroy();
      this._stripTooltipBg = null;
    }
    this._commandPattern?.clear();
    this._commandPattern = undefined;
    this.getUi().getMessageHandler().commandBacking.setVisible(false);
    this.getUi().getMessageHandler().commandWindow.setVisible(false);
    this.commandsContainer.setVisible(false);
    this.iconGridContainer.setVisible(false);
    const mh = this.getUi().getMessageHandler();
    mh.clearText();
    mh.message.setVisible(true);
    mh.messageContainer.setPosition(12, -39);
    mh.message.setAlpha(1);
    mh.message.setFontSize("96px");
    if (this.eggHatchCounterText) this.eggHatchCounterText.setVisible(false);
    this.eraseCursor();
    this._cmdTweak?.deactivate();
  }

  eraseCursor(): void {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

  private updateEggHatchCounter(): void {
    const eggs = (this.scene as BattleScene).gameData?.eggs;
    if (!eggs || eggs.length === 0 || !this.eggHatchCounterText) {
      if (this.eggHatchCounterText) this.eggHatchCounterText.setVisible(false);
      return;
    }
    const eggIcon = this.commandIconByCursor.get(7);
    if (!eggIcon || !eggIcon.visible) {
      this.eggHatchCounterText.setVisible(false);
      return;
    }
    const minWaves = Math.min(...eggs.map(e => e.hatchWaves));
    this.eggHatchCounterText.setText(minWaves.toString());
    this.eggHatchCounterText.setPosition(eggIcon.x + eggIcon.displayWidth / 2 - 2, eggIcon.y + 4);
    this.eggHatchCounterText.setVisible(true);
  }

  private initCommandTweak(): void {
    const scene = this.scene as BattleScene;
    this._cmdTweak = new CommandUiTweakController(scene, this);
    scene.commandUiTweak = this._cmdTweak;
  }

  applyCommandLayout(): void {
    const cfg = this._layoutConfig;
    if (!this._tweakedElements.has("1cmd-CommandsContainer")) {
      this.commandsContainer.setPosition(cfg.textX, cfg.textY);
    }
    if (!this._tweakedElements.has("1cmd-IconStripContainer")) {
      this.iconGridContainer.setPosition(cfg.stripX, cfg.stripY);
    }

    const textAssets = ["1cmd-FightText", "1cmd-BallText", "1cmd-PokemonText", "1cmd-RunText"];
    this.commandTextByCursor.forEach((text, idx) => {
      if (this._tweakedElements.has(textAssets[idx])) return;
      text.setFontSize(cfg.fontSize + "px");
      const x = (idx % 2 === 1) ? cfg.gapX : 0;
      const y = (idx >= 2) ? cfg.gapY : 0;
      text.setPosition(x, y);
    });

    const cursorToScaleKey: Record<number, keyof CommandUILayoutConfig> = {
      9: "iconScaleMap",
      6: "iconScaleScanner",
      5: "iconScaleSkilltree",
      8: "iconScaleShop",
      7: "iconScaleEggs",
      4: "iconScaleTeam",
    };

    const cursorToAsset: Record<number, string> = {
      9: "1cmd-IconMap", 6: "1cmd-IconScanner", 5: "1cmd-IconSkilltree",
      8: "1cmd-IconShop", 7: "1cmd-IconEggs", 4: "1cmd-IconTeam",
    };

    this.commandIconByCursor.forEach((icon, cursor) => {
      if (this._tweakedElements.has(cursorToAsset[cursor])) return;
      const key = cursorToScaleKey[cursor];
      if (key) {
        icon.setScale(cfg[key] as number);
      }
    });

    this._dynamicCellSize = cfg.iconGap;
    this._stripColByCursor.clear();

    const isVert = cfg.stripVertical;
    const total = this._visibleStripOrder.length;
    const pageSize = isVert ? CommandUiHandler.STRIP_PAGE_SIZE : total;
    const maxOffset = Math.max(0, total - pageSize);
    if (this._stripScrollOffset > maxOffset) this._stripScrollOffset = maxOffset;
    const pageStart = this._stripScrollOffset;
    const pageEnd = Math.min(pageStart + pageSize, total);
    const pageCursors = new Set(this._visibleStripOrder.slice(pageStart, pageEnd));

    let displaySlot = 0;
    const pageSlice = this._visibleStripOrder.slice(pageStart, pageEnd);

    for (const cursor of pageSlice) {
      this._stripColByCursor.set(cursor, displaySlot);
      if (cursor >= 4 && cursor <= 9) {
        const icon = this.commandIconByCursor.get(cursor);
        if (icon) {
          icon.setVisible(true);
          const pos = this.getStripSlotPosition(displaySlot, cfg.iconGap);
          if (!this._tweakedElements.has(cursorToAsset[cursor])) {
            icon.setPosition(pos.x, pos.y);
          }
        }
      }
      displaySlot++;
    }

    CommandUiHandler.ICON_COMMANDS.forEach((def) => {
      if (!pageCursors.has(def.cursor)) {
        const icon = this.commandIconByCursor.get(def.cursor);
        if (icon) icon.setVisible(false);
      }
    });

    if (isVert && !this._tweakedElements.has("1cmd-StripBg")) {
      this._layoutConfig.stripBgHeight = CMD_LAYOUT_DEFAULTS.stripBgHeight;
    }

    this.redrawStripBg();
    this.ensureStripPattern();
    this.rebuildStripHitZones();

    const mh = this.getUi().getMessageHandler();
    if (!this._tweakedElements.has("1cmd-PromptContainer")) {
      mh.messageContainer.setPosition(12 + cfg.promptX, -39 + cfg.promptY);
    }
    if (!this._tweakedElements.has("1cmd-PromptText")) {
      mh.message.setAlpha(cfg.promptAlpha);
      mh.message.setFontSize(cfg.promptFontSize + "px");
    }

    this.refreshPokemonIcons();
    this.updateCommandTransparency(this.getCursor());
    this.updateStripScrollArrows(this.getCursor());
    this.updateEggHatchCounter();
  }

  getLayoutConfig(): CommandUILayoutConfig {
    return this._layoutConfig;
  }

  getStripBg(): Phaser.GameObjects.Graphics | null {
    return this.stripBg ?? null;
  }

  markElementTweaked(assetName: string): void {
    this._tweakedElements.add(assetName);
  }

  clearTweakedElements(): void {
    this._tweakedElements.clear();
  }

  isElementTweaked(assetName: string): boolean {
    return this._tweakedElements.has(assetName);
  }

  setLayoutValue(key: keyof CommandUILayoutConfig, value: number | boolean | string): void {
    if (key === "stripVertical" && typeof value === "boolean" && value !== this._layoutConfig.stripVertical) {
      const w = this._layoutConfig.stripBgWidth;
      this._layoutConfig.stripBgWidth = this._layoutConfig.stripBgHeight;
      this._layoutConfig.stripBgHeight = w;
    }
    (this._layoutConfig as any)[key] = value;
    if (key === "stripPatternEnabled" || key === "stripPatternAlpha") {
      if (key === "stripPatternAlpha") {
        this._stripPattern?.clear();
        this._stripPattern = undefined;
      }
      this.ensureStripPattern();
    }
    if (key === "stripGrayscaleUnfocused") {
      this.updateCommandTransparency(this.getCursor());
    }
    this.applyCommandLayout();
  }

  getCmdTweakTarget(index: number): any {
    const name = COMMAND_TWEAK_ASSETS[index];
    switch (name) {
      case "1cmd-FightText": return this.commandTextByCursor.get(0) ?? null;
      case "1cmd-BallText": return this.commandTextByCursor.get(1) ?? null;
      case "1cmd-PokemonText": return this.commandTextByCursor.get(2) ?? null;
      case "1cmd-RunText": return this.commandTextByCursor.get(3) ?? null;
      case "1cmd-CommandsContainer": return this.commandsContainer ?? null;
      case "1cmd-IconStripContainer": return this.iconGridContainer ?? null;
      case "1cmd-IconsContainer": return this.iconsContainer ?? null;
      case "1cmd-StripBg": return this.stripBg ?? null;
      case "1cmd-IconMap": return this.commandIconByCursor.get(9) ?? null;
      case "1cmd-IconScanner": return this.commandIconByCursor.get(6) ?? null;
      case "1cmd-IconSkilltree": return this.commandIconByCursor.get(5) ?? null;
      case "1cmd-IconShop": return this.commandIconByCursor.get(8) ?? null;
      case "1cmd-IconEggs": return this.commandIconByCursor.get(7) ?? null;
      case "1cmd-IconTeam": return this.commandIconByCursor.get(4) ?? null;
      case "1cmd-PromptText": return this.getUi().getMessageHandler().message ?? null;
      case "1cmd-PromptContainer": return this.getUi().getMessageHandler().messageContainer ?? null;
      case "1cmd-CommandBacking": return this.getUi().getMessageHandler().commandBacking ?? null;
      case "1cmd-CommandWindow": return this.getUi().getMessageHandler().commandWindow ?? null;
      default: return null;
    }
  }

}

const ASSET_TO_CONFIG_KEY: Record<string, keyof CommandUILayoutConfig> = {
  "0command-fontSize": "fontSize",
  "0command-textX": "textX",
  "0command-textY": "textY",
  "0command-gapX": "gapX",
  "0command-gapY": "gapY",
  "0command-stripX": "stripX",
  "0command-stripY": "stripY",
  "0command-stripAlpha": "stripAlpha",
  "0command-stripBgColor": "stripBgColor",
  "0command-stripVertical": "stripVertical",
  "0command-stripPatternEnabled": "stripPatternEnabled",
  "0command-stripPatternAlpha": "stripPatternAlpha",
  "0command-stripGrayscaleUnfocused": "stripGrayscaleUnfocused",
  "0command-stripBgRadius": "stripBgRadius",
  "0command-stripBgCornerMode": "stripBgCornerMode",
  "0command-iconScale-map": "iconScaleMap",
  "0command-iconScale-scanner": "iconScaleScanner",
  "0command-iconScale-skilltree": "iconScaleSkilltree",
  "0command-iconScale-shop": "iconScaleShop",
  "0command-iconScale-eggs": "iconScaleEggs",
  "0command-iconScale-team": "iconScaleTeam",
  "0command-iconScale-pokemon": "iconScalePokemon",
  "0command-iconGap": "iconGap",
  "0command-promptX": "promptX",
  "0command-promptY": "promptY",
  "0command-promptAlpha": "promptAlpha",
  "0command-promptFontSize": "promptFontSize",
};

export class CommandUiTweakController {
  private _metaMode: TweakMetaMode = TweakMetaMode.NONE;
  private _tweakAssetIndex: number = 0;
  private _tweakModeIndex: number = 0;
  private _scene: BattleScene;
  private _handler: CommandUiHandler;
  private _hudText: Phaser.GameObjects.Text | null = null;
  private _dropdownPanel: TweakDropdownPanel | null = null;
  private _keyOneHandler: (() => void) | null = null;
  private _keyTwoHandler: (() => void) | null = null;
  private _keyThreeHandler: (() => void) | null = null;
  private _keyVHandler: (() => void) | null = null;
  private _keyRHandler: (() => void) | null = null;
  private _keyFiveHandler: (() => void) | null = null;
  private _baselines: Map<string, { x: number; y: number; scaleX: number; scaleY: number; alpha: number; fontSize: number; displayWidth: number; displayHeight: number }> = new Map();

  get tweakActive(): boolean { return this._metaMode !== TweakMetaMode.NONE; }

  constructor(scene: BattleScene, handler: CommandUiHandler) {
    this._scene = scene;
    this._handler = handler;
  }

  private resolveHudText(): Phaser.GameObjects.Text | null {
    if (!this._hudText) {
      this._hudText = this._scene.yuTuneHudText;
    }
    return this._hudText;
  }

  onCycleAbility(): boolean {
    const wasActive = this._metaMode !== TweakMetaMode.NONE;
    this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
    const isActive = this._metaMode !== TweakMetaMode.NONE;
    this.updateHUD();

    if (isActive && !wasActive) {
      const playerBi = this._scene.getPlayerField()[0]?.getBattleInfo() as any;
      const enemyBi = this._scene.getEnemyField()[0]?.getBattleInfo() as any;
      if (playerBi?.biTweakActive) {
        playerBi._biMetaMode = 0;
        playerBi._biDropdownPanel?.destroy();
        playerBi._biDropdownPanel = null;
        playerBi.updateBiTweakHUD?.();
      }
      if (enemyBi?.biTweakActive) {
        enemyBi._biMetaMode = 0;
        enemyBi._biDropdownPanel?.destroy();
        enemyBi._biDropdownPanel = null;
        enemyBi.updateBiTweakHUD?.();
      }
      try { (BattleInfo as any)._biTweakSessionOwner = null; } catch {}
      this.captureBaselines();
      this.setupKeyListeners();
      this._dropdownPanel = new TweakDropdownPanel({
        scene: this._scene,
        coordSpace: "logical",
        getAnchorGameCoords: () => ({ x: 2, y: 2 }),
        elements: COMMAND_TWEAK_ASSETS,
        modes: COMMAND_TWEAK_MODES,
        elementGroups: COMMAND_TWEAK_ASSET_GROUPS,
        onElementChange: (_name, idx) => {
          this._tweakAssetIndex = idx;
          this.updateHUD();
        },
        onModeChange: (_name, idx) => {
          this._tweakModeIndex = idx;
          this.updateHUD();
        },
      });
      this._dropdownPanel.create();
    } else if (!isActive && wasActive) {
      this.cleanupKeyListeners();
      this._dropdownPanel?.destroy();
      this._dropdownPanel = null;
      this._scene.refreshUiEditModeActive();
    }
    return true;
  }

  processInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      this._metaMode = TweakMetaMode.NONE;
      this.cleanupKeyListeners();
      this._dropdownPanel?.destroy();
      this._dropdownPanel = null;
      this.updateHUD();
      this._scene.refreshUiEditModeActive();
      return true;
    }

    if (button === Button.SUBMIT) {
      if (this._metaMode === TweakMetaMode.EDIT_TYPE || this._metaMode === TweakMetaMode.ELEMENT) {
        this._metaMode = TweakMetaMode.EDIT;
        this.updateHUD();
      }
      return true;
    }

    if (this._metaMode === TweakMetaMode.EDIT_TYPE) {
      if (button === Button.LEFT) {
        this._tweakModeIndex = (this._tweakModeIndex - 1 + COMMAND_TWEAK_MODES.length) % COMMAND_TWEAK_MODES.length;
        this.updateHUD();
        this._dropdownPanel?.syncModeValue(COMMAND_TWEAK_MODES[this._tweakModeIndex]);
      } else if (button === Button.RIGHT) {
        this._tweakModeIndex = (this._tweakModeIndex + 1) % COMMAND_TWEAK_MODES.length;
        this.updateHUD();
        this._dropdownPanel?.syncModeValue(COMMAND_TWEAK_MODES[this._tweakModeIndex]);
      }
      return true;
    }

    if (this._metaMode === TweakMetaMode.ELEMENT) {
      if (button === Button.LEFT) {
        this._tweakAssetIndex = (this._tweakAssetIndex - 1 + COMMAND_TWEAK_ASSETS.length) % COMMAND_TWEAK_ASSETS.length;
        this.updateHUD();
        this._dropdownPanel?.syncElementValue(COMMAND_TWEAK_ASSETS[this._tweakAssetIndex]);
      } else if (button === Button.RIGHT) {
        this._tweakAssetIndex = (this._tweakAssetIndex + 1) % COMMAND_TWEAK_ASSETS.length;
        this.updateHUD();
        this._dropdownPanel?.syncElementValue(COMMAND_TWEAK_ASSETS[this._tweakAssetIndex]);
      }
      return true;
    }

    if (this._metaMode === TweakMetaMode.EDIT) {
      const assetName = COMMAND_TWEAK_ASSETS[this._tweakAssetIndex];
      const configKey = ASSET_TO_CONFIG_KEY[assetName];
      const modeName = COMMAND_TWEAK_MODES[this._tweakModeIndex];
      const resolved = resolveTweakMode(modeName);

      if (configKey) {
        if (assetName === "0command-stripVertical" || assetName === "0command-stripPatternEnabled" || assetName === "0command-stripGrayscaleUnfocused") {
          if (button === Button.LEFT || button === Button.RIGHT || button === Button.UP || button === Button.DOWN) {
            const cfg = this._handler.getLayoutConfig();
            this._handler.setLayoutValue(configKey, !(cfg[configKey] as boolean));
            this.updateHUD();
          }
          return true;
        }

        if (assetName === "0command-stripBgColor") {
          const cfg = this._handler.getLayoutConfig();
          const currentIdx = STRIP_BG_COLOR_PRESETS.findIndex(p => p.value === cfg.stripBgColor);
          let nextIdx = currentIdx;
          if (button === Button.RIGHT || button === Button.UP) {
            nextIdx = (currentIdx + 1) % STRIP_BG_COLOR_PRESETS.length;
          } else if (button === Button.LEFT || button === Button.DOWN) {
            nextIdx = (currentIdx - 1 + STRIP_BG_COLOR_PRESETS.length) % STRIP_BG_COLOR_PRESETS.length;
          }
          if (nextIdx !== currentIdx) {
            this._handler.setLayoutValue(configKey, STRIP_BG_COLOR_PRESETS[nextIdx].value);
            this.updateHUD();
          }
          return true;
        }

        if (assetName === "0command-stripBgCornerMode") {
          const cfg = this._handler.getLayoutConfig();
          const currentIdx = STRIP_BG_CORNER_MODES.indexOf(cfg.stripBgCornerMode);
          let nextIdx = currentIdx < 0 ? 0 : currentIdx;
          if (button === Button.RIGHT || button === Button.UP) {
            nextIdx = (nextIdx + 1) % STRIP_BG_CORNER_MODES.length;
          } else if (button === Button.LEFT || button === Button.DOWN) {
            nextIdx = (nextIdx - 1 + STRIP_BG_CORNER_MODES.length) % STRIP_BG_CORNER_MODES.length;
          }
          this._handler.setLayoutValue("stripBgCornerMode", STRIP_BG_CORNER_MODES[nextIdx] as any);
          this.updateHUD();
          return true;
        }

        const step = getCommandTweakStep(assetName) * resolved.multiplier;
        const { min, max } = getCommandTweakMinMax(assetName);
        let delta = 0;

        if (button === Button.LEFT) delta = -step;
        else if (button === Button.RIGHT) delta = step;
        else if (button === Button.UP) delta = step;
        else if (button === Button.DOWN) delta = -step;

        if (delta !== 0) {
          const cfg = this._handler.getLayoutConfig();
          let newVal = (cfg[configKey] as number) + delta;
          newVal = Math.max(min, Math.min(max, newVal));
          newVal = Math.round(newVal * 1000) / 1000;
          this._handler.setLayoutValue(configKey, newVal);
          this.updateHUD();
        }
      } else {
        const target = this._handler.getCmdTweakTarget(this._tweakAssetIndex);
        if (!target) return true;
        const step = this.getElementStep(resolved.base) * resolved.multiplier;
        let delta = 0;
        if (button === Button.LEFT) delta = -step;
        else if (button === Button.RIGHT) delta = step;
        else if (button === Button.UP) delta = step;
        else if (button === Button.DOWN) delta = -step;

        if (delta !== 0) {
          this.applyElementDelta(target, resolved.base, delta, button);
          this._handler.markElementTweaked(assetName);
          this.updateHUD();
        }
      }
      return true;
    }

    return true;
  }

  private getElementStep(mode: string): number {
    switch (mode) {
      case "position": return 0.5;
      case "scale": return 0.01;
      case "alpha": return 0.01;
      case "fontSize": return 1;
      case "width": return 1;
      case "height": return 1;
      default: return 0.5;
    }
  }

  private applyElementDelta(target: any, mode: string, delta: number, button: Button): void {
    if (target === this._handler.getStripBg() && (mode === "width" || mode === "height")) {
      const cfg = this._handler.getLayoutConfig();
      if (mode === "width") cfg.stripBgWidth = Math.max(1, cfg.stripBgWidth + delta);
      else cfg.stripBgHeight = Math.max(1, cfg.stripBgHeight + delta);
      this._handler.markElementTweaked("1cmd-StripBg");
      this._handler.applyCommandLayout();
      return;
    }
    switch (mode) {
      case "position":
        if (button === Button.LEFT || button === Button.RIGHT) {
          target.x = (target.x ?? 0) + delta;
        } else {
          target.y = (target.y ?? 0) - delta;
        }
        break;
      case "scale": {
        const sx = (target.scaleX ?? 1) + delta;
        const sy = (target.scaleY ?? 1) + delta;
        target.setScale(Math.max(0.01, sx), Math.max(0.01, sy));
        break;
      }
      case "alpha":
        target.alpha = Math.max(0, Math.min(1, (target.alpha ?? 1) + delta));
        break;
      case "fontSize":
        if (target.style && target.setFontSize) {
          const current = parseInt(target.style.fontSize || "66", 10);
          target.setFontSize((current + delta) + "px");
        }
        break;
      case "width":
        if (target.displayWidth !== undefined && typeof target.setDisplaySize === "function") {
          const newW = Math.max(1, target.displayWidth + delta);
          target.setDisplaySize(newW, target.displayHeight);
        }
        break;
      case "height":
        if (target.displayHeight !== undefined && typeof target.setDisplaySize === "function") {
          const newH = Math.max(1, target.displayHeight + delta);
          target.setDisplaySize(target.displayWidth, newH);
        }
        break;
    }
  }

  private setupKeyListeners(): void {
    this._keyOneHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this._scene.uiEditModeActive) return;
      this._metaMode = cycleMetaMode(this._metaMode, TWEAK_META_CYCLE);
      if (this._metaMode === TweakMetaMode.NONE) {
        this.cleanupKeyListeners();
        this._scene.refreshUiEditModeActive();
      }
      this.updateHUD();
    };
    this._keyTwoHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      this._tweakAssetIndex = (this._tweakAssetIndex + 1) % COMMAND_TWEAK_ASSETS.length;
      this.updateHUD();
      this._dropdownPanel?.syncElementValue(COMMAND_TWEAK_ASSETS[this._tweakAssetIndex]);
      this._dropdownPanel?.markUsed(COMMAND_TWEAK_ASSETS[this._tweakAssetIndex]);
    };
    this._keyThreeHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      this._tweakAssetIndex = (this._tweakAssetIndex - 1 + COMMAND_TWEAK_ASSETS.length) % COMMAND_TWEAK_ASSETS.length;
      this.updateHUD();
      this._dropdownPanel?.syncElementValue(COMMAND_TWEAK_ASSETS[this._tweakAssetIndex]);
      this._dropdownPanel?.markUsed(COMMAND_TWEAK_ASSETS[this._tweakAssetIndex]);
    };
    this._keyVHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this._scene.uiEditModeActive) return;
      const output = this.outputFullSnapshot();
      console.log(output);
      tweakCopyToClipboard(output);
    };
    this._keyRHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      if (!this._scene.uiEditModeActive) return;
      const assetName = COMMAND_TWEAK_ASSETS[this._tweakAssetIndex];
      const configKey = ASSET_TO_CONFIG_KEY[assetName];
      if (configKey) {
        this._handler.setLayoutValue(configKey, CMD_LAYOUT_DEFAULTS[configKey] as any);
        this.updateHUD();
      } else {
        const target = this._handler.getCmdTweakTarget(this._tweakAssetIndex);
        const baseline = this._baselines.get(assetName);
        if (target && baseline) {
          target.x = baseline.x;
          target.y = baseline.y;
          if (typeof target.setScale === "function") target.setScale(baseline.scaleX, baseline.scaleY);
          target.alpha = baseline.alpha;
          if (target.style && target.setFontSize && baseline.fontSize > 0) target.setFontSize(baseline.fontSize + "px");
          if (typeof target.setDisplaySize === "function" && baseline.displayWidth > 0 && baseline.displayHeight > 0) {
            target.setDisplaySize(baseline.displayWidth, baseline.displayHeight);
          }
          this._handler.clearTweakedElements();
          this.updateHUD();
        }
      }
    };
    this._keyFiveHandler = () => {
      if (this._metaMode === TweakMetaMode.NONE) return;
      this._dropdownPanel?.toggle();
    };
    this._scene.input.keyboard?.on("keydown-ONE", this._keyOneHandler);
    this._scene.input.keyboard?.on("keydown-TWO", this._keyTwoHandler);
    this._scene.input.keyboard?.on("keydown-THREE", this._keyThreeHandler);
    this._scene.input.keyboard?.on("keydown-V", this._keyVHandler);
    this._scene.input.keyboard?.on("keydown-R", this._keyRHandler);
    this._scene.input.keyboard?.on("keydown-FIVE", this._keyFiveHandler);
  }

  private cleanupKeyListeners(): void {
    if (this._keyOneHandler) { this._scene.input.keyboard?.off("keydown-ONE", this._keyOneHandler); this._keyOneHandler = null; }
    if (this._keyTwoHandler) { this._scene.input.keyboard?.off("keydown-TWO", this._keyTwoHandler); this._keyTwoHandler = null; }
    if (this._keyThreeHandler) { this._scene.input.keyboard?.off("keydown-THREE", this._keyThreeHandler); this._keyThreeHandler = null; }
    if (this._keyVHandler) { this._scene.input.keyboard?.off("keydown-V", this._keyVHandler); this._keyVHandler = null; }
    if (this._keyRHandler) { this._scene.input.keyboard?.off("keydown-R", this._keyRHandler); this._keyRHandler = null; }
    if (this._keyFiveHandler) { this._scene.input.keyboard?.off("keydown-FIVE", this._keyFiveHandler); this._keyFiveHandler = null; }
    this._dropdownPanel?.destroy();
    this._dropdownPanel = null;
  }

  private updateHUD(): void {
    const hud = this.resolveHudText();
    if (!hud) return;
    if (this._metaMode === TweakMetaMode.NONE) {
      hud.setVisible(false);
      return;
    }
    const assetName = COMMAND_TWEAK_ASSETS[this._tweakAssetIndex];
    const modeName = COMMAND_TWEAK_MODES[this._tweakModeIndex];
    const configKey = ASSET_TO_CONFIG_KEY[assetName];
    let text: string;
    let color: string;
    switch (this._metaMode) {
      case TweakMetaMode.EDIT: {
        if (configKey) {
          const cfg = this._handler.getLayoutConfig();
          const val = cfg[configKey];
          let valStr: string;
          if (typeof val === "boolean") {
            valStr = String(val);
          } else if (assetName === "0command-stripBgColor") {
            const preset = STRIP_BG_COLOR_PRESETS.find(p => p.value === val);
            valStr = preset ? preset.name : `0x${(val as number).toString(16).padStart(6, "0")}`;
          } else if (assetName === "0command-stripBgCornerMode") {
            valStr = String(val);
          } else {
            valStr = String(Math.round((val as number) * 1000) / 1000);
          }
          text = `CMD EDIT [${modeName}] - ${assetName} = ${valStr}`;
        } else {
          const target = this._handler.getCmdTweakTarget(this._tweakAssetIndex);
          const valStr = target ? this.getTargetDisplayValue(target, modeName) : "N/A";
          text = `CMD EDIT [${modeName}] - ${assetName} = ${valStr}`;
        }
        color = "#00FF00";
        break;
      }
      case TweakMetaMode.EDIT_TYPE:
        text = `CMD TYPE - ${modeName}`;
        color = "#FFD700";
        break;
      case TweakMetaMode.ELEMENT:
        text = `CMD SELECT - ${assetName}`;
        color = "#40C8F8";
        break;
      default:
        text = "";
        color = "";
    }
    hud.setText(text);
    hud.setColor(color);
    hud.setVisible(true);
    const parent = hud.parentContainer;
    if (parent) parent.bringToTop(hud);
  }

  private getTargetDisplayValue(target: any, mode: string): string {
    const { base } = resolveTweakMode(mode);
    switch (base) {
      case "position": return `x=${(target.x ?? 0).toFixed(1)} y=${(target.y ?? 0).toFixed(1)}`;
      case "scale": return `scaleX=${(target.scaleX ?? 1).toFixed(3)} scaleY=${(target.scaleY ?? 1).toFixed(3)}`;
      case "alpha": return `α=${(target.alpha ?? 1).toFixed(2)}`;
      case "fontSize": return target.style ? `${parseInt(target.style.fontSize || "0", 10)}px` : "N/A";
      case "width": return `w=${(target.displayWidth ?? 0).toFixed(1)}`;
      case "height": return `h=${(target.displayHeight ?? 0).toFixed(1)}`;
      default: return "";
    }
  }

  private captureBaselines(): void {
    this._baselines.clear();
    this._handler.clearTweakedElements();
    for (let i = 0; i < COMMAND_TWEAK_ASSETS.length; i++) {
      const name = COMMAND_TWEAK_ASSETS[i];
      if (ASSET_TO_CONFIG_KEY[name]) continue;
      const target = this._handler.getCmdTweakTarget(i);
      if (!target) continue;
      this._baselines.set(name, {
        x: target.x ?? 0,
        y: target.y ?? 0,
        scaleX: target.scaleX ?? 1,
        scaleY: target.scaleY ?? 1,
        alpha: target.alpha ?? 1,
        fontSize: target.style ? parseInt(target.style.fontSize || "0", 10) : 0,
        displayWidth: target.displayWidth ?? 0,
        displayHeight: target.displayHeight ?? 0,
      });
    }
  }

  private outputFullSnapshot(): string {
    const lines: string[] = ["[CMD-TWEAK] SNAPSHOT", "NOTE: Use DELTA values for code adjustments. Do not paste current values directly as defaults.", ""];
    const cfg = this._handler.getLayoutConfig();
    const fmt = (n: number) => Math.round(n * 1000) / 1000;

    lines.push(`0command-fontSize: ${fmt(cfg.fontSize)}`);
    lines.push(`0command-textX: ${fmt(cfg.textX)}`);
    lines.push(`0command-textY: ${fmt(cfg.textY)}`);
    lines.push(`0command-gapX: ${fmt(cfg.gapX)}`);
    lines.push(`0command-gapY: ${fmt(cfg.gapY)}`);
    lines.push(`0command-stripX: ${fmt(cfg.stripX)}`);
    lines.push(`0command-stripY: ${fmt(cfg.stripY)}`);
    lines.push(`0command-stripAlpha: ${fmt(cfg.stripAlpha)}`);
    lines.push(`0command-iconScale-map: ${fmt(cfg.iconScaleMap)}`);
    lines.push(`0command-iconScale-scanner: ${fmt(cfg.iconScaleScanner)}`);
    lines.push(`0command-iconScale-skilltree: ${fmt(cfg.iconScaleSkilltree)}`);
    lines.push(`0command-iconScale-shop: ${fmt(cfg.iconScaleShop)}`);
    lines.push(`0command-iconScale-eggs: ${fmt(cfg.iconScaleEggs)}`);
    lines.push(`0command-iconScale-team: ${fmt(cfg.iconScaleTeam)}`);
    lines.push(`0command-iconScale-pokemon: ${fmt(cfg.iconScalePokemon)}`);
    lines.push(`0command-iconGap: ${fmt(cfg.iconGap)}`);
    lines.push(`0command-stripBgWidth: ${fmt(cfg.stripBgWidth)}`);
    lines.push(`0command-stripBgHeight: ${fmt(cfg.stripBgHeight)}`);
    lines.push(`0command-stripVertical: ${cfg.stripVertical}`);
    const colorPreset = STRIP_BG_COLOR_PRESETS.find(p => p.value === cfg.stripBgColor);
    lines.push(`0command-stripBgColor: ${colorPreset ? colorPreset.name : "0x" + cfg.stripBgColor.toString(16).padStart(6, "0")}`);
    lines.push(`0command-stripPatternEnabled: ${cfg.stripPatternEnabled}`);
    lines.push(`0command-stripPatternAlpha: ${fmt(cfg.stripPatternAlpha)}`);
    lines.push(`0command-stripGrayscaleUnfocused: ${cfg.stripGrayscaleUnfocused}`);
    lines.push(`0command-stripBgRadius: ${fmt(cfg.stripBgRadius)}`);
    lines.push(`0command-stripBgCornerMode: ${cfg.stripBgCornerMode}`);
    lines.push(`0command-promptX: ${fmt(cfg.promptX)}`);
    lines.push(`0command-promptY: ${fmt(cfg.promptY)}`);
    lines.push(`0command-promptAlpha: ${fmt(cfg.promptAlpha)}`);
    lines.push(`0command-promptFontSize: ${fmt(cfg.promptFontSize)}`);
    lines.push("");

    const configChanged: string[] = [];
    for (const [asset, key] of Object.entries(ASSET_TO_CONFIG_KEY)) {
      const current = cfg[key];
      const def = CMD_LAYOUT_DEFAULTS[key];
      if (typeof current === "boolean") {
        if (current !== def) {
          configChanged.push(`${asset}: ${def} -> ${current}`);
        }
      } else if (asset === "0command-stripBgColor") {
        if (current !== def) {
          const curPreset = STRIP_BG_COLOR_PRESETS.find(p => p.value === current);
          const defPreset = STRIP_BG_COLOR_PRESETS.find(p => p.value === def);
          configChanged.push(`${asset}: ${defPreset?.name ?? "0x" + (def as number).toString(16)} -> ${curPreset?.name ?? "0x" + (current as number).toString(16)}`);
        }
      } else {
        const cNum = current as number;
        const dNum = def as number;
        if (Math.abs(cNum - dNum) > 0.001) {
          configChanged.push(`${asset}: ${fmt(dNum)} -> ${fmt(cNum)} (delta: ${cNum >= dNum ? "+" : ""}${fmt(cNum - dNum)})`);
        }
      }
    }
    for (const key of ["stripBgWidth", "stripBgHeight"] as (keyof CommandUILayoutConfig)[]) {
      const current = cfg[key] as number;
      const def = CMD_LAYOUT_DEFAULTS[key] as number;
      if (Math.abs(current - def) > 0.001) {
        configChanged.push(`0command-${key}: ${fmt(def)} -> ${fmt(current)} (delta: ${current >= def ? "+" : ""}${fmt(current - def)})`);
      }
    }
    if (configChanged.length > 0) {
      lines.push("── CONFIG CHANGED vs DEFAULTS ──");
      lines.push(...configChanged);
      lines.push("");
    }

    const changed: string[] = [];
    const unchanged: string[] = [];

    for (let i = 0; i < COMMAND_TWEAK_ASSETS.length; i++) {
      const name = COMMAND_TWEAK_ASSETS[i];
      if (ASSET_TO_CONFIG_KEY[name]) continue;
      const target = this._handler.getCmdTweakTarget(i);
      if (!target) continue;
      const baseline = this._baselines.get(name);
      if (!baseline) continue;

      const cx = target.x ?? 0;
      const cy = target.y ?? 0;
      const csx = target.scaleX ?? 1;
      const csy = target.scaleY ?? 1;
      const ca = target.alpha ?? 1;
      const cfs = target.style ? parseInt(target.style.fontSize || "0", 10) : 0;
      const cw = target.displayWidth ?? 0;
      const ch = target.displayHeight ?? 0;

      const dx = cx - baseline.x;
      const dy = cy - baseline.y;
      const dsx = csx - baseline.scaleX;
      const dsy = csy - baseline.scaleY;
      const da = ca - baseline.alpha;
      const dfs = cfs - baseline.fontSize;
      const dw = cw - baseline.displayWidth;
      const dh = ch - baseline.displayHeight;

      const hasDelta = Math.abs(dx) > 0.01 || Math.abs(dy) > 0.01 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001 || Math.abs(da) >= 0.005 || Math.abs(dfs) > 0 || Math.abs(dw) > 0.01 || Math.abs(dh) > 0.01;

      if (hasDelta) {
        const s = (v: number) => v >= 0 ? "+" + v.toFixed(2) : v.toFixed(2);
        changed.push(`${name}:\n  delta:    Δx=${s(dx)} Δy=${s(dy)} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δw=${s(dw)} Δh=${s(dh)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)} ΔfontSize=${dfs >= 0 ? "+" : ""}${dfs}\n  current:  x=${cx.toFixed(1)} y=${cy.toFixed(1)} scaleX=${csx.toFixed(3)} scaleY=${csy.toFixed(3)} w=${cw.toFixed(1)} h=${ch.toFixed(1)} α=${ca.toFixed(2)} fontSize=${cfs}\n  baseline: x=${baseline.x.toFixed(1)} y=${baseline.y.toFixed(1)} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} w=${baseline.displayWidth.toFixed(1)} h=${baseline.displayHeight.toFixed(1)} α=${baseline.alpha.toFixed(2)} fontSize=${baseline.fontSize}`);
      } else {
        unchanged.push(name);
      }
    }

    if (changed.length > 0) {
      lines.push("── CHANGED ──");
      lines.push(...changed);
      lines.push("");
    }
    if (unchanged.length > 0) {
      lines.push(`── UNCHANGED ── (${unchanged.length}): ${unchanged.join(", ")}`);
    }

    return lines.join("\n");
  }

  deactivate(): void {
    const wasActive = this._metaMode !== TweakMetaMode.NONE;
    this._metaMode = TweakMetaMode.NONE;
    this.cleanupKeyListeners();
    this._dropdownPanel?.destroy();
    this._dropdownPanel = null;
    const hud = this.resolveHudText();
    if (hud) hud.setVisible(false);
    if (wasActive) this._scene.refreshUiEditModeActive();
  }
}