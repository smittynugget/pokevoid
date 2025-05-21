import { BattleScene } from "../battle-scene";
import { PlayerPokemon } from "../field/pokemon";
import { SummaryUiHandler, SummaryUiMode, Page } from "../ui/summary-ui-handler";
import UiHandler from "../ui/ui-handler";
import * as Utils from "../utils";

export class TitleSummarySystem {
  private scene: BattleScene;
  private summaryHandler: SummaryUiHandler;
  private currentPokemon: PlayerPokemon | null = null;
  private initialized: boolean = false;

  constructor(scene: BattleScene) {
    this.scene = scene;
    this.summaryHandler = this.scene.ui.getHandler(UiHandler.SUMMARY) as SummaryUiHandler;
  }

  public initialize(): void {
    if (this.initialized) return;

    this.loadRequiredAssets(() => {
      this.showRandomPokemonSummary();
      this.initialized = true;
    });
  }

  private loadRequiredAssets(onComplete: () => void): void {
      if (!this.scene.textures.exists('summary_bg')) {
      this.scene.load.once('complete', onComplete);
        this.scene.load.start();
      } else {
      onComplete();
      }
  }

  private showRandomPokemonSummary(): void {
    const pokemon = this.generateRandomPokemon();
    if (pokemon) {
      pokemon.loadAssets().then(() => {
      this.currentPokemon = pokemon;
      this.summaryHandler.show([
        pokemon,
        SummaryUiMode.DEFAULT,
        Page.PROFILE,
        () => this.handleSummaryClose(),
        false
      ]);
      });
    }
  }

  private generateRandomPokemon(): PlayerPokemon | null {
    const species = this.scene.randomSpecies(0, 50);
    if (!species) return null;

    const shiny = Utils.randSeedInt(4096) === 0;
    const nature = Utils.randSeedInt(25);
    const ivs = Array(6).fill(0).map(() => Utils.randSeedInt(32));

    return this.scene.addPlayerPokemon(
      species,
      50,
      0,
      0,
      species.malePercent !== null
        ? Utils.randSeedInt(100) < species.malePercent ? 0 : 1
        : 2,
      shiny,
      0,
      ivs,
      nature
    );
  }

  private handleSummaryClose(): void {
    if (this.currentPokemon) {
      this.currentPokemon = null;
      this.showRandomPokemonSummary();
    }
  }

  public cleanup(): void {
    if (this.currentPokemon) {
      this.currentPokemon.destroy();
    this.currentPokemon = null;
    }
    this.summaryHandler?.hide();
    this.initialized = false;
  }
}