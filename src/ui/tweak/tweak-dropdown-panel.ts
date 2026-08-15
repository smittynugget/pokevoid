import type BattleScene from "#app/battle-scene";

export type TweakDropdownCoordSpace = "canvas" | "logical" | "screen";

export interface TweakDropdownConfig {
  scene: BattleScene;
  getAnchorGameCoords: () => { x: number; y: number } | null;
  elements: string[];
  modes: string[];
  views?: { value: string; label: string }[];
  coordSpace?: TweakDropdownCoordSpace;
  alphabeticalSort?: boolean;
  elementGroups?: Record<string, string[]>;
  onViewChange?: (viewIndex: number) => void;
  onElementChange: (elementName: string, elementIndex: number) => void;
  onModeChange: (modeName: string, modeIndex: number) => void;
}

export function canvasToScreenCoords(
  scene: BattleScene,
  gameX: number,
  gameY: number,
  coordSpace: TweakDropdownCoordSpace = "canvas"
): { left: number; top: number } {
  if (coordSpace === "screen") {
    return { left: gameX, top: gameY };
  }
  const canvas = scene.game.canvas;
  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / canvas.width;
  const scaleY = rect.height / canvas.height;
  if (coordSpace === "logical") {
    return {
      left: rect.left + gameX * 6 * scaleX,
      top: rect.top + gameY * 6 * scaleY,
    };
  }
  return {
    left: rect.left + gameX * scaleX,
    top: rect.top + gameY * scaleY,
  };
}

export class TweakDropdownPanel {
  private _viewSelect: HTMLSelectElement | null = null;
  private _elementSelect: HTMLSelectElement | null = null;
  private _propertySelect: HTMLSelectElement | null = null;
  private _htmlSelects: HTMLSelectElement[] = [];
  get htmlSelects(): HTMLSelectElement[] { return this._htmlSelects; }
  private _clickHandlers: ((e: MouseEvent) => void)[] = [];
  private _config: TweakDropdownConfig;
  private _recentlyUsed: string[] = [];
  private _canonicalElements: string[];
  private _sortedElements: string[];

  constructor(config: TweakDropdownConfig) {
    this._config = config;
    this._canonicalElements = [...config.elements];
    this._sortedElements = this.computeSortedElements();
  }

  private computeSortedElements(): string[] {
    if (!this._config.alphabeticalSort) return [...this._canonicalElements];
    const alphabetical = [...this._canonicalElements].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }));
    if (this._recentlyUsed.length === 0) return alphabetical;
    const recentSet = new Set(this._recentlyUsed);
    const rest = alphabetical.filter(e => !recentSet.has(e));
    return [...this._recentlyUsed, ...rest];
  }

  markUsed(elementName: string): void {
    const groups = this._config.elementGroups;
    let siblings: string[] = [];
    if (groups) {
      for (const groupMembers of Object.values(groups)) {
        if (groupMembers.includes(elementName)) {
          siblings = groupMembers.filter(e => e !== elementName);
          break;
        }
      }
    }
    const toPromote = [elementName, ...siblings];
    this._recentlyUsed = this._recentlyUsed.filter(e => !toPromote.includes(e));
    this._recentlyUsed.unshift(...toPromote);
    if (this._recentlyUsed.length > 20) this._recentlyUsed.length = 20;
    this._sortedElements = this.computeSortedElements();
    this.rebuildElements(this._sortedElements);
    this.syncElementValue(elementName);
  }

  getCanonicalIndex(elementName: string): number {
    return this._canonicalElements.indexOf(elementName);
  }

  private makeSelect(
    gameX: number,
    gameY: number,
    options: { value: string; label: string }[],
    onChange: (val: string) => void
  ): HTMLSelectElement {
    const pos = canvasToScreenCoords(this._config.scene, gameX, gameY, this._config.coordSpace ?? "canvas");
    const sel = document.createElement("select");
    sel.style.position = "absolute";
    sel.style.left = `${pos.left}px`;
    sel.style.top = `${pos.top}px`;
    sel.style.zIndex = "10000";
    sel.style.backgroundColor = "#334455";
    sel.style.color = "#ffffff";
    sel.style.border = "1px solid #6688aa";
    sel.style.borderRadius = "3px";
    sel.style.padding = "2px";
    sel.style.fontSize = "12px";
    sel.style.width = "100px";
    options.forEach(opt => {
      const o = document.createElement("option");
      o.value = opt.value;
      o.text = opt.label;
      sel.appendChild(o);
    });
    sel.setAttribute("tabindex", "-1");
    sel.addEventListener("change", () => {
      onChange(sel.value);
      sel.blur();
      this._config.scene.game.canvas.focus();
    });
    sel.addEventListener("blur", () => {
      this._config.scene.game.canvas.focus();
    });
    const clickHandler = (e: MouseEvent) => {
      if (e.target !== sel) sel.blur();
    };
    document.addEventListener("mousedown", clickHandler);
    this._clickHandlers.push(clickHandler);
    document.body.appendChild(sel);
    return sel;
  }

  create(): void {
    if (this._elementSelect) return;
    const anchor = this._config.getAnchorGameCoords();
    if (!anchor) return;

    if (this._config.views && this._config.views.length > 0) {
      this._viewSelect = this.makeSelect(
        anchor.x, anchor.y,
        this._config.views,
        (val) => {
          if (this._config.onViewChange) {
            const idx = this._config.views!.findIndex(v => v.value === val);
            this._config.onViewChange(idx >= 0 ? idx : 0);
          }
        }
      );
    }

    const elemOpts = this._sortedElements.map(name => ({ value: name, label: name }));
    this._elementSelect = this.makeSelect(
      anchor.x, anchor.y,
      elemOpts,
      (val) => {
        const idx = this.getCanonicalIndex(val);
        if (idx >= 0) {
          this.markUsed(val);
          this._config.onElementChange(val, idx);
        }
      }
    );

    const modeOpts = this._config.modes.map(mode => ({ value: mode, label: mode }));
    this._propertySelect = this.makeSelect(
      anchor.x, anchor.y,
      modeOpts,
      (val) => {
        const idx = this._config.modes.indexOf(val);
        if (idx >= 0) this._config.onModeChange(val, idx);
      }
    );

    this._htmlSelects = [this._viewSelect, this._elementSelect, this._propertySelect].filter(Boolean) as HTMLSelectElement[];
    this.layout();
  }

  layout(): void {
    const anchor = this._config.getAnchorGameCoords();
    if (!anchor || !this._htmlSelects.length) return;

    const spacingPx = 28;
    const anchorPos = canvasToScreenCoords(this._config.scene, anchor.x, anchor.y, this._config.coordSpace ?? "canvas");
    let idx = 0;
    for (const sel of this._htmlSelects) {
      sel.style.left = `${anchorPos.left}px`;
      sel.style.top = `${anchorPos.top + idx * spacingPx}px`;
      idx++;
    }
  }

  toggle(): void {
    const isVisible = this._htmlSelects.length > 0 && this._htmlSelects[0]?.style.display !== "none";
    const show = !isVisible;
    for (const sel of this._htmlSelects) {
      sel.style.display = show ? "" : "none";
    }
    if (show) this.layout();
  }

  rebuildElements(elements: string[]): void {
    this._sortedElements = this.computeSortedElements();
    if (!this._elementSelect) return;
    while (this._elementSelect.options.length > 0) this._elementSelect.remove(0);
    const list = this._sortedElements.length > 0 ? this._sortedElements : elements;
    list.forEach(name => {
      const o = document.createElement("option");
      o.value = name;
      o.text = name;
      this._elementSelect!.appendChild(o);
    });
  }

  syncElementValue(name: string): void {
    if (this._elementSelect) this._elementSelect.value = name;
  }

  syncModeValue(name: string): void {
    if (this._propertySelect) this._propertySelect.value = name;
  }

  syncViewValue(value: string): void {
    if (this._viewSelect) this._viewSelect.value = value;
  }

  destroy(): void {
    for (const handler of this._clickHandlers) {
      document.removeEventListener("mousedown", handler);
    }
    this._clickHandlers = [];
    for (const sel of this._htmlSelects) {
      if (sel.parentNode) sel.parentNode.removeChild(sel);
    }
    this._htmlSelects = [];
    this._viewSelect = null;
    this._elementSelect = null;
    this._propertySelect = null;
  }
}