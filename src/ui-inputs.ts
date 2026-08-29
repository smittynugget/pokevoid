import Phaser from "phaser";
import {Mode} from "./ui/mode";
import {InputsController} from "./inputs-controller";
import MessageUiHandler from "./ui/message-ui-handler";
import StarterSelectUiHandler from "./ui/starter-select-ui-handler";
import {Setting, SettingKeys, settingIndex} from "./system/settings/settings";
import SettingsUiHandler from "./ui/settings/settings-ui-handler";
import {Button} from "#enums/buttons";
import SettingsGamepadUiHandler from "./ui/settings/settings-gamepad-ui-handler";
import SettingsKeyboardUiHandler from "#app/ui/settings/settings-keyboard-ui-handler";
import BattleScene from "./battle-scene";
import SettingsDisplayUiHandler from "./ui/settings/settings-display-ui-handler";
import SettingsAudioUiHandler from "./ui/settings/settings-audio-ui-handler";
import RunInfoUiHandler from "./ui/run-info-ui-handler";
import RunHistoryUiHandler from "./ui/run-history-ui-handler";
import { randomString, intToRoman, hashCode, randSeedInt, getEnumValues } from "./utils";
import { GameMode, GameModes, getGameMode } from "./game-mode";
import { ShopModifierSelectPhase } from "./phases/shop-modifier-select-phase";
import { QuestUnlockables, QuestState } from "./system/game-data";
import { activateSmitomTalk } from "./ui/title-ui-handler";
import ModifierSelectUiHandler from "./ui/modifier-select-ui-handler";
import { AddPokemonModifierType, getPlayerModifierTypeOptions, regenerateModifierPoolThresholds, ModifierPoolType, PathNodeTypeFilter, ModifierType, ModifierTypeOption, CollectedTypeModifierType } from "./modifier/modifier-type";
import { ModifierTier } from "./modifier/modifier-tier";
import { DUELMON_SPECIES, getReshapeDebugDuelmonSpecies } from "./data/duelmon-rankups";
import { Gender } from "./data/gender";
import i18next from "i18next";
import { getPokemonSpecies, getPokemonSpeciesForm, allSpecies, isGlitchFormKey, isSmittyFormKey } from "./data/pokemon-species";
import type { Variant } from "./data/variant";
import { pokemonFormChanges, applyUniversalSmittyForm, SmittyFormTrigger, SpeciesFormChange } from "./data/pokemon-forms";
import { Species } from "#enums/species";
import Battle, { BattleType, FixedBattleConfig, createSmittyBattle } from "./battle";
import ChampionSelectUiHandler from "./ui/champion-select-ui-handler";
import BattlePathUiHandler from "./ui/battle-path-ui-handler";
import { ModifierTooltipUtils } from "#app/ui/modifier-tooltip-utils";
import Overrides, { DEBUG_YU_VISUAL_TUNING } from "./overrides";
import { PermaRunQuestModifier, PermaWinQuestModifier, PermaBeatTrainerQuestModifier, GlitchPieceModifier, CollectedTypeModifier } from "./modifier/modifier";
import { Type } from "./data/type";
import { allAbilities } from "./data/ability";
import { BountyRewardPhase } from "./phases/bounty-reward-phase";
import { QuestManagerPhase } from "./phases/quest-manager-phase";
import { TitlePhase } from "./phases/title-phase";
import { SlideshowCutscenePhase } from "./phases/slideshow-cutscene-phase";
import { STORY_CUTSCENES } from "./system/story-cutscenes";
import { PlayerGender } from "#enums/player-gender";
import { TrainerType } from "#enums/trainer-type";
import Trainer, { TrainerVariant } from "./field/trainer";
import TrainerData from "./system/trainer-data";
import { getDynamicRival } from "./data/trainer-config";
import { Biome } from "#enums/biome";
import { EncounterPhase } from "./phases/encounter-phase";
import { ShinyPowerPhase } from "./phases/shiny-power-phase";
import { RankUpPhase } from "./phases/rank-up-phase";
import type { PlayerPokemon, default as Pokemon } from "./field/pokemon";
import { YuMovePhase } from "./phases/yu-move-phase";
import { isDuelmonSpecies, getDuelmonRankUpDefinition } from "./data/duelmon-rankups";
import { RankUpTransformPhase } from "./phases/rank-up-transform-phase";
import { calculateStatsToTargetBstWithSwapping } from "./data/alt-build-stat-calculator";
import { Stat } from "#enums/stat";
import { pickThreeYuMovesWithFallback } from "./data/yu-move-utils";
import { addCorruptedRivalOverlay, playCutsceneFaintAnim } from "./utils/story-cutscene-overlays";
import { runPowerUnlockOverlays } from "./utils/story-cutscene-power-overlays";
import { RewardObtainedType, UnlockModePokeSpriteType } from "./ui/reward-obtained-ui-handler";
import type { RewardConfig } from "./ui/reward-obtained-ui-handler";
import { fixedInt } from "./utils";
type ActionKeys = Record<Button, () => void>;

export class UiInputs {
  private scene: BattleScene;
  private events: Phaser.Events.EventEmitter;
  private inputsController: InputsController;
  private _leftMouseDown = false;
  private _rightMouseDown = false;

  constructor(scene: BattleScene, inputsController: InputsController) {
    this.scene = scene;
    this.inputsController = inputsController;
    this.init();
  }

