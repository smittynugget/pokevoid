import BattleScene from "../battle-scene";
import Pokemon, { MoveResult, PlayerPokemon, PokemonMove } from "../field/pokemon";
import { addBBCodeTextObject, addTextObject, getTextColor, TextStyle } from "./text";
import { Command } from "./command-ui-handler";
import MessageUiHandler from "./message-ui-handler";
import { Mode } from "./ui";
import * as Utils from "../utils";
import { CollectedTypeModifier, PokemonFormChangeItemModifier, PokemonHeldItemModifier, SwitchEffectTransferModifier } from "../modifier/modifier";
import { allMoves, ForceSwitchOutAttr } from "../data/move";
import { getGenderColor, getGenderSymbol } from "../data/gender";
import { StatusEffect } from "../data/status-effect";
import PokemonIconAnimHandler, { PokemonIconAnimMode } from "./pokemon-icon-anim-handler";
import { pokemonEvolutions } from "../data/pokemon-evolutions";
import { addWindow } from "./ui-theme";
import { SpeciesFormChangeItemTrigger} from "../data/pokemon-forms";
import {FormChangeItem} from "#enums/form-change-items";
import { getVariantTint } from "#app/data/variant";
import { Type } from "../data/type";
import {Button} from "#enums/buttons";
import { applyChallenges, ChallengeType } from "#app/data/challenge.js";
import MoveInfoOverlay from "./move-info-overlay";
import i18next from "i18next";
import BBCodeText from "phaser3-rex-plugins/plugins/bbcodetext";
import { Moves } from "#enums/moves";
import { Species } from "#enums/species";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { CommandPhase } from "#app/phases/command-phase.js";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase.js";
import { getSummonMissingPhase } from "#app/phases/encounter-phase-cache";
import { isPrimaryPointer } from "./pointer-utils";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import { DEBUG_YU_VISUAL_TUNING } from "#app/overrides";
import { TweakMetaMode, TWEAK_META_CYCLE, cycleMetaMode, formatMetaHud, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";

const defaultMessage = i18next.t("partyUiHandler:choosePokemon");
export enum PartyUiMode {

  SWITCH,

  FAINT_SWITCH,

  POST_BATTLE_SWITCH,

  REVIVAL_BLESSING,

  MODIFIER,

  MOVE_MODIFIER,

  TM_MODIFIER,

  REMEMBER_MOVE_MODIFIER,

  MODIFIER_TRANSFER,

  SPLICE,

  RELEASE,

  CHECK,
  SACRIFICE,
  ADDPOKEMON
}

export enum PartyOption {
  CANCEL = -1,
  SEND_OUT,
  PASS_BATON,
  REVIVE,
  APPLY,
  TEACH,
  TRANSFER,
  SUMMARY,
  UNPAUSE_EVOLUTION,
  PAUSE_EVOLUTION,
  SPLICE,
  UNSPLICE,
  RELEASE,
  RENAME,
  SCROLL_UP = 1000,
  SCROLL_DOWN = 1001,
  FORM_CHANGE_ITEM = 2000,
  MOVE_1 = 3000,
  MOVE_2,
  MOVE_3,
  MOVE_4,

  SACRIFICE,

  ADDPOKEMON,
  TRADE,
  ALL = 4000
}

export type PartySelectCallback = (cursor: integer, option: PartyOption) => void;
export type PartyModifierTransferSelectCallback = (fromCursor: integer, index: integer, itemQuantity?: integer, toCursor?: integer) => void;
export type PartyModifierSpliceSelectCallback = (fromCursor: integer, toCursor?: integer) => void;

export type PartyModifierSacrificeSelectCallback = (fromCursor: integer, toCursor?: integer) => void;
export type PokemonSelectFilter = (pokemon: PlayerPokemon) => string | null;
export type PokemonModifierTransferSelectFilter = (pokemon: PlayerPokemon, modifier: PokemonHeldItemModifier) => string | null;
export type PokemonMoveSelectFilter = (pokemonMove: PokemonMove) => string | null;

export default class PartyUiHandler extends MessageUiHandler {
  private partyUiMode: PartyUiMode;
  private fieldIndex: integer;

  private partyBg: Phaser.GameObjects.Image;
  private partyContainer: Phaser.GameObjects.Container;
  private partySlotsContainer: Phaser.GameObjects.Container;
  private partySlots: PartySlot[];
  private partyCancelButton: PartyCancelButton;
  private partyMessageBox: Phaser.GameObjects.NineSlice;
  private _partyMessagePattern: ModalBackgroundHandle | null = null;
  private _optionsBgPattern: ModalBackgroundHandle | null = null;
  private moveInfoOverlay: MoveInfoOverlay;

  private optionsMode: boolean;
  private optionsScroll: boolean;
  private optionsCursor: integer = 0;
  private optionsScrollCursor: integer = 0;
  private optionsScrollTotal: integer = 0;

  public optionsContainer: Phaser.GameObjects.Container;
  private optionsBg: Phaser.GameObjects.NineSlice;
  private optionsCursorObj: Phaser.GameObjects.Image | null;
  private options: integer[];

  private transferMode: boolean;
  private transferOptionCursor: integer;
  private transferCursor: integer;

  private transferQuantities: integer[];

  private transferQuantitiesMax: integer[];

  private transferAll: boolean;

  private lastCursor: integer = 0;
  private selectCallback: PartySelectCallback | PartyModifierTransferSelectCallback | null;
  private selectFilter: PokemonSelectFilter | PokemonModifierTransferSelectFilter;
  private moveSelectFilter: PokemonMoveSelectFilter;
  private tmMoveId: Moves;
  private showMovePp: boolean;

  private iconAnimHandler: PokemonIconAnimHandler;
  private _partyHitZones: Phaser.GameObjects.Zone[] = [];
  private _optionHitZones: Phaser.GameObjects.Zone[] = [];
  private blockInput: boolean = false;
  private _blockInputTimer: Phaser.Time.TimerEvent | null = null;

  private static readonly PARTY_TWEAK_ASSETS = [
    "SoulIcon", "SoulText", "SoulBoth",
  ] as const;

  private static readonly PARTY_TWEAK_MODES = [
    "scale", "position", "fontSize", "stroke",
  ] as const;

  private _partyMetaMode: TweakMetaMode = TweakMetaMode.NONE;
  private _partyTweakMode: number = 0;
  private _partyTweakAssetIndex: number = 0;
  private _partyTweakScope: "single" | "all" = "all";
  private _partyTweakBaselines: Map<string, { x: number; y: number; scaleX: number; scaleY: number; fontSize?: number; strokeThickness?: number }> = new Map();
  private _partyTweakDeltas: Map<string, { dx: number; dy: number; dScaleX: number; dScaleY: number; dFontSize?: number; dStrokeThickness?: number }> = new Map();
  private _partyDropdownPanel: TweakDropdownPanel | null = null;
  private _partyTweakHudText: Phaser.GameObjects.Text | null = null;
  private _partyKeyVHandler: ((e: KeyboardEvent) => void) | null = null;
  private _partyKeyFiveHandler: ((e: KeyboardEvent) => void) | null = null;

  get partyTweakActive(): boolean { return this._partyMetaMode !== TweakMetaMode.NONE; }

  private currentSacrifice: { pokemonId: number | null, hasEnough: boolean } = {
    pokemonId: null,
    hasEnough: false
  };

  private static FilterAll = (_pokemon: PlayerPokemon) => null;

  public static FilterNonFainted = (pokemon: PlayerPokemon) => {
    if (pokemon.isFainted()) {
      return i18next.t("partyUiHandler:noEnergy", { pokemonName: getPokemonNameWithAffix(pokemon) });
    }
    return null;
  };

  public static FilterFainted = (pokemon: PlayerPokemon) => {
    if (!pokemon.isFainted()) {
      return i18next.t("partyUiHandler:hasEnergy", { pokemonName: getPokemonNameWithAffix(pokemon) });
    }
    return null;
  };
  private FilterChallengeLegal = (pokemon: PlayerPokemon) => {
    const challengeAllowed = new Utils.BooleanHolder(true);
    applyChallenges(this.scene.gameMode, ChallengeType.POKEMON_IN_BATTLE, pokemon, challengeAllowed);
    if (!challengeAllowed.value) {
      return i18next.t("partyUiHandler:cantBeUsed", { pokemonName: getPokemonNameWithAffix(pokemon) });
    }
    return null;
  };

  private static FilterAllMoves = (_pokemonMove: PokemonMove) => null;

  public static FilterItemMaxStacks = (pokemon: PlayerPokemon, modifier: PokemonHeldItemModifier) => {
    const matchingModifier = pokemon.scene.findModifier(m => m instanceof PokemonHeldItemModifier && m.pokemonId === pokemon.id && m.matchType(modifier)) as PokemonHeldItemModifier;
    if (matchingModifier && matchingModifier.stackCount === matchingModifier.getMaxStackCount(pokemon.scene)) {
      return i18next.t("partyUiHandler:tooManyItems", { pokemonName: getPokemonNameWithAffix(pokemon) });
    }
    return null;
  };

  public static NoEffectMessage = i18next.t("partyUiHandler:anyEffect");

  private localizedOptions = [PartyOption.SEND_OUT, PartyOption.SUMMARY, PartyOption.CANCEL, PartyOption.APPLY, PartyOption.RELEASE, PartyOption.TEACH, PartyOption.SPLICE, PartyOption.UNSPLICE, PartyOption.REVIVE, PartyOption.TRANSFER, PartyOption.UNPAUSE_EVOLUTION, PartyOption.PAUSE_EVOLUTION, PartyOption.PASS_BATON, PartyOption.RENAME];

  constructor(scene: BattleScene) {
    super(scene, Mode.PARTY);
  }

  setup() {
    const ui = this.getUi();

    const partyContainer = this.scene.add.container(0, 0);
    partyContainer.setName("party");
    partyContainer.setVisible(false);
    ui.add(partyContainer);

    this.partyContainer = partyContainer;

    this.partyBg = this.scene.add.image(0, 0, "party_bg");
    this.partyBg.setName("img-party-bg");
    partyContainer.add(this.partyBg);

    this.partyBg.setOrigin(0, 1);

    const partySlotsContainer = this.scene.add.container(0, 0);
    partySlotsContainer.setName("party-slots");
    partyContainer.add(partySlotsContainer);

    this.partySlotsContainer = partySlotsContainer;

    const partyMessageBoxContainer = this.scene.add.container(0, -32);
    partyMessageBoxContainer.setName("party-msg-box");
    partyContainer.add(partyMessageBoxContainer);

    const partyMessageBox = addWindow(this.scene, 1, 31, 262, 30);
    partyMessageBox.setName("window-party-msg-box");
    partyMessageBox.setOrigin(0, 1);
    partyMessageBoxContainer.add(partyMessageBox);

    this.partyMessageBox = partyMessageBox;
    this._partyMessagePattern = attachModalBackground(
      this.scene as BattleScene,
      partyMessageBoxContainer,
      () => ({
        bgX: this.partyMessageBox.x,
        bgY: this.partyMessageBox.y - this.partyMessageBox.height,
        bgWidth: this.partyMessageBox.width,
        bgHeight: this.partyMessageBox.height,
      }),
      { mask: false, alphaMultiplier: 0.45, getTarget: () => this.partyMessageBox }
    );

    const partyMessageText = addTextObject(this.scene, 10, 8, defaultMessage, TextStyle.WINDOW, { maxLines: 2 });
    partyMessageText.setName("text-party-msg");

    partyMessageText.setOrigin(0, 0);
    partyMessageBoxContainer.add(partyMessageText);

    this.message = partyMessageText;

    const partyCancelButton = new PartyCancelButton(this.scene, 291, -16);
    partyContainer.add(partyCancelButton);

    this.partyCancelButton = partyCancelButton;

    const cancelHitZone = this.scene.add.zone(0, 0, 53, 22);
    cancelHitZone.setOrigin(0.5, 0.5);
    cancelHitZone.setInteractive({ useHandCursor: true });
    partyCancelButton.add(cancelHitZone);
    cancelHitZone.on("pointerover", () => {
      if (this.blockInput || this.optionsMode || this.pendingPrompt || this.awaitingActionInput) return;
      if (this.cursor !== 6) this.setCursor(6);
    });
    cancelHitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      if (this.blockInput || this.optionsMode || this.pendingPrompt || this.awaitingActionInput) return;
      if (this.cursor !== 6) {
        this.setCursor(6);
      } else {
        this.processInput(Button.CANCEL);
      }
    });

    this.optionsContainer = this.scene.add.container((this.scene.game.canvas.width / 6) - 1, -1);
    partyContainer.add(this.optionsContainer);

    this.iconAnimHandler = new PokemonIconAnimHandler();
    this.iconAnimHandler.setup(this.scene);
    const overlayScale = 1;
    this.moveInfoOverlay = new MoveInfoOverlay(this.scene, {
      scale: overlayScale,
      top: true,
      x: 1,
      y: -MoveInfoOverlay.getHeight(overlayScale) - 1,
      width: this.scene.game.canvas.width / 12 - 30,
    });
    ui.add(this.moveInfoOverlay);

    this.options = [];

    this.partySlots = [];
  }
  show(args: any[]): boolean {
    if (!args.length || this.active) {
      return false;
    }

    super.show(args);

    this.moveInfoOverlay.clear();

    this.partyUiMode = args[0] as PartyUiMode;

    switch(this.partyUiMode) {
      case PartyUiMode.SACRIFICE:
        if (!this.transferMode) {
          this.message.text = i18next.t("partyUiHandler:selectPokeToPowerUp");
        } else {
          this.message.text = i18next.t("partyUiHandler:selectPokeToRelease");
        }
        break;
      case PartyUiMode.RELEASE:
      case PartyUiMode.ADDPOKEMON:
        this.message.text = i18next.t("partyUiHandler:selectPokeToRelease");
        break;
    }

    this.fieldIndex = args.length > 1 ? args[1] as integer : -1;

    this.selectCallback = args.length > 2 && args[2] instanceof Function ? args[2] : undefined;
    this.selectFilter = args.length > 3 && args[3] instanceof Function
      ? args[3] as PokemonSelectFilter
      : PartyUiHandler.FilterAll;
    this.moveSelectFilter = args.length > 4 && args[4] instanceof Function
      ? args[4] as PokemonMoveSelectFilter
      : PartyUiHandler.FilterAllMoves;
    this.tmMoveId = args.length > 5 && args[5] ? args[5] : Moves.NONE;
    this.showMovePp = args.length > 6 && args[6];

    if (this._blockInputTimer) {
      this._blockInputTimer.remove(false);
    }
    this.blockInput = true;
    this._blockInputTimer = this.scene.time.delayedCall(Utils.fixedInt(300), () => {
      this.blockInput = false;
      this._blockInputTimer = null;
    });

    this.partyContainer.setVisible(true);
    this.partyBg.setTexture(`party_bg${this.scene.currentBattle.double ? "_double" : ""}`);
    this.populatePartySlots();
    this.setCursor(this.cursor < 6 ? this.cursor : 0);

    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    if (button === Button.CYCLE_GENDER && (this.scene as BattleScene).uiEditModeActive && DEBUG_YU_VISUAL_TUNING) {
      return this.onPartyTweakCycle();
    }
    if (this._partyMetaMode !== TweakMetaMode.NONE) {
      return this.processPartyTweakInput(button);
    }

    if (this.blockInput) {
      return false;
    }

    if (this.pendingPrompt) {
      return false;
    }

    if (this.awaitingActionInput) {
      if ((button === Button.ACTION || button === Button.CANCEL) && this.onActionInput) {
        ui.playSelect();
        const originalOnActionInput = this.onActionInput;
        this.onActionInput = null;
        originalOnActionInput();
        this.awaitingActionInput = false;
        return true;
      }
      return false;
    }

    let success = false;

    if (this.optionsMode) {
      const option = this.options[this.optionsCursor];
      if (button === Button.ACTION) {
        const pokemon = this.scene.getParty()[this.cursor];
        if (this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER && !this.transferMode && option !== PartyOption.CANCEL) {
          this.startTransfer();

          let ableToTransfer: string;
          for (let p = 0; p < this.scene.getParty().length; p++) {
            const newPokemon = this.scene.getParty()[p];

            const getTransferrableItemsFromPokemon = (newPokemon: PlayerPokemon) =>
              this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && (m as PokemonHeldItemModifier).isTransferrable && (m as PokemonHeldItemModifier).pokemonId === newPokemon.id) as PokemonHeldItemModifier[];

            const matchingModifier = newPokemon.scene.findModifier(m => m instanceof PokemonHeldItemModifier && m.pokemonId === newPokemon.id && m.matchType(getTransferrableItemsFromPokemon(pokemon)[this.transferOptionCursor])) as PokemonHeldItemModifier;
            const partySlot = this.partySlots.filter(m => m.getPokemon() === newPokemon)[0];
            if (p !== this.transferCursor) {
              if (matchingModifier) {
                if (matchingModifier.getMaxStackCount(this.scene) === matchingModifier.stackCount) {
                  ableToTransfer = "Not able";
                } else {
                  ableToTransfer = "Able";
                }
              } else {
                ableToTransfer = "Able";
              }
            } else {
              ableToTransfer = "";
            }
            partySlot.slotHpBar.setVisible(false);
            partySlot.slotHpOverlay.setVisible(false);
            partySlot.slotHpText.setVisible(false);
            partySlot._typeIcons?.forEach(ic => ic.setVisible(false));
            partySlot.slotDescriptionLabel.setText(ableToTransfer);
            partySlot.slotDescriptionLabel.setVisible(true);
          }

          this.clearOptions();
          ui.playSelect();
          return true;
        }
        else if (this.partyUiMode === PartyUiMode.REMEMBER_MOVE_MODIFIER && option !== PartyOption.CANCEL) {

          this.moveInfoOverlay.clear();
          const filterResult = (this.selectFilter as PokemonSelectFilter)(pokemon);
          if (filterResult === null) {
            this.selectCallback?.(this.cursor, option);
            this.clearOptions();
          } else {
            this.clearOptions();
            this.showText(filterResult as string, undefined, () => this.showText("", 0), undefined, true);
          }
          ui.playSelect();
          return true;

        }
          else if ((option !== PartyOption.SUMMARY && option !== PartyOption.UNPAUSE_EVOLUTION && option !== PartyOption.UNSPLICE && option !== PartyOption.RELEASE && option !== PartyOption.CANCEL && option !== PartyOption.RENAME && option !== PartyOption.PAUSE_EVOLUTION)
            || (option === PartyOption.RELEASE && this.partyUiMode === PartyUiMode.RELEASE || this.partyUiMode === PartyUiMode.ADDPOKEMON && option === PartyOption.ADDPOKEMON)) {
          let filterResult: string | null;
          const getTransferrableItemsFromPokemon = (pokemon: PlayerPokemon) =>
            this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier && m.isTransferrable && m.pokemonId === pokemon.id) as PokemonHeldItemModifier[];
          if (this.partyUiMode === PartyUiMode.SACRIFICE && this.transferMode && option === PartyOption.SACRIFICE) {
            const boostedPokemon = this.scene.getParty()[this.transferCursor] || pokemon;
            filterResult = (this.selectFilter as PokemonSelectFilter)(boostedPokemon);
          } else if (option !== PartyOption.TRANSFER && option !== PartyOption.SPLICE && option !== PartyOption.SACRIFICE) {
            filterResult = (this.selectFilter as PokemonSelectFilter)(pokemon);
            if (filterResult === null && (option === PartyOption.SEND_OUT || option === PartyOption.PASS_BATON)) {
              filterResult = this.FilterChallengeLegal(pokemon);
            }
            if (filterResult === null && this.partyUiMode === PartyUiMode.MOVE_MODIFIER) {
              filterResult = this.moveSelectFilter(pokemon.moveset[this.optionsCursor]!);
            }
          } else {
            filterResult = (this.selectFilter as PokemonModifierTransferSelectFilter)(pokemon, getTransferrableItemsFromPokemon(this.scene.getParty()[this.transferCursor])[this.transferOptionCursor]);
          }
          if (filterResult === null) {
            if (this.partyUiMode !== PartyUiMode.SPLICE && this.partyUiMode !== PartyUiMode.SACRIFICE) {
              this.clearOptions();
            }
            if (this.selectCallback && this.partyUiMode !== PartyUiMode.CHECK) {
              if (option === PartyOption.TRANSFER) {
                if (this.transferCursor !== this.cursor) {
                  if (this.transferAll) {
                    getTransferrableItemsFromPokemon(this.scene.getParty()[this.transferCursor]).forEach((_, i) => (this.selectCallback as PartyModifierTransferSelectCallback)(this.transferCursor, i, this.transferQuantitiesMax[i], this.cursor));
                  } else {
                    (this.selectCallback as PartyModifierTransferSelectCallback)(this.transferCursor, this.transferOptionCursor, this.transferQuantities[this.transferOptionCursor], this.cursor);
                  }
                }
                this.clearTransfer();
              } else if (this.partyUiMode === PartyUiMode.SPLICE) {
                if (option === PartyOption.SPLICE) {
                  (this.selectCallback as PartyModifierSpliceSelectCallback)(this.transferCursor, this.cursor);
                  this.clearTransfer();
                } else {
                  this.startTransfer();
                }
                this.clearOptions();
              } else if (this.partyUiMode === PartyUiMode.SACRIFICE) {
                if (option === PartyOption.SACRIFICE) {
                  (this.selectCallback as PartyModifierSacrificeSelectCallback)(this.transferCursor, this.cursor);
                  this.clearTransfer();
                } else {
                  this.startTransfer();
                }
                this.clearOptions();
              } else if (option === PartyOption.RELEASE) {
                this.doRelease(this.cursor);
              } else {
                const selectCallback = this.selectCallback;
                this.selectCallback = null;
                selectCallback(this.cursor, option);
                if (this.active && (this.partyUiMode === PartyUiMode.MODIFIER || this.partyUiMode === PartyUiMode.REVIVAL_BLESSING)) {
                  this.clearPartySlots();
                  this.populatePartySlots();
                }
              }
            } else {
              if (this.partyUiMode === PartyUiMode.CHECK) {
                if (option === PartyOption.TRADE) {
                   this.doRelease(this.cursor, true);
                }
              if (option >= PartyOption.FORM_CHANGE_ITEM && this.scene.getCurrentPhase() instanceof SelectModifierPhase) {
                  const formChangeItemModifiers = this.getFormChangeItemsModifiers(pokemon);
                  if (formChangeItemModifiers.length > 0) {
                    const modifier = formChangeItemModifiers[option - PartyOption.FORM_CHANGE_ITEM];
                    modifier.active = !modifier.active;
                    this.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeItemTrigger, false, true);
                  }
                }
              } else if (this.cursor) {
                (this.scene.getCurrentPhase() as CommandPhase).handleCommand(Command.POKEMON, this.cursor, option === PartyOption.PASS_BATON);
              }
            }
            if (this.partyUiMode !== PartyUiMode.MODIFIER && this.partyUiMode !== PartyUiMode.TM_MODIFIER && this.partyUiMode !== PartyUiMode.MOVE_MODIFIER) {
              ui.playSelect();
            }
            return true;
          } else {
            this.clearOptions();
            this.showText(filterResult as string, undefined, () => this.showText("", 0), undefined, true);
          }
        }
          else if (option === PartyOption.SUMMARY) {
          ui.playSelect();
          ui.setModeWithoutClear(Mode.SUMMARY, pokemon).then(() =>  this.clearOptions());
          return true;
        }
          else if (option === PartyOption.UNPAUSE_EVOLUTION) {
          this.clearOptions();
          ui.playSelect();
          pokemon.pauseEvolutions = false;
          this.showText(i18next.t("partyUiHandler:unpausedEvolutions", { pokemonName: getPokemonNameWithAffix(pokemon) }), undefined, () => {
            this.showText("", 0);
            this.updateOptions();
          }, null, true);
        }
          else if (option === PartyOption.PAUSE_EVOLUTION) {
          this.clearOptions();
          ui.playSelect();
          pokemon.pauseEvolutions = true;
          this.showText(i18next.t("partyUiHandler:pausedEvolutions", { pokemonName: getPokemonNameWithAffix(pokemon) }), undefined, () => {
            this.showText("", 0);
            this.updateOptions();
          }, null, true);
        }
          else if (option === PartyOption.UNSPLICE) {
          this.clearOptions();
          ui.playSelect();
          this.showText(i18next.t("partyUiHandler:unspliceConfirmation", { fusionName: pokemon.fusionSpecies?.name, pokemonName: pokemon.name }), null, () => {
            ui.setModeWithoutClear(Mode.CONFIRM, () => {
              const fusionName = pokemon.name;
              pokemon.unfuse().then(() => {
                this.clearPartySlots();
                this.populatePartySlots();
                ui.setMode(Mode.PARTY);
                this.showText(i18next.t("partyUiHandler:wasReverted", { fusionName: fusionName, pokemonName: pokemon.name }), undefined, () => {
                  ui.setMode(Mode.PARTY);
                  this.showText("", 0);
                }, null, true);
              });
            }, () => {
              ui.setMode(Mode.PARTY);
              this.showText("", 0);
            });
          });
        }
          else if (option === PartyOption.RELEASE) {
          this.clearOptions();
          ui.playSelect();
          const battlerCount = this.scene.currentBattle.getBattlerCount();
          if (this.cursor < battlerCount && pokemon.isAllowedInBattle()) {
            const party = this.scene.getParty();
            const hasReplacement = party.some((p, i) => i >= battlerCount && p.isAllowedInBattle());
            if (!hasReplacement) {
              this.showText(i18next.t("partyUiHandler:releaseLastPokemon"), null, () => this.showText("", 0), null, true);
              return true;
            }
          }
          this.showText(i18next.t("partyUiHandler:releaseConfirmation", { pokemonName: getPokemonNameWithAffix(pokemon) }), null, () => {
            ui.setModeWithoutClear(Mode.CONFIRM, () => {
              ui.setMode(Mode.PARTY);
              this.doRelease(this.cursor);
            }, () => {
              ui.setMode(Mode.PARTY);
              this.showText("", 0);
            });
          });
          return true;
        }
          else if (option === PartyOption.RENAME) {
          this.clearOptions();
          ui.playSelect();
          ui.setModeWithoutClear(Mode.RENAME_POKEMON, {
            buttonActions: [
              (nickname: string) => {
                ui.playSelect();
                pokemon.nickname = nickname;
                pokemon.updateInfo();
                this.clearPartySlots();
                this.populatePartySlots();
                ui.setMode(Mode.PARTY);
              },
              () => {
                ui.setMode(Mode.PARTY);
              }
            ]
          }, pokemon);
          return true;
        }
          else if (option === PartyOption.CANCEL) {
          return this.processInput(Button.CANCEL);
        }
      } else if (button === Button.CANCEL) {
        this.clearOptions();
        ui.playSelect();
        return true;
      } else {
        switch (button) {
        case Button.LEFT:

          if (this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER) {
            this.transferQuantities[option] = this.transferQuantities[option] === 1 ? this.transferQuantitiesMax[option] : this.transferQuantities[option] - 1;
            this.updateOptions();
            success = this.setCursor(this.optionsCursor);
          }
          break;
        case Button.RIGHT:

          if (this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER) {
            this.transferQuantities[option] = this.transferQuantities[option] === this.transferQuantitiesMax[option] ? 1 : this.transferQuantities[option] + 1;
            this.updateOptions();
            success = this.setCursor(this.optionsCursor);
          }
          break;
        case Button.UP:

          if (this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER) {
            if (option !== PartyOption.ALL) {
            this.transferQuantities[option] = this.transferQuantitiesMax[option];
            }
            this.updateOptions();
          }
          success = this.setCursor(this.optionsCursor ? this.optionsCursor - 1 : this.options.length - 1);
          break;
        case Button.DOWN:

          if (this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER) {
            if (option !== PartyOption.ALL) {
            this.transferQuantities[option] = this.transferQuantitiesMax[option];
            }
            this.updateOptions();
          }
          success = this.setCursor(this.optionsCursor < this.options.length - 1 ? this.optionsCursor + 1 : 0);
          break;
        }
        if (this.partyUiMode === PartyUiMode.REMEMBER_MOVE_MODIFIER) {
          const option = this.options[this.optionsCursor];
          const pokemon = this.scene.getParty()[this.cursor];
          const move = allMoves[pokemon.getLearnableLevelMoves()[option]];
          if (move) {
            this.moveInfoOverlay.show(move);
          } else {

            this.moveInfoOverlay.clear();
          }
        }
      }
    } else {
      if (button === Button.ACTION) {
        if (this.cursor < 6) {
          if (this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER && !this.transferMode) {

            const itemModifiers = this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
              && m.isTransferrable && m.pokemonId === this.scene.getParty()[this.cursor].id) as PokemonHeldItemModifier[];
            this.transferQuantities = itemModifiers.map(item => item.getStackCount());
            this.transferQuantitiesMax = itemModifiers.map(item => item.getStackCount());
          }
          this.showOptions();
          ui.playSelect();
        } else if (this.partyUiMode === PartyUiMode.FAINT_SWITCH || this.partyUiMode === PartyUiMode.REVIVAL_BLESSING) {
          ui.playError();
        } else {
          return this.processInput(Button.CANCEL);
        }
        return true;
      } else if (button === Button.CANCEL) {

        if ((this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER || this.partyUiMode === PartyUiMode.SPLICE || this.partyUiMode === PartyUiMode.SACRIFICE) && this.transferMode) {
          this.clearTransfer();
          ui.playSelect();
        } else if (this.partyUiMode !== PartyUiMode.FAINT_SWITCH && this.partyUiMode !== PartyUiMode.REVIVAL_BLESSING) {
          if (this.selectCallback) {
            const selectCallback = this.selectCallback;
            this.selectCallback = null;
            selectCallback(6, PartyOption.CANCEL);
            ui.playSelect();
          } else {
            ui.setMode(Mode.COMMAND, this.fieldIndex);
            ui.playSelect();
          }
        }

        return true;
      } else if (button === Button.TOGGLE_FOE_BAR) {
        if (this.cursor < 6) {
          const pokemon = this.scene.getParty()[this.cursor];
          if (pokemon) {
            const posX = this.cursor === 0 ? 186 : 4;
            ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, pokemon, 0, false, { x: posX });
            success = true;
          }
        }
        return true;
      }

      const slotCount = this.partySlots.length;
      const battlerCount = this.scene.currentBattle.getBattlerCount();

      switch (button) {
      case Button.UP:
        success = this.setCursor(this.cursor ? this.cursor < 6 ? this.cursor - 1 : slotCount - 1 : 6);
        break;
      case Button.DOWN:
        success = this.setCursor(this.cursor < 6 ? this.cursor < slotCount - 1 ? this.cursor + 1 : 6 : 0);
        break;
      case Button.LEFT:
        if (this.cursor >= battlerCount && this.cursor <= 6) {
          success = this.setCursor(0);
        }
        break;
      case Button.RIGHT:
        if (slotCount === battlerCount) {
          success = this.setCursor(6);
          break;
        } else if (battlerCount >= 2 && slotCount > battlerCount && this.getCursor() === 0 && this.lastCursor === 1) {
          success = this.setCursor(2);
          break;
        } else if (slotCount > battlerCount && this.cursor < battlerCount) {
          success = this.setCursor(this.lastCursor < 6 ? this.lastCursor ||  battlerCount : battlerCount);
          break;
        }
      }
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  populatePartySlots() {
    const party = this.scene.getParty();

    this._partyHitZones.forEach(z => z.destroy());
    this._partyHitZones = [];

    if (this.cursor < 6 && this.cursor >= party.length) {
      this.cursor = party.length - 1;
    } else if (this.cursor === 6) {
      this.partyCancelButton.select();
    }

    const battlerCount = this.scene.currentBattle.getBattlerCount();

    for (const p in party) {
      const slotIndex = parseInt(p);
      const partySlot = new PartySlot(this.scene, slotIndex, party[p], this.iconAnimHandler, this.partyUiMode, this.tmMoveId, this.selectFilter as PokemonSelectFilter);
      this.scene.add.existing(partySlot);
      this.partySlotsContainer.add(partySlot);
      this.partySlots.push(partySlot);
      if (this.cursor === slotIndex) {
        partySlot.select();
      }

      const isMain = slotIndex < battlerCount;
      const zoneW = isMain ? 110 : 175;
      const zoneH = isMain ? 64 : 28;
      const hitZone = this.scene.add.zone(0, 0, zoneW, zoneH);
      hitZone.setOrigin(0.5, 0.5);
      hitZone.setInteractive({ useHandCursor: true });
      hitZone.on("pointerover", () => {
        if (this.blockInput || this.optionsMode || this.pendingPrompt || this.awaitingActionInput) return;
        if (this.cursor !== slotIndex) this.setCursor(slotIndex);
      });
      hitZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!isPrimaryPointer(pointer)) return;
        if (this.blockInput || this.optionsMode || this.pendingPrompt || this.awaitingActionInput) return;
        if (this.cursor !== slotIndex) {
          this.setCursor(slotIndex);
        } else {
          const hint = partySlot._quickInfoHint;
          if (hint && hint.visible) {
            const hintBounds = hint.getBounds();
            if (hintBounds.contains(pointer.worldX, pointer.worldY)) {
              const pokemon = this.scene.getParty()[slotIndex];
              if (pokemon) {
                const posX = slotIndex === 0 ? 186 : 4;
                this.getUi().setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, pokemon, 0, false, { x: posX });
              }
              return;
            }
          }
          this.processInput(Button.ACTION);
        }
      });
      partySlot.add(hitZone);
      this._partyHitZones.push(hitZone);
    }
  }

  setCursor(cursor: integer): boolean {
    let changed: boolean;

    if (this.optionsMode) {
      changed = this.optionsCursor !== cursor;
      let isScroll = false;
      if (changed && this.optionsScroll) {
        if (Math.abs(cursor - this.optionsCursor) === this.options.length - 1) {
          this.optionsScrollCursor = cursor ? this.optionsScrollTotal - 8 : 0;
          this.updateOptions();
        } else {
          const isDown = cursor &&  cursor > this.optionsCursor;
          if (isDown) {
            if (this.options[cursor] === PartyOption.SCROLL_DOWN) {
              isScroll = true;
              this.optionsScrollCursor++;
            }
          } else {
            if (!cursor && this.optionsScrollCursor) {
              isScroll = true;
              this.optionsScrollCursor--;
            }
          }
          if (isScroll && this.optionsScrollCursor === 1) {
            this.optionsScrollCursor += isDown ? 1 : -1;
          }
        }
      }
      if (isScroll) {
        this.updateOptions();
      } else {
        this.optionsCursor = cursor;
      }
      if (!this.optionsCursorObj) {
        this.optionsCursorObj = this.scene.add.image(0, 0, "cursor");
        this.optionsCursorObj.setOrigin(0, 0);
        this.optionsContainer.add(this.optionsCursorObj);
      }
      this.optionsCursorObj.setPosition(8 - this.optionsBg.displayWidth, -19 - (16 * ((this.options.length - 1) - this.optionsCursor)));
    } else {
      changed = this.cursor !== cursor;
      if (changed) {
        this.lastCursor = this.cursor;
        this.cursor = cursor;
        if (this.lastCursor < 6) {
          this.partySlots[this.lastCursor].deselect();
        } else if (this.lastCursor === 6) {
          this.partyCancelButton.deselect();
        }
        if (cursor < 6) {
          this.partySlots[cursor].select();
        } else if (cursor === 6) {
          this.partyCancelButton.select();
        }
      }
    }

    return changed;
  }

  showText(text: string, delay?: integer | null, callback?: Function | null, callbackDelay?: integer | null, prompt?: boolean | null, promptDelay?: integer | null) {
    if (text.length === 0) {
      text = defaultMessage;
    }

    if (text?.indexOf("\n") === -1) {
      this.partyMessageBox.setSize(262, 30);
      this.message.setY(10);
    } else {
      this.partyMessageBox.setSize(262, 42);
      this.message.setY(-5);
    }
    this._partyMessagePattern?.redraw();

    super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);
  }

  showOptions() {
    if (this.cursor === 6) {
      return;
    }

    this.optionsMode = true;

    let optionsMessage = i18next.t("partyUiHandler:doWhatWithThisPokemon");

    switch (this.partyUiMode) {
    case PartyUiMode.MOVE_MODIFIER:
      optionsMessage = i18next.t("partyUiHandler:selectAMove");
      break;
    case PartyUiMode.MODIFIER_TRANSFER:
      if (!this.transferMode) {
        optionsMessage = i18next.t("partyUiHandler:changeQuantity");
      }
      break;
    case PartyUiMode.SPLICE:
      if (!this.transferMode) {
        optionsMessage = i18next.t("partyUiHandler:selectAnotherPokemonToSplice");
      }

    case PartyUiMode.SACRIFICE:
      if (!this.transferMode) {
        optionsMessage = i18next.t("partyUiHandler:selectPokeToPowerUp");
      } else {
        optionsMessage = i18next.t("partyUiHandler:selectPokeToRelease");
      }
      break;
  case PartyUiMode.RELEASE:
  case PartyUiMode.ADDPOKEMON:
      optionsMessage = i18next.t("partyUiHandler:selectPokeToRelease");
    break;
  }

    this.showText(optionsMessage, 0);

    this.updateOptions();
    if (this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER) {
      this.partyMessageBox.setSize(262 - Math.max(this.optionsBg.displayWidth - 56, 0), 42);
    } else {
      this.partyMessageBox.setSize(262 - Math.max(this.optionsBg.displayWidth - 56, 0), 30);
    }
    this._partyMessagePattern?.redraw();

    this.setCursor(0);
  }

  showReleaseOption(): void {
    if (this.scene.gameData?.tutorialOnboardActive) {
      return;
    }
    if (this.scene.getParty().length <= 1) {
      return;
    }
    this.options.push(PartyOption.RELEASE);
  }

  updateOptions(): void {
    const pokemon = this.scene.getParty()[this.cursor];

    const learnableLevelMoves = this.partyUiMode === PartyUiMode.REMEMBER_MOVE_MODIFIER
      ? pokemon.getLearnableLevelMoves()
      : [];

    if (this.partyUiMode === PartyUiMode.REMEMBER_MOVE_MODIFIER && learnableLevelMoves?.length) {

      this.moveInfoOverlay.show(allMoves[learnableLevelMoves[0]]);
    }

    const itemModifiers = this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER
      ? this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
        && m.isTransferrable && m.pokemonId === pokemon.id) as PokemonHeldItemModifier[]
      : [];

    if (this.options.length) {
      this._optionsBgPattern?.clear();
      this._optionsBgPattern = null;
      this.options.splice(0, this.options.length);
      this.optionsContainer.removeAll(true);
      this.eraseOptionsCursor();
    }

    let formChangeItemModifiers: PokemonFormChangeItemModifier[] | undefined;

    if (this.partyUiMode !== PartyUiMode.MOVE_MODIFIER && this.partyUiMode !== PartyUiMode.REMEMBER_MOVE_MODIFIER && (this.transferMode || this.partyUiMode !== PartyUiMode.MODIFIER_TRANSFER)) {
      let addTradeOptionFunction = () => {};
      let addReleaseOptionFunction = () => {};
      switch (this.partyUiMode) {
      case PartyUiMode.SWITCH:
      case PartyUiMode.FAINT_SWITCH:
      case PartyUiMode.POST_BATTLE_SWITCH:
        if (this.cursor >= this.scene.currentBattle.getBattlerCount()) {
          const allowBatonModifierSwitch =
            this.partyUiMode !== PartyUiMode.FAINT_SWITCH
                && this.scene.findModifier(m => m instanceof SwitchEffectTransferModifier
              && (m as SwitchEffectTransferModifier).pokemonId === this.scene.getPlayerField()[this.fieldIndex].id);

          const moveHistory = this.scene.getPlayerField()[this.fieldIndex].getMoveHistory();
          const isBatonPassMove = this.partyUiMode === PartyUiMode.FAINT_SWITCH && moveHistory.length && allMoves[moveHistory[moveHistory.length - 1].move].getAttrs(ForceSwitchOutAttr)[0]?.isBatonPass() && moveHistory[moveHistory.length - 1].result === MoveResult.SUCCESS;
          this.options.push(isBatonPassMove && !allowBatonModifierSwitch ? PartyOption.PASS_BATON : PartyOption.SEND_OUT);
          if (allowBatonModifierSwitch && !isBatonPassMove) {
            this.options.push(PartyOption.PASS_BATON);
          }
        }
        break;
      case PartyUiMode.REVIVAL_BLESSING:
        this.options.push(PartyOption.REVIVE);
        break;
      case PartyUiMode.MODIFIER:
        this.options.push(PartyOption.APPLY);
        break;
      case PartyUiMode.TM_MODIFIER:
        this.options.push(PartyOption.TEACH);
        break;
      case PartyUiMode.MODIFIER_TRANSFER:
        if (!this.scene.gameData?.tutorialOnboardActive) {
          this.options.push(PartyOption.TRANSFER);
        }
        break;
      case PartyUiMode.SPLICE:
        if (this.transferMode) {
          if (this.cursor !== this.transferCursor) {
            this.options.push(PartyOption.SPLICE);
          }
        } else {
          this.options.push(PartyOption.APPLY);
        }
        break;
      case PartyUiMode.RELEASE:
           this.showReleaseOption();
        break;
      case PartyUiMode.SACRIFICE:
        if (this.transferMode) {

          if (this.cursor !== this.transferCursor) {
            const battlerCount = this.scene.currentBattle.getBattlerCount();
            if (this.cursor < battlerCount && pokemon.isAllowedInBattle()) {
              const hasReplacement = this.scene.getParty().some((p, i) => i >= battlerCount && p.isAllowedInBattle());
              if (!hasReplacement && !this.hasEnoughCollectedTypeModifiers(pokemon)) {
                break;
              }
            }
            this.options.push(PartyOption.SACRIFICE);
          }
        } else {
          this.options.push(PartyOption.APPLY);
        }
        break;
      case PartyUiMode.ADDPOKEMON:
        this.showReleaseOption();
        break;
      case PartyUiMode.CHECK:
        if (this.scene.getCurrentPhase() instanceof SelectModifierPhase) {
          formChangeItemModifiers = this.getFormChangeItemsModifiers(pokemon);
          for (let i = 0; i < formChangeItemModifiers.length; i++) {
            this.options.push(PartyOption.FORM_CHANGE_ITEM + i);
          }
          addTradeOptionFunction = () => {
            this.options.push(PartyOption.TRADE);
          }
          addReleaseOptionFunction = () => {
            this.showReleaseOption();
          }
        }
        break;
      }

      this.options.push(PartyOption.SUMMARY);
      addTradeOptionFunction();
      addReleaseOptionFunction();
      this.options.push(PartyOption.RENAME);

      if (!pokemon.isEvolutionLocked() && pokemon.pauseEvolutions && pokemonEvolutions.hasOwnProperty(pokemon.species.speciesId)) {
        this.options.push(PartyOption.UNPAUSE_EVOLUTION);
      } else if (!pokemon.isEvolutionLocked() && !pokemon.pauseEvolutions && pokemonEvolutions.hasOwnProperty(pokemon.species.speciesId)) {
        this.options.push(PartyOption.PAUSE_EVOLUTION);
      }

      if (this.partyUiMode === PartyUiMode.SWITCH) {
        if (pokemon.isFusion()) {
          this.options.push(PartyOption.UNSPLICE);
        }
        this.showReleaseOption();
      } else if (this.partyUiMode === PartyUiMode.SPLICE && pokemon.isFusion()) {
        this.options.push(PartyOption.UNSPLICE);
      }
    } else if (this.partyUiMode === PartyUiMode.MOVE_MODIFIER) {
      for (let m = 0; m < pokemon.moveset.length; m++) {
        this.options.push(PartyOption.MOVE_1 + m);
      }
    } else if (this.partyUiMode === PartyUiMode.REMEMBER_MOVE_MODIFIER) {
      const learnableMoves = pokemon.getLearnableLevelMoves();
      for (let m = 0; m < learnableMoves.length; m++) {
        this.options.push(m);
      }
    } else {
      for (let im = 0; im < itemModifiers.length; im++) {
        this.options.push(im);
      }
      if (itemModifiers.length > 1) {
        this.options.push(PartyOption.ALL);
      }
    }

    this.optionsScrollTotal = this.options.length;
    let optionStartIndex = this.optionsScrollCursor;
    let optionEndIndex = Math.min(this.optionsScrollTotal, optionStartIndex + (!optionStartIndex || this.optionsScrollCursor + 8 >= this.optionsScrollTotal ? 8 : 7));

    this.optionsScroll = this.optionsScrollTotal > 9;

    if (this.optionsScroll) {
      this.options.splice(optionEndIndex, this.optionsScrollTotal);
      this.options.splice(0, optionStartIndex);
      if (optionStartIndex) {
        this.options.unshift(PartyOption.SCROLL_UP);
      }
      if (optionEndIndex < this.optionsScrollTotal) {
        this.options.push(PartyOption.SCROLL_DOWN);
      }
    }

    this.options.push(PartyOption.CANCEL);

    this.optionsBg = addWindow(this.scene, 0, 0, 0, 16 * this.options.length + 13);
    this.optionsBg.setOrigin(1, 1);

    this.optionsContainer.add(this.optionsBg);

    optionStartIndex = 0;
    optionEndIndex = this.options.length;

    let widestOptionWidth = 0;
    const optionTexts: BBCodeText[] = [];

    for (let o = optionStartIndex; o < optionEndIndex; o++) {
      const option = this.options[this.options.length - (o + 1)];
      let altText = false;
      let optionName: string;
      if (option === PartyOption.SCROLL_UP) {
        optionName = "↑";
      } else if (option === PartyOption.SCROLL_DOWN) {
        optionName = "↓";
      } else if ((this.partyUiMode !== PartyUiMode.REMEMBER_MOVE_MODIFIER && (this.partyUiMode !== PartyUiMode.MODIFIER_TRANSFER || this.transferMode)) || option === PartyOption.CANCEL) {
        switch (option) {
        case PartyOption.MOVE_1:
        case PartyOption.MOVE_2:
        case PartyOption.MOVE_3:
        case PartyOption.MOVE_4:
          const move = pokemon.moveset[option - PartyOption.MOVE_1]!;
          if (this.showMovePp) {
            const maxPP = move.getMovePp();
            const currPP = maxPP - move.ppUsed;
            optionName = `${move.getName()} ${currPP}/${maxPP}`;
          } else {
            optionName = move.getName();
          }
          break;
        default:
          if (formChangeItemModifiers &&formChangeItemModifiers.length > 0 && option >= PartyOption.FORM_CHANGE_ITEM && option < PartyOption.MOVE_1) {
            const modifier = formChangeItemModifiers[option - PartyOption.FORM_CHANGE_ITEM];
            optionName = `${modifier.active ? i18next.t("partyUiHandler:DEACTIVATE") : i18next.t("partyUiHandler:ACTIVATE")} ${modifier.type.name}`;
          } else {
            const sacrificeOption = option === PartyOption.SACRIFICE ? PartyOption.RELEASE : null;
            if(sacrificeOption && this.hasEnoughCollectedTypeModifiers(pokemon)) {
              optionName = i18next.t(`partyUiHandler:${PartyOption[sacrificeOption]}`) + " 4 " + i18next.t("modifierType:ModifierType.CollectedTypeModifierType.name", { type: "" }).replace(": ", "");
            }
            else if (option === PartyOption.TRADE) {
              optionName = i18next.t(`partyUiHandler:${PartyOption[option]}`, { value: this.getPokemonTradeValue(pokemon) });
            }
            else {
              optionName = i18next.t(`partyUiHandler:${PartyOption[sacrificeOption ? sacrificeOption : option]}`);
            }

          }
          break;
        }
      } else if (this.partyUiMode === PartyUiMode.REMEMBER_MOVE_MODIFIER) {
        const move = learnableLevelMoves[option];
        optionName = allMoves[move].name;
        altText = !pokemon.getSpeciesForm().getLevelMoves().find(plm => plm[1] === move);
      } else if (option === PartyOption.ALL) {
          optionName = i18next.t("partyUiHandler:ALL");
        } else {
        const itemModifier = itemModifiers[option];
        optionName = itemModifier.type.name;
      }

      const yCoord = -6 - 16 * o;
      const optionText = addBBCodeTextObject(this.scene, 0, yCoord - 16, optionName, TextStyle.WINDOW, { maxLines: 1 });
      if (altText) {
        optionText.setColor("#40c8f8");
        optionText.setShadowColor("#006090");
      }
      optionText.setOrigin(0, 0);
      const itemModifier = itemModifiers[option];
      if (this.partyUiMode === PartyUiMode.MODIFIER_TRANSFER && this.transferQuantitiesMax[option] > 1 && !this.transferMode && itemModifier !== undefined && itemModifier.type.name === optionName) {
        let amountText = ` (${this.transferQuantities[option]})`;
        if (this.transferQuantitiesMax[option] === itemModifier.getMaxHeldItemCount(undefined)) {
          amountText = `[color=${getTextColor(TextStyle.SUMMARY_RED)}]${amountText}[/color]`;
        }

        optionText.setText(optionName + amountText);
      }

      optionText.setText(`[shadow]${optionText.text}[/shadow]`);

      optionTexts.push(optionText);

      widestOptionWidth = Math.max(optionText.displayWidth, widestOptionWidth);

      this.optionsContainer.add(optionText);
    }

    this.optionsBg.width = Math.max(widestOptionWidth + 24, 94);
    for (const optionText of optionTexts) {
      optionText.x = 15 - this.optionsBg.width;
    }

    this._optionHitZones.forEach(z => z.destroy());
    this._optionHitZones = [];
    for (let o = 0; o < this.options.length; o++) {
      const yPos = -6 - 16 * ((this.options.length - 1) - o) - 16;
      const zone = this.scene.add.zone(
        15 - this.optionsBg.width + (this.optionsBg.width - 16) / 2,
        yPos + 8,
        this.optionsBg.width - 16,
        16
      );
      zone.setOrigin(0.5, 0.5);
      zone.setInteractive({ useHandCursor: true });
      const idx = o;
      zone.on("pointerover", () => {
        if (this.blockInput) return;
        if (this.optionsCursor !== idx) this.setCursor(idx);
      });
      zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
        if (!isPrimaryPointer(pointer)) return;
        if (this.blockInput) return;
        if (this.optionsCursor !== idx) {
          this.setCursor(idx);
        } else {
          this.processInput(Button.ACTION);
        }
      });
      this.optionsContainer.add(zone);
      this._optionHitZones.push(zone);
    }

    this._optionsBgPattern = attachModalBackground(
      this.scene as BattleScene,
      this.optionsContainer,
      () => ({
        bgX: this.optionsBg.x - this.optionsBg.width,
        bgY: this.optionsBg.y - this.optionsBg.height,
        bgWidth: this.optionsBg.width,
        bgHeight: this.optionsBg.height,
      }),
      { mask: false, alphaMultiplier: 0.45, gridInc: -2, getTarget: () => this.optionsBg }
    );
    this._optionsBgPattern.redraw();
  }

  private hasEnoughCollectedTypeModifiers(pokemon: PlayerPokemon): boolean {
    if (this.currentSacrifice.pokemonId === pokemon.id) {
      return this.currentSacrifice.hasEnough;
    }

    const collectedTypeModifiers = this.scene.findModifiers(m =>
      m instanceof CollectedTypeModifier &&
      m.pokemonId === pokemon.id
    ) as CollectedTypeModifier[];

    const hasEnough = collectedTypeModifiers.some(modifier => modifier.hasEnoughCollected(4));

    this.currentSacrifice.pokemonId = pokemon.id;
    this.currentSacrifice.hasEnough = hasEnough;

    return this.currentSacrifice.hasEnough;
  }
  startTransfer(): void {
    this.transferMode = true;
    this.transferCursor = this.cursor;
    this.transferOptionCursor = this.getOptionsCursorWithScroll();
    this.transferAll = this.options[this.optionsCursor] === PartyOption.ALL;

    this.partySlots[this.transferCursor].setTransfer(true);
  }

  clearTransfer(): void {
    this.transferMode = false;
    this.transferAll = false;
    this.partySlots[this.transferCursor].setTransfer(false);
    for (let i = 0; i < this.partySlots.length; i++) {
      this.partySlots[i].slotDescriptionLabel.setVisible(false);
      this.partySlots[i].slotHpBar.setVisible(true);
      this.partySlots[i].slotHpOverlay.setVisible(true);
      this.partySlots[i].slotHpText.setVisible(true);
      this.partySlots[i]._typeIcons?.forEach(ic => ic.setVisible(true));
    }
  }

  getPokemonTradeValue(pokemon: PlayerPokemon): integer {
    const baseTotal = pokemon.getSpeciesForm().baseTotal;

    const collectedTypeModifiers = this.scene.findModifiers(m =>
      m instanceof CollectedTypeModifier &&
      m.pokemonId === pokemon.id
    ) as CollectedTypeModifier[];

    const totalCollectedModifiers = collectedTypeModifiers.reduce((sum, modifier) => {
      const modifierTotal = Object.values(modifier.collectedTypes).reduce((subSum, count) => subSum + count, 0);
      return sum + modifierTotal;
    }, 0);

    const nuggetValue = this.scene.getWaveMoneyAmount(1);
    const bigNuggetValue = this.scene.getWaveMoneyAmount(2.5);
    const coinRelicValue = this.scene.getWaveMoneyAmount(10);

    if (pokemon.friendship >= 150 || totalCollectedModifiers >= 8) {
      return coinRelicValue;
    } else if (pokemon.friendship >= 120 || baseTotal > 500 || totalCollectedModifiers >= 5) {
      return bigNuggetValue;
    } else {
      return nuggetValue;
    }
  }
  doRelease(slotIndex: integer, trade: boolean = false): void {
    const party = this.scene.getParty();
    const pokemon = party[slotIndex];
    if (!pokemon) {
      return;
    }
    const battlerCount = this.scene.currentBattle.getBattlerCount();
    if (slotIndex < battlerCount && pokemon.isAllowedInBattle()) {
      const replacementIndex = party.findIndex((p, i) => i >= battlerCount && p.isAllowedInBattle());
      if (replacementIndex === -1) {
        this.showText(i18next.t("partyUiHandler:releaseLastPokemon"), null, () => this.showText("", 0), null, true);
        return;
      }
      const selectCallback = this.selectCallback;
      this.selectCallback = null;
      this.showText(this.getReleaseMessage(getPokemonNameWithAffix(pokemon)), null, () => {
        const currentPhase = this.scene.getCurrentPhase();
        if (currentPhase instanceof CommandPhase) {
          this.getUi().setMode(Mode.MESSAGE);
          this.scene.currentBattle.turnCommands[this.fieldIndex] = { command: Command.POKEMON, cursor: replacementIndex, args: [ false, true ] };
          currentPhase.end();
          this.showText("", 0);
          return;
        }

        pokemon.leaveField(true, true);
        [party[slotIndex], party[replacementIndex]] = [party[replacementIndex], party[slotIndex]];
        this.scene.removePartyMemberModifiers(replacementIndex);
        const releasedPokemon = party.splice(replacementIndex, 1)[0];
        const tradeValue = trade ? this.getPokemonTradeValue(releasedPokemon) : 0;
        this.scene.currentBattle?.removeFaintedParticipant(releasedPokemon);
        releasedPokemon.destroy();
        if (trade) {
          this.scene.addMoney(tradeValue);
          this.scene.gameData.gameStats.pokemonTradedForMoney++;
          this.scene.gameData.gameStats.moneyEarnedFromTrading += tradeValue;
          this.scene.playSound("se/buy");
        }
        const SummonMissingPhase = getSummonMissingPhase();
        this.scene.unshiftPhase(new SummonMissingPhase(this.scene, slotIndex));
        const callbackOption = trade ? PartyOption.TRADE : PartyOption.RELEASE;
        const isModifierSelectCheck = this.partyUiMode === PartyUiMode.CHECK && currentPhase instanceof SelectModifierPhase;
        if (isModifierSelectCheck && selectCallback) {
          this.showText("", 0);
          selectCallback(slotIndex, callbackOption);
          return;
        }
        this.getUi().setMode(Mode.MESSAGE);
        if (selectCallback && (this.partyUiMode === PartyUiMode.RELEASE || this.partyUiMode === PartyUiMode.ADDPOKEMON)) {
          selectCallback(slotIndex, callbackOption);
        }
        this.showText("", 0);
      }, null, true);
      return;
    }

    this.showText(this.getReleaseMessage(getPokemonNameWithAffix(pokemon)), null, () => {
      this.clearPartySlots();
      this.scene.removePartyMemberModifiers(slotIndex);
      const releasedPokemon = this.scene.getParty().splice(slotIndex, 1)[0];
      releasedPokemon.destroy();
      this.populatePartySlots();
      if (this.cursor >= this.scene.getParty().length) {
        this.setCursor(this.cursor - 1);
      }

      if (trade) {
        const tradeValue = this.getPokemonTradeValue(releasedPokemon);
        this.scene.addMoney(tradeValue);
        this.scene.gameData.gameStats.pokemonTradedForMoney++;
        this.scene.gameData.gameStats.moneyEarnedFromTrading += tradeValue;
        this.scene.playSound("se/buy");
      }

      if (this.partyUiMode === PartyUiMode.RELEASE || this.partyUiMode === PartyUiMode.ADDPOKEMON) {
        const selectCallback = this.selectCallback;
        this.selectCallback = null;
        if (selectCallback) {
          selectCallback(slotIndex, PartyOption.RELEASE);
        }
      }
      this.showText("", 0);
    }, null, true);
  }

  getReleaseMessage(pokemonName: string): string {
    const rand = Utils.randInt(128);
    if (rand < 20) {
      return i18next.t("partyUiHandler:goodbye", { pokemonName: pokemonName });
    } else if (rand < 40) {
      return i18next.t("partyUiHandler:byebye", { pokemonName: pokemonName });
    } else if (rand < 60) {
      return i18next.t("partyUiHandler:farewell", { pokemonName: pokemonName });
    } else if (rand < 80) {
      return i18next.t("partyUiHandler:soLong", { pokemonName: pokemonName });
    } else if (rand < 100) {
      return i18next.t("partyUiHandler:thisIsWhereWePart", { pokemonName: pokemonName });
    } else if (rand < 108) {
      return i18next.t("partyUiHandler:illMissYou", { pokemonName: pokemonName });
    } else if (rand < 116) {
      return i18next.t("partyUiHandler:illNeverForgetYou", { pokemonName: pokemonName });
    } else if (rand < 124) {
      return i18next.t("partyUiHandler:untilWeMeetAgain", { pokemonName: pokemonName });
    } else if (rand < 127) {
      return i18next.t("partyUiHandler:sayonara", { pokemonName: pokemonName });
    } else {
      return i18next.t("partyUiHandler:smellYaLater", { pokemonName: pokemonName });
    }
  }

  getFormChangeItemsModifiers(pokemon: Pokemon) {
    let formChangeItemModifiers = this.scene.findModifiers(m => m instanceof PokemonFormChangeItemModifier && m.pokemonId === pokemon.id && !m.isGlitchOrSmittyItem()) as PokemonFormChangeItemModifier[];
    const ultraNecrozmaModifiers = formChangeItemModifiers.filter(m => m.active && m.formChangeItem === FormChangeItem.ULTRANECROZIUM_Z);
    if (ultraNecrozmaModifiers.length > 0) {

      return ultraNecrozmaModifiers;
    }
    if (formChangeItemModifiers.find(m => m.active)) {

      formChangeItemModifiers = formChangeItemModifiers.filter(m => m.active || m.formChangeItem === FormChangeItem.ULTRANECROZIUM_Z);
    } else if (pokemon.species.speciesId === Species.NECROZMA) {

      formChangeItemModifiers = formChangeItemModifiers.filter(m => m.formChangeItem !== FormChangeItem.ULTRANECROZIUM_Z);
    }
    return formChangeItemModifiers;
  }

  getOptionsCursorWithScroll(): integer {
    return this.optionsCursor + this.optionsScrollCursor + (this.options && this.options[0] === PartyOption.SCROLL_UP ? -1 : 0);
  }

  clearOptions() {
    this._optionHitZones.forEach(z => z.destroy());
    this._optionHitZones = [];
    this.moveInfoOverlay.clear();
    this.optionsMode = false;
    this.optionsScroll = false;
    this.optionsScrollCursor = 0;
    this.optionsScrollTotal = 0;
    this._optionsBgPattern?.clear();
    this._optionsBgPattern = null;
    this.options.splice(0, this.options.length);
    this.optionsContainer.removeAll(true);
    this.eraseOptionsCursor();

    this.currentSacrifice.pokemonId = null;
    this.currentSacrifice.hasEnough = false;

    this.partyMessageBox.setSize(262, 30);
    this._partyMessagePattern?.redraw();
    this.showText("", 0);
  }

  eraseOptionsCursor() {
    if (this.optionsCursorObj) {
      this.optionsCursorObj.destroy();
    }
    this.optionsCursorObj = null;
  }

  clear() {
    super.clear();
    this.moveInfoOverlay.clear();
    if (this._partyMetaMode !== TweakMetaMode.NONE) {
      this.deactivatePartyTweak();
    }
    this.partyContainer.setVisible(false);
    this.clearPartySlots();

    this.currentSacrifice.pokemonId = null;
    this.currentSacrifice.hasEnough = false;
  }

  clearPartySlots() {
    this._partyHitZones.forEach(z => z.destroy());
    this._partyHitZones = [];
    this.partySlots.splice(0, this.partySlots.length);
    this.partySlotsContainer.removeAll(true);
  }

  private getPartyTweakTargetForSlot(slot: PartySlot, index: number): Phaser.GameObjects.GameObject | null {
    switch (index) {
      case 0: return slot.rankIcon;
      case 1: return slot.rankNumText;
      case 2: return slot.rankIcon;
      default: return null;
    }
  }

  private getPartyTweakTarget(index: number): Phaser.GameObjects.GameObject | null {
    const slot = this.cursor < this.partySlots.length ? this.partySlots[this.cursor] : null;
    if (!slot) return null;
    return this.getPartyTweakTargetForSlot(slot, index);
  }

  private getPartyTweakMirrorTarget(index: number): Phaser.GameObjects.GameObject | null {
    const slot = this.cursor < this.partySlots.length ? this.partySlots[this.cursor] : null;
    if (!slot) return null;
    if (index === 2) return slot.rankNumText;
    return null;
  }

  private applyPartyTweakStep(target: Phaser.GameObjects.GameObject, tweakMode: string, button: Button): void {
    const go = target as any;
    if (tweakMode === "scale") {
      const step = 0.01;
      if (button === Button.UP) { go.setScale(go.scaleX + step, go.scaleY + step); }
      if (button === Button.DOWN) { go.setScale(go.scaleX - step, go.scaleY - step); }
      if (button === Button.LEFT) { go.setScale(go.scaleX - step, go.scaleY); }
      if (button === Button.RIGHT) { go.setScale(go.scaleX + step, go.scaleY); }
    } else if (tweakMode === "position") {
      const step = 0.5;
      if (button === Button.UP) { go.y -= step; }
      if (button === Button.DOWN) { go.y += step; }
      if (button === Button.LEFT) { go.x -= step; }
      if (button === Button.RIGHT) { go.x += step; }
    } else if (tweakMode === "fontSize") {
      if (go.style) {
        const cur = parseInt(go.style.fontSize) || 41;
        if (button === Button.UP) { go.setFontSize(cur + 1); }
        if (button === Button.DOWN) { go.setFontSize(cur - 1); }
      }
    } else if (tweakMode === "stroke") {
      if (go.style) {
        const curThick = go.style.strokeThickness ?? 0;
        const step = 0.1;
        if (button === Button.UP) { go.setStroke(go.style.stroke || "#222222", Math.round((curThick + step) * 10) / 10); }
        if (button === Button.DOWN) { go.setStroke(go.style.stroke || "#222222", Math.max(0, Math.round((curThick - step) * 10) / 10)); }
      }
    }
  }

  private initPartyTweak(): void {
    if (!DEBUG_YU_VISUAL_TUNING) return;
    if (this._partyTweakHudText) return;
    this._partyTweakHudText = addTextObject(this.scene, Math.floor(this.scene.game.canvas.width / 12), 2, "", TextStyle.WINDOW, { fontSize: "28px", color: "#00FF00", align: "center" });
    this._partyTweakHudText.setOrigin(0.5, 0);
    this._partyTweakHudText.setDepth(2000);
    this._partyTweakHudText.setVisible(false);
    this.partyContainer.add(this._partyTweakHudText);
  }

  private onPartyTweakCycle(): boolean {
    if (!DEBUG_YU_VISUAL_TUNING) return false;
    this.initPartyTweak();
    const next = cycleMetaMode(this._partyMetaMode);
    if (next === TweakMetaMode.NONE && this._partyMetaMode !== TweakMetaMode.NONE) {
      this.outputAllPartyTweakStates();
    }
    this._partyMetaMode = next;
    if (next !== TweakMetaMode.NONE) {
      (this.scene as BattleScene).uiEditModeActive = true;
      this.capturePartyTweakBaselines();
      if (!this._partyDropdownPanel) {
        this._partyDropdownPanel = new TweakDropdownPanel({
          scene: this.scene,
          getAnchorGameCoords: () => ({ x: 240, y: 5 }),
          elements: [...PartyUiHandler.PARTY_TWEAK_ASSETS],
          modes: [...PartyUiHandler.PARTY_TWEAK_MODES],
          coordSpace: "logical",
          alphabeticalSort: false,
          views: [
            { value: "all", label: "All Slots" },
            { value: "single", label: "1 Slot" },
          ],
          onViewChange: (viewIndex: number) => {
            this._partyTweakScope = viewIndex === 0 ? "all" : "single";
            this.capturePartyTweakBaselines();
            this.updatePartyTweakHUD();
          },
          onElementChange: (_name: string, idx: number) => { this._partyTweakAssetIndex = idx; this.updatePartyTweakHUD(); },
          onModeChange: (_name: string, idx: number) => { this._partyTweakMode = idx; this.updatePartyTweakHUD(); },
        });
        this._partyDropdownPanel.create();
      }
      if (!this._partyKeyVHandler) {
        this._partyKeyVHandler = (e: KeyboardEvent) => {
          if (e.key === "v" || e.key === "V") this.outputAllPartyTweakStates();
        };
        this.scene.input.keyboard?.on("keydown-V", this._partyKeyVHandler);
      }
      if (!this._partyKeyFiveHandler) {
        this._partyKeyFiveHandler = (e: KeyboardEvent) => {
          if (this._partyDropdownPanel) this._partyDropdownPanel.toggle();
        };
        this.scene.input.keyboard?.on("keydown-FIVE", this._partyKeyFiveHandler);
      }
    } else {
      this.deactivatePartyTweak();
    }
    this.updatePartyTweakHUD();
    return true;
  }

  private deactivatePartyTweak(): void {
    this._partyMetaMode = TweakMetaMode.NONE;
    this._partyTweakBaselines.clear();
    if (this._partyDropdownPanel) {
      this._partyDropdownPanel.destroy();
      this._partyDropdownPanel = null;
    }
    if (this._partyKeyVHandler) {
      this.scene.input.keyboard?.off("keydown-V", this._partyKeyVHandler);
      this._partyKeyVHandler = null;
    }
    if (this._partyKeyFiveHandler) {
      this.scene.input.keyboard?.off("keydown-FIVE", this._partyKeyFiveHandler);
      this._partyKeyFiveHandler = null;
    }
    if (this._partyTweakHudText) this._partyTweakHudText.setVisible(false);
    (this.scene as BattleScene).refreshUiEditModeActive();
  }

  private capturePartyTweakBaselines(): void {
    this._partyTweakBaselines.clear();
    for (let i = 0; i < PartyUiHandler.PARTY_TWEAK_ASSETS.length; i++) {
      const name = PartyUiHandler.PARTY_TWEAK_ASSETS[i];
      const target = this.getPartyTweakTarget(i);
      if (target) {
        const go = target as any;
        this._partyTweakBaselines.set(name, {
          x: go.x ?? 0,
          y: go.y ?? 0,
          scaleX: go.scaleX ?? 1,
          scaleY: go.scaleY ?? 1,
          fontSize: go.style?.fontSize ? parseInt(go.style.fontSize) : undefined,
          strokeThickness: go.style?.strokeThickness ?? undefined,
        });
      }
    }
    for (let slotIdx = 0; slotIdx < this.partySlots.length; slotIdx++) {
      const slot = this.partySlots[slotIdx];
      for (let i = 0; i < PartyUiHandler.PARTY_TWEAK_ASSETS.length; i++) {
        const name = PartyUiHandler.PARTY_TWEAK_ASSETS[i];
        const target = this.getPartyTweakTargetForSlot(slot, i);
        if (!target) continue;
        const go = target as any;
        this._partyTweakBaselines.set(`SLOT${slotIdx}:${name}`, {
          x: go.x ?? 0,
          y: go.y ?? 0,
          scaleX: go.scaleX ?? 1,
          scaleY: go.scaleY ?? 1,
          fontSize: go.style?.fontSize ? parseInt(go.style.fontSize) : undefined,
          strokeThickness: go.style?.strokeThickness ?? undefined,
        });
      }
    }
  }

  private syncPartyTweakDelta(name: string, target: Phaser.GameObjects.GameObject): void {
    const baseline = this._partyTweakBaselines.get(name);
    if (!baseline) return;
    const go = target as any;
    this._partyTweakDeltas.set(name, {
      dx: (go.x ?? 0) - baseline.x,
      dy: (go.y ?? 0) - baseline.y,
      dScaleX: (go.scaleX ?? 1) - baseline.scaleX,
      dScaleY: (go.scaleY ?? 1) - baseline.scaleY,
      dFontSize: go.style?.fontSize ? parseInt(go.style.fontSize) - (baseline.fontSize ?? 0) : undefined,
      dStrokeThickness: go.style?.strokeThickness !== undefined ? (go.style.strokeThickness ?? 0) - (baseline.strokeThickness ?? 0) : undefined,
    });
  }

  private processPartyTweakInput(button: Button): boolean {
    if (button === Button.CANCEL) {
      this.deactivatePartyTweak();
      return true;
    }
    const mode = this._partyMetaMode;
    if (mode === TweakMetaMode.EDIT_TYPE) {
      if (button === Button.LEFT) {
        this._partyTweakMode = (this._partyTweakMode - 1 + PartyUiHandler.PARTY_TWEAK_MODES.length) % PartyUiHandler.PARTY_TWEAK_MODES.length;
        if (this._partyDropdownPanel) this._partyDropdownPanel.syncModeValue(PartyUiHandler.PARTY_TWEAK_MODES[this._partyTweakMode]);
        this.updatePartyTweakHUD();
        return true;
      }
      if (button === Button.RIGHT) {
        this._partyTweakMode = (this._partyTweakMode + 1) % PartyUiHandler.PARTY_TWEAK_MODES.length;
        if (this._partyDropdownPanel) this._partyDropdownPanel.syncModeValue(PartyUiHandler.PARTY_TWEAK_MODES[this._partyTweakMode]);
        this.updatePartyTweakHUD();
        return true;
      }
      return true;
    }
    if (mode === TweakMetaMode.ELEMENT) {
      if (button === Button.LEFT) {
        this._partyTweakAssetIndex = (this._partyTweakAssetIndex - 1 + PartyUiHandler.PARTY_TWEAK_ASSETS.length) % PartyUiHandler.PARTY_TWEAK_ASSETS.length;
        if (this._partyDropdownPanel) this._partyDropdownPanel.syncElementValue(PartyUiHandler.PARTY_TWEAK_ASSETS[this._partyTweakAssetIndex]);
        this.updatePartyTweakHUD();
        return true;
      }
      if (button === Button.RIGHT) {
        this._partyTweakAssetIndex = (this._partyTweakAssetIndex + 1) % PartyUiHandler.PARTY_TWEAK_ASSETS.length;
        if (this._partyDropdownPanel) this._partyDropdownPanel.syncElementValue(PartyUiHandler.PARTY_TWEAK_ASSETS[this._partyTweakAssetIndex]);
        this.updatePartyTweakHUD();
        return true;
      }
      return true;
    }
    if (mode === TweakMetaMode.EDIT) {
      const tweakMode = PartyUiHandler.PARTY_TWEAK_MODES[this._partyTweakMode];
      const target = this.getPartyTweakTarget(this._partyTweakAssetIndex);
      if (!target) return true;
      const assetName = PartyUiHandler.PARTY_TWEAK_ASSETS[this._partyTweakAssetIndex];
      this.applyPartyTweakStep(target, tweakMode, button);
      this.syncPartyTweakDelta(assetName, target);
      const mirror = this.getPartyTweakMirrorTarget(this._partyTweakAssetIndex);
      if (mirror) {
        this.applyPartyTweakStep(mirror, tweakMode, button);
        const mirrorNames = { 2: "SoulText" } as Record<number, string>;
        const mirrorName = mirrorNames[this._partyTweakAssetIndex];
        if (mirrorName) this.syncPartyTweakDelta(mirrorName, mirror);
      }
      if (this._partyTweakScope === "all") {
        for (let i = 0; i < this.partySlots.length; i++) {
          if (i === this.cursor) continue;
          const otherSlot = this.partySlots[i];
          const otherTarget = this.getPartyTweakTargetForSlot(otherSlot, this._partyTweakAssetIndex);
          if (otherTarget) this.applyPartyTweakStep(otherTarget, tweakMode, button);
          if (this._partyTweakAssetIndex === 2) {
            const otherMirror = otherSlot.rankNumText;
            if (otherMirror) this.applyPartyTweakStep(otherMirror, tweakMode, button);
          }
        }
      }
      this.updatePartyTweakHUD();
      this.logPartyTweakState();
      return true;
    }
    return true;
  }

  private updatePartyTweakHUD(): void {
    if (!this._partyTweakHudText) return;
    const assetName = PartyUiHandler.PARTY_TWEAK_ASSETS[this._partyTweakAssetIndex];
    const modeName = PartyUiHandler.PARTY_TWEAK_MODES[this._partyTweakMode];
    const scopeLabel = this._partyTweakScope === "all" ? "ALL" : `SLOT${this.cursor}`;
    const text = formatMetaHud(this._partyMetaMode, `${modeName} - ${scopeLabel}:${assetName}`);
    this._partyTweakHudText.setText(text);
    this._partyTweakHudText.setVisible(this._partyMetaMode !== TweakMetaMode.NONE);
  }

  private logPartyTweakState(): void {
    const assetName = PartyUiHandler.PARTY_TWEAK_ASSETS[this._partyTweakAssetIndex];
    const target = this.getPartyTweakTarget(this._partyTweakAssetIndex);
    if (!target) return;
    const go = target as any;
    console.log(`[PARTY-TWEAK] ${assetName}: x=${go.x?.toFixed(1)} y=${go.y?.toFixed(1)} scaleX=${go.scaleX?.toFixed(3)} scaleY=${go.scaleY?.toFixed(3)}${go.style ? ` fontSize=${go.style.fontSize}` : ""}${go.style?.strokeThickness !== undefined ? ` stroke=${go.style.strokeThickness.toFixed(1)}` : ""}`);
  }

  private outputAllPartyTweakStates(): void {
    const lines: string[] = [];
    lines.push(`[PARTY-TWEAK-SNAPSHOT] scope=${this._partyTweakScope} activeSlot=${this.cursor} totalSlots=${this.partySlots.length}`);
    lines.push("NOTE: CHANGE values are deltas for code adjustments.\n");

    for (let slotIdx = 0; slotIdx < this.partySlots.length; slotIdx++) {
      const slot = this.partySlots[slotIdx];
      const changed: string[] = [];
      const unchanged: string[] = [];
      const unavailable: string[] = [];

      for (let i = 0; i < PartyUiHandler.PARTY_TWEAK_ASSETS.length; i++) {
        const name = PartyUiHandler.PARTY_TWEAK_ASSETS[i];
        const baselineKey = `SLOT${slotIdx}:${name}`;
        const target = this.getPartyTweakTargetForSlot(slot, i);
        let baseline = this._partyTweakBaselines.get(baselineKey);
        if (!baseline) baseline = this._partyTweakBaselines.get(name);
        if (!target || !baseline) { unavailable.push(name); continue; }
        const go = target as any;
        const dx = (go.x ?? 0) - baseline.x;
        const dy = (go.y ?? 0) - baseline.y;
        const dsx = (go.scaleX ?? 1) - baseline.scaleX;
        const dsy = (go.scaleY ?? 1) - baseline.scaleY;
        const curFs = go.style?.fontSize ? parseInt(go.style.fontSize) : undefined;
        const dFs = curFs !== undefined && baseline.fontSize !== undefined ? curFs - baseline.fontSize : undefined;
        const curSt = go.style?.strokeThickness;
        const dSt = curSt !== undefined && baseline.strokeThickness !== undefined ? curSt - baseline.strokeThickness : undefined;

        const hasChange = Math.abs(dx) >= 0.001 || Math.abs(dy) >= 0.001 || Math.abs(dsx) >= 0.001 || Math.abs(dsy) >= 0.001
          || (dFs !== undefined && Math.abs(dFs) >= 0.001) || (dSt !== undefined && Math.abs(dSt) >= 0.001);
        if (!hasChange) { unchanged.push(name); continue; }

        let block = `${name}:\n`;
        block += `  ORIGINAL: x=${baseline.x.toFixed(1)} y=${baseline.y.toFixed(1)} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)}${baseline.fontSize !== undefined ? ` fontSize=${baseline.fontSize}` : ""}${baseline.strokeThickness !== undefined ? ` stroke=${baseline.strokeThickness.toFixed(1)}` : ""}\n`;
        block += `  CHANGE:   Δx=${dx >= 0 ? "+" : ""}${dx.toFixed(1)} Δy=${dy >= 0 ? "+" : ""}${dy.toFixed(1)} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)}${dFs !== undefined ? ` ΔfontSize=${dFs >= 0 ? "+" : ""}${dFs}` : ""}${dSt !== undefined ? ` Δstroke=${dSt >= 0 ? "+" : ""}${dSt.toFixed(1)}` : ""}\n`;
        block += `  APPLIED:  x=${(go.x ?? 0).toFixed(1)} y=${(go.y ?? 0).toFixed(1)} scaleX=${(go.scaleX ?? 1).toFixed(3)} scaleY=${(go.scaleY ?? 1).toFixed(3)}${curFs !== undefined ? ` fontSize=${curFs}` : ""}${curSt !== undefined ? ` stroke=${curSt.toFixed(1)}` : ""}`;
        changed.push(block);
      }

      lines.push(`\n═══ SLOT ${slotIdx}${slotIdx === this.cursor ? " (active)" : ""} ═══`);
      if (changed.length > 0) { lines.push("── CHANGED ──"); lines.push(changed.join("\n\n")); }
      if (unchanged.length > 0) lines.push(`── UNCHANGED ── ${unchanged.join(", ")}`);
      if (unavailable.length > 0) lines.push(`── UNAVAILABLE ── ${unavailable.join(", ")}`);
    }

    const snapshot = lines.join("\n");
    console.log(snapshot);
    tweakCopyToClipboard(snapshot);
  }
}

