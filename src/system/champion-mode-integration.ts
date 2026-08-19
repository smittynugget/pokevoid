import BattleScene, { startingWave } from "../battle-scene";
import { GameModes, GameMode, getGameMode } from "../game-mode";
import { ChampionSelectPhase } from "../phases/champion-select-phase";
import { CharacterSelectPhase } from "../phases/character-select-phase";
import { ChampionUtils } from "./champion-utils";
import { ChampionManager } from "./champion-manager";
import { Species } from "../enums/species";
import { Phase } from "../phase";
import { SkillTreePhase, SkillTreeMode } from "../phases/skill-tree-phase";
import { SkillTreeGenerator } from "./skill-tree-generator";
import { SkillTreeNode, SkillTreeRewardType } from "./skill-tree-data";
import Battle, { setupFixedBattlePaths, setupFixedBattles, setupNightmareFixedBattles, BattleType } from "#app/battle";
import { BattlePathPhase } from "#app/phases/battle-path-phase";
import { EncounterPhase } from "#app/phases/encounter-phase";
import { SlideshowCutscenePhase } from "#app/phases/slideshow-cutscene-phase.js";
import { GameMechanicsID, GameMechanicsVersion } from "#enums/gameMechanicsID";
import { Mode } from "#app/ui/ui";
import { SaveSlotUiMode } from "#app/ui/save-slot-select-ui-handler";
import { TitlePhase } from "#app/phases/title-phase";
import { SelectStarterPhase } from "#app/phases/select-starter-phase";
import { PokemonSummonData } from "../field/pokemon";
import { Gender } from "../data/gender";
import { getPokemonSpecies } from "../data/pokemon-species";
import { Starter } from "../ui/starter-select-ui-handler";
import Overrides, { DEBUG_FORCE_SKILL_TREE_ENHANCED_MODE } from "#app/overrides";
import { PlayerGender } from "#enums/player-gender";
import { PokemonAltBuildId, POKEMON_ALT_BUILDS } from "../data/pokemon-alt-buid";
import { PokemonAltBuildModifierType } from "../modifier/modifier-type";
import * as Modifiers from "../modifier/modifier";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes.js";
import { runPowerUnlockOverlays } from "#app/utils/story-cutscene-power-overlays.js";
import { ShinyPowerPhase } from "#app/phases/shiny-power-phase";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";
import { PathNodeTypeFilter } from "#app/modifier/modifier-type";
import { ensureSkillTreeTokenTracker } from "./skill-tree-progression";

