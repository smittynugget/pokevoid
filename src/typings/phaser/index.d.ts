import "phaser";

declare module "phaser" {
	namespace GameObjects {
    interface GameObject {
      width: number;

      height: number;

      originX: number;

      originY: number;

      x: number;

      y: number;
    }

		interface Container {

			setPositionRelative(guideObject: any, x: number, y: number): void;
		}
		interface Sprite {

			setPositionRelative(guideObject: any, x: number, y: number): void;
		}
		interface Image {

			setPositionRelative(guideObject: any, x: number, y: number): void;
		}
		interface NineSlice {

			setPositionRelative(guideObject: any, x: number, y: number): void;
		}
		interface Text {

			setPositionRelative(guideObject: any, x: number, y: number): void;
		}
		interface Rectangle {

			setPositionRelative(guideObject: any, x: number, y: number): void;
		}
	}

   namespace Input {
    namespace Gamepad {
      interface GamepadPlugin {

        refreshPads(): void;
      }
    }
  }
}