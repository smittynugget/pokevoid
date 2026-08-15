import Phaser from "phaser";
import BattleScene from "../battle-scene";
import { QuantizerCelebi, argbFromRgba, rgbaFromArgb } from "@material/material-color-utilities";

const TRAINER_DUALCOLOR_CLUSTER4_CACHE = new Map<string, number[][]>();

function getSpriteFrameCacheKey(sprite: Phaser.GameObjects.Sprite): string | null {
  const textureKey = sprite.texture?.key;
  const frameName = sprite.frame?.name;
  if (!textureKey || frameName === undefined || frameName === null) return null;
  return `${textureKey}:${frameName}`;
}

function luma(rgba: number[]): number {
  return (rgba[0] * 0.2126) + (rgba[1] * 0.7152) + (rgba[2] * 0.0722);
}

export function clearTrainerDualColorAltBuild(sprite: Phaser.GameObjects.Sprite): void {
  if (!sprite?.pipelineData) return;
  delete sprite.pipelineData["altBuildSpriteColors"];
  delete sprite.pipelineData["altBuildTargetColors"];
  delete sprite.pipelineData["altBuildBlendMode"];
  delete sprite.pipelineData["altBuildInversionFactor"];
}

export function getTrainerSpriteCluster4(scene: BattleScene, sprite: Phaser.GameObjects.Sprite): number[][] | null {
  if (typeof document === "undefined") return null;

  const cacheKey = getSpriteFrameCacheKey(sprite);
  if (!cacheKey) return null;
  const cached = TRAINER_DUALCOLOR_CLUSTER4_CACHE.get(cacheKey);
  if (cached) return cached;

  const frame = sprite.frame;
  const sourceImage = sprite.texture?.getSourceImage() as (HTMLImageElement | HTMLCanvasElement | null);
  if (!frame || !sourceImage) return null;

  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true } as any);
  if (!ctx) return null;

  ctx.drawImage(sourceImage as any, frame.cutX, frame.cutY, frame.width, frame.height, 0, 0, frame.width, frame.height);
  const data = ctx.getImageData(0, 0, frame.width, frame.height).data;

  const pixelColors: number[] = [];
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (!a) continue;
    pixelColors.push(argbFromRgba({ r: data[i], g: data[i + 1], b: data[i + 2], a: 255 }));
  }

  if (!pixelColors.length) return null;

  let paletteColors: Map<number, number> | undefined;
  const originalRandom = Math.random;
  try {
    Math.random = () => Phaser.Math.RND.realInRange(0, 1);
    scene.executeWithSeedOffset(() => {
      paletteColors = QuantizerCelebi.quantize(pixelColors, 4);
    }, 0, "Trainer dualcolor cluster quantization");
  } finally {
    Math.random = originalRandom;
  }

  if (!paletteColors || !paletteColors.size) return null;

  const clusters = Array.from(paletteColors.keys())
    .sort((a, b) => (paletteColors!.get(a)! < paletteColors!.get(b)! ? 1 : -1))
    .map(c => Object.values(rgbaFromArgb(c)));

  let rgbaClusters = clusters.slice(0, 4).map(c => [c[0], c[1], c[2], 255] as number[]);
  if (!rgbaClusters.length) return null;
  while (rgbaClusters.length < 4) {
    const last = rgbaClusters[rgbaClusters.length - 1];
    rgbaClusters.push([last[0], last[1], last[2], 255]);
  }
  rgbaClusters = rgbaClusters.slice(0, 4).sort((a, b) => luma(a) - luma(b));

  TRAINER_DUALCOLOR_CLUSTER4_CACHE.set(cacheKey, rgbaClusters);
  return rgbaClusters;
}

export function applyTrainerDualColorAltBuild(scene: BattleScene, sprite: Phaser.GameObjects.Sprite, corruptedPriority: boolean): void {
  if (!sprite) return;

  const textureKey = sprite.texture?.key ?? "";
  if (textureKey.includes("smitty_trainers") || textureKey.includes("smitom")) {
    clearTrainerDualColorAltBuild(sprite);
    return;
  }

  if (corruptedPriority) {
    if (sprite.pipelineData["altBuildBlendMode"] === "duelmon_cluster4"
        && sprite.pipelineData["altBuildInversionFactor"] === 0.7) {
      return;
    }
    clearTrainerDualColorAltBuild(sprite);
    return;
  }

  if (
    !scene.trainerDualColorRecolorEnabledForRun
    || !scene.trainerDualColorAForRun
    || !scene.trainerDualColorBForRun
  ) {
    clearTrainerDualColorAltBuild(sprite);
    return;
  }

  const sourceClusters = getTrainerSpriteCluster4(scene, sprite);
  if (!sourceClusters) {
    clearTrainerDualColorAltBuild(sprite);
    return;
  }

  const a = scene.trainerDualColorAForRun;
  const b = scene.trainerDualColorBForRun;
  const aRgba = [a[0], a[1], a[2], 255];
  const bRgba = [b[0], b[1], b[2], 255];

  sprite.pipelineData["altBuildSpriteColors"] = sourceClusters;
  sprite.pipelineData["altBuildTargetColors"] = [aRgba, aRgba, bRgba, bRgba];
  sprite.pipelineData["altBuildBlendMode"] = "duelmon_cluster4";
  sprite.pipelineData["altBuildInversionFactor"] = 0.0;
}