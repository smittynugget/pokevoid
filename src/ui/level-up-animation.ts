import i18next from "i18next";
import BattleScene from "../battle-scene";
import { addTextObject, TextStyle } from "./text";
import { drawVfxFrame } from "./level-up-void-emerge-vfx";
import * as Utils from "../utils";
import { ModifierOption } from "./modifier-select-ui-handler";
import { SkillTreeRarity } from "../system/skill-tree-data";

export interface SkillRevealConfig {
  rarity: SkillTreeRarity;
  iconConfig: { key: string; frame: string; scale: number; inverted?: boolean; isChampionSprite?: boolean; offsetX?: number; offsetY?: number };
  skillName: string;
}

let currentAnimationSkipCallback: (() => void) | null = null;
let skipInputLocked = false;
let animationPhase: "playing" | "snapped" | "done" = "done";

export function skipCurrentLevelUpAnimation(): void {
  if (currentAnimationSkipCallback) {
    currentAnimationSkipCallback();
  }
}

export function getLevelUpAnimationPhase(): "playing" | "snapped" | "done" {
  return animationPhase;
}

export async function playGenericLevelUpAnimation(scene: BattleScene, textOverride?: string, wrapWidth?: number, skillRevealConfig?: SkillRevealConfig, isUnlock?: boolean, restoreBgmKey?: string | null): Promise<void> {
  return new Promise<void>((resolve) => {
    let isCompleted = false;
    let isSnapped = false;
    animationPhase = "playing";

    const animMode = scene.animationLoadMode ?? 2;

    if (animMode < 2) {
      const screenW = scene.game.canvas.width / 6;
      const screenH = scene.game.canvas.height / 6;
      const cX = Math.floor(scene.game.canvas.width / 12);
      const cY = Math.floor(-scene.game.canvas.height / 12);

      const container = scene.add.container(0, 0);
      container.setDepth(1000);
      scene.ui.add(container);

      let bgImg: Phaser.GameObjects.Image | null = null;
      if (scene.textures.exists("level_up")) {
        bgImg = scene.add.image(0, -screenH, "level_up");
        bgImg.setOrigin(0, 0);
        bgImg.setDisplaySize(screenW, screenH);
        bgImg.setAlpha(1);
        container.add(bgImg);
      }

      const isSkillReveal = !!skillRevealConfig;
      const isUnlockT = isUnlock || !!(textOverride && textOverride.includes("UNLOCKED"));
      const preBgmKey = restoreBgmKey ?? (scene as any).bgm?.key ?? null;

      let cardCont: Phaser.GameObjects.Container | null = null;
      if (skillRevealConfig) {
        cardCont = scene.add.container(cX, cY);
        const iconCfg = skillRevealConfig.iconConfig;
        if (scene.textures.exists(iconCfg.key)) {
          const ox = iconCfg.isChampionSprite ? 0 : (iconCfg.offsetX ?? 0);
          const oy = iconCfg.isChampionSprite ? 0 : (iconCfg.offsetY ?? 0);
          const icon = scene.add.sprite(ox, oy, iconCfg.key, iconCfg.frame);
          const iconScale = iconCfg.isChampionSprite ? iconCfg.scale * 0.5 : (iconCfg.scale >= 2.0 ? 1.75 : 0.875);
          icon.setScale(iconScale);
          icon.setOrigin(0.5, 0.5);
          if (iconCfg.inverted && icon.postFX && typeof icon.postFX.addColorMatrix === "function") {
            icon.postFX.addColorMatrix().negative();
          }
          cardCont.add(icon);
        }
        container.add(cardCont);
      }

      const fontSize = isSkillReveal ? 200 : (isUnlockT ? 220 : 280);
      const textStyle = { fontFamily: "emerald", fontSize: `${fontSize}px`, color: "#E0FFFF", stroke: "#4169E1", strokeThickness: Math.round(fontSize * 0.05), align: "center" as const, wordWrap: { width: wrapWidth ?? 800, useAdvancedWrap: true } };

      const txts: Phaser.GameObjects.Text[] = [];
      if (isSkillReveal && skillRevealConfig) {
        const sn = addTextObject(scene, cX, cY - 45, skillRevealConfig.skillName, TextStyle.WINDOW, textStyle);
        sn.setOrigin(0.5, 0.5); sn.setShadow(3, 3, "#6b5a73"); container.add(sn); txts.push(sn);
        const obtStr = isUnlockT ? i18next.t("championSelect:unlocked", { defaultValue: "UNLOCKED!" }).toUpperCase() : (textOverride ?? i18next.t("championLevelUp:obtained", { defaultValue: "Obtained!" }));
        const ot = addTextObject(scene, cX, cY + 45, obtStr, TextStyle.WINDOW, textStyle);
        ot.setOrigin(0.5, 0.5); ot.setShadow(3, 3, "#6b5a73"); container.add(ot); txts.push(ot);
      } else {
        const txt = textOverride ?? i18next.t("championSelect:levelUp", { defaultValue: "LEVEL UP!" });
        const t = addTextObject(scene, cX, cY, txt, TextStyle.WINDOW, textStyle);
        t.setOrigin(0.5, 0.5); t.setShadow(3, 3, "#6b5a73"); container.add(t); txts.push(t);
      }

      if (animMode === 0) {
        if (cardCont) cardCont.setAlpha(1);
        for (const t of txts) { t.setAlpha(1); }
      } else {
        if (cardCont) cardCont.setAlpha(0);
        for (const t of txts) { t.setAlpha(0); }
        const fadeTargets = cardCont ? [cardCont, ...txts] : txts;
        scene.tweens.add({ targets: fadeTargets, alpha: 1, duration: 400, ease: "Sine.easeIn" });
      }

      if (isSkillReveal) {
        const revealSound = ModifierOption.EMBER_RARITY_SOUNDS[skillRevealConfig!.rarity] || "se/shing";
        const soundConfig = revealSound.startsWith("battle_anims/") ? { volumeGroup: "se" } : {};
        scene.playSound(revealSound, soundConfig);
        scene.playBgm("battle_legendary_terapagos", true);
      } else {
        scene.playSound("evolution_fanfare_rse");
      }

      const clickZone = scene.add.rectangle(0, -screenH, screenW, screenH, 0x000000, 0);
      clickZone.setOrigin(0, 0); clickZone.setInteractive(); clickZone.setDepth(999); container.add(clickZone);

      let dismissed = false;
      const dismiss = () => {
        if (dismissed) return;
        dismissed = true;
        animationPhase = "done";
        for (const t of txts) { try { t.destroy(); } catch {} }
        if (cardCont) try { cardCont.destroy(); } catch {}
        if (bgImg) try { bgImg.destroy(); } catch {}
        container.destroy();
        if (isSkillReveal) { try { scene.playBgm(preBgmKey || (scene.currentBattle?.getBgmOverride(scene) || scene.arena?.bgm)); } catch {} }
        currentAnimationSkipCallback = null;
        resolve();
      };

      skipInputLocked = true;
      scene.time.delayedCall(200, () => { skipInputLocked = false; });
      currentAnimationSkipCallback = () => { if (!skipInputLocked) dismiss(); };
      clickZone.on("pointerdown", () => { if (!skipInputLocked) dismiss(); });
      scene.time.delayedCall(9000, dismiss);
      return;
    }

    const tweens: Phaser.Tweens.Tween[] = [];
    const timers: Phaser.Time.TimerEvent[] = [];
    const screenW = scene.game.canvas.width / 6;
    const screenH = scene.game.canvas.height / 6;
    const centerX = Math.floor(scene.game.canvas.width / 12);
    const centerY = Math.floor(-scene.game.canvas.height / 12);

    const container = scene.add.container(0, 0);
    container.setDepth(1000);
    scene.ui.add(container);

    const isSkillReveal = !!skillRevealConfig;
    const isUnlockText = isUnlock || !!(textOverride && textOverride.includes("UNLOCKED"));
    const preLevelUpBgmKey = restoreBgmKey ?? (scene as any).bgm?.key ?? null;

    let bgImage: Phaser.GameObjects.Image | null = null;
    if (scene.textures.exists("level_up")) {
      bgImage = scene.add.image(0, -screenH, "level_up");
      bgImage.setOrigin(0, 0);
      bgImage.setDisplaySize(screenW, screenH);
      bgImage.setAlpha(0);
      container.add(bgImage);

      tweens.push(scene.tweens.add({
        targets: bgImage,
        alpha: 1,
        duration: Utils.fixedInt(600) as any,
        ease: "Sine.easeIn"
      }));
    }

    const vfxGfx = scene.add.graphics();
    vfxGfx.setPosition(0, -screenH);
    container.add(vfxGfx);

    const BG_FADE_DURATION = 600;
    const EMBER_GLOW_LEAD = 375;
    const EMBER_DURATION = 800;
    const EMBER_GLOW_START = isSkillReveal ? BG_FADE_DURATION : 0;
    const EMBER_START = EMBER_GLOW_START + EMBER_GLOW_LEAD;
    const EMBER_REVEAL_DELAY = EMBER_GLOW_LEAD;
    const TEXT_START = isSkillReveal ? (EMBER_START + 450) : BG_FADE_DURATION;

    const emberVfx: Phaser.GameObjects.GameObject[] = [];
    const emberTimers: Phaser.Time.TimerEvent[] = [];

    if (skillRevealConfig) {
      ModifierOption.ensureEmberTextures(scene);
      const rarityColors = ModifierOption.EMBER_RARITY_COLORS[skillRevealConfig.rarity] || ModifierOption.EMBER_RARITY_COLORS[SkillTreeRarity.COMMON];
      const revealSound = ModifierOption.EMBER_RARITY_SOUNDS[skillRevealConfig.rarity] || "se/shing";
      const cardX = centerX;
      const cardY = centerY;

      const glowTexKey = "ember_mat_glow";
      const hasGlow = scene.textures.exists(glowTexKey);
      let glow: Phaser.GameObjects.Image | Phaser.GameObjects.Graphics;
      if (hasGlow) {
        const g = scene.add.image(cardX, cardY + 4, glowTexKey);
        g.setScale((67 * 1.4) / 64);
        g.setAlpha(0);
        g.setTint(Phaser.Display.Color.GetColor(rarityColors.glow[0], rarityColors.glow[1], rarityColors.glow[2]));
        glow = g;
      } else {
        const g = scene.add.graphics();
        g.fillStyle(Phaser.Display.Color.GetColor(rarityColors.glow[0], rarityColors.glow[1], rarityColors.glow[2]), 0.3);
        g.fillCircle(cardX, cardY + 4, 47);
        g.setAlpha(0);
        glow = g;
      }
      container.add(glow);
      emberVfx.push(glow);

      const glowTimer = scene.time.delayedCall(Utils.fixedInt(EMBER_GLOW_START) as any, () => {
        if (isCompleted) return;
        tweens.push(scene.tweens.add({
          targets: glow,
          alpha: 0.4,
          duration: Utils.fixedInt(EMBER_DURATION * 0.4) as any,
          ease: "Quad.easeIn"
        }));
      });
      timers.push(glowTimer);
      emberTimers.push(glowTimer);

      const softTexKey = "ember_mat_soft";
      const hasSoft = scene.textures.exists(softTexKey);
      const particleImages: Phaser.GameObjects.Image[] = [];
      if (hasSoft) {
        for (let j = 0; j < 10; j++) {
          const img = scene.add.image(cardX, cardY, softTexKey);
          img.setVisible(false);
          container.add(img);
          particleImages.push(img);
          emberVfx.push(img);
        }
      }

      if (particleImages.length > 0) {
        const FL = 0.65;
        const DRIFT_Y = 117;
        const J_STEP = 4;
        const X_SPREAD = 34;
        const mulberry32 = (seed: number): (() => number) => {
          let s = seed | 0;
          return () => {
            s = Math.imul(s ^ (s >>> 15), 0x735a2d97);
            s = Math.imul(s ^ (s >>> 15), 0x345d67ad);
            return ((s ^= s >>> 16) >>> 0) / 4294967296;
          };
        };

        const particleStartTimer = scene.time.delayedCall(Utils.fixedInt(EMBER_GLOW_START) as any, () => {
          if (isCompleted) return;
          const counter = scene.tweens.addCounter({
            from: 0, to: 1,
            duration: Utils.fixedInt(EMBER_DURATION) as any,
            onUpdate: (t: Phaser.Tweens.Tween) => {
              if (isCompleted) return;
              const p = t.getValue();
              if (p <= 0.03 || p >= FL + 0.2) {
                for (const img of particleImages) img.setVisible(false);
                return;
              }
              const ea = Math.min(1, p / 0.06) * Math.max(0, 1 - (p - FL) / 0.2);
              const Rf = mulberry32(1);
              for (let j = 0; j < particleImages.length; j++) {
                const img = particleImages[j];
                const ex = cardX + (Rf() - 0.5) * X_SPREAD;
                const ey = cardY + 4 - (p * DRIFT_Y * Rf() + j * J_STEP);
                const radius = 2 + Rf() * 2;
                const alpha = ea * 0.6 * Rf();
                const cVar = Rf() * 40 - 20;
                const pr = Math.min(255, Math.max(0, rarityColors.particle[0] + cVar));
                const pg = Math.min(255, Math.max(0, rarityColors.particle[1] + cVar));
                const pb = Math.min(255, Math.max(0, rarityColors.particle[2] + cVar));
                img.setVisible(alpha > 0.01);
                img.setPosition(ex, ey);
                img.setScale((radius / 8) * 1.25);
                img.setTint(Phaser.Display.Color.GetColor(Math.floor(pr), Math.floor(pg), Math.floor(pb)));
                img.setAlpha(alpha);
              }
            },
            onComplete: () => {
              for (const img of particleImages) img.setVisible(false);
            }
          });
          tweens.push(counter as unknown as Phaser.Tweens.Tween);
        });
        timers.push(particleStartTimer);
        emberTimers.push(particleStartTimer);
      }

      const cardContainer = scene.add.container(cardX, cardY);
      cardContainer.setAlpha(0);
      container.add(cardContainer);
      emberVfx.push(cardContainer);

      const iconCfg = skillRevealConfig.iconConfig;
      if (scene.textures.exists(iconCfg.key)) {
        const ox = iconCfg.isChampionSprite ? 0 : (iconCfg.offsetX ?? 0);
        const oy = iconCfg.isChampionSprite ? 0 : (iconCfg.offsetY ?? 0);
        const icon = scene.add.sprite(ox, oy, iconCfg.key, iconCfg.frame);
        const iconScale = iconCfg.isChampionSprite
          ? iconCfg.scale * 0.5
          : (iconCfg.scale >= 2.0 ? 1.75 : 0.875);
        icon.setScale(iconScale);
        icon.setOrigin(0.5, 0.5);
        if (iconCfg.inverted && icon.postFX && typeof icon.postFX.addColorMatrix === "function") {
          icon.postFX.addColorMatrix().negative();
        }
        cardContainer.add(icon);
      }

      const cardRevealTimer = scene.time.delayedCall(Utils.fixedInt(EMBER_START) as any, () => {
        if (isCompleted) return;
        cardContainer.setAlpha(1);

        if (glow?.active) {
          scene.tweens.killTweensOf(glow);
          (glow as any).setAlpha(0.4);
          tweens.push(scene.tweens.add({
            targets: glow,
            alpha: 0.2,
            duration: Utils.fixedInt((EMBER_DURATION - EMBER_REVEAL_DELAY) * 0.5) as any,
            ease: "Quad.easeOut"
          }));
        }

        if (cardContainer.postFX && typeof cardContainer.postFX.addPixelate === "function") {
          const pixFx = cardContainer.postFX.addPixelate(20);
          tweens.push(scene.tweens.add({
            targets: pixFx,
            amount: -1,
            duration: Utils.fixedInt((EMBER_DURATION - EMBER_REVEAL_DELAY) * 0.95) as any,
            ease: "Linear",
            onComplete: () => {
              if (cardContainer.postFX) cardContainer.postFX.remove(pixFx);
            }
          }) as unknown as Phaser.Tweens.Tween);
        }

        const soundConfig = revealSound.startsWith("battle_anims/") ? { volumeGroup: "se" } : {};
        scene.playSound(revealSound, soundConfig);
      });
      timers.push(cardRevealTimer);
      emberTimers.push(cardRevealTimer);
    }

    let revealTexts: Phaser.GameObjects.Text[] = [];
    let maskGfx: Phaser.GameObjects.Graphics | null = null;
    let baseScale = 0;
    let fanfarePlayed = false;
    let maxMaskR = 0;
    let currentScale = 2.0;
    let currentMaskR = 0;
    let currentBrightness = 0;
    let pulseTimer: Phaser.Time.TimerEvent | null = null;

    function applyFrame(): void {
      if (isCompleted || revealTexts.length === 0) return;
      for (const t of revealTexts) {
        t.setScale(baseScale * currentScale);
        t.setAlpha(Math.min(1, currentMaskR / 0.6));
        const v = Math.round(currentBrightness * 255);
        t.setTint(Phaser.Display.Color.GetColor(v, v, v));
      }
      if (maskGfx) {
        maskGfx.clear();
        maskGfx.fillStyle(0xffffff, 1);
        maskGfx.fillCircle(0, 0, maxMaskR * currentMaskR);
      }
    }

    const createRevealTexts = () => {
      const fontSize = isSkillReveal ? 200 : (isUnlockText ? 220 : 280);
      const textStyle = {
        fontFamily: "emerald",
        fontSize: `${fontSize}px`,
        color: "#E0FFFF",
        stroke: "#4169E1",
        strokeThickness: Math.round(fontSize * 0.05),
        align: "center" as const,
        wordWrap: { width: wrapWidth ?? 800, useAdvancedWrap: true }
      };

      if (isSkillReveal && skillRevealConfig) {
        const skillNameY = centerY - 45;
        const obtainedY = centerY + 45;

        const skillNameText = addTextObject(scene, centerX, skillNameY, skillRevealConfig.skillName, TextStyle.WINDOW, textStyle);
        skillNameText.setOrigin(0.5, 0.5);
        skillNameText.setShadow(3, 3, "#6b5a73");
        container.add(skillNameText);

        const obtainedStr = isUnlockText
          ? i18next.t("championSelect:unlocked", { defaultValue: "UNLOCKED!" }).toUpperCase()
          : (textOverride ?? i18next.t("championLevelUp:obtained", { defaultValue: "Obtained!" }));
        const obtainedText = addTextObject(scene, centerX, obtainedY, obtainedStr, TextStyle.WINDOW, textStyle);
        obtainedText.setOrigin(0.5, 0.5);
        obtainedText.setShadow(3, 3, "#6b5a73");
        container.add(obtainedText);

        revealTexts = [skillNameText, obtainedText];
      } else {
        const text = textOverride ?? i18next.t("championSelect:levelUp", { defaultValue: "LEVEL UP!" });
        const textY = centerY;
        const title = addTextObject(scene, centerX, textY, text, TextStyle.WINDOW, textStyle);
        title.setOrigin(0.5, 0.5);
        title.setShadow(3, 3, "#6b5a73");
        container.add(title);

        revealTexts = [title];

        maskGfx = scene.make.graphics({});
        maskGfx.setPosition(centerX * 6, (screenH + textY) * 6);
        const geoMask = maskGfx.createGeometryMask();
        title.setMask(geoMask);
      }

      baseScale = revealTexts[0].scaleX;
    };

    const textCreationTimer = scene.time.delayedCall(Utils.fixedInt(TEXT_START) as any, () => {
      if (isCompleted) return;

      createRevealTexts();

      if (isSkillReveal) {
        for (const t of revealTexts) {
          t.setAlpha(0);
          t.setScale(0);
          t.setShadow(0, 0, "#ff0000", 80, true, true);
        }

        const INFERNO_KF = [
          { t: 0.00, scale: 0,   alpha: 0, blur: 80 },
          { t: 0.30, scale: 1.8, alpha: 1, blur: 40 },
          { t: 0.50, scale: 0.7, alpha: 1, blur: 25 },
          { t: 0.70, scale: 1.2, alpha: 1, blur: 12 },
          { t: 1.00, scale: 1.0, alpha: 1, blur: 0 },
        ];
        const INFERNO_COLORS = ["#ff0000", "#ff4400", "#ffa500", "#ffd700", "#6b5a73"];

        function sampleInferno(p: number) {
          for (let i = 0; i < INFERNO_KF.length - 1; i++) {
            const a = INFERNO_KF[i], b = INFERNO_KF[i + 1];
            if (p <= b.t) {
              const u = (p - a.t) / (b.t - a.t);
              return {
                scale: a.scale + (b.scale - a.scale) * u,
                alpha: a.alpha + (b.alpha - a.alpha) * u,
                blur: a.blur + (b.blur - a.blur) * u,
              };
            }
          }
          return { scale: 1, alpha: 1, blur: 0 };
        }

        function getInfernoColor(p: number): string {
          if (p < 0.30) return INFERNO_COLORS[0];
          if (p < 0.50) return INFERNO_COLORS[1];
          if (p < 0.70) return INFERNO_COLORS[2];
          if (p < 1.00) return INFERNO_COLORS[3];
          return INFERNO_COLORS[4];
        }

        const infernoTween = scene.tweens.addCounter({
          from: 0, to: 100,
          duration: Utils.fixedInt(900) as any,
          ease: "Quad.easeOut",
          onUpdate: (tw: Phaser.Tweens.Tween) => {
            if (isCompleted) return;
            const p = tw.getValue() / 100;
            const kf = sampleInferno(p);
            const color = getInfernoColor(p);
            for (const t of revealTexts) {
              t.setScale(baseScale * kf.scale);
              t.setAlpha(kf.alpha);
              if (kf.blur > 0) {
                t.setShadow(0, 0, color, Math.round(kf.blur), true, true);
              } else {
                t.setShadow(3, 3, "#6b5a73");
              }
              if (p < 0.3) {
                t.setTint(0xFFFFFF);
              } else if (p < 0.5) {
                t.setTint(0xFFEEDD);
              } else {
                t.clearTint();
              }
            }
          },
          onComplete: () => {
            if (isCompleted) return;
            for (const t of revealTexts) {
              t.clearTint();
              t.setScale(baseScale);
              t.setAlpha(1);
              t.setShadow(3, 3, "#6b5a73");
            }
          }
        });
        tweens.push(infernoTween as unknown as Phaser.Tweens.Tween);

        let pClock = 0;
        pulseTimer = scene.time.addEvent({
          delay: Utils.fixedInt(50) as any,
          loop: true,
          callback: () => {
            if (isCompleted) return;
            pClock += 0.05;
            const s = 1 + 0.06 * Math.sin(pClock * 3);
            for (const t of revealTexts) t.setScale(baseScale * s);
          }
        });
        const pulseStartTimer = scene.time.delayedCall(Utils.fixedInt(900) as any, () => {
          if (!isCompleted && pulseTimer) {
            timers.push(pulseTimer);
          }
        });
        timers.push(pulseStartTimer);
      } else {
        for (const t of revealTexts) {
          t.setAlpha(0);
          t.setScale(baseScale * 2);
          t.setTint(0x000000);
        }

        const halfW = (revealTexts[0].displayWidth / revealTexts[0].scaleX) * baseScale / 2;
        const halfH = (revealTexts[0].displayHeight / revealTexts[0].scaleY) * baseScale / 2;
        maxMaskR = Math.hypot(halfW, halfH) * 6;

        const phase1 = scene.tweens.addCounter({
          from: 0, to: 100, duration: Utils.fixedInt(600) as any, ease: "Quad.easeOut",
          onUpdate: (tw: Phaser.Tweens.Tween) => {
            const t = tw.getValue() / 100;
            currentScale = 2.0 + (1.1 - 2.0) * t;
            currentMaskR = 0.6 * t;
            currentBrightness = 0.5 * t;
            applyFrame();
          }
        });
        tweens.push(phase1 as unknown as Phaser.Tweens.Tween);

        const phase2 = scene.tweens.addCounter({
          from: 0, to: 100, duration: Utils.fixedInt(360) as any, ease: "Quad.easeOut", delay: Utils.fixedInt(600) as any,
          onUpdate: (tw: Phaser.Tweens.Tween) => {
            const t = tw.getValue() / 100;
            currentScale = 1.1 + (0.98 - 1.1) * t;
            currentMaskR = 0.6 + (0.9 - 0.6) * t;
            currentBrightness = 0.5 + 0.4 * t;
            applyFrame();
          }
        });
        tweens.push(phase2 as unknown as Phaser.Tweens.Tween);

        const phase3 = scene.tweens.addCounter({
          from: 0, to: 100, duration: Utils.fixedInt(240) as any, ease: "Quad.easeOut", delay: Utils.fixedInt(960) as any,
          onUpdate: (tw: Phaser.Tweens.Tween) => {
            const t = tw.getValue() / 100;
            currentScale = 0.98 + (1.0 - 0.98) * t;
            currentMaskR = 0.9 + 0.1 * t;
            currentBrightness = 0.9 + 0.1 * t;
            applyFrame();
          },
          onComplete: () => {
            if (isCompleted) return;
            for (const t of revealTexts) {
              t.clearTint();
              t.setTint(0xFFFFFF);
              t.clearMask();
            }
            if (maskGfx) { try { maskGfx.destroy(); } catch {} maskGfx = null; }
          }
        });
        tweens.push(phase3 as unknown as Phaser.Tweens.Tween);

        let pClock = 0;
        pulseTimer = scene.time.addEvent({
          delay: Utils.fixedInt(50) as any,
          loop: true,
          callback: () => {
            if (isCompleted) return;
            pClock += 0.05;
            const s = 1 + 0.06 * Math.sin(pClock * 3);
            for (const t of revealTexts) t.setScale(baseScale * s);
          }
        });
        const pulseStartTimer = scene.time.delayedCall(Utils.fixedInt(1200) as any, () => {
          if (!isCompleted && pulseTimer) {
            timers.push(pulseTimer);
          }
        });
        timers.push(pulseStartTimer);
      }
    });
    timers.push(textCreationTimer);

    let ringClock = 0;
    let trailT = 0;
    const vfxStartTimer = scene.time.delayedCall(Utils.fixedInt(TEXT_START) as any, () => {
      if (isCompleted) return;
      const vfxTimer = scene.time.addEvent({
        delay: Utils.fixedInt(16) as any,
        loop: true,
        callback: () => {
          if (isCompleted) return;
          const dt = scene.game.loop.delta / 1000;
          ringClock += dt;
          trailT += dt / 1.4;
          if (trailT > 1) trailT -= 1;
          drawVfxFrame(vfxGfx, screenW, screenH, ringClock, trailT);
        }
      });
      timers.push(vfxTimer);
    });
    timers.push(vfxStartTimer);

    const fanfareDelay = isSkillReveal ? TEXT_START : BG_FADE_DURATION;
    const soundDelayTimer = scene.time.delayedCall(Utils.fixedInt(fanfareDelay) as any, () => {
      if (!isCompleted && !fanfarePlayed) {
        fanfarePlayed = true;
        if (isSkillReveal) {
          scene.playBgm("battle_legendary_terapagos", true);
        } else {
          scene.playSound("evolution_fanfare_rse");
        }
      }
    });
    timers.push(soundDelayTimer);

    const snapToEndState = () => {
      if (isCompleted || isSnapped) return;
      isSnapped = true;
      animationPhase = "snapped";
      timers.forEach(timer => { if (timer) timer.remove(); });

      if (revealTexts.length === 0 && !isCompleted) {
        createRevealTexts();
      }

      if (!fanfarePlayed) {
        fanfarePlayed = true;
        if (isSkillReveal) {
          scene.playBgm("battle_legendary_terapagos", true);
        } else {
          scene.playSound("evolution_fanfare_rse");
        }
      }

      if (pulseTimer) pulseTimer.remove();
      tweens.forEach(tween => { if (tween) { try { (tween as any).stop(); } catch {} } });
      emberTimers.forEach(t => { if (t) t.remove(); });
      if (bgImage) bgImage.setAlpha(1);
      for (const t of revealTexts) {
        try { scene.tweens.killTweensOf(t); t.clearTint(); t.setAlpha(1); t.clearMask(); t.setScale(baseScale || 1); } catch {}
      }
      if (maskGfx) { try { maskGfx.destroy(); maskGfx = null as any; } catch {} }
      for (const obj of emberVfx) {
        try { scene.tweens.killTweensOf(obj); (obj as any).setAlpha?.(1); } catch {}
      }
      try { drawVfxFrame(vfxGfx, screenW, screenH, 999, 1); } catch {}
      skipInputLocked = true;
      scene.time.delayedCall(Utils.fixedInt(200) as any, () => {
        skipInputLocked = false;
      });
    };

    const cleanup = () => {
      if (isCompleted) return;
      isCompleted = true;
      animationPhase = "done";

      try {
        timers.forEach(timer => {
          if (timer) timer.remove();
        });
        if (pulseTimer) pulseTimer.remove();
        tweens.forEach(tween => {
          if (tween) {
            try { (tween as any).stop(); } catch {}
          }
        });
        for (const t of revealTexts) {
          try { scene.tweens.killTweensOf(t); t.clearMask(); t.destroy(); } catch {}
        }
        for (const obj of emberVfx) {
          try { if ((obj as any).postFX) { (obj as any).postFX.clear(); } scene.tweens.killTweensOf(obj); obj.destroy(); } catch {}
        }
        if (maskGfx) { try { maskGfx.destroy(); } catch {} }
        vfxGfx.destroy();
        if (bgImage) bgImage.destroy();
        container.destroy();
        if (isSkillReveal) { try { scene.playBgm(preLevelUpBgmKey || (scene.currentBattle?.getBgmOverride(scene) || scene.arena?.bgm)); } catch {} }
        currentAnimationSkipCallback = null;
        skipInputLocked = false;
        resolve();
      } catch (e) {
        try { if (maskGfx) maskGfx.destroy(); } catch {}
        try { vfxGfx.destroy(); } catch {}
        try { if (bgImage) bgImage.destroy(); } catch {}
        try { container.destroy(); } catch {}
        if (isSkillReveal) { try { scene.playBgm(preLevelUpBgmKey || (scene.currentBattle?.getBgmOverride(scene) || scene.arena?.bgm)); } catch {} }
        currentAnimationSkipCallback = null;
        skipInputLocked = false;
        resolve();
      }
    };

    skipInputLocked = true;
    const skipLockDuration = isSkillReveal ? 1425 : 600;
    scene.time.delayedCall(Utils.fixedInt(skipLockDuration), () => { skipInputLocked = false; });

    currentAnimationSkipCallback = () => {
      if (skipInputLocked) return;
      if (isCompleted) return;
      if (!isSnapped) {
        snapToEndState();
        return;
      }
      cleanup();
    };

    const clickZone = scene.add.rectangle(0, -screenH, screenW, screenH, 0x000000, 0);
    clickZone.setOrigin(0, 0);
    clickZone.setInteractive();
    clickZone.setDepth(999);
    container.add(clickZone);
    clickZone.on("pointerdown", () => {
      if (skipInputLocked || isCompleted) return;
      if (!isSnapped) snapToEndState();
      else cleanup();
    });

    const safetyTimer = scene.time.delayedCall(Utils.fixedInt(9000) as any, () => {
      if (!isCompleted && !isSnapped) {
        snapToEndState();
      } else if (!isCompleted) {
        cleanup();
      }
    });
    timers.push(safetyTimer);
  });
}