export function setupBattleFlow(scene: BattleScene, loaded: boolean = false): void {
  if (scene.gameData.tutorialOnboardActive) {
    cleanupTutorialState(scene);
  }
  if (!loaded) {
    scene.moveUpgradesEnabledForRun = !scene.disableMoveUpgrades;
    scene.statSwitchersEnabledForRun = !scene.disableStatSwitchers;
    scene.releaseItemsEnabledForRun = !scene.disableReleaseItems;
    scene.ivScannerEnabledForRun = !scene.disableIvScanner;
    scene.mapEnabledForRun = !scene.disableMap;
    scene.duelmonsEnabledForRun = !scene.disableDuelmons;
    scene.skillTreeEnabledForRun = true;
    scene.gameData.pendingSkillTreeAutoOpen = false;
    scene.gameData.skillTreeAutoOpenConsumed = false;
    scene.wave35UnlockedThisRun = false;
    ensureSkillTreeTokenTracker(scene);
    scene.resetRunEndSummaryRunData();
  }

  if (scene.gameMode.modeId !== GameModes.SHOP) {
    scene.newArena(scene.gameMode.getStartingBiome(scene));
  }
  scene.money = scene.gameMode.getStartingMoney();
  if (scene.gameMode.isChaosMode) {

    scene.gameMechanicTracking[GameMechanicsID.CHAOS_MODE] = GameMechanicsVersion.CHAOS_V2;
    scene.gameMechanicTracking[GameMechanicsID.COLLECTED_TYPE_MODIFIER] = GameMechanicsVersion.COLLECTED_TYPE_MODIFIER_V2;
    scene.gameMechanicTracking[GameMechanicsID.CHAMPION_MODE] = GameMechanicsVersion.CHAMPION_V1;

    scene.currentBattle = null;
    scene.newBattle(startingWave, BattleType.WILD);
    scene.arena.init();

    scene.arenaPlayer.setPosition(300, 0);
    scene.arenaPlayerTransition.setPosition(0, 0);
    scene.arenaEnemy.setPosition(-280, 0);
    scene.arenaNextEnemy.setPosition(-280, 0);
    scene.arenaNextEnemy.setVisible(false);
    setupFixedBattlePaths(scene);
    if (!loaded && !scene.disableShinyPower) {
      scene.pushPhase(new ShinyPowerPhase(scene));
    }
    scene.pushPhase(new BattlePathPhase(scene, undefined, false));
  } else {

    if (scene.gameMode.modeId === GameModes.NIGHTMARE) {
      setupNightmareFixedBattles(scene);
    } else {
      setupFixedBattles(scene);
    }
    const partyBeforeNewBattle = scene.getParty().length;

    if (partyBeforeNewBattle === 0) {
      scene.newBattle();
    } else {

      if (!scene.currentBattle) {
        scene.newBattle();
      }
    }
    scene.arena.init();
    if (scene.currentBattle) {
      scene.currentBattle.turnCommands = [];
    }
    const playerField = scene.getPlayerField();
    playerField.forEach(pokemon => {
      if (pokemon) {
        pokemon.setVisible(false);

        if (!pokemon.summonData) {
          pokemon.summonData = new PokemonSummonData();
        }
      }
    });

    if (!loaded && !scene.disableShinyPower) {
      scene.unshiftPhase(new ShinyPowerPhase(scene));
    }
    scene.unshiftPhase(new EncounterPhase(scene, loaded));
  }
}
function handleSaveSlotSelection(scene: BattleScene, onSlotSelected: (slotId: number) => void): void {
  scene.ui.setOverlayMode(Mode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: integer) => {
    if (slotId === -1) {
      onSlotSelected(-1);
      return;
    }
    scene.sessionSlotId = slotId;
    scene.moveUpgradesEnabledForRun = !scene.disableMoveUpgrades;
    scene.statSwitchersEnabledForRun = !scene.disableStatSwitchers;
    scene.releaseItemsEnabledForRun = !scene.disableReleaseItems;
    scene.ivScannerEnabledForRun = !scene.disableIvScanner;
    scene.mapEnabledForRun = !scene.disableMap;
    scene.duelmonsEnabledForRun = !scene.disableDuelmons;
    scene.wave35UnlockedThisRun = false;
    scene.resetRunEndSummaryRunData();
    onSlotSelected(slotId);
  }).catch((err) => {
    console.error("[STARTER] setOverlayMode error:", err);
    onSlotSelected(-1);
  });
}

