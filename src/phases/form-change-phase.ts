
import BattleScene from "../battle-scene";
import * as Utils from "../utils";
import { SpeciesFormKey } from "#enums/species-form-key";
import { achvs } from "../system/achv";
import { SpeciesFormChange, getSpeciesFormChangeMessage } from "../data/pokemon-forms";
import Pokemon, { PlayerPokemon } from "../field/pokemon";
import { getTypeRgb } from "../data/type";
import { Gender } from "#app/data/gender";
import { Mode } from "../ui/ui";
import PartyUiHandler from "../ui/party-ui-handler";
import { getPokemonNameWithAffix } from "../messages";
import { EndEvolutionPhase } from "./end-evolution-phase";
import { EvolutionPhase } from "./evolution-phase";
import {
  PermaFormChangeQuestModifier,
  PermaRunQuestModifier,
  PokemonFormChangeItemModifier
} from "#app/modifier/modifier";
import {FormChangeItem} from "#enums/form-change-items";
import { AnyPassiveAbilityModifier, AbilitySacrificeModifier, AnyAbilityModifier, TypeSacrificeModifier, PassiveAbilitySacrificeModifier, TypeSwitcherModifier, AbilitySwitcherModifier, MegaEvolutionAccessModifier, GigantamaxAccessModifier } from "../modifier/modifier";

export class FormChangePhase extends EvolutionPhase {
  private formChange: SpeciesFormChange;
  private modal: boolean;

  constructor(scene: BattleScene, pokemon: PlayerPokemon, formChange: SpeciesFormChange, modal: boolean) {
    super(scene, pokemon, null, 0);

    this.formChange = formChange;
    this.modal = modal;
  }

  validate(): boolean {
    return !!this.formChange;
  }

  setMode(): Promise<void> {
    if (!this.modal) {
      return super.setMode();
    }
    return this.scene.ui.setOverlayMode(Mode.EVOLUTION_SCENE);
  }

