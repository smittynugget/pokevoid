import BattleScene from "../battle-scene";
import { Egg } from "../data/egg";
import { getLevelTotalExp } from "../data/exp";
import { Phase } from "../phase";
import i18next from "i18next";
import Overrides from "../overrides";
import { EggHatchPhase } from "./egg-hatch-phase";
import { Mode } from "../ui/ui";
import { PlayerPokemon } from "../field/pokemon";
import { Gender } from "../data/gender";
import { achvs } from "../system/achv";
import { EggStarterSelectCallback } from "../ui/egg-starter-ui-handler";
import Pokemon from "../field/pokemon";
import { EggTier } from "#enums/egg-type";
import { EggSourceType } from "#app/enums/egg-source-types.js";

export class EggLapsePhase extends Phase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    super.start();

    if (Overrides.STARTING_EGGS_COUNT_OVERRIDE > 0 && this.scene.gameData.eggs.length === 0) {
      for (let i = 0; i < Overrides.STARTING_EGGS_COUNT_OVERRIDE; i++) {
        const egg = new Egg({
          scene: this.scene,
          tier: Overrides.EGG_TIER_OVERRIDE ?? EggTier.COMMON,
          sourceType: EggSourceType.GACHA_LEGENDARY,
          hatchWaves: 1
        });
        egg.addEggToGameData(this.scene);
      }
    }

    const eggsToHatch: Egg[] = this.scene.gameData.eggs.filter((egg: Egg) => {
      return Overrides.EGG_IMMEDIATE_HATCH_OVERRIDE ? true : --egg.hatchWaves < 1;
    });

    let eggCount: integer = eggsToHatch.length;

    if (eggCount) {
      this.scene.ui.showText(i18next.t("battle:eggHatching"), null, () => {
        if (eggCount > 1) {
          this.showSkipConfirmation(eggsToHatch, eggCount);
        } else {
          this.processEggs(eggsToHatch, eggCount, false);
        }
      });
    } else {
      this.end();
    }
  }

  private showSkipConfirmation(eggsToHatch: Egg[], eggCount: integer): void {
    console.log("Showing skip confirmation dialog");
    this.scene.ui.showText(i18next.t("eggStarterUi:skipAnimationsPrompt",
                    { defaultValue: "Skip all egg hatching animations?" }), null, () => {
      console.log("Setting up confirmation dialog");

      const yesCallback = () => {
        console.log("Yes selected - skipping animations");
        this.scene.ui.setMode(Mode.MESSAGE).then(() => {
          this.processEggs(eggsToHatch, eggCount, true);
        });
      };

      const noCallback = () => {
        console.log("No selected - showing normal animations");
        this.scene.ui.setMode(Mode.MESSAGE).then(() => {
          this.processEggs(eggsToHatch, eggCount, false);
        });
      };

      this.scene.ui.setOverlayMode(Mode.CONFIRM, yesCallback, noCallback, false, 0, 0, 1000, true);
    });
  }

  private processEggs(eggsToHatch: Egg[], eggCount: integer, skipAll: boolean): void {
    console.log(`Processing eggs with skipAll=${skipAll}`);

    const eggStarterCallback: EggStarterSelectCallback = (selectedStarter: any | null, releasedPokemon: Pokemon | null) => {
      const finalize = () => {
        delete this.scene.gameData.tempHatchedPokemon;
        this.end();
      };

      if (selectedStarter) {
        const hatchedPokemon: PlayerPokemon[] = this.scene.gameData.tempHatchedPokemon || [];
        const selectedPokemon = hatchedPokemon.find(p => p.species.speciesId === selectedStarter.species.speciesId);

        const applyDexAttrIfPresent = () => {
          if (!selectedPokemon || selectedStarter?.dexAttr === undefined) {
            return;
          }

          const props = this.scene.gameData.getSpeciesDexAttrProps(selectedPokemon.species, BigInt(selectedStarter.dexAttr));

          const maxFormIndex = Math.max(0, selectedPokemon.species.forms.length - 1);
          const nextFormIndex = Math.min(props.formIndex, maxFormIndex);
          if (nextFormIndex !== selectedPokemon.formIndex) {
            selectedPokemon.formIndex = nextFormIndex;
            selectedPokemon.generateName();
          }

          const mp = selectedPokemon.species.malePercent;
          if (mp !== null && mp > 0 && mp < 100) {
            selectedPokemon.gender = props.female ? Gender.FEMALE : Gender.MALE;
          }
        };

        if (selectedPokemon && releasedPokemon) {
          const partyIndex = this.scene.getParty().findIndex(p => p === releasedPokemon);
          if (partyIndex < 0) {
            console.warn(`[EggLapsePhase] Swap failed: released pokemon not found in party (species=${releasedPokemon.species?.speciesId})`);
          }
          if (partyIndex >= 0) {
            selectedPokemon.level = releasedPokemon.level;
            selectedPokemon.exp = getLevelTotalExp(selectedPokemon.level, selectedPokemon.species.growthRate);
            selectedPokemon.levelExp = 0;
            if (selectedStarter.moveset && selectedStarter.moveset.length > 0) {
              if (!selectedPokemon.tryPopulateMoveset(selectedStarter.moveset)) {
                console.warn(`[EggLapsePhase] tryPopulateMoveset failed for species ${selectedPokemon.species.speciesId}, keeping hatch moves`);
              }
            }
            if (selectedStarter.abilityIndex !== undefined) {
              selectedPokemon.abilityIndex = selectedStarter.abilityIndex;
            }
            if (selectedStarter.nature !== undefined) {
              selectedPokemon.nature = selectedStarter.nature;
            }
            if (selectedStarter.passive !== undefined) {
              selectedPokemon.passive = selectedStarter.passive;
            }
            if (selectedStarter.pokerus !== undefined) {
              selectedPokemon.pokerus = selectedStarter.pokerus;
            }
            if (selectedStarter.nickname) {
              selectedPokemon.nickname = selectedStarter.nickname;
            }
            if (selectedStarter.fusionIndex >= 0 && selectedPokemon.fusionSpecies) {
              selectedPokemon.fusionFormIndex = selectedStarter.fusionIndex;
            }
            applyDexAttrIfPresent();
            selectedPokemon.calculateStats();
            selectedPokemon.loadAssets().then(() => {
              this.scene.replacePlayerPokemon(partyIndex, selectedPokemon);
              finalize();
            }).catch(() => {
              this.scene.replacePlayerPokemon(partyIndex, selectedPokemon);
              finalize();
            });
            return;
          }
        } else if (selectedPokemon && !releasedPokemon) {
          const currentParty = this.scene.getParty();
          const lowestLevel = Math.min(...currentParty.map(p => p.level));
          selectedPokemon.level = lowestLevel;
          selectedPokemon.exp = getLevelTotalExp(selectedPokemon.level, selectedPokemon.species.growthRate);
          selectedPokemon.levelExp = 0;

          if (selectedStarter.moveset && selectedStarter.moveset.length > 0) {
            if (!selectedPokemon.tryPopulateMoveset(selectedStarter.moveset)) {
              console.warn(`[EggLapsePhase] tryPopulateMoveset failed for species ${selectedPokemon.species.speciesId}, keeping hatch moves`);
            }
          }
          if (selectedStarter.abilityIndex !== undefined) {
            selectedPokemon.abilityIndex = selectedStarter.abilityIndex;
          }
          if (selectedStarter.nature !== undefined) {
            selectedPokemon.nature = selectedStarter.nature;
          }
          if (selectedStarter.passive !== undefined) {
            selectedPokemon.passive = selectedStarter.passive;
          }
          if (selectedStarter.pokerus !== undefined) {
            selectedPokemon.pokerus = selectedStarter.pokerus;
          }
          if (selectedStarter.nickname) {
            selectedPokemon.nickname = selectedStarter.nickname;
          }
          if (selectedStarter.fusionIndex >= 0 && selectedPokemon.fusionSpecies) {
            selectedPokemon.fusionFormIndex = selectedStarter.fusionIndex;
          }

          applyDexAttrIfPresent();
          selectedPokemon.calculateStats();

          selectedPokemon.loadAssets().then(() => {
            this.scene.getParty().push(selectedPokemon);
            finalize();
          }).catch(() => {
            this.scene.getParty().push(selectedPokemon);
            finalize();
          });
          return;
        }
      }

      finalize();
    };

    if (skipAll) {
      const hatchedPokemon: PlayerPokemon[] = [];
      const catchPromises: Promise<void>[] = [];
      this.scene.gameData.tempHatchedPokemon = [];

      for (const egg of eggsToHatch) {
        const eggHatchPhase = new EggHatchPhase(this.scene, egg, eggCount);
        const pokemon = eggHatchPhase.generatePokemon();

        this.scene.gameData.setEggMoveUnlocked(pokemon.species, egg.eggMoveIndex, true);

        hatchedPokemon.push(pokemon);

        this.scene.gameData.tempHatchedPokemon.push(pokemon);

        this.scene.gameData.updateSpeciesDexIvs(pokemon.species.speciesId, pokemon.ivs);

        catchPromises.push(this.scene.gameData.setPokemonCaught(pokemon, true, true, true));
        try { this.scene.recordRunEndSummaryHatch(pokemon); } catch {}

        const eggIndex = this.scene.gameData.eggs.findIndex(e => e.id === egg.id);
        if (eggIndex !== -1) {
          this.scene.gameData.eggs.splice(eggIndex, 1);
        }

        if (pokemon.species.subLegendary) {
          this.scene.validateAchv(achvs.HATCH_SUB_LEGENDARY);
        }
        if (pokemon.species.legendary) {
          this.scene.validateAchv(achvs.HATCH_LEGENDARY);
        }
        if (pokemon.species.mythical) {
          this.scene.validateAchv(achvs.HATCH_MYTHICAL);
        }
        if (pokemon.isShiny()) {
          this.scene.validateAchv(achvs.HATCH_SHINY);
        }
      }

      Promise.all(catchPromises)
        .then(() => {
          console.log("All Pokemon hatched, showing EGG_STARTER_SELECT");
          this.scene.ui.setMode(Mode.EGG_STARTER_SELECT, hatchedPokemon, eggStarterCallback);
        })
        .catch(error => {
          console.error("Error processing hatched Pokemon:", error);
          console.log("Showing EGG_STARTER_SELECT despite errors");
          this.scene.ui.setMode(Mode.EGG_STARTER_SELECT, hatchedPokemon, eggStarterCallback);
        });
    } else {
      this.scene.queueMessage(i18next.t("battle:eggHatching"));

      this.scene.gameData.tempHatchedPokemon = [];

      let isLastEggProcessed = false;

      for (let i = eggsToHatch.length - 1; i >= 0; i--) {
        const egg = eggsToHatch[i];
        const isLastEgg = i === 0;
        const hatchPhase = new EggHatchPhase(this.scene, egg, eggCount);

        const originalEnd = hatchPhase.end.bind(hatchPhase);
        hatchPhase.end = () => {
          if (hatchPhase.pokemon) {
            this.scene.gameData.tempHatchedPokemon.push(hatchPhase.pokemon);
          }

          if (isLastEgg && !isLastEggProcessed) {
            isLastEggProcessed = true;
            this.scene.ui.setMode(Mode.EGG_STARTER_SELECT,
                                  this.scene.gameData.tempHatchedPokemon,
                                  eggStarterCallback);
          }

          else {
            originalEnd();
          }
        };
        if (eggCount > 0) {
          this.scene.unshiftPhase(hatchPhase);
          eggCount--;
        }
      }

      this.end();
    }
  }
}