class PartySlot extends Phaser.GameObjects.Container {
  private selected: boolean;
  private transfer: boolean;
  private slotIndex: integer;
  private pokemon: PlayerPokemon;

  private slotBg: Phaser.GameObjects.Image;
  private slotPb: Phaser.GameObjects.Sprite;
  public slotName: Phaser.GameObjects.Text;
  public slotHpBar: Phaser.GameObjects.Image;
  public slotHpOverlay: Phaser.GameObjects.Sprite;
  public slotHpText: Phaser.GameObjects.Text;
  public slotDescriptionLabel: Phaser.GameObjects.Text;
  public _typeIcons: Phaser.GameObjects.Sprite[] = [];
  public _quickInfoHint: Phaser.GameObjects.Container;

  private pokemonIcon: Phaser.GameObjects.Container;
  private iconAnimHandler: PokemonIconAnimHandler;

  public slotRankContainer: Phaser.GameObjects.Container | null = null;
  public rankIcon: Phaser.GameObjects.Sprite | null = null;
  public rankNumText: Phaser.GameObjects.Text | null = null;

  private _selectFilter: PokemonSelectFilter | null;

  constructor(scene: BattleScene, slotIndex: integer, pokemon: PlayerPokemon, iconAnimHandler: PokemonIconAnimHandler, partyUiMode: PartyUiMode, tmMoveId: Moves, selectFilter?: PokemonSelectFilter) {
    super(scene, slotIndex >= scene.currentBattle.getBattlerCount() ? 230.5 : 64,
      slotIndex >= scene.currentBattle.getBattlerCount() ? -184 + (scene.currentBattle.double ? -40 : 0)
            + (28 + (scene.currentBattle.double ? 8 : 0)) * slotIndex : -124 + (scene.currentBattle.double ? -8 : 0) + slotIndex * 64);

    this.slotIndex = slotIndex;
    this.pokemon = pokemon;
    this.iconAnimHandler = iconAnimHandler;
    this._selectFilter = selectFilter || null;

    this.setup(partyUiMode, tmMoveId);
  }

