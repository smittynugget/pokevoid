import i18next from "i18next";

const TRAIL_W = 960;
const TRAIL_H = 540;
const CE = 0.7;

function eI(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

interface TrailState {
  cx: number;
  cy: number;
  mR: number;
  p: number;
  r: number;
}

function baseCondenseTrail(
  c: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  condenseEnd: number,
  loadingImg: CanvasImageSource,
  titleImg: CanvasImageSource,
  logoImg?: CanvasImageSource | null,
  taglineText?: string
): TrailState {
  const cx = w / 2, cy = h / 2;
  const mR = Math.sqrt(cx * cx + cy * cy);
  const ct = Math.min(t, condenseEnd) / condenseEnd;
  const p = eI(ct);
  const r = mR * (1 - p);

  c.drawImage(titleImg, 0, 0, w, h);

  if (logoImg) {
    const li = logoImg as HTMLImageElement;
    if (li.naturalWidth > 0) {
      const logoCanvasScale = 0.6;
      const drawW = li.naturalWidth * logoCanvasScale;
      const drawH = li.naturalHeight * logoCanvasScale;
      const drawX = (w - drawW) / 2;
      const drawY = 90;
      c.drawImage(logoImg, drawX, drawY, drawW, drawH);

      if (taglineText) {
        c.save();
        c.font = "20px 'emerald'";
        c.textAlign = "center";
        c.textBaseline = "top";
        c.shadowColor = "#9b4dca";
        c.shadowOffsetX = 2;
        c.shadowOffsetY = 2;
        c.shadowBlur = 0;
        c.fillStyle = "#f8f8f8";
        c.fillText(taglineText, w / 2, drawY + drawH + 8);
        c.restore();
      }
    }
  }

  if (r > 0.5) {
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.clip();
    c.drawImage(loadingImg, 0, 0, w, h);
    c.restore();
  }

  const echoes = [0.15, 0.3, 0.45, 0.6, 0.75];
  echoes.forEach(et => {
    if (ct > et) {
      const er = mR * (1 - et);
      const ea = Math.max(0, 1 - (ct - et) * 3);
      if (ea > 0) {
        c.beginPath();
        c.arc(cx, cy, er, 0, Math.PI * 2);
        c.strokeStyle = `rgba(130,60,200,${ea * 0.35})`;
        c.lineWidth = 1.5;
        c.stroke();
      }
    }
  });

  if (r > 1) {
    c.beginPath();
    c.arc(cx, cy, r, 0, Math.PI * 2);
    c.strokeStyle = `rgba(180,80,255,${0.5 * ct})`;
    c.lineWidth = 3;
    c.stroke();
  }

  return { cx, cy, mR, p: ct, r };
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sz: number;
  life: number;
  a?: number;
  sr?: number;
  orbitSpd?: number;
  escapeAt?: number;
  rot?: number;
  sx?: number;
  sy?: number;
  w?: number;
  h?: number;
  da?: number;
  r?: number;
}

interface TrailEffect {
  name: string;
  _ps: Particle[] | null;
  _arcs: Particle[] | null;
  render: (c: CanvasRenderingContext2D, w: number, h: number, t: number, state: TrailState) => void;
}

const allEffects: TrailEffect[] = [
  {
    name: "Ring Particle Trace",
    _ps: null,
    _arcs: null,
    render(c, w, h, t, state) {
      if (t <= CE) return;
      const { cx, cy, mR } = state;
      if (!this._ps || t < CE + 0.01) {
        this._ps = [];
        [0.15, 0.3, 0.45].forEach(et => {
          const sr = mR * (1 - et);
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            this._ps!.push({ x: 0, y: 0, vx: 0, vy: 0, a, sr, orbitSpd: 2 + Math.random() * 3, escapeAt: 0.3 + Math.random() * 0.4, sz: 1 + Math.random() * 1.8, life: 0.5 + Math.random() * 0.5 });
          }
        });
      }
      const pt = (t - CE) / (1 - CE);
      c.shadowBlur = 6;
      c.shadowColor = "#a040ee";
      this._ps!.forEach(p => {
        if (pt < p.escapeAt!) {
          const ca = p.a! + pt * p.orbitSpd! * 3;
          const x = cx + Math.cos(ca) * p.sr!;
          const y = cy + Math.sin(ca) * p.sr!;
          c.beginPath(); c.arc(x, y, p.sz, 0, Math.PI * 2); c.fillStyle = `rgba(160,60,220,0.6)`; c.fill();
        } else {
          const ept = pt - p.escapeAt!;
          const ca = p.a! + p.escapeAt! * p.orbitSpd! * 3;
          const x = cx + Math.cos(ca) * (p.sr! + ept * 90);
          const y = cy + Math.sin(ca) * (p.sr! + ept * 90);
          const alpha = Math.max(0, 1 - ept * 2);
          if (alpha > 0) { c.beginPath(); c.arc(x, y, p.sz * (1 - ept * 0.5), 0, Math.PI * 2); c.fillStyle = `rgba(140,40,200,${alpha * 0.6})`; c.fill(); }
        }
      });
      c.shadowBlur = 0;
    }
  },
  {
    name: "Diamond Scatter",
    _ps: null,
    _arcs: null,
    render(c, w, h, t, state) {
      if (t <= CE) return;
      const { cx, cy, mR } = state;
      if (!this._ps || t < CE + 0.01) {
        this._ps = [];
        [0.15, 0.3, 0.45].forEach(et => {
          const sr = mR * (1 - et);
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 2;
            this._ps!.push({ x: cx + Math.cos(a) * sr, y: cy + Math.sin(a) * sr, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, sz: 2 + Math.random() * 3, rot: Math.random() * Math.PI / 4, life: 0.4 + Math.random() * 0.6 });
          }
        });
      }
      const pt = (t - CE) / (1 - CE);
      c.shadowBlur = 4;
      c.shadowColor = "#7030bb";
      this._ps!.forEach(p => {
        const x = p.x + p.vx * pt * 50;
        const y = p.y + p.vy * pt * 50;
        const alpha = Math.max(0, 1 - pt / p.life);
        if (alpha > 0) {
          c.save(); c.translate(x, y); c.rotate(p.rot! + Math.PI / 4);
          const br = Math.floor(80 + Math.random() * 40);
          c.fillStyle = `rgba(${br},20,${br + 80},${alpha * 0.6})`; c.fillRect(-p.sz / 2, -p.sz / 2, p.sz, p.sz); c.restore();
        }
      });
      c.shadowBlur = 0;
    }
  },
  {
    name: "TV Snow",
    _ps: null,
    _arcs: null,
    render(c, w, h, t) {
      if (t <= CE) return;
      const pt = (t - CE) / (1 - CE);
      const fadeA = Math.max(0, 1 - pt);
      const count = Math.floor(150 * (1 - pt));
      for (let i = 0; i < count; i++) {
        const px = Math.random() * w, py = Math.random() * h;
        const br = 0.2 + Math.random() * 0.3;
        c.fillStyle = `rgba(140,50,200,${fadeA * br})`;
        c.fillRect(px, py, 1, 1);
      }
    }
  },
  {
    name: "TV Glitch Bars",
    _ps: null,
    _arcs: null,
    render(c, w, h, t) {
      if (t <= CE) return;
      const pt = (t - CE) / (1 - CE);
      const fadeA = Math.max(0, 1 - pt * 1.3);
      if (fadeA > 0) {
        const barCount = 3 + Math.floor((1 - pt) * 5);
        for (let i = 0; i < barCount; i++) {
          const barY = Math.floor(((Math.sin(i * 7.3 + t * 20) * 0.5 + 0.5) * h));
          const barH = 2 + Math.floor(Math.random() * 8);
          const shift = (Math.random() - 0.5) * 30;
          c.fillStyle = `rgba(100,30,180,${fadeA * 0.18})`;
          c.fillRect(shift, barY, w, barH);
          c.fillStyle = `rgba(180,60,255,${fadeA * 0.1})`;
          c.fillRect(shift + 3, barY, w, barH);
        }
      }
    }
  },
  {
    name: "TV Sparkle Static",
    _ps: null,
    _arcs: null,
    render(c, w, h, t) {
      if (t <= CE) return;
      const pt = (t - CE) / (1 - CE);
      const fadeA = Math.max(0, 1 - pt);
      c.shadowBlur = 3;
      c.shadowColor = "#b050ff";
      for (let i = 0; i < Math.floor(80 * (1 - pt)); i++) {
        const px = Math.random() * w, py = Math.random() * h;
        const bright = 0.3 + Math.random() * 0.7;
        c.fillStyle = `rgba(180,80,255,${fadeA * bright * 0.5})`;
        c.fillRect(px - 0.5, py - 0.5, 2, 2);
      }
      c.shadowBlur = 0;
    }
  },
  {
    name: "TV Stripe Pattern",
    _ps: null,
    _arcs: null,
    render(c, w, h, t) {
      if (t <= CE) return;
      const pt = (t - CE) / (1 - CE);
      const holdEnd = 0.4;
      const vis = pt < 0.1 ? pt / 0.1 : pt < holdEnd ? 1 : Math.max(0, 1 - (pt - holdEnd) / (1 - holdEnd));
      if (vis > 0) {
        const cols = ["80,20,140", "120,40,180", "60,10,120", "140,50,200", "100,30,160", "160,60,220", "180,80,240"];
        const sw = w / cols.length;
        cols.forEach((cl, i) => {
          c.fillStyle = `rgba(${cl},${vis * 0.15})`;
          c.fillRect(i * sw, 0, sw, h);
        });
      }
    }
  },
  {
    name: "TV Moire Pattern",
    _ps: null,
    _arcs: null,
    render(c, w, h, t) {
      if (t <= CE) return;
      const pt = (t - CE) / (1 - CE);
      const fadeA = Math.max(0, 1 - pt);
      for (let y = 0; y < h; y += 3) {
        const v = Math.sin(y * 0.15 + t * 12) * Math.sin(y * 0.08 + t * 7);
        if (v > 0.3) {
          c.fillStyle = `rgba(120,40,200,${fadeA * v * 0.2})`;
          c.fillRect(0, y, w, 2);
        }
      }
    }
  },
  {
    name: "Implosion",
    _ps: null,
    _arcs: null,
    render(c, w, h, t, state) {
      if (t <= CE) return;
      const { cx, cy, mR } = state;
      if (!this._ps || t < CE + 0.01) {
        this._ps = [];
        [0.15, 0.3, 0.45, 0.6, 0.75].forEach(et => {
          const er = mR * (1 - et);
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            this._ps!.push({ x: 0, y: 0, vx: 0, vy: 0, sx: cx + Math.cos(a) * er, sy: cy + Math.sin(a) * er, sz: 1 + Math.random() * 2.5, life: 0.4 + Math.random() * 0.5 });
          }
        });
      }
      const pt = eI((t - CE) / (1 - CE));
      c.shadowBlur = 8;
      c.shadowColor = "#9030dd";
      this._ps!.forEach(p => {
        const x = p.sx! + (cx - p.sx!) * pt;
        const y = p.sy! + (cy - p.sy!) * pt;
        const alpha = Math.max(0, 1 - pt * 0.8);
        if (alpha > 0) { c.beginPath(); c.arc(x, y, p.sz * (1 - pt * 0.7), 0, Math.PI * 2); c.fillStyle = `rgba(130,40,200,${alpha * 0.7})`; c.fill(); }
      });
      c.shadowBlur = 0;
    }
  },
  {
    name: "Shatter Burst",
    _ps: null,
    _arcs: null,
    render(c, w, h, t, state) {
      if (t <= CE) return;
      const { cx, cy, mR } = state;
      if (!this._arcs || t < CE + 0.01) {
        this._arcs = [];
        [0.15, 0.3, 0.45].forEach(et => {
          const sr = mR * (1 - et);
          for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4 + Math.random() * 0.5;
            const spd = 1.5 + Math.random() * 2.5;
            this._arcs!.push({ x: 0, y: 0, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, sz: 0, life: 0, r: sr * 0.12, a, da: Math.PI / 5 });
          }
        });
      }
      const pt = (t - CE) / (1 - CE);
      c.shadowBlur = 5;
      c.shadowColor = "#8030cc";
      this._arcs!.forEach(arc => {
        const x = cx + arc.vx * pt * 60;
        const y = cy + arc.vy * pt * 60;
        const alpha = Math.max(0, 1 - pt * 1.4);
        if (alpha > 0) { c.beginPath(); c.arc(x, y, arc.r! * (1 - pt * 0.5), arc.a!, arc.a! + arc.da!); c.strokeStyle = `rgba(140,40,210,${alpha * 0.6})`; c.lineWidth = 2.5; c.stroke(); }
      });
      c.shadowBlur = 0;
    }
  },
  {
    name: "Pixel Scatter",
    _ps: null,
    _arcs: null,
    render(c, w, h, t, state) {
      if (t <= CE) return;
      const { cx, cy, mR } = state;
      if (!this._ps || t < CE + 0.01) {
        this._ps = [];
        [0.15, 0.3, 0.45].forEach(et => {
          const sr = mR * (1 - et);
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            const spd = 1.5 + Math.random() * 2.5;
            this._ps!.push({ x: cx + Math.cos(a) * sr, y: cy + Math.sin(a) * sr, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, w: 2 + Math.random() * 5, h: 1 + Math.random() * 3, sz: 0, life: 0.3 + Math.random() * 0.7 });
          }
        });
      }
      const pt = (t - CE) / (1 - CE);
      this._ps!.forEach(p => {
        const x = p.x + p.vx * pt * 55;
        const y = p.y + p.vy * pt * 55;
        const alpha = Math.max(0, 1 - pt / p.life);
        if (alpha > 0) {
          const br = Math.floor(60 + Math.random() * 60);
          c.fillStyle = `rgba(${br},15,${br + 70},${alpha * 0.55})`;
          c.fillRect(x, y, p.w! * (1 - pt * 0.5), p.h! * (1 - pt * 0.5));
        }
      });
    }
  },
  {
    name: "Gentle Float",
    _ps: null,
    _arcs: null,
    render(c, w, h, t, state) {
      if (t <= CE) return;
      const { cx, cy, mR } = state;
      if (!this._ps || t < CE + 0.01) {
        this._ps = [];
        [0.15, 0.3, 0.45, 0.6].forEach(et => {
          const sr = mR * (1 - et);
          for (let i = 0; i < 10; i++) {
            const a = Math.random() * Math.PI * 2;
            this._ps!.push({ x: cx + Math.cos(a) * sr, y: cy + Math.sin(a) * sr, vx: Math.cos(a) * 0.5, vy: Math.sin(a) * 0.5 - 0.3, sz: 1 + Math.random() * 2.2, life: 0.6 + Math.random() * 0.4 });
          }
        });
      }
      const pt = (t - CE) / (1 - CE);
      c.shadowBlur = 4;
      c.shadowColor = "#7030bb";
      this._ps!.forEach(p => {
        const x = p.x + p.vx * pt * 30 + Math.sin(pt * 3 + p.x * 0.1) * 2;
        const y = p.y + p.vy * pt * 25;
        const alpha = Math.max(0, 1 - pt / p.life);
        if (alpha > 0) { c.beginPath(); c.arc(x, y, p.sz * (1 - pt * 0.2), 0, Math.PI * 2); c.fillStyle = `rgba(120,40,190,${alpha * 0.5})`; c.fill(); }
      });
      c.shadowBlur = 0;
    }
  },
  {
    name: "Pulsing Ghost Rings",
    _ps: null,
    _arcs: null,
    render(c, w, h, t, state) {
      if (t <= CE) return;
      const { cx, cy, mR } = state;
      const echoes = [0.15, 0.3, 0.45, 0.6, 0.75];
      const fade = Math.max(0, 1 - (t - CE) / (1 - CE) * 0.8);
      c.shadowBlur = 4;
      c.shadowColor = "#8040cc";
      echoes.forEach((et, i) => {
        const er = mR * (1 - et);
        const pulse = 0.15 + 0.15 * Math.sin(t * 10 + i * 1.5);
        if (er > 1) { c.beginPath(); c.arc(cx, cy, er, 0, Math.PI * 2); c.strokeStyle = `rgba(130,50,200,${pulse * fade})`; c.lineWidth = 2; c.stroke(); }
      });
      c.shadowBlur = 0;
    }
  },
  {
    name: "Dotted Ring Residue",
    _ps: null,
    _arcs: null,
    render(c, w, h, t, state) {
      if (t <= CE) return;
      const { cx, cy, mR } = state;
      const pt = (t - CE) / (1 - CE);
      const fadeA = Math.max(0, 1 - pt * 1.2);
      const echoes = [0.15, 0.3, 0.45, 0.6, 0.75];
      c.setLineDash([3 + pt * 6, 4 + pt * 8]);
      c.shadowBlur = 3;
      c.shadowColor = "#9040dd";
      echoes.forEach(et => {
        const er = mR * (1 - et);
        if (er > 1 && fadeA > 0) { c.beginPath(); c.arc(cx, cy, er, 0, Math.PI * 2); c.strokeStyle = `rgba(130,50,200,${0.3 * fadeA})`; c.lineWidth = 2; c.stroke(); }
      });
      c.setLineDash([]);
      c.shadowBlur = 0;
    }
  }
];

