import BattleScene from "../battle-scene";

export interface ModalBackgroundBounds {
  bgX: number;
  bgY: number;
  bgWidth: number;
  bgHeight: number;
}

export interface ModalBackgroundHandle {
  targetContainer: Phaser.GameObjects.Container;
  layers: Phaser.GameObjects.Graphics[];
  masks: Phaser.Display.Masks.GeometryMask[];
  maskRectangles: Phaser.GameObjects.Rectangle[];
  corners: Phaser.GameObjects.Image[];
  clear(): void;
  redraw(bounds?: ModalBackgroundBounds): void;
}

export interface CornerSizeConfig {
  proportionalScale?: number;
  minSize?: number;
  maxSize?: number;
  useAlt?: boolean;
}

export interface CornerLayout {
  cornerSize: number;
  corners: Array<{
    texture: 'corner_tl' | 'corner_tr' | 'corner_bl' | 'corner_br' | 'corner_tl_alt' | 'corner_tr_alt' | 'corner_bl_alt' | 'corner_br_alt';
    x: number;
    y: number;
  }>;
}
export const MODAL_BG = {
  ALPHA: 0.15,
  PRIMARY_COLOR: 0x1a1a2e,
  SECONDARY_COLOR: 0x16213e,
  RADIUS: 12,
};

export const MODAL_BG_PATTERN = {
  COLOR: 0x16213e,
  ACCENT_COLOR: 0x6c5ce7,
  ALPHA_LIGHT: 0.08,
  ALPHA: 0.15,
  ALPHA_SEMI: 0.25,
  ALPHA_STRONG: 0.3,
  ALPHA_BOLD: 0.4,
  ALPHA_HEAVY: 0.6,
};
export function getModalAlpha(baseAlpha: number, multiplier: number = 1.0): number {
  return baseAlpha * multiplier;
}

function positionLayerAfterWindow(
  container: Phaser.GameObjects.Container,
  layer: Phaser.GameObjects.Graphics,
  bounds: ModalBackgroundBounds,
  targetElement?: Phaser.GameObjects.GameObject
) {
  try {
    const containerChildren: any[] = (container as any).list || [];
    let windowElementIndex = -1;
    if (targetElement) {
      windowElementIndex = containerChildren.indexOf(targetElement);
    }
    if (windowElementIndex === -1) {
      for (let childIndex = 0; childIndex < containerChildren.length; childIndex++) {
        const childElement = containerChildren[childIndex];

        if (childElement.x === bounds.bgX && childElement.y === bounds.bgY &&
            childElement.width === bounds.bgWidth && childElement.height === bounds.bgHeight) {
          windowElementIndex = childIndex;
          break;
        }
      }
    }
    if (windowElementIndex === -1) {
      let bestMatch = -1;
      let smallestDelta = Infinity;

      for (let childIndex = 0; childIndex < containerChildren.length; childIndex++) {
        const childElement = containerChildren[childIndex];
        if (childElement instanceof Phaser.GameObjects.NineSlice) {

          const deltaX = Math.abs(childElement.x - bounds.bgX);
          const deltaY = Math.abs(childElement.y - bounds.bgY);
          const deltaW = Math.abs((childElement.width || 0) - bounds.bgWidth);
          const deltaH = Math.abs((childElement.height || 0) - bounds.bgHeight);
          const totalDelta = deltaX + deltaY + deltaW + deltaH;

          if (totalDelta < smallestDelta) {
            smallestDelta = totalDelta;
            bestMatch = childIndex;
          }
        }
      }

      if (bestMatch !== -1) {
        windowElementIndex = bestMatch;
      }
    }

    if (windowElementIndex >= 0) {
      const insertionIndex = windowElementIndex + 1;
      if (typeof (container as any).moveTo === "function") {
        (container as any).moveTo(layer, insertionIndex);
      } else if (typeof (container as any).addAt === "function") {
        (container as any).remove(layer);
        (container as any).addAt(layer, insertionIndex);
      }
    }
  } catch {}
}