  getPokemon(): PlayerPokemon {
    return this.pokemon;
  }

  setup(partyUiMode: PartyUiMode, tmMoveId: Moves) {
    const battlerCount = (this.scene as BattleScene).currentBattle.getBattlerCount();

    const slotKey = `party_slot${this.slotIndex >= battlerCount ? "" : "_main"}`;

    const slotBg = this.scene.add.sprite(0, 0, slotKey, `${slotKey}${this.pokemon.hp ? "" : "_fnt"}`);
    this.slotBg = slotBg;

    this.add(slotBg);

    const slotPb = this.scene.add.sprite(this.slotIndex >= battlerCount ? -85.5 : -51, this.slotIndex >= battlerCount ? 0 : -20.5, "party_pb");
    this.slotPb = slotPb;

    this.add(slotPb);

    this.pokemonIcon = (this.scene as BattleScene).addPokemonIcon(this.pokemon, slotPb.x, slotPb.y, 0.5, 0.5, true);
    const _partyIconMult = this.pokemon.species?.generation === 20 ? 0.64 : 0.8;
    this.pokemonIcon.setScale(this.pokemonIcon.scaleX * _partyIconMult, this.pokemonIcon.scaleY * _partyIconMult);

    this.add(this.pokemonIcon);

    this.iconAnimHandler.addOrUpdate(this.pokemonIcon, PokemonIconAnimMode.PASSIVE);

    const slotInfoContainer = this.scene.add.container(0, 0);
    this.add(slotInfoContainer);

    const displayName = this.pokemon.getNameToRender();

    this.slotName = addTextObject(this.scene, 0, 0, displayName, TextStyle.PARTY);
    this.slotName.setPositionRelative(slotBg, this.slotIndex >= battlerCount ? 21 : 24, this.slotIndex >= battlerCount ? 2 : 10);
    this.slotName.setOrigin(0, 0);

    const nameMaxWidth = this.slotIndex >= battlerCount ? 52 : (76 - (this.pokemon.fusionSpecies ? 8 : 0));
    const partyCondenseTrigger = displayName.length >= 11
        ? nameMaxWidth * 0.82
        : nameMaxWidth;
    if (this.slotName.displayWidth > partyCondenseTrigger) {
        const ratio = partyCondenseTrigger / this.slotName.displayWidth;
        this.slotName.setScale(this.slotName.scaleX * ratio, this.slotName.scaleY);
    }

    const isDuelmon = this.pokemon.species?.generation === 20;
    const isFusion = this.pokemon.isFusion();
    const isShinyPkm = this.pokemon.isShiny();
    const isGlitchSmitty = this.pokemon.isGlitchOrSmittyForm();
    if (isDuelmon || isFusion || isShinyPkm || isGlitchSmitty) {
        this.slotName.setColor(getTextColor(TextStyle.SUMMARY_GOLD, false, (this.scene as BattleScene).uiTheme));
        this.slotName.setShadowColor(getTextColor(TextStyle.SUMMARY_GOLD, true, (this.scene as BattleScene).uiTheme));
    }

    const slotLevelLabel = this.scene.add.image(0, 0, "party_slot_overlay_lv");
    slotLevelLabel.setPositionRelative(this.slotName, 0, 12);
    slotLevelLabel.setOrigin(0, 0);

    const slotLevelText = addTextObject(this.scene, 0, 0, this.pokemon.level.toString(), this.pokemon.level < (this.scene as BattleScene).getMaxExpLevel() ? TextStyle.PARTY : TextStyle.PARTY_RED);
    slotLevelText.setPositionRelative(slotLevelLabel, 9, 0);
    slotLevelText.setOrigin(0, 0.25);

    const isAltBuild = !!(this.pokemon as any).altBuildId;
    const displayRank = isAltBuild ? Math.max(1, (this.pokemon as any).altBuildRank ?? 0) : ((this.pokemon as any).rankUpCount ?? 0) + 1;
    const showRank = isAltBuild || displayRank > 1;
    this.slotRankContainer = null;

    if (showRank) {
      this.slotRankContainer = this.scene.add.container(0, 0);

      this.rankIcon = this.scene.add.sprite(-29.5, -3.0, "smitems", "modSoulCollected");
      this.rankIcon.setScale(0.11);
      this.rankIcon.setOrigin(0, 0.5);
      this.slotRankContainer.add(this.rankIcon);

      const rankFontSize = this.slotIndex === 0 ? "31px" : "28px";
      this.rankNumText = addTextObject(this.scene, -27.5, 0.0, Utils.intToRoman(displayRank), TextStyle.PARTY, { fontSize: rankFontSize });
      this.rankNumText.setOrigin(0, 0.5);
      this.slotRankContainer.add(this.rankNumText);

      const rankYOffset = this.slotIndex === 0 ? 1.5 : 0.5;
      this.slotRankContainer.setPositionRelative(slotLevelLabel, 9 + slotLevelText.displayWidth + 2, rankYOffset + 4);
    }

    slotInfoContainer.add([this.slotName, slotLevelLabel, slotLevelText ]);
    if (this.slotRankContainer) {
      slotInfoContainer.add(this.slotRankContainer);
    }

    const genderSymbol = getGenderSymbol(this.pokemon.getGender(true));

    if (genderSymbol) {
      const slotGenderText = addTextObject(this.scene, 0, 0, genderSymbol, TextStyle.PARTY);
      slotGenderText.setColor(getGenderColor(this.pokemon.getGender(true)));
      slotGenderText.setShadowColor(getGenderColor(this.pokemon.getGender(true), true));
      if (this.slotIndex >= battlerCount) {
        const genderX = this.slotRankContainer ? 9 + slotLevelText.displayWidth + 2 + this.slotRankContainer.getBounds().width + 2 : 36;
        slotGenderText.setPositionRelative(slotLevelLabel, genderX, 0);
      } else {
        slotGenderText.setPositionRelative(this.slotName, 76 - (this.pokemon.fusionSpecies ? 8 : 0), 3);
      }
      slotGenderText.setOrigin(0, 0.25);

      slotInfoContainer.add(slotGenderText);
    }

    if (this.pokemon.fusionSpecies) {
      const splicedIcon = this.scene.add.image(0, 0, "icon_spliced");
      splicedIcon.setScale(0.5);
      splicedIcon.setOrigin(0, 0);
      if (this.slotIndex >= battlerCount) {
        splicedIcon.setPositionRelative(slotLevelLabel, 36 + (genderSymbol ? 8 : 0), 0.5);
      } else {
        splicedIcon.setPositionRelative(this.slotName, 76, 3.5);
      }

      slotInfoContainer.add(splicedIcon);
    }

    if (this.pokemon.status) {
      const statusIndicator = this.scene.add.sprite(0, 0, "statuses");
      statusIndicator.setFrame(StatusEffect[this.pokemon.status?.effect].toLowerCase());
      statusIndicator.setOrigin(0, 0);
      statusIndicator.setPositionRelative(slotLevelLabel, this.slotIndex >= battlerCount ? 43 : 55, 0);

      slotInfoContainer.add(statusIndicator);
    }

    if (this.pokemon.isShiny()) {
      const doubleShiny = this.pokemon.isFusion() && this.pokemon.shiny && this.pokemon.fusionShiny;

      const shinyStar = this.scene.add.image(0, 0, `shiny_star_small${doubleShiny ? "_1" : ""}`);
      shinyStar.setOrigin(0, 0);
      shinyStar.setPositionRelative(this.slotName, -9, 3);
      shinyStar.setTint(getVariantTint(!doubleShiny ? this.pokemon.getVariant() : this.pokemon.variant));

      slotInfoContainer.add(shinyStar);

      if (doubleShiny) {
        const fusionShinyStar = this.scene.add.image(0, 0, "shiny_star_small_2");
        fusionShinyStar.setOrigin(0, 0);
        fusionShinyStar.setPosition(shinyStar.x, shinyStar.y);
        fusionShinyStar.setTint(getVariantTint(this.pokemon.fusionVariant));

        slotInfoContainer.add(fusionShinyStar);
      }
    }

    this.slotHpBar = this.scene.add.image(0, 0, "party_slot_hp_bar");
    this.slotHpBar.setPositionRelative(slotBg, this.slotIndex >= battlerCount ? 72 : 8, this.slotIndex >= battlerCount ? 6 : 31);
    this.slotHpBar.setOrigin(0, 0);
    this.slotHpBar.setVisible(false);

    const hpRatio = this.pokemon.getHpRatio();

    this.slotHpOverlay = this.scene.add.sprite(0, 0, "party_slot_hp_overlay", hpRatio > 0.5 ? "high" : hpRatio > 0.25 ? "medium" : "low");
    this.slotHpOverlay.setPositionRelative(this.slotHpBar, 16, 2);
    this.slotHpOverlay.setOrigin(0, 0);
    this.slotHpOverlay.setScale(hpRatio, 1);
    this.slotHpOverlay.setVisible(false);

    this.slotHpText = addTextObject(this.scene, 0, 0, `${this.pokemon.hp}/${this.pokemon.getMaxHp()}`, TextStyle.PARTY);
    this.slotHpText.setPositionRelative(this.slotHpBar, this.slotHpBar.width - 3, this.slotHpBar.height - 2);
    this.slotHpText.setOrigin(1, 0);
    this.slotHpText.setVisible(false);

    this.slotDescriptionLabel = addTextObject(this.scene, 0, 0, "", TextStyle.MESSAGE);
    this.slotDescriptionLabel.setPositionRelative(slotBg, this.slotIndex >= battlerCount ? 94 : 32, this.slotIndex >= battlerCount ? 16 : 46);
    this.slotDescriptionLabel.setOrigin(0, 1);
    this.slotDescriptionLabel.setVisible(false);

    slotInfoContainer.add([this.slotHpBar, this.slotHpOverlay, this.slotHpText, this.slotDescriptionLabel]);

    const types = this.pokemon.getTypes().slice(0, 2);
    const typeAtlas = Utils.getLocalizedSpriteKey("types");
    const typeIcons: Phaser.GameObjects.Sprite[] = [];
    const isMain = this.slotIndex < battlerCount;
    const typeScale = isMain ? 0.42 : 0.38;
    const typeBaseX = isMain ? 23 : 75;
    const typeBaseY = (isMain ? 30 : 6) + this.slotHpBar.height + 1;
    types.forEach((t, i) => {
      const icon = this.scene.add.sprite(0, 0, typeAtlas, Type[t].toLowerCase());
      icon.setOrigin(0, 0);
      icon.setScale(typeScale);
      icon.setPositionRelative(slotBg, typeBaseX + i * (icon.displayWidth + 2), typeBaseY);
      slotInfoContainer.add(icon);
      typeIcons.push(icon);
    });
    this._typeIcons = typeIcons;

    const quickInfoContainer = this.scene.add.container(0, 0);
    const battleScene = this.scene as BattleScene;
    let infoIcon = battleScene.inputController?.getIconForLatestInputRecorded("BUTTON_TOGGLE_FOE_BAR");
    if (!infoIcon) {
      infoIcon = "I.png";
    }
    const infoIconType = battleScene.inputController?.getLastSourceType() || "keyboard";
    const infoKeySprite = this.scene.add.sprite(0, 0, infoIconType);
    infoKeySprite.setFrame(infoIcon);
    infoKeySprite.setScale(isMain ? 0.60 : 0.55);
    infoKeySprite.setOrigin(0, 0.5);

    const infoLabel = addTextObject(this.scene, 0, 0, i18next.t("partyUiHandler:quickInfo", { defaultValue: "Quick Info" }), TextStyle.MESSAGE, { fontSize: "44px" });
    infoLabel.setOrigin(0, 0.5);

    if (isMain) {
      const hpBarCenterX = 8 + this.slotHpBar.width / 2;
      const lastTypeIcon = typeIcons.length > 0 ? typeIcons[typeIcons.length - 1] : null;
      const hintY = lastTypeIcon
        ? typeBaseY + lastTypeIcon.displayHeight + 12
        : typeBaseY + 10;
      const combinedWidth = infoKeySprite.displayWidth + infoLabel.displayWidth + 1;
      infoKeySprite.setPositionRelative(slotBg, hpBarCenterX - combinedWidth / 2, hintY);
      infoLabel.setPositionRelative(slotBg, hpBarCenterX - combinedWidth / 2 + infoKeySprite.displayWidth + 1, hintY);
    } else {
      const lastTypeIcon = typeIcons.length > 0 ? typeIcons[typeIcons.length - 1] : null;
      const hintX = lastTypeIcon
        ? typeBaseX + typeIcons.length * (lastTypeIcon.displayWidth + 2) + 3
        : typeBaseX;
      infoKeySprite.setPositionRelative(slotBg, hintX, typeBaseY + (lastTypeIcon ? lastTypeIcon.displayHeight / 2 : 0));
      infoLabel.setPositionRelative(slotBg, hintX + infoKeySprite.displayWidth + 1, typeBaseY + (lastTypeIcon ? lastTypeIcon.displayHeight / 2 : 0));
    }
    const hintW = infoKeySprite.displayWidth + infoLabel.displayWidth + 1;
    const hintH = Math.max(infoKeySprite.displayHeight, infoLabel.displayHeight);
    const hintZone = this.scene.add.zone(
      infoKeySprite.x + hintW / 2,
      infoKeySprite.y,
      hintW + 8,
      hintH + 8
    );
    hintZone.setOrigin(0.5, 0.5);
    hintZone.setInteractive({ useHandCursor: true });
    const slotIdx = this.slotIndex;
    const slotPokemon = this.pokemon;
    hintZone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      const ui = (this.scene as BattleScene).ui;
      const posX = slotIdx === 0 ? 186 : 4;
      ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, slotPokemon, 0, false, { x: posX });
    });
    quickInfoContainer.add([infoKeySprite, infoLabel, hintZone]);
    slotInfoContainer.add(quickInfoContainer);
    this._quickInfoHint = quickInfoContainer;
    this._quickInfoHint.setVisible(false);

    if (partyUiMode !== PartyUiMode.TM_MODIFIER) {
      this.slotDescriptionLabel.setVisible(false);
      this.slotHpBar.setVisible(true);
      this.slotHpOverlay.setVisible(true);
      this.slotHpText.setVisible(true);
    } else {
      this.slotHpBar.setVisible(false);
      this.slotHpOverlay.setVisible(false);
      this.slotHpText.setVisible(false);
      let slotTmText: string;
      const filterResult = this._selectFilter ? this._selectFilter(this.pokemon) : null;
      const canLearnByFilter = this._selectFilter ? (filterResult === null) : (this.pokemon.compatibleTms.indexOf(tmMoveId) !== -1);
      switch (true) {
      case (!canLearnByFilter):
        slotTmText = i18next.t("partyUiHandler:notAble");
        break;
      case (this.pokemon.getMoveset().filter(m => m?.moveId === tmMoveId).length > 0):
        slotTmText = i18next.t("partyUiHandler:learned");
        break;
      default:
        slotTmText = i18next.t("partyUiHandler:able");
        break;
      }

      this.slotDescriptionLabel.setText(slotTmText);
      this.slotDescriptionLabel.setVisible(true);

    }
  }

  select(): void {
    if (this.selected) {
      return;
    }

    this.selected = true;
    this.iconAnimHandler.addOrUpdate(this.pokemonIcon, PokemonIconAnimMode.ACTIVE);

    this.updateSlotTexture();
    this.slotPb.setFrame("party_pb_sel");
    if (this._quickInfoHint) {
      this._quickInfoHint.setVisible(true);
    }
  }

  deselect(): void {
    if (!this.selected) {
      return;
    }

    this.selected = false;
    this.iconAnimHandler.addOrUpdate(this.pokemonIcon, PokemonIconAnimMode.PASSIVE);

    this.updateSlotTexture();
    this.slotPb.setFrame("party_pb");
    if (this._quickInfoHint) {
      this._quickInfoHint.setVisible(false);
    }
  }

  setTransfer(transfer: boolean): void {
    if (this.transfer === transfer) {
      return;
    }

    this.transfer = transfer;
    this.updateSlotTexture();
  }

  private updateSlotTexture(): void {
    const battlerCount = (this.scene as BattleScene).currentBattle.getBattlerCount();
    this.slotBg.setTexture(`party_slot${this.slotIndex >= battlerCount ? "" : "_main"}`,
      `party_slot${this.slotIndex >= battlerCount ? "" : "_main"}${this.transfer ? "_swap" : this.pokemon.hp ? "" : "_fnt"}${this.selected ? "_sel" : ""}`);
  }
}

