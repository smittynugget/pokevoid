import BattleScene from "#app/battle-scene.js";
import { TurnCommand, BattleType, DynamicModes } from "#app/battle.js";
import { applyAbAttrs, applyCheckTrappedAbAttrs, BlockSwitchCommandAbAttr, CheckTrappedAbAttr } from "#app/data/ability.js";
import { TrappedTag, EncoreTag } from "#app/data/battler-tags.js";
import { MoveTargetSet, getMoveTargets } from "#app/data/move.js";
import { speciesStarters } from "#app/data/pokemon-species.js";
import { SpeciesFormKey } from "#enums/species-form-key";
import { Type } from "#app/data/type.js";
import { Abilities } from "#app/enums/abilities.js";
import { BattlerTagType } from "#app/enums/battler-tag-type.js";
import { Biome } from "#app/enums/biome.js";
import { Moves } from "#app/enums/moves.js";
import { PokeballType } from "#app/enums/pokeball.js";
import { FieldPosition, PlayerPokemon } from "#app/field/pokemon.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { Command } from "#app/ui/command-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import i18next from "i18next";
import * as Utils from "#app/utils.js";
import Overrides from "#app/overrides";
import { FieldPhase } from "./field-phase";
import { SelectTargetPhase } from "./select-target-phase";
import {TrainerType} from "#enums/trainer-type";
import {PermaType} from "#app/modifier/perma-modifiers";
import {Unlockables} from "#app/system/unlockables";
import { BattleSpec } from "#app/enums/battle-spec.ts";
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";
import { QuestState, QuestUnlockables } from "#app/system/game-data.js";
import { MoveUpgradePhase } from "./move-upgrade-phase.js";
import { getDynamicModeLocalizedString } from "#app/battle.js";
import { SkillTreePhase, resolveActiveChampionId } from "#app/phases/skill-tree-phase";
import { RewardObtainDisplayPhase } from "#app/phases/reward-obtain-display-phase";
import { RewardObtainedType } from "#app/ui/reward-obtained-ui-handler";
import { Species } from "#app/enums/species.js";
import { SmitomTutorialPhase } from "#app/phases/smitom-tutorial-phase.js";
import { SlideshowCutscenePhase } from "#app/phases/slideshow-cutscene-phase.js";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";
import { beginTutorialChaosFtlAfterTrance } from "#app/system/champion-mode-integration.js";
import { PokemonBattleTooltipUtils } from "#app/ui/pokemon-battle-tooltip-utils";
import { ForbiddenFormUnlockModifierType, FormChangeItemModifierType, ModifierTypeOption, PathNodeTypeFilter, TypeSwitcherModifierType, modifierTypes, RandomStatSwitcherModifierType, TypeSacrificeModifierType } from "#app/modifier/modifier-type.js";
import { SelectModifierPhase } from "./select-modifier-phase";
import { FormChangeItem } from "#enums/form-change-items";
import { getResistantTypes, queueSmitomThenReward, queueSmitomThenShop } from "./tutorial-onboard-script-phase";
import { setSetting, SettingKeys } from "#app/system/settings/settings";
import { StatusEffect } from "#app/enums/status-effect.js";

export class CommandPhase extends FieldPhase {
  protected fieldIndex: integer;
  private skipRandomSmitomTips: boolean;

  constructor(scene: BattleScene, fieldIndex: integer, skipRandomSmitomTips: boolean = false) {
    super(scene);

    this.fieldIndex = fieldIndex;
    this.skipRandomSmitomTips = skipRandomSmitomTips;
  }

