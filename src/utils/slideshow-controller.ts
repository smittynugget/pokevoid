import i18next from "i18next";
import * as Utils from "#app/utils.js";

export interface SlideConfig {
  imageKey: string;
  textKey: string;
  charSoundKey?: string;
  pauseAfterText?: number;
  fadeDuration?: number;
  transitionCadenceMs?: number;
  keepText?: boolean;
  imageSequenceKeys?: string[];
  imageSequenceFrameDuration?: number;
  imageSequenceFadeOutMs?: number;
  imageSequenceFadeInMs?: number;
  imageSequenceStartAfterText?: boolean;
  imageSequenceCrossFadeMs?: number;
}

export interface SlideshowControllerConfig {
  slides: SlideConfig[];
  bgmKey?: string;
  fadeDuration?: number;
  typewriterDelay?: number;
  pauseAfterText?: number;
  canSkip?: boolean;
  ignoreGameSpeed?: boolean;
  defaultCharSound?: string;
  imageScaleMultiplier?: number;
  textOffsetFromImage?: number;
  onSlideChange?: (index: number) => void;
  onTextComplete?: () => void;
  onComplete?: () => void;
  onBeforeFade?: () => void;
  formatText?: (textKey: string, rawText: string) => string;
}

export interface SlideshowSceneAdapter {
  add: Phaser.GameObjects.GameObjectFactory;
  tweens: Phaser.Tweens.TweenManager;
  time: Phaser.Time.Clock;
  sound: Phaser.Sound.BaseSoundManager;
  game: Phaser.Game;
  playSound?: (key: string, config?: object) => void;
}

export class SlideshowController {
  private static readonly FRAME_NATIVE = { w: 960, h: 540 };
  private static readonly FRAME_VIEWPORT_TOP = 41;
  private static readonly FRAME_VIEWPORT_BOTTOM = 477;
  private static readonly FRAME_BOTTOM_BAND_TOP = 478;

  private scene: SlideshowSceneAdapter;
  private config: Required<SlideshowControllerConfig>;
  private container: Phaser.GameObjects.Container | null = null;
  private background: Phaser.GameObjects.Rectangle | null = null;
  private frameOverlay: Phaser.GameObjects.Image | null = null;
  private viewportMaskShape: Phaser.GameObjects.Graphics | null = null;
  private viewportMask: Phaser.Display.Masks.GeometryMask | null = null;
  private currentImage: Phaser.GameObjects.Image | null = null;
  private textObject: Phaser.GameObjects.Text | null = null;
  private bgm: Phaser.Sound.BaseSound | null = null;
  private textTimer: Phaser.Time.TimerEvent | null = null;
  private advanceTimer: Phaser.Time.TimerEvent | null = null;
  private autoAdvanceBlocked: boolean = false;
  private imageSequenceTimers: Phaser.Time.TimerEvent[] = [];
  private pendingImageSequenceSlideIndex: number | null = null;
  private currentSlideIndex: number = 0;
  private isEnding: boolean = false;
  private fullText: string = "";
  private textCompleteFired: boolean = false;
  private textCompletedAt: number = 0;

  private readonly DEFAULTS = {
    fadeDuration: 500,
    typewriterDelay: 24,
    pauseAfterText: 3000,
    canSkip: false,
    ignoreGameSpeed: false,
    defaultCharSound: "",
    imageScaleMultiplier: 1.0,
    textOffsetFromImage: 20,
  };

  constructor(scene: SlideshowSceneAdapter, config: SlideshowControllerConfig) {
    this.scene = scene;
    this.config = {
      ...this.DEFAULTS,
      onSlideChange: () => {},
      onTextComplete: () => {},
      onComplete: () => {},
      formatText: (_textKey: string, rawText: string) => rawText,
      ...config,
    } as Required<SlideshowControllerConfig>;
  }

  private toTime(value: number): any {
    return this.config.ignoreGameSpeed ? (Utils.fixedInt(value) as any) : value;
  }

