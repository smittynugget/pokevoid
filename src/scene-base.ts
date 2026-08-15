import { CANVAS_SCALE, GAME_HEIGHT, GAME_WIDTH, LOGICAL_HEIGHT, LOGICAL_WIDTH, fieldUIBottomLocalY, logicalFromCanvas, uiTopEdgeY } from "./canvas-coords";

export const legacyCompatibleImages: string[] = [];

export class SceneBase extends Phaser.Scene {
  public readonly scaledCanvas = {
    width: LOGICAL_WIDTH,
    height: LOGICAL_HEIGHT
  };
  constructor(config?: string | Phaser.Types.Scenes.SettingsConfig) {
    super(config);
  }

  get logicalWidth(): number {
    return this.scaledCanvas.width;
  }

  get logicalHeight(): number {
    return this.scaledCanvas.height;
  }

  getCanvasLogicalWidth(): number {
    return logicalFromCanvas(this.game.canvas.width);
  }

  getCanvasLogicalHeight(): number {
    return logicalFromCanvas(this.game.canvas.height);
  }

  getFieldUIBottomLocalY(): number {
    return fieldUIBottomLocalY(this.getCanvasLogicalHeight());
  }

  getUiTopEdgeY(multiplier: number = -1): number {
    return uiTopEdgeY(multiplier, this.getCanvasLogicalHeight());
  }

  get canvasScale(): number {
    return CANVAS_SCALE;
  }

  get gameWidth(): number {
    return GAME_WIDTH;
  }

  get gameHeight(): number {
    return GAME_HEIGHT;
  }

  getCachedUrl(url: string): string {
    return url;
  }

  loadImage(key: string, folder: string, filename?: string) {
    if (!filename) {
      filename = `${key}.png`;
    }
    const path = folder ? `images/${folder}/${filename}` : `images/${filename}`;
    this.load.image(key, this.getCachedUrl(path));
  }

  loadSpritesheet(key: string, folder: string, size: integer, filename?: string) {
    if (!filename) {
      filename = `${key}.png`;
    }
    const path = folder ? `images/${folder}/${filename}` : `images/${filename}`;
    this.load.spritesheet(key, this.getCachedUrl(path), { frameWidth: size, frameHeight: size });
  }

  loadAtlas(key: string, folder: string, filenameRoot?: string) {
    if (!filenameRoot) {
      filenameRoot = key;
    }
    if (folder) {
      folder += "/";
    }
    this.load.atlas(key, this.getCachedUrl(`images/${folder}${filenameRoot}.png`), this.getCachedUrl(`images/${folder}${filenameRoot}.json`));
  }

  loadSe(key: string, folder?: string, filenames?: string | string[]) {
    if (!filenames) {
      filenames = `${key}.wav`;
    }
    if (!folder) {
      folder = "se/";
    } else {
      folder += "/";
    }
    if (!Array.isArray(filenames)) {
      filenames = [ filenames ];
    }
    for (const f of filenames as string[]) {
      this.load.audio(folder+key, this.getCachedUrl(`audio/${folder}${f}`));
    }
  }

  loadBgm(key: string, filename?: string) {
    if (!filename) {
      filename = `${key}.mp3`;
    }
    this.load.audio(key, this.getCachedUrl(`audio/bgm/${filename}`));
  }
}