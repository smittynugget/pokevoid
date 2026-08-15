import BattleScene from "#app/battle-scene.js";
import { CollectedTypeModifier } from "#app/modifier/modifier.js";

export function getPartyCollectedTypeTotal(scene: BattleScene): number {
    const party = scene.getParty();
    let total = 0;

    for (const pokemon of party) {
        const modifiers = scene.findModifiers(m =>
            m instanceof CollectedTypeModifier && m.pokemonId === pokemon.id
        ) as CollectedTypeModifier[];

        for (const modifier of modifiers) {
            total += Object.values(modifier.collectedTypes).reduce((sum, count) => sum + count, 0);
        }
    }

    return total;
}

export function canAffordCollectedTypeCost(scene: BattleScene, cost: number): boolean {
    if (cost <= 0) {
        return true;
    }
    return getPartyCollectedTypeTotal(scene) >= cost;
}