import BattleScene from "../battle-scene";

const RING_COLORS = [0x8228C8, 0x5A14A0, 0xA03CDC, 0x641EB4, 0x8C32D2, 0x500F96];
const RING_COUNT = 6;

function eI(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

export function drawVfxFrame(
  gfx: Phaser.GameObjects.Graphics,
  w: number,
  h: number,
  ringClock: number,
  trailT: number
): void {
  gfx.clear();
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.sqrt(cx * cx + cy * cy);

  const ringSpacing = maxR / RING_COUNT;
  for (let i = 0; i < RING_COUNT; i++) {
    const pulse = 0.18 + 0.14 * Math.sin(ringClock * 3.5 + i * 1.05);
    const r = ringSpacing * (i + 1) + Math.sin(ringClock * 2.2 + i * 0.9) * 8;
    const lineWidth = 8 + Math.sin(ringClock * 2.8 + i * 1.7) * 4;
    gfx.lineStyle(lineWidth, RING_COLORS[i], pulse);
    gfx.strokeCircle(cx, cy, r);
  }

  drawRingTrace(gfx, cx, cy, maxR, trailT);
  drawTrailCondense(gfx, cx, cy, maxR, trailT);
  drawPixelScatter(gfx, cx, cy, trailT);
}

function drawRingTrace(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, maxR: number, t: number): void {
  const rings = [0.2, 0.4, 0.6];
  rings.forEach((rr, i) => {
    const er = maxR * rr;
    const pulse = 0.3 + 0.2 * Math.sin(t * 8 + i * 2);
    gfx.lineStyle(2, 0xA03CDC, pulse * (1 - t * 0.5));
    gfx.strokeCircle(cx, cy, er * (0.5 + t * 0.5));
  });
  for (let i = 0; i < 8; i++) {
    const a = t * 3 + i * Math.PI / 4;
    const r = maxR * 0.3 * (0.5 + t * 0.5);
    gfx.fillStyle(0x8C28C8, 0.6 * (1 - t * 0.3));
    gfx.fillCircle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 2);
  }
}

function drawTrailCondense(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, maxR: number, t: number): void {
  const ct = eI(t);
  const r = maxR * (1 - ct);
  const echoes = [0.15, 0.3, 0.45, 0.6, 0.75];
  echoes.forEach(et => {
    if (ct > et) {
      const er = maxR * (1 - et);
      const ea = Math.max(0, 1 - (ct - et) * 3);
      if (ea > 0) {
        gfx.lineStyle(1.5, 0x823CC8, ea * 0.35);
        gfx.strokeCircle(cx, cy, er);
      }
    }
  });
  if (r > 1) {
    gfx.lineStyle(3, 0xB450FF, 0.5 * ct);
    gfx.strokeCircle(cx, cy, r);
  }
}

function drawPixelScatter(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, t: number): void {
  for (let i = 0; i < 15; i++) {
    const a = i * 0.42 + 0.5;
    const spd = 1.5 + i * 0.3;
    const x = cx + Math.cos(a) * t * spd * 40;
    const y = cy + Math.sin(a) * t * spd * 40;
    const alpha = Math.max(0, 1 - t * 0.8);
    if (alpha > 0) {
      const br = 60 + i * 8;
      const decay = Math.max(0, 1 - t * 0.5);
      gfx.fillStyle(Phaser.Display.Color.GetColor(br, 15, br + 70), alpha * 0.5);
      gfx.fillRect(x, y, (3 + (i % 3)) * decay, (2 + (i % 2)) * decay);
    }
  }
}