  private getCutsceneLayout() {
    const screenWidth = this.scene.game.canvas.width;
    const screenHeight = this.scene.game.canvas.height;
    const scale = screenWidth / SlideshowController.FRAME_NATIVE.w;
    const vpTop = SlideshowController.FRAME_VIEWPORT_TOP * scale;
    const vpBottom = SlideshowController.FRAME_VIEWPORT_BOTTOM * scale;
    const vpH = vpBottom - vpTop;
    const bandTop = SlideshowController.FRAME_BOTTOM_BAND_TOP * scale;
    const bandH = screenHeight - bandTop;
    return {
      scale,
      screenWidth,
      screenHeight,
      viewportTop: vpTop,
      viewportLeft: 0,
      viewportWidth: screenWidth,
      viewportHeight: vpH,
      imageCenterX: screenWidth / 2,
      imageCenterY: vpTop + vpH / 2,
      imageMaxW: screenWidth,
      imageMaxH: vpH,
      textCenterX: screenWidth / 2,
      textCenterY: bandTop + bandH / 2,
      textWrapWidth: screenWidth - 120,
    };
  }

  private ensureViewportMask(): Phaser.Display.Masks.GeometryMask {
    if (this.viewportMask) return this.viewportMask;
    const layout = this.getCutsceneLayout();
    this.viewportMaskShape = this.scene.add.graphics();
    this.viewportMaskShape.fillStyle(0xffffff, 1);
    this.viewportMaskShape.fillRect(
      layout.viewportLeft,
      layout.viewportTop,
      layout.viewportWidth,
      layout.viewportHeight
    );
    this.viewportMask = this.viewportMaskShape.createGeometryMask();
    return this.viewportMask;
  }

  public start(container?: Phaser.GameObjects.Container): void {
    if (container) {
      this.container = container;
    } else {
      this.createContainer();
    }
    this.startBgm();
    this.showSlide(0);
  }

  public canSkip(): boolean {
    return this.config.canSkip;
  }

  public skip(): void {
    if (this.config.canSkip && !this.isEnding) {
      this.endSlideshow();
    }
  }

  public destroy(): void {
    this.cleanup();
  }

  public getContainer(): Phaser.GameObjects.Container | null {
    return this.container;
  }

  public blockAutoAdvance(): void {
    this.autoAdvanceBlocked = true;
    if (this.advanceTimer) {
      this.advanceTimer.remove();
      this.advanceTimer = null;
    }
  }

  public isAutoAdvanceBlocked(): boolean {
    return this.autoAdvanceBlocked;
  }

  public isTextComplete(): boolean {
    return this.textCompleteFired;
  }

  public completeText(): void {
    if (this.isEnding) {
      return;
    }
    if (!this.textTimer) {
      return;
    }
    this.textObject?.setText(this.fullText);
    this.onTextComplete();
  }

  public next(): void {
    if (this.isEnding) {
      return;
    }
    this.advanceToNextSlide();
  }

  public isTextReadyForAdvance(delayMs: number = 250): boolean {
    return this.textCompleteFired && this.textCompletedAt > 0 && (Date.now() - this.textCompletedAt) >= delayMs;
  }

  private createContainer(): void {
    const layout = this.getCutsceneLayout();

    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(10);

    this.background = this.scene.add.rectangle(
      layout.screenWidth / 2,
      layout.screenHeight / 2,
      layout.screenWidth,
      layout.screenHeight,
      0x000000,
      1
    );
    this.background.setInteractive();
    this.container.add(this.background);

    const hasFrame = !!(this.scene as any).textures?.exists?.("cutscene_frame") ||
                     !!(this.scene.game as any)?.textures?.exists?.("cutscene_frame");
    if (hasFrame) {
      this.frameOverlay = this.scene.add.image(
        layout.screenWidth / 2,
        layout.screenHeight / 2,
        "cutscene_frame"
      );
      this.frameOverlay.setOrigin(0.5, 0.5);
      this.frameOverlay.setScale(layout.screenWidth / this.frameOverlay.width);
      this.container.add(this.frameOverlay);
    }

    this.textObject = this.scene.add.text(
      layout.textCenterX,
      layout.textCenterY,
      "",
      {
        fontFamily: "emerald",
        fontSize: "38px",
        color: "#ffffff",
        align: "center",
        wordWrap: { width: layout.textWrapWidth },
      }
    );
    this.textObject.setOrigin(0.5, 0.5);
    this.textObject.setShadow(0, 0, "#E8D4F5", 8, true, true);
    this.container.add(this.textObject);
  }

