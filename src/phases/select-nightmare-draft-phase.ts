import {Phase} from "#app/phase";
import BattleScene from "#app/battle-scene";
import {getPokemonSpecies} from "#app/data/pokemon-species";
import {Species} from "#enums/species";
import {SelectModifierPhase} from "#app/phases/select-modifier-phase";
import { SacrificeToggleModifier } from "#app/modifier/modifier.ts";

export class SelectNightmareDraftPhase extends Phase {
    constructor(scene: BattleScene) {
        super(scene);
    }

    start() {
        super.start();

        const party = this.scene.getParty();
        while (party.length > 0) {
            const pokemon = party.pop();
            pokemon?.destroy();
        }

        const tempPokemon = this.scene.addPlayerPokemon(getPokemonSpecies(Species.UNOWN), 1, undefined, undefined, undefined, false);
        tempPokemon.setVisible(false);
        party.push(tempPokemon);

        const loadPokemonAssets: Promise<void>[] = [];
        loadPokemonAssets.push(tempPokemon.loadAssets());

        this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, null, true, () => {
            this.scene.unshiftPhase(new SelectModifierPhase(this.scene, 1, null, true, () => {
                const pokemon = this.scene.getParty().splice(0, 1)[0];
                pokemon.destroy();

                const newPokemon = this.scene.getParty()[0];
                if (newPokemon) {
                    newPokemon.visible = false;
                    const loadPokemonAssets: Promise<void>[] = [];
                    loadPokemonAssets.push(newPokemon.loadAssets());
                }
                const sacrificeModifiers = this.scene.findModifiers(m => m instanceof SacrificeToggleModifier);
                if (sacrificeModifiers.length) {
                    sacrificeModifiers.forEach(m => this.scene.removeModifier(m));
                    this.scene.gameData.sacrificeToggleOn = false;
                }
            }));
        }));

        this.end();
    }
    end() {
        super.end();
    }
}
