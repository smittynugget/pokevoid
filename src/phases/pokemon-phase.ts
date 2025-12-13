import BattleScene from "#app/battle-scene.js";
import { BattlerIndex } from "#app/battle.js";
import Pokemon from "#app/field/pokemon.js";
import { FieldPhase } from "./field-phase";

export abstract class PokemonPhase extends FieldPhase {
  protected battlerIndex: BattlerIndex | integer;
  public player: boolean;
  public fieldIndex: integer;

  constructor(scene: BattleScene, battlerIndex?: BattlerIndex | integer) {
    super(scene);

    if (battlerIndex === undefined) {
      const activePokemon = scene.getField().find(p => p?.isActive());
      battlerIndex = activePokemon ? activePokemon.getBattlerIndex() : 0;
    }

    this.battlerIndex = battlerIndex;
    this.player = battlerIndex < 2;
    this.fieldIndex = battlerIndex % 2;
  }

  getPokemon(): Pokemon {
    if (this.battlerIndex > BattlerIndex.ENEMY_2) {
      return this.scene.getPokemonById(this.battlerIndex)!;
    }
    return this.scene.getField()[this.battlerIndex]!;
  }
}