import BattleScene from "#app/battle-scene.js";
import { TurnCommand, BattleType, DynamicModes } from "#app/battle.js";
import { applyCheckTrappedAbAttrs, CheckTrappedAbAttr } from "#app/data/ability.js";
import { TrappedTag, EncoreTag } from "#app/data/battler-tags.js";
import { MoveTargetSet, getMoveTargets } from "#app/data/move.js";
import { SpeciesFormKey, speciesStarters } from "#app/data/pokemon-species.js";
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

export class CommandPhase extends FieldPhase {
  protected fieldIndex: integer;

  constructor(scene: BattleScene, fieldIndex: integer) {
    super(scene);

    this.fieldIndex = fieldIndex;
  }

  start() {
    super.start();

    // Check for any pending move upgrades
    // if(this.checkPendingMoveUpgrades()){
    //   return;
    // }

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
          || !playerPokemon.getMoveset()[playerPokemon.getMoveset().findIndex(m => m?.moveId === moveQueue[0].move)]!.isUsable(playerPokemon, moveQueue[0].ignorePP))) { // TODO: is the bang correct?
      moveQueue.shift();
    }

    if (moveQueue.length) {
      const queuedMove = moveQueue[0];
      if (!queuedMove.move) {
        this.handleCommand(Command.FIGHT, -1, false);
      } else {
        const moveIndex = playerPokemon.getMoveset().findIndex(m => m?.moveId === queuedMove.move);
        if (moveIndex > -1 && playerPokemon.getMoveset()[moveIndex]!.isUsable(playerPokemon, queuedMove.ignorePP)) { // TODO: is the bang correct?
          this.handleCommand(Command.FIGHT, moveIndex, queuedMove.ignorePP, { targets: queuedMove.targets, multiple: queuedMove.targets.length > 1 });
        } else {
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }
      }
    } else {
      this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
    }

    if(this.scene.currentBattle.battleType === BattleType.TRAINER) {
      let introTutorials: EnhancedTutorial[];
      if (this.scene.gameMode.checkIfRival(this.scene)) {          
            introTutorials = [EnhancedTutorial.RIVALS_1];
      }
      else if(this.scene.currentBattle.trainer?.isCorrupted && this.scene.currentBattle.trainer?.isDynamicRival) {
        introTutorials = [EnhancedTutorial.GLITCH_RIVALS_1];
      }
       else {
          introTutorials = [EnhancedTutorial.TRAINER_POKEMON_1];
      }
        if(!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true);
      }
    }
    else if(this.scene.currentBattle.battleType === BattleType.WILD) {
      let introTutorials: EnhancedTutorial[];
      // if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.MOVE_UPGRADES_1)) {
      //         this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.MOVE_UPGRADES_1, true, false);
      //     }
      if(this.scene.gameData.checkQuestState(QuestUnlockables.STARTER_CATCH_QUEST, QuestState.UNLOCKED)
      && !this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.STARTER_CATCH_QUEST)) {
            this.scene.gameData.tutorialService.showTutorial(EnhancedTutorial.NEW_QUESTS, false, false);
            this.scene.gameData.tutorialService.saveTutorialFlag(EnhancedTutorial.STARTER_CATCH_QUEST);
      }
      else if(this.scene.getEnemyField().some(p => p.isActive(true) && p.isFusion())) {
        if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.FUSION_POKEMON_1)) {
              this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.FUSION_POKEMON_1, true, false);
          }
      }
      else if(Utils.randSeedInt(100, 1) <= 10) {
        introTutorials = [EnhancedTutorial.UNLOCK_JOURNEY, EnhancedTutorial.MODE_UNLOCKS];
        if(!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true);
        }
        else if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.RUN_DETAILS_1)) {
              this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.RUN_DETAILS_1, true, false);
          }
      }
    }
    else if(this.scene.gameMode.isWavePreFinal(this.scene)) {
      const introTutorials = [EnhancedTutorial.ENDGAME];
        if(!this.scene.gameData.tutorialService.allTutorialsCompleted(introTutorials)) {
            this.scene.gameData.tutorialService.showCombinedTutorial("", introTutorials, true, false, true);
      }
    }
  }

  handleCommand(command: Command, cursor: integer, ...args: any[]): boolean {
    const playerPokemon = this.scene.getPlayerField()[this.fieldIndex];
    const enemyField = this.scene.getEnemyField();
    let success: boolean;

    switch (command) {
    case Command.FIGHT:
      let useStruggle = false;
      if (cursor === -1 ||
            playerPokemon.trySelectMove(cursor, args[0] as boolean) ||
            (useStruggle = cursor > -1 && !playerPokemon.getMoveset().filter(m => m?.isUsable(playerPokemon)).length)) {
        const moveId = !useStruggle ? cursor > -1 ? playerPokemon.getMoveset()[cursor]!.moveId : Moves.NONE : Moves.STRUGGLE; // TODO: is the bang correct?
        const turnCommand: TurnCommand = { command: Command.FIGHT, cursor: cursor, move: { move: moveId, targets: [], ignorePP: args[0] }, args: args };
        const moveTargets: MoveTargetSet = args.length < 3 ? getMoveTargets(playerPokemon, moveId) : args[2];
        if (!moveId) {
          turnCommand.targets = [this.fieldIndex];
        }
        if (moveTargets.targets.length > 1 && moveTargets.multiple) {
          this.scene.unshiftPhase(new SelectTargetPhase(this.scene, this.fieldIndex));
        }
        if (moveTargets.targets.length <= 1 || moveTargets.multiple) {
            turnCommand.move!.targets = moveTargets.targets; //TODO: is the bang correct here?
        } else if (playerPokemon.getTag(BattlerTagType.CHARGING) && playerPokemon.getMoveQueue().length >= 1) {
            turnCommand.move!.targets = playerPokemon.getMoveQueue()[0].targets; //TODO: is the bang correct here?
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
    case Command.BALL:

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

      if (!(Utils.randSeedInt(10000, 1) <= 1) && 
      (this.scene.arena.biomeType === Biome.END || 
      (this.scene.gameMode.isWavePreFinal(this.scene)) || 
      this.scene.getEnemyField().some(p => p.isActive(true) && (p.species.isLegendSubOrMystical() && notChaosBeyondWaves)) ||
      (hasRestrictedForm && notChaosBeyondWaves))) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.showText(i18next.t("battle:noPokeballForce"), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
      } else if (this.scene.currentBattle.battleType === BattleType.TRAINER && this.scene.gameMode.checkIfRival(this.scene)) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.showText(i18next.t("battle:noPokeballRival"), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
      } else if (this.scene.currentBattle.battleType === BattleType.TRAINER && this.scene.money < requiredMoney) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        
        this.scene.ui.showText(i18next.t("battle:noPokeballBuy", {
          requiredMoney: requiredMoney
        }), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
      } else {
        const targets = this.scene.getEnemyField().filter(p => p.isActive(true)).map(p => p.getBattlerIndex());
        if (targets.length > 1) {
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
          this.scene.ui.setMode(Mode.MESSAGE);
          this.scene.ui.showText(i18next.t("battle:noPokeballMulti"), null, () => {
            this.scene.ui.showText("", 0);
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
          }, null, true);
        } else if (cursor < 5) {
          const targetPokemon = this.scene.getEnemyField().find(p => p.isActive(true));
          if (targetPokemon?.isBoss() && targetPokemon?.bossSegmentIndex >= 1 && !targetPokemon?.hasAbility(Abilities.WONDER_GUARD, false, true) && cursor < PokeballType.MASTER_BALL) {
            this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.ui.showText(i18next.t("battle:noPokeballStrong"), null, () => {
              this.scene.ui.showText("", 0);
              this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
            }, null, true);
          } else {
            this.scene.currentBattle.turnCommands[this.fieldIndex] = { command: Command.BALL, cursor: cursor };
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
      
      const cantRun = this.scene.gameMode.isTestMod || this.scene.gameMode.checkIfRival(this.scene) || this.scene.currentBattle.trainer?.config.trainerType == TrainerType.SMITTY || this.scene.currentBattle.battleSpec == BattleSpec.FINAL_BOSS
      if (!isSwitch && (this.scene.arena.biomeType === Biome.END || cantRun)) {
        this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        this.scene.ui.setMode(Mode.MESSAGE);
        this.scene.ui.showText(i18next.t("battle:noEscapeForce"), null, () => {
          this.scene.ui.showText("", 0);
          this.scene.ui.setMode(Mode.COMMAND, this.fieldIndex);
        }, null, true);
      }
      else if(this.scene.gameData.hasPermaModifierByType(PermaType.PERMA_RUN_ANYTHING_1) && !cantRun) {
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
        const trappedAbMessages: string[] = [];
        if (!batonPass) {
          enemyField.forEach(enemyPokemon => applyCheckTrappedAbAttrs(CheckTrappedAbAttr, enemyPokemon, trapped, playerPokemon, trappedAbMessages, true));
        }
        if (batonPass || (!trapTag && !trapped.value && !noSwitch)) {
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

    if (success!) { // TODO: is the bang correct?
      this.end();
    }

    return success!; // TODO: is the bang correct?
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

    if (moveIndex === -1 || !pokemon.getMoveset()[moveIndex]!.isUsable(pokemon)) { // TODO: is this bang correct?
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
