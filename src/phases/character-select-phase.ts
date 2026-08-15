import BattleScene from "#app/battle-scene";
import { GameModes } from "#app/game-mode";
import { Phase } from "#app/phase";
import { Mode } from "#app/ui/ui";
import { ChampionManager } from "#app/system/champion-manager";
import { TitlePhase } from "#app/phases/title-phase";
import { PlayerGender } from "#app/enums/player-gender";

export interface CharacterSelectConfig {
  onCharacterSelected: (characterId: string) => void;
  allowCancel?: boolean;
  preSelectedChampion?: string;
}

export class CharacterSelectPhase extends Phase {
  private gameMode: GameModes;
  private config: CharacterSelectConfig;

  constructor(scene: BattleScene, gameMode: GameModes, config?: CharacterSelectConfig) {
    super(scene);
    this.gameMode = gameMode;
    this.config = config || ({ onCharacterSelected: () => {} } as CharacterSelectConfig);
  }

  start(): void {
    super.start();

    const manager = ChampionManager.getInstance();
    const availableChampions = manager.getAvailableChampions();

    const characters = ["diana", "apollo", "brock", "misty", "red", "random"];
    const preIdx = this.config.preSelectedChampion ? characters.indexOf(this.config.preSelectedChampion) : -1;

    this.scene.ui.setMode(Mode.CHARACTER_SELECT, {
      characters,
      availableChampions,
      gameMode: this.gameMode,
      onCharacterSelected: (characterId: string) => this.handleSelection(characterId),
      onCancel: this.config.allowCancel ? () => this.handleCancel() : undefined,
      preSelectedIndex: preIdx >= 0 ? preIdx : undefined,
    });
  }

  private handleSelection(characterId: string): void {
    let resolvedId = characterId;

    if (characterId === "random") {
      const manager = ChampionManager.getInstance();
      const unlocked = ["apollo", "diana", "brock", "misty", "red"].filter(
        id => manager.isChampionUnlocked(id)
      );
      if (unlocked.length > 0) {
        resolvedId = unlocked[Math.floor(Math.random() * unlocked.length)];
      } else {
        resolvedId = "apollo";
      }
    }

    if (resolvedId === "apollo") {
      (this.scene as BattleScene).gameData.gender = PlayerGender.MALE;
    } else if (resolvedId === "diana") {
      (this.scene as BattleScene).gameData.gender = PlayerGender.FEMALE;
    }

    this.config.onCharacterSelected(resolvedId);
    this.end();
  }

  private handleCancel(): void {
    if (!this.config.allowCancel) return;
    this.scene.ui.clearText();
    this.scene.ui.setMode(Mode.MESSAGE).then(() => {
      (this.scene as any).clearAllPhaseQueues?.();
      this.scene.pushPhase(new TitlePhase(this.scene, false, true));
      this.end();
    });
  }
}