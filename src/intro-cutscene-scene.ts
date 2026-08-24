import Phaser from "phaser";
import { SlideshowController } from "./utils/slideshow-controller";
import { initI18n } from "./plugins/i18n";
import { isIPhone } from "./loading-scene";

export class IntroCutsceneScene extends Phaser.Scene {
  public static readonly KEY = "intro-cutscene";
  private slideshowController: SlideshowController | null = null;
  private variant: 'A' | 'B' = 'A';
  private gamepadSkipped: boolean = false;

  constructor() {
    super({ key: IntroCutsceneScene.KEY, input: { gamepad: false } });
    initI18n();
  }

  playSound(key: string, config?: object): void {
    if (this.sound && this.cache.audio.exists(key)) {
      const cfg: any = config ? { ...config } : {};
      try {
        const raw = localStorage.getItem("settings");
        if (raw) {
          const s = JSON.parse(raw);
          const mi = typeof s["MASTER_VOLUME"] === "number" ? s["MASTER_VOLUME"] : 5;
          const si = typeof s["SE_VOLUME"] === "number" ? s["SE_VOLUME"] : 10;
          const master = mi === 0 ? 0 : (mi * 10) * 0.01;
          const se = si === 0 ? 0 : (si * 10) * 0.01;
          const callerVol = typeof cfg.volume === "number" ? cfg.volume : 1;
          cfg.volume = master * se * callerVol;
        }
      } catch {}
      this.sound.play(key, cfg);
    }
  }

  init(data: { variant?: 'A' | 'B' }): void {
    this.variant = data?.variant || 'A';
  }
  public static queueSlideAssets(scene: Phaser.Scene, variant: 'A' | 'B'): void {
    const ext = (scene.game as any)?.device?.features?.webp ? "webp" : "png";
    const csFile = (name: string) =>
      isIPhone() ? `images/cutscenes/${name}_ios.webp` : `images/cutscenes/${name}.${ext}`;
    const slides = variant === 'A'
      ? ["peace", "voidbreak", "voidbreak2", "locked", "shadows", "you", "choose", "journey"]
      : ["shadows", "shadowPower", "power", "journey", "thronemystery"];
    slides.forEach((name, i) => {
      const key = `intro_slide_${i + 1}`;
      if (!scene.textures.exists(key)) {
        scene.load.image(key, csFile(name));
      }
    });
    if (!scene.textures.exists("cutscene_frame")) {
      scene.load.image("cutscene_frame", csFile("cutscene-frame"));
    }
  }

  preload(): void {
    IntroCutsceneScene.queueSlideAssets(this, this.variant);

    this.load.setPath("audio/");
    this.load.audio("wasteland", "bgm/wasteland.mp3");
    this.load.audio("char_sound", "se/select.wav");
  }

  create(): void {
    const slides = (this.variant === 'A')
      ? [
          { imageKey: "intro_slide_1", textKey: "cutscene:title_a_peace", fadeDuration: 200, transitionCadenceMs: 1350 },
          { imageKey: "intro_slide_2", textKey: "cutscene:title_a_voidbreak", fadeDuration: 200, transitionCadenceMs: 1350 },
          { imageKey: "intro_slide_3", textKey: "cutscene:title_a_voidbreak2", fadeDuration: 200, transitionCadenceMs: 1350 },
          { imageKey: "intro_slide_4", textKey: "cutscene:title_a_locked" },
          { imageKey: "intro_slide_5", textKey: "cutscene:title_a_shadows" },
          { imageKey: "intro_slide_6", textKey: "cutscene:title_a_you" },
          { imageKey: "intro_slide_7", textKey: "cutscene:title_a_choose" },
          { imageKey: "intro_slide_8", textKey: "cutscene:title_a_journey" },
        ]
      : [
          { imageKey: "intro_slide_1", textKey: "cutscene:title_b_shadows", fadeDuration: 200, transitionCadenceMs: 1350 },
          { imageKey: "intro_slide_2", textKey: "cutscene:title_b_shadowPower", fadeDuration: 200, transitionCadenceMs: 1350 },
          { imageKey: "intro_slide_3", textKey: "cutscene:title_b_power", fadeDuration: 200, transitionCadenceMs: 1350 },
          { imageKey: "intro_slide_4", textKey: "cutscene:title_b_journey" },
          { imageKey: "intro_slide_5", textKey: "cutscene:title_b_thronemystery" },
        ];

    this.slideshowController = new SlideshowController(this, {
      slides,
      bgmKey: "wasteland",
      canSkip: true,
      pauseAfterText: 1000,
      defaultCharSound: "char_sound",
      onComplete: () => {
        this.fadeOutAndComplete();
      },
    });

    this.slideshowController.start();

    this.input.keyboard?.on("keydown", () => {
      if (this.slideshowController) {
        this.slideshowController.skip();
      }
    });
    this.input.on("pointerdown", () => {
      if (this.slideshowController) {
        this.slideshowController.skip();
      }
    });
  }

  update(): void {
    if (this.gamepadSkipped || !this.slideshowController) {
      return;
    }
    try {
      const gamepads = navigator.getGamepads();
      if (!gamepads) {
        return;
      }
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp || !gp.connected) {
          continue;
        }
        for (let b = 0; b < gp.buttons.length; b++) {
          if (gp.buttons[b].pressed) {
            this.gamepadSkipped = true;
            this.slideshowController.skip();
            return;
          }
        }
      }
    } catch {}
  }

  private fadeOutAndComplete(): void {
    this.tweens.add({
      targets: this.cameras.main,
      alpha: 0,
      duration: 200,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.slideshowController?.destroy();
        this.slideshowController = null;
        for (let i = 1; i <= 8; i++) {
          const key = `intro_slide_${i}`;
          if (this.textures.exists(key)) {
            this.textures.remove(key);
          }
        }
        this.game.events.emit("introCutsceneComplete");
        this.scene.stop();
      }
    });
  }
}