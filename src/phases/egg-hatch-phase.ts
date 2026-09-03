import BattleScene, { AnySound } from "#app/battle-scene.js";
import { Egg, EGG_SEED } from "#app/data/egg.js";
import { getLevelTotalExp } from "#app/data/exp.js";
import { EggCountChangedEvent } from "#app/events/egg.js";
import Pokemon, { PlayerPokemon, YU_BATTLE_FIT, YU_PLAYER_FIT_MULT, YU_SPECIES_PORTAL_OFFSETS } from "#app/field/pokemon.js";
import { playEggPortalSummonAnim } from "#app/field/portal-anim.js";
import { getPokemonNameWithAffix } from "#app/messages.js";
import { Phase } from "#app/phase.js";
import { achvs } from "#app/system/achv.js";
import { Gender } from "#app/data/gender.js";
import EggCounterContainer from "#app/ui/egg-counter-container.js";
import EggHatchSceneHandler from "#app/ui/egg-hatch-scene-handler.js";
import PokemonInfoContainer from "#app/ui/pokemon-info-container.js";
import { EggStarterSelectCallback } from "#app/ui/egg-starter-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import { DexAttr } from "#app/system/game-data.js";
import i18next from "i18next";
import SoundFade from "phaser3-rex-plugins/plugins/soundfade";
import * as Utils from "#app/utils.js";

export class EggHatchPhase extends Phase {

  private egg: Egg;
  private eggsToHatchCount: integer;

  private eggCounterContainer: EggCounterContainer;
  private speedMultiplier: number;
  private eggHatchHandler: EggHatchSceneHandler;

  private eggHatchContainer: Phaser.GameObjects.Container;

  private eggHatchBg: Phaser.GameObjects.Image;

  private eggHatchOverlay: Phaser.GameObjects.Rectangle;

  private eggContainer: Phaser.GameObjects.Container;

  private eggSprite: Phaser.GameObjects.Sprite;

  private eggCrackSprite: Phaser.GameObjects.Sprite;

  private eggLightraysOverlay: Phaser.GameObjects.Sprite;
  private pokemonSprite: Phaser.GameObjects.Sprite;
  private eggPortalSprite: Phaser.GameObjects.Sprite;
  private pokemonShinySparkle: Phaser.GameObjects.Sprite;
  private infoContainer: PokemonInfoContainer;
  public pokemon: PlayerPokemon;

  private eggMoveIndex: integer;

  private hatched: boolean;
  private canSkip: boolean;
  private skipped: boolean;

  private evolutionBgm: AnySound;

  constructor(scene: BattleScene, egg: Egg, eggsToHatchCount: integer) {
    super(scene);

    this.egg = egg;
    this.eggsToHatchCount = eggsToHatchCount;

    this.speedMultiplier = eggsToHatchCount > 5 ? 0.3 : 1.0;
  }
  private applySpeed(duration: number): number {
    return Utils.fixedInt(duration * this.speedMultiplier);
  }