export function getEffectCount(): number {
  return allEffects.length;
}

export interface CondenseTrailHandle {
  animationDone: Promise<void>;
  release: () => void;
  speedUp: (multiplier?: number) => void;
}

export function playCondenseTrailTransition(
  scene: Phaser.Scene,
  effectId: number = 0,
  duration: number = 1200,
  loadingTextureKey: string = "loading_bg",
  opts?: { bgTextureKey?: string; skipPostCondense?: boolean }
): CondenseTrailHandle {
  const texKey = "__condense_trail_overlay";
  if (scene.textures.exists(texKey)) {
    scene.textures.remove(texKey);
  }
  const tex = scene.textures.createCanvas(texKey, TRAIL_W, TRAIL_H);
  const ctx = tex.getContext();

  const overlay = scene.add.image(0, 0, texKey)
    .setOrigin(0)
    .setScale(2)
    .setDepth(9999);

  const loadingImg = scene.textures.get(loadingTextureKey).getSourceImage() as HTMLImageElement;

  const bgKey = opts?.bgTextureKey ?? "title_bg";
  const titleImg = scene.textures.get(bgKey).getSourceImage() as HTMLImageElement;

  let logoImg: HTMLImageElement | null = null;
  let tagline = "";

  if (!opts?.bgTextureKey) {
    try {
      const logoTex = scene.textures.get("logo");
      if (logoTex && logoTex.key !== "__MISSING") {
        logoImg = logoTex.getSourceImage() as HTMLImageElement;
      }
    } catch {}

    try {
      tagline = i18next.t("menu:tagline") || "";
    } catch {}
  }

  const idx = Math.max(0, Math.min(effectId, allEffects.length - 1));
  const effect = allEffects[idx];
  effect._ps = null;
  effect._arcs = null;

  const skipPost = opts?.skipPostCondense === true;
  const paint = (t: number) => {
    ctx.clearRect(0, 0, TRAIL_W, TRAIL_H);
    ctx.globalAlpha = 1;
    const state = baseCondenseTrail(ctx, TRAIL_W, TRAIL_H, t, CE, loadingImg, titleImg, logoImg, tagline);
    if (!skipPost) {
      effect.render(ctx, TRAIL_W, TRAIL_H, t, state);
    }
    tex.refresh();
  };

  paint(0);

  let animComplete = false;
  let released = false;
  let resolveAnimation: (() => void) | null = null;

  const animationDone = new Promise<void>(resolve => {
    resolveAnimation = resolve;
  });

  let speedMultiplier = 1;
  let accumulatedTime = 0;
  let lastFrameTime: number | null = null;
  let updateListenerActive = true;
  let frameCount = 0;
  let lastPaintedT = 0;
  const GAP_THRESHOLD = 48;
  const MAX_T_STEP = 0.035;

  const cleanup = () => {
    if (!overlay.scene) return;
    overlay.destroy();
    scene.textures.remove(texKey);
  };

  const onSceneUpdate = () => {
    if (!updateListenerActive) return;
    frameCount++;
    const now = performance.now();

    const frameElapsed = lastFrameTime !== null ? now - lastFrameTime : 0;
    lastFrameTime = now;

    if (frameElapsed > GAP_THRESHOLD) {
      accumulatedTime += 16;
    } else {
      accumulatedTime += frameElapsed * speedMultiplier;
    }

    const rawT = Math.min(accumulatedTime / duration, 1);
    const maxStep = MAX_T_STEP * Math.max(1, speedMultiplier);
    const t = Math.min(rawT, lastPaintedT + maxStep);
    lastPaintedT = t;

    paint(t);
    if (t >= 1 || (skipPost && t >= CE)) {
      updateListenerActive = false;
      scene.events.off("update", onSceneUpdate);
      animComplete = true;
      if (resolveAnimation) resolveAnimation();
      if (released) cleanup();
    }
  };
  scene.events.on("update", onSceneUpdate);

  return {
    animationDone,
    release: () => {
      released = true;
      if (animComplete) cleanup();
    },
    speedUp: (multiplier = 9) => { speedMultiplier = multiplier; }
  };
}