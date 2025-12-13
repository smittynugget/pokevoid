import TouchControl from "#app/touch-controls.js";
import UI from "#app/ui/ui.js";
import { Scene } from "phaser";

export const TOUCH_CONTROL_POSITIONS_LANDSCAPE = "touchControlPositionsLandscape";
export const TOUCH_CONTROL_POSITIONS_PORTRAIT = "touchControlPositionsPortrait";
type ControlPosition = { id: string, x: number, y: number };

type ConfigurationEventListeners = {
  "touchstart": EventListener[]
  "touchmove": EventListener[]
  "touchend": EventListener[]
};

type ToolbarRefs = {
  toolbar: HTMLDivElement,
  saveButton: HTMLDivElement
  resetButton: HTMLDivElement
  cancelButton: HTMLDivElement
};
export default class MoveTouchControlsHandler {
  private draggingElement: HTMLElement | null = null;
  public inConfigurationMode: boolean;
  private configurationEventListeners: ConfigurationEventListeners = {
    "touchstart": [],
    "touchmove": [],
    "touchend": []
  };

  private overlay: Phaser.GameObjects.Container;

  private isLandscapeMode: boolean = this.getScreenSize().width > this.getScreenSize().height;
  private touchControls: TouchControl;

  constructor(touchControls: TouchControl) {
    this.touchControls = touchControls;
    this.inConfigurationMode = false;
    this.setPositions(this.getSavedPositionsOfCurrentOrientation() ?? []);
    window.addEventListener("resize", (event) => {
      const screenSize = this.getScreenSize();
      if (screenSize.width > screenSize.height !== this.isLandscapeMode) {
        this.changeOrientation(screenSize.width > screenSize.height);
      }
    });
  }
  private async changeOrientation(isLandscapeMode: boolean) {
    this.isLandscapeMode = isLandscapeMode;
    if (this.inConfigurationMode) {
      const orientation = document.querySelector("#touchControls #orientation");
      if (orientation) {
        orientation.textContent = this.isLandscapeMode? "Landscape" : "Portrait";
      }
    }
    const positions = this.getSavedPositionsOfCurrentOrientation() ?? [];
    this.setPositions(positions);
  }

