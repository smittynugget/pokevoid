import BattleScene from "../battle-scene";
import { Egg } from "../data/egg";
import { Phase } from "../phase";
import i18next from "i18next";
import Overrides from "../overrides";
import { EggHatchPhase } from "./egg-hatch-phase";
import { Mode } from "../ui/ui";
import { PlayerPokemon } from "../field/pokemon";
import { achvs } from "../system/achv";
import { EggStarterSelectCallback } from "../ui/egg-starter-ui-handler";
import Pokemon from "../field/pokemon";

export class EggLapsePhase extends Phase {
  constructor(scene: BattleScene) {
    super(scene);
  }

  start() {
    super.start();

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
      if (selectedStarter) {
        const hatchedPokemon: PlayerPokemon[] = this.scene.gameData.tempHatchedPokemon || [];
        const selectedPokemon = hatchedPokemon.find(p => p.species.speciesId === selectedStarter.species.speciesId);
        
        if (selectedPokemon && releasedPokemon) {
          const partyIndex = this.scene.getParty().findIndex(p => p === releasedPokemon);
          if (partyIndex >= 0) {
            selectedPokemon.level = releasedPokemon.level;
            if (selectedStarter.moveset) {
              selectedPokemon.tryPopulateMoveset(selectedStarter.moveset);
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
            this.scene.replacePlayerPokemon(partyIndex, selectedPokemon);
          }
        }
      }
      
      delete this.scene.gameData.tempHatchedPokemon;
      this.end();
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