  private startBgm(): void {
    if (this.config.bgmKey) {
      let vol = 0.5;
      try {
        const raw = localStorage.getItem("settings");
        if (raw) {
          const s = JSON.parse(raw);
          const mi = typeof s["MASTER_VOLUME"] === "number" ? s["MASTER_VOLUME"] : 5;
          const bi = typeof s["BGM_VOLUME"] === "number" ? s["BGM_VOLUME"] : 10;
          const master = mi === 0 ? 0 : (mi * 10) * 0.01;
          const bgm = bi === 0 ? 0 : (bi * 10) * 0.01;
          vol = master * bgm;
        }
      } catch {}
      this.bgm = this.scene.sound.add(this.config.bgmKey, {
        loop: true,
        volume: vol,
      });
      this.bgm.play();
    }
  }

  private clearImageSequenceTimers(): void {
    this.imageSequenceTimers.forEach(t => t.remove(false));
    this.imageSequenceTimers = [];
  }

  private applyScaleToImage(image: Phaser.GameObjects.Image, _screenWidth?: number, _screenHeight?: number): void {
    const layout = this.getCutsceneLayout();
    const scaleX = layout.imageMaxW / image.width;
    const scaleY = layout.imageMaxH / image.height;
    const scale = Math.max(scaleX, scaleY) * this.config.imageScaleMultiplier;
    image.setScale(scale);
  }

  private startImageSequenceForSlide(slide: SlideConfig): void {
    this.clearImageSequenceTimers();
    if (!this.currentImage) return;

    const keys = slide.imageSequenceKeys || [];
    const frameDuration = slide.imageSequenceFrameDuration || 0;
    if (!keys.length || frameDuration <= 0) return;

    const fadeOutMs = slide.imageSequenceFadeOutMs ?? 0;
    const fadeInMs = slide.imageSequenceFadeInMs ?? 0;
    const crossFadeMs = slide.imageSequenceCrossFadeMs ?? 0;
    const screenWidth = this.scene.game.canvas.width;
    const screenHeight = this.scene.game.canvas.height;
    const indexToken = this.currentSlideIndex;

    keys.forEach((key, i) => {
      const swapAt = frameDuration * (i + 1);
      if (crossFadeMs > 0) {
        const fadeStartAt = Math.max(0, swapAt - crossFadeMs);
        const t = this.scene.time.delayedCall(this.toTime(fadeStartAt), () => {
          if (this.isEnding) return;
          if (this.currentSlideIndex !== indexToken) return;
          if (!this.currentImage) return;
          if (!this.container) return;

          const prevImage = this.currentImage;
          const seqLayout = this.getCutsceneLayout();
          const nextImage = this.scene.add.image(
            seqLayout.imageCenterX,
            seqLayout.imageCenterY,
            key
          );
          nextImage.setOrigin(0.5, 0.5);
          this.applyScaleToImage(nextImage, screenWidth, screenHeight);
          if (this.frameOverlay) nextImage.setMask(this.ensureViewportMask());
          nextImage.setAlpha(0);

          const list: any[] = (this.container as any).list || [];
          const prevIndex = list.indexOf(prevImage);
          const baseInsert = this.frameOverlay ? 2 : 1;
          const insertIndex = prevIndex >= 0 ? prevIndex + 1 : baseInsert;
          this.container.addAt(nextImage, insertIndex);

          this.scene.tweens.add({
            targets: prevImage,
            alpha: 0,
            duration: this.toTime(crossFadeMs),
            onComplete: () => {
              if ((prevImage as any)?.scene) {
                prevImage.destroy();
              }
            },
          });

          this.scene.tweens.add({
            targets: nextImage,
            alpha: 1,
            duration: this.toTime(crossFadeMs),
            onComplete: () => {
              if (this.isEnding) {
                nextImage.destroy();
                return;
              }
              if (this.currentSlideIndex !== indexToken) {
                nextImage.destroy();
                return;
              }
              this.currentImage = nextImage;
              this.updateTextPosition();
            },
          });
        });
        this.imageSequenceTimers.push(t);
        return;
      }

      const fadeOutAt = Math.max(0, swapAt - fadeOutMs - fadeInMs);
      const t = this.scene.time.delayedCall(this.toTime(fadeOutAt), () => {
        if (this.isEnding) return;
        if (this.currentSlideIndex !== indexToken) return;
        if (!this.currentImage) return;
        const img = this.currentImage;
        if (fadeOutMs > 0) {
          this.scene.tweens.add({
            targets: img,
            alpha: 0,
            duration: this.toTime(fadeOutMs),
            onComplete: () => {
              if (this.isEnding) return;
              if (this.currentSlideIndex !== indexToken) return;
              if (!this.currentImage) return;
              this.currentImage.setTexture(key);
              this.applyScaleToImage(this.currentImage, screenWidth, screenHeight);
              this.updateTextPosition();
              if (fadeInMs > 0) {
                this.scene.tweens.add({
                  targets: this.currentImage,
                  alpha: 1,
                  duration: this.toTime(fadeInMs),
                });
              } else {
                this.currentImage.setAlpha(1);
              }
            },
          });
        } else {
          img.setTexture(key);
          this.applyScaleToImage(img, screenWidth, screenHeight);
          this.updateTextPosition();
          if (fadeInMs > 0) {
            img.setAlpha(0);
            this.scene.tweens.add({
              targets: img,
              alpha: 1,
              duration: this.toTime(fadeInMs),
            });
          } else {
            img.setAlpha(1);
          }
        }
      });
      this.imageSequenceTimers.push(t);
    });
  }