  start() {
    super.start();

    this.scene.ui.setModeForceTransition(Mode.EGG_HATCH_SCENE).then(() => {

      if (!this.egg) {
        return this.end();
      }

      const eggIndex = this.scene.gameData.eggs.findIndex(e => e.id === this.egg.id);

      if (eggIndex === -1) {
        return this.end();
      }

      this.scene.gameData.eggs.splice(eggIndex, 1);

      this.scene.fadeOutBgm(undefined, false);

      this.eggHatchHandler = this.scene.ui.getHandler() as EggHatchSceneHandler;

      this.eggHatchContainer = this.eggHatchHandler.eggHatchContainer;

      this.eggHatchBg = this.scene.add.image(0, 0, "default_bg");
      this.eggHatchBg.setOrigin(0, 0);
      try {
        if (this.eggHatchBg.postFX && typeof this.eggHatchBg.postFX.addColorMatrix === "function") {
          const colorMatrix = this.eggHatchBg.postFX.addColorMatrix();
          colorMatrix.negative();
        } else {
          this.eggHatchBg.setTint(0xFFFFFF);
          this.eggHatchBg.setBlendMode(Phaser.BlendModes.DIFFERENCE);
        }
      } catch (error) {
        this.eggHatchBg.setTint(0x000000);
        this.eggHatchBg.setBlendMode(Phaser.BlendModes.SCREEN);
      }
      this.eggHatchContainer.add(this.eggHatchBg);

      this.eggContainer = this.scene.add.container(this.eggHatchBg.displayWidth / 2, this.eggHatchBg.displayHeight / 2);

      this.eggSprite = this.scene.add.sprite(0, 0, "egg", `egg_${this.egg.getKey()}`);
      this.eggCrackSprite = this.scene.add.sprite(0, 0, "egg_crack", "0");
      this.eggCrackSprite.setVisible(false);

      this.eggLightraysOverlay = this.scene.add.sprite((-this.eggHatchBg.displayWidth / 2) + 4, -this.eggHatchBg.displayHeight / 2, "egg_lightrays", "3");
      this.eggLightraysOverlay.setOrigin(0, 0);
      this.eggLightraysOverlay.setVisible(false);

      this.eggContainer.add(this.eggSprite);
      this.eggContainer.add(this.eggCrackSprite);
      this.eggContainer.add(this.eggLightraysOverlay);
      this.eggHatchContainer.add(this.eggContainer);

      if (this.eggSprite.postFX && typeof this.eggSprite.postFX.addPixelate === "function") {
        const pixFx = this.eggSprite.postFX.addPixelate(20);
        this.scene.tweens.add({
          targets: pixFx,
          amount: -1,
          duration: Utils.fixedInt(750),
          ease: "Linear",
          onComplete: () => {
            if (this.eggSprite?.postFX) {
              this.eggSprite.postFX.remove(pixFx);
            }
          }
        });
      }

      this.eggCounterContainer = new EggCounterContainer(this.scene, this.eggsToHatchCount);
      this.eggHatchContainer.add(this.eggCounterContainer);

      const getPokemonSprite = () => {
        const ret = this.scene.add.sprite(this.eggHatchBg.displayWidth / 2, this.eggHatchBg.displayHeight / 2, "pkmn__sub");
        ret.setPipeline(this.scene.spritePipeline, { tone: [ 0.0, 0.0, 0.0, 0.0 ], ignoreTimeTint: true });
        return ret;
      };

      this.eggPortalSprite = this.scene.add.sprite(
        this.eggHatchBg.displayWidth / 2,
        this.eggHatchBg.displayHeight / 2,
        "yu_portal_7"
      );
      this.eggPortalSprite.setOrigin(0.5, 1);
      this.eggPortalSprite.setVisible(false);
      this.eggHatchContainer.add(this.eggPortalSprite);

      this.eggHatchContainer.add((this.pokemonSprite = getPokemonSprite()));

      this.pokemonShinySparkle = this.scene.add.sprite(this.pokemonSprite.x, this.pokemonSprite.y, "shiny");
      this.pokemonShinySparkle.setVisible(false);

      this.eggHatchContainer.add(this.pokemonShinySparkle);

      this.eggHatchOverlay = this.scene.add.rectangle(0, -this.scene.game.canvas.height / 6, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6, 0xFFFFFF);
      this.eggHatchOverlay.setOrigin(0, 0);
      this.eggHatchOverlay.setAlpha(0);
      this.scene.fieldUI.add(this.eggHatchOverlay);

      this.infoContainer = new PokemonInfoContainer(this.scene);
      this.infoContainer.setup();

      this.eggHatchContainer.add(this.infoContainer);

      const pokemon = this.generatePokemon();
      if (pokemon.fusionSpecies) {
        pokemon.clearFusionSpecies();
      }

      this.pokemonSprite.setVisible(false);

      this.pokemon = pokemon;

      pokemon.loadAssets().then(() => {
        this.canSkip = true;

        if(this.eggsToHatchCount > 100) {

          this.eggCrackSprite.setVisible(true);
          this.eggCrackSprite.setFrame("4");
          this.eggLightraysOverlay.setVisible(true);
          this.eggLightraysOverlay.play("egg_lightrays");
          this.pokemonSprite.play(this.pokemon.getSpriteKey(true));
          this.pokemonSprite.setPipelineData("ignoreTimeTint", true);
          this.pokemonSprite.setPipelineData("spriteKey", this.pokemon.getSpriteKey());
          this.pokemonSprite.setPipelineData("shiny", this.pokemon.shiny);
          this.pokemonSprite.setPipelineData("variant", this.pokemon.variant);
          this.pokemonSprite.setVisible(true);
          this.hatched = true;
          this.trySkip();

          this.scene.time.delayedCall(50, () => {
            this.doReveal();
          });
          return;
        }

        this.scene.time.delayedCall(1000, () => {
          if (!this.hatched) {
            this.evolutionBgm = this.scene.playSoundWithoutBgm("evolution");
          }
        });

        this.scene.time.delayedCall(2000, () => {
          if (this.hatched) {
            return;
          }
          this.eggCrackSprite.setVisible(true);
          this.doSpray(1, this.eggSprite.displayHeight / -2);
          this.doEggShake(2).then(() => {
            if (this.hatched) {
              return;
            }
            this.scene.time.delayedCall(1000, () => {
              if (this.hatched) {
                return;
              }
              this.doSpray(2, this.eggSprite.displayHeight / -4);
              this.eggCrackSprite.setFrame("1");
              this.scene.time.delayedCall(125, () => this.eggCrackSprite.setFrame("2"));
              this.doEggShake(4).then(() => {
                if (this.hatched) {
                  return;
                }
                this.scene.time.delayedCall(1000, () => {
                  if (this.hatched) {
                    return;
                  }
                  this.scene.playSound("se/egg_crack");
                  this.doSpray(4);
                  this.eggCrackSprite.setFrame("3");
                  this.scene.time.delayedCall(125, () => this.eggCrackSprite.setFrame("4"));
                  this.doEggShake(8, 2).then(() => {
                    if (!this.hatched) {
                      this.doHatch();
                    }
                  });
                });
              });
            });
          });
        });
      });
    });
  }