function drawPattern1(patternGraphics: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: ModalBackgroundBounds, alphaMultiplier: number = 1.0, gridInc: number = 0): void {
  const gridCellSize = 11 + gridInc;
  patternGraphics.lineStyle(
    1,
    MODAL_BG_PATTERN.COLOR,
    getModalAlpha(MODAL_BG_PATTERN.ALPHA_LIGHT * 0.275, alphaMultiplier)
  );

  for (let gridX = bgX; gridX <= bgX + bgWidth; gridX += gridCellSize) {
    patternGraphics.lineBetween(gridX, bgY, gridX, bgY + bgHeight);
  }

  for (let gridY = bgY; gridY <= bgY + bgHeight; gridY += gridCellSize) {
    patternGraphics.lineBetween(bgX, gridY, bgX + bgWidth, gridY);
  }

  for (let accentSquareIndex = 0; accentSquareIndex < 60; accentSquareIndex++) {
    const accentX = bgX + Math.floor(Math.random() * (bgWidth / gridCellSize)) * gridCellSize;
    const accentY = bgY + Math.floor(Math.random() * (bgHeight / gridCellSize)) * gridCellSize;
    const accentIntensity = getModalAlpha((MODAL_BG_PATTERN.ALPHA_LIGHT / 2 + Math.random() * (0.02)) * 0.7, alphaMultiplier);

    patternGraphics.fillStyle(MODAL_BG_PATTERN.ACCENT_COLOR, accentIntensity);
    patternGraphics.fillRect(accentX + 1, accentY + 1, gridCellSize - 2, gridCellSize - 2);
  }
}

function drawPattern2(backgroundGraphics: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: ModalBackgroundBounds, alphaMultiplier: number = 1.0, gridInc: number = 0): void {
  backgroundGraphics.fillStyle(MODAL_BG.PRIMARY_COLOR, getModalAlpha(MODAL_BG.ALPHA, alphaMultiplier));
  backgroundGraphics.fillRoundedRect(bgX, bgY, bgWidth, bgHeight, MODAL_BG.RADIUS);
}

function drawPattern4(orbitalGraphics: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: ModalBackgroundBounds, alphaMultiplier: number = 1.0, gridInc: number = 0): void {
  for (let orbitalIndex = 0; orbitalIndex < 20; orbitalIndex++) {
    const baseSize = 3 + Math.random() * 5;

    const ellipseHorizontalRadius = baseSize * 2;
    const ellipseVerticalRadius = baseSize;
    const largestCircleRadius = baseSize * 1.5;
    const safetyMargin = Math.max(ellipseHorizontalRadius, ellipseVerticalRadius, largestCircleRadius) + 3;

    const safeMinX = bgX + safetyMargin;
    const safeMaxX = bgX + bgWidth - safetyMargin;
    const safeMinY = bgY + safetyMargin;
    const safeMaxY = bgY + bgHeight - safetyMargin;

    if (safeMaxX <= safeMinX || safeMaxY <= safeMinY) continue;

    const orbitalCenterX = safeMinX + Math.random() * (safeMaxX - safeMinX);
    const orbitalCenterY = safeMinY + Math.random() * (safeMaxY - safeMinY);

    orbitalGraphics.lineStyle(
      1,
      MODAL_BG_PATTERN.COLOR,
      getModalAlpha(MODAL_BG_PATTERN.ALPHA_LIGHT, alphaMultiplier)
    );
    orbitalGraphics.strokeEllipse(orbitalCenterX, orbitalCenterY, baseSize * 2, baseSize);

    orbitalGraphics.fillStyle(
      MODAL_BG_PATTERN.COLOR,
      getModalAlpha(MODAL_BG_PATTERN.ALPHA_SEMI, alphaMultiplier)
    );
    orbitalGraphics.fillCircle(orbitalCenterX, orbitalCenterY, baseSize * 0.3);

    orbitalGraphics.fillStyle(
      MODAL_BG_PATTERN.COLOR,
      getModalAlpha(MODAL_BG_PATTERN.ALPHA_LIGHT * 0.5, alphaMultiplier)
    );
    orbitalGraphics.fillCircle(orbitalCenterX, orbitalCenterY, baseSize * 1.5);
  }
}

