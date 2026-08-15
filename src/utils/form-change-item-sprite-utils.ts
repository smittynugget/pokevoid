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
  [FormChangeItem.RAICHUITE_X]: FormChangeItem.MANECTITE,
  [FormChangeItem.RAICHUITE_Y]: FormChangeItem.AMPHAROSITE,
  [FormChangeItem.CHIMECHOITE]: FormChangeItem.ALAKAZITE,
  [FormChangeItem.STARAPTORITE]: FormChangeItem.PIDGEOTITE,
  [FormChangeItem.HEATRANITE]: FormChangeItem.CAMERUPTITE,
  [FormChangeItem.DARKRAITE]: FormChangeItem.SABLENITE,
  [FormChangeItem.GOLURKITE]: FormChangeItem.GENGARITE,
  [FormChangeItem.MEOWSTITE]: FormChangeItem.GARDEVOIRITE,
  [FormChangeItem.CRABOMINITE]: FormChangeItem.HERACRONITE,
  [FormChangeItem.GOLISOPODITE]: FormChangeItem.SCIZORITE,
  [FormChangeItem.MAGEARNITE]: FormChangeItem.MAWILITE,
  [FormChangeItem.SCOVILLAINITE]: FormChangeItem.BLAZIKENITE,
  [FormChangeItem.GLIMMORITE]: FormChangeItem.TYRANITARITE,
  [FormChangeItem.TATSUGURITE]: FormChangeItem.LATIOSITE,
  [FormChangeItem.BAXCALIBURITE]: FormChangeItem.SALAMENCITE,
  [FormChangeItem.ZERAORITE]: FormChangeItem.MANECTITE,
  [FormChangeItem.ABSOLITE_Z]: FormChangeItem.ABSOLITE,
  [FormChangeItem.GARCHOMPITE_Z]: FormChangeItem.GARCHOMPITE,
  [FormChangeItem.LUCARIONITE_Z]: FormChangeItem.LUCARIONITE,
};

export function getFormChangeItemSpriteFrame(item: FormChangeItem): string {
  const mappedItem = MEGA_STONE_SPRITE_MAP[item] || item;
  return FormChangeItem[mappedItem]?.toLowerCase() || "pinsirite";
}

export function hasCustomSpriteMapping(item: FormChangeItem): boolean {
  return item in MEGA_STONE_SPRITE_MAP;
}