import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { Mode } from "#app/ui/ui.js";
import { SlideshowController, SlideConfig, SlideshowSceneAdapter } from "#app/utils/slideshow-controller.js";
import { runPowerUnlockOverlays } from "#app/utils/story-cutscene-power-overlays.js";
import { ensureCutsceneImagesLoaded, unloadCutsceneImages } from "#app/utils/cutscene-images.js";
import * as Utils from "#app/utils.js";

export interface SlideshowCutsceneConfig {
  slides: SlideConfig[];
  bgmKey?: string;
  useSceneBgm?: boolean;
  fadeDuration?: number;
  typewriterDelay?: number;
  pauseAfterText?: number;
  onComplete?: () => void;
  resumeBgmOnEnd?: boolean;
  canSkip?: boolean;
  defaultCharSound?: string;
  formatText?: (textKey: string, rawText: string) => string;
  onSlideChange?: (index: number, controller: SlideshowController) => void;
  onTextComplete?: (controller: SlideshowController) => void;
}

export class SlideshowCutscenePhase extends Phase {
  private config: SlideshowCutsceneConfig;
  private slideshowController: SlideshowController | null = null;
  private skipRequested: boolean = false;
  private currentSlideIndex: number = 0;
  private currentSlideTextComplete: boolean = false;
  private currentSlideStartedAt: number = 0;

  constructor(scene: BattleScene, config: SlideshowCutsceneConfig) {
    super(scene);
    this.config = {
      fadeDuration: 500,
      typewriterDelay: 24,
      pauseAfterText: 1100,
      resumeBgmOnEnd: true,
      canSkip: true,
      defaultCharSound: "ui/select",
      useSceneBgm: true,
      formatText: (_textKey: string, rawText: string) => rawText,
      ...config
    };
  }

  public canSkip(): boolean {
    return this.config.canSkip || false;
  }

  public skipCutscene(): void {
    this.skipRequested = true;
    this.slideshowController?.skip();
  }

  public nextSlide(): void {
    this.slideshowController?.next();
  }

  public isManualAdvanceBlocked(): boolean {
    if (this.slideshowController?.isAutoAdvanceBlocked?.() === true) {
      return true;
    }
    const slide = this.config.slides[this.currentSlideIndex];
    const pauseAfterText = slide?.pauseAfterText ?? this.config.pauseAfterText;
    const isHoldSlide = typeof pauseAfterText === "number" && pauseAfterText >= 9000000;
    const hasPendingDeferredRewards =
      this.scene.deferUnlockPopupsToPowerSlide &&
      this.scene.runUnlockRewardsShownIndex < this.scene.runUnlockRewards.length;
    return hasPendingDeferredRewards && isHoldSlide && !this.currentSlideTextComplete;
  }

  public isHoldToSkipAllowed(minMsSinceSlideStart: number = 300): boolean {
    return (this.scene.time.now - this.currentSlideStartedAt) >= minMsSinceSlideStart;
  }

  public isQuickSkipAllowed(minMsSinceSlideStart: number = 300): boolean {
    return (this.scene.time.now - this.currentSlideStartedAt) >= minMsSinceSlideStart;
  }

  public completeCurrentText(): void {
    this.slideshowController?.completeText?.();
  }

  public isCurrentTextComplete(): boolean {
    return this.slideshowController?.isTextComplete?.() === true;
  }