function drawPattern5(chainGraphics: Phaser.GameObjects.Graphics, { bgX, bgY, bgWidth, bgHeight }: ModalBackgroundBounds, alphaMultiplier: number = 1.0, gridInc: number = 0): void {
  const safetyMargin = 10;
  const maxBoundaryX = bgX + bgWidth - safetyMargin;
  const maxBoundaryY = bgY + bgHeight - safetyMargin;

  for (let chainIndex = 0; chainIndex < 6; chainIndex++) {
    let currentChainX = bgX + safetyMargin + Math.random() * (bgWidth - 2 * safetyMargin);
    let currentChainY = bgY + safetyMargin + Math.random() * (bgHeight - 2 * safetyMargin);
    const desiredChainLength = 40 + Math.random() * 60;
    const chainLinkSize = 6;

    const maxPossibleSteps = Math.floor((maxBoundaryX - currentChainX) / chainLinkSize);
    const actualChainLength = Math.min(desiredChainLength, maxPossibleSteps * chainLinkSize);

    chainGraphics.lineStyle(
      2,
      MODAL_BG_PATTERN.COLOR,
      getModalAlpha(MODAL_BG_PATTERN.ALPHA_LIGHT * 0.5, alphaMultiplier)
    );

    const waveAmplitude = 20;
    const waveFrequency = 0.2;

    for (let chainPosition = 0; chainPosition < actualChainLength; chainPosition += chainLinkSize) {
      const waveOffsetY = Math.sin(chainPosition * waveFrequency) * waveAmplitude;
      const nextChainX = currentChainX + chainLinkSize;
      const nextChainY = currentChainY + waveOffsetY;

      if (nextChainX > maxBoundaryX) break;

      const clampedNextY = Math.max(bgY + safetyMargin, Math.min(maxBoundaryY, nextChainY));

      chainGraphics.strokeEllipse((currentChainX + nextChainX) / 2, (currentChainY + clampedNextY) / 2, chainLinkSize / 2, chainLinkSize / 3);

      currentChainX = nextChainX;
      currentChainY = clampedNextY;
    }

    if (currentChainX <= maxBoundaryX && currentChainY >= bgY + safetyMargin && currentChainY <= maxBoundaryY) {
      chainGraphics.lineStyle(
        3,
        MODAL_BG_PATTERN.COLOR,
        getModalAlpha(MODAL_BG_PATTERN.ALPHA_LIGHT, alphaMultiplier)
      );
      chainGraphics.strokeCircle(currentChainX, currentChainY, 8);
      chainGraphics.strokeCircle(currentChainX, currentChainY, 5);
    }
  }
}

export function calculateCornerLayout(
  x: number,
  y: number,
  width: number,
  height: number,
  config?: CornerSizeConfig
): CornerLayout {
  const proportionalScale = config?.proportionalScale ?? 0.40;
  const minSize = config?.minSize ?? 12;
  const maxSize = config?.maxSize ?? 26;
  const useAlt = config?.useAlt ?? false;

  const proportionalSize = Math.floor(Math.min(width, height) * proportionalScale);
  const cornerSize = Math.max(minSize, Math.min(proportionalSize, maxSize));

  const suffix = useAlt ? '_alt' : '';
  const corners = [
    { texture: `corner_tl${suffix}` as const, x: x, y: y },
    { texture: `corner_tr${suffix}` as const, x: x + width - cornerSize, y: y },
    { texture: `corner_bl${suffix}` as const, x: x, y: y + height - cornerSize },
    { texture: `corner_br${suffix}` as const, x: x + width - cornerSize, y: y + height - cornerSize }
  ];

  return { cornerSize, corners };
}

export function createCornerSprites(
  scene: BattleScene,
  container: Phaser.GameObjects.Container,
  layout: CornerLayout,
  cornersArray?: Phaser.GameObjects.Image[]
): Phaser.GameObjects.Image[] {
  const createdCorners: Phaser.GameObjects.Image[] = [];

  layout.corners.forEach((config) => {
    const corner = scene.add.image(config.x, config.y, config.texture);
    corner.setOrigin(0, 0);
    corner.setDisplaySize(layout.cornerSize, layout.cornerSize);
    container.add(corner);

    createdCorners.push(corner);
    if (cornersArray) {
      cornersArray.push(corner);
    }
  });

  return createdCorners;
}

export function positionCornersAfterElement(
  container: Phaser.GameObjects.Container,
  targetElement: Phaser.GameObjects.GameObject,
  corners: Phaser.GameObjects.Image[]
): void {
  const children = container.getAll();
  const targetIndex = children.indexOf(targetElement);

  if (targetIndex === -1) {
    console.warn('[positionCornersAfterElement] Target element not found in container');
    return;
  }

  corners.forEach((corner, idx) => {
    if (typeof (container as any).moveTo === 'function') {
      (container as any).moveTo(corner, targetIndex + 1 + idx);
    }
  });
}

