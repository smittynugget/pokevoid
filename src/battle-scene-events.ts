import Move from "./data/move";
import { BerryModifier } from "./modifier/modifier";
export enum BattleSceneEventType {

  CANDY_UPGRADE_NOTIFICATION_CHANGED = "onCandyUpgradeDisplayChanged",
  MOVE_USED = "onMoveUsed",

  BERRY_USED = "onBerryUsed",
  ENCOUNTER_PHASE = "onEncounterPhase",

  TURN_INIT = "onTurnInit",

  TURN_END  = "onTurnEnd",

  NEW_ARENA = "onNewArena",
}
export class CandyUpgradeNotificationChangedEvent extends Event {

  public newValue: number;
  constructor(newValue: number) {
    super(BattleSceneEventType.CANDY_UPGRADE_NOTIFICATION_CHANGED);

    this.newValue = newValue;
  }
}
export class MoveUsedEvent extends Event {

  public pokemonId: number;

  public move: Move;

  public ppUsed: number;
  constructor(userId: number, move: Move, ppUsed: number) {
    super(BattleSceneEventType.MOVE_USED);

    this.pokemonId = userId;
    this.move = move;
    this.ppUsed = ppUsed;
  }
}

export class BerryUsedEvent extends Event {

  public berryModifier: BerryModifier;
  constructor(berry: BerryModifier) {
    super(BattleSceneEventType.BERRY_USED);

    this.berryModifier = berry;
  }
}
export class EncounterPhaseEvent extends Event {
  constructor() {
    super(BattleSceneEventType.ENCOUNTER_PHASE);
  }
}

export class TurnInitEvent extends Event {
  constructor() {
    super(BattleSceneEventType.TURN_INIT);
  }
}

export class TurnEndEvent extends Event {

  public turnCount: number;
  constructor(turnCount: number) {
    super(BattleSceneEventType.TURN_END);

    this.turnCount = turnCount;
  }
}

export class NewArenaEvent extends Event {
  constructor() {
    super(BattleSceneEventType.NEW_ARENA);
  }
}