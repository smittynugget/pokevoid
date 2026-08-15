import BattleScene from "#app/battle-scene.js";
import { Phase } from "#app/phase.js";
import { getPokemonSpecies } from "#app/data/pokemon-species.js";
import { Species } from "#enums/species";
import { Moves } from "#enums/moves";
import { EnemyPokemon, PlayerPokemon, PokemonMove, PokemonSummonData } from "#app/field/pokemon.js";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase.js";
import { AddPokemonModifierType, modifierTypes, BerryModifierType } from "#app/modifier/modifier-type.js";
import { ModifierTypeOption } from "#app/modifier/modifier-type.js";
import { PathNodeTypeFilter } from "#app/modifier/modifier-type.js";
import { BerryModifier, PokemonInstantReviveModifier } from "#app/modifier/modifier.js";
import { BerryType } from "#enums/berry-type";
import { BattleType } from "#app/battle.js";
import { TrainerType } from "#enums/trainer-type";
import { TrainerVariant } from "#app/field/trainer.js";
import TrainerData from "#app/system/trainer-data.js";
import { Biome } from "#enums/biome";
import { EncounterPhase } from "./encounter-phase";
import { SummonPhase } from "./summon-phase";
import * as Utils from "#app/utils.js";

const TUTORIAL_STARTERS = [Species.CHARIZARD, Species.BLASTOISE, Species.VENUSAUR];
const TUTORIAL_STARTER_LEVEL = 50;
const TUTORIAL_FOE_LEVEL = 50;

const TUTORIAL_WEAK_STAB: Record<number, Moves> = {
  [Species.CHARIZARD]: Moves.EMBER,
  [Species.BLASTOISE]: Moves.BUBBLE,
  [Species.VENUSAUR]: Moves.VINE_WHIP,
};

export class TutorialBattlePhase extends Phase {
  private starterOptions: ModifierTypeOption[] = [];
  private foePool: Map<number, EnemyPokemon> = new Map();

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

    const tempPokemon = this.scene.addPlayerPokemon(
      getPokemonSpecies(Species.UNOWN), 1, undefined, undefined, undefined, false
    );
    tempPokemon.setVisible(false);
    if (!tempPokemon.summonData) {
      tempPokemon.summonData = new PokemonSummonData();
    }
    party.push(tempPokemon);

    this.scene.newArena(Biome.SPACE);
    this.scene.arena.init();
    this.scene.money = 0;

    const trainerData = new TrainerData({ trainerType: TrainerType.BLUE, variant: TrainerVariant.DEFAULT, isCorrupted: true });
    this.scene.newBattle(1, BattleType.TRAINER, trainerData);

    const battle = this.scene.currentBattle;
    if (battle) {
      battle.started = false;
      battle.enemyLevels = [TUTORIAL_FOE_LEVEL];
    }

    if (battle?.trainer) {
      battle.trainer.config.hasCharSprite = true;
      battle.trainer.config.setBattleBgm("battle_legendary_deoxys");
      battle.trainer.config.setMixedBattleBgm("battle_legendary_deoxys");
    }

    const FOE_SPECIES = [Species.CHARIZARD, Species.BLASTOISE, Species.VENUSAUR];
    const loadPromises: Promise<void>[] = [];
    loadPromises.push(tempPokemon.loadAssets());

    FOE_SPECIES.forEach(speciesId => {
      const foeSpecies = getPokemonSpecies(speciesId);
      const foe = this.scene.addEnemyPokemon(foeSpecies, TUTORIAL_FOE_LEVEL, 0, false);
      foe.setBoss(true, 3);
      foe.moveset = [new PokemonMove(TUTORIAL_WEAK_STAB[speciesId])];
      foe.initBattleInfo();
      foe.setVisible(false);
      this.foePool.set(speciesId, foe);
      loadPromises.push(foe.loadAssets());
    });

    if (battle) {
      battle.enemyParty = [this.foePool.get(Species.BLASTOISE)!];
    }

    this.starterOptions = TUTORIAL_STARTERS.map(speciesId => {
      const species = getPokemonSpecies(speciesId);
      const pokemon = this.scene.addPlayerPokemon(species, TUTORIAL_STARTER_LEVEL, undefined, undefined, undefined, false);
      pokemon.moveset = [new PokemonMove(TUTORIAL_WEAK_STAB[speciesId])];
      pokemon.setVisible(false);
      loadPromises.push(pokemon.loadAssets());
      return new ModifierTypeOption(new AddPokemonModifierType(pokemon, true), 0, 0);
    });