  doEvolution(): void {
    const preName = getPokemonNameWithAffix(this.pokemon);

    this.pokemon.getPossibleForm(this.formChange).then(transformedPokemon => {
      if (!transformedPokemon) {
        console.error(`[FORM_CHANGE] getPossibleForm returned null for ${this.pokemon.species.speciesId}`);
        this.end();
        return;
      }
      const previewSpriteKey = transformedPokemon.getSpriteKey(true);
      let textureOk = this.scene.textures.exists(previewSpriteKey) && this.scene.textures.get(previewSpriteKey).key !== "__MISSING";
      if (!textureOk) {
        const isMegaLike = this.formChange?.formKey?.includes("mega") || this.formChange?.formKey === "mega";
        const canFallbackVariant = isMegaLike && transformedPokemon.shiny && (transformedPokemon.variant ?? 0) > 0;
        if (canFallbackVariant) {
          const female = transformedPokemon.getGender(true) === Gender.FEMALE;
          const fallbackKey = transformedPokemon.getSpeciesForm(true).getSpriteKey(female, transformedPokemon.formIndex, transformedPokemon.shiny, 0);
          const fallbackOk = this.scene.textures.exists(fallbackKey) && this.scene.textures.get(fallbackKey).key !== "__MISSING";
          if (fallbackOk) {
            transformedPokemon.variant = 0;
            this.pokemon.variant = 0;
            textureOk = true;
          }
        }
      }
      if (!textureOk) {
        console.error(`[FORM_CHANGE] Missing texture for preview spriteKey=${previewSpriteKey} species=${transformedPokemon.species.speciesId} formIndex=${transformedPokemon.formIndex}`);
        transformedPokemon.destroy();
        this.end();
        return;
      }
      console.log(`[FORM_CHANGE] species=${transformedPokemon.species.speciesId} formIndex=${transformedPokemon.formIndex} spriteKey=${previewSpriteKey} textureOk=${textureOk}`);
      const gainingAltBuild = !this.pokemon.altBuildId && !!(transformedPokemon as any).altBuildId;
      if (gainingAltBuild) {
        [ this.pokemonSprite, this.pokemonTintSprite ].forEach(sprite => {
          if (!sprite) return;
          delete sprite.pipelineData["altBuildSpriteColors"];
          delete sprite.pipelineData["altBuildTargetColors"];
          delete sprite.pipelineData["altBuildBlendMode"];
          delete sprite.pipelineData["altBuildInversionFactor"];
        });
      }

      const tsModifier = this.scene.findModifier(m =>
        m instanceof TypeSwitcherModifier && (m as TypeSwitcherModifier).pokemonId === this.pokemon.id
      ) as TypeSwitcherModifier | undefined;
      if (tsModifier) {
        const targetType = tsModifier.newPrimaryType ?? tsModifier.newSecondaryType;
        if (targetType !== null && targetType !== undefined && targetType >= 0) {
          const rgb = getTypeRgb(targetType);
          if (rgb) {
            const toHex = (r: number, g: number, b: number) =>
              `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
            const targetPalette = [
              toHex(Math.round(rgb[0] * 0.25), Math.round(rgb[1] * 0.25), Math.round(rgb[2] * 0.25)),
              toHex(Math.round(rgb[0] * 0.50), Math.round(rgb[1] * 0.50), Math.round(rgb[2] * 0.50)),
              toHex(Math.round(rgb[0] * 0.78), Math.round(rgb[1] * 0.78), Math.round(rgb[2] * 0.78)),
              toHex(rgb[0], rgb[1], rgb[2]),
            ];
            transformedPokemon.updateAltBuildPalette({
              spriteColorPalette: {
                targetPalette: targetPalette,
                blendMode: 'grayscale_overlay',
              },
              inversionFactor: 0.0,
            });
          }
        }
      }

      [ this.pokemonEvoSprite, this.pokemonEvoTintSprite ].map(sprite => {
        try {
          const spriteKey = transformedPokemon.getSpriteKey(true);
          if (sprite.anims && sprite.anims.animationManager && sprite.anims.animationManager.exists(spriteKey)) {
            sprite.play(spriteKey);
          } else if (sprite.scene.anims && sprite.scene.anims.exists(spriteKey)) {
            sprite.play(spriteKey);
          } else {
            console.warn(`Animation for '${spriteKey}' not found, creating fallback animation`);
            if (sprite.scene.anims && typeof sprite.scene.anims.create === 'function') {
              sprite.scene.anims.create({
                key: spriteKey,
                frames: [{ key: spriteKey }],
                frameRate: 1,
                repeat: -1
              });
              sprite.play(spriteKey);
            } else {

              sprite.setTexture(spriteKey);
            }
          }
          sprite.setPipelineData("ignoreTimeTint", true);
          sprite.setPipelineData("spriteKey", transformedPokemon.getSpriteKey());
          sprite.setPipelineData("shiny", transformedPokemon.shiny);
          sprite.setPipelineData("variant", transformedPokemon.variant);
          sprite.setPipelineData("ignoreOverride", !!transformedPokemon.summonData?.speciesForm);
          [ "spriteColors", "fusionSpriteColors", "fusionRecolorMode" ].map(k => {
            if (transformedPokemon.summonData?.speciesForm) {
              k += "Base";
            }
            sprite.pipelineData[k] = transformedPokemon.getSprite().pipelineData[k];
          });

          const sourceData = transformedPokemon.getSprite().pipelineData;
          if (sourceData["altBuildSpriteColors"] && sourceData["altBuildTargetColors"]) {
            sprite.pipelineData["altBuildSpriteColors"] = sourceData["altBuildSpriteColors"];
            sprite.pipelineData["altBuildTargetColors"] = sourceData["altBuildTargetColors"];
            sprite.pipelineData["altBuildBlendMode"] = sourceData["altBuildBlendMode"] || 'replace';
            sprite.pipelineData["altBuildInversionFactor"] = sourceData["altBuildInversionFactor"] || 0.0;

            const spriteKey = transformedPokemon.getSpriteKey(true);
            console.log(`🎨 Attempting to extract colors from animation sprite: ${spriteKey}`);
            console.log(`🎨 FormChangePhase: Applied alt build to evo sprite: inversionFactor=${transformedPokemon.altBuildInversionFactor}, rank=${transformedPokemon.altBuildRank}, blendMode=${transformedPokemon.altBuildBlendMode}`);
            const actualColors = transformedPokemon.extractActualSpriteColors(spriteKey);
            console.log(`🎨 Animation sprite has ${actualColors.size} unique colors`);
          } else {
            delete sprite.pipelineData["altBuildSpriteColors"];
            delete sprite.pipelineData["altBuildTargetColors"];
            delete sprite.pipelineData["altBuildBlendMode"];
            delete sprite.pipelineData["altBuildInversionFactor"];
          }

          this.postTransformScale = transformedPokemon.getEffectiveVisualScale();
          sprite.setScale(this.postTransformScale);
        } catch (error) {
          console.error(`Error setting up sprite animation for ${transformedPokemon.getSpriteKey(true)}:`, error);

          try {
            sprite.setTexture(transformedPokemon.getSpriteKey(true));
          } catch (e) {
            console.error("Failed to set fallback texture:", e);
          }
        }
      });

      transformedPokemon.destroy();

      this.scene.time.delayedCall(250, () => {
        this.scene.tweens.add({
          targets: this.evolutionBgOverlay,
          alpha: 1,
          delay: 500,
          duration: 1500,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.scene.time.delayedCall(1000, () => {
              this.scene.tweens.add({
                targets: this.evolutionBgOverlay,
                alpha: 0,
                duration: 250
              });
              this.evolutionBg.setVisible(true);
              this.evolutionBg.play();
            });
            this.scene.playSound("se/charge");
            this.doSpiralUpward();
            this.scene.tweens.addCounter({
              from: 0,
              to: 1,
              duration: 2000,
              onUpdate: t => {
                this.pokemonTintSprite.setAlpha(t.getValue());
              },
              onComplete: () => {
                this.pokemonSprite.setVisible(false);
                this.scene.time.delayedCall(1100, () => {
                  this.scene.playSound("se/beam");
                  this.doArcDownward();
                  this.scene.time.delayedCall(1000, () => {
                    this.pokemonEvoTintSprite.setScale(0.25 * this.postTransformScale);
                    this.pokemonEvoTintSprite.setVisible(true);
                    this.doCycle(1, 1).then(_success => {
                      this.scene.playSound("se/sparkle");
                      this.pokemonEvoSprite.setVisible(true);
                      this.doCircleInward();
                      this.scene.time.delayedCall(900, () => {
                        this.pokemon.changeForm(this.formChange).then(() => {
                          if (!this.pokemon) {
                            this.end();
                            return;
                          }
                          if (this.formChange.formKey.startsWith('glitch')) {
                            this.scene.gameData.gameStats.glitchEvolutions++;
                          } else if (this.formChange.formKey.startsWith('smitty')) {
                            this.scene.gameData.gameStats.smittyEvolutions++;
                          }

                          if (this.formChange.formKey.startsWith('smitty') || this.formChange.formKey.startsWith('glitch')) {
                            this.removeSmittyModifiers(this.pokemon);
                            this.removeGlitchModifiers(this.pokemon);
                          }

                          else if (this.formChange.formKey.includes('mega')) {
                            this.removeMegaModifiers(this.pokemon);
                          }
                          else if (this.formChange.formKey.includes('dynamax') ||
                                  this.formChange.formKey.includes('gigantamax')) {
                              this.removeDynamaxModifiers(this.pokemon);
                          }
                          this.scene.gameData.permaModifiers.findModifiers(m =>
                              m instanceof PermaFormChangeQuestModifier
                          ).forEach(modifier => {
                                      modifier.apply([this.scene, this.pokemon]);
                                  });
                          this.scene.findModifiers(m => m instanceof PermaFormChangeQuestModifier)
                              .forEach(modifier => modifier.apply([this.scene, this.pokemon]));

                          const modifiers = this.pokemon.scene.findModifiers(m =>
                              (m instanceof AbilitySwitcherModifier ||
                              m instanceof TypeSwitcherModifier ||
                              m instanceof AnyAbilityModifier ||
                              m instanceof TypeSacrificeModifier ||
                              m instanceof AbilitySacrificeModifier ||
                              m instanceof PassiveAbilitySacrificeModifier ||
                              m instanceof AnyPassiveAbilityModifier) &&
                              (m as any).pokemonId === this.pokemon.id
                            );

                            for (const modifier of modifiers) {
                              modifier.apply([this.pokemon]);
                            }

                          if (!this.modal) {
                            this.scene.unshiftPhase(new EndEvolutionPhase(this.scene));
                          }

                          this.scene.playSound("se/shine");
                          this.doSpray();
                          this.scene.tweens.add({
                            targets: this.evolutionOverlay,
                            alpha: 1,
                            duration: 250,
                            easing: "Sine.easeIn",
                            onComplete: () => {
                              this.evolutionBgOverlay.setAlpha(1);
                              this.evolutionBg.setVisible(false);
                              this.scene.tweens.add({
                                targets: [ this.evolutionOverlay, this.pokemonEvoTintSprite ],
                                alpha: 0,
                                duration: 2000,
                                delay: 150,
                                easing: "Sine.easeIn",
                                onComplete: () => {
                                  this.scene.tweens.add({
                                    targets: this.evolutionBgOverlay,
                                    alpha: 0,
                                    duration: 250,
                                    onComplete: () => {
                                      this.scene.time.delayedCall(250, () => {
                                        this.pokemon.cry();
                                        this.scene.time.delayedCall(1250, () => {
                                          let playEvolutionFanfare = false;
                                          if (this.formChange.formKey.indexOf(SpeciesFormKey.MEGA) > -1) {
                                            this.scene.validateAchv(achvs.MEGA_EVOLVE);
                                            playEvolutionFanfare = true;
                                          } else if (this.formChange.formKey.indexOf(SpeciesFormKey.GIGANTAMAX) > -1 || this.formChange.formKey.indexOf(SpeciesFormKey.ETERNAMAX) > -1) {
                                            this.scene.validateAchv(achvs.GIGANTAMAX);
                                            playEvolutionFanfare = true;
                                          }

                                          const delay = playEvolutionFanfare ? 4000 : 1750;
                                          this.scene.playSoundWithoutBgm(playEvolutionFanfare ? "evolution_fanfare" : "minor_fanfare");

                                          this.scene.ui.showText(getSpeciesFormChangeMessage(this.pokemon, this.formChange, preName), null, () => this.end(), null, true, Utils.fixedInt(delay));
                                          this.scene.time.delayedCall(Utils.fixedInt(delay + 250), () => this.scene.playBgm());
                                        });
                                      });
                                    }
                                  });
                                }
                              });
                            }
                          });
                        }).catch((err) => {
                          console.error(`[FORM_CHANGE] changeForm failed for ${this.pokemon.species.speciesId}:`, err);
                          this.end();
                        });
                      });
                    });
                  });
                });
              }
            });
          }
        });
      });
    }).catch((err) => {
      console.error(`[FORM_CHANGE] Failed to load form assets for ${this.pokemon.species.speciesId}:`, err);
      this.end();
    });
  }
  private removeSmittyModifiers(pokemon: PlayerPokemon): void {
    const smittyModifiers = pokemon.scene.findModifiers(m =>
        m instanceof PokemonFormChangeItemModifier &&
        m.pokemonId === pokemon.id &&
        m.formChangeItem >= FormChangeItem.SMITTY_AURA &&
        m.formChangeItem <= FormChangeItem.SMITTY_VOID
    ) as PokemonFormChangeItemModifier[];

    smittyModifiers.forEach(modifier => {
      pokemon.scene.removeModifier(modifier);
    });
  }

  private removeGlitchModifiers(pokemon: PlayerPokemon): void {
    const glitchModifiers = pokemon.scene.findModifiers(m =>
        m instanceof PokemonFormChangeItemModifier &&
        m.pokemonId === pokemon.id &&
        m.formChangeItem >= FormChangeItem.GLITCHI_GLITCHI_FRUIT &&
        m.formChangeItem <= FormChangeItem.GLITCH_MASTER_PARTS
    ) as PokemonFormChangeItemModifier[];

    glitchModifiers.forEach(modifier => {
      pokemon.scene.removeModifier(modifier);
    });
  }

  private removeMegaModifiers(pokemon: PlayerPokemon): void {
    const megaModifiers = pokemon.scene.findModifiers(m =>
        m instanceof MegaEvolutionAccessModifier
    ) as MegaEvolutionAccessModifier[];

    if (megaModifiers.length > 0) {
        pokemon.scene.removeModifier(megaModifiers[0]);
        this.scene.updateModifiers(true);
    }
}

private removeDynamaxModifiers(pokemon: PlayerPokemon): void {
    const dynamaxModifiers = pokemon.scene.findModifiers(m =>
        m instanceof GigantamaxAccessModifier
    ) as GigantamaxAccessModifier[];

    if (dynamaxModifiers.length > 0) {
        pokemon.scene.removeModifier(dynamaxModifiers[0]);
        this.scene.updateModifiers(true);
    }
}

  end(): void {
    const refreshPartyIfVisible = () => {
      if (this.scene.ui.getMode() === Mode.PARTY) {
        const partyUiHandler = this.scene.ui.getHandler() as PartyUiHandler;
        partyUiHandler.clearPartySlots();
        partyUiHandler.populatePartySlots();
      }
    };
    if (this.modal) {
      this.scene.ui.revertMode().then(() => {
        refreshPartyIfVisible();
        super.end();
      });
    } else {
      refreshPartyIfVisible();
      super.end();
    }
  }
}