import Phaser from "phaser";
import { GAME_HEIGHT, GAME_WIDTH } from "./canvas-coords";
import BattleScene from "./battle-scene";
import InvertPostFX from "./pipelines/invert";
import { version } from "../package.json";
import UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin";
import BBCodeTextPlugin from "phaser3-rex-plugins/plugins/bbcodetext-plugin";
import InputTextPlugin from "phaser3-rex-plugins/plugins/inputtext-plugin.js";
import TransitionImagePackPlugin from "phaser3-rex-plugins/templates/transitionimagepack/transitionimagepack-plugin.js";
import { LoadingScene } from "./loading-scene";
import { clearCachesAndUnregisterServiceWorkers } from "./system/client-cache-utils";
import { INTERNAL_BACKUP_VERSION } from "./system/game-data";
window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global error:', error);
  const errorString = `Uncaught error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nStack: ${error?.stack}`;
  console.error(errorString);
};

window.addEventListener("unhandledrejection", (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  const errorString = `Unhandled promise rejection: ${event.reason}\nStack: ${event.reason?.stack}`;
  console.error(errorString);
});

document.addEventListener('visibilitychange', (): void => {
  if (document.hidden) {
    if (game?.loop) {
      game.loop.sleep();
    }
    if (game?.sound) {
      game.sound.pauseAll();
    }
  } else {
    if (game?.loop) {
      (game.loop as any).resetDelta();
      (game.loop as any).wake(false);
    }
    if (game?.sound) {
      game.sound.resumeAll();
    }
  }
});

window.addEventListener('beforeunload', (event: BeforeUnloadEvent): void => {
  const battleScene = game?.scene?.scenes?.find(
    (scene: Phaser.Scene): boolean => scene.scene.key === 'battle'
  ) as any;
  if (battleScene?.currentBattle) {
    event.preventDefault();
    event.returnValue = '';
  }
});

const isIOSDevice =
  (/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: "app",
  scale: {
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  ...(isIOSDevice ? {
    render: {
      powerPreference: "low-power",
      batchSize: 2048,
      maxTextures: 8,
    },
    fps: {
      target: 30,
      limit: 30,
      forceSetTimeOut: false,
      smoothStep: true,
    },
  } : {}),
  plugins: {
    global: [{
      key: "rexInputTextPlugin",
      plugin: InputTextPlugin,
      start: true
    }, {
      key: "rexBBCodeTextPlugin",
      plugin: BBCodeTextPlugin,
      start: true
    }, {
      key: "rexTransitionImagePackPlugin",
      plugin: TransitionImagePackPlugin,
      start: true
    }],
    scene: [{
      key: "rexUI",
      plugin: UIPlugin,
      mapping: "rexUI"
    }]
  },
  input: {
    mouse: {
      target: "app"
    },
    touch: {
      target: "app"
    },
    gamepad: true
  },
  dom: {
    createContainer: true
  },
  pixelArt: true,
  pipeline: [ InvertPostFX ] as unknown as Phaser.Types.Core.PipelineConfig,
  scene: [ LoadingScene, BattleScene ],
  version: version,
  disableContextMenu: true,
  autoFocus: true,
  audio: {
    disableWebAudio: false,
    noAudio: false
  }
};
const setPositionRelative = function (guideObject: Phaser.GameObjects.GameObject, x: number, y: number) {
  const offsetX = guideObject.width * (-0.5 + (0.5 - guideObject.originX));
  const offsetY = guideObject.height * (-0.5 + (0.5 - guideObject.originY));
  this.setPosition(guideObject.x + offsetX + x, guideObject.y + offsetY + y);
};

Phaser.GameObjects.Container.prototype.setPositionRelative = setPositionRelative;
Phaser.GameObjects.Sprite.prototype.setPositionRelative = setPositionRelative;
Phaser.GameObjects.Image.prototype.setPositionRelative = setPositionRelative;
Phaser.GameObjects.NineSlice.prototype.setPositionRelative = setPositionRelative;
Phaser.GameObjects.Text.prototype.setPositionRelative = setPositionRelative;
Phaser.GameObjects.Rectangle.prototype.setPositionRelative = setPositionRelative;

document.fonts.load("16px emerald").then(() => document.fonts.load("10px pkmnems"));

let game: Phaser.Game;

const VERSION_STORAGE_KEY = "last_seen_game_version";

async function maybeClearCacheOnVersionChange(): Promise<boolean> {
  try {
    const currentVersion = `v3.1.${INTERNAL_BACKUP_VERSION}`;
    const lastSeen = localStorage.getItem(VERSION_STORAGE_KEY);
    if (lastSeen && lastSeen !== currentVersion) {
      localStorage.setItem(VERSION_STORAGE_KEY, currentVersion);
      await clearCachesAndUnregisterServiceWorkers();
      window.location.reload();
      return true;
    }
    if (!lastSeen) {
      localStorage.setItem(VERSION_STORAGE_KEY, currentVersion);
    }
  } catch (e) {
    console.warn("[VersionCheck] Failed:", e);
  }
  return false;
}

const startGame = () => {
  try {
    game = new Phaser.Game(config);
    game.sound.pauseOnBlur = false;
  } catch (error) {
    console.error('Error starting the game:', error);
    alert('Failed to start the game. Please check the console for details and report this issue.');
  }
};

const boot = async (): Promise<void> => {
  const shouldReload = await maybeClearCacheOnVersionChange();
  if (shouldReload) {
    return;
  }

  try {
    import("./system/drive-auth").then(({ initDriveAuth }) => initDriveAuth()).catch(() => {});
  } catch {}

  try {
    startGame();
    if (import.meta.env.MODE === "production" || import.meta.env.VITE_LOAD_ASSET_MANIFEST === "1") {
      const res = await fetch("/manifest.json");
      if (!res.ok) {
        return;
      }
      const jsonResponse = await res.json();
      game["manifest"] = jsonResponse.manifest;
      const loadingScene = game.scene.getScene("loading");
      if (loadingScene?.load?.manifest !== undefined) {
        loadingScene.load.manifest = jsonResponse.manifest;
      }
    }
  } catch (e) { console.error('[BOOT ERROR]', e); }
};

void boot();

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") {
    import("./system/drive-sync-service").then(({ driveSyncService }) => {
      driveSyncService.flush();
    }).catch(() => {});
  }
});

if (typeof (window as any).Capacitor !== "undefined") {
  import("@capgo/capacitor-updater").then(({ CapacitorUpdater }) => {
    CapacitorUpdater.notifyAppReady();
  }).catch(() => {});
}

export default game;