import "vitest-canvas-mock";
import { vi } from "vitest";
const Phaser = {
  Math: {
    RND: {
      realInRange: (min: number, max: number) => (min + max) / 2,
      integerInRange: (min: number, max: number) => Math.floor((min + max) / 2),
      pick: <T>(items: T[]) => items[0],
      weightedPick: <T>(items: T[]) => items[0],
    },
  },
  Display: {
    Canvas: {
      CanvasPool: {} as any,
    },
  },
  Input: {
    Keyboard: {
      KeyCodes: new Proxy(
        {},
        {
          get: (_target, _prop) => 0,
        }
      ),
    },
  },
  Scene: class Scene {},
  Renderer: {
    WebGL: {
      Utils: {},
    },
  },
  Tweens: {
    Builders: {
      GetEaseFunction: () => (v: number) => v,
    },
  },
  Loader: {
    LoaderPlugin: class LoaderPlugin {},
    FileTypes: {
      ImageFile: class ImageFile {},
    },
    FILE_PROCESSING: 0,
    FILE_COMPLETE: 1,
    FILE_ERRORED: 2,
  },
  GameObjects: {
    Container: class Container {},
  },
} as any;

(globalThis as any).Phaser = Phaser;
vi.mock("phaser", () => ({ default: Phaser }));
vi.mock("phaser3-rex-plugins/plugins/soundfade", () => ({ default: class SoundFade {} }));
vi.mock("phaser3-rex-plugins/plugins/roundrectangle", () => ({ default: class RoundRectangle {} }));
vi.mock("phaser3-rex-plugins/plugins/roundrectangle.js", () => ({ default: class RoundRectangle {} }));
vi.mock("phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText", () => ({ default: class BBCodeText {} }));
vi.mock("phaser3-rex-plugins/plugins/gameobjects/tagtext/bbcodetext/BBCodeText.js", () => ({ default: class BBCodeText {} }));
vi.mock("phaser3-rex-plugins/plugins/inputtext", () => ({ default: class InputText {} }));
vi.mock("phaser3-rex-plugins/plugins/inputtext.js", () => ({ default: class InputText {} }));
vi.mock("phaser3-rex-plugins/plugins/inputtext-plugin.js", () => ({ default: class InputTextPlugin {} }));
vi.mock("../messages", () => ({
  getPokemonNameWithAffix: (pokemon: any) => pokemon?.getNameToRender?.() ?? pokemon?.name ?? "Pokemon",
  getPokemonMessage: (pokemon: any, content: string) => `${pokemon?.getNameToRender?.() ?? pokemon?.name ?? "Pokemon"}${content}`,
}));
vi.mock("#app/messages", () => ({
  getPokemonNameWithAffix: (pokemon: any) => pokemon?.getNameToRender?.() ?? pokemon?.name ?? "Pokemon",
  getPokemonMessage: (pokemon: any, content: string) => `${pokemon?.getNameToRender?.() ?? pokemon?.name ?? "Pokemon"}${content}`,
}));
vi.mock("#app/messages.js", () => ({
  getPokemonNameWithAffix: (pokemon: any) => pokemon?.getNameToRender?.() ?? pokemon?.name ?? "Pokemon",
  getPokemonMessage: (pokemon: any, content: string) => `${pokemon?.getNameToRender?.() ?? pokemon?.name ?? "Pokemon"}${content}`,
}));
const uiTextModule = {
  TextStyle: {
    MESSAGE: 0,
    WINDOW: 1,
    SUMMARY: 2,
    SUMMARY_PINK: 3,
    SUMMARY_BLUE: 4,
  },
  getBBCodeFrag: (text: string) => text,
  addTextObject: () => ({}),
  setTextStyle: () => undefined,
  addBBCodeTextObject: () => ({}),
  addTextInputObject: () => ({}),
  getTextStyleOptions: () => ({ scale: 1, styleOptions: {}, shadowColor: "#000", shadowXpos: 0, shadowYpos: 0 }),
  getModifierTierTextTint: () => 0xffffff,
  getTextColor: () => 0xffffff,
};
vi.mock("../ui/text", () => uiTextModule as any);
vi.mock("#app/ui/text", () => uiTextModule as any);
vi.mock("#app/ui/text.js", () => uiTextModule as any);
class BooleanHolder<T extends boolean = boolean> {
  constructor(public value: T) {}
}
class NumberHolder<T extends number = number> {
  constructor(public value: T) {}
}
class IntegerHolder<T extends number = number> {
  constructor(public value: T) {}
}
class StringHolder<T extends string = string> {
  constructor(public value: T) {}
}

