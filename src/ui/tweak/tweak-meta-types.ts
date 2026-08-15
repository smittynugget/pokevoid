export enum TweakMetaMode {
  NONE = 0,
  EDIT = 1,
  EDIT_TYPE = 2,
  ELEMENT = 3,
}

export const TWEAK_META_CYCLE: readonly TweakMetaMode[] = [
  TweakMetaMode.EDIT,
  TweakMetaMode.EDIT_TYPE,
  TweakMetaMode.ELEMENT,
  TweakMetaMode.NONE,
];

export const TWEAK_META_CYCLE_SKIP_ELEMENT: readonly TweakMetaMode[] = [
  TweakMetaMode.EDIT,
  TweakMetaMode.EDIT_TYPE,
  TweakMetaMode.NONE,
];

export const TWEAK_META_HUD_COLOR: Record<TweakMetaMode, string> = {
  [TweakMetaMode.NONE]: "",
  [TweakMetaMode.EDIT]: "#00FF00",
  [TweakMetaMode.EDIT_TYPE]: "#FFD700",
  [TweakMetaMode.ELEMENT]: "#40C8F8",
};

export function cycleMetaMode(current: TweakMetaMode, cycle: readonly TweakMetaMode[] = TWEAK_META_CYCLE): TweakMetaMode {
  const idx = cycle.indexOf(current);
  if (idx === -1) return cycle[0];
  return cycle[(idx + 1) % cycle.length];
}

export function tweakCopyToClipboard(text: string): void {
  if (navigator?.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {});
  }
}

export function formatMetaHud(
  metaMode: TweakMetaMode,
  modeName: string,
  assetName: string,
): { text: string; color: string } {
  switch (metaMode) {
  case TweakMetaMode.EDIT:
    return { text: `EDIT MODE - ${modeName} - ${assetName}`, color: TWEAK_META_HUD_COLOR[TweakMetaMode.EDIT] };
  case TweakMetaMode.EDIT_TYPE:
    return { text: `EDIT TYPE SELECT - ${modeName}`, color: TWEAK_META_HUD_COLOR[TweakMetaMode.EDIT_TYPE] };
  case TweakMetaMode.ELEMENT:
    return { text: `ELEMENT SELECT - ${assetName}`, color: TWEAK_META_HUD_COLOR[TweakMetaMode.ELEMENT] };
  default:
    return { text: "", color: "" };
  }
}