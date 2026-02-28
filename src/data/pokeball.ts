import { PokeballType } from "#enums/pokeball";
import BattleScene from "../battle-scene";
import i18next from "i18next";
import { ChampionManager } from "#app/system/champion-manager";
import { PlayableChampionData } from "#app/system/playable-champions";
import { Type, getTypeRgb } from "#app/data/type";

export { PokeballType };

export const MAX_PER_TYPE_POKEBALLS: integer = 99;

export function getPokeballAtlasKey(type: PokeballType): string {
  switch (type) {
  case PokeballType.POKEBALL:
    return "pb";
  case PokeballType.GREAT_BALL:
    return "gb";
  case PokeballType.ULTRA_BALL:
    return "ub";
  case PokeballType.ROGUE_BALL:
    return "rb";
  case PokeballType.MASTER_BALL:
    return "mb";
  case PokeballType.LUXURY_BALL:
    return "lb";
  case PokeballType.TYPE_BALL:
    return "gb";
  case PokeballType.VOID_BALL:
    return "mb";
  default:
    return "pb";
  }
}

export function getPokeballName(type: PokeballType, scene?: BattleScene): string {
  let ret: string;
  switch (type) {
  case PokeballType.POKEBALL:
    ret = i18next.t("pokeball:pokeBall");
    break;
  case PokeballType.GREAT_BALL:
    ret = i18next.t("pokeball:greatBall");
    break;
  case PokeballType.ULTRA_BALL:
    ret = i18next.t("pokeball:ultraBall");
    break;
  case PokeballType.ROGUE_BALL:
    ret = i18next.t("pokeball:rogueBall");
    break;
  case PokeballType.MASTER_BALL:
    ret = i18next.t("pokeball:masterBall");
    break;
  case PokeballType.LUXURY_BALL:
    ret = i18next.t("pokeball:luxuryBall");
    break;
  case PokeballType.TYPE_BALL: {
    ret = i18next.t("pokeball:typeBall", { typeName: "Type" });
    break;
  }
  case PokeballType.VOID_BALL:
    ret = i18next.t("pokeball:voidBall");
    break;
  default:
    ret = i18next.t("pokeball:pokeBall");
    break;
  }
  return ret;
}

export function getPokeballCatchMultiplier(type: PokeballType): number {
  switch (type) {
  case PokeballType.POKEBALL:
    return 1;
  case PokeballType.GREAT_BALL:
    return 1.5;
  case PokeballType.ULTRA_BALL:
    return 2;
  case PokeballType.ROGUE_BALL:
    return 3;
  case PokeballType.MASTER_BALL:
    return -1;
  case PokeballType.LUXURY_BALL:
    return 1;
  case PokeballType.TYPE_BALL:
    return 2;
  case PokeballType.VOID_BALL:
    return -2;
  default:
    return 1;
  }
}

export function getPokeballTintColor(type: PokeballType): number {
  switch (type) {
  case PokeballType.POKEBALL:
    return 0xd52929;
  case PokeballType.GREAT_BALL:
    return 0x94b4de;
  case PokeballType.ULTRA_BALL:
    return 0xe6cd31;
  case PokeballType.ROGUE_BALL:
    return 0xd52929;
  case PokeballType.MASTER_BALL:
    return 0xa441bd;
  case PokeballType.LUXURY_BALL:
    return 0xffde6a;
  case PokeballType.TYPE_BALL:
    return 0xe6cd31;
  case PokeballType.VOID_BALL:
    return 0x1a0a2e;
  default:
    return 0xd52929;
  }
}

export function getActiveChampionData(scene: BattleScene): PlayableChampionData | null {
  try {
    const championId = scene.gameData?.selectedChampionId;
    if (!championId) return null;
    return ChampionManager.getInstance().getChampionData(championId);
  } catch {
    return null;
  }
}

export function getTypeBallTypeName(ballType: PokeballType, scene: BattleScene): string {
  const championData = getActiveChampionData(scene);
  if (!championData) return "Type";
  const targetType = ballType === PokeballType.TYPE_BALL
    ? championData.type1
    : championData.type1;
  return targetType !== undefined && targetType !== Type.UNKNOWN
    ? Type[targetType]
    : "Type";
}