  start() {
    super.start();

    PokemonBattleTooltipUtils.ensureEnemyHoverZone(this.scene);
    PokemonBattleTooltipUtils.ensurePlayerHoverZone(this.scene);

    if (this.fieldIndex === 0 && this.scene.currentBattle) {
      this.scene.encounterInitComplete = true;
      if (Overrides.DEBUG_SAVE_TRACE) {
        console.debug("[SAVE_TRACE] CommandPhase set encounterInitComplete", {
          autoSaveMode: this.scene.autoSaveMode,
          waveIndex: this.scene.currentBattle?.waveIndex,
          battleTurn: this.scene.currentBattle?.turn
        });
      }
    }

    if (this.scene.debugGauntletAutoCycle && this.fieldIndex === 0) {
      this.scene.debugGauntletCancelAutoCycle = () => {
        this.scene.debugGauntletAutoCycleTimer?.destroy();
        this.scene.debugGauntletAutoCycleTimer = null;
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
      };
      this.scene.debugGauntletAutoCycleTimer = this.scene.time.delayedCall(1000, () => this.advanceGauntletCycle());
      return;
    }

    if (this.tryTriggerReviverSeedTutorialChain()) {
      return;
    }

    if (this.fieldIndex === 0 && this.scene.currentBattle && this.scene.gameData?.dataLoaded) {
        const now = Date.now();
        if (!this.scene._lastCommandPhaseSaveTime || (now - this.scene._lastCommandPhaseSaveTime) > 5000) {
            this.scene._lastCommandPhaseSaveTime = now;
            if (Overrides.DEBUG_SAVE_TRACE) {
              console.debug("[SAVE_TRACE] CommandPhase localSaveAll", {
                autoSaveMode: this.scene.autoSaveMode,
                waveIndex: this.scene.currentBattle?.waveIndex,
                battleTurn: this.scene.currentBattle?.turn,
                encounterInitComplete: this.scene.encounterInitComplete
              });
            }
            this.scene.gameData.localSaveAll(this.scene);
        }
    }

    if (this.fieldIndex) {
      if (this.scene.getPlayerField().filter(p => p.isActive()).length === 1) {
        this.fieldIndex = FieldPosition.CENTER;
      } else {
        const allyCommand = this.scene.currentBattle.turnCommands[this.fieldIndex - 1];
        if (allyCommand?.command === Command.BALL || allyCommand?.command === Command.RUN) {
          this.scene.currentBattle.turnCommands[this.fieldIndex] = { command: allyCommand?.command, skip: true };
        }
      }
    }
    if (this.scene.currentBattle.turnCommands[this.fieldIndex]?.skip) {
      return this.end();
    }

    const playerPokemon = this.scene.getPlayerField()[this.fieldIndex];

    const moveQueue = playerPokemon.getMoveQueue();

    while (moveQueue.length && moveQueue[0]
        && moveQueue[0].move && (!playerPokemon.getMoveset().find(m => m?.moveId === moveQueue[0].move)
          || !playerPokemon.getMoveset()[playerPokemon.getMoveset().findIndex(m => m?.moveId === moveQueue[0].move)]!.isUsable(playerPokemon, moveQueue[0].ignorePP))) {
      moveQueue.shift();
    }

    if (this.fieldIndex === 0 && !this.skipRandomSmitomTips) {
      if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
        if (this.scene.gameMode.checkIfRival(this.scene)) {
          const flags = this.scene.gameData.smitomTutorialFlags;
          if (!flags["rivals"]) {
            this.scene.unshiftPhase(new SmitomTutorialPhase(
              this.scene,
              "rivals",
              i18next.t("tutorial:smitomTip.rivals.title"),
              [i18next.t("tutorial:smitomTip.rivals.1"), i18next.t("tutorial:smitomTip.rivals.2")],
              false
            ));
            this.scene.unshiftPhase(new CommandPhase(this.scene, this.fieldIndex, true));
            this.end();
            return;
          }
        }
        else if (this.scene.currentBattle.trainer?.isCorrupted && this.scene.currentBattle.trainer?.isDynamicRival) {
          const flags = this.scene.gameData.smitomTutorialFlags;
          if (!flags["glitch_rivals"]) {
            this.scene.unshiftPhase(new SmitomTutorialPhase(
              this.scene,
              "glitch_rivals",
              i18next.t("tutorial:smitomTip.glitchRivals.title"),
              [i18next.t("tutorial:smitomTip.glitchRivals.1")],
              false
            ));
            this.scene.unshiftPhase(new CommandPhase(this.scene, this.fieldIndex, true));
            this.end();
            return;
          }
        }
      }
      else if (this.scene.currentBattle.battleType === BattleType.WILD) {
        if (this.scene.getEnemyField().some(p => p.isActive(true) && p.isFusion())) {
          const flags = this.scene.gameData.smitomTutorialFlags;
          if (!flags["fusion_pokemon"]) {
            this.scene.unshiftPhase(new SmitomTutorialPhase(
              this.scene,
              "fusion_pokemon",
              i18next.t("tutorial:smitomTip.fusionPokemon.title"),
              [i18next.t("tutorial:smitomTip.fusionPokemon.1"), i18next.t("tutorial:smitomTip.fusionPokemon.2")],
              false
            ));
            this.scene.unshiftPhase(new CommandPhase(this.scene, this.fieldIndex, true));
            this.end();
            return;
          }
        }
        else if (Utils.randSeedInt(100, 1) <= 1) {
          const flags = this.scene.gameData.smitomTutorialFlags;
          if (!flags["run_details"]) {
            this.scene.unshiftPhase(new SmitomTutorialPhase(
              this.scene,
              "run_details",
              i18next.t("tutorial:smitomTip.runDetails.title"),
              [i18next.t("tutorial:smitomTip.runDetails.1")],
              false
            ));
            this.scene.unshiftPhase(new CommandPhase(this.scene, this.fieldIndex, true));
            this.end();
            return;
          }
        }
      }
    }