function injectCorners(
  scene: BattleScene,
  targetContainer: Phaser.GameObjects.Container,
  bounds: ModalBackgroundBounds,
  cornersArray: Phaser.GameObjects.Image[],
  targetElement?: Phaser.GameObjects.GameObject
): void {
  return;
  if (scene.windowType < 1 || scene.windowType > 5) {
    return;
  }

  const windowKey = `window_${scene.windowType}b`;

  try {
    let windowElement = targetElement;
    if (!windowElement) {
      const children = targetContainer.getAll();
      windowElement = children.find(child => child instanceof Phaser.GameObjects.NineSlice) as Phaser.GameObjects.GameObject | undefined;
    }

    if (windowElement && windowElement instanceof Phaser.GameObjects.NineSlice) {
      windowElement.setTexture(windowKey);
    }

    const { bgX, bgY, bgWidth, bgHeight } = bounds;
    const layout = calculateCornerLayout(bgX, bgY, bgWidth, bgHeight, { useAlt: false });
    const corners = createCornerSprites(scene, targetContainer, layout, cornersArray);

    if (windowElement) {
      positionCornersAfterElement(targetContainer, windowElement, corners);
    }
  } catch (error) {
    console.error('[injectCorners] Error:', error);
  }
}

export function attachModalBackground(
  scene: BattleScene,
  targetContainer: Phaser.GameObjects.Container,
  getBounds: () => ModalBackgroundBounds,
  options?: { mask?: boolean; depth?: number; alphaMultiplier?: number; gridInc?: number; skipGrid?: boolean; getTarget?: () => Phaser.GameObjects.GameObject }
): ModalBackgroundHandle {
  const handle: ModalBackgroundHandle = {
    targetContainer: targetContainer,
    layers: [],
    masks: [],
    maskRectangles: [],
    corners: [],

    clear() {
      this.layers.forEach(layer => layer.destroy());
      this.layers = [];
      this.masks.forEach(mask => {
        if (mask && typeof mask.destroy === 'function') {
          mask.destroy();
        }
      });
      this.masks = [];
      this.maskRectangles.forEach(rect => rect.destroy());
      this.maskRectangles = [];

      this.corners.forEach(corner => {
        if (corner && typeof corner.destroy === 'function') {
          corner.destroy();
        }
      });
      this.corners = [];
    },

    redraw(bounds?: ModalBackgroundBounds) {
      this.layers.forEach(layer => layer.destroy());
      this.layers = [];
      this.masks.forEach(mask => {
        if (mask && typeof mask.destroy === 'function') {
          mask.destroy();
        }
      });
      this.masks = [];
      this.maskRectangles.forEach(rect => rect.destroy());
      this.maskRectangles = [];

      this.corners.forEach(corner => {
        if (corner && typeof corner.destroy === 'function') {
          corner.destroy();
        }
      });
      this.corners = [];

      const modalBounds = bounds || getBounds();

      const alphaMultiplier = options?.alphaMultiplier ?? 1.0;
      const gridInc = options?.gridInc ?? 0;
      const targetElement = options?.getTarget?.();
      injectCorners(scene, targetContainer, modalBounds, this.corners, targetElement);

      const addLayer = (drawFunc: (layerGraphics: Phaser.GameObjects.Graphics, bounds: ModalBackgroundBounds, alphaMultiplier: number, gridInc?: number) => void) => {
        const layerGraphics = scene.add.graphics();
        drawFunc(layerGraphics, modalBounds, alphaMultiplier, gridInc);
        targetContainer.add(layerGraphics);
        this.layers.push(layerGraphics);
        const targetElement = options?.getTarget?.();
        positionLayerAfterWindow(targetContainer, layerGraphics, modalBounds, targetElement);

        if (options?.mask) {
          const maskRectangle = scene.add.rectangle(modalBounds.bgX, modalBounds.bgY, modalBounds.bgWidth, modalBounds.bgHeight, 0xffffff);
          maskRectangle.setOrigin(0);
          maskRectangle.setScale(6);
          maskRectangle.setVisible(false);
          targetContainer.add(maskRectangle);

          const geometryMask = maskRectangle.createGeometryMask();
          layerGraphics.setMask(geometryMask);
          this.masks.push(geometryMask);
          this.maskRectangles.push(maskRectangle);
        }
      };

      if (!options?.skipGrid) {
        addLayer(drawPattern1);
      }
      addLayer(drawPattern4);
      addLayer(drawPattern5);
    }
  };

  if (options?.depth !== undefined) {
    targetContainer.setDepth(options.depth);
  }

  handle.redraw();

  return handle;
}