class PartyCancelButton extends Phaser.GameObjects.Container {
  private selected: boolean;

  private partyCancelBg: Phaser.GameObjects.Sprite;
  private partyCancelPb: Phaser.GameObjects.Sprite;

  constructor(scene: BattleScene, x: number, y: number) {
    super(scene, x, y);

    this.setup();
  }

  setup() {
    const partyCancelBg = this.scene.add.sprite(0, 0, "party_cancel");
    this.add(partyCancelBg);

    this.partyCancelBg = partyCancelBg;

    const partyCancelPb = this.scene.add.sprite(-17, 0, "party_pb");
    this.add(partyCancelPb);

    this.partyCancelPb = partyCancelPb;

    const partyCancelText = addTextObject(this.scene, -8, -7, i18next.t("partyUiHandler:cancel"), TextStyle.PARTY);
    this.add(partyCancelText);
  }

  select() {
    if (this.selected) {
      return;
    }

    this.selected = true;

    this.partyCancelBg.setFrame("party_cancel_sel");
    this.partyCancelPb.setFrame("party_pb_sel");
  }

  deselect() {
    if (!this.selected) {
      return;
    }

    this.selected = false;

    this.partyCancelBg.setFrame("party_cancel");
    this.partyCancelPb.setFrame("party_pb");
  }
}