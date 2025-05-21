import { UiTheme } from "#enums/ui-theme";
import { legacyCompatibleImages } from "#app/scene-base";
import BattleScene from "../battle-scene";

export enum WindowVariant {
  NORMAL,
  THIN,
  XTHIN
}

export function getWindowVariantSuffix(windowVariant: WindowVariant): string {
  switch (windowVariant) {
  case WindowVariant.THIN:
    return "_thin";
  case WindowVariant.XTHIN:
    return "_xthin";
  default:
    return "";
  }
}

const windowTypeControlColors = {
  [UiTheme.DEFAULT]: {
    0: [ "#1a1a1f", "#6e2e4a", "#2c1f33" ],
    1: [ "#1f1a24", "#4a6e2e", "#1f332c" ],
    2: [ "#1a1f24", "#2e4a6e", "#1f2c33" ],
    3: [ "#241a1f", "#6e4a2e", "#332c1f" ],
    4: [ "#1a1a1f", "#4a4a4a", "#2a2a33" ]
  },
  [UiTheme.LEGACY]: {
    0: [ "#706880", "#8888c8", "#484868" ],
    1: [ "#d04028", "#e0a028", "#902008" ],
    2: [ "#48b840", "#88d880", "#089040" ],
    3: [ "#2068d0", "#80b0e0", "#104888" ],
    4: [ "#706880", "#8888c8", "#484868" ]
  }
};

export function addWindow(scene: BattleScene, x: number, y: number, width: number, height: number, mergeMaskTop?: boolean, mergeMaskLeft?: boolean, maskOffsetX?: number, maskOffsetY?: number, windowVariant?: WindowVariant): Phaser.GameObjects.NineSlice {
  if (windowVariant === undefined) {
    windowVariant = WindowVariant.NORMAL;
  }

  const borderSize = scene.uiTheme ? 6 : 8;

  const window = scene.add.nineslice(x, y, `window_${scene.windowType}${getWindowVariantSuffix(windowVariant)}`, undefined, width, height, borderSize, borderSize, borderSize, borderSize);
  window.setOrigin(0, 0);

  if (mergeMaskLeft || mergeMaskTop || maskOffsetX || maskOffsetY) {
    /**
     * x: left
     * y: top
     * width: right
     * height: bottom
     */
    const maskRect = new Phaser.GameObjects.Rectangle(
      scene,
      6*(x  - (mergeMaskLeft ? 2 : 0) - (maskOffsetX || 0)),
      6*(y + (mergeMaskTop ? 2 : 0) + (maskOffsetY || 0)),
      width - (mergeMaskLeft ? 2 : 0),
      height - (mergeMaskTop ? 2 : 0),
      0xffffff
    );
    maskRect.setOrigin(0);
    maskRect.setScale(6);
    const mask = maskRect.createGeometryMask();
    window.setMask(mask);
  }

  return window;
}

export function updateWindowType(scene: BattleScene, windowTypeIndex: integer): void {
  const windowObjects: [Phaser.GameObjects.NineSlice, WindowVariant][] = [];
  const themedObjects: (Phaser.GameObjects.Image | Phaser.GameObjects.NineSlice)[] = [];
  const traverse = (object: any) => {
    if (object.hasOwnProperty("children") && object.children instanceof Phaser.GameObjects.DisplayList) {
      const children = object.children as Phaser.GameObjects.DisplayList;
      for (const child of children.getAll()) {
        traverse(child);
      }
    } else if (object instanceof Phaser.GameObjects.Container) {
      for (const child of object.getAll()) {
        traverse(child);
      }
    } else if (object instanceof Phaser.GameObjects.NineSlice) {
      if (object.texture.key.startsWith("window_")) {
        windowObjects.push([ object, object.texture.key.endsWith(getWindowVariantSuffix(WindowVariant.XTHIN)) ? WindowVariant.XTHIN : object.texture.key.endsWith(getWindowVariantSuffix(WindowVariant.THIN)) ? WindowVariant.THIN : WindowVariant.NORMAL ]);
      } else if (object.texture?.key === "namebox") {
        themedObjects.push(object);
      }
    } else if (object instanceof Phaser.GameObjects.Sprite) {
      if (object.texture?.key === "bg") {
        themedObjects.push(object);
      }
    }
  };

  traverse(scene);

  scene.windowType = windowTypeIndex;

  const rootStyle = document.documentElement.style;
  [ "base", "light", "dark" ].map((k, i) => rootStyle.setProperty(`--color-${k}`, windowTypeControlColors[scene.uiTheme][windowTypeIndex - 1][i]));

  const windowKey = `window_${windowTypeIndex}`;

  for (const [ window, variant ] of windowObjects) {
    window.setTexture(`${windowKey}${getWindowVariantSuffix(variant)}`);
  }

  for (const obj of themedObjects) {
    obj.setFrame(windowTypeIndex);
  }
}

export function addUiThemeOverrides(scene: BattleScene): void {
  const originalAddImage = scene.add.image;
  scene.add.image = function (x: number, y: number, texture: string | Phaser.Textures.Texture, frame?: string | number): Phaser.GameObjects.Image {
    let legacy = false;
    if (typeof texture === "string" && scene.uiTheme && legacyCompatibleImages.includes(texture)) {
      legacy = true;
      texture += "_legacy";
    }
    const ret: Phaser.GameObjects.Image = originalAddImage.apply(this, [ x, y, texture, frame ]);
    if (legacy) {
      const originalSetTexture = ret.setTexture;
      ret.setTexture = function (key: string, frame?: string | number) {
        key += "_legacy";
        return originalSetTexture.apply(this, [ key, frame ]);
      };
    }
    return ret;
  };

  const originalAddSprite = scene.add.sprite;
  scene.add.sprite = function (x: number, y: number, texture: string | Phaser.Textures.Texture, frame?: string | number): Phaser.GameObjects.Sprite {
    let legacy = false;
    if (typeof texture === "string" && scene.uiTheme && legacyCompatibleImages.includes(texture)) {
      legacy = true;
      texture += "_legacy";
    }
    const ret: Phaser.GameObjects.Sprite = originalAddSprite.apply(this, [ x, y, texture, frame ]);
    if (legacy) {
      const originalSetTexture = ret.setTexture;
      ret.setTexture = function (key: string, frame?: string | number) {
        key += "_legacy";
        return originalSetTexture.apply(this, [ key, frame ]);
      };
    }
    return ret;
  };

  const originalAddNineslice = scene.add.nineslice;
  scene.add.nineslice = function (x: number, y: number, texture: string | Phaser.Textures.Texture, frame?: string | number, width?: number, height?: number, leftWidth?: number, rightWidth?: number, topHeight?: number, bottomHeight?: number): Phaser.GameObjects.NineSlice {
    let legacy = false;
    if (typeof texture === "string" && scene.uiTheme && legacyCompatibleImages.includes(texture)) {
      legacy = true;
      texture += "_legacy";
    }
    const ret: Phaser.GameObjects.NineSlice = originalAddNineslice.apply(this, [ x, y, texture, frame, width, height, leftWidth, rightWidth, topHeight, bottomHeight ]);
    if (legacy) {
      const originalSetTexture = ret.setTexture;
      ret.setTexture = function (key: string | Phaser.Textures.Texture, frame?: string | number, updateSize?: boolean, updateOrigin?: boolean) {
        key += "_legacy";
        return originalSetTexture.apply(this, [ key, frame, updateSize, updateOrigin ]);
      };
    }
    return ret;
  };
}
