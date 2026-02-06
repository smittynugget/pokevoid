export function getCutsceneImageUrl(scene: any, imageKey: string): string {
  let url: string;
  const m = /^debug_slide_(\d+)$/.exec(imageKey);
  if (m) {
    url = `images/smitty_logos/${m[1]}.png`;
  } else {
    const webpSupported = !!(scene?.game as any)?.device?.features?.webp;
    const ext = webpSupported ? "webp" : "png";
    url = `images/cutscenes/${imageKey}.${ext}`;
  }
  if (scene && typeof scene.getCachedUrl === "function") {
    return scene.getCachedUrl(url);
  }
  return url;
}

export async function ensureCutsceneImagesLoaded(scene: Phaser.Scene, imageKeys: string[]): Promise<void> {
  const keys = Array.from(new Set((imageKeys || []).filter(k => !!k)));
  const missing = keys.filter(k => !scene.textures.exists(k));
  if (!missing.length) {
    return;
  }

  const loader = scene.load;

  const waits = missing.map((key) => new Promise<void>((resolve, reject) => {
    const completeEvent = `filecomplete-image-${key}`;

    const cleanup = () => {
      loader.off(completeEvent, onComplete);
      loader.off(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
    };

    const onComplete = () => {
      cleanup();
      resolve();
    };

    const onError = (file: any) => {
      if (file && file.key === key) {
        cleanup();
        reject(new Error(String(file?.src || key)));
      }
    };

    loader.once(completeEvent, onComplete);
    loader.on(Phaser.Loader.Events.FILE_LOAD_ERROR, onError);
  }));

  for (const key of missing) {
    loader.image(key, getCutsceneImageUrl(scene as any, key));
  }

  if (!loader.isLoading()) {
    loader.start();
  }

  await Promise.all(waits);
}

export function unloadCutsceneImages(scene: Phaser.Scene, imageKeys: string[]): void {
  const keys = Array.from(new Set((imageKeys || []).filter(k => !!k)));
  for (const key of keys) {
    if ((scene as any).anims?.exists?.(key)) {
      (scene as any).anims.remove(key);
    }
    if (scene.textures.exists(key)) {
      scene.textures.remove(key);
    }
    if ((scene as any).cache?.json?.exists?.(key)) {
      (scene as any).cache.json.remove(key);
    }
  }
}