  private createImageForSlide(slide: SlideConfig, screenWidth: number, screenHeight: number): Phaser.GameObjects.Image {
    const layout = this.getCutsceneLayout();
    const image = this.scene.add.image(
      layout.imageCenterX,
      layout.imageCenterY,
      slide.imageKey
    );
    image.setOrigin(0.5, 0.5);

    this.applyScaleToImage(image, screenWidth, screenHeight);
    if (this.frameOverlay) {
      image.setMask(this.ensureViewportMask());
    }
    return image;
  }

  private startTextForSlide(slide: SlideConfig): void {
    if (slide.keepText) {
      this.onTextComplete();
      return;
    }
    const shouldDeferSequence =
      !!slide.imageSequenceStartAfterText &&
      !!slide.imageSequenceKeys?.length &&
      (slide.imageSequenceFrameDuration ?? 0) > 0;
    if (shouldDeferSequence) {
      this.pendingImageSequenceSlideIndex = this.currentSlideIndex;
    } else {
      this.startImageSequenceForSlide(slide);
    }
    this.startTypewriterText(slide.textKey, slide.charSoundKey);
  }

  private showSlide(index: number): void {
    this.clearImageSequenceTimers();
    this.pendingImageSequenceSlideIndex = null;
    this.currentSlideIndex = index;
    this.autoAdvanceBlocked = false;
    this.textCompleteFired = false;
    this.config.onSlideChange(index);

    if (index >= this.config.slides.length) {
      this.endSlideshow();
      return;
    }

    const slide = this.config.slides[index];
    const screenWidth = this.scene.game.canvas.width;
    const screenHeight = this.scene.game.canvas.height;
    const fadeDuration = slide.fadeDuration ?? this.config.fadeDuration;

    if (this.currentImage) {
      if (slide.fadeDuration !== undefined) {
        if (fadeDuration <= 0) {
          const prevImage = this.currentImage;
          const nextImage = this.createImageForSlide(slide, screenWidth, screenHeight);
          this.container?.addAt(nextImage, this.frameOverlay ? 2 : 1);
          this.currentImage = nextImage;
          prevImage.destroy();
          this.updateTextPosition();
          this.startTextForSlide(slide);
          return;
        }
        const prevImage = this.currentImage;
        const nextImage = this.createImageForSlide(slide, screenWidth, screenHeight);
        nextImage.setAlpha(0);
        this.container?.addAt(nextImage, this.frameOverlay ? 2 : 1);
        this.currentImage = nextImage;

        this.scene.tweens.add({
          targets: prevImage,
          alpha: 0,
          duration: this.toTime(fadeDuration),
          onComplete: () => {
            prevImage.destroy();
          },
        });

        const slideIdxAtFade = this.currentSlideIndex;
        this.scene.tweens.add({
          targets: nextImage,
          alpha: 1,
          duration: this.toTime(fadeDuration),
          onComplete: () => {
            if (this.currentSlideIndex !== slideIdxAtFade) return;
            this.updateTextPosition();
            this.startTextForSlide(slide);
          },
        });
      } else {
        if (fadeDuration <= 0) {
          this.currentImage.destroy();
          this.currentImage = null;
          this.fadeInNewImage(slide, screenWidth, screenHeight);
          return;
        }
        const slideIdxAtFadeOut = this.currentSlideIndex;
        this.scene.tweens.add({
          targets: this.currentImage,
          alpha: 0,
          duration: this.toTime(fadeDuration),
          onComplete: () => {
            this.currentImage?.destroy();
            this.currentImage = null;
            if (this.currentSlideIndex !== slideIdxAtFadeOut) return;
            this.fadeInNewImage(slide, screenWidth, screenHeight);
          },
        });
      }
    } else {
      this.fadeInNewImage(slide, screenWidth, screenHeight);
    }
  }

