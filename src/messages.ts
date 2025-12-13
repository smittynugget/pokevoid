import { BattleSpec } from "#app/enums/battle-spec";
import Pokemon from "./field/pokemon";
import i18next from "i18next";
export function getPokemonMessage(pokemon: Pokemon, content: string): string {
  return `${getPokemonNameWithAffix(pokemon)}${content}`;
}
export function getPokemonNameWithAffix(pokemon: Pokemon | undefined): string {
  if (!pokemon) {
    return "Missigno";
  }

  switch (pokemon.scene.currentBattle.battleSpec) {
    case BattleSpec.DEFAULT:
      return !pokemon.isPlayer()
          ? pokemon.hasTrainer()
              ? i18next.t("battle:foePokemonWithAffix", {
          pokemonName: pokemon.getNameToRender(),
              })
              : i18next.t("battle:wildPokemonWithAffix", {
          pokemonName: pokemon.getNameToRender(),
              })
      : pokemon.getNameToRender();
    case BattleSpec.FINAL_BOSS:
      return !pokemon.isPlayer()
      ? i18next.t("battle:foePokemonWithAffix", { pokemonName: pokemon.getNameToRender() })
      : pokemon.getNameToRender();
    default:
    return pokemon.getNameToRender();
  }
}