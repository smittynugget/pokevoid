export const CANVAS_SCALE = 6;

export const GAME_WIDTH = 1920;

export const GAME_HEIGHT = 1080;

export const LOGICAL_WIDTH = GAME_WIDTH / CANVAS_SCALE;

export const LOGICAL_HEIGHT = GAME_HEIGHT / CANVAS_SCALE;

export function logicalFromCanvas(canvasSize: number): number {
  return canvasSize / CANVAS_SCALE;
}

export function fieldUIBottomLocalY(logicalHeight: number = LOGICAL_HEIGHT): number {
  return -logicalHeight;
}

export function uiTopEdgeY(multiplier: number = -1, logicalHeight: number = LOGICAL_HEIGHT): number {
  return multiplier * logicalHeight;
}