export function getTypeBallTintColor(ballType: PokeballType, scene: BattleScene): number {
  const championData = getActiveChampionData(scene);
  if (!championData) return 0xe6cd31;
  const targetType = ballType === PokeballType.TYPE_BALL
    ? championData.type1
    : championData.type1;
  if (targetType === undefined || targetType === Type.UNKNOWN) return 0xe6cd31;
  const rgb = getTypeRgb(targetType);
  return Phaser.Display.Color.GetColor(rgb[0], rgb[1], rgb[2]);
}

const TYPEBALL_SOURCE_COLOR_CACHE = new Map<string, number[][]>();
const CHAMPION_RECOLOR_TEXTURE_CACHE = new Map<string, string>();

const PB_ALTBUILD_VOIDBALL_SOURCE_COLORS: number[][] = [
  [0x73, 0x10, 0x9C, 0xFF],
  [0x8B, 0x29, 0xAC, 0xFF],
  [0xA4, 0x41, 0xBD, 0xFF],
  [0xBD, 0x5A, 0xCD, 0xFF],
  [0xCF, 0x41, 0x66, 0xFF],
  [0xFF, 0x62, 0x8B, 0xFF],
  [0xFF, 0x94, 0xAC, 0xFF],
];

const ITEMS_ALTBUILD_VOIDBALL_SOURCE_COLORS: number[][] = [
  [0x82, 0x4A, 0xB9, 0xFF],
  [0xB2, 0x31, 0xF5, 0xFF],
  [0xBD, 0x20, 0xA0, 0xFF],
  [0xE8, 0x33, 0xD4, 0xFF],
  [0xFD, 0xC1, 0xF9, 0xFF],
  [0xE3, 0xC5, 0xF4, 0xFF],
];

const DEFAULT_VOIDBALL_RGBA: number[] = [0x2D, 0x14, 0x50, 0xFF];

function getTypeBallSourceColors(sprite: Phaser.GameObjects.Sprite): number[][] | null {
  if (typeof document === "undefined") return null;
  const textureKey = sprite.texture?.key;
  const frameName = sprite.frame?.name;
  if (!textureKey || !frameName) return null;

  const cacheKey = `${textureKey}:${frameName}`;
  if (TYPEBALL_SOURCE_COLOR_CACHE.has(cacheKey)) {
    return TYPEBALL_SOURCE_COLOR_CACHE.get(cacheKey)!;
  }

  const frame = sprite.frame;
  const sourceImage = sprite.texture.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
  if (!frame || !sourceImage) return null;

  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.drawImage(sourceImage as any, frame.cutX, frame.cutY, frame.width, frame.height, 0, 0, frame.width, frame.height);
  const data = ctx.getImageData(0, 0, frame.width, frame.height).data;

  const counts = new Map<string, { rgba: number[]; count: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (!a) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key = `${r},${g},${b}`;
    const existing = counts.get(key);
    if (existing) existing.count++;
    else counts.set(key, { rgba: [r, g, b, 0xFF], count: 1 });
  }

  const isBlueRegion = (rgba: number[]): boolean => {
    const r = rgba[0];
    const g = rgba[1];
    const b = rgba[2];
    const maxRG = Math.max(r, g);
    return (b - maxRG) > 12;
  };

  const colors = Array.from(counts.values())
    .filter((v) => isBlueRegion(v.rgba))
    .sort((a, b) => b.count - a.count)
    .slice(0, 32)
    .map((v) => v.rgba);

  TYPEBALL_SOURCE_COLOR_CACHE.set(cacheKey, colors);
  return colors;
}

