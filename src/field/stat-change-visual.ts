import BattleScene from "#app/battle-scene";
import Pokemon from "#app/field/pokemon";
import { computeStatAnimLayout } from "#app/field/stat-anim-layout";

export function playStatChangeVisual(
  scene: BattleScene,
  pokemon: Pokemon,
  direction: "up" | "down",
  onComplete?: () => void
): boolean {
  const isUp = direction === "up";
  const isGen20 = pokemon.getSpeciesForm().generation === 20;

  console.log("[STAT-ANIM] playStatChangeVisual CALLED", {
    pokemon: pokemon.name, species: pokemon.species?.name, direction, isUp, isGen20,
    isPlayer: pokemon.isPlayer(), isOnField: pokemon.isOnField(),
    isActive: pokemon.isActive(true), maskEnabledBefore: pokemon.maskEnabled,
  });

  if (!scene?.field || !pokemon || !pokemon.isOnField() || !pokemon.isActive(true)) {
    console.log("[STAT-ANIM] EARLY EXIT: not on field / inactive / missing refs");
    onComplete?.();
    return false;
  }

  if (pokemon.maskEnabled) {
    console.log("[STAT-ANIM] EARLY EXIT: mask already enabled");
    onComplete?.();
    return false;
  }

  let maskObj: Phaser.GameObjects.Sprite | null = null;

  if (isGen20) {
    const mainSprite = pokemon.getSprite();
    if (!mainSprite) {
      console.log("[STAT-ANIM] EARLY EXIT: no mainSprite for gen20");
      onComplete?.();
      return false;
    }
    maskObj = scene.add.sprite(0, 0, mainSprite.texture.key, mainSprite.frame.name);
    maskObj.setVisible(true);
    const wm = mainSprite.getWorldTransformMatrix();
    maskObj.setPosition(wm.tx, wm.ty);
    maskObj.setScale(Math.abs(wm.scaleX));
    maskObj.setOrigin(0.5, 1);
    maskObj.setFlipX(mainSprite.flipX);
    console.log("[STAT-ANIM] gen20 maskCopy created", {
      wmTx: wm.tx, wmTy: wm.ty, wmScaleX: wm.scaleX,
      maskX: maskObj.x, maskY: maskObj.y, maskScale: maskObj.scale,
    });
  } else {
    pokemon.enableMask();
    maskObj = pokemon.maskSprite;
    if (!maskObj) {
      console.log("[STAT-ANIM] EARLY EXIT: no mask sprite after enableMask()");
      pokemon.disableMask();
      onComplete?.();
      return false;
    }
    console.log("[STAT-ANIM] non-gen20 mask enabled", {
      maskX: maskObj.x, maskY: maskObj.y, maskScale: maskObj.scale,
      maskVisible: maskObj.visible,
    });
  }

  const layout = computeStatAnimLayout(scene, pokemon, direction);

  console.log("[STAT-ANIM] layout", {
    tileX: layout.tileX, tileY: layout.tileY,
    tileWidth: layout.tileWidth, tileHeight: layout.tileHeight,
    spriteColor: layout.spriteColor, originX: layout.originX, originY: layout.originY,
    isGen20: layout.isGen20, statScale: layout.statScale,
    tweenYDelta: layout.tweenYDelta, tweenSign: layout.tweenSign,
  });

  console.log("[STAT-ANIM] scene field", {
    fieldScale: scene.field.scale, fieldX: scene.field.x, fieldY: scene.field.y,
  });

  const statSprite = scene.add.tileSprite(
    layout.tileX, layout.tileY, layout.tileWidth, layout.tileHeight,
    "battle_stats", layout.spriteColor,
  );
  if (scene.renderer.type === Phaser.WEBGL && scene.fieldSpritePipeline) {
    statSprite.setPipeline(scene.fieldSpritePipeline);
  }
  statSprite.setAlpha(0);
  statSprite.setScale(layout.statScale);
  statSprite.setOrigin(layout.originX, layout.originY);
  statSprite.setDepth(1);

  console.log("[STAT-ANIM] statSprite configured", {
    x: statSprite.x, y: statSprite.y,
    width: statSprite.width, height: statSprite.height,
    scale: statSprite.scale, originX: statSprite.originX, originY: statSprite.originY,
    depth: statSprite.depth, frame: statSprite.frame?.name,
    displayWidth: statSprite.displayWidth, displayHeight: statSprite.displayHeight,
  });

  scene.playSound(`se/stat_${isUp ? "up" : "down"}`);
  statSprite.setMask(new Phaser.Display.Masks.BitmapMask(scene, maskObj));

  const _maskB = maskObj!.getBounds();
  const _statB = statSprite.getBounds();
  console.log(
    `[STAT-ANIM] COVERAGE: mask=[${Math.round(_maskB.x)},${Math.round(_maskB.y)},${Math.round(_maskB.width)},${Math.round(_maskB.height)}] stat=[${Math.round(_statB.x)},${Math.round(_statB.y)},${Math.round(_statB.width)},${Math.round(_statB.height)}] overlap=[top_ok=${_maskB.top <= _statB.top},bottom_ok=${_maskB.bottom >= _statB.bottom}]`
  );

  console.log("[STAT-ANIM] tween Y target", {
    tweenSign: layout.tweenSign, tweenYDelta: layout.tweenYDelta,
    startY: statSprite.y,
    expectedEndY: layout.tweenSign === "-" ? statSprite.y - layout.tweenYDelta : statSprite.y + layout.tweenYDelta,
  });

  scene.tweens.add({
    targets: statSprite,
    duration: 250,
    alpha: 0.8375,
  });

  scene.time.delayedCall(1250, () => {
    scene.tweens.add({ targets: statSprite, duration: 250, alpha: 0 });
  });

  scene.tweens.add({
    targets: statSprite,
    duration: 1500,
    y: `${layout.tweenSign}=${layout.tweenYDelta}`
  });

  scene.time.delayedCall(1750, () => {
    console.log("[STAT-ANIM] cleanup 1750ms fired", {
      pokemon: pokemon.name, isGen20,
      statSpriteActive: statSprite?.active,
      statSpriteFinalY: statSprite?.y, statSpriteFinalAlpha: statSprite?.alpha,
    });
    statSprite.clearMask(true);
    if (statSprite?.active) statSprite.destroy();
    if (isGen20) {
      if (maskObj?.active) maskObj.destroy();
    } else {
      pokemon.disableMask();
    }
    onComplete?.();
  });

  return true;
}