export class ChampionModeIntegration {
  static initializeChampionSelection(
    scene: BattleScene,
    gameMode: GameModes,
    opts?: { onChampionReady?: (championId: string, availableStarters: Species[]) => void; skipToChampionId?: string }
  ): void {
    const onChampionSelected = (championId: string) => {
        let effectiveChampionId = championId;
        if (championId === "apollo_diana") {
          effectiveChampionId = scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo";
        }
        scene.gameData.selectedChampionId = effectiveChampionId;
        scene.gameData.initializeSkillTree(effectiveChampionId);

        if (scene.trainer) {
          const backKey = ChampionUtils.getChampionBackSpriteKey(effectiveChampionId, scene.gameData.gender);
          scene.trainer.setTexture(backKey);
          const scale = ChampionUtils.getChampionBackSpriteScale(effectiveChampionId);
          scene.trainer.setScale(scale);
          const yOff = ChampionUtils.getChampionBackSpriteYOffset(effectiveChampionId);
          scene.trainer.setY(scene.trainer.y + yOff);
        }

        const championData = ChampionManager.getInstance().getChampionData(effectiveChampionId);
        const gm = scene.gameMode as GameMode;

        if (gm?.isDraft && !gm?.isNightmare) {
          const waitPhase = new Phase(scene);
          scene.unshiftPhase(waitPhase);

          scene.ui.setMode(Mode.MESSAGE);
          handleSaveSlotSelection(scene, (slotId) => {
            if (slotId === -1) {
              scene.ui.resetModeChain();
              scene.clearAllPhaseQueues();
              scene.pushPhase(new TitlePhase(scene, false, true));
              waitPhase.end();
              return;
            }
            scene.unshiftPhase(new SkillTreePhase(scene as any, {
              mode: SkillTreeMode.POKEMON_SELECTION,
              requiredSelections: 2,
              onComplete: (selections?: Array<{ species: number; isSignature: boolean }>) => {
                if (selections && selections.length) {
                  const active = (scene as any).gameData?.activeSkillTree;
                  if (active) {
                    active.selectedPokemonPicks = selections.map(s => ({
                      species: s.species as any,
                      isSignature: s.isSignature
                    }));
                  }
                }

                setupBattleFlow(scene, false);

                try {
                  const gd: any = (scene as any).gameData;
                  const ast: any = gd?.activeSkillTree;
                  const seed = ast?.seed;
                  const champId = ast?.championId;
                  if (ast && typeof seed === "number" && typeof champId === "string") {
                    const cachedNodes = gd.tempSkillTreeNodes as SkillTreeNode[] | undefined;
                    const selectionDepth1 = Array.isArray(cachedNodes) ? cachedNodes.filter(n => n && n.depth === 1) : [];
                    const hasDepth2Plus = Array.isArray(cachedNodes) ? cachedNodes.some(n => n && typeof n.depth === "number" && n.depth >= 2) : false;
                    if (!hasDepth2Plus) {
                      const gen = new SkillTreeGenerator(scene as any, seed, champId);
                      const calculateDistance = (pos1: { x: number; y: number }, pos2: { x: number; y: number }): number => {
                        const dx = pos1.x - pos2.x;
                        const dy = pos1.y - pos2.y;
                        return Math.sqrt(dx * dx + dy * dy);
                      };
                      scene.executeWithSeedOffset(() => {
                        const maxDepth = typeof ast.maxVisibleDepth === "number" ? ast.maxVisibleDepth : 2;
                        const fullTree = gen.generateCompleteTree(maxDepth);
                        const originalDepth1NodeIds = fullTree.filter(n => n.depth === 1).map(n => n.id);
                        const treeNodes: SkillTreeNode[] = selectionDepth1.length > 0 ? fullTree.filter(n => n.depth !== 1) : fullTree;

                        if (selectionDepth1.length > 0) {
                          selectionDepth1.forEach(n => treeNodes.push(n));
                          const newPokemonNodes = selectionDepth1.filter(n =>
                            n && (n.rewardData?.type === SkillTreeRewardType.SIGNATURE_POKEMON || n.rewardData?.type === SkillTreeRewardType.GENERAL_POKEMON)
                          );
                          if (newPokemonNodes.length > 0) {
                            treeNodes.forEach(node => {
                              if (node.depth === 2 && node.dependencies) {
                                node.dependencies = node.dependencies.map(depId => {
                                  if (originalDepth1NodeIds.includes(depId)) {
                                    let closestNode = newPokemonNodes[0];
                                    let minDistance = calculateDistance(node.position, closestNode.position);

                                    for (const pokemonNode of newPokemonNodes) {
                                      const distance = calculateDistance(node.position, pokemonNode.position);
                                      if (distance < minDistance) {
                                        minDistance = distance;
                                        closestNode = pokemonNode;
                                      }
                                    }

                                    const maxConnectionDistance = 300;
                                    if (minDistance <= maxConnectionDistance) {
                                      return closestNode.id;
                                    } else {
                                      return "root_0";
                                    }
                                  }
                                  return depId;
                                });
                              }
                            });
                          }
                        }

                        gd.tempSkillTreeNodes = treeNodes;
                      }, 0, seed.toString());
                    }
                  }
                } catch {}
                opts?.onChampionReady?.(championId, []);
              }
            }));
            waitPhase.end();
          });
          return;
        } else {
          const result = ChampionUtils.filterStartersByChampion(scene, championData, gm);
          const availableStarters = result.allStarters;

          scene.unshiftPhase(new SelectStarterPhase(scene, {
            availableStarters: availableStarters,
            onStarterSelected: (starterInput: Starter | Starter[]) => {

              const starters = Array.isArray(starterInput) ? starterInput : [starterInput];
              if (scene.gameData.activeSkillTree) {
                scene.gameData.activeSkillTree.starterPokemon = starters[0].species.speciesId;
              }

              const starterHandler = scene.ui.getHandler() as any;
              if (starterHandler?.starterSelectContainer) {
                starterHandler.starterSelectContainer.setVisible(false);
              }

              handleSaveSlotSelection(scene, (slotId) => {
                if (slotId === -1) {
                  scene.ui.resetModeChain();
                  scene.clearAllPhaseQueues();
                  scene.pushPhase(new TitlePhase(scene, false, true));
                  scene.getCurrentPhase()?.end();
                  return;
                }
                scene.sessionSlotId = slotId;
                const party = scene.getParty();
                const loadPokemonAssets: Promise<void>[] = [];
                starters.forEach((starter, index) => {
                  if (!index && Overrides.STARTER_SPECIES_OVERRIDE) {
                    starter.species = getPokemonSpecies(Overrides.STARTER_SPECIES_OVERRIDE as any);
                  }
                  const starterProps = scene.gameData.getSpeciesDexAttrProps(starter.species, starter.dexAttr);
                  let starterFormIndex = Math.min(starterProps.formIndex, Math.max(starter.species.forms.length - 1, 0));
                  if (
                    starter.species.speciesId in Overrides.STARTER_FORM_OVERRIDES &&
                    starter.species.forms[Overrides.STARTER_FORM_OVERRIDES[starter.species.speciesId]!]
                  ) {
                    starterFormIndex = Overrides.STARTER_FORM_OVERRIDES[starter.species.speciesId]!;
                  }
                  const starterGender = starter.species.malePercent !== null
                    ? !starterProps.female ? Gender.MALE : Gender.FEMALE
                    : Gender.GENDERLESS;
                  const starterIvs = scene.gameData.dexData[starter.species.speciesId].ivs.slice(0);

                  const starterPokemon = scene.addPlayerPokemon(
                    starter.species,
                    scene.gameMode.getStartingLevel(),
                    starter.abilityIndex,
                    starterFormIndex,
                    starterGender,
                    starterProps.shiny,
                    starterProps.variant,
                    starterIvs,
                    starter.nature
                  );
                  if (starter.moveset) {
                    starterPokemon.tryPopulateMoveset(starter.moveset);
                  }
                  if (starter.passive) {
                    starterPokemon.passive = true;
                  }
                  starterPokemon.luck = scene.gameData.getDexAttrLuck(scene.gameData.dexData[starter.species.speciesId].caughtAttr);
                  if (starter.pokerus) {
                    starterPokemon.pokerus = true;
                  }
                  if (starter.nickname) {
                    starterPokemon.nickname = starter.nickname;
                  }
                  const currentChampionId = scene.gameData.selectedChampionId;
                  let selectedIsSignature = false;
                  let altBuildId: PokemonAltBuildId | null = null;

                  if (currentChampionId) {
                    const currentChampionData = (scene.gameData as any).championData?.[currentChampionId];
                    if (currentChampionData) {
                      const inBaseList = currentChampionData.signaturePokemon?.includes(starter.species.speciesId) || false;

                      const unlockedSignatures = (currentChampionData as any).unlockedSignaturePokemon as Species[] | undefined;
                      const inUnlockedList = unlockedSignatures?.includes(starter.species.speciesId) || false;

                      selectedIsSignature = (inBaseList || inUnlockedList) && starter.isSignature !== false;

                      if (selectedIsSignature) {
                        starterPokemon.isSignature = true;
                        altBuildId = ChampionUtils.getSignatureAltBuildId(starter.species.speciesId, currentChampionData);
                      }
                    }
                  }

                  if (!selectedIsSignature) {
                    if (Overrides.STARTER_FUSION_SPECIES_OVERRIDE) {
                      starterPokemon.generateFusionViaSpeciesID(Overrides.STARTER_FUSION_SPECIES_OVERRIDE as Species, true);
                    } else if (starter.fusionIndex > -1) {
                      starterPokemon.generateFusionViaSpeciesID(scene.gameData.starterData[starter.species.speciesId].obtainedFusions[starter.fusionIndex]);
                    }
                  }
                  starterPokemon.setVisible(false);
                  party.push(starterPokemon);
                  Modifiers.applySignatureTypeSwitcher(scene as any, starterPokemon);
                  if (starterPokemon.isSignature && altBuildId) {
                    const def = POKEMON_ALT_BUILDS[altBuildId];
                    if (def) {
                      const rank = starterPokemon.altBuildRank ?? def.rank ?? 1;
                      const modType = new PokemonAltBuildModifierType(def, rank);
                      modType.id = "POKEMON_ALT_BUILD";
                      const altBuildMod = modType.newModifier(starterPokemon) as Modifiers.PokemonAltBuildModifier;
                      altBuildMod.applyAltBuildToPokemon(starterPokemon);
                      scene.addModifier(altBuildMod, true);
                    }
                  }
                  loadPokemonAssets.push(starterPokemon.loadAssets());
                });
                  Promise.all(loadPokemonAssets).then(() => {
                    const isJourneyMode = [
                      GameModes.CHAOS_JOURNEY,
                      GameModes.CHAOS_JOURNEY_SHORT,
                      GameModes.CHAOS_JOURNEY_FTL,
                    ].includes(scene.gameMode.modeId);

                    const skillTreeMode = DEBUG_FORCE_SKILL_TREE_ENHANCED_MODE
                      ? SkillTreeMode.DEBUG_ENHANCED
                      : isJourneyMode
                        ? SkillTreeMode.POKEMON_SELECTION
                        : SkillTreeMode.INITIAL_ACCESS;

                    scene.unshiftPhase(new SkillTreePhase(scene as any, {
                      mode: skillTreeMode,
                      requiredSelections: isJourneyMode ? 2 : undefined,
                      onComplete: () => {
                      setupBattleFlow(scene, false);
                        opts?.onChampionReady?.(championId, []);
                      }
                    }));

                    scene.shiftPhase();
                });
              });
            }
          }));
          if (scene.gameMode.modeId === GameModes.NIGHTMARE && !scene.disableCutscenes) {
            const def = STORY_CUTSCENES.nightmare_start;
            let currentSlideKey: string | null = null;
            scene.unshiftPhase(new SlideshowCutscenePhase(scene, {
              slides: def.slides,
              bgmKey: def.bgmKey,
              canSkip: true,
              pauseAfterText: 1000,
              resumeBgmOnEnd: true,
              onSlideChange: (index) => {
                currentSlideKey = def.slides[index]?.imageKey;
              },
              onTextComplete: (controller) => {
                if (currentSlideKey === "power") {
                  runPowerUnlockOverlays(scene, controller);
                }
              },
            }));
          }
          return;
        }
    };

    if (opts?.skipToChampionId) {
      scene.gameData.gender = PlayerGender.MALE;
      onChampionSelected(opts.skipToChampionId);
      return;
    }

    scene.unshiftPhase(new CharacterSelectPhase(scene, gameMode, {
      allowCancel: true,
      onCharacterSelected: (characterId: string) => {
        scene.unshiftPhase(new ChampionSelectPhase(scene, gameMode, {
          allowCancel: true,
          onChampionSelected: onChampionSelected,
          preSelectedChampion: characterId,
        }));
      },
    }));
  }
}

export function cleanupTutorialState(scene: BattleScene): void {
  scene.gameData.gameStats.onboardingTutorialComplete = true;
  scene.gameData.gameStats.firstTimeFtlAutoStartComplete = true;
  scene.gameData.isNewPlayer = false;
  scene.gameData.saveSystem();
  scene.gameData.tutorialOnboardActive = false;
  scene.gameData.tutorialBattleScript = null;
  scene.skillTreeEnabledForRun = true;
  TitlePhase.debugTutorialFlowActive = false;
  TitlePhase.tutorialBattlePending = false;

  if (scene.currentBattle) {
    scene.currentBattle.enemyParty.forEach(p => {
      if (p?.battleInfo) {
        p.battleInfo.setVisible(false);
        p.battleInfo.destroy();
      }
      p?.destroy();
    });
    scene.currentBattle.enemyParty = [];
  }
}

export function beginTutorialChaosFtlAfterTrance(scene: BattleScene): void {
  scene.clearAllPhaseQueues();
  scene.ui.resetModeChain();
  scene.ui.clearText();
  scene.ui.fadeIn(250);

  scene.skillTreeEnabledForRun = false;

  scene.gameMode = getGameMode(GameModes.CHAOS_ROGUE_FTL);
  scene.sessionSlotId = 0;

  const championId = scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo";
  scene.gameData.selectedChampionId = championId;
  scene.gameData.initializeSkillTree(championId);

  const party = scene.getParty();
  while (party.length > 0) party.pop()?.destroy();

  const placeholder = scene.addPlayerPokemon(getPokemonSpecies(Species.UNOWN), 1, undefined, undefined, undefined, false);
  placeholder.setVisible(false);
  party.push(placeholder);

  if (scene.currentBattle?.trainer) {
    scene.currentBattle.trainer.destroy();
  }
  if (scene.currentBattle?.enemyParty) {
    scene.currentBattle.enemyParty.forEach(p => p.destroy(true));
  }
  scene.currentBattle = null;
  scene.newBattle(1, BattleType.WILD);
  scene.showTitleBG();

  scene.money = 1000;
  scene.updateMoneyText();

  const outerDraft = new SelectModifierPhase(
    scene,
    0,
    undefined,
    true,
    () => {
      const innerDraft = new SelectModifierPhase(
        scene,
        1,
        undefined,
        true,
        () => {
          const unownIdx = party.findIndex(p => p.species.speciesId === Species.UNOWN);
          if (unownIdx >= 0) party.splice(unownIdx, 1)[0]?.destroy();

          scene.unshiftPhase(new SlideshowCutscenePhase(scene, {
            ...STORY_CUTSCENES.tutorial_void_trance_journey,
            canSkip: false,
            resumeBgmOnEnd: true,
            onComplete: () => {
              cleanupTutorialState(scene);
              setupBattleFlow(scene, false);
              scene.skillTreeEnabledForRun = false;
            },
          }));
        },
        PathNodeTypeFilter.NONE
      );
      scene.unshiftPhase(innerDraft);
    },
    PathNodeTypeFilter.NONE
  );
  scene.unshiftPhase(outerDraft);
}