function applyAltBuildRecolor(scene: BattleScene, sprite: Phaser.GameObjects.Sprite, sourceColors: number[][], targetRgba: number[], ignoreTimeTint: boolean): void {
  sprite.clearTint();
  if (!(scene as any)?.spritePipeline) {
    sprite.setTintFill(Phaser.Display.Color.GetColor(targetRgba[0], targetRgba[1], targetRgba[2]));
    return;
  }

  sprite.setPipeline((scene as any).spritePipeline, {
    tone: [0.0, 0.0, 0.0, 0.0],
    hasShadow: false,
    ignoreFieldPos: true,
    ignoreTimeTint,
  });
  sprite.pipelineData["altBuildSpriteColors"] = sourceColors;
  sprite.pipelineData["altBuildTargetColors"] = sourceColors.map(() => targetRgba);
  sprite.pipelineData["altBuildBlendMode"] = "grayscale_overlay";
  sprite.pipelineData["altBuildInversionFactor"] = 0.0;
}

export function applyTypeBallRecolor(scene: BattleScene, sprite: Phaser.GameObjects.Sprite, targetType: Type, ignoreTimeTint: boolean = false): void {
  const rgb = getTypeRgb(targetType);
  const targetRgba: number[] = [rgb[0], rgb[1], rgb[2], 0xFF];
  const sourceColors = getTypeBallSourceColors(sprite);
  if (!sourceColors || !sourceColors.length) {
    sprite.clearTint();
    sprite.setTintFill(Phaser.Display.Color.GetColor(targetRgba[0], targetRgba[1], targetRgba[2]));
    return;
  }
  applyAltBuildRecolor(scene, sprite, sourceColors, targetRgba, ignoreTimeTint);
}

export function applyVoidBallRecolor(scene: BattleScene, sprite: Phaser.GameObjects.Sprite, ignoreTimeTint: boolean = false, voidRgba: number[] = DEFAULT_VOIDBALL_RGBA): void {
  const sourceColors = sprite.texture?.key === "items"
    ? ITEMS_ALTBUILD_VOIDBALL_SOURCE_COLORS
    : PB_ALTBUILD_VOIDBALL_SOURCE_COLORS;
  applyAltBuildRecolor(scene, sprite, sourceColors, voidRgba, ignoreTimeTint);
}

export function applyChampionSpriteRecolor(scene: BattleScene, sprite: Phaser.GameObjects.Sprite, primaryType: Type, ignoreTimeTint: boolean = false, isFemale: boolean = false, secondaryType?: Type): void {
    console.log("[ChampRecolor] applyChampionSpriteRecolor called, primaryType:", primaryType, "secondaryType:", secondaryType, "isFemale:", isFemale);
    try {
        const pName = (Type as any)[primaryType] ?? `${primaryType}`;
        const sName = (secondaryType !== undefined && secondaryType !== null)
            ? ((Type as any)[secondaryType as any] ?? `${secondaryType}`)
            : "NONE";
        console.log("[ChampRecolor] typeNames primary/secondary:", pName, sName);
    } catch {}
    if (typeof document === "undefined") { console.log("[ChampRecolor] BAIL: no document"); return; }
    const primaryRgb = getTypeRgb(primaryType);
    const secondaryRgb = (secondaryType !== undefined && secondaryType !== null && secondaryType !== Type.UNKNOWN)
        ? getTypeRgb(secondaryType)
        : null;
    console.log("[ChampRecolor] rgb primary/secondary:", primaryRgb, secondaryRgb);
    if (!primaryRgb) { console.log("[ChampRecolor] BAIL: no primary rgb"); return; }
    const effectiveSecondaryRgb = secondaryRgb ?? primaryRgb;

    const frame = sprite.frame;
    const sourceImage = sprite.texture?.getSourceImage() as HTMLImageElement | HTMLCanvasElement | null;
    console.log("[ChampRecolor] frame:", !!frame, "sourceImage:", !!sourceImage, "frame.width:", frame?.width, "frame.height:", frame?.height, "textureKey:", sprite.texture?.key);
    if (!frame || !sourceImage) { console.log("[ChampRecolor] BAIL: no frame or sourceImage"); return; }

    const baseTextureKey = sprite.texture?.key ?? "";
    const baseFrameName = `${sprite.frame?.name ?? ""}`;
    const cacheKey = `${baseTextureKey}:${baseFrameName}:${primaryType}:${secondaryType ?? "X"}:${isFemale ? "F" : "M"}`;
    const cachedTextureKey = CHAMPION_RECOLOR_TEXTURE_CACHE.get(cacheKey);
    if (cachedTextureKey && (scene.textures as any)?.exists?.(cachedTextureKey)) {
        try {
            sprite.setTexture(cachedTextureKey);
            if ((scene as any)?.spritePipeline) {
                sprite.setPipeline((scene as any).spritePipeline, {
                    tone: [0.0, 0.0, 0.0, 0.0],
                    hasShadow: false,
                    ignoreFieldPos: true,
                    ignoreTimeTint,
                });
                sprite.pipelineData["altBuildSpriteColors"] = [[0, 0, 0, 0]];
                sprite.pipelineData["altBuildTargetColors"] = [[0, 0, 0, 0]];
            }
            sprite.clearTint();
        } catch {}
        console.log("[ChampRecolor] CACHE HIT:", cachedTextureKey, "cacheKey:", cacheKey);
        return;
    }
    console.log("[ChampRecolor] CACHE MISS cacheKey:", cacheKey);

    const canvas = document.createElement("canvas");
    canvas.width = frame.width;
    canvas.height = frame.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true } as any);
    if (!ctx) { console.log("[ChampRecolor] BAIL: no canvas context"); return; }

    ctx.drawImage(sourceImage as any, frame.cutX, frame.cutY, frame.width, frame.height, 0, 0, frame.width, frame.height);
    const imageData = ctx.getImageData(0, 0, frame.width, frame.height);
    const data = imageData.data;

    const w = frame.width || 1;
    const h = frame.height || 1;

    type ColorCount = { r: number; g: number; b: number; count: number };
    const bump = (m: Map<string, ColorCount>, r: number, g: number, b: number): void => {
        const key = `${r},${g},${b}`;
        const prev = m.get(key);
        if (prev) {
            prev.count++;
        } else {
            m.set(key, { r, g, b, count: 1 });
        }
    };
    const sumCounts = (m: Map<string, ColorCount>): number => {
        let s = 0;
        for (const v of m.values()) s += v.count;
        return s;
    };
    const top = (m: Map<string, ColorCount>, n: number): Array<[number, number, number, number]> => {
        const arr = Array.from(m.values());
        arr.sort((a, b) => b.count - a.count);
        return arr.slice(0, n).map(v => [v.r, v.g, v.b, v.count]);
    };
    const toHex = (r: number, g: number, b: number): string =>
        `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
    const fmtTop = (m: Map<string, ColorCount>, n: number): string =>
        top(m, n).map(([r, g, b, c]) => `${toHex(r, g, b)}(${r},${g},${b})x${c}`).join(", ");

    type Box = { count: number; minX: number; minY: number; maxX: number; maxY: number; sumX: number; sumY: number };
    const newBox = (): Box => ({ count: 0, minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY, sumX: 0, sumY: 0 });
    const bumpBox = (b: Box, x: number, y: number): void => {
        b.count++;
        b.sumX += x;
        b.sumY += y;
        if (x < b.minX) b.minX = x;
        if (y < b.minY) b.minY = y;
        if (x > b.maxX) b.maxX = x;
        if (y > b.maxY) b.maxY = y;
    };
    const fmtBox = (b: Box): string => {
        if (!b.count) return "none";
        const avgX = b.sumX / b.count;
        const avgY = b.sumY / b.count;
        const denomX = Math.max(1, w - 1);
        const denomY = Math.max(1, h - 1);
        return `px=[${b.minX},${b.minY}]..[${b.maxX},${b.maxY}] avg=[${avgX.toFixed(1)},${avgY.toFixed(1)}] normAvg=[${(avgX / denomX).toFixed(2)},${(avgY / denomY).toFixed(2)}]`;
    };

    const unmatchedBallColors = new Map<string, ColorCount>();
    const unmatchedTopColors = new Map<string, ColorCount>();
    const unmatchedBottomColors = new Map<string, ColorCount>();
    const unmatchedShoeColors = new Map<string, ColorCount>();
    const skinExcludedColors = new Map<string, ColorCount>();
    const ballUnrecoloredReddishColors = new Map<string, ColorCount>();
    const shoeUnrecoloredReddishColors = new Map<string, ColorCount>();
    const topUnrecoloredWarmColors = new Map<string, ColorCount>();

    const ballCandidateBox = newBox();
    const ballMatchedBox = newBox();
    const shoeCandidateBox = newBox();
    const shoeMatchedBox = newBox();
    const ballUnrecoloredReddishBox = newBox();
    const shoeUnrecoloredReddishBox = newBox();
    const topUnrecoloredWarmBox = newBox();

    const isSkinPixel = (r: number, g: number, b: number): boolean => {
        if (r < 160 || g < 110 || b < 80) return false;
        if (!(r > g && g > b)) return false;
        const rg = r - g;
        const gb = g - b;
        if (rg < 20 || rg > 90) return false;
        if (gb < 10 || gb > 70) return false;
        return true;
    };

    const isRedPixel = (r: number, g: number, b: number): boolean =>
        r > 95 && (r - g) > 20 && (r - b) > 20 && Math.abs(g - b) < 40;

    const isBallRedPixel = (r: number, g: number, b: number): boolean =>
        (r > 110 && (r - g) > 20 && (r - b) > 20 && Math.abs(g - b) < 80)
        || (r >= 40 && (r - Math.max(g, b)) >= 15 && (r - g) >= 20 && (r - b) >= 20);

    const isRedCandidate = (r: number, g: number, b: number): boolean =>
        r > 110 && (r - g) > 10 && (r - b) > 10;

    const isReddishLoose = (r: number, g: number, b: number): boolean =>
        r > g && r > b && r >= 40;

    const isWarmLoose = (r: number, g: number, b: number): boolean =>
        r >= 80 && g >= 60 && (r - b) >= 20 && (g - b) >= 10;

    const isApolloJacketYellow = (r: number, g: number, b: number): boolean =>
        (r > 160 && g > 110 && b < 130 && r > g)
        || (r > 120 && g > 90 && b > 40 && (r - b) > 30 && (g - b) > 10 && (r - g) < 90)
        || (r > 135 && g > 130 && b > 110 && (g - b) > 10 && (r - b) > 10)
        || (r >= 80 && g >= 60 && (r - b) >= 20 && (g - b) >= 10 && (r - g) < 90);

    const isApolloJacketCandidate = (r: number, g: number, b: number): boolean =>
        r > 130 && g > 95 && (g - b) > 10 && (r - b) > 10 && (r - g) < 90;

    const isApolloJeansBlue = (r: number, g: number, b: number): boolean => {
        const maxRG = Math.max(r, g);
        return b > 70 && (b - maxRG) > 0;
    };

    const isBlueCandidate = (r: number, g: number, b: number): boolean =>
        b > 40 && (b - Math.max(r, g)) > 0;

    const isDianaSweater = (r: number, g: number, b: number): boolean =>
        r > 160 && (r - g) > 40 && g > 80 && b > (g - 20);

    const isDianaPants = (r: number, g: number, b: number): boolean => {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        if (max < 35) return false;
        if (max > 170) return false;
        if (delta > 40) return false;
        return true;
    };

    const isDianaPantsCandidate = (r: number, g: number, b: number): boolean => {
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const delta = max - min;
        if (max < 25) return false;
        if (max > 210) return false;
        if (delta > 90) return false;
        return true;
    };

    const pr = primaryRgb[0] / 255;
    const pg = primaryRgb[1] / 255;
    const pb = primaryRgb[2] / 255;
    const sr = effectiveSecondaryRgb[0] / 255;
    const sg = effectiveSecondaryRgb[1] / 255;
    const sb = effectiveSecondaryRgb[2] / 255;
    const overlay = (gray: number, fg: number): number => gray <= 0.5 ? (2.0 * gray * fg) : (1.0 - 2.0 * (1.0 - gray) * (1.0 - fg));

    let totalPixels = 0;
    let skinPixels = 0;
    let shoePixels = 0;
    let matchedBallPixels = 0;
    let matchedTopPixels = 0;
    let matchedBottomPixels = 0;
    for (let i = 0; i < data.length; i += 4) {
        const a = data[i + 3];
        if (!a) continue;
        totalPixels++;
        const r = data[i], g = data[i + 1], b = data[i + 2];

        const p = i / 4;
        const x = p % w;
        const y = Math.floor(p / w);
        const yNorm = h > 1 ? (y / (h - 1)) : 0;
        const xNorm = w > 1 ? (x / (w - 1)) : 0;

        if (isSkinPixel(r, g, b)) {
            skinPixels++;
            bump(skinExcludedColors, r, g, b);
            continue;
        }

        let shouldRecolor = false;
        let useSecondary = false;
        const inShoeRoi = (yNorm >= 0.92);
        const inHandBallRoi = (yNorm > 0.18 && yNorm < 0.85 && xNorm < 0.45);
        const inBeltBallRoi = (yNorm > 0.48 && yNorm < 0.62);
        const inBallRoi = inHandBallRoi || inBeltBallRoi;
        const redCandidate = isRedCandidate(r, g, b);

        if (inShoeRoi && isRedPixel(r, g, b)) {
            shoePixels++;
            bumpBox(shoeMatchedBox, x, y);
            bumpBox(shoeCandidateBox, x, y);
            shouldRecolor = true;
            useSecondary = false;
        } else if (inBallRoi && isBallRedPixel(r, g, b)) {
            matchedBallPixels++;
            bumpBox(ballMatchedBox, x, y);
            bumpBox(ballCandidateBox, x, y);
            shouldRecolor = true;
            useSecondary = true;
        } else if (!isFemale) {
            if (yNorm > 0.25 && yNorm < 0.70 && isApolloJacketYellow(r, g, b)) {
                matchedTopPixels++;
                shouldRecolor = true;
                useSecondary = false;
            } else if (yNorm >= 0.52 && yNorm < 0.92 && isApolloJeansBlue(r, g, b)) {
                matchedBottomPixels++;
                shouldRecolor = true;
                useSecondary = true;
            }
        } else {
            if (yNorm > 0.25 && yNorm < 0.70 && isDianaSweater(r, g, b)) {
                matchedTopPixels++;
                shouldRecolor = true;
                useSecondary = false;
            } else if (yNorm >= 0.60 && yNorm < 0.92 && isDianaPants(r, g, b)) {
                matchedBottomPixels++;
                shouldRecolor = true;
                useSecondary = true;
            }
        }

        if (!shouldRecolor) {
            if (inShoeRoi) {
                if (redCandidate && !isRedPixel(r, g, b)) {
                    bumpBox(shoeCandidateBox, x, y);
                    bump(unmatchedShoeColors, r, g, b);
                }
                if (isReddishLoose(r, g, b)) {
                    bumpBox(shoeUnrecoloredReddishBox, x, y);
                    bump(shoeUnrecoloredReddishColors, r, g, b);
                }
            } else if (inBallRoi) {
                if (redCandidate && !isBallRedPixel(r, g, b)) {
                    bumpBox(ballCandidateBox, x, y);
                    bump(unmatchedBallColors, r, g, b);
                }
                if (isReddishLoose(r, g, b)) {
                    bumpBox(ballUnrecoloredReddishBox, x, y);
                    bump(ballUnrecoloredReddishColors, r, g, b);
                }
            } else if (!isFemale) {
                if (yNorm > 0.25 && yNorm < 0.70) {
                    if (isApolloJacketCandidate(r, g, b) && !isApolloJacketYellow(r, g, b)) bump(unmatchedTopColors, r, g, b);
                    if (isWarmLoose(r, g, b)) {
                        bumpBox(topUnrecoloredWarmBox, x, y);
                        bump(topUnrecoloredWarmColors, r, g, b);
                    }
                } else if (yNorm >= 0.52 && yNorm < 0.92) {
                    if (isBlueCandidate(r, g, b) && !isApolloJeansBlue(r, g, b)) bump(unmatchedBottomColors, r, g, b);
                }
            } else {
                if (yNorm > 0.25 && yNorm < 0.70) {
                    if (isRedCandidate(r, g, b) && !isDianaSweater(r, g, b)) bump(unmatchedTopColors, r, g, b);
                } else if (yNorm >= 0.60 && yNorm < 0.92) {
                    if (isDianaPantsCandidate(r, g, b) && !isDianaPants(r, g, b)) bump(unmatchedBottomColors, r, g, b);
                }
            }
            continue;
        }

        const gray = (r + g + b) / (3 * 255);
        const fr = useSecondary ? sr : pr;
        const fg = useSecondary ? sg : pg;
        const fb = useSecondary ? sb : pb;
        data[i] = Math.max(0, Math.min(255, Math.round(overlay(gray, fr) * 255)));
        data[i + 1] = Math.max(0, Math.min(255, Math.round(overlay(gray, fg) * 255)));
        data[i + 2] = Math.max(0, Math.min(255, Math.round(overlay(gray, fb) * 255)));
    }

    const matchedPixels = matchedBallPixels + matchedTopPixels + matchedBottomPixels + shoePixels;
    console.log(
        "[ChampRecolor] totalPixels:", totalPixels,
        "matchedPixels:", matchedPixels,
        "skinPixels:", skinPixels,
        "shoePixels:", shoePixels,
        "ball/top/bottom:", matchedBallPixels, matchedTopPixels, matchedBottomPixels,
        "matchRate:", totalPixels ? (matchedPixels / totalPixels * 100).toFixed(1) + "%" : "0%"
    );
    const topLabel = isFemale ? "sweater" : "jacket";
    const bottomLabel = isFemale ? "pants" : "jeans";
    const unmatchedBallCount = sumCounts(unmatchedBallColors);
    const unmatchedTopCount = sumCounts(unmatchedTopColors);
    const unmatchedBottomCount = sumCounts(unmatchedBottomColors);
    const unmatchedShoeCount = sumCounts(unmatchedShoeColors);
    const fmtPct = (num: number, den: number): string => den ? `${(num / den * 100).toFixed(1)}%` : "0%";
    const ballCandidates = matchedBallPixels + unmatchedBallCount;
    const topCandidates = matchedTopPixels + unmatchedTopCount;
    const bottomCandidates = matchedBottomPixels + unmatchedBottomCount;
    const shoeCandidates = shoePixels + unmatchedShoeCount;

    console.log(
        "[ChampRecolor] REGION_MATCH",
        `ball=${matchedBallPixels}/${ballCandidates}(${fmtPct(matchedBallPixels, ballCandidates)})`,
        `${topLabel}=${matchedTopPixels}/${topCandidates}(${fmtPct(matchedTopPixels, topCandidates)})`,
        `${bottomLabel}=${matchedBottomPixels}/${bottomCandidates}(${fmtPct(matchedBottomPixels, bottomCandidates)})`,
        `shoes=${shoePixels}/${shoeCandidates}(${fmtPct(shoePixels, shoeCandidates)})`
    );
    console.log("[ChampRecolor] REGION_BOUNDS ball candidate:", fmtBox(ballCandidateBox), "matched:", fmtBox(ballMatchedBox));
    console.log("[ChampRecolor] REGION_BOUNDS shoes candidate:", fmtBox(shoeCandidateBox), "matched:", fmtBox(shoeMatchedBox));
    console.log("[ChampRecolor] REGION_BOUNDS ball unrecolored reddish:", fmtBox(ballUnrecoloredReddishBox));
    console.log("[ChampRecolor] REGION_BOUNDS shoes unrecolored reddish:", fmtBox(shoeUnrecoloredReddishBox));
    console.log("[ChampRecolor] REGION_BOUNDS jacket unrecolored warm:", fmtBox(topUnrecoloredWarmBox));

    console.log("[ChampRecolor] AUDIT ball candidates:", ballCandidates, "unmatched:", unmatchedBallCount, "top10:", fmtTop(unmatchedBallColors, 10));
    console.log("[ChampRecolor] AUDIT", topLabel, "candidates:", topCandidates, "unmatched:", unmatchedTopCount, "top10:", fmtTop(unmatchedTopColors, 10));
    console.log("[ChampRecolor] AUDIT", bottomLabel, "candidates:", bottomCandidates, "unmatched:", unmatchedBottomCount, "top10:", fmtTop(unmatchedBottomColors, 10));
    console.log("[ChampRecolor] AUDIT shoes candidates:", shoeCandidates, "unmatched:", unmatchedShoeCount, "top10:", fmtTop(unmatchedShoeColors, 10));
    console.log("[ChampRecolor] AUDIT skin excluded:", skinPixels, "top10:", fmtTop(skinExcludedColors, 10));
    console.log("[ChampRecolor] AUDIT ball unrecolored reddish top10:", fmtTop(ballUnrecoloredReddishColors, 10));
    console.log("[ChampRecolor] AUDIT shoes unrecolored reddish top10:", fmtTop(shoeUnrecoloredReddishColors, 10));
    console.log("[ChampRecolor] AUDIT jacket unrecolored warm top10:", fmtTop(topUnrecoloredWarmColors, 10));
    if (!matchedPixels) { console.log("[ChampRecolor] BAIL: no matched pixels"); return; }

    ctx.putImageData(imageData, 0, 0);

    const safeBase = baseTextureKey.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeFrame = baseFrameName.replace(/[^a-zA-Z0-9_-]/g, "_");
    const canvasTextureKey = `champ_recolor_${safeBase}_${safeFrame}_p${primaryType}_s${secondaryType ?? "X"}_${isFemale ? "f" : "m"}`;

    let added = false;
    try {
        const tm: any = scene.textures;
        if (tm?.exists?.(canvasTextureKey)) {
            added = true;
        } else if (typeof tm?.addCanvas === "function") {
            tm.addCanvas(canvasTextureKey, canvas);
            added = true;
        } else if (typeof tm?.createCanvas === "function") {
            const tex = tm.createCanvas(canvasTextureKey, frame.width, frame.height);
            const tctx = tex?.getContext?.();
            if (tctx) {
                tctx.drawImage(canvas, 0, 0);
                tex?.refresh?.();
                added = true;
            }
        }
    } catch (e) {
        console.log("[ChampRecolor] BAIL: texture add error", e);
        return;
    }

    if (!added) { console.log("[ChampRecolor] BAIL: unable to add canvas texture"); return; }

    CHAMPION_RECOLOR_TEXTURE_CACHE.set(cacheKey, canvasTextureKey);

    try {
        sprite.setTexture(canvasTextureKey);
        if ((scene as any)?.spritePipeline) {
            sprite.setPipeline((scene as any).spritePipeline, {
                tone: [0.0, 0.0, 0.0, 0.0],
                hasShadow: false,
                ignoreFieldPos: true,
                ignoreTimeTint,
            });
            sprite.pipelineData["altBuildSpriteColors"] = [[0, 0, 0, 0]];
            sprite.pipelineData["altBuildTargetColors"] = [[0, 0, 0, 0]];
        }
        sprite.clearTint();
    } catch {}

    console.log("[ChampRecolor] SUCCESS: Applied canvas recolor texture:", canvasTextureKey);
}

export function doPokeballBounceAnim(scene: BattleScene, pokeball: Phaser.GameObjects.Sprite, y1: number, y2: number, baseBounceDuration: integer, callback: Function) {
  let bouncePower = 1;
  let bounceYOffset = y1;
  let bounceY = y2;
  const yd = y2 - y1;

  const doBounce = () => {
    scene.tweens.add({
      targets: pokeball,
      y: y2,
      duration: bouncePower * baseBounceDuration,
      ease: "Cubic.easeIn",
      onComplete: () => {
        scene.playSound("se/pb_bounce_1", { volume: bouncePower });

        bouncePower = bouncePower > 0.01 ? bouncePower * 0.5 : 0;

        if (bouncePower) {
          bounceYOffset = yd * bouncePower;
          bounceY = y2 - bounceYOffset;

          scene.tweens.add({
            targets: pokeball,
            y: bounceY,
            duration: bouncePower * baseBounceDuration,
            ease: "Cubic.easeOut",
            onComplete: () => doBounce()
          });
        } else if (callback) {
          callback();
        }
      }
    });
  };

  doBounce();
}