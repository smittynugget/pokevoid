import BattleScene from "../battle-scene";
import { EvolutionPhase } from "./evolution-phase";
import { EndEvolutionPhase } from "./end-evolution-phase";
import { PlayerPokemon } from "../field/pokemon";
import { getPokemonSpecies } from "../data/pokemon-species";
import { getTypeRgb } from "../data/type";
import { Species } from "#enums/species";
import { Mode } from "../ui/ui";
import * as Utils from "../utils";
import i18next from "i18next";
import { getPokemonNameWithAffix } from "../messages";
import {
  AbilitySwitcherModifier,
  AnyAbilityModifier,
  AnyPassiveAbilityModifier,
  TypeSwitcherModifier,
} from "#app/modifier/modifier.js";
import { isDuelmonSpecies, ensureDuelmonBandRolled } from "#app/data/duelmon-rankups";

export class RankUpTransformPhase extends EvolutionPhase {
  private targetSpeciesId: Species;
  private afterBaseStats: integer[];
  private onComplete: (() => void) | null;

  constructor(
    scene: BattleScene,
    pokemon: PlayerPokemon,
    targetSpeciesId: Species,
    afterBaseStats: integer[],
    onComplete?: () => void
  ) {
    super(scene, pokemon, null, pokemon.level);
    this.targetSpeciesId = targetSpeciesId;
    this.afterBaseStats = afterBaseStats;
    this.onComplete = onComplete ?? null;
  }

  validate(): boolean {
    return !!this.targetSpeciesId && this.targetSpeciesId !== this.pokemon.species.speciesId;
  }

  setMode(): Promise<void> {
    return this.scene.ui.setModeForceTransition(Mode.EVOLUTION_SCENE);
  }