    if (this.tryTriggerWave35FeatureUnlock()) {
      return;
    }

    if (this.tryTriggerJourneyQuestShopTip()) {
      return;
    }

    if (this.scene.gameData.pendingSkillTreeAutoOpen && this.fieldIndex === 0) {

      if (this.openSkillTreeFromCommand()) {
        return;
      }
    }

    if (moveQueue.length) {
      const queuedMove = moveQueue[0];
      if (!queuedMove.move) {
        this.handleCommand(Command.FIGHT, -1, false);
      } else {
        const moveIndex = playerPokemon.getMoveset().findIndex(m => m?.moveId === queuedMove.move);
        if (moveIndex > -1 && playerPokemon.getMoveset()[moveIndex]!.isUsable(playerPokemon, queuedMove.ignorePP)) {
          this.handleCommand(Command.FIGHT, moveIndex, queuedMove.ignorePP, { targets: queuedMove.targets, multiple: queuedMove.targets.length > 1 });
        } else {
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }
      }
    } else {
      this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
    }

    if (this.scene.currentBattle.battleType === BattleType.TRAINER) {
      if (!this.scene.gameMode.checkIfRival(this.scene)
        && !(this.scene.currentBattle.trainer?.isCorrupted && this.scene.currentBattle.trainer?.isDynamicRival)) {
        const introTutorials = [EnhancedTutorial.TRAINER_POKEMON_1];
        if (!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
          this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true);
        }
      }
    }
    else if (this.scene.currentBattle.battleType === BattleType.WILD) {
      if (this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.UNLOCKED)
        && !this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.STARTER_CATCH_QUEST)) {
        this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.STARTER_CATCH_QUEST);
      }
    }
    else if (this.scene.gameMode.isWavePreFinal(this.scene)) {
      const introTutorials = [EnhancedTutorial.ENDGAME];
      if (!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
        this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true);
      }
    }
  }
  private advanceGauntletCycle(): void {
    const scene = this.scene;
    scene.debugGauntletAutoCycleTimer = null;
    scene.debugGauntletCancelAutoCycle = null;

    const enemyField = scene.getEnemyField();
    enemyField.forEach(enemyPokemon => {
      enemyPokemon.hp = 0;
      enemyPokemon.trySetStatus(StatusEffect.FAINT);
      enemyPokemon.hideInfo();
      enemyPokemon.destroy();
    });
    scene.clearEnemyHeldItemModifiers();
    PokemonBattleTooltipUtils.destroyEnemyHoverZone();
    PokemonBattleTooltipUtils.destroyPlayerHoverZone();

    scene.clearPhaseQueue();
    import("./debug-gauntlet-encounter-phase").then(({ DebugGauntletEncounterPhase }) => {
      scene.unshiftPhase(new DebugGauntletEncounterPhase(scene));
      scene.shiftPhase();
    });
  }

  public tryTriggerVoidCaptureChain(): boolean {
    const tutScriptFight = this.scene.gameData.tutorialBattleScript;
    if (
      this.fieldIndex === 0
      && this.scene.gameData.tutorialOnboardActive
      && tutScriptFight?.tutorialGlitchTriggered
      && !tutScriptFight.voidCaptureTipTriggered
    ) {
      tutScriptFight.voidCaptureTipTriggered = true;
      const player = this.scene.getPlayerPokemon();
      const pokemonName = player?.getNameToRender() ?? "";

      this.scene.unshiftPhase(new SmitomTutorialPhase(
        this.scene,
        "tutorial_battle_glitch_reward",
        i18next.t("tutorial:smitomTip.tutorialBattleGlitchReward.title"),
        [i18next.t("tutorial:smitomTip.tutorialBattleGlitchReward.1", { pokemonName })],
        false
      ));

      const questMap: Record<number, QuestUnlockables> = {
        [Species.CHARIZARD]: QuestUnlockables.CHARIZARD_GROUND_MOVE_KNOCKOUT_QUEST,
        [Species.BLASTOISE]: QuestUnlockables.BLASTOISE_FAIRY_DEFEAT_QUEST,
        [Species.VENUSAUR]: QuestUnlockables.VENUSAUR_PSYCHIC_MOVE_USE_QUEST,
      };
      const questUnlockable = questMap[tutScriptFight.playerStarterSpecies!];
      if (questUnlockable !== undefined) {
        const questUnlockData = this.scene.gameData.getQuestUnlockDataFromModifierTypes(questUnlockable);
        const unlockOption = new ModifierTypeOption(
          new ForbiddenFormUnlockModifierType({ kind: "QUEST_FORM", questUnlockData }),
          0, 0
        );
        const unlockPhase = new SelectModifierPhase(
          this.scene, 0, undefined, true,
          () => {
            this.scene.ui.setMode(Mode.MESSAGE);
            const p = this.scene.getPlayerPokemon();
            const pName = p?.getNameToRender() ?? "";

            this.scene.unshiftPhase(new SmitomTutorialPhase(
              this.scene,
              "tutorial_battle_evolve_glitch",
              i18next.t("tutorial:smitomTip.tutorialBattleEvolveGlitch.title"),
              [i18next.t("tutorial:smitomTip.tutorialBattleEvolveGlitch.1", { pokemonName: pName })],
              false
            ));

            const glitchFormOption = new ModifierTypeOption(
              new FormChangeItemModifierType(FormChangeItem.GLITCHI_GLITCHI_FRUIT),
              0,
              0
            );

            const formChangeSelectPhase = new SelectModifierPhase(
              this.scene, 0, undefined, true,
              () => {
                this.scene.ui.setMode(Mode.MESSAGE);
              },
              PathNodeTypeFilter.NONE, 0, [glitchFormOption]
            );
            formChangeSelectPhase.suppressReroll = true;
            this.scene.unshiftPhase(formChangeSelectPhase);
          },
          PathNodeTypeFilter.NONE, 0, [unlockOption]
        );
        unlockPhase.suppressReroll = true;
        this.scene.unshiftPhase(unlockPhase);
      }

      this.scene.unshiftPhase(new CommandPhase(this.scene, this.fieldIndex, true));
      this.end();
      return true;
    }
    return false;
  }

  public tryTriggerWakeUpChain(): boolean {
    return false;
  }

  public tryTriggerReviverSeedTutorialChain(): boolean {
    const tutScript = this.scene.gameData.tutorialBattleScript;
    if (
      this.fieldIndex === 0
      && this.scene.gameData.tutorialOnboardActive
      && tutScript?.step === "pending_hp_trigger"
      && tutScript.reviverSeedPendingTrigger
      && tutScript.rewardSubstep === "idle"
    ) {
      tutScript.reviverSeedPendingTrigger = false;
      tutScript.rewardSubstep = "smitom";
      const { primary, secondary } = getResistantTypes(tutScript.foeSpecies!);
      queueSmitomThenReward(
        this.scene,
        "tutorial_battle_type_tip",
        i18next.t("tutorial:smitomTip.tutorialBattleType.title"),
        [i18next.t("tutorial:smitomTip.tutorialBattleType.1")],
        [new ModifierTypeOption(new TypeSwitcherModifierType(primary, secondary), 0, 0)],
        () => {
          tutScript.step = "type_switcher_given";
          tutScript.turnsSinceLastReward = 0;
          tutScript.rewardSubstep = "idle";
        }
      );
      this.scene.unshiftPhase(new CommandPhase(this.scene, this.fieldIndex, true));
      this.end();
      return true;
    }
    return false;
  }

  private tryTriggerWave35FeatureUnlock(): boolean {
    if (this.fieldIndex !== 0) return false;
    const wave = this.scene.currentBattle?.waveIndex;
    if (wave !== 35) return false;
    if (this.scene.wave35UnlockedThisRun) return false;

    const flags = this.scene.gameData.smitomTutorialFlags;

    if (Overrides.DEBUG_WAVE35_SMITOM_TIP_OVERRIDE) {
      flags["wave35_stat_switchers"] = false;
      flags["wave35_move_upgrades"] = false;
      flags["wave35_release_items"] = false;
    }

    if (!flags["wave35_stat_switchers"]) {
      this.executeWave35Unlock("wave35_stat_switchers", "wave35StatSwitchers", SettingKeys.Disable_Stat_Switchers, "stat_switchers");
      return true;
    }
    if (!flags["wave35_move_upgrades"]) {
      this.executeWave35Unlock("wave35_move_upgrades", "wave35MoveUpgrades", SettingKeys.Disable_Move_Upgrades, "move_upgrades");
      return true;
    }
    if (!flags["wave35_release_items"]) {
      this.executeWave35Unlock("wave35_release_items", "wave35ReleaseItems", SettingKeys.Disable_Release_Items, "release_items");
      return true;
    }

    return false;
  }

  private tryTriggerJourneyQuestShopTip(): boolean {
    if (this.fieldIndex !== 0) return false;
    if (this.scene.gameData.tutorialOnboardActive) return false;
    const flags = this.scene.gameData.smitomTutorialFlags;
    if (flags["journey_quest_shop_tip"]) return false;
    if (!this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.UNLOCKED)) return false;
    if (this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.ACTIVE)) return false;
    if (this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.COMPLETED)) return false;

    this.scene.gameData.lastPermaShopRefreshTime = 0;

    queueSmitomThenShop(
      this.scene,
      "journey_quest_shop_tip",
      i18next.t("tutorial:smitomTip.journeyQuestShop.title"),
      [
        i18next.t("tutorial:smitomTip.journeyQuestShop.1"),
        i18next.t("tutorial:smitomTip.journeyQuestShop.2"),
      ],
      () => { this.scene.gameData.saveSystem(); }
    );

    this.scene.unshiftPhase(new CommandPhase(this.scene, this.fieldIndex, true));
    this.end();
    return true;
  }

  private executeWave35Unlock(flagKey: string, localeKey: string, settingKey: string, featureId: string): void {
    localStorage.setItem(`wave35_${featureId}_unlocked`, "1");
    setSetting(this.scene, settingKey, 0);

    switch (featureId) {
      case "stat_switchers":
        this.scene.disableStatSwitchers = false;
        this.scene.statSwitchersEnabledForRun = true;
        break;
      case "move_upgrades":
        this.scene.disableMoveUpgrades = false;
        this.scene.moveUpgradesEnabledForRun = true;
        break;
      case "release_items":
        this.scene.disableReleaseItems = false;
        this.scene.releaseItemsEnabledForRun = true;
        break;
    }

    this.scene.wave35UnlockedThisRun = true;

    const featureName = i18next.t(`tutorial:smitomTip.${localeKey}.featureName`);
    const title = i18next.t("tutorial:smitomTip.wave35Shared.title");
    const featurePages: string[] = [];
    for (let i = 1; ; i++) {
      const key = `tutorial:smitomTip.${localeKey}.${i}`;
      if (!i18next.exists(key)) break;
      featurePages.push(i18next.t(key));
    }
    const texts = [
      i18next.t("tutorial:smitomTip.wave35Shared.pretext", { featureName }),
      ...featurePages,
      i18next.t("tutorial:smitomTip.wave35Shared.posttext"),
    ];

    const options = this.generateWave35ModifierOption(featureId);

    queueSmitomThenReward(this.scene, flagKey, title, texts, options, () => {
      this.scene.gameData.saveSystem();
    });

    this.scene.unshiftPhase(new CommandPhase(this.scene, this.fieldIndex, true));
    this.end();
  }

  private generateWave35ModifierOption(featureId: string): ModifierTypeOption[] {
    const party = this.scene.getParty();

    switch (featureId) {
      case "stat_switchers": {
        const gen = modifierTypes.STAT_SWITCHER();
        const modType = gen.generateType(party);
        if (modType) return [new ModifierTypeOption(modType, 0, 0)];
        return [new ModifierTypeOption(new RandomStatSwitcherModifierType(), 0, 0)];
      }
      case "move_upgrades": {
        const gen = modifierTypes.MOVE_UPGRADE();
        const modType = gen.generateType(party);
        if (modType) return [new ModifierTypeOption(modType, 0, 0)];
        const fallbackGen = modifierTypes.STAT_SWITCHER();
        const fallback = fallbackGen.generateType(party);
        return [new ModifierTypeOption(fallback || new RandomStatSwitcherModifierType(), 0, 0)];
      }
      case "release_items": {
        const gen = modifierTypes.TYPE_SACRIFICE();
        const modType = gen.generateType(party);
        if (modType) return [new ModifierTypeOption(modType, 0, 0)];
        return [new ModifierTypeOption(new TypeSacrificeModifierType(), 0, 0)];
      }
      default:
        return [new ModifierTypeOption(new RandomStatSwitcherModifierType(), 0, 0)];
    }
  }

  handleCommand(command: Command, cursor: integer, ...args: any[]): boolean {
    const playerPokemon = this.scene.getPlayerField()[this.fieldIndex];
    const enemyField = this.scene.getEnemyField();
    let success: boolean;

    switch (command) {
    case Command.FIGHT: {
      let useStruggle = false;
      if (cursor === -1 ||
            playerPokemon.trySelectMove(cursor, args[0] as boolean) ||
            (useStruggle = cursor > -1 && !playerPokemon.getMoveset().filter(m => m?.isUsable(playerPokemon)).length)) {
        const moveId = !useStruggle ? cursor > -1 ? playerPokemon.getMoveset()[cursor]!.moveId : Moves.NONE : Moves.STRUGGLE;
        const turnCommand: TurnCommand = { command: Command.FIGHT, cursor: cursor, move: { move: moveId, targets: [], ignorePP: args[0] }, args: args };
        const moveTargets: MoveTargetSet = args.length < 3 ? getMoveTargets(playerPokemon, moveId) : args[2];
        if (!moveId) {
          turnCommand.targets = [this.fieldIndex];
        }
        if (moveTargets.targets.length > 1 && moveTargets.multiple) {
          this.scene.unshiftPhase(new SelectTargetPhase(this.scene, this.fieldIndex));
        }
        if (moveTargets.targets.length <= 1 || moveTargets.multiple) {
            turnCommand.move!.targets = moveTargets.targets;
        } else if (playerPokemon.getTag(BattlerTagType.CHARGING) && playerPokemon.getMoveQueue().length >= 1) {
            turnCommand.move!.targets = playerPokemon.getMoveQueue()[0].targets;
        } else {
          this.scene.unshiftPhase(new SelectTargetPhase(this.scene, this.fieldIndex));
        }
        this.scene.currentBattle.turnCommands[this.fieldIndex] = turnCommand;
        success = true;
      } else if (cursor < playerPokemon.getMoveset().length) {
        const move = playerPokemon.getMoveset()[cursor]!;
        this.scene.ui.setMode(Mode.MESSAGE);

        let errorMessage: string;
        let isLocalizedMessage = false;
        if (this.scene.challengeRestrictionActive !== DynamicModes.NONE) {
          const challenge = getDynamicModeLocalizedString(this.scene.challengeRestrictionActive);
          if (challenge) {
            errorMessage = challenge.formatted;
            isLocalizedMessage = true;
          } else {
            errorMessage = playerPokemon.summonData.disabledMove === move.moveId ? "battle:moveDisabled" :
              move.getName().endsWith(" (N)") ? "battle:moveNotImplemented" : "battle:moveNoPP";
          }
          this.scene.challengeRestrictionActive = DynamicModes.NONE;
        } else {
          errorMessage = playerPokemon.summonData.disabledMove === move.moveId ? "battle:moveDisabled" :
            move.getName().endsWith(" (N)") ? "battle:moveNotImplemented" : "battle:moveNoPP";
        }

        const moveName = move.getName().replace(" (N)", "");

        this.scene.ui.showText(isLocalizedMessage ? errorMessage : i18next.t(errorMessage, { moveName: moveName }), null, () => {
          this.scene.ui.clearText();
          this.scene.ui.setMode(Mode.FIGHT, this.fieldIndex);
        }, null, true);
      }
      break;
    }
    case Command.BALL:

      if (this.scene.gameData.tutorialOnboardActive) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.showText(i18next.t("battle:noPokeballForce"), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
        break;
      }

      if (this.scene.dynamicMode?.noCatch) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        const challenge = getDynamicModeLocalizedString(DynamicModes.NO_CATCH);
        if (challenge) {
          this.scene.ui.showText(challenge.formatted, null, () => {
            this.scene.ui.showText("", 0);
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
          }, null, true);
        }
        break;
      }

      const requiredMoney = this.scene.getRequiredMoneyForPokeBuy();

      const notInDex = (this.scene.getEnemyField().filter(p => p.isActive(true)).some(p => !p.scene.gameData.dexData[p.species.speciesId].caughtAttr) && this.scene.gameData.getStarterCount(d => !!d.caughtAttr) < Object.keys(speciesStarters).length - 1);

      const hasRestrictedForm = this.scene.getEnemyField().some(p => p.isActive(true) && p.isOPForm());

      const notChaosBeyondWaves = this.scene.currentBattle?.waveIndex <= 1000;
      const activeTree = (this.scene.gameData as any).activeSkillTree;
      const enemy = this.scene.getEnemyField().find(p => p.isActive(true));
      const isRivalBattle = (this.scene.currentBattle?.battleType === BattleType.TRAINER) && this.scene.gameMode.checkIfRival(this.scene);
      const encounterChanceMap = activeTree?.legendaryEncounterChanceBySpecies || {};
      const isLegendaryPriorityTarget = !!(encounterChanceMap[enemy?.species.speciesId] !== undefined);
      const legendaryOverride = !isRivalBattle && isLegendaryPriorityTarget;
      const canBypassNoPokeballForce = cursor === PokeballType.VOID_BALL && enemy && enemy.getHpRatio(true) <= 0.25 && (enemy.species.speciesId !== Species.ETERNATUS || this.scene.gameData.areAllSmittysDefeated(this.scene));
      const voidBallHpTooHigh = cursor === PokeballType.VOID_BALL && enemy && enemy.getHpRatio(true) > 0.25;

      if (!canBypassNoPokeballForce && !legendaryOverride && !(Utils.randSeedInt(10000, 1) <= 1) &&
      (this.scene.arena.biomeType === Biome.END ||
      (this.scene.gameMode.isWavePreFinal(this.scene)) ||
      this.scene.getEnemyField().some(p => p.isActive(true) && (p.species.isLegendSubOrMystical() && notChaosBeyondWaves)) ||
      (hasRestrictedForm && notChaosBeyondWaves))) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.showText(i18next.t(voidBallHpTooHigh ? "battle:voidBallHpTooHigh" : "battle:noPokeballForce"), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
      } else if (!canBypassNoPokeballForce && this.scene.currentBattle.battleType === BattleType.TRAINER && this.scene.gameMode.checkIfRival(this.scene)) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.showText(i18next.t(voidBallHpTooHigh ? "battle:voidBallHpTooHigh" : "battle:noPokeballRival"), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
      } else if (!canBypassNoPokeballForce && this.scene.currentBattle.battleType === BattleType.TRAINER && this.scene.money < requiredMoney) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);

        if (voidBallHpTooHigh) {
          this.scene.ui.showText(i18next.t("battle:voidBallHpTooHigh"), null, () => {
            this.scene.ui.showText("", 0);
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
          }, null, true);
        } else {
          this.scene.ui.showText(i18next.t("battle:noPokeballBuy", {
            requiredMoney: requiredMoney
          }), null, () => {
            this.scene.ui.showText("", 0);
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
          }, null, true);
        }
      } else {
        const targets = this.scene.getEnemyField().filter(p => p.isActive(true)).map(p => p.getBattlerIndex());
        if (targets.length > 1) {
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
          this.scene.ui.setMode(Mode.MESSAGE);
          this.scene.ui.showText(i18next.t("battle:noPokeballMulti"), null, () => {
            this.scene.ui.showText("", 0);
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
          }, null, true);
        } else if (cursor in this.scene.pokeballCounts || (args.length > 0 && typeof args[0] === 'number')) {
          const targetPokemon = enemy;
          const isStrongBall = cursor === PokeballType.MASTER_BALL || cursor === PokeballType.VOID_BALL;
          if (targetPokemon?.isBoss() && targetPokemon?.bossSegmentIndex >= 1 && !targetPokemon?.hasAbility(Abilities.WONDER_GUARD, false, true) && !isStrongBall) {
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.showText(i18next.t("battle:noPokeballStrong"), null, () => {
              this.scene.ui.showText("", 0);
              this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
            }, null, true);
          } else if (voidBallHpTooHigh) {
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.showText(i18next.t("battle:voidBallHpTooHigh"), null, () => {
              this.scene.ui.showText("", 0);
              this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
            }, null, true);
          } else {
            this.scene.currentBattle.turnCommands[this.fieldIndex] = { command: Command.BALL, cursor: cursor, args: args.length > 0 ? [...args] : undefined };
              this.scene.currentBattle.turnCommands[this.fieldIndex]!.targets = targets;
              if (this.fieldIndex) {
                this.scene.currentBattle.turnCommands[this.fieldIndex - 1]!.skip = true;
              }
              success = true;
          }
        }
      }
      break;
    case Command.POKEMON:
    case Command.RUN:
      const isSwitch = command === Command.POKEMON;
      const debugDuelmonWild = this.scene.debugDuelmonWild;
      const cantRun = !debugDuelmonWild && (this.scene.gameMode.isTestMod || this.scene.gameMode.checkIfRival(this.scene) || this.scene.currentBattle.trainer?.config.trainerType == TrainerType.SMITTY || this.scene.currentBattle.battleSpec == BattleSpec.FINAL_BOSS);
      if (!isSwitch && !debugDuelmonWild && (this.scene.arena.biomeType === Biome.END || cantRun)) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.showText(i18next.t("battle:noEscapeForce"), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
      }
      else if((debugDuelmonWild || this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_RUN_ANYTHING_1)) && !cantRun) {
          this.scene.currentBattle.turnCommands[this.fieldIndex] = { command: Command.RUN };
          success = true;
      }
      else if (!isSwitch && this.scene.currentBattle.battleType === BattleType.TRAINER) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.showText(i18next.t("battle:noEscapeTrainer"), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
      } else {
        const trapTag = playerPokemon.findTag(t => t instanceof TrappedTag) as TrappedTag;
        const trapped = new Utils.BooleanHolder(false);
        const noSwitch = this.scene.dynamicMode?.noSwitch;
        const batonPass = isSwitch && args[0] as boolean;
        const blockSwitch = new Utils.BooleanHolder(false);
        if (isSwitch) {
          applyAbAttrs(BlockSwitchCommandAbAttr, playerPokemon, blockSwitch);
        }
        const trappedAbMessages: string[] = [];
        if (!batonPass) {
          enemyField.forEach(enemyPokemon => applyCheckTrappedAbAttrs(CheckTrappedAbAttr, enemyPokemon, trapped, playerPokemon, trappedAbMessages, true));
        }
        if (batonPass || (!trapTag && !trapped.value && !noSwitch && !blockSwitch.value)) {
          this.scene.currentBattle.turnCommands[this.fieldIndex] = isSwitch
            ? { command: Command.POKEMON, cursor: cursor, args: args }
            : { command: Command.RUN };
          success = true;
          if (!isSwitch && this.fieldIndex) {
              this.scene.currentBattle.turnCommands[this.fieldIndex - 1]!.skip = true;
          }
        } else if (trapTag) {
          if (trapTag.sourceMove === Moves.INGRAIN && trapTag.sourceId && this.scene.getPokemonById(trapTag.sourceId)?.isOfType(Type.GHOST)) {
            success = true;
            this.scene.currentBattle.turnCommands[this.fieldIndex] = isSwitch
              ? { command: Command.POKEMON, cursor: cursor, args: args }
              : { command: Command.RUN };
            break;
          }
          if (!isSwitch) {
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
            this.scene.ui.setMode(Mode.MESSAGE);
          }
          this.scene.ui.showText(
            i18next.t("battle:noEscapePokemon", {
              pokemonName:  trapTag.sourceId && this.scene.getPokemonById(trapTag.sourceId) ? getPokemonNameWithAffix(this.scene.getPokemonById(trapTag.sourceId)!) : "",
              moveName: trapTag.getMoveName(),
              escapeVerb: isSwitch ? i18next.t("battle:escapeVerbSwitch") : i18next.t("battle:escapeVerbFlee")
            }),
            null,
            () => {
              this.scene.ui.showText("", 0);
              if (!isSwitch) {
                this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
              }
            }, null, true);
        } else if (isSwitch && noSwitch) {
          const challenge = getDynamicModeLocalizedString(DynamicModes.NO_SWITCH);
          if (challenge) {
            this.scene.ui.showText(challenge.formatted, null, () => {
              this.scene.ui.showText("", 0);
            }, null, true);
          }
        } else if (trapped.value && trappedAbMessages.length > 0) {
          if (!isSwitch) {
            this.scene.ui.setMode(Mode.MESSAGE);
          }
          this.scene.ui.showText(trappedAbMessages[0], null, () => {
            this.scene.ui.showText("", 0);
            if (!isSwitch) {
              this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
            }
          }, null, true);
        }
      }
      break;
    }

    if (success!) {
      this.end();
    }

    return success!;
  }

  cancel() {
    if (this.fieldIndex) {
      this.scene.unshiftPhase(new CommandPhase(this.scene, 0));
      this.scene.unshiftPhase(new CommandPhase(this.scene, 1));
      this.end();
    }
  }

  checkFightOverride(): boolean {
    const pokemon = this.getPokemon();

    const encoreTag = pokemon.getTag(EncoreTag) as EncoreTag;

    if (!encoreTag) {
      return false;
    }

    const moveIndex = pokemon.getMoveset().findIndex(m => m?.moveId === encoreTag.moveId);

    if (moveIndex === -1 || !pokemon.getMoveset()[moveIndex]!.isUsable(pokemon)) {
      return false;
    }

    this.handleCommand(Command.FIGHT, moveIndex, false);

    return true;
  }

  getFieldIndex(): integer {
    return this.fieldIndex;
  }

  getPokemon(): PlayerPokemon {
    return this.scene.getPlayerField()[this.fieldIndex];
  }

  end() {
    this.scene.ui.setMode(Mode.MESSAGE).then(() => super.end());
  }
  openSkillTreeFromCommand(): boolean {
    if (!this.scene.skillTreeEnabledForRun) {
      return false;
    }
    const gameData: any = (this.scene as any).gameData;
    if (gameData?.tutorialOnboardActive) {
      return false;
    }
    if (!gameData?.activeSkillTree) {
      return false;
    }
    const championId = resolveActiveChampionId(this.scene, gameData.activeSkillTree);
    const skillTreePhase = new SkillTreePhase(this.scene, {
      mode: "BATTLE_ACCESS",
      onComplete: undefined,
      onCancel: () => {
        this.scene.ui.setMode(Mode.COMMAND, this.getFieldIndex());
      }
    });
    this.scene.gameData.pendingSkillTreeAutoOpen = false;
    this.scene.unshiftPhase(new RewardObtainDisplayPhase(this.scene, {
      type: RewardObtainedType.SKILL_TREE_UNLOCK,
      championId
    }));
    this.scene.unshiftPhase(skillTreePhase);
    this.scene.unshiftPhase(this);
    this.scene.shiftPhase();
    return true;
  }
  checkPendingMoveUpgrades(): boolean {
    if (this.scene.gameData.pendingMoveUpgrades >= 0) {
      const pendingUpgrade = this.scene.gameData.pendingMoveUpgrades;
        this.scene.gameData.pendingMoveUpgrades = -1;
        const moveUpgradePhase = new MoveUpgradePhase(
          this.scene,
          pendingUpgrade
        );

        this.scene.unshiftPhase(moveUpgradePhase);
        this.scene.unshiftPhase(this);
        this.scene.shiftPhase();

        return true;
    }

    return false;
  }
}