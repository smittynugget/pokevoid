import BattleScene from "#app/battle-scene";
import { BattleStat } from "#app/data/battle-stat";
import Pokemon from "#app/field/pokemon";
import { tweakCopyToClipboard } from "#app/ui/tweak/tweak-meta-types";

export type StatAnimDirection = "up" | "down";

export interface StatAnimOffsets {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StatAnimLayout {
  tileX: number;
  tileY: number;
  tileWidth: number;
  tileHeight: number;
  spriteColor: string;
  originX: number;
  originY: number;
  isGen20: boolean;
  statScale: number;
  tweenYDelta: number;
  tweenSign: "-" | "+";
  boundsRect: Phaser.Geom.Rectangle;
}

const ZERO: StatAnimOffsets = { x: 0, y: 0, w: 0, h: 0 };

const _offsets = {
  player: { up: { ...ZERO }, down: { ...ZERO } },
  enemy: { up: { ...ZERO }, down: { ...ZERO } },
};

let _previewHandle: StatAnimPreviewHandle | null = null;
let _boundsGfx: Phaser.GameObjects.Graphics | null = null;

export interface StatAnimPreviewHandle {
  sprite: Phaser.GameObjects.TileSprite;
  pokemon: Pokemon;
  side: "player" | "enemy";
  direction: StatAnimDirection;
  maskCopy: Phaser.GameObjects.Sprite | null;
}

export function computeStatAnimLayout(
  scene: BattleScene,
  pokemon: Pokemon,
  direction: StatAnimDirection,
  extraOffsets?: StatAnimOffsets,
): StatAnimLayout {
  const isUp = direction === "up";
  const isPlayer = pokemon.isPlayer();
  const isGen20 = pokemon.getSpeciesForm().generation === 20;
  const side = isPlayer ? "player" : "enemy";
  const bank = _offsets[side][direction];
  const ox = bank.x + (extraOffsets?.x ?? 0);
  const oy = bank.y + (extraOffsets?.y ?? 0);
  const ow = bank.w + (extraOffsets?.w ?? 0);
  const oh = bank.h + (extraOffsets?.h ?? 0);

  let tileX: number;
  let tileY: number;
  let tileWidth: number;
  let tileHeight: number;
  let tweenYDelta: number;

  if (isGen20) {
    const sprite = pokemon.getSprite();
    const bounds = sprite.getBounds();
    const duelmonChevronMult = 8;
    tileX = bounds.centerX;
    tileY = isUp ? bounds.y + bounds.height + bounds.height * 2 : bounds.y - bounds.height * 2;
    tileWidth = bounds.width * duelmonChevronMult;
    tileHeight = bounds.height * 2 * duelmonChevronMult;
    tweenYDelta = 160 * 6;
  } else {
    const scale = pokemon.getSpriteScale() * scene.field.scale;
    tileX = (isPlayer ? 106 : 236) * scale;
    tileY = ((isPlayer ? 148 : 84) + (isUp ? 160 : 0)) * scale;
    tileWidth = 156 * scale;
    tileHeight = 316 * scale;
    tweenYDelta = 160 * 6;
  }

  tileX += ox;
  tileY += oy;
  tileWidth += ow;
  tileHeight += oh;

  const spriteColor = isUp
    ? BattleStat[BattleStat.ATK].toLowerCase()
    : BattleStat[BattleStat.SPD].toLowerCase();

  const originX = 0.5;
  let originY: number;
  if (pokemon.isGlitchOrSmittyForm?.()) {
    originY = 0.5;
  } else if (isGen20) {
    originY = isUp ? 1 : 0;
  } else {
    originY = 1;
  }

  const statScale = isGen20 ? 6 : 6;
  const displayW = tileWidth * statScale;
  const displayH = tileHeight * statScale;
  const boundsRect = new Phaser.Geom.Rectangle(
    tileX - displayW * originX,
    tileY - displayH * originY,
    displayW,
    displayH,
  );

  return {
    tileX, tileY, tileWidth, tileHeight,
    spriteColor, originX, originY,
    isGen20, statScale, tweenYDelta,
    tweenSign: isUp ? "-" : "+",
    boundsRect,
  };
}

export function isStatAnimAsset(name: string): boolean {
  return /^(Player|Enemy)StatAnim(Up|Down)$/.test(name);
}

export function parseStatAnimAsset(name: string): { side: "player" | "enemy"; direction: StatAnimDirection } {
  return {
    side: name.startsWith("Player") ? "player" : "enemy",
    direction: name.endsWith("Up") ? "up" : "down",
  };
}

export const StatAnimTweakUtils = {
  getOffsets(side: "player" | "enemy", direction: StatAnimDirection): StatAnimOffsets {
    return _offsets[side][direction];
  },

  applyInput(side: "player" | "enemy", direction: StatAnimDirection, modeName: string, inputDir: string, delta: number): void {
    const bank = _offsets[side][direction];
    if (modeName === "position" || modeName === "portalScale" || modeName === "creatureScale" || modeName === "scale" || modeName === "alpha" || modeName === "fontSize") {
      if (modeName !== "position") return;
      if (inputDir === "left" || inputDir === "right") bank.x += (inputDir === "left" ? -1 : 1);
      else bank.y += (inputDir === "up" ? -1 : 1);
    } else if (modeName === "size") {
      if (inputDir === "left" || inputDir === "right") bank.w = Math.max(-bank.w + 1, bank.w + (inputDir === "left" ? -1 : 1));
      else bank.h = Math.max(-bank.h + 1, bank.h + (inputDir === "up" ? -1 : 1));
    }
  },

  reset(side: "player" | "enemy", direction: StatAnimDirection): void {
    _offsets[side][direction] = { ...ZERO };
  },

  snapshot(scene: BattleScene, pokemon: Pokemon, side: "player" | "enemy", direction: StatAnimDirection): void {
    const bank = _offsets[side][direction];
    const layout = computeStatAnimLayout(scene, pokemon, direction);
    const fmt = (n: number) => Math.round(n * 100) / 100;
    const fmtD = (n: number) => (n >= 0 ? "+" : "") + fmt(n);
    const lines = [
      `[BTL-STAT-ANIM] SNAPSHOT (${side.toUpperCase()}/${direction.toUpperCase()})`,
      "NOTE: CHANGE values are deltas for code adjustments.",
      "",
      `  APPLIED:  tileX=${fmt(layout.tileX)} tileY=${fmt(layout.tileY)} tileW=${fmt(layout.tileWidth)} tileH=${fmt(layout.tileHeight)}`,
      `  CHANGE:   Δx=${fmtD(bank.x)} Δy=${fmtD(bank.y)} Δw=${fmtD(bank.w)} Δh=${fmtD(bank.h)}`,
    ];
    const output = lines.join("\n");
    console.log(output);
    tweakCopyToClipboard(output);
  },

  showPreview(scene: BattleScene, side: "player" | "enemy", direction: StatAnimDirection): void {
    this.hidePreview();
    const pokemon = side === "player" ? scene.getPlayerPokemon() : scene.getEnemyPokemon();
    if (!pokemon || !pokemon.isOnField() || !pokemon.isActive(true)) return;

    const layout = computeStatAnimLayout(scene, pokemon, direction);

    const statSprite = scene.add.tileSprite(
      layout.tileX, layout.tileY, layout.tileWidth, layout.tileHeight,
      "battle_stats", layout.spriteColor,
    );
    if (scene.renderer.type === Phaser.WEBGL && scene.fieldSpritePipeline) {
      statSprite.setPipeline(scene.fieldSpritePipeline);
    }
    statSprite.setAlpha(0.8375);
    statSprite.setScale(layout.statScale);
    statSprite.setOrigin(layout.originX, layout.originY);
    statSprite.setDepth(1);

    let maskCopy: Phaser.GameObjects.Sprite | null = null;
    const mainSprite = pokemon.getSprite();
    if (mainSprite) {
      const tintSource = pokemon.getAt(pokemon.portalSprite ? 2 : 1) as Phaser.GameObjects.Sprite;
      if (tintSource) {
        maskCopy = scene.add.sprite(0, 0, mainSprite.texture.key, mainSprite.frame.name);
        maskCopy.setVisible(true);
        if (pokemon.getSpeciesForm().generation === 20) {
          const wm = mainSprite.getWorldTransformMatrix();
          maskCopy.setPosition(wm.tx, wm.ty);
          maskCopy.setScale(Math.abs(wm.scaleX));
          maskCopy.setOrigin(0.5, 1);
          maskCopy.setFlipX(mainSprite.flipX);
        } else {
          const localX = mainSprite.x ?? 0;
          const localY = mainSprite.y ?? 0;
          const localScale = mainSprite.scale ?? 1;
          maskCopy.setPosition(
            (pokemon.x + localX * pokemon.scale) * pokemon.parentContainer.scale + pokemon.parentContainer.x,
            (pokemon.y + localY * pokemon.scale) * pokemon.parentContainer.scale + pokemon.parentContainer.y,
          );
          maskCopy.setScale(localScale * pokemon.scale * pokemon.parentContainer.scale);
        }
        statSprite.setMask(new Phaser.Display.Masks.BitmapMask(scene, maskCopy));
      }
    }

    _previewHandle = { sprite: statSprite, pokemon, side, direction, maskCopy };
    this._drawBounds(scene, layout.boundsRect);
  },

  hidePreview(): void {
    if (_previewHandle) {
      _previewHandle.sprite.clearMask(true);
      if (_previewHandle.sprite?.active) _previewHandle.sprite.destroy();
      if (_previewHandle.maskCopy?.active) _previewHandle.maskCopy.destroy();
      _previewHandle = null;
    }
    if (_boundsGfx) {
      _boundsGfx.destroy();
      _boundsGfx = null;
    }
  },

  refreshPreview(scene: BattleScene): void {
    if (!_previewHandle) return;
    const { side, direction } = _previewHandle;
    this.showPreview(scene, side, direction);
  },

  isPreviewActive(): boolean {
    return _previewHandle !== null;
  },

  _drawBounds(scene: BattleScene, rect: Phaser.Geom.Rectangle): void {
    if (!_boundsGfx) {
      _boundsGfx = scene.add.graphics();
      _boundsGfx.setDepth(1);
    }
    _boundsGfx.clear();
    _boundsGfx.lineStyle(2, 0x00ff00, 0.9);
    _boundsGfx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    _boundsGfx.fillStyle(0x00ff00, 0.1);
    _boundsGfx.fillRect(rect.x, rect.y, rect.width, rect.height);
  },
};