  doEvolution(): void {
    const preName = getPokemonNameWithAffix(this.pokemon);
    const targetSpecies = getPokemonSpecies(this.targetSpeciesId);
    const targetName = targetSpecies.name;

    this.scene.ui.showText(
      i18next.t("battle:rankUpTransforming", {
        pokemonName: preName,
        targetName: targetName,
        defaultValue: `${preName} is transforming into ${targetName}!`,
      }),
      null,
      () => {
        this.pokemon.cry();

        const previewPokemon = this.scene.addPlayerPokemon(
          targetSpecies,
          this.pokemon.level,
          this.pokemon.abilityIndex,
          0,
          this.pokemon.gender,
          this.pokemon.shiny,
          this.pokemon.variant,
          this.pokemon.ivs,
          this.pokemon.nature,
          this.pokemon
        );

        previewPokemon.reshapeSourceSpeciesId = this.pokemon.species.speciesId;
        previewPokemon.altBuildSpriteColors = undefined;
        previewPokemon.altBuildTargetColors = undefined;
        previewPokemon.altBuildBlendMode = undefined;
        previewPokemon.altBuildInversionFactor = undefined;
        previewPokemon.fusionSpecies = null;
        previewPokemon.fusionFormIndex = 0;

        previewPokemon.loadAssets().then(() => {
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
                previewPokemon.updateAltBuildPalette({
                  spriteColorPalette: {
                    targetPalette: targetPalette,
                    blendMode: 'grayscale_overlay',
                  },
                  inversionFactor: 0.0,
                });
              }
            }
          }

          [this.pokemonEvoSprite, this.pokemonEvoTintSprite].map((sprite) => {
            sprite.play(previewPokemon.getSpriteKey(true));
            sprite.setPipelineData("ignoreTimeTint", true);
            sprite.setPipelineData("spriteKey", previewPokemon.getSpriteKey());
            sprite.setPipelineData("shiny", previewPokemon.shiny);
            sprite.setPipelineData("variant", previewPokemon.variant);
            sprite.setPipelineData("ignoreOverride", !!previewPokemon.summonData?.speciesForm);
            ["spriteColors", "fusionSpriteColors", "fusionRecolorMode"].map((k) => {
              if (previewPokemon.summonData?.speciesForm) {
                k += "Base";
              }
              sprite.pipelineData[k] =
                previewPokemon.getSprite().pipelineData[k];
            });
            const sourceData = previewPokemon.getSprite().pipelineData;
            if (sourceData["altBuildSpriteColors"] && sourceData["altBuildTargetColors"]) {
              sprite.pipelineData["altBuildSpriteColors"] = sourceData["altBuildSpriteColors"];
              sprite.pipelineData["altBuildTargetColors"] = sourceData["altBuildTargetColors"];
              sprite.pipelineData["altBuildBlendMode"] = sourceData["altBuildBlendMode"] || 'replace';
              sprite.pipelineData["altBuildInversionFactor"] = sourceData["altBuildInversionFactor"] || 0.0;
            } else {
              delete sprite.pipelineData["altBuildSpriteColors"];
              delete sprite.pipelineData["altBuildTargetColors"];
              delete sprite.pipelineData["altBuildBlendMode"];
              delete sprite.pipelineData["altBuildInversionFactor"];
            }
            sprite.setScale(previewPokemon.getEffectiveVisualScale());
          });

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
                    duration: 250,
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
                  onUpdate: (t) => {
                    this.pokemonTintSprite.setAlpha(t.getValue());
                  },
                  onComplete: () => {
                    this.pokemonSprite.setVisible(false);
                    this.scene.time.delayedCall(1100, () => {
                      this.scene.playSound("se/beam");
                      this.doArcDownward();
                      this.scene.time.delayedCall(1000, () => {
                        this.pokemonEvoTintSprite.setScale(0.25);
                        this.pokemonEvoTintSprite.setVisible(true);
                        this.doCycle(1, 1).then(() => {
                          this.scene.playSound("se/sparkle");
                          this.pokemonEvoSprite.setVisible(true);
                          this.doCircleInward();
                          this.scene.time.delayedCall(900, () => {
                            this.applyRankUpSwap().then(() => {
                              this.scene.unshiftPhase(
                                new EndEvolutionPhase(this.scene)
                              );

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
                                    targets: [
                                      this.evolutionOverlay,
                                      this.pokemonEvoTintSprite,
                                    ],
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
                                          this.scene.time.delayedCall(
                                            250,
                                            () => {
                                              this.pokemon.cry();
                                              this.scene.time.delayedCall(
                                                1250,
                                                () => {
                                                  this.scene.playSoundWithoutBgm(
                                                    "minor_fanfare"
                                                  );
                                                  previewPokemon.destroy();
                                                  if (this.onComplete) {
                                                    this.onComplete();
                                                  }
                                                  this.scene.ui.showText(
                                                    i18next.t(
                                                      "battle:rankUpComplete",
                                                      {
                                                        pokemonName: preName,
                                                        targetName:
                                                          this.pokemon.name,
                                                        defaultValue: `${preName}'s soul surged with new strength. It reshaped into ${this.pokemon.name}!`,
                                                      }
                                                    ),
                                                    null,
                                                    () => this.end(),
                                                    null,
                                                    true,
                                                    Utils.fixedInt(2000)
                                                  );
                                                  this.scene.time.delayedCall(
                                                    Utils.fixedInt(2250),
                                                    () => this.scene.playBgm()
                                                  );
                                                }
                                              );
                                            }
                                          );
                                        },
                                      });
                                    },
                                  });
                                },
                              });
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
        });
      },
    1000
    );
  }

  private async applyRankUpSwap(): Promise<void> {
    this.pokemon.removeRankUpIncompatibleModifiersBeforeSwap(
      this.targetSpeciesId
    );
    await this.pokemon.swapSpeciesRunOnly(this.targetSpeciesId);

    if (
      !this.pokemon.rankUpHistorySpeciesIds.includes(this.targetSpeciesId)
    ) {
      this.pokemon.rankUpHistorySpeciesIds.push(this.targetSpeciesId);
    }

    const modifiers = this.scene.findModifiers(
      (m) =>
        (m instanceof AbilitySwitcherModifier ||
          m instanceof TypeSwitcherModifier ||
          m instanceof AnyAbilityModifier ||
          m instanceof AnyPassiveAbilityModifier) &&
        (m as any).pokemonId === this.pokemon.id
    );
    for (const modifier of modifiers) {
      modifier.apply([this.pokemon]);
    }

    const species = this.pokemon.makeSpeciesUnique();
    const currentForm =
      species.forms && species.forms.length > this.pokemon.formIndex
        ? species.forms[this.pokemon.formIndex]
        : species;
    currentForm.baseStats = [...this.afterBaseStats];
    currentForm.baseTotal = this.afterBaseStats.reduce(
      (sum, s) => sum + s,
      0
    );

    this.pokemon.calculateStats();
    if (isDuelmonSpecies(this.pokemon.species.speciesId)) {
      ensureDuelmonBandRolled(this.scene, this.pokemon as PlayerPokemon);
    }
    await this.pokemon.updateInfo(true);
  }
}