  private isTouchControlHit(pointer: Phaser.Input.Pointer): boolean {
    if (!this.scene.enableTouchControls) return false;
    const controlGroups = document.querySelectorAll("#dpad, #apad, .apadNewBtnContainer");
    const evt = pointer.event;
    let x: number, y: number;
    if (evt instanceof TouchEvent && evt.changedTouches?.length) {
      x = evt.changedTouches[0].clientX;
      y = evt.changedTouches[0].clientY;
    } else if (evt instanceof MouseEvent) {
      x = evt.clientX;
      y = evt.clientY;
    } else {
      return false;
    }
    for (const el of controlGroups) {
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width > 0 && x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return true;
      }
    }
    return false;
  }

  init(): void {
    this.events = this.inputsController.events;
    this.listenInputs();

    let _lastClickProcessedAt: number = 0;

    this.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (this.scene.uiEditModeActive) return;
      if (!this.scene.ui) return;
      if (this.scene.disableMouseInput && !(pointer.event instanceof TouchEvent)) return;
      if (this.isTouchControlHit(pointer)) return;
      const now = Date.now();
      if (now - _lastClickProcessedAt < 250) return;
      if (pointer.button === 0) {
        this._leftMouseDown = true;
        if (this._rightMouseDown) {
          _lastClickProcessedAt = now;
          this.scene.ui.processInput(Button.ACTION);
          return;
        }
        const currentMode = this.scene.ui.getMode();
        const hitObjects = this.scene.input.hitTestPointer(pointer);
        if (!hitObjects || hitObjects.length === 0) {
          if (currentMode === Mode.TITLE) {
            return;
          }
          _lastClickProcessedAt = now;
          this.scene.ui.processInput(Button.ACTION);
        }
      } else if (pointer.button === 2) {
        this._rightMouseDown = true;
        this._leftMouseDown = false;
        if (this.scene.ui.getMode() === Mode.TITLE) {
          this.buttonMenu();
          return;
        }
        _lastClickProcessedAt = now;
        this.scene.ui.processInput(Button.CANCEL);
      }
    });

    this.scene.input.on("pointerup", (pointer: Phaser.Input.Pointer) => {
      if (pointer.button === 0) this._leftMouseDown = false;
      else if (pointer.button === 2) this._rightMouseDown = false;
    });

    this.scene.game.canvas.addEventListener("pointerleave", () => {
      this._leftMouseDown = false;
      this._rightMouseDown = false;
    });

    this.scene.input.on("wheel", (_pointer: Phaser.Input.Pointer, _g: any, _dx: number, dy: number) => {
      if (!this.scene.ui) return;
      if (this.scene.disableMouseInput) return;
      const mode = this.scene.ui?.getMode();
      if (mode === Mode.POKEMON_BATTLE_TOOLTIP) {
        if (dy > 0) {
          this.scene.ui.processInput(Button.RIGHT);
        } else if (dy < 0) {
          this.scene.ui.processInput(Button.LEFT);
        }
        return;
      }
      if (dy > 0) {
        this.scene.ui.processInput(Button.DOWN);
      } else if (dy < 0) {
        this.scene.ui.processInput(Button.UP);
      }
    });

    if (Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-H", (event: KeyboardEvent) => {
        if (event.repeat) return;
        const mode = this.scene.ui?.getMode();
        if (mode === Mode.TITLE) {
          this.launchModifierSelectDebug();
          return;
        }
        if (mode === Mode.LOOT_REWARD_SELECT) return;
        if (mode === Mode.SHOP_SELECT) return;
        if (mode === Mode.CHAMPION_SELECT) return;
        if (mode === Mode.POKEMON_BATTLE_TOOLTIP) return;
        if ((mode === Mode.STARTER_SELECT || mode === Mode.EGG_STARTER_SELECT) && !Overrides.STARTER_SELECT_TWEAK_TOOL_OVERRIDE) return;
        if (DEBUG_YU_VISUAL_TUNING) {
          if (!this.scene.uiEditModeActive) {
            this.scene.uiEditModeActive = true;
          }
          this.scene.ui.processInput(Button.CYCLE_ABILITY);
        }
      });
    }

    if (Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-J", (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchRankUpLootDebug();
        }
      });
    }

    if (Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-G", (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchCollectedTypeShopDebug();
          return;
        }
      });
    }

    if (Overrides.DEBUG_TUTORIAL_FLOW_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-K", () => {
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchTutorialFlowDebug();
        }
      });
    }

    if (Overrides.DEBUG_PEGASUS_BATTLE_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-L", () => {
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchPegasusBossDebug();
        }
      });
    }

    if (Overrides.DEBUG_SMITTY_BATTLE_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-FIVE", (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchSmittyBossDebug();
        }
      });
    }

    if (Overrides.DEBUG_WAVE35_SMITOM_TIP_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-FOUR", (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchWave35SmitomTipDebug();
        }
      });
    }

    if (Overrides.DEBUG_WAVE100_LEVEL1_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-ONE", (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchWave100Level1Debug();
        }
      });
    }

    if (Overrides.DEBUG_DUELMON_WILD_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-TWO", (event: KeyboardEvent) => {
        if (event.repeat || this.isTypingInDomField()) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchDuelmonWildGauntletDebug();
        }
      });
      this.scene.input.keyboard?.on("keydown", () => {
        const scene = this.scene;
        if (!scene.debugGauntletAutoCycle || (!scene.debugGauntletCancelAutoCycle && !scene.debugGauntletAutoCycleTimer)) {
          return;
        }
        scene.debugGauntletAutoCycle = false;
        scene.debugGauntletAutoCycleTimer?.destroy();
        scene.debugGauntletAutoCycleTimer = null;
        const cancel = scene.debugGauntletCancelAutoCycle;
        scene.debugGauntletCancelAutoCycle = null;
        cancel?.();
      });
    }

    if (Overrides.DEBUG_FORM_EVOLUTION_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-THREE", (event: KeyboardEvent) => {
        if (event.repeat || this.isTypingInDomField()) return;

        if (this.formEvoDebugChaining) {
          this.stopFormEvoDebugChain();
          return;
        }

        if (this.formEvoDebugBusy) return;
        if (this.scene.ui?.getMode() !== Mode.TITLE) return;
        this.formEvoDebugChaining = true;
        this.startFormEvoDebugChain();
        this.launchRandomFormEvolutionDebug();
      });
    }

    if (Overrides.DEBUG_RESHAPE_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-FOUR", (event: KeyboardEvent) => {
        if (event.repeat || this.isTypingInDomField()) return;
        if (this.reshapeDebugActive) {
          this.stopReshapeDebug();
          return;
        }
        if (this.reshapeDebugBusy) return;
        if (this.scene.ui?.getMode() !== Mode.TITLE) return;
        this.reshapeDebugActive = true;
        this.launchReshapeDebug();
      });
    }

    if (Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-EIGHT", (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchShinyPowerDebug();
        }
      });
    }

    if (Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-SEVEN", (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchYuMoveDebug();
        }
      });
    }

    if (Overrides.MODIFIER_SELECT_DEBUG_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-SIX", (event: KeyboardEvent) => {
        if (event.repeat) return;
        if (this.scene.ui?.getMode() === Mode.TITLE) {
          this.launchRivalDefeatCutsceneDebug();
        }
      });
    }

    if (Overrides.FORCE_BOUNTY_COMPLETION_OVERRIDE) {
      this.scene.input.keyboard?.on("keydown-NINE", (event: KeyboardEvent) => {
        if (event.repeat) return;
        this.triggerBountyCompletionDebug();
      });
      this.scene.input.keyboard?.on("keydown-NUMPAD_NINE", (event: KeyboardEvent) => {
        if (event.repeat) return;
        this.triggerBountyCompletionDebug();
      });
    }

    this.scene.input.keyboard?.on("keydown-ZERO", (event: KeyboardEvent) => {
      if (event.repeat) return;
      const mode = this.scene.ui?.getMode();
      if (mode === Mode.TITLE && Overrides.DEBUG_LOCALE_CYCLE_OVERRIDE) {
        const locales = ["en", "es", "fr", "it", "de", "ru", "pt-BR", "zh-CN", "zh-TW", "ko", "ja"];
        const current = i18next.resolvedLanguage || "en";
        const idx = locales.indexOf(current);
        const next = locales[(idx + 1) % locales.length];
        console.log(`[LOCALE_CYCLE] ${current} → ${next}`);
        i18next.changeLanguage(next);
        localStorage.setItem("prLang", next);
        window.location.reload();
      } else if (Overrides.FORCE_BOUNTY_COMPLETION_OVERRIDE) {
        this.triggerBountyCompletionDebug();
      }
    });
    this.scene.input.keyboard?.on("keydown-NUMPAD_ZERO", (event: KeyboardEvent) => {
      if (event.repeat) return;
      const mode = this.scene.ui?.getMode();
      if (mode === Mode.TITLE && Overrides.DEBUG_LOCALE_CYCLE_OVERRIDE) {
        const locales = ["en", "es", "fr", "it", "de", "ru", "pt-BR", "zh-CN", "zh-TW", "ko", "ja"];
        const current = i18next.resolvedLanguage || "en";
        const idx = locales.indexOf(current);
        const next = locales[(idx + 1) % locales.length];
        console.log(`[LOCALE_CYCLE] ${current} → ${next}`);
        i18next.changeLanguage(next);
        localStorage.setItem("prLang", next);
        window.location.reload();
      } else if (Overrides.FORCE_BOUNTY_COMPLETION_OVERRIDE) {
        this.triggerBountyCompletionDebug();
      }
    });
  }

  detectInputMethod(evt): void {
    if (evt.controller_type === "keyboard") {

      if (evt.hasOwnProperty("isTouch") && evt.isTouch) {
        this.scene.inputMethod = "touch";
      } else {
        this.scene.inputMethod = "keyboard";
      }
    } else if (evt.controller_type === "gamepad") {
      this.scene.inputMethod = "gamepad";
    }
  }

  listenInputs(): void {
    this.events.on("input_down", (event) => {
      if (!this.scene.ui) return;
      this.detectInputMethod(event);
      const mode = this.scene.ui?.getMode();
      if (this.shouldBlockForEditMode(event.button)) return;

      const actions = this.getActionsKeyDown();
      if (!actions.hasOwnProperty(event.button)) {
        return;
      }
      actions[event.button]();
    }, this);

    this.events.on("input_up", (event) => {
      if (!this.scene.ui) return;
      if (this.shouldBlockForEditMode(event.button)) return;
      const actions = this.getActionsKeyUp();
      if (!actions.hasOwnProperty(event.button)) {
        return;
      }
      actions[event.button]();
    }, this);
  }

  private shouldBlockForEditMode(button?: Button): boolean {
    if (!this.scene.uiEditModeActive) return false;
    if (button === Button.CYCLE_ABILITY) return false;
    if (button === Button.CYCLE_GENDER) return false;
    if (button === Button.CANCEL) return false;
    if (!DEBUG_YU_VISUAL_TUNING) return false;
    const handler = this.scene.ui?.getHandler();
    if (handler && typeof (handler as any)._tweakActive === "boolean" && (handler as any)._tweakActive) return false;
    if (handler && typeof (handler as any)._msTweakActive === "boolean" && (handler as any)._msTweakActive) return false;
    if (handler && typeof (handler as any).sumIconTweakActive === "boolean" && (handler as any).sumIconTweakActive) return false;
    if (handler && typeof (handler as any).partyTweakActive === "boolean" && (handler as any).partyTweakActive) return false;
    if ((this.scene as any).fieldSpriteTweak?.tweakActive) return false;
    if ((this.scene as any).commandUiTweak?.tweakActive) return false;
    const playerBi = (this.scene as any).getPlayerField?.()?.[0]?.getBattleInfo?.();
    const enemyBi = (this.scene as any).getEnemyField?.()?.[0]?.getBattleInfo?.();
    if (playerBi?.biTweakActive || enemyBi?.biTweakActive) return false;
    return true;
  }

  doVibration(inputSuccess: boolean, vibrationLength: number): void {
    if (inputSuccess && this.scene.enableVibration && typeof navigator.vibrate !== "undefined") {
      navigator.vibrate(vibrationLength);
    }
  }

  getActionsKeyDown(): ActionKeys {
    const actions: ActionKeys = {
      [Button.UP]:              () => this.buttonDirection(Button.UP),
      [Button.DOWN]:            () => this.buttonDirection(Button.DOWN),
      [Button.LEFT]:            () => this.buttonDirection(Button.LEFT),
      [Button.RIGHT]:           () => this.buttonDirection(Button.RIGHT),
      [Button.SUBMIT]:          () => this.buttonTouch(),
      [Button.ACTION]:          () => this.buttonAb(Button.ACTION),
      [Button.CANCEL]:          () => this.buttonAb(Button.CANCEL),
      [Button.MENU]:            () => this.buttonMenu(),
      [Button.STATS]:           () => this.buttonGoToFilter(Button.STATS),
      [Button.CYCLE_SHINY]:     () => this.buttonCycleOption(Button.CYCLE_SHINY),
      [Button.CYCLE_FORM]:      () => this.buttonCycleOption(Button.CYCLE_FORM),
      [Button.CYCLE_GENDER]:    () => this.buttonCycleOption(Button.CYCLE_GENDER),
      [Button.CYCLE_ABILITY]:   () => this.buttonCycleOption(Button.CYCLE_ABILITY),

      [Button.CYCLE_FUSION]:   () => this.buttonCycleOption(Button.CYCLE_FUSION),
      [Button.CYCLE_NATURE]:    () => this.buttonCycleOption(Button.CYCLE_NATURE),
      [Button.CYCLE_VARIANT]:    () => this.buttonCycleOption(Button.CYCLE_VARIANT),
      [Button.SPEED_UP]:        () => this.buttonSpeedChange(),
      [Button.SLOW_DOWN]:       () => this.buttonSpeedChange(false),
      [Button.CONSOLE]: () => this.buttonConsole(),
      [Button.VOIDEX]: () => this.buttonVoidex(),
      [Button.TOGGLE_PERMA_BAR]: () => this.buttonTogglePermaBar(),
      [Button.TOGGLE_PLAYER_BAR]: () => this.buttonTogglePlayerBar(),
      [Button.TOGGLE_FOE_BAR]: () => this.buttonToggleFoeBar(),
      [Button.REPLAY]: () => this.buttonReplay(),
      [Button.TOGGLE_SIGNATURE]: () => this.buttonCycleOption(Button.TOGGLE_SIGNATURE),
    };
    return actions;
  }

  getActionsKeyUp(): ActionKeys {
    const actions: ActionKeys = {
      [Button.UP]:              () => undefined,
      [Button.DOWN]:            () => undefined,
      [Button.LEFT]:            () => undefined,
      [Button.RIGHT]:           () => undefined,
      [Button.SUBMIT]:          () => undefined,
      [Button.ACTION]:          () => undefined,
      [Button.CANCEL]:          () => undefined,
      [Button.MENU]:            () => undefined,
      [Button.STATS]:           () => this.buttonStats(false),
      [Button.CYCLE_SHINY]:     () => undefined,
      [Button.CYCLE_FORM]:      () => undefined,
      [Button.CYCLE_GENDER]:    () => undefined,
      [Button.CYCLE_ABILITY]:   () => undefined,
      [Button.CYCLE_FUSION]:   () => undefined,
      [Button.CYCLE_NATURE]:    () => undefined,
      [Button.CYCLE_VARIANT]:               () => this.buttonInfo(false),
      [Button.SPEED_UP]:        () => undefined,
      [Button.SLOW_DOWN]:       () => undefined,
      [Button.CONSOLE]: () => undefined,
      [Button.VOIDEX]: () => undefined,
      [Button.TOGGLE_PERMA_BAR]: () => undefined,
      [Button.TOGGLE_PLAYER_BAR]: () => undefined,
      [Button.TOGGLE_FOE_BAR]: () => undefined,
      [Button.TOGGLE_SIGNATURE]: () => undefined,
    };
    return actions;
  }

  buttonDirection(direction: Button): void {
    const inputSuccess = this.scene.ui.processInput(direction);
    const vibrationLength = 5;
    this.doVibration(inputSuccess, vibrationLength);
  }

  buttonAb(button: Button): void {
    if (!this.scene.ui) return;
    if (button === Button.CANCEL && this.scene.ui.getMode() === Mode.TITLE) {
      this.buttonMenu();
      return;
    }
    this.scene.ui.processInput(button);
  }

  buttonTouch(): void {
    this.scene.ui.processInput(Button.SUBMIT) || this.scene.ui.processInput(Button.ACTION);
  }
  buttonStats(pressed: boolean = true): void {
    if (pressed && ModifierTooltipUtils.handleStatsPressed(this.scene)) {
      return;
    }
    const uiHandler = this.scene.ui?.getHandler();
    const currentMode = this.scene.ui?.getMode();

    if (pressed && currentMode === Mode.SKILL_TREE) {
      this.scene.ui.processInput(Button.STATS);
      return;
    }

    if (pressed && uiHandler instanceof ModifierSelectUiHandler) {
      if (uiHandler.wantsForbiddenFormCycleOnStats()) {
        this.scene.ui.processInput(Button.STATS);
        return;
      }
      if (uiHandler.wantsAltBuildCycleOnStats?.()) {
        this.scene.ui.processInput(Button.STATS);
        return;
      }
      if (uiHandler.wantsStatsForTooltipDetails()) {
        this.scene.ui.processInput(Button.STATS);
        return;
      }
      const currentOption = uiHandler.getCurrentSelectedOption();
      if (currentOption?.modifierTypeOption?.type instanceof AddPokemonModifierType) {
        this.scene.ui.setOverlayMode(Mode.VOIDEX_PRELIST);
        return;
      }
    }

    if (pressed && uiHandler instanceof ChampionSelectUiHandler) {
      this.scene.ui.processInput(Button.STATS);
    }

    for (const t of this.scene.getInfoToggles(true)) {
      t.toggleInfo(pressed);
    }
    if (!(uiHandler instanceof ModifierSelectUiHandler)) {
      for (const p of this.scene.getField().filter(p => p?.isActive(true))) {
        p.toggleStats(pressed);
      }
    }
  }

  buttonGoToFilter(button: Button): void {
    const whitelist = [StarterSelectUiHandler];
    const uiHandler = this.scene.ui?.getHandler();
    const currentMode = this.scene.ui?.getMode();
    if (button === Button.STATS && currentMode === Mode.VOIDEX_PRELIST) {
      this.scene.ui.processInput(button);
      return;
    }
    if (whitelist.some(handler => uiHandler instanceof handler)) {
      this.scene.ui.processInput(button);
    } else {
      this.buttonStats(true);
    }
  }

  buttonInfo(pressed: boolean = true): void {
    if (this.scene.showMovesetFlyout ) {
      for (const p of this.scene.getField().filter(p => p?.isActive(true))) {
        p.toggleFlyout(pressed);
      }
    }

    if (this.scene.showArenaFlyout) {
      this.scene.ui.processInfoButton(pressed);
    }
  }

  buttonMenu(): void {
    if (this.scene.disableMenu) {
      return;
    }

    const currentMode = this.scene.ui?.getMode();

    switch (currentMode) {
    case Mode.MESSAGE:
      if (!(this.scene.ui.getHandler() as MessageUiHandler).pendingPrompt) {
        return;
      }
    case Mode.TITLE:
    case Mode.COMMAND:
    case Mode.MODIFIER_SELECT:
    case Mode.LOOT_REWARD_SELECT:
    case Mode.COLLECTED_TYPE_SELECT:
    case Mode.SHOP_SELECT:
    case Mode.BATTLE_PATH:
    case Mode.SKILL_TREE:
      this.scene.ui.setOverlayMode(Mode.MENU);
      break;
    case Mode.REPLAY_VIEWER:
      try { (this.scene as any).replayPlayer?.stopAuto?.(); } catch {}
      this.scene.ui.setOverlayMode(Mode.MENU);
      break;
    case Mode.STARTER_SELECT:
      this.buttonTouch();
      break;
    case Mode.MENU:
      this.scene.ui.revertMode();
      this.scene.playSound("ui/select");
      break;
    default:
      return;
    }
  }

  buttonVoidex(): void {
    const currentMode = this.scene.ui?.getMode();

    if (currentMode === Mode.VOIDEX_PRELIST || currentMode === Mode.POKEDEX || currentMode === Mode.SKILL_TREE) {
      this.scene.ui.processInput(Button.VOIDEX);
      return;
    }

    if (currentMode === Mode.TITLE || currentMode === Mode.COMMAND || currentMode === Mode.MODIFIER_SELECT || currentMode === Mode.LOOT_REWARD_SELECT || currentMode === Mode.COLLECTED_TYPE_SELECT || currentMode === Mode.SHOP_SELECT || currentMode === Mode.STARTER_SELECT || currentMode === Mode.EGG_STARTER_SELECT || currentMode === Mode.EGG_GACHA) {
      if (currentMode === Mode.STARTER_SELECT || currentMode === Mode.EGG_STARTER_SELECT) {
        this.scene.ui.processInput(Button.VOIDEX);
        return;
      }
      if(currentMode === Mode.MODIFIER_SELECT || currentMode === Mode.LOOT_REWARD_SELECT || currentMode === Mode.COLLECTED_TYPE_SELECT || currentMode === Mode.SHOP_SELECT) {
        const uiHandler = this.scene.ui?.getHandler();
        if (uiHandler instanceof ModifierSelectUiHandler) {
          const currentOption = uiHandler.getCurrentSelectedOption();
          if (currentOption?.modifierTypeOption?.type instanceof AddPokemonModifierType) {
            this.scene.ui.setOverlayMode(Mode.VOIDEX_PRELIST);
            return
          }
        }
      }
      this.scene.ui.setOverlayMode(Mode.VOIDEX_PRELIST);
    }
  }

  buttonTogglePermaBar(): void {
    this.scene.ui.handlePermaBarToggle(this.scene);
  }

  buttonTogglePlayerBar(): void {
    const uiHandler = this.scene.ui?.getHandler();
    if (uiHandler instanceof ChampionSelectUiHandler) {
      this.scene.ui.processInput(Button.TOGGLE_PLAYER_BAR);
      return;
    }
    const currentMode = this.scene.ui?.getMode();
    if (currentMode !== Mode.TITLE && this.scene.currentBattle) {
      this.scene.ui.handlePlayerBarToggle(this.scene);
    }
  }

  buttonToggleFoeBar(): void {
    const currentMode = this.scene.ui?.getMode();
    if (currentMode === Mode.POKEMON_BATTLE_TOOLTIP) {
      this.scene.ui.processInput(Button.TOGGLE_FOE_BAR);
      return;
    }
    if (currentMode === Mode.PARTY) {
      this.scene.ui.processInput(Button.TOGGLE_FOE_BAR);
      return;
    }
    if (currentMode !== Mode.TITLE && this.scene.currentBattle) {
      this.scene.ui.handleFoeBarToggle(this.scene);
    }
  }

  buttonReplay(): void {
    return;
  }

  buttonConsole(): void {
    const currentMode = this.scene.ui?.getMode();

    const bountyModes = [
      Mode.SMITTY_POKEMON_BOUNTY,
      Mode.RIVAL_BOUNTY,
      Mode.QUEST_BOUNTY
    ];

    if (bountyModes.includes(currentMode)) {
      return;
    }

    const consoleUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLIGHT_UNLOCK_QUEST, QuestState.COMPLETED);
    if (!consoleUnlocked && (currentMode === Mode.TITLE || currentMode === Mode.COMMAND)) {
      return;
    }

    switch (currentMode) {
      case Mode.SMITTY_CONSOLE:
        this.scene.ui.revertMode();
        this.scene.playSound("ui/select");
        break;

      case Mode.TITLE:
      case Mode.COMMAND:
        this.scene.ui.setOverlayMode(Mode.SMITTY_CONSOLE, {
          buttonActions: [
            async () => {
            },
            () => {
              this.scene.ui.revertMode();
            }
          ]
        });
        break;

      default:
        return;
    }
  }

  buttonCycleOption(button: Button): void {
    const whitelist = [StarterSelectUiHandler, SettingsUiHandler, RunInfoUiHandler, SettingsDisplayUiHandler, SettingsAudioUiHandler, SettingsGamepadUiHandler, SettingsKeyboardUiHandler, BattlePathUiHandler];
    const uiHandler = this.scene.ui?.getHandler();
    const currentMode = this.scene.ui?.getMode();

    if (button === Button.CYCLE_ABILITY && this.scene.uiEditModeActive && DEBUG_YU_VISUAL_TUNING) {
      this.scene.ui.processInput(button);
      return;
    }

    if (whitelist.some(handler => uiHandler instanceof handler)) {
      this.scene.ui.processInput(button);
    } else if (button === Button.CYCLE_SHINY) {
      switch (currentMode) {
        case Mode.TITLE:
          this.scene.ui.setOverlayMode(Mode.RUN_HISTORY);
          break;
        case Mode.COMMAND:
        case Mode.MODIFIER_SELECT:
        case Mode.LOOT_REWARD_SELECT:
        case Mode.COLLECTED_TYPE_SELECT:
        case Mode.SHOP_SELECT:
          if (this.scene.sessionSlotId < 0) {
            break;
          }
          const slotId = this.scene.sessionSlotId;

          (async () => {
            try {
              const sessionData = await this.scene.gameData.getSession(slotId);
              if (sessionData) {
                const activeRunEntry = {
                  entry: sessionData,
                  isVictory: false,
                  isFavorite: false,
                  isActive: true
                };
                this.scene.ui.setOverlayMode(Mode.RUN_INFO, activeRunEntry, true);
              }
            } catch (error) {
              console.error("Error loading session data:", error);
            }
          })();
          break;
        default:
          this.scene.ui.processInput(button);
          break;
      }
    }
    else if (button === Button.CYCLE_ABILITY) {
      switch (currentMode) {
        case Mode.TITLE:
        case Mode.COMMAND:
          this.scene.ui.setOverlayMode(Mode.EGG_GACHA);
          break;
        case Mode.LOOT_REWARD_SELECT: {
          const handler = this.scene.ui?.getHandler();
          if (handler instanceof ModifierSelectUiHandler) {
            this.scene.ui.processInput(button);
          }
          break;
        }
        case Mode.MODIFIER_SELECT:
        case Mode.SHOP_SELECT: {
          const handler = this.scene.ui?.getHandler();
          if (handler instanceof ModifierSelectUiHandler && handler.wantsCycleAbilityForTooltip()) {
            this.scene.ui.processInput(button);
          } else {
            this.scene.ui.setOverlayMode(Mode.EGG_GACHA);
          }
          break;
        }
        case Mode.COLLECTED_TYPE_SELECT: {
          const handler = this.scene.ui?.getHandler();
          if (handler instanceof ModifierSelectUiHandler && handler.wantsCycleAbilityForTooltip()) {
            this.scene.ui.processInput(button);
          }
          break;
        }
        default:
          this.scene.ui.processInput(button);
          break;
      }
    }
    else if (button === Button.CYCLE_VARIANT) {
      if (this.scene.uiEditModeActive) return;
      const shopUnlocked = this.scene.gameData.checkQuestState(QuestUnlockables.NUZLOCKE_UNLOCK_QUEST, QuestState.COMPLETED);
      if (!shopUnlocked && (currentMode === Mode.TITLE || currentMode === Mode.COMMAND)) {
        return;
      }

      switch (currentMode) {
        case Mode.TITLE:
        case Mode.COMMAND:
          this.scene.ui.setMode(Mode.MESSAGE);
          this.scene.unshiftPhase(new ShopModifierSelectPhase(this.scene));
          const currentPhase = this.scene.getCurrentPhase();
          if (currentPhase) {
            this.scene.unshiftPhase(currentPhase);
          }
          this.scene.shiftPhase();
          break;
        default:
          this.scene.ui.processInput(button);
          break;
      }
    } else if (button === Button.CYCLE_FORM) {
      if (currentMode === Mode.TITLE || currentMode === Mode.COMMAND) {
        this.scene.ui.handleSaveButtonClick(this.scene as BattleScene);
      } else {
        this.scene.ui.processInput(button);
      }
    } else if (button === Button.CYCLE_GENDER) {
      this.scene.ui.processInput(button);
    } else if (button === Button.CYCLE_NATURE) {
      if((currentMode === Mode.MODIFIER_SELECT || currentMode === Mode.LOOT_REWARD_SELECT || currentMode === Mode.COLLECTED_TYPE_SELECT || currentMode === Mode.SHOP_SELECT || currentMode === Mode.COMMAND) && this.scene.gameMode.isChaosMode) {
          this.scene.ui.setOverlayMode(Mode.BATTLE_PATH, { viewOnly: true });
      }
      else if (currentMode === Mode.TITLE) {
        activateSmitomTalk(this.scene);
      } else {
        this.scene.ui.processInput(button);
      }
    } else {
      this.scene.ui.processInput(button);
    }
  }

  buttonSpeedChange(up = true): void {
    const settingGameSpeed = settingIndex(SettingKeys.Game_Speed);
    if (settingGameSpeed < 0) {
      return;
    }

    const options = Setting[settingGameSpeed].options;
    const currentIdx = options.findIndex((item) => item.label === `${this.scene.gameSpeed}x`);
    if (currentIdx < 0) {
      return;
    }

    const nextIdx = up
      ? Math.min(currentIdx + 1, options.length - 1)
      : Math.max(currentIdx - 1, 0);

    if (nextIdx === currentIdx) {
      return;
    }

    this.scene.gameData.saveSetting(SettingKeys.Game_Speed, nextIdx);
    if (this.scene.ui?.getMode() === Mode.SETTINGS) {
      (this.scene.ui.getHandler() as SettingsUiHandler).show([]);
    }
  }

  private launchModifierSelectDebug(): void {
    this.scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE);

    const party = this.scene.getParty();
    if (party.length === 0) {
      const pool = [...DUELMON_SPECIES];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const count = Math.min(6, pool.length);
      for (let i = 0; i < count; i++) {
        const pokemon = this.scene.addPlayerPokemon(
          getPokemonSpecies(pool[i]), 5 + Math.floor(Math.random() * 96),
          undefined, undefined, undefined, Math.random() < 0.15
        );
        pokemon.setVisible(false);
        party.push(pokemon);
      }
    }

    for (const p of party) {
      if (p.isFusion()) {
        p.clearFusionSpecies();
      }
      (p as any).isSignature = false;
    }
    while (party.filter(p => !p.isFusion()).length < 4) {
      const pool = [...DUELMON_SPECIES];
      const species = pool[Math.floor(Math.random() * pool.length)];
      const pokemon = this.scene.addPlayerPokemon(
        getPokemonSpecies(species), 50
      );
      (pokemon as any).isSignature = false;
      pokemon.setVisible(false);
      party.push(pokemon);
    }

    if (!this.scene.currentBattle) {
      this.scene.currentBattle = new Battle(
        this.scene.gameMode, 499, BattleType.WILD, undefined, false, this.scene
      );
    }

    this.scene.money = 999999;
    this.scene.updateMoneyText();

    let glitch = this.scene.findModifier(m => m instanceof GlitchPieceModifier) as GlitchPieceModifier | null;
    if (!glitch) {
      const glitchType = new ModifierType("Glitch Piece", "glitchPiece", (type) => new GlitchPieceModifier(type, 5), "glitch");
      glitch = new GlitchPieceModifier(glitchType, 5);
      this.scene.addModifier(glitch, false, false);
    } else if (glitch.stackCount < 5) {
      glitch.stackCount = 5;
      this.scene.updateModifiers(true);
    }

    regenerateModifierPoolThresholds(party, ModifierPoolType.PLAYER, 0);
    const typeOptions = getPlayerModifierTypeOptions(4, party, undefined, false, PathNodeTypeFilter.NONE);

    const debugConfig = {
      title: i18next.t("modifierSelectUiHandler:lootRewardsTitle", { defaultValue: "LOOT REWARDS" }),
      subtitle: i18next.t("modifierSelectUiHandler:lootRewardsSubtitle", { defaultValue: "Choose your loot wisely..." }),
    };

    const launchWithOptions = (options: ModifierTypeOption[], rerollCount: number, forceTransition: boolean = false) => {
      const cost = 150 * Math.pow(2, rerollCount);
      const setModeFn = forceTransition
        ? this.scene.ui.setModeForceTransition.bind(this.scene.ui)
        : this.scene.ui.setMode.bind(this.scene.ui);
      setModeFn(Mode.LOOT_REWARD_SELECT, true, options, (rowCursor: number, _cursor: number) => {
        if (rowCursor === 0) {
          this.scene.reroll = true;
          regenerateModifierPoolThresholds(party, ModifierPoolType.PLAYER, 0);
          const newOptions = getPlayerModifierTypeOptions(4, party, undefined, false, PathNodeTypeFilter.NONE);
          launchWithOptions(newOptions, rerollCount + 1, true);
          return true;
        }
        this.scene.reroll = false;
        this.scene.ui.setMode(Mode.TITLE);
        return true;
      }, { rerollCost: cost, permaRerollCost: 5000 }, false, debugConfig);
    };

    launchWithOptions(typeOptions, 0);
  }

  private launchCollectedTypeShopDebug(): void {
    this.scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE);

    const party = this.scene.getParty();
    if (party.length === 0) {
      const pool = [...DUELMON_SPECIES];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const count = Math.min(6, pool.length);
      for (let i = 0; i < count; i++) {
        const pokemon = this.scene.addPlayerPokemon(
          getPokemonSpecies(pool[i]), 5 + Math.floor(Math.random() * 96),
          undefined, undefined, undefined, Math.random() < 0.15
        );
        pokemon.setVisible(false);
        party.push(pokemon);
      }
    }

    if (!this.scene.currentBattle) {
      this.scene.currentBattle = new Battle(
        this.scene.gameMode, 25, BattleType.WILD, undefined, false, this.scene
      );
    }

    this.scene.money = 999999;
    this.scene.updateMoneyText();

    for (const pokemon of party) {
      const existingMods = this.scene.findModifiers(m =>
        m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id
      );
      if (existingMods.length === 0) {
        const essenceRecord: Record<number, number> = {
          [Type.FIRE]: 8,
          [Type.WATER]: 8,
          [Type.GRASS]: 8,
          [Type.ELECTRIC]: 8,
          [Type.PSYCHIC]: 8,
          [Type.DARK]: 5,
          [Type.DRAGON]: 5,
        };
        const modType = new CollectedTypeModifierType(Type.FIRE);
        const mod = new CollectedTypeModifier(modType, pokemon.id, essenceRecord);
        this.scene.addModifier(mod, true, false, false, true);
      }
    }
    this.scene.updateModifiers(true, true);

    regenerateModifierPoolThresholds(party, ModifierPoolType.COLLECTOR, 0);
    let typeOptions = getPlayerModifierTypeOptions(8, party, undefined, false, PathNodeTypeFilter.NONE, ModifierPoolType.COLLECTOR);

    const tierCosts: Record<number, number> = { 0: 2, 1: 4, 2: 6, 3: 10, 4: 25 };
    typeOptions = typeOptions.map(o =>
      new ModifierTypeOption(o.type, o.upgradeCount, tierCosts[o.type?.tier ?? 0] || 8)
    );

    const launchWithOptions = (options: ModifierTypeOption[], rerollCount: number, forceTransition: boolean = false) => {
      const rerollCost = 150 * Math.pow(2, rerollCount);
      const setModeFn = forceTransition
        ? this.scene.ui.setModeForceTransition.bind(this.scene.ui)
        : this.scene.ui.setMode.bind(this.scene.ui);

      setModeFn(Mode.COLLECTED_TYPE_SELECT, true, options, (rowCursor: number, _cursor: number) => {
        if (rowCursor === 0) {
          this.scene.reroll = true;
          regenerateModifierPoolThresholds(party, ModifierPoolType.COLLECTOR, 0);
          let newOptions = getPlayerModifierTypeOptions(8, party, undefined, false, PathNodeTypeFilter.NONE, ModifierPoolType.COLLECTOR);
          newOptions = newOptions.map(o =>
            new ModifierTypeOption(o.type, o.upgradeCount, tierCosts[o.type?.tier ?? 0] || 8)
          );
          launchWithOptions(newOptions, rerollCount + 1, true);
          return true;
        }
        this.scene.reroll = false;
        this.scene.ui.setMode(Mode.TITLE);
        return true;
      }, { rerollCost, permaRerollCost: 5000 }, false);
    };

    launchWithOptions(typeOptions, 0);
  }

  private launchRankUpLootDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();

    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE);

    const party = scene.getParty();
    const isRankUpCapable = (p: PlayerPokemon) =>
      isDuelmonSpecies(p.species.speciesId) && !!getDuelmonRankUpDefinition(p.species.speciesId);
    if (!party.some(p => isRankUpCapable(p as PlayerPokemon))) {
      while (party.length > 0) party.pop()?.destroy();
      const pool = [...DUELMON_SPECIES];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const count = Math.min(6, pool.length);
      for (let i = 0; i < count; i++) {
        const pokemon = scene.addPlayerPokemon(
          getPokemonSpecies(pool[i]), 5 + Math.floor(Math.random() * 96),
          undefined, undefined, undefined, Math.random() < 0.15
        );
        pokemon.setVisible(false);
        party.push(pokemon);
      }
    }

    if (!scene.currentBattle) {
      scene.currentBattle = new Battle(
        scene.gameMode, 25, BattleType.WILD, undefined, false, scene
      );
    }

    scene.money = 999999;
    scene.updateMoneyText();
    scene.modifierTooltipsEnabled = true;

    const pokemon = (party.find(p => isRankUpCapable(p as PlayerPokemon)) ?? party[0]) as PlayerPokemon;

    const testRank = Math.floor(Math.random() * 10) + 1;
    pokemon.rankUpCount = testRank - 1;
    if (testRank > 1) {
      pokemon.embracePaletteRank = testRank - 1;
    }

    Promise.all(party.map(p => p.loadAssets())).then(() => {
      scene.ui.setMode(Mode.MESSAGE);
      scene.unshiftPhase(new RankUpPhase(scene, pokemon, pokemon.level - 1));
      scene.pushPhase(new TitlePhase(scene));
      scene.shiftPhase();
    }).catch(err => console.error("[DEBUG] rank-up loot launcher failed", err));
  }

  private getAbilityInfoForForm(form: any, abilityIndex: number): { name: string; description: string } {
    const abilityCount = form.getAbilityCount?.() ?? 1;
    const clamped = abilityIndex >= abilityCount ? Math.max(abilityCount - 1, 0) : abilityIndex;
    const abilityId = form.getAbility?.(clamped) ?? 0;
    const ability = allAbilities[abilityId];
    return {
      name: ability?.name ?? "None",
      description: ability?.description ?? "",
    };
  }

  private buildRankUpModifierTypeOption(
    id: string,
    name: string,
    tooltipTitle: string,
    description: string,
    iconAtlasKey: string,
    iconFrame: string | number,
    tier: ModifierTier
  ): ModifierTypeOption {
    const modType = new ModifierType(null, null, null, "rankup");
    modType.id = `rankup_${id}`;
    modType.setTier(tier);
    (modType as any)._rankUpName = name;
    (modType as any)._rankUpDescription = description;
    (modType as any)._rankUpIconAtlasKey = iconAtlasKey;
    (modType as any)._rankUpIconFrame = iconFrame;

    Object.defineProperty(modType, 'name', {
      get() { return this._rankUpName; },
      configurable: true,
    });

    const origGetDescription = modType.getDescription.bind(modType);
    modType.getDescription = function(_scene: any) {
      return this._rankUpDescription ?? origGetDescription(_scene);
    };

    return new ModifierTypeOption(modType, 0, 0);
  }

  private launchTutorialFlowDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.ui.fadeIn(250);

    if (scene.gameData.gender === PlayerGender.UNSET) {
      scene.gameData.gender = PlayerGender.MALE;
    }

    TitlePhase.debugTutorialFlowActive = true;
    TitlePhase.tutorialBattleAttempted = false;

    const def = STORY_CUTSCENES.title_intro_a;

    scene.pushPhase(new TitlePhase(scene));
    scene.unshiftPhase(new SlideshowCutscenePhase(scene, {
      slides: def.slides,
      bgmKey: def.bgmKey,
      canSkip: false,
      pauseAfterText: 1000,
      defaultCharSound: "ui/select",
      resumeBgmOnEnd: false,
      onComplete: () => {
        TitlePhase.tutorialBattlePending = true;
        TitlePhase.titleStoryCutsceneTriggered = false;
      }
    }));

    scene.shiftPhase();
  }

  private launchPegasusBossDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.ui.fadeIn(250);

    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE_FTL);
    scene.sessionSlotId = -1;
    scene.skillTreeEnabledForRun = false;

    if (scene.gameData.gender === PlayerGender.UNSET) {
      scene.gameData.gender = PlayerGender.MALE;
    }

    const party = scene.getParty();
    while (party.length > 0) party.pop()?.destroy();

    scene.currentBattle = null as any;
    scene.newArena(Biome.END);
    scene.arena.init();
    scene.money = 0;

    const trainerData = new TrainerData({ trainerType: TrainerType.PEGASUS, variant: TrainerVariant.DEFAULT });
    scene.newBattle(50, BattleType.TRAINER, trainerData);

    const battle = scene.currentBattle!;
    battle.started = false;

    const maxFoeLevel = Math.max(...(battle.enemyLevels ?? [38]));
    const playerLevel = maxFoeLevel + 10;

    for (let i = 0; i < 6; i++) {
      const species = scene.randomSpecies(50, playerLevel);
      const pokemon = scene.addPlayerPokemon(species, playerLevel);
      pokemon.setVisible(false);
      party.push(pokemon);
    }

    scene.pegasusDebugBattleActive = true;

    Promise.all(party.map(p => p.loadAssets())).then(() => {
      scene.unshiftPhase(new EncounterPhase(scene, false));
      scene.shiftPhase();
    });
  }

  private launchSmittyBossDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.ui.fadeIn(250);

    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE_FTL);
    scene.sessionSlotId = -1;
    scene.skillTreeEnabledForRun = false;

    if (scene.gameData.gender === PlayerGender.UNSET) {
      scene.gameData.gender = PlayerGender.MALE;
    }

    const party = scene.getParty();
    while (party.length > 0) party.pop()?.destroy();

    scene.currentBattle = null as any;
    scene.newArena(Biome.END);
    scene.arena.init();
    scene.money = 0;

    const smittyOffset = hashCode(randomString(24));
    const smittyConfig = createSmittyBattle(scene, smittyOffset, true);
    scene.gameMode.setChaosBattleConfig(smittyConfig);
    scene.newBattle(50, BattleType.TRAINER);

    const battle = scene.currentBattle!;
    battle.started = false;

    const maxFoeLevel = Math.max(...(battle.enemyLevels ?? [38]));
    const playerLevel = maxFoeLevel + 10;

    for (let i = 0; i < 6; i++) {
      const species = scene.randomSpecies(50, playerLevel);
      const pokemon = scene.addPlayerPokemon(species, playerLevel);
      pokemon.setVisible(false);
      party.push(pokemon);
    }

    scene.smittyDebugBattleActive = true;

    Promise.all(party.map(p => p.loadAssets())).then(() => {
      scene.unshiftPhase(new EncounterPhase(scene, false));
      scene.shiftPhase();
    });
  }

  private launchWave35SmitomTipDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.ui.fadeIn(250);

    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE);
    scene.sessionSlotId = -1;
    scene.skillTreeEnabledForRun = false;

    if (scene.gameData.gender === PlayerGender.UNSET) {
      scene.gameData.gender = PlayerGender.MALE;
    }

    const party = scene.getParty() as any[];
    while (party.length > 0) party.pop()?.destroy();

    scene.currentBattle = null as any;
    scene.newArena(Biome.TOWN);
    scene.arena.init();
    scene.money = 5000;

    delete scene.gameData.smitomTutorialFlags["wave35_stat_switchers"];
    delete scene.gameData.smitomTutorialFlags["wave35_move_upgrades"];
    delete scene.gameData.smitomTutorialFlags["wave35_release_items"];
    localStorage.removeItem("wave35_stat_switchers_unlocked");
    localStorage.removeItem("wave35_move_upgrades_unlocked");
    localStorage.removeItem("wave35_release_items_unlocked");

    scene.disableStatSwitchers = true;
    scene.disableMoveUpgrades = true;
    scene.disableReleaseItems = true;
    scene.statSwitchersEnabledForRun = false;
    scene.moveUpgradesEnabledForRun = false;
    scene.releaseItemsEnabledForRun = false;
    scene.wave35UnlockedThisRun = false;

    scene.newBattle(35, BattleType.WILD);

    const battle = scene.currentBattle!;
    battle.started = false;

    const playerLevel = 35;

    for (let i = 0; i < 6; i++) {
      const species = scene.randomSpecies(35, playerLevel);
      const pokemon = scene.addPlayerPokemon(species, playerLevel);
      pokemon.setVisible(false);
      party.push(pokemon);
    }

    scene.wave35SmitomDebugActive = true;

    Promise.all(party.map(p => p.loadAssets())).then(() => {
      scene.unshiftPhase(new EncounterPhase(scene, false));
      scene.shiftPhase();
    });
  }

  private launchWave100Level1Debug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.ui.fadeIn(250);

    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE_FTL);
    scene.sessionSlotId = -1;
    scene.skillTreeEnabledForRun = false;
    scene.moveUpgradesEnabledForRun = false;

    if (scene.gameData.gender === PlayerGender.UNSET) {
      scene.gameData.gender = PlayerGender.MALE;
    }

    if (typeof scene.resetRunEndSummaryRunData === "function") {
      scene.resetRunEndSummaryRunData();
    }

    const party = scene.getParty() as any[];
    while (party.length > 0) party.pop()?.destroy();

    scene.currentBattle = null as any;
    scene.setSeed(randomString(24));
    scene.resetSeed();
    scene.newArena(Biome.END);
    scene.arena.init();
    scene.money = 50000;

    const rivalConfig = getDynamicRival(6, scene.gameData, scene);
    const rivalBattleConfig = new FixedBattleConfig()
      .setBattleType(BattleType.TRAINER)
      .setGetTrainerFunc(s => new Trainer(
        s,
        TrainerType.DYNAMIC_RIVAL,
        TrainerVariant.DEFAULT,
        undefined, undefined, undefined,
        rivalConfig,
        6,
        false
      ));

    scene.gameMode.setChaosBattleConfig(rivalBattleConfig);
    scene.rivalWave = 100;

    scene.newBattle(100, BattleType.TRAINER);

    const battle = scene.currentBattle!;
    battle.started = false;

    const playerLevel = 100;

    for (let i = 0; i < 6; i++) {
      const species = scene.randomSpecies(100, playerLevel);
      const pokemon = scene.addPlayerPokemon(species, playerLevel);
      pokemon.setVisible(false);
      party.push(pokemon);
    }

    if (Overrides.DEBUG_EMULATE_RANDOM_PARTY_COMBOS) {
      const COMBO_OPTIONS = ["shiny", "fusion", "variant", "rank"];
      const allCombos: string[][] = [];
      for (let mask = 1; mask <= 15; mask++) {
        const combo: string[] = [];
        for (let bit = 0; bit < 4; bit++) {
          if (mask & (1 << bit)) combo.push(COMBO_OPTIONS[bit]);
        }
        allCombos.push(combo);
      }

      const shuffled = [...allCombos];
      scene.executeWithSeedOffset(() => {
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = randSeedInt(i + 1);
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
      }, (scene.seed as any) << 8, scene.waveSeed);

      party.forEach((pokemon, i) => {
        pokemon.shiny = false;
        pokemon.variant = 0;
        pokemon.fusionSpecies = null;
        pokemon.rankUpCount = 0;
        pokemon.embracePaletteRank = undefined;

        const combo = shuffled[i % shuffled.length];

        if (combo.includes("shiny")) {
          pokemon.shiny = true;
          pokemon.variant = 0;
          pokemon.initShinySparkle();
        }
        if (combo.includes("fusion") && Overrides.DEBUG_EMULATE_FUSION) {
          pokemon.generateFusionViaSpeciesID(Overrides.DEBUG_EMULATE_FUSION as Species, true);
        }
        if (combo.includes("variant") && pokemon.shiny) {
          pokemon.variant = Math.max(1, pokemon.generateVariant());
        }
        if (combo.includes("rank") && Overrides.DEBUG_EMULATE_RANK > 0) {
          pokemon.rankUpCount = Overrides.DEBUG_EMULATE_RANK - 1;
          if (pokemon.rankUpCount > 0) {
            pokemon.embracePaletteRank = pokemon.rankUpCount;
          }
        }

        pokemon.luck = (pokemon.shiny ? pokemon.variant + 1 : 0) + (pokemon.fusionShiny ? pokemon.fusionVariant + 1 : 0);
        pokemon.fusionLuck = pokemon.luck;
        pokemon.generateName();
      });
    }

    Promise.all(party.map(p => p.loadAssets())).then(() => {
      scene.unshiftPhase(new EncounterPhase(scene, false));
      scene.shiftPhase();
    });
  }
  private formEvoDebugBusy: boolean = false;
  private formEvoDebugChaining: boolean = false;
  private formEvoDebugChainTimer: Phaser.Time.TimerEvent | null = null;
  private reshapeDebugBusy: boolean = false;
  private reshapeDebugActive: boolean = false;

  private isTypingInDomField(): boolean {
    const el = document.activeElement as HTMLElement | null;
    const tag = el?.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || !!(el as any)?.isContentEditable;
  }
  private launchDuelmonWildGauntletDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.ui.fadeIn(250);
    scene.debugDuelmonWild = true;
    scene.debugGauntletShownPlayerDuelmons = new Set();
    scene.debugGauntletShownEnemyDuelmons = new Set();
    scene.debugGauntletAutoCycle = true;
    scene.debugGauntletAutoCycleTimer?.destroy();
    scene.debugGauntletAutoCycleTimer = null;
    scene.debugGauntletCancelAutoCycle = null;

    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE_FTL);
    scene.sessionSlotId = -1;
    scene.skillTreeEnabledForRun = false;
    scene.moveUpgradesEnabledForRun = false;
    scene.dynamicMode = { noInitialSwitch: true };

    if (scene.gameData.gender === PlayerGender.UNSET) {
      scene.gameData.gender = PlayerGender.MALE;
    }
    if (typeof scene.resetRunEndSummaryRunData === "function") {
      scene.resetRunEndSummaryRunData();
    }

    const party = scene.getParty() as any[];
    while (party.length > 0) party.pop()?.destroy();

    scene.currentBattle = null as any;
    scene.setSeed(randomString(24));
    scene.resetSeed();
    const biomeValues = getEnumValues(Biome).filter((b: Biome) => b !== Biome.TOWN && b !== Biome.END && b < 40);
    scene.newArena(biomeValues[randSeedInt(biomeValues.length)]);
    scene.arena.init();
    scene.money = 50000;

    scene.newBattle(1, BattleType.WILD);
    scene.currentBattle!.started = false;
    scene.currentBattle!.enemyLevels = [250];

    scene.debugGauntletEnemyIndex = 0;
    scene.debugGauntletPlayerIndex = 0;

    scene.unshiftPhase(new EncounterPhase(scene, false));
    scene.shiftPhase();
  }

  private launchReshapeDebug(): void {
    const scene = this.scene;
    this.reshapeDebugBusy = true;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.setSeed(randomString(24));
    scene.resetSeed();
    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE);
    if (!scene.currentBattle) {
      scene.currentBattle = new Battle(scene.gameMode, 25, BattleType.WILD, undefined, false, scene);
    }

    const party = scene.getParty() as any[];
    while (party.length > 0) party.pop()?.destroy();

    const sorted = getReshapeDebugDuelmonSpecies();
    const pool = sorted.filter(sid => !!getDuelmonRankUpDefinition(sid));
    if (!pool.length) {
      this.reshapeDebugBusy = false;
      this.stopReshapeDebug();
      return;
    }

    const LOAD_BATCH = 8;

    type PendingEntry = {
      pokemon: PlayerPokemon;
      source: Species;
      isLast: boolean;
    };

    const entries: PendingEntry[] = [];
    for (let i = 0; i < pool.length; i++) {
      const source = pool[i];
      const pokemon = scene.addPlayerPokemon(getPokemonSpecies(source), 50);
      if (pokemon.isFusion()) {
        pokemon.clearFusionSpecies();
      }
      pokemon.setVisible(false);
      pokemon.rankUpCount++;
      entries.push({ pokemon, source, isLast: i === pool.length - 1 });
    }

    const loadInBatches = async (): Promise<RankUpTransformPhase[]> => {
      const phases: RankUpTransformPhase[] = [];
      for (let start = 0; start < entries.length; start += LOAD_BATCH) {
        if (!this.reshapeDebugActive) return phases;
        const chunk = entries.slice(start, start + LOAD_BATCH);
        const results = await Promise.all(
          chunk.map(entry => {
            const targetSpeciesId = this.pickReshapeTargetEnhanced(entry.source);
            const targetForm = getPokemonSpeciesForm(targetSpeciesId, 0);
            const targetBaseStats = [...targetForm.baseStats];
            const deltaBst = 75;
            const afterBaseStats = calculateStatsToTargetBstWithSwapping(
              targetBaseStats,
              [Stat.ATK, Stat.SPATK],
              targetBaseStats.reduce((s, v) => s + v, 0) + deltaBst
            );

            return entry.pokemon.loadAssets().then(() => {
              return new RankUpTransformPhase(
                scene, entry.pokemon, targetSpeciesId, afterBaseStats,
                undefined,
                true,
                !entry.isLast
              );
            }).catch(() => null);
          })
        );
        for (const r of results) {
          if (r) phases.push(r);
        }
      }
      return phases;
    };

    loadInBatches().then(valid => {
      if (!this.reshapeDebugActive) return;
      if (!valid.length) {
        this.reshapeDebugBusy = false;
        this.stopReshapeDebug();
        return;
      }
      for (let i = 0; i < valid.length; i++) {
        scene.unshiftPhase(valid[i]);
      }
      scene.ui.setMode(Mode.MESSAGE);
      scene.shiftPhase();
      this.reshapeDebugBusy = false;
    });
  }

  private stopReshapeDebug(): void {
    this.reshapeDebugActive = false;
    if (this.scene.ui?.getMode() !== Mode.TITLE) {
      this.scene.clearAllPhaseQueues();
      this.scene.pushPhase(new TitlePhase(this.scene, false, true));
      this.scene.shiftPhase();
    }
  }

  private pickReshapeTargetEnhanced(sourceId: Species): Species {
    const currentDef = getDuelmonRankUpDefinition(sourceId);
    const tagsSelf = currentDef?.tagsSelf ?? [];
    const tagsBias = currentDef?.tagsEvoBias ?? [];

    const rolledSet = new Set<string>([...tagsSelf, ...tagsBias]);
    const sourceBiasSet = new Set<string>(tagsBias);

    const score = (sid: Species): number => {
      const def = getDuelmonRankUpDefinition(sid);
      if (!def) return -1;
      let s = 0;
      const counted = new Set<string>();
      for (const t of def.tagsSelf) {
        if (!rolledSet.has(t)) continue;
        s += sourceBiasSet.has(t) ? 3 : 1;
        counted.add(t);
      }
      for (const t of def.tagsEvoBias) {
        if (counted.has(t)) continue;
        if (sourceBiasSet.has(t)) s += 2;
      }
      return s;
    };

    const pool = DUELMON_SPECIES.filter(sid => sid !== sourceId);
    let bestScore = -1;
    let best: Species[] = [];
    for (const sid of pool) {
      const s = score(sid);
      if (s > bestScore) {
        bestScore = s;
        best = [sid];
      } else if (s === bestScore) {
        best.push(sid);
      }
    }
    const pickPool = best.length ? best : pool;
    return pickPool[randSeedInt(pickPool.length)];
  }
  private getForbiddenFormCapableSpecies(): Species[] {
    return Object.keys(pokemonFormChanges)
      .map(k => parseInt(k, 10) as Species)
      .filter(id => !isNaN(id) && id !== Species.NONE)
      .filter(id => {
        const species = getPokemonSpecies(id);
        if (!species?.forms?.length) return false;
        return (pokemonFormChanges[id] ?? []).some(fc =>
          (isGlitchFormKey(fc.formKey) || isSmittyFormKey(fc.formKey))
          && species.forms.some(f => f.formKey === fc.formKey));
      });
  }
  private getForbiddenFormChangesFor(pokemon: Pokemon): SpeciesFormChange[] {
    const currentKey = pokemon.getFormKey?.() ?? "";
    const own = (pokemonFormChanges[pokemon.species.speciesId] ?? [])
      .filter(fc => isGlitchFormKey(fc.formKey) || isSmittyFormKey(fc.formKey))
      .filter(fc => fc.formKey !== currentKey)
      .filter(fc => pokemon.species.forms.some(f => f.formKey === fc.formKey));

    return [...new Map(own.map(fc => [fc.formKey, fc])).values()];
  }
  private startFormEvoDebugChain(): void {
    this.stopFormEvoDebugChainTimer();
    this.formEvoDebugChainTimer = this.scene.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        if (!this.formEvoDebugChaining) {
          this.stopFormEvoDebugChainTimer();
          return;
        }
        if (this.formEvoDebugBusy) return;
        if (this.scene.ui?.getMode() !== Mode.TITLE) return;
        this.launchRandomFormEvolutionDebug();
      },
    });
  }

  private stopFormEvoDebugChainTimer(): void {
    if (this.formEvoDebugChainTimer) {
      this.formEvoDebugChainTimer.remove();
      this.formEvoDebugChainTimer = null;
    }
  }

  private stopFormEvoDebugChain(): void {
    this.formEvoDebugChaining = false;
    this.stopFormEvoDebugChainTimer();
    console.log("[DEBUG] form evolution chain stopped");
  }
  private launchRandomFormEvolutionDebug(): void {
    const scene = this.scene;
    const party = scene.getParty();

    this.formEvoDebugBusy = true;
    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.setSeed(randomString(24));
    scene.resetSeed();
    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE);
    if (!scene.currentBattle) {
      scene.currentBattle = new Battle(scene.gameMode, 25, BattleType.WILD, undefined, false, scene);
    }

    while (party.length > 0) party.pop()?.destroy();

    const pool = this.getForbiddenFormCapableSpecies();
    if (!pool.length) {
      console.error("[DEBUG] no species with a usable glitch/smitty form");
      this.formEvoDebugBusy = false;
      this.stopFormEvoDebugChain();
      return;
    }
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    for (let i = 0; i < Math.min(6, pool.length); i++) {
      const pokemon = scene.addPlayerPokemon(getPokemonSpecies(pool[i]), 50);
      if (pokemon.isFusion()) {
        pokemon.clearFusionSpecies();
      }
      pokemon.setVisible(false);
      party.push(pokemon);
    }

    Promise.all(party.map(p => p.loadAssets()))
      .then(() => this.triggerRandomForbiddenFormDebug())
      .catch(err => {
        console.error("[DEBUG] form evolution launcher failed", err);
        this.formEvoDebugBusy = false;
        this.stopFormEvoDebugChain();
      });
  }
  private triggerRandomForbiddenFormDebug(allowUniversal: boolean = true): void {
    const scene = this.scene;
    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    const candidates = scene.getParty().filter(p => this.getForbiddenFormChangesFor(p).length > 0);
    if (!candidates.length) {
      console.error("[DEBUG] no party member has an unused glitch/smitty form");
      this.formEvoDebugBusy = false;
      this.stopFormEvoDebugChain();
      return;
    }
    const pokemon = candidates[Math.floor(Math.random() * candidates.length)];
    const uniqueOwn = this.getForbiddenFormChangesFor(pokemon);
    const universal = pokemonFormChanges[Species.NONE] ?? [];

    scene.ui.setMode(Mode.MESSAGE);
    if (allowUniversal && universal.length && Math.random() < 0.3) {
      const formChange = universal[Math.floor(Math.random() * universal.length)];
      const trigger = formChange.findTrigger(SmittyFormTrigger) as SmittyFormTrigger;
      if (trigger) {
        this.applyUniversalSmittyDebug(formChange, trigger);
        return;
      }
    }

    scene.triggerPokemonFormChange(pokemon, uniqueOwn[Math.floor(Math.random() * uniqueOwn.length)], false, false);
    scene.pushPhase(new TitlePhase(scene));
    scene.shiftPhase();
    this.formEvoDebugBusy = false;
  }
  private applyUniversalSmittyDebug(formChange: SpeciesFormChange, trigger: SmittyFormTrigger): void {
    const scene = this.scene;
    const party = scene.getParty();
    const stale = party.find(p => p.species.speciesId === Species.PIKACHU) as PlayerPokemon | undefined;
    if (stale) {
      party.splice(party.indexOf(stale), 1);
      stale.destroy();
    }
    if (party.length >= 6) {
      party.pop()?.destroy();
    }
    const base = scene.addPlayerPokemon(getPokemonSpecies(Species.PIKACHU), 50);
    if (base.isFusion()) {
      base.clearFusionSpecies();
    }
    base.setVisible(false);
    party.unshift(base);
    base.loadAssets().then(() => {
      applyUniversalSmittyForm(trigger.name, base);
      base.generateName();
      return base.loadAssets();
    }).then(() => {
      const grafted = base.species.forms[base.species.forms.length - 1];
      const spriteKey = `pkmn__${grafted.getSpriteId(false, undefined, false, 0)}`;
      if (!scene.textures.exists(spriteKey) || scene.textures.get(spriteKey).key === "__MISSING") {
        console.warn(`[DEBUG] universal smitty sprite missing for ${trigger.name} (${spriteKey}); falling back to an own-species form`);
        this.triggerRandomForbiddenFormDebug(false);
        return;
      }

      scene.triggerPokemonFormChange(base, formChange, false, false);
      scene.pushPhase(new TitlePhase(scene));
      scene.shiftPhase();
      this.formEvoDebugBusy = false;
    }).catch(err => {
      console.error("[DEBUG] universal smitty debug failed", err);
      this.formEvoDebugBusy = false;
      this.stopFormEvoDebugChain();
    });
  }

  private launchShinyPowerDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();

    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE);
    scene.setSeed(randomString(24));
    scene.resetSeed();
    scene.money = 999999;

    scene.disableShinyPower = false;

    const party = scene.getParty();
    while (party.length > 0) party.pop()?.destroy();

    if (!scene.currentBattle) {
      scene.currentBattle = new Battle(
        scene.gameMode, 25, BattleType.WILD, undefined, false, scene
      );
    }
    const shinyPool = allSpecies.filter(s => s.isCatchable() && s.generation !== 20);
    for (let i = 0; i < 6 && shinyPool.length; i++) {
      const species = shinyPool[Math.floor(Math.random() * shinyPool.length)];
      const pokemon = scene.addPlayerPokemon(
        species, 50, undefined, undefined, undefined,
        true, Math.floor(Math.random() * 3) as Variant
      );

      if (pokemon.isFusion()) {
        pokemon.clearFusionSpecies();
      }
      pokemon.setVisible(false);
      party.push(pokemon);
    }
    Promise.all(party.map(p => p.loadAssets())).then(() => {
      scene.ui.setMode(Mode.MESSAGE);
      scene.unshiftPhase(new ShinyPowerPhase(scene, true));
      scene.pushPhase(new TitlePhase(scene));
      scene.shiftPhase();
    }).catch(err => console.error("[DEBUG] shiny power launcher failed", err));
  }

  private launchYuMoveDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();

    scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE);
    scene.setSeed(randomString(24));
    scene.resetSeed();
    scene.money = 999999;

    const party = scene.getParty();
    if (party.length === 0) {
      const pool = [...DUELMON_SPECIES];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const count = Math.min(6, pool.length);
      for (let i = 0; i < count; i++) {
        const pokemon = scene.addPlayerPokemon(
          getPokemonSpecies(pool[i]),
          5 + Math.floor(Math.random() * 96),
          undefined, undefined, undefined,
          Math.random() < 0.15
        );
        pokemon.setVisible(false);
        party.push(pokemon);
      }
    }

    if (!scene.currentBattle) {
      scene.currentBattle = new Battle(
        scene.gameMode, 25, BattleType.WILD, undefined, false, scene
      );
    }

    const target = party.find(p => isDuelmonSpecies(p.species.speciesId)) ?? party[0];
    const choices = pickThreeYuMovesWithFallback(scene, target);

    if (choices.length === 0) {
      scene.ui.setMode(Mode.TITLE);
      return;
    }

    scene.ui.setMode(Mode.MESSAGE);
    scene.unshiftPhase(new YuMovePhase(scene, target as any, choices, () => {
      scene.ui.setMode(Mode.TITLE);
    }, false));
    scene.shiftPhase();
  }

  private launchRivalDefeatCutsceneDebug(): void {
    const scene = this.scene;

    scene.clearAllPhaseQueues();
    scene.ui.resetModeChain();
    scene.ui.clearText();
    scene.ui.fadeIn(250);

    if (scene.gameData.gender === PlayerGender.UNSET) {
      scene.gameData.gender = PlayerGender.MALE;
    }

    scene.resetRunUnlockRewards();
    const rewards: RewardConfig[] = [
      { type: RewardObtainedType.UNLOCK, name: "Unlock" } as any,
      { type: RewardObtainedType.FORM, name: "smitom", isGlitch: true, unlockableSpriteType: UnlockModePokeSpriteType.GLITCH } as any,
      { type: RewardObtainedType.QUEST_UNLOCK, name: "Quest Unlock", questSpriteId: Species.BULBASAUR, isInitialQuestUnlock: true } as any,
      { type: RewardObtainedType.RIVAL_TO_VOID, name: "Rival To Void", rivalType: TrainerType.BLUE } as any,
      { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Draft Mode", gameMode: GameModes.DRAFT } as any,
      { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Nightmare Mode", gameMode: GameModes.NIGHTMARE } as any,
      { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Nuzlocke Mode", gameMode: GameModes.NUZLOCKE } as any,
      { type: RewardObtainedType.NIGHTMARE_MODE_CHANGE, name: "Nuzlight Mode", gameMode: GameModes.NUZLIGHT } as any,
    ];
    for (const r of rewards) {
      scene.recordRunUnlockReward(r);
    }
    scene.runUnlockRewardsShownIndex = 0;
    scene.beginPowerUnlockDeferral();

    const def = STORY_CUTSCENES.rival_defeat;
    const finalSlides = def.slides.map(s => ({ ...s }));

    let currentSlideKey: string | null = null;
    let overlay: Phaser.GameObjects.Sprite | null = null;
    let flameFadeDone = false;
    let flameTextDone = false;
    let flameMinPauseDone = false;
    let flameDidAdvance = false;
    let flameMinPauseTimer: Phaser.Time.TimerEvent | null = null;

    const maybeAdvanceFlame = (controller: any) => {
      if (flameDidAdvance || currentSlideKey !== "flame") return;
      if (!flameFadeDone || !flameTextDone || !flameMinPauseDone) return;
      flameDidAdvance = true;
      controller.next();
    };

    scene.pushPhase(new TitlePhase(scene, false, true));
    scene.unshiftPhase(new SlideshowCutscenePhase(scene, {
      slides: finalSlides,
      bgmKey: def.bgmKey,
      canSkip: true,
      pauseAfterText: 1000,
      defaultCharSound: "ui/select",
      resumeBgmOnEnd: false,
      onSlideChange: (index: number, controller: any) => {
        currentSlideKey = finalSlides[index]?.imageKey ?? null;

        if (overlay) {
          scene.tweens.killTweensOf(overlay);
          overlay.destroy();
          overlay = null;
        }
        if (flameMinPauseTimer) {
          flameMinPauseTimer.remove();
          flameMinPauseTimer = null;
        }

        if (currentSlideKey === "flame") {
          flameFadeDone = false;
          flameTextDone = false;
          flameMinPauseDone = false;
          flameDidAdvance = false;

          const container = controller.getContainer?.() ?? controller.getContainer();
          if (container) {
            overlay = addCorruptedRivalOverlay(scene, container, TrainerType.BLUE as any);
            if (overlay) {
              overlay.setAlpha(1);
              playCutsceneFaintAnim(scene, container, overlay).then(() => {
                if (currentSlideKey !== "flame") return;
                flameFadeDone = true;
                flameMinPauseDone = false;
                flameMinPauseTimer = scene.time.delayedCall(fixedInt(150) as any, () => {
                  if (currentSlideKey !== "flame") return;
                  flameMinPauseDone = true;
                  maybeAdvanceFlame(controller);
                });
                maybeAdvanceFlame(controller);
              });
            } else {
              flameFadeDone = true;
              flameMinPauseDone = false;
              flameMinPauseTimer = scene.time.delayedCall(fixedInt(150) as any, () => {
                if (currentSlideKey !== "flame") return;
                flameMinPauseDone = true;
                maybeAdvanceFlame(controller);
              });
            }
          }
        } else {
          flameFadeDone = false;
          flameTextDone = false;
          flameMinPauseDone = false;
          flameDidAdvance = false;
        }
      },
      onTextComplete: (controller: any) => {
        if (currentSlideKey === "flame") {
          flameTextDone = true;
          maybeAdvanceFlame(controller);
        }
        if (currentSlideKey === "power") {
          runPowerUnlockOverlays(scene, controller);
        }
      },
      onComplete: () => {
        if (overlay) {
          scene.tweens.killTweensOf(overlay);
          overlay.destroy();
          overlay = null;
        }
        if (flameMinPauseTimer) {
          flameMinPauseTimer.remove();
          flameMinPauseTimer = null;
        }
        scene.endPowerUnlockDeferral();
      }
    }));

    scene.shiftPhase();
  }

  private triggerBountyCompletionDebug(): void {
    const replayActive = !!(this.scene as any)?.replayMode || !!(globalThis as any).__POKEVOID_REPLAY_MODE__;
    const mode = this.scene.ui?.getMode();
    if (replayActive || mode === Mode.REPLAY_VIEWER) return;

    const activeSkillTreeBounty = this.scene.modifiers.find(
      m => m instanceof PermaRunQuestModifier && (m as PermaRunQuestModifier).skillTreeBounty
    ) as PermaRunQuestModifier | undefined;

    if (!activeSkillTreeBounty) return;
    const isVictoryBounty = activeSkillTreeBounty instanceof PermaWinQuestModifier;

    this.scene.ui.setMode(Mode.MESSAGE);

    this.scene.unshiftPhase(new QuestManagerPhase(
      this.scene,
      activeSkillTreeBounty,
      [{
        action: async () => {
          try { this.scene.ui.getHandler().clear(); } catch {}
          if (!Overrides.FORCE_BOUNTY_COMPLETION_OVERRIDE) {
            try { this.scene.removeModifier(activeSkillTreeBounty); } catch {}
            try { await this.scene.updateModifiers(true); } catch {}
          }
          try { this.scene.unshiftPhase(new BountyRewardPhase(this.scene, isVictoryBounty, activeSkillTreeBounty instanceof PermaBeatTrainerQuestModifier)); } catch {}
        },
        label: i18next.t("modifier:permaRunQuest.collectRewards")
      }]
    ));

    const currentPhase = this.scene.getCurrentPhase();
    if (currentPhase) {
      this.scene.unshiftPhase(currentPhase);
    }
    this.scene.shiftPhase();
  }

}