  private fadeInNewImage(
    slide: SlideConfig,
    screenWidth: number,
    screenHeight: number
  ): void {
    const fadeDuration = slide.fadeDuration ?? this.config.fadeDuration;
    this.currentImage = this.createImageForSlide(slide, screenWidth, screenHeight);

    this.container?.addAt(this.currentImage, this.frameOverlay ? 2 : 1);
    if (fadeDuration <= 0) {
      this.currentImage.setAlpha(1);
      this.updateTextPosition();
      this.startTextForSlide(slide);
      return;
    }
    this.currentImage.setAlpha(0);

    const slideIdxAtFadeIn = this.currentSlideIndex;
    this.scene.tweens.add({
      targets: this.currentImage,
      alpha: 1,
      duration: this.toTime(fadeDuration),
      onComplete: () => {
        if (this.currentSlideIndex !== slideIdxAtFadeIn) return;
        this.updateTextPosition();
        this.startTextForSlide(slide);
      },
    });
  }

  private updateTextPosition(): void {
    if (!this.textObject) return;
    const layout = this.getCutsceneLayout();
    this.textObject.setPosition(layout.textCenterX, layout.textCenterY);
  }

  private startTypewriterText(textKey: string, charSoundKey?: string): void {
    const rawText = i18next.t(textKey);
    this.fullText = this.config.formatText ? this.config.formatText(textKey, rawText) : rawText;
    this.textObject?.setText("");

    if (this.textTimer) {
      this.textTimer.remove();
    }

    const soundKey = charSoundKey || this.config.defaultCharSound;

    let charIndex = 0;
    this.textTimer = this.scene.time.addEvent({
      delay: this.toTime(this.config.typewriterDelay),
      callback: () => {
        charIndex++;
        this.textObject?.setText(this.fullText.slice(0, charIndex));

        if (soundKey && this.scene.playSound) {
          const char = this.fullText[charIndex - 1];
          if (char && char !== " " && char !== "\n") {
            this.scene.playSound(soundKey, { volume: 0.3 });
          }
        }

        if (charIndex >= this.fullText.length) {
          this.onTextComplete();
        }
      },
      repeat: this.fullText.length - 1,
    });
  }