  end() {
    if (this.scene.findPhase((p) => p instanceof EggHatchPhase)) {
      this.eggHatchHandler.clear();
    } else {
      this.scene.time.delayedCall(250, () => this.scene.setModifiersVisible(true));
    }
    super.end();
  }
  doEggShake(intensity: number, repeatCount?: integer, count?: integer): Promise<void> {
    return new Promise(resolve => {
      if (repeatCount === undefined) {
        repeatCount = 0;
      }
      if (count === undefined) {
        count = 0;
      }
      this.scene.playSound("se/pb_move");
      this.scene.tweens.add({
        targets: this.eggContainer,
        x: `-=${intensity / (count ? 1 : 2)}`,
        ease: "Sine.easeInOut",
        duration: 125,
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.eggContainer,
            x: `+=${intensity}`,
            ease: "Sine.easeInOut",
            duration: 250,
            onComplete: () => {
              count!++;
              if (count! < repeatCount!) {
                return this.doEggShake(intensity, repeatCount, count).then(() => resolve());
              }
              this.scene.tweens.add({
                targets: this.eggContainer,
                x: `-=${intensity / 2}`,
                ease: "Sine.easeInOut",
                duration: 125,
                onComplete: () => resolve()
              });
            }
          });
        }
      });
    });
  }

  trySkip(): boolean {
    if (!this.canSkip || this.skipped) {
      return false;
    }
    if (this.eggCounterContainer.eggCountText?.data === undefined) {
      return false;
    }
    this.skipped = true;
    if (!this.hatched) {
      this.doHatch();
    } else {
      this.doReveal();
    }
    return true;
  }
  doHatch(): void {
    this.canSkip = false;
    this.hatched = true;
    if (this.evolutionBgm) {
      try {
        SoundFade.fadeOut(this.scene, this.evolutionBgm, Utils.fixedInt(100));
      } catch (e) {
        console.warn("Error fading out sound, likely due to suspended audio context");
      }
    }
    for (let e = 0; e < 5; e++) {
      this.scene.time.delayedCall(Utils.fixedInt(375 * e), () => this.scene.playSound("se/egg_hatch", { volume: 1 - (e * 0.2) }));
    }
    this.eggLightraysOverlay.setVisible(true);
    this.eggLightraysOverlay.play("egg_lightrays");
    this.scene.tweens.add({
      duration: Utils.fixedInt(125),
      targets: this.eggHatchOverlay,
      alpha: 1,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.skipped = false;
        this.canSkip = true;
      }
    });
    this.scene.time.delayedCall(Utils.fixedInt(1500), () => {
      this.canSkip = false;
      if (!this.skipped) {
        this.doReveal();
      }
    });
  }
  private applyEggPortal(): void {
    if (!this.eggPortalSprite || !this.pokemon) return;
    if (this.pokemon.getSpeciesForm().generation !== 20) {
      this.eggPortalSprite.setVisible(false);
      return;
    }
    const state = this.pokemon.getSpriteState();
    if (!state?.portal) {
      this.eggPortalSprite.setVisible(false);
      return;
    }
    const stem = state.portal.replace(/\.png$/i, "");
    const textureKey = `yu_portal_${stem}`;
    if (!this.scene.textures.exists(textureKey)) {
      this.eggPortalSprite.setVisible(false);
      return;
    }
    this.eggPortalSprite.setTexture(textureKey);
    const stateScale = state.scale ?? 1;
    const _portalFit = YU_BATTLE_FIT * YU_PLAYER_FIT_MULT;
    const posScale = stateScale * _portalFit;
    const basis = this.pokemonSprite.frame?.width;
    if (!basis || basis <= 1) return;
    const frameH = this.pokemonSprite.frame?.height || 1;
    const portalNativeW = this.eggPortalSprite.frame?.width || 195;
    const portalNativeH = this.eggPortalSprite.frame?.height || 50;
    const portalSorterW = (state.portalScale ?? 1) * basis;
    const portalSorterX = (state.portalX ?? 0) * basis;
    const portalSorterY = (state.portalY ?? 0) * basis;
    const portalSorterH = portalSorterW * (portalNativeH / portalNativeW);
    const sorterX = (state.x ?? 0) * basis;
    const sorterY = (state.y ?? 0) * basis;
    const displayW = stateScale * basis;
    const displayH = stateScale * frameH;
    const centerDeltaX = ((portalSorterX - portalSorterW / 2) - (sorterX - displayW / 2)) / stateScale;
    const feetDeltaY = ((portalSorterY + portalSorterH) - (sorterY + displayH)) / stateScale;
    const portalChildScale = portalSorterW / (portalNativeW * stateScale);
    let finalScale = portalChildScale * posScale;
    let portalX = this.pokemonSprite.x + centerDeltaX * posScale;
    let portalY = this.pokemonSprite.y + feetDeltaY * posScale - 2 * posScale;
    const _portalOffsets = YU_SPECIES_PORTAL_OFFSETS[this.pokemon.species.speciesId];
    if (_portalOffsets) {
      portalX += _portalOffsets.portalDeltaX ?? 0;
      portalY += _portalOffsets.portalDeltaY ?? 0;
      finalScale += _portalOffsets.portalScaleOffset ?? 0;
    }
    this.eggPortalSprite.setScale(finalScale);
    this.eggPortalSprite.setPosition(portalX, portalY);
    this.eggPortalSprite.setFlipX(!(state.portalFlipped ?? false));
    this.eggPortalSprite.setVisible(true);
  }

  doReveal(): void {
    const isShiny = this.pokemon.isShiny();
    if (this.pokemon.species.subLegendary) {
      this.scene.validateAchv(achvs.HATCH_SUB_LEGENDARY);
    }
    if (this.pokemon.species.legendary) {
      this.scene.validateAchv(achvs.HATCH_LEGENDARY);
    }
    if (this.pokemon.species.mythical) {
      this.scene.validateAchv(achvs.HATCH_MYTHICAL);
    }
    if (isShiny) {
      this.scene.validateAchv(achvs.HATCH_SHINY);
    }
    this.eggContainer.setVisible(false);
    this.pokemonSprite.play(this.pokemon.getSpriteKey(true));
    this.pokemonSprite.setPipelineData("ignoreTimeTint", true);
    this.pokemonSprite.setPipelineData("spriteKey", this.pokemon.getSpriteKey());
    this.pokemonSprite.setPipelineData("shiny", this.pokemon.shiny);
    this.pokemonSprite.setPipelineData("variant", this.pokemon.variant);
    this.pokemonSprite.setScale(this.pokemon.getEffectiveVisualScale());
    if (this.pokemon.getSpeciesForm().generation === 20) {
      this.pokemonSprite.setOrigin(0.5, 1);
      const effectiveScale = this.pokemon.getEffectiveVisualScale();
      const halfH = (this.pokemonSprite.frame?.height || 1) * effectiveScale / 2;
      this.pokemonSprite.y += halfH;
      this.applyEggPortal();

      this.pokemonSprite.setVisible(false);

      let portalStarted = false;
      const startPortal = () => {
        if (portalStarted) return;
        portalStarted = true;
        playEggPortalSummonAnim(
          this.scene,
          this.eggHatchContainer,
          this.eggPortalSprite,
          this.pokemonSprite,
          this.pokemonSprite.x,
          this.pokemonSprite.y,
          effectiveScale
        ).then(() => {
          this.pokemonSprite.setVisible(true);
          this.doPostReveal(isShiny);
        });
      };

      if (this.skipped) {
        startPortal();
      }

      this.scene.tweens.add({
        duration: Utils.fixedInt(this.skipped ? 500 : 3000),
        targets: this.eggHatchOverlay,
        alpha: 0,
        ease: "Cubic.easeOut",
        onUpdate: () => {
          if (!portalStarted && this.eggHatchOverlay.alpha <= 0.3) {
            startPortal();
          }
        },
        onComplete: () => {
          if (!portalStarted) startPortal();
        }
      });
      return;
    }
    this.pokemonSprite.setVisible(true);
    this.applyEggPortal();
    this.scene.time.delayedCall(Utils.fixedInt(250), () => {
      this.eggsToHatchCount--;
      this.eggHatchHandler.eventTarget.dispatchEvent(new EggCountChangedEvent(this.eggsToHatchCount));
      this.pokemon.cry();
      if (isShiny) {
        this.scene.time.delayedCall(Utils.fixedInt(500), () => {
          this.pokemonShinySparkle.play(`sparkle${this.pokemon.variant ? `_${this.pokemon.variant + 1}` : ""}`);
          this.scene.playSound("se/sparkle");
        });
      }
      this.scene.time.delayedCall(Utils.fixedInt(!this.skipped ? !isShiny ? 1250 : 1750 : !isShiny ? 250 : 750), () => {
        this.infoContainer.show(this.pokemon, false, this.skipped ? 2 : 1);

        this.scene.playSoundWithoutBgm("evolution_fanfare");

        this.scene.ui.showText(i18next.t("egg:hatchFromTheEgg", { pokemonName: getPokemonNameWithAffix(this.pokemon) }), null, () => {
          this.scene.gameData.updateSpeciesDexIvs(this.pokemon.species.speciesId, this.pokemon.ivs);
          this.scene.gameData.setPokemonCaught(this.pokemon, true, true).then(() => {
            this.scene.recordRunEndSummaryHatch(this.pokemon);
            this.scene.gameData.setEggMoveUnlocked(this.pokemon.species, this.eggMoveIndex).then(() => {
              this.scene.ui.showText("", 0);

              if (this.scene.gameData.tempHatchedPokemon) {
                this.scene.gameData.tempHatchedPokemon.push(this.pokemon);
              }

              const isLastEgg = !this.scene.findPhase((p) => p instanceof EggHatchPhase && p !== this);

              if (isLastEgg) {
                if (this.scene.gameData.tempHatchedPokemon == null) {
                  const hatchedPokemon: PlayerPokemon[] = [this.pokemon];

                  const pendingPhases: Phase[] = [];
                  let phase = this.scene.findPhase(p => p instanceof EggHatchPhase && p !== this);
                  while (phase) {
                    pendingPhases.push(phase);
                    phase.end();
                    phase = this.scene.findPhase(p => p instanceof EggHatchPhase && p !== this);
                  }

                  for (const phase of pendingPhases) {
                    const eggPhase = phase as EggHatchPhase;
                    if (eggPhase.pokemon) {
                      hatchedPokemon.push(eggPhase.pokemon);
                    }
                  }

                  const eggStarterCallback: EggStarterSelectCallback = (selectedStarter: any | null, releasedPokemon: Pokemon | null) => {
                    const finalize = () => {
                      this.scene.ui.setMode(Mode.MESSAGE);
                    };

                    if (selectedStarter) {
                      const selectedPokemon = hatchedPokemon.find(p => p.species.speciesId === selectedStarter.species.speciesId);

                      const applyStarterEntryData = () => {
                        if (!selectedPokemon) {
                          return;
                        }

                        const speciesId = selectedPokemon.species.speciesId;
                        const dexEntry = this.scene.gameData.dexData[speciesId];
                        const starterData = this.scene.gameData.starterData[speciesId];

                        if (selectedStarter?.dexAttr !== undefined) {
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
                        }

                        if (dexEntry?.ivs) {
                          const dexIvs = dexEntry.ivs.slice(0);
                          for (let i = 0; i < selectedPokemon.ivs.length; i++) {
                            selectedPokemon.ivs[i] = Math.max(selectedPokemon.ivs[i], dexIvs[i]);
                          }
                        }

                        if (dexEntry?.caughtAttr) {
                          selectedPokemon.luck = this.scene.gameData.getDexAttrLuck(dexEntry.caughtAttr);
                        }

                        if (selectedStarter.fusionIndex >= 0 && starterData?.obtainedFusions?.length > selectedStarter.fusionIndex) {
                          selectedPokemon.generateFusionViaSpeciesID(starterData.obtainedFusions[selectedStarter.fusionIndex]);
                        }

                        if (selectedStarter.moveset && selectedStarter.moveset.length > 0) {
                          if (starterData && !starterData.moveset) {
                            starterData.moveset = selectedStarter.moveset;
                          }
                        }
                      };

                      if (selectedPokemon && releasedPokemon) {
                        const partyIndex = this.scene.getParty().findIndex(p => p === releasedPokemon);
                        if (partyIndex >= 0) {
                          selectedPokemon.level = releasedPokemon.level;
                          selectedPokemon.exp = getLevelTotalExp(selectedPokemon.level, selectedPokemon.species.growthRate);
                          selectedPokemon.levelExp = 0;
                          if (selectedStarter.moveset && selectedStarter.moveset.length > 0) {
                            if (!selectedPokemon.tryPopulateMoveset(selectedStarter.moveset)) {
                              console.warn(`[EggHatchPhase] tryPopulateMoveset failed for species ${selectedPokemon.species.speciesId}, keeping hatch moves`);
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
                          applyStarterEntryData();
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
                            console.warn(`[EggHatchPhase] tryPopulateMoveset failed for species ${selectedPokemon.species.speciesId}, keeping hatch moves`);
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

                        applyStarterEntryData();
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

                  this.scene.ui.setMode(Mode.EGG_STARTER_SELECT, hatchedPokemon, eggStarterCallback);
                }
              }

              this.end();
            });
          });
        }, null, true, 3000);
      });
    });
    this.scene.tweens.add({
      duration: Utils.fixedInt(this.skipped ? 500 : 3000),
      targets: this.eggHatchOverlay,
      alpha: 0,
      ease: "Cubic.easeOut"
    });
  }

  private doPostReveal(isShiny: boolean): void {
    this.scene.time.delayedCall(Utils.fixedInt(250), () => {
      this.eggsToHatchCount--;
      this.eggHatchHandler.eventTarget.dispatchEvent(new EggCountChangedEvent(this.eggsToHatchCount));
      this.pokemon.cry();
      if (isShiny) {
        this.scene.time.delayedCall(Utils.fixedInt(500), () => {
          this.pokemonShinySparkle.play(`sparkle${this.pokemon.variant ? `_${this.pokemon.variant + 1}` : ""}`);
          this.scene.playSound("se/sparkle");
        });
      }
      this.scene.time.delayedCall(Utils.fixedInt(!this.skipped ? !isShiny ? 1250 : 1750 : !isShiny ? 250 : 750), () => {
        this.infoContainer.show(this.pokemon, false, this.skipped ? 2 : 1);

        this.scene.playSoundWithoutBgm("evolution_fanfare");

        this.scene.ui.showText(i18next.t("egg:hatchFromTheEgg", { pokemonName: getPokemonNameWithAffix(this.pokemon) }), null, () => {
          this.scene.gameData.updateSpeciesDexIvs(this.pokemon.species.speciesId, this.pokemon.ivs);
          this.scene.gameData.setPokemonCaught(this.pokemon, true, true).then(() => {
            this.scene.recordRunEndSummaryHatch(this.pokemon);
            this.scene.gameData.setEggMoveUnlocked(this.pokemon.species, this.eggMoveIndex).then(() => {
              this.scene.ui.showText("", 0);

              this.end();
            });
          });
        }, null, true, 3000);
      });
    });
  }

  sin(index: integer, amplitude: integer): number {
    return amplitude * Math.sin(index * (Math.PI / 128));
  }
  doSpray(intensity: integer, offsetY?: number) {
    this.scene.tweens.addCounter({
      repeat: intensity,
      duration: Utils.getFrameMs(1),
      onRepeat: () => {
        this.doSprayParticle(Utils.randInt(8), offsetY || 0);
      }
    });
  }
  doSprayParticle(trigIndex: integer, offsetY: number) {
    const initialX = this.eggHatchBg.displayWidth / 2;
    const initialY = this.eggHatchBg.displayHeight / 2 + offsetY;
    const shardKey = !this.egg.isManaphyEgg() ? this.egg.tier.toString() : "1";
    const particle = this.scene.add.image(initialX, initialY, "egg_shard", `${shardKey}_${Math.floor(trigIndex / 2)}`);
    this.eggHatchContainer.add(particle);

    let f = 0;
    let yOffset = 0;
    const speed = 3 - Utils.randInt(8);
    const amp = 24 + Utils.randInt(32);

    const particleTimer = this.scene.tweens.addCounter({
      repeat: -1,
      duration: Utils.getFrameMs(1),
      onRepeat: () => {
        updateParticle();
      }
    });

    const updateParticle = () => {
      const speedMultiplier = this.skipped ? 6 : 1;
      yOffset += speedMultiplier;
      if (trigIndex < 160) {
        particle.setPosition(initialX + (speed * f) / 3, initialY + yOffset);
        particle.y += -this.sin(trigIndex, amp);
        if (f > 108) {
          particle.setScale((1 - (f - 108) / 20));
        }
        trigIndex += 2 * speedMultiplier;
        f += speedMultiplier;
      } else {
        particle.destroy();
        particleTimer.remove();
      }
    };

    updateParticle();
  }

  generatePokemon(): PlayerPokemon {
    let ret: PlayerPokemon;

    this.scene.executeWithSeedOffset(() => {
      ret = this.egg.generatePlayerPokemon(this.scene);
      this.eggMoveIndex = this.egg.eggMoveIndex;

    }, this.egg.id, EGG_SEED.toString());

    return ret!;
  }
}