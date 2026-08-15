import BattleScene from "#app/battle-scene";
import { GameModes, GameMode } from "#app/game-mode";
import { Phase } from "#app/phase";
import { Mode } from "#app/ui/ui";
import i18next from "i18next";
import { ChampionManager } from "#app/system/champion-manager";
import { SelectStarterPhase } from "#app/phases/select-starter-phase";
import { TitlePhase } from "#app/phases/title-phase";
import { CharacterSelectPhase } from "#app/phases/character-select-phase";

export interface ChampionSelectConfig {
  onChampionSelected: (championId: string) => void;
  allowCancel?: boolean;
  preSelectedChampion?: string;
}

export class ChampionSelectPhase extends Phase {
  private gameMode: GameModes;
  private config: ChampionSelectConfig;

  constructor(scene: BattleScene, gameMode: GameModes, config?: ChampionSelectConfig) {
    super(scene);
    console.log("[STARTER] ChampionSelectPhase constructor, gameMode:", gameMode, "config:", config);
    this.gameMode = gameMode;
    this.config = config || ({ onChampionSelected: () => {} } as ChampionSelectConfig);
  }

  start(): void {
    super.start();
    const manager = ChampionManager.getInstance();
    const availableChampions = manager.getAvailableChampions();

    if (!availableChampions.length) {
      this.scene.unshiftPhase(new SelectStarterPhase(this.scene));
      this.end();
      return;
    }

    this.scene.ui.setMode(Mode.CHAMPION_SELECT, {
      availableChampions,
      gameMode: this.gameMode,
      onChampionSelected: (championId: string) => this.handleChampionSelection(championId),
      onCancel: this.config.allowCancel ? () => this.handleCancel() : undefined,
      preSelectedChampion: this.config.preSelectedChampion,
    });
  }

  private handleChampionSelection(championId: string): void {
    const manager = ChampionManager.getInstance();
    if (!manager.isChampionUnlocked(championId)) {
      return;
    }

    this.config.onChampionSelected(championId);
    this.end();
  }

  private handleCancel(): void {
    if (!this.config.allowCancel) return;
    this.scene.ui.clearText();
    this.scene.ui.setMode(Mode.MESSAGE).then(() => {
      const savedCallback = this.config.onChampionSelected;
      const gm = this.gameMode;
      const prevChampion = this.config.preSelectedChampion;
      this.scene.unshiftPhase(new CharacterSelectPhase(this.scene, gm, {
        allowCancel: true,
        preSelectedChampion: prevChampion,
        onCharacterSelected: (characterId: string) => {
          this.scene.unshiftPhase(new ChampionSelectPhase(this.scene, gm, {
            allowCancel: true,
            onChampionSelected: savedCallback,
            preSelectedChampion: characterId,
          }));
        },
      }));
      this.end();
    });
  }
}