  start(): void {
    super.start();

    if (this.scene.disableCutscenes) {
      this.config.onComplete?.();
      this.end();
      return;
    }

    const useSceneBgm = this.config.useSceneBgm ?? true;

    const imageKeys = this.config.slides.flatMap(s => [s.imageKey, ...(s.imageSequenceKeys ?? [])]);
    (async () => {
      try {
        await ensureCutsceneImagesLoaded(this.scene, imageKeys);
      } catch {
        this.config.onComplete?.();
        this.end();
        return;
      }

      if (this.config.bgmKey && useSceneBgm) {
        this.scene.playBgm(this.config.bgmKey, true);
      } else {
        this.scene.fadeOutBgm(Utils.fixedInt(500), false);
      }

      await this.scene.ui.setModeForceTransition(Mode.SLIDESHOW_CUTSCENE);
      const sceneAdapter: SlideshowSceneAdapter = {
        add: this.scene.add,
        tweens: this.scene.tweens,
        time: this.scene.time,
        sound: this.scene.sound,
        game: this.scene.game,
        playSound: (key: string, config?: object) => this.scene.playSound(key, config),
      };

      this.slideshowController = new SlideshowController(sceneAdapter, {
        slides: this.config.slides,
        bgmKey: this.config.bgmKey && !useSceneBgm ? this.config.bgmKey : undefined,
        ignoreGameSpeed: true,
        fadeDuration: this.config.fadeDuration,
        typewriterDelay: this.config.typewriterDelay,
        pauseAfterText: this.config.pauseAfterText,
        canSkip: this.config.canSkip,
        defaultCharSound: this.config.defaultCharSound,
        formatText: this.config.formatText,
        onSlideChange: (index) => {
          if (!this.slideshowController) {
            return;
          }
          this.currentSlideIndex = index;
          this.currentSlideTextComplete = false;
          this.currentSlideStartedAt = this.scene.time.now;
          this.config.onSlideChange?.(index, this.slideshowController);
        },
        onTextComplete: () => {
          if (!this.slideshowController) {
            return;
          }
          this.currentSlideTextComplete = true;
          this.config.onTextComplete?.(this.slideshowController);
        },
        onComplete: () => {
          const shouldEnqueuePowerOverlaysAfterSkip =
            this.skipRequested &&
            !this.scene.disableCutscenes &&
            this.scene.deferUnlockPopupsToPowerSlide &&
            this.config.slides.some(s => s.imageKey === "power") &&
            this.scene.runUnlockRewardsShownIndex < this.scene.runUnlockRewards.length;

          if (shouldEnqueuePowerOverlaysAfterSkip) {
            const powerTextKey =
              this.config.slides.find(s => s.imageKey === "power")?.textKey ||
              "cutscene:rival_power";
            const powerSlides: SlideConfig[] = [
              { imageKey: "power", textKey: powerTextKey, pauseAfterText: 9999999 },
            ];
            this.scene.unshiftPhase(new SlideshowCutscenePhase(this.scene, {
              slides: powerSlides,
              bgmKey: this.config.bgmKey,
              useSceneBgm: this.config.useSceneBgm,
              fadeDuration: this.config.fadeDuration,
              typewriterDelay: this.config.typewriterDelay,
              pauseAfterText: this.config.pauseAfterText,
              resumeBgmOnEnd: this.config.resumeBgmOnEnd,
              canSkip: false,
              defaultCharSound: this.config.defaultCharSound,
              onTextComplete: (controller) => runPowerUnlockOverlays(this.scene, controller),
            }));
          }

          if (this.config.resumeBgmOnEnd && !shouldEnqueuePowerOverlaysAfterSkip) {
            this.scene.time.delayedCall(Utils.fixedInt(250), () => this.scene.playBgm());
          }
          this.config.onComplete?.();
          this.end();
        },
      });

      this.slideshowController.start();

      if (this.skipRequested) {
        this.slideshowController.skip();
      }
    })();
  }

  end(): void {
    this.slideshowController?.destroy();
    unloadCutsceneImages(this.scene, this.config.slides.flatMap(s => [s.imageKey, ...(s.imageSequenceKeys ?? [])]));
    if (this.scene.ui.getMode() === Mode.SLIDESHOW_CUTSCENE) {
      this.scene.ui.getHandler().clear();
      this.scene.ui.setMode(Mode.MESSAGE);
    }
    super.end();
  }
}