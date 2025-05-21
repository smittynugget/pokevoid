import Phaser from "phaser";
import BattleScene from "./battle-scene";
import InvertPostFX from "./pipelines/invert";
import { version } from "../package.json";
import UIPlugin from "phaser3-rex-plugins/templates/ui/ui-plugin";
import BBCodeTextPlugin from "phaser3-rex-plugins/plugins/bbcodetext-plugin";
import InputTextPlugin from "phaser3-rex-plugins/plugins/inputtext-plugin.js";
import TransitionImagePackPlugin from "phaser3-rex-plugins/templates/transitionimagepack/transitionimagepack-plugin.js";
import { LoadingScene } from "./loading-scene";

window.onerror = function (message, source, lineno, colno, error) {
  console.error('Global error:', error);
  const errorString = `Uncaught error: ${message}\nSource: ${source}\nLine: ${lineno}\nColumn: ${colno}\nStack: ${error?.stack}`;
  console.error(errorString);
  return true;
};

window.addEventListener("unhandledrejection", (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  const errorString = `Unhandled promise rejection: ${event.reason}\nStack: ${event.reason?.stack}`;
  console.error(errorString);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', (): void => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration: ServiceWorkerRegistration): void => {
        console.log('ServiceWorker registration successful:', registration.scope);
      })
      .catch((error: Error): void => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}

document.addEventListener('visibilitychange', (): void => {
  if (document.hidden) {
    if (game?.sound) {
      game.sound.pauseAll();
    }
  } else {
    if (game?.sound) {
      game.sound.resumeAll();
    }
  }
});

window.addEventListener('beforeunload', (event: BeforeUnloadEvent): void => {
  if (game?.scene?.scenes?.some((scene: Phaser.Scene): boolean => 
    scene.scene.key === 'battle' && scene.scene.isActive()
  )) {
    event.preventDefault();
    event.returnValue = '';
  }
});

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  parent: "app",
  scale: {
    width: 1920,
    height: 1080,
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
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

/**
 * Sets this object's position relative to another object with a given offset
 */
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

const startGame = () => {
  try {
    game = new Phaser.Game(config);
    game.sound.pauseOnBlur = false;
  } catch (error) {
    console.error('Error starting the game:', error);
    alert('Failed to start the game. Please check the console for details and report this issue.');
  }
};

fetch("/manifest.json")
    .then(res => res.json())
    .then(jsonResponse => {
      startGame();
      game["manifest"] = jsonResponse.manifest;
    })
    .catch((error) => {
      startGame();
    });

export default game;