  private onTextComplete(): void {
    if (this.textTimer) {
      this.textTimer.remove();
      this.textTimer = null;
    }
    if (this.textCompleteFired) {
      return;
    }
    this.textCompleteFired = true;
    this.textCompletedAt = Date.now();

    const currentSlide = this.config.slides[this.currentSlideIndex];
    if (
      this.pendingImageSequenceSlideIndex === this.currentSlideIndex &&
      currentSlide?.imageSequenceKeys?.length &&
      (currentSlide.imageSequenceFrameDuration ?? 0) > 0
    ) {
      this.pendingImageSequenceSlideIndex = null;
      this.startImageSequenceForSlide(currentSlide);
    }

    this.config.onTextComplete();
    if (this.autoAdvanceBlocked) {
      return;
    }
    const nextSlide = this.config.slides[this.currentSlideIndex + 1];
    const nextFadeDuration = nextSlide ? (nextSlide.fadeDuration ?? this.config.fadeDuration) : this.config.fadeDuration;
    const cadence = currentSlide.transitionCadenceMs;
    const basePauseDuration = typeof cadence === "number"
      ? Math.max(0, cadence - nextFadeDuration)
      : (currentSlide.pauseAfterText ?? this.config.pauseAfterText) + 500;
    const pauseDuration = basePauseDuration + 750;

    this.advanceTimer = this.scene.time.delayedCall(this.toTime(pauseDuration), () => {
      this.advanceToNextSlide();
    });
  }

  private advanceToNextSlide(): void {
    if (this.advanceTimer) {
      this.advanceTimer.remove();
      this.advanceTimer = null;
    }
    if (this.textTimer) {
      this.textTimer.remove();
      this.textTimer = null;
    }
    this.textCompletedAt = 0;

    const nextSlide = this.config.slides[this.currentSlideIndex + 1];
    if (!nextSlide?.keepText) {
      this.textObject?.setText("");
    }

    if (this.currentSlideIndex + 1 >= this.config.slides.length) {
      this.endSlideshow();
    } else {
      this.showSlide(this.currentSlideIndex + 1);
    }
  }

  private endSlideshow(): void {
    if (this.isEnding) return;
    this.isEnding = true;

    if (this.textTimer) {
      this.textTimer.remove();
      this.textTimer = null;
    }

    if (this.advanceTimer) {
      this.advanceTimer.remove();
      this.advanceTimer = null;
    }

    if (this.bgm) {
      this.scene.tweens.add({
        targets: this.bgm,
        volume: 0,
        duration: this.toTime(500),
        onComplete: () => {
          this.bgm?.stop();
          this.bgm?.destroy();
          this.bgm = null;
        },
      });
    }

    const fadeTargets: Phaser.GameObjects.GameObject[] = [];
    if (this.currentImage) {
      fadeTargets.push(this.currentImage);
    }
    if (this.frameOverlay) {
      fadeTargets.push(this.frameOverlay);
    }
    if (this.textObject) {
      fadeTargets.push(this.textObject);
    }

    const finish = () => {
      this.cleanup();
      this.config.onComplete();
    };

    if (this.config.onBeforeFade) {
      try { this.config.onBeforeFade(); } catch {}
    }

    if (!fadeTargets.length) {
      finish();
      return;
    }

    this.scene.tweens.add({
      targets: fadeTargets,
      alpha: 0,
      duration: this.toTime(500),
      onComplete: finish,
    });
  }

  private cleanup(): void {
    this.clearImageSequenceTimers();
    if (this.textTimer) {
      this.textTimer.remove();
      this.textTimer = null;
    }

    if (this.advanceTimer) {
      this.advanceTimer.remove();
      this.advanceTimer = null;
    }

    if (this.currentImage) {
      this.currentImage.destroy();
      this.currentImage = null;
    }

    this.frameOverlay = null;

    if (this.viewportMask) {
      this.viewportMask.destroy();
      this.viewportMask = null;
    }
    if (this.viewportMaskShape) {
      this.viewportMaskShape.destroy();
      this.viewportMaskShape = null;
    }

    if (this.bgm) {
      this.bgm.stop();
      this.bgm.destroy();
      this.bgm = null;
    }

    if (this.container) {
      this.container.destroy();
      this.container = null;
    }

    this.textObject = null;
    this.background = null;
  }
}