  private getScreenSize() {
    return { width: window.screen.width, height: window.screen.height };
  }
  private createToolbarElement(): HTMLDivElement {
    const toolbar = document.createElement("div");
    toolbar.id = "configToolbar";
    toolbar.innerHTML = `
      <div class="column">
        <div class="button-row">
          <div id="resetButton" class="button">Reset</div>
          <div id="saveButton" class="button">Save & close</div>
          <div id="cancelButton" class="button">Cancel</div>
        </div>
        <div class="info-row">
          <div class="orientation-label">
            Orientation: <span id="orientation">${this.isLandscapeMode ? "Landscape" : "Portrait"}</span>
          </div>
        </div>
      </div>
    `;
    return toolbar;
  }
  private createToolbar() {
    document.querySelector("#touchControls")?.prepend(this.createToolbarElement());
    const refs = this.getConfigToolbarRefs();
    if (!refs) {
      return;
    }
    const { saveButton, resetButton, cancelButton } = refs;

    saveButton.addEventListener("click", () => {
      this.saveCurrentPositions();
      this.disableConfigurationMode();
    });
    resetButton.addEventListener("click", () => {
      this.resetPositions();
    });
    cancelButton.addEventListener("click", () => {
      const positions = this.getSavedPositionsOfCurrentOrientation();
      this.setPositions(positions);
      this.disableConfigurationMode();
    });
  }
  private getConfigToolbarRefs(): ToolbarRefs | undefined {
    const toolbar = document.querySelector("#touchControls #configToolbar") as HTMLDivElement;
    if (!toolbar) {
      return;
    }
    return {
      toolbar,
      saveButton: toolbar.querySelector("#saveButton")!,
      resetButton: toolbar.querySelector("#resetButton")!,
      cancelButton: toolbar.querySelector("#cancelButton")!
    };
  }
  private isLeft = (element: HTMLElement) => document.querySelector("#touchControls .left")?.contains(element);
  private startDrag = (controlGroup: HTMLElement): void => {
    this.draggingElement = controlGroup;
  };
  private drag = (touch: Touch): void => {
    if (!this.draggingElement) {
      return;
    }
    const rect = this.draggingElement.getBoundingClientRect();

    const xOffset = this.isLeft(this.draggingElement) ? touch.clientX - rect.width / 2 : window.innerWidth - touch.clientX - rect.width / 2;
    const yOffset = window.innerHeight - touch.clientY - rect.height / 2;
    this.setPosition(this.draggingElement, xOffset, yOffset);
  };
  private stopDrag = () => {
    this.draggingElement = null;
  };
  private getModifiedCurrentPositions(): ControlPosition[] {
    return this.getControlGroupElements()
      .filter((controlGroup: HTMLElement) => controlGroup.style.right || controlGroup.style.left)
      .map((controlGroup: HTMLElement) => {
        return {
          id: controlGroup.id,
          x: parseFloat(this.isLeft(controlGroup) ? controlGroup.style.left : controlGroup.style.right),
          y: parseFloat(controlGroup.style.bottom),
        };
      });
  }
  private getLocalStorageKey(): string {
    return this.isLandscapeMode ? TOUCH_CONTROL_POSITIONS_LANDSCAPE : TOUCH_CONTROL_POSITIONS_PORTRAIT;
  }
  private getSavedPositionsOfCurrentOrientation(): ControlPosition[] {
    const positions = localStorage.getItem(this.getLocalStorageKey());
    if (!positions) {
      return [];
    }
    return JSON.parse(positions) as ControlPosition[];
  }
  private saveCurrentPositions() {
    const pos = this.getModifiedCurrentPositions();
    localStorage.setItem(this.getLocalStorageKey(), JSON.stringify(pos));
  }
  private setPositions(positions: ControlPosition[]) {
    this.resetPositions();
    return positions.forEach((pos: ControlPosition) => {
      const controlGroup = document.querySelector(`#${pos.id}`) as HTMLElement;
      this.setPosition(controlGroup, pos.x, pos.y);
    });
  }
  private setPosition(controlElement: HTMLElement, x: number, y: number) {
    const rect = controlElement.getBoundingClientRect();
    const checkBound = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
    const { height, width } = this.getScreenSize();
    x = checkBound(x, 0, width - rect.width);
    y = checkBound(y, 0, height - rect.height);
    if (this.isLeft(controlElement)) {
      controlElement.style.left = `${x}px`;
    } else {
      controlElement.style.right = `${x}px`;
    }
    controlElement.style.bottom = `${y}px`;
  }
  private resetPositions() {
    this.getControlGroupElements().forEach((controlGroup: HTMLDivElement) => {
      controlGroup.style.removeProperty("left");
      controlGroup.style.removeProperty("right");
      controlGroup.style.removeProperty("bottom");
    });
  }
  private getControlGroupElements(): HTMLDivElement[] {
    return [...document.querySelectorAll("#touchControls .control-group")] as HTMLDivElement[];
  }
  private createConfigurationEventListeners(controlGroups: HTMLDivElement[]): ConfigurationEventListeners {
    return {
      "touchstart": controlGroups.map((element: HTMLDivElement) => {
        const startDrag = () => this.startDrag(element);
        element.addEventListener("touchstart", startDrag, { passive: true });
        return startDrag;
      }),
      "touchmove": controlGroups.map(() => {
        const drag = (event) => this.drag(event.touches[0]);
        window.addEventListener("touchmove", drag, { passive: true });
        return drag;
      }),
      "touchend": controlGroups.map(() => {
        const stopDrag = () => this.stopDrag();
        window.addEventListener("touchend", stopDrag, { passive: true });
        return stopDrag;
      })
    };
  }
  private createOverlay(ui: UI, scene: Scene) {
    const container = new Phaser.GameObjects.Container(scene, 0, 0);
    const overlay = new Phaser.GameObjects.Rectangle(scene, 0, 0, scene.game.canvas.width, scene.game.canvas.height, 0x000000, 0.5);
    overlay.setInteractive();
    container.add(overlay);
    ui.add(container);
    this.overlay = container;
    document.querySelector("#touchControls")?.classList.add("config-mode");
  }
  public enableConfigurationMode(ui: UI, scene: Scene) {
    if (this.inConfigurationMode) {
      return;
    }
    this.inConfigurationMode = true;
    this.touchControls.disable();
    this.createOverlay(ui, scene);
    this.createToolbar();

    setTimeout(() => {

      this.configurationEventListeners = this.createConfigurationEventListeners(this.getControlGroupElements());
    }, 500);
  }
  public disableConfigurationMode() {
    this.inConfigurationMode = false;
    this.draggingElement = null;
    const { touchstart, touchmove, touchend } = this.configurationEventListeners;
    this.getControlGroupElements().forEach((element, index) => element.removeEventListener("touchstart", touchstart[index]));
    touchmove.forEach((listener) => window.removeEventListener("touchmove", listener));
    touchend.forEach((listener) => window.removeEventListener("touchend", listener));
    const toolbar = document.querySelector("#touchControls #configToolbar");
    toolbar?.remove();
    this.overlay?.destroy();
    document.querySelector("#touchControls")?.classList.remove("config-mode");
    this.touchControls.enable();
  }

}