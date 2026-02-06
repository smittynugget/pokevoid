import { FormChangeItem } from "../enums/form-change-items";

const MEGA_STONE_SPRITE_MAP: Partial<Record<FormChangeItem, FormChangeItem>> = {
  [FormChangeItem.CLEFABLITE]: FormChangeItem.AUDINITE,
  [FormChangeItem.VICTREBELITE]: FormChangeItem.VENUSAURITE,
  [FormChangeItem.STARMITE]: FormChangeItem.SLOWBRONITE,
  [FormChangeItem.DRAGONITITE]: FormChangeItem.SALAMENCITE,
  [FormChangeItem.MEGANIUMITE]: FormChangeItem.SCEPTILITE,
  [FormChangeItem.FERALIGATRITE]: FormChangeItem.BLASTOISINITE,
  [FormChangeItem.SKARMORYITE]: FormChangeItem.STEELIXITE,
  [FormChangeItem.FROSLASSITE]: FormChangeItem.GLALITITE,
  [FormChangeItem.EMBOARITE]: FormChangeItem.BLAZIKENITE,
  [FormChangeItem.EXCADRILLITE]: FormChangeItem.AGGRONITE,
  [FormChangeItem.SCOLIPEDITE]: FormChangeItem.BEEDRILLITE,
  [FormChangeItem.SCRAFTITE]: FormChangeItem.LOPUNNITE,
  [FormChangeItem.EELEKTROSSITE]: FormChangeItem.MANECTITE,
  [FormChangeItem.CHANDELURITE]: FormChangeItem.GENGARITE,
  [FormChangeItem.CHESNAUGHTITE]: FormChangeItem.ABOMASITE,
  [FormChangeItem.DELPHOXITE]: FormChangeItem.GARDEVOIRITE,
  [FormChangeItem.GRENINJITE]: FormChangeItem.SHARPEDONITE,
  [FormChangeItem.PYROARITE]: FormChangeItem.HOUNDOOMINITE,
  [FormChangeItem.FLOETTITE]: FormChangeItem.DIANCITE,
  [FormChangeItem.MALAMARITE]: FormChangeItem.ALAKAZITE,
  [FormChangeItem.BARBARACLITE]: FormChangeItem.TYRANITARITE,
  [FormChangeItem.DRAGALGITE]: FormChangeItem.LATIOSITE,
  [FormChangeItem.HAWLUCHITE]: FormChangeItem.GALLADITE,
  [FormChangeItem.ZYGARDITE]: FormChangeItem.RAYQUAZITE,
  [FormChangeItem.DRAMPITE]: FormChangeItem.AMPHAROSITE,
  [FormChangeItem.FALINKSITE]: FormChangeItem.MEDICHAMITE,
  [FormChangeItem.ZERAORITE]: FormChangeItem.MANECTITE,
};

export function getFormChangeItemSpriteFrame(item: FormChangeItem): string {
  const mappedItem = MEGA_STONE_SPRITE_MAP[item] || item;
  return FormChangeItem[mappedItem]?.toLowerCase() || "pinsirite";
}

export function hasCustomSpriteMapping(item: FormChangeItem): boolean {
  return item in MEGA_STONE_SPRITE_MAP;
}