    Promise.all(loadPromises).then(() => {
      const corruptedPalettes = [
        ["#0C0C0C", "#5A1BB2", "#000000", "#330066"],
        ["#000000", "#4B0082", "#0C0C0C", "#6340AB"],
        ["#0C0C0C", "#6A0DAD", "#000000", "#371B58"],
      ];
      this.foePool.forEach((foe) => {
        const chosenPalette = Utils.randSeedItem(corruptedPalettes);
        foe.updateAltBuildPalette({
          spriteColorPalette: { targetPalette: chosenPalette },
          inversionFactor: 0.7,
        });
        (foe as any)._tutorialCorruptionPalette = chosenPalette;
      });

      this.scene.gameData.tutorialStarterSelectCallback = () => this.queueStarterSelect();
      this.scene.unshiftPhase(new EncounterPhase(this.scene, true));
      this.end();
    }).catch((err) => {
      console.error("[TutorialBattle] Asset load failed:", err);
      this.end();
    });
  }

  private setupEnemyForStarter(): void {
    const scene = this.scene;
    const script = scene.gameData.tutorialBattleScript;
    if (!script) return;

    const unown = scene.getParty().find(p => p.species.speciesId === Species.UNOWN);
    if (unown) {
      const idx = scene.getParty().indexOf(unown);
      if (idx >= 0) {
        scene.getParty().splice(idx, 1);
        unown.destroy();
      }
    }

    const chosenStarter = scene.getParty().find(
      p => TUTORIAL_STARTERS.includes(p.species.speciesId)
    );

    if (chosenStarter) {
      script.playerStarterSpecies = chosenStarter.species.speciesId;
      const foeSpeciesId = this.getFoeSpecies(chosenStarter.species.speciesId);
      script.foeSpecies = foeSpeciesId;

      chosenStarter.moveset = [new PokemonMove(TUTORIAL_WEAK_STAB[chosenStarter.species.speciesId])];

      const battle = scene.currentBattle;
      if (battle) {
        const pooledFoe = this.foePool.get(foeSpeciesId);
        if (pooledFoe) {
          battle.enemyParty = [pooledFoe];
        }
      }
    }

    for (const opt of this.starterOptions) {
      const addType = opt.type as AddPokemonModifierType;
      const poke = addType.getPokemon();
      if (poke && poke !== chosenStarter && !scene.getParty().includes(poke as PlayerPokemon)) {
        poke.destroy();
      }
    }
  }

  public queueStarterSelect(): void {
    const selectPhase = new SelectModifierPhase(
      this.scene,
      0,
      undefined,
      true,
      () => {
        this.setupEnemyForStarter();

        const starter = this.scene.getParty().find(p =>
          TUTORIAL_STARTERS.includes(p.species.speciesId)
        );
        if (starter) {
          const reviverType = modifierTypes.REVIVER_SEED();
          const reviver = new PokemonInstantReviveModifier(reviverType, starter.id, 99);
          this.scene.addModifier(reviver, true, false, false, true);

          const lumType = new BerryModifierType(BerryType.LUM);
          const lumBerry = new BerryModifier(lumType, starter.id, BerryType.LUM, 99);
          this.scene.addModifier(lumBerry, true, false, false, true);

          const sitrusType = new BerryModifierType(BerryType.SITRUS);
          const sitrusBerry = new BerryModifier(sitrusType, starter.id, BerryType.SITRUS, 1);
          this.scene.addModifier(sitrusBerry, true, false, false, true);

          this.scene.updateModifiers(true, true);
        }

        if (this.scene.currentBattle) {
          this.scene.currentBattle.started = true;
        }
        this.scene.playBgm(undefined);
        this.scene.pbTray.showPbTray(this.scene.getParty());
        this.scene.pbTrayEnemy.showPbTray(this.scene.getEnemyParty());
        const trainer = this.scene.currentBattle?.trainer;
        if (trainer) {
          if (trainer.portalSprite) {
            const portal = trainer.portalSprite;
            trainer.portalSprite = null;
            this.scene.tweens.killTweensOf(portal);
            this.scene.tweens.add({
              targets: portal,
              alpha: 0,
              duration: 750,
              ease: "Sine.easeInOut",
              onComplete: () => { portal.destroy(); }
            });
          }
          trainer.setVisible(false);
          trainer.setAlpha(0);
        }
        this.scene.unshiftPhase(new SummonPhase(this.scene, 0, false));
        this.scene.unshiftPhase(new SummonPhase(this.scene, 0));
      },
      PathNodeTypeFilter.NONE,
      0,
      this.starterOptions
    );
    selectPhase.suppressReroll = true;
    selectPhase.uiDisplayConfig = {
      hideShop: true,
      customShopStrip: true,
    };
    this.scene.unshiftPhase(selectPhase);
  }

  private getFoeSpecies(starterSpecies: number): number {
    switch (starterSpecies) {
      case Species.CHARIZARD: return Species.BLASTOISE;
      case Species.BLASTOISE: return Species.VENUSAUR;
      case Species.VENUSAUR: return Species.CHARIZARD;
      default: return Species.BLASTOISE;
    }
  }
}