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