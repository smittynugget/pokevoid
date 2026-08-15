import BattleScene from "../battle-scene";
import { Type, getTypeRgb } from "../data/type";
import Pokemon from "../field/pokemon";
import { TypeSwitcherModifier } from "../modifier/modifier";
import * as Utils from "../utils";
import { QuantizerCelebi, argbFromRgba, rgbaFromArgb } from "@material/material-color-utilities";

export type IconPaletteInfo = {
  uniqueCount: number;
  top32: number[][];
  cluster4: number[][];
};

const ICON_PALETTE_CACHE = new Map<string, IconPaletteInfo>();

export function getCachedIconPalette(scene: BattleScene, sprite: Phaser.GameObjects.Sprite): IconPaletteInfo | null {
  if (typeof document === "undefined") return null;
  const textureKey = sprite.texture?.key;
  const frameName = sprite.frame?.name;
  if (!textureKey || !frameName) return null;

  const cacheKey = `${textureKey}:${frameName}`;
  const cached = ICON_PALETTE_CACHE.get(cacheKey);
  if (cached) return cached;

  const frame = sprite.frame;
  const sourceImage = sprite.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
  if (!frame || !sourceImage) return null;

  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true } as any);
  if (!ctx) return null;

  ctx.drawImage(sourceImage as any, frame.cutX, frame.cutY, frame.width, frame.height, 0, 0, frame.width, frame.height);
  const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
  const data = imageData.data;

  const counts = new Map<number, number>();
  const pixelColors: number[] = [];

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (!a) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = (r << 16) | (g << 8) | b;
    counts.set(key, (counts.get(key) || 0) + 1);
    pixelColors.push(argbFromRgba({ r, g, b, a }));
  }

  if (!counts.size) return null;

  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const top32 = sorted.slice(0, 32).map(([k]) => [ (k >> 16) & 255, (k >> 8) & 255, k & 255, 255 ]);

  let cluster4: number[][] = top32.slice(0, 4);

  if (pixelColors.length) {
    let paletteColors: Map<number, number> | undefined;
    const originalRandom = Math.random;
    Math.random = () => Phaser.Math.RND.realInRange(0, 1);
    try {
      scene.executeWithSeedOffset(() => {
        paletteColors = QuantizerCelebi.quantize(pixelColors, 4);
      }, 0, "Type switcher icon palette quantization");
    } finally {
      Math.random = originalRandom;
    }

    if (paletteColors && paletteColors.size) {
      const quantizedPalette = Array.from(paletteColors.keys())
        .sort((a, b) => (paletteColors!.get(a)! < paletteColors!.get(b)! ? 1 : -1))
        .map((c) => Object.values(rgbaFromArgb(c)));
      cluster4 = quantizedPalette.slice(0, 4).map((c) => [c[0], c[1], c[2], 255]);
    }
  }

  const info: IconPaletteInfo = {
    uniqueCount: counts.size,
    top32,
    cluster4: cluster4.length ? cluster4 : top32.slice(0, 4),
  };

  ICON_PALETTE_CACHE.set(cacheKey, info);
  return info;
}

export function applyTypeSwitcherIconRecolor(
  scene: BattleScene,
  pokemon: Pokemon,
  icon: Phaser.GameObjects.Sprite,
  ignoreOverride: boolean
): void {
  const ts = scene.findModifier(
    (m) => m instanceof TypeSwitcherModifier && (m as TypeSwitcherModifier).pokemonId === pokemon.id,
    pokemon.isPlayer()
  ) as TypeSwitcherModifier | undefined;

  if (!ts) {
    icon.resetPipeline();
    icon.clearTint();
    return;
  }

  const targetType = ts.newPrimaryType ?? ts.newSecondaryType;
  if (targetType === null || targetType === undefined || targetType < 0) {
    icon.resetPipeline();
    icon.clearTint();
    return;
  }

  const rgb = getTypeRgb(targetType as Type);
  if (!rgb) {
    icon.resetPipeline();
    icon.clearTint();
    return;
  }

  const targetPaletteRgba: number[][] = [
    [Math.round(rgb[0] * 0.25), Math.round(rgb[1] * 0.25), Math.round(rgb[2] * 0.25), 255],
    [Math.round(rgb[0] * 0.50), Math.round(rgb[1] * 0.50), Math.round(rgb[2] * 0.50), 255],
    [Math.round(rgb[0] * 0.78), Math.round(rgb[1] * 0.78), Math.round(rgb[2] * 0.78), 255],
    [rgb[0], rgb[1], rgb[2], 255],
  ];

  const tintColor = Phaser.Display.Color.GetColor(rgb[0], rgb[1], rgb[2]);
  const paletteInfo = getCachedIconPalette(scene, icon);
  const hasPipeline = !!(scene as any)?.spritePipeline;

  if (!hasPipeline || !paletteInfo) {
    icon.resetPipeline();
    icon.clearTint();
    icon.setTintFill(tintColor);
    return;
  }

  const forceCluster4 =
    pokemon.getSpeciesForm(ignoreOverride).generation === 20
    || pokemon.isGlitchOrSmittyForm();

  const useCluster4 = forceCluster4 || paletteInfo.uniqueCount > 32;

  let sourceColors: number[][];
  let targetColors: number[][];

  if (useCluster4) {
    sourceColors = paletteInfo.cluster4.slice(0, 4);
    targetColors = targetPaletteRgba.slice(0, 4);
  } else {
    sourceColors = paletteInfo.top32;
    const clusters = paletteInfo.cluster4.slice(0, 4);
    const easeFunc = Phaser.Tweens.Builders.GetEaseFunction("Cubic.easeIn");
    targetColors = sourceColors.map((sc) => {
      const deltas = clusters.map((c) => Utils.deltaRgb(sc as any, c as any));
      const delta = Math.min(...deltas);
      const idx = Math.min(deltas.findIndex((d) => d === delta), targetPaletteRgba.length - 1);
      const t = Math.min(delta / 255, 1);
      const ratio = easeFunc(t);
      const out = [0, 0, 0, sc[3]];
      for (let i = 0; i < 3; i++) {
        out[i] = Math.round((sc[i] * ratio) + (targetPaletteRgba[idx][i] * (1 - ratio)));
      }
      return out;
    });
  }

  icon.clearTint();
  icon.setPipeline((scene as any).spritePipeline, {
    tone: [0.0, 0.0, 0.0, 0.0],
    hasShadow: false,
    ignoreFieldPos: true,
    ignoreTimeTint: true,
  });
  icon.pipelineData["altBuildSpriteColors"] = sourceColors;
  icon.pipelineData["altBuildTargetColors"] = targetColors;
  icon.pipelineData["altBuildBlendMode"] = useCluster4 ? "duelmon_cluster4" : "grayscale_overlay";
  icon.pipelineData["altBuildInversionFactor"] = 0.0;
}