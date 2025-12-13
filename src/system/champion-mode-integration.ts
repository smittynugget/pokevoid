import BattleScene from "../battle-scene";
import { GameModes, GameMode } from "../game-mode";
import { ChampionSelectPhase } from "../phases/champion-select-phase";
import { ChampionUtils } from "./champion-utils";
import { ChampionManager } from "./champion-manager";
import { Species } from "../enums/species";
import { Phase } from "../phase";
import { SkillTreePhase, SkillTreeMode } from "../phases/skill-tree-phase";
import Battle, { setupFixedBattlePaths, setupFixedBattles, setupNightmareFixedBattles, BattleType } from "#app/battle";
import { BattlePathPhase } from "#app/phases/battle-path-phase";
import { EncounterPhase } from "#app/phases/encounter-phase";
import { GameMechanicsID, GameMechanicsVersion } from "#enums/gameMechanicsID";
import { Mode } from "#app/ui/ui";
import { SaveSlotUiMode } from "#app/ui/save-slot-select-ui-handler";
import { TitlePhase } from "#app/phases/title-phase";
import { SelectStarterPhase } from "#app/phases/select-starter-phase";
import { PokemonSummonData } from "../field/pokemon";
import { Gender } from "../data/gender";
import { Starter } from "../ui/starter-select-ui-handler";
import { DEBUG_FORCE_SKILL_TREE_ENHANCED_MODE } from "#app/overrides";
import { PlayerGender } from "#enums/player-gender";
import { PokemonAltBuildId, POKEMON_ALT_BUILDS } from "../data/pokemon-alt-buid";
import { PokemonAltBuildModifierType } from "../modifier/modifier-type";
import * as Modifiers from "../modifier/modifier";
export function setupBattleFlow(scene: BattleScene, loaded: boolean = false): void {

  if (scene.gameMode.modeId !== GameModes.SHOP) {
    scene.newArena(scene.gameMode.getStartingBiome(scene));
  }
  scene.money = scene.gameMode.getStartingMoney();
  if (scene.gameMode.isChaosMode) {

    scene.gameMechanicTracking[GameMechanicsID.CHAOS_MODE] = GameMechanicsVersion.CHAOS_V2;
    scene.gameMechanicTracking[GameMechanicsID.COLLECTED_TYPE_MODIFIER] = GameMechanicsVersion.COLLECTED_TYPE_MODIFIER_V2;
    scene.gameMechanicTracking[GameMechanicsID.CHAMPION_MODE] = GameMechanicsVersion.CHAMPION_V1;

    scene.currentBattle = null;
    scene.newBattle(1, BattleType.WILD);
    scene.arena.init();
    setupFixedBattlePaths(scene);
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

    scene.unshiftPhase(new EncounterPhase(scene, loaded));
  }
}
function handleSaveSlotSelection(scene: BattleScene, onSlotSelected: (slotId: number) => void): void {
  console.log("[STARTER] handleSaveSlotSelection called, current UI mode:", scene.ui.getMode());
  console.log("[STARTER] Setting overlay mode to SAVE_SLOT");
  scene.ui.setOverlayMode(Mode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: integer) => {
    console.log("[STARTER] Save slot callback invoked with slotId:", slotId);
    if (slotId === -1) {
      console.log("[STARTER] Save slot cancelled, returning to title");
      scene.clearPhaseQueue();
      scene.pushPhase(new TitlePhase(scene));
      return;
    }
    scene.sessionSlotId = slotId;
    console.log("[STARTER] Calling onSlotSelected callback");
    onSlotSelected(slotId);
  }).then(() => {
    console.log("[STARTER] setOverlayMode promise resolved, UI mode now:", scene.ui.getMode());
  }).catch((err) => {
    console.error("[STARTER] setOverlayMode error:", err);
  });
}

export class ChampionModeIntegration {
  static initializeChampionSelection(
    scene: BattleScene,
    gameMode: GameModes,
    opts?: { onChampionReady?: (championId: string, availableStarters: Species[]) => void }
  ): void {
    console.log("[STARTER] ChampionModeIntegration.initializeChampionSelection called, gameMode:", gameMode);
    scene.unshiftPhase(new ChampionSelectPhase(scene, gameMode, {
      allowCancel: true,
      onChampionSelected: (championId: string) => {
        console.log("[STARTER] ChampionModeIntegration onChampionSelected callback, original championId:", championId);

        let effectiveChampionId = championId;
        if (championId === "apollo_diana") {
          effectiveChampionId = scene.gameData.gender === PlayerGender.FEMALE ? "diana" : "apollo";
        }

        console.log("[STARTER] Effective championId after gender conversion:", effectiveChampionId);
        scene.gameData.selectedChampionId = effectiveChampionId;
        scene.gameData.initializeSkillTree(effectiveChampionId);

        const championData = ChampionManager.getInstance().getChampionData(effectiveChampionId);
        const gm = scene.gameMode as GameMode;

        if (gm?.isDraft && !gm?.isNightmare) {
          const waitPhase = new Phase(scene);
          scene.unshiftPhase(waitPhase);

          handleSaveSlotSelection(scene, (slotId) => {
            scene.unshiftPhase(new SkillTreePhase(scene as any, {
              mode: SkillTreeMode.POKEMON_SELECTION,
              requiredSelections: 2,
              onComplete: (selections?: Array<{ species: number; isSignature: boolean }>) => {
                if (selections && selections.length) {
                  const active = (scene as any).gameData?.activeSkillTree;
                  if (active) {
                    const sig = selections.find(s => s.isSignature)?.species;
                    const gen = selections.find(s => !s.isSignature)?.species;
                    active.selectedPokemon = { signature: sig as any, general: gen as any };
                  }
                }

                setupBattleFlow(scene, false);
                opts?.onChampionReady?.(championId, []);
              }
            }));
            waitPhase.end();
          });
          return;
        } else {
          const result = ChampionUtils.filterStartersByChampion(scene, championData, gm);
          const availableStarters = result.allStarters;
          console.log("[STARTER] champion-mode-integration creating SelectStarterPhase with availableStarters:", availableStarters?.length, "first 5:", availableStarters?.slice(0, 5));

          scene.unshiftPhase(new SelectStarterPhase(scene, {
            availableStarters: availableStarters,
            onStarterSelected: (starterInput: Starter | Starter[]) => {

              const starters = Array.isArray(starterInput) ? starterInput : [starterInput];

              console.log("[STARTER] ===== onStarterSelected callback START =====");
              console.log("[STARTER] Received", starters.length, "starters");
              starters.forEach((s, i) => {
                console.log(`[STARTER] Starter ${i + 1}:`, s.species.name, "ID:", s.species.speciesId);
              });
              console.log("[STARTER] Current party size BEFORE adding:", scene.getParty().length);
              if (scene.gameData.activeSkillTree) {
                scene.gameData.activeSkillTree.starterPokemon = starters[0].species.speciesId;
                console.log("[STARTER] Stored first starter in activeSkillTree.starterPokemon");
              }

              const starterHandler = scene.ui.getHandler() as any;
              if (starterHandler?.starterSelectContainer) {
                console.log("[STARTER] Hiding starter select container");
                starterHandler.starterSelectContainer.setVisible(false);
              }

              handleSaveSlotSelection(scene, (slotId) => {
                console.log("[STARTER] Save slot selected:", slotId);
                scene.sessionSlotId = slotId;
                const party = scene.getParty();
                const loadPokemonAssets: Promise<void>[] = [];
                starters.forEach((starter, index) => {
                  const starterProps = scene.gameData.getSpeciesDexAttrProps(starter.species, starter.dexAttr);
                  const starterFormIndex = Math.min(starterProps.formIndex, Math.max(starter.species.forms.length - 1, 0));
                  const starterGender = starter.species.malePercent !== null
                    ? !starterProps.female ? Gender.MALE : Gender.FEMALE
                    : Gender.GENDERLESS;
                  const starterIvs = scene.gameData.dexData[starter.species.speciesId].ivs.slice(0);

                  console.log(`[ChampionIntegration] Processing starter ${index}: species=${starter.species.name} (${starter.species.speciesId})`);

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
                  if (starter.fusionIndex > -1) {
                    starterPokemon.generateFusionViaSpeciesID(scene.gameData.starterData[starter.species.speciesId].obtainedFusions[starter.fusionIndex]);
                  }

                  console.log(`[ChampionIntegration] Checking signature status for starter ${index}...`);

                  const currentChampionId = scene.gameData.selectedChampionId;
                  let selectedIsSignature = false;
                  let altBuildId: PokemonAltBuildId | null = null;

                  if (currentChampionId) {
                    const currentChampionData = (scene.gameData as any).championData?.[currentChampionId];
                    if (currentChampionData) {
                      const inBaseList = currentChampionData.signaturePokemon?.includes(starter.species.speciesId) || false;

                      const unlockedSignatures = (currentChampionData as any).unlockedSignaturePokemon as Species[] | undefined;
                      const inUnlockedList = unlockedSignatures?.includes(starter.species.speciesId) || false;

                      selectedIsSignature = inBaseList || inUnlockedList;

                      if (selectedIsSignature) {
                        starterPokemon.isSignature = true;
                        altBuildId = ChampionUtils.getSignatureAltBuildId(starter.species.speciesId, currentChampionData);
                        if (altBuildId) {
                          const altBuild = POKEMON_ALT_BUILDS[altBuildId];
                          if (altBuild) {
                            const modifierType = new PokemonAltBuildModifierType(altBuild);
                            const modifier = new Modifiers.PokemonAltBuildModifier(modifierType, starterPokemon.id, altBuild);
                            modifier.applyAltBuildToPokemon(starterPokemon);
                            console.log(`[ChampionIntegration] Applied base signature alt build ${altBuildId} (Rank ${altBuild.rank})`);
                          }
                        }
                      }
                    }
                  }

                  console.log(`[ChampionIntegration] championId=${currentChampionId}, selectedIsSignature=${selectedIsSignature}, altBuildId=${altBuildId}`);
                  starterPokemon.setVisible(false);
                  party.push(starterPokemon);
                  loadPokemonAssets.push(starterPokemon.loadAssets());

                  console.log(`[STARTER] ===== STARTER ${index + 1} ADDED TO PARTY =====`);
                  console.log(`[STARTER] Added starter ${index + 1}:`, starter.species.name, "ID:", starter.species.speciesId);
                });

                console.log("[STARTER] Party size after adding all starters:", party.length);
                console.log("[STARTER] Party contents:", party.map(p => p.species.name));
                  console.log("[STARTER] Loading all starter assets...");
                  Promise.all(loadPokemonAssets).then(() => {
                    console.log("[STARTER] All assets loaded, queueing skill tree phase");
                    console.log("[STARTER] Party size before skill tree:", scene.getParty().length);
                    console.log("[STARTER] Party before skill tree:", scene.getParty().map(p => p.species.name));
                    const skillTreeMode = DEBUG_FORCE_SKILL_TREE_ENHANCED_MODE
                      ? SkillTreeMode.DEBUG_ENHANCED
                      : SkillTreeMode.INITIAL_ACCESS;

                    console.log("[STARTER] Skill tree mode:", skillTreeMode, "| DEBUG_FORCE flag:", DEBUG_FORCE_SKILL_TREE_ENHANCED_MODE);

                    console.log("[STARTER] Queuing SkillTreePhase via unshiftPhase");
                    scene.unshiftPhase(new SkillTreePhase(scene as any, {
                      mode: skillTreeMode,
                      onComplete: () => {
                        console.log("[STARTER] ===== SKILL TREE COMPLETED =====");
                        console.log("[STARTER] Party size after skill tree:", scene.getParty().length);
                        console.log("[STARTER] Party after skill tree:", scene.getParty().map(p => p.species.name));
                        console.log("[STARTER] Calling setupBattleFlow...");
                        setupBattleFlow(scene, false);
                        opts?.onChampionReady?.(championId, []);
                      }
                    }));

                    console.log("[STARTER] Calling shiftPhase to advance to SkillTreePhase");
                    scene.shiftPhase();
                    console.log("[STARTER] ===== onStarterSelected callback END =====");
                });
              });
            }
          }));
          return;
        }
      }
    }));
  }
}