const utilsModule = {

  BooleanHolder,
  NumberHolder,
  IntegerHolder,
  StringHolder,
  randSeedInt: (range: number, min: number = 0) => {
    if (range <= 1) {
      return min;
    }
    return Phaser.Math.RND.integerInRange(min, (range - 1) + min);
  },
  randSeedIntRange: (min: number, max: number) => utilsModule.randSeedInt((max - min) + 1, min),
  randSeedChance: (chance: number) => utilsModule.randSeedInt(100, 1) <= chance,
  randSeedItem: <T>(items: T[]) => (items.length ? items[utilsModule.randSeedInt(items.length)] : (undefined as any)),
  randItem: <T>(items: T[]) => utilsModule.randSeedItem(items),

  randInt: (range: number, min: number = 0) => utilsModule.randSeedInt(range, min),
  randIntRange: (min: number, max: number) => min + Math.floor(Math.random() * (max - min + 1)),
  toDmgValue: (value: number, minValue: number = 1) => Math.max(Math.floor(value), minValue),
  clampInt: (value: number, min: number, max: number) => Math.min(Math.max(value, min), max),
  randomString: (length: number, seeded: boolean = false) => {
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < length; i++) {
      const randomIndex = seeded ? utilsModule.randSeedInt(characters.length) : Math.floor(Math.random() * characters.length);
      result += characters[randomIndex];
    }
    return result;
  },
  toReadableString: (str: string) =>
    str.replace(/\_/g, " ").split(" ").map(s => `${s.slice(0, 1)}${s.slice(1).toLowerCase()}`).join(" "),
  getEnumValues: (e: any) => Object.values(e).filter(v => typeof v === "number"),
};

vi.mock("../utils", () => utilsModule as any);
vi.mock("#app/utils", () => utilsModule as any);
vi.mock("#app/utils.js", () => utilsModule as any);
const loadingSceneModule = {
  isIPhone: () => false,
  LoadingScene: class LoadingScene {},
};
vi.mock("../loading-scene", () => loadingSceneModule as any);
vi.mock("../loading-scene.js", () => loadingSceneModule as any);
vi.mock("#app/loading-scene", () => loadingSceneModule as any);
vi.mock("#app/loading-scene.js", () => loadingSceneModule as any);
if (!(globalThis as any).FontFace) {
  (globalThis as any).FontFace = class FontFace {
    public family: string;
    public source: string;
    public descriptors?: Record<string, any>;
    constructor(family: string, source: string, descriptors?: Record<string, any>) {
      this.family = family;
      this.source = source;
      this.descriptors = descriptors;
    }
    load(): Promise<this> {
      return Promise.resolve(this);
    }
  };
}
vi.mock("#app/phases/move-effect-phase.js", () => ({
  MoveEffectPhase: class MoveEffectPhase {},
}));

vi.mock("#app/phases/pokemon-heal-phase.js", () => ({
  PokemonHealPhase: class PokemonHealPhase {
    public battlerIndex: any;
    public healAmount: any;
    constructor(_scene: any, battlerIndex: any, healAmount: any, _message: any, _show: any) {
      this.battlerIndex = battlerIndex;
      this.healAmount = healAmount;
    }
  },
}));

vi.mock("#app/phases/show-ability-phase.js", () => ({
  ShowAbilityPhase: class ShowAbilityPhase {},
}));

class MockStatChangePhase {
  public stats: any;
  public levels: any;
  constructor(_scene: any, _battlerIndex: any, _selfTarget: any, stats: any, levels: any) {
    this.stats = stats;
    this.levels = levels;
  }
}
vi.mock("#app/phases/stat-change-phase.js", () => ({
  StatChangePhase: MockStatChangePhase,
}));
vi.mock("#app/phases/move-phase", () => ({ MovePhase: class MovePhase {} }));
vi.mock("#app/phases/move-phase.js", () => ({ MovePhase: class MovePhase {} }));
vi.mock("#app/phases/pokemon-heal-phase", () => ({
  PokemonHealPhase: class PokemonHealPhase {
    public battlerIndex: any;
    public healAmount: any;
    constructor(_scene: any, battlerIndex: any, healAmount: any, _message: any, _show: any) {
      this.battlerIndex = battlerIndex;
      this.healAmount = healAmount;
    }
  },
}));
vi.mock("#app/phases/show-ability-phase", () => ({ ShowAbilityPhase: class ShowAbilityPhase {} }));
vi.mock("#app/phases/stat-change-phase", () => ({ StatChangePhase: MockStatChangePhase }));
vi.mock("#app/phases/common-anim-phase", () => ({ CommonAnimPhase: class CommonAnimPhase {} }));
vi.mock("#app/phases/common-anim-phase.js", () => ({ CommonAnimPhase: class CommonAnimPhase {} }));
vi.mock("#app/phases/select-modifier-phase", () => ({ SelectModifierPhase: class SelectModifierPhase {} }));
vi.mock("#app/phases/select-modifier-phase.js", () => ({ SelectModifierPhase: class SelectModifierPhase {} }));
vi.mock("#app/phases/switch-summon-phase", () => ({ SwitchSummonPhase: class SwitchSummonPhase {} }));
vi.mock("#app/phases/battle-path-phase", () => ({
  BattlePathPhase: class BattlePathPhase {},
  PathNodeContext: {} as any,
}));
vi.mock("#app/phases/battle-path-phase.js", () => ({
  BattlePathPhase: class BattlePathPhase {},
  PathNodeContext: {} as any,
}));
vi.mock("#app/phases/command-phase", () => ({ CommandPhase: class CommandPhase {} }));
vi.mock("#app/phases/command-phase.js", () => ({ CommandPhase: class CommandPhase {} }));
vi.mock("#app/phases/select-target-phase", () => ({ SelectTargetPhase: class SelectTargetPhase {} }));
vi.mock("#app/phases/select-target-phase.js", () => ({ SelectTargetPhase: class SelectTargetPhase {} }));
vi.mock("#app/phases/faint-phase", () => ({ FaintPhase: class FaintPhase {} }));
vi.mock("#app/phases/faint-phase.js", () => ({ FaintPhase: class FaintPhase {} }));
vi.mock("#app/phases/party-status-cure-phase", () => ({ PartyStatusCurePhase: class PartyStatusCurePhase {} }));
vi.mock("#app/phases/party-status-cure-phase.js", () => ({ PartyStatusCurePhase: class PartyStatusCurePhase {} }));
vi.mock("#app/phases/battle-end-phase", () => ({ BattleEndPhase: class BattleEndPhase {} }));
vi.mock("#app/phases/battle-end-phase.js", () => ({ BattleEndPhase: class BattleEndPhase {} }));
vi.mock("#app/phases/move-end-phase", () => ({ MoveEndPhase: class MoveEndPhase {} }));
vi.mock("#app/phases/move-end-phase.js", () => ({ MoveEndPhase: class MoveEndPhase {} }));
vi.mock("#app/phases/new-battle-phase", () => ({ NewBattlePhase: class NewBattlePhase {} }));
vi.mock("#app/phases/new-battle-phase.js", () => ({ NewBattlePhase: class NewBattlePhase {} }));
vi.mock("#app/phases/switch-phase", () => ({ SwitchPhase: class SwitchPhase {} }));
vi.mock("#app/phases/switch-phase.js", () => ({ SwitchPhase: class SwitchPhase {} }));
vi.mock("#app/phases/check-switch-phase", () => ({ CheckSwitchPhase: class CheckSwitchPhase {} }));
vi.mock("#app/phases/check-switch-phase.js", () => ({ CheckSwitchPhase: class CheckSwitchPhase {} }));
const battleModule = {
  BattlerIndex: {
    PLAYER: 0,
    ENEMY: 1,
  } as any,
};
vi.mock("../battle", () => battleModule as any);
vi.mock("../battle.js", () => battleModule as any);
vi.mock("#app/battle", () => battleModule as any);
vi.mock("#app/battle.js", () => battleModule as any);
const gameModeModule = {
  GameModes: {} as any,
  GameMode: class GameMode {},
};
vi.mock("../game-mode", () => gameModeModule as any);
vi.mock("../game-mode.js", () => gameModeModule as any);
vi.mock("#app/game-mode", () => gameModeModule as any);
vi.mock("#app/game-mode.js", () => gameModeModule as any);
const battleSceneEventsModule = {
  BattleSceneEventType: {} as any,
  CandyUpgradeNotificationChangedEvent: class CandyUpgradeNotificationChangedEvent {},
  MoveUsedEvent: class MoveUsedEvent {},
  BerryUsedEvent: class BerryUsedEvent {},
  EncounterPhaseEvent: class EncounterPhaseEvent {},
  TurnInitEvent: class TurnInitEvent {},
  TurnEndEvent: class TurnEndEvent {},
  NewArenaEvent: class NewArenaEvent {},
};
vi.mock("../events/battle-scene", () => battleSceneEventsModule as any);
vi.mock("../events/battle-scene.js", () => battleSceneEventsModule as any);
vi.mock("#app/events/battle-scene", () => battleSceneEventsModule as any);
vi.mock("#app/events/battle-scene.js", () => battleSceneEventsModule as any);
const pokemonLevelMovesModule = {
  removeUnimplementedMoves: () => undefined,
};
vi.mock("#app/data/pokemon-level-moves", () => pokemonLevelMovesModule as any);
vi.mock("#app/data/pokemon-level-moves.js", () => pokemonLevelMovesModule as any);
const challengeModule = {
  ChallengeType: {} as any,
  applyChallenges: () => undefined,
};
vi.mock("../data/challenge", () => challengeModule as any);
vi.mock("../data/challenge.js", () => challengeModule as any);
vi.mock("#app/data/challenge", () => challengeModule as any);
vi.mock("#app/data/challenge.js", () => challengeModule as any);
const modifierModule = {
  BerryModifier: class BerryModifier {},
  PokemonHeldItemModifier: class PokemonHeldItemModifier {},
  CollectedTypeModifier: class CollectedTypeModifier {
    public pokemonId: any;
    private collectedType: any;
    constructor(_modifierType: any, pokemonId: any, collectedType: any) {
      this.pokemonId = pokemonId;
      this.collectedType = collectedType;
    }
    getTypeCount(type: any): number {
      return type === this.collectedType ? 1 : 0;
    }
  },
  PermaUseAbilityQuestModifier: class PermaUseAbilityQuestModifier {},
  PermaPartyAbilityModifier: class PermaPartyAbilityModifier {},
  TrainerBondAbilityModifier: class TrainerBondAbilityModifier {},
  TeraAbilityModifier: class TeraAbilityModifier {},
};
vi.mock("../modifier/modifier", () => modifierModule as any);
vi.mock("#app/modifier/modifier", () => modifierModule as any);
vi.mock("#app/modifier/modifier.js", () => modifierModule as any);

const modifierTypeModule = {
  BerryModifierType: class BerryModifierType {},
  CollectedTypeModifierType: class CollectedTypeModifierType {
    public type: any;
    constructor(type: any) {
      this.type = type;
    }
  },
};
vi.mock("../modifier/modifier-type", () => modifierTypeModule as any);
vi.mock("../modifier/modifier-type.js", () => modifierTypeModule as any);
vi.mock("#app/modifier/modifier-type", () => modifierTypeModule as any);
vi.mock("#app/modifier/modifier-type.js", () => modifierTypeModule as any);

const permaModifiersModule = {
  PermaType: { PERMA_PARTY_ABILITY: 0 },
};
vi.mock("../modifier/perma-modifiers", () => permaModifiersModule as any);
vi.mock("../modifier/perma-modifiers.js", () => permaModifiersModule as any);
vi.mock("#app/modifier/perma-modifiers", () => permaModifiersModule as any);
vi.mock("#app/modifier/perma-modifiers.js", () => permaModifiersModule as any);
class MockBattleScene {}
vi.mock("../battle-scene", () => ({
  default: MockBattleScene,
  AnySound: {} as any,
}));
vi.mock("#app/battle-scene", () => ({
  default: MockBattleScene,
  AnySound: {} as any,
}));
vi.mock("#app/battle-scene.js", () => ({
  default: MockBattleScene,
  AnySound: {} as any,
}));
enum MoveResult {
  PENDING,
  SUCCESS,
  FAIL,
  MISS,
  OTHER,
}
enum HitResult {
  EFFECTIVE = 1,
  SUPER_EFFECTIVE,
  NOT_VERY_EFFECTIVE,
  ONE_HIT_KO,
  NO_EFFECT,
  STATUS,
  HEAL,
  FAIL,
  MISS,
  OTHER,
  IMMUNE,
}
class Pokemon {}
class PlayerPokemon extends Pokemon {}
class PokemonMove {
  public moveId: any;
  constructor(moveId: any) {
    this.moveId = moveId;
  }
  getMove(): any {
    return { id: this.moveId };
  }
}
const pokemonModule = {
  default: Pokemon,
  Pokemon,
  PlayerPokemon,
  PokemonMove,
  MoveResult,
  HitResult,
};
vi.mock("../field/pokemon", () => pokemonModule as any);
vi.mock("#app/field/pokemon", () => pokemonModule as any);
vi.mock("#app/field/pokemon.js", () => pokemonModule as any);
const pokemonFormsModule = {
  SpeciesFormChangeManualTrigger: class SpeciesFormChangeManualTrigger {},
  SpeciesFormChangeRevertWeatherFormTrigger: class SpeciesFormChangeRevertWeatherFormTrigger {},
  SpeciesFormChangeWeatherTrigger: class SpeciesFormChangeWeatherTrigger {},
  SpeciesFormChangePostMoveTrigger: class SpeciesFormChangePostMoveTrigger {},
  SpeciesFormChangeActiveTrigger: class SpeciesFormChangeActiveTrigger {},
};
vi.mock("../data/pokemon-forms", () => pokemonFormsModule as any);
vi.mock("#app/data/pokemon-forms", () => pokemonFormsModule as any);
vi.mock("#app/data/pokemon-forms.js", () => pokemonFormsModule as any);
const commandUiModule = {
  Command: {
    FIGHT: 0,
    BALL: 1,
    RUN: 2,
    SWITCH: 3,
  },
};
vi.mock("../ui/command-ui-handler", () => commandUiModule as any);
vi.mock("#app/ui/command-ui-handler", () => commandUiModule as any);
vi.mock("#app/ui/command-ui-handler.js", () => commandUiModule as any);
const partyUiModule = {
  default: class PartyUiHandler {},
  PartyUiMode: {} as any,
  PartyOption: {} as any,
  PokemonMoveSelectFilter: {} as any,
  PokemonSelectFilter: {} as any,
};
vi.mock("../ui/party-ui-handler", () => partyUiModule as any);
vi.mock("../ui/party-ui-handler.js", () => partyUiModule as any);
vi.mock("#app/ui/party-ui-handler", () => partyUiModule as any);
vi.mock("#app/ui/party-ui-handler.js", () => partyUiModule as any);