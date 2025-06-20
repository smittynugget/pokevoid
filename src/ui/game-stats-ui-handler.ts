import Phaser from "phaser";
import BattleScene from "../battle-scene";
import { TextStyle, addTextObject } from "./text";
import { Mode } from "./ui";
import UiHandler from "./ui-handler";
import { addWindow } from "./ui-theme";
import * as Utils from "../utils";
import { DexAttr, GameData } from "../system/game-data";
import { speciesStarters } from "../data/pokemon-species";
import { Button } from "../enums/buttons";
import i18next from "i18next";
import { UiTheme } from "../enums/ui-theme";
import { generateModifierStats } from "../modifier/modifier-type";
import { Type } from "../data/type";

interface DisplayStat {
  label_key?: string;
  sourceFunc?: (gameData: GameData) => string;
  labelFunc?: () => string;
  hidden?: boolean;
}

interface DisplayStats {
  [key: string]: DisplayStat | string
}

const displayStats: DisplayStats = {
  playTime: {
    label_key: "playTime",
    sourceFunc: gameData => Utils.getPlayTimeString(gameData.gameStats.playTime)
  },
  battles: {
    label_key: "totalBattles",
    sourceFunc: gameData => gameData.gameStats.battles.toString(),
  },
  startersUnlocked: {
    label_key: "starters",
    sourceFunc: gameData => {
      const starterCount = gameData.getStarterCount(d => !!d.caughtAttr);
      return `${starterCount} (${Math.floor((starterCount / Object.keys(speciesStarters).length) * 1000) / 10}%)`;
    }
  },
  shinyStartersUnlocked: {
    label_key: "shinyStarters",
    sourceFunc: gameData => {
      const starterCount = gameData.getStarterCount(d => !!(d.caughtAttr & DexAttr.SHINY));
      return `${starterCount} (${Math.floor((starterCount / Object.keys(speciesStarters).length) * 1000) / 10}%)`;
    }
  },
  dexSeen: {
    label_key: "speciesSeen",
    sourceFunc: gameData => {
      const seenCount = gameData.getSpeciesCount(d => !!d.seenAttr);
      return `${seenCount} (${Math.floor((seenCount / Object.keys(gameData.dexData).length) * 1000) / 10}%)`;
    }
  },
  dexCaught: {
    label_key: "speciesCaught",
    sourceFunc: gameData => {
      const caughtCount = gameData.getSpeciesCount(d => !!d.caughtAttr);
      return `${caughtCount} (${Math.floor((caughtCount / Object.keys(gameData.dexData).length) * 1000) / 10}%)`;
    }
  },
  ribbonsOwned: {
    label_key: "ribbonsOwned",
    sourceFunc: gameData => gameData.gameStats.ribbonsOwned.toString(),
  },
  rivalsDefeated: {
    label_key: "rivalsDefeated",
    sourceFunc: gameData => gameData.gameStats.rivalsDefeated.toString(),
    hidden: true
  },
  glitchFormsUnlocked: {
    label_key: "glitchFormsUnlocked",
    sourceFunc: gameData => gameData.gameStats.glitchFormsUnlocked.toString(),
    hidden: true
  },
  smittyFormsUnlocked: {
    label_key: "smittyFormsUnlocked",
    sourceFunc: gameData => gameData.gameStats.smittyFormsUnlocked.toString(),
    hidden: true
  },
  fusionsCaptured: {
    label_key: "fusionsCaptured",
    sourceFunc: gameData => gameData.gameStats.fusionsCaptured.toString(),
    hidden: true
  },
  glitchEvolutions: {
    label_key: "glitchEvolutions",
    sourceFunc: gameData => gameData.gameStats.glitchEvolutions.toString(),
    hidden: true
  },
  smittyEvolutions: {
    label_key: "smittyEvolutions",
    sourceFunc: gameData => gameData.gameStats.smittyEvolutions.toString(),
    hidden: true
  },
  dynamaxEvolutions: {
    label_key: "dynamaxEvolutions",
    sourceFunc: gameData => gameData.gameStats.dynamaxEvolutions.toString(),
    hidden: true
  },
  megaEvolutions: {
    label_key: "megaEvolutions",
    sourceFunc: gameData => gameData.gameStats.megaEvolutions.toString(),
    hidden: true
  },
  trainerPokemonSnatched: {
    label_key: "trainerPokemonSnatched",
    sourceFunc: gameData => gameData.gameStats.trainerPokemonSnatched.toString(),
    hidden: true
  },
  permaItemsBought: {
    label_key: "permaItemsBought",
    sourceFunc: gameData => gameData.gameStats.permaItemsBought.toString(),
    hidden: true
  },
  glitchFormsDefeated: {
    label_key: "glitchFormsDefeated",
    sourceFunc: gameData => gameData.gameStats.glitchFormsDefeated.toString(),
    hidden: true
  },
  smittyFormsDefeated: {
    label_key: "smittyFormsDefeated",
    sourceFunc: gameData => gameData.gameStats.smittyFormsDefeated.toString(),
    hidden: true
  },
  pokeballsThrown: {
    label_key: "pokeballsThrown",
    sourceFunc: gameData => gameData.gameStats.pokeballsThrown.toString(),
    hidden: true
  },
  greatballsThrown: {
    label_key: "greatballsThrown",
    sourceFunc: gameData => gameData.gameStats.greatballsThrown.toString(),
    hidden: true
  },
  ultraballsThrown: {
    label_key: "ultraballsThrown",
    sourceFunc: gameData => gameData.gameStats.ultraballsThrown.toString(),
    hidden: true
  },
  rogueballsThrown: {
    label_key: "rogueballsThrown",
    sourceFunc: gameData => gameData.gameStats.rogueballsThrown.toString(),
    hidden: true
  },
  masterballsThrown: {
    label_key: "masterballsThrown",
    sourceFunc: gameData => gameData.gameStats.masterballsThrown.toString(),
    hidden: true
  },
  totalEvolutions: {
    label_key: "totalEvolutions",
    sourceFunc: gameData => gameData.gameStats.totalEvolutions.toString(),
    hidden: true
  },
  reroll: {
    label_key: "reroll",
    sourceFunc: gameData => gameData.gameStats.reroll.toString(),
    hidden: true
  },
  permaReroll: {
    label_key: "permaReroll",
    sourceFunc: gameData => gameData.gameStats.permaReroll.toString(),
    hidden: true
  },
  elite4Defeated: {
    label_key: "elite4Defeated",
    sourceFunc: gameData => gameData.gameStats.elite4Defeated.toString(),
    hidden: true
  },
  championsDefeated: {
    label_key: "championsDefeated",
    sourceFunc: gameData => gameData.gameStats.championsDefeated.toString(),
    hidden: true
  },
  gruntsDefeated: {
    label_key: "gruntsDefeated",
    sourceFunc: gameData => gameData.gameStats.gruntsDefeated.toString(),
    hidden: true
  },
  evilAdminsDefeated: {
    label_key: "evilAdminsDefeated",
    sourceFunc: gameData => gameData.gameStats.evilAdminsDefeated.toString(),
    hidden: true
  },
  evilBossesDefeated: {
    label_key: "evilBossesDefeated",
    sourceFunc: gameData => gameData.gameStats.evilBossesDefeated.toString(),
    hidden: true
  },
  smittysDefeated: {
    label_key: "smittysDefeated",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.smittysDefeated >= 1;
      return isUnlocked ? gameData.gameStats.smittysDefeated.toString() : "???";
    },
    hidden: true
  },
  pokemonTradedForMoney: {
    label_key: "pokemonTradedForMoney",
    sourceFunc: gameData => gameData.gameStats.pokemonTradedForMoney.toString(),
    hidden: true
  },
  pokemonSwitched: {
    label_key: "pokemonSwitched",
    sourceFunc: gameData => gameData.gameStats.pokemonSwitched.toString(),
    hidden: true
  },
  majorBossesDefeated: {
    label_key: "majorBossesDefeated",
    sourceFunc: gameData => gameData.gameStats.majorBossesDefeated.toString(),
    hidden: true
  },
  questsCompleted: {
    label_key: "questsCompleted",
    sourceFunc: gameData => gameData.gameStats.questsCompleted.toString(),
    hidden: true
  },
  bountiesCompleted: {
    label_key: "bountiesCompleted",
    sourceFunc: gameData => gameData.gameStats.bountiesCompleted.toString(),
    hidden: true
  },
  battlesEscaped: {
    label_key: "battlesEscaped",
    sourceFunc: gameData => gameData.gameStats.battlesEscaped.toString(),
    hidden: true
  },
  glitchModsCreated: {
    label_key: "glitchModsCreated",
    sourceFunc: gameData => gameData.gameStats.glitchModsCreated.toString(),
    hidden: true
  },
  glitchModsUploaded: {
    label_key: "glitchModsUploaded",
    sourceFunc: gameData => gameData.gameStats.glitchModsUploaded.toString(),
    hidden: true
  },
  glitchModsUnlocked: {
    label_key: "glitchModsUnlocked",
    sourceFunc: gameData => gameData.gameStats.glitchModsUnlocked.toString(),
    hidden: true
  },
  highestPermaMoney: {
    label_key: "highestPermaMoney",
    sourceFunc: gameData => Utils.formatFancyLargeNumber(gameData.gameStats.highestPermaMoney || 0),
    hidden: true
  },
  moneySpentFromSnatching: {
    label_key: "moneySpentFromSnatching",
    sourceFunc: gameData => Utils.formatFancyLargeNumber(gameData.gameStats.moneySpentFromSnatching),
    hidden: true
  },
  moneyEarnedFromTrading: {
    label_key: "moneyEarnedFromTrading",
    sourceFunc: gameData => Utils.formatFancyLargeNumber(gameData.gameStats.moneyEarnedFromTrading),
    hidden: true
  },
  draftSessionsPlayed: {
    label_key: "rogueRuns",
    sourceFunc: gameData => gameData.gameStats.draftSessionsPlayed.toString(),
  },
  draftSessionsWon: {
    label_key: "rogueWins",
    sourceFunc: gameData => gameData.gameStats.draftSessionsWon.toString(),
  },
  sessionsPlayed: {
    label_key: "sessionsPlayed",
    sourceFunc: gameData => gameData.gameStats.sessionsPlayed.toString(),
  },
  sessionsWon: {
    label_key: "sessionsWon",
    sourceFunc: gameData => gameData.gameStats.sessionsWon.toString(),
  },
  highestInfiniteWave: {
    label_key: "highestWaveInfinite",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.highestInfiniteWave > 0;
      return isUnlocked ? gameData.gameStats.highestInfiniteWave.toString() : "???";
    },
    hidden: true
  },
  highestInfiniteRogueWave: {
    label_key: "highestWaveInfiniteRogue",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.highestInfiniteRogueWave > 0;
      return isUnlocked ? gameData.gameStats.highestInfiniteRogueWave.toString() : "???";
    },
    hidden: true
  },
  highestMoney: {
    label_key: "highestMoney",
    sourceFunc: gameData => Utils.formatFancyLargeNumber(gameData.gameStats.highestMoney),
  },
  highestDamage: {
    label_key: "highestDamage",
    sourceFunc: gameData => gameData.gameStats.highestDamage.toString(),
  },
  highestHeal: {
    label_key: "highestHPHealed",
    sourceFunc: gameData => gameData.gameStats.highestHeal.toString(),
  },
  pokemonSeen: {
    label_key: "pokemonEncountered",
    sourceFunc: gameData => gameData.gameStats.pokemonSeen.toString(),
  },
  pokemonDefeated: {
    label_key: "pokemonDefeated",
    sourceFunc: gameData => gameData.gameStats.pokemonDefeated.toString(),
  },
  pokemonCaught: {
    label_key: "pokemonCaught",
    sourceFunc: gameData => gameData.gameStats.pokemonCaught.toString(),
  },
  pokemonHatched: {
    label_key: "eggsHatched",
    sourceFunc: gameData => gameData.gameStats.pokemonHatched.toString(),
  },
  subLegendaryPokemonSeen: {
    label_key: "subLegendsSeen",
    sourceFunc: gameData => gameData.gameStats.subLegendaryPokemonSeen.toString(),
    hidden: true
  },
  subLegendaryPokemonCaught: {
    label_key: "subLegendsCaught",
    sourceFunc: gameData => gameData.gameStats.subLegendaryPokemonCaught.toString(),
    hidden: true
  },
  subLegendaryPokemonHatched: {
    label_key: "subLegendsHatched",
    sourceFunc: gameData => gameData.gameStats.subLegendaryPokemonHatched.toString(),
    hidden: true
  },
  legendaryPokemonSeen: {
    label_key: "legendsSeen",
    sourceFunc: gameData => gameData.gameStats.legendaryPokemonSeen.toString(),
    hidden: true
  },
  legendaryPokemonCaught: {
    label_key: "legendsCaught",
    sourceFunc: gameData => gameData.gameStats.legendaryPokemonCaught.toString(),
    hidden: true
  },
  legendaryPokemonHatched: {
    label_key: "legendsHatched",
    sourceFunc: gameData => gameData.gameStats.legendaryPokemonHatched.toString(),
    hidden: true
  },
  mythicalPokemonSeen: {
    label_key: "mythicalsSeen",
    sourceFunc: gameData => gameData.gameStats.mythicalPokemonSeen.toString(),
    hidden: true
  },
  mythicalPokemonCaught: {
    label_key: "mythicalsCaught",
    sourceFunc: gameData => gameData.gameStats.mythicalPokemonCaught.toString(),
    hidden: true
  },
  mythicalPokemonHatched: {
    label_key: "mythicalsHatched",
    sourceFunc: gameData => gameData.gameStats.mythicalPokemonHatched.toString(),
    hidden: true
  },
  shinyPokemonSeen: {
    label_key: "shiniesSeen",
    sourceFunc: gameData => gameData.gameStats.shinyPokemonSeen.toString(),
    hidden: true
  },
  shinyPokemonCaught: {
    label_key: "shiniesCaught",
    sourceFunc: gameData => gameData.gameStats.shinyPokemonCaught.toString(),
    hidden: true
  },
  shinyPokemonHatched: {
    label_key: "shiniesHatched",
    sourceFunc: gameData => gameData.gameStats.shinyPokemonHatched.toString(),
    hidden: true
  },
  pokemonFused: {
    label_key: "pokemonFused",
    sourceFunc: gameData => gameData.gameStats.pokemonFused.toString(),
    hidden: true
  },
  trainersDefeated: {
    label_key: "trainersDefeated",
    sourceFunc: gameData => gameData.gameStats.trainersDefeated.toString(),
  },
  eggsPulled: {
    label_key: "eggsPulled",
    sourceFunc: gameData => gameData.gameStats.eggsPulled.toString(),
    hidden: true
  },
  rareEggsPulled: {
    label_key: "rareEggsPulled",
    sourceFunc: gameData => gameData.gameStats.rareEggsPulled.toString(),
    hidden: true
  },
  epicEggsPulled: {
    label_key: "epicEggsPulled",
    sourceFunc: gameData => gameData.gameStats.epicEggsPulled.toString(),
    hidden: true
  },
  legendaryEggsPulled: {
    label_key: "legendaryEggsPulled",
    sourceFunc: gameData => gameData.gameStats.legendaryEggsPulled.toString(),
    hidden: true
  },
  manaphyEggsPulled: {
    label_key: "manaphyEggsPulled",
    sourceFunc: gameData => gameData.gameStats.manaphyEggsPulled.toString(),
    hidden: true
  },
  classicSessionsPlayed:{
    label_key: "classicRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.classicSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.classicSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  classicSessionsWon: {
    label_key: "classicWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.classicSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.classicSessionsWon.toString() : "???";
    },
    hidden: true
  },
  nuzlightSessionsPlayed: {
    label_key: "nuzlightRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nuzlightSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.nuzlightSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  nuzlightSessionsWon: {
    label_key: "nuzlightWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nuzlightSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.nuzlightSessionsWon.toString() : "???";
    },
    hidden: true
  },
  nuzlockeSessionsPlayed: {
    label_key: "nuzlockeRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nuzlockeSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.nuzlockeSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  nuzlockeSessionsWon: {
    label_key: "nuzlockeWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nuzlockeSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.nuzlockeSessionsWon.toString() : "???";
    },
    hidden: true
  },
  nightmareSessionsPlayed: {
    label_key: "theVoidRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nightmareSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.nightmareSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  nightmareSessionsWon: {
    label_key: "theVoidWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nightmareSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.nightmareSessionsWon.toString() : "???";
    },
    hidden: true
  },
  nuzlightDraftSessionsPlayed: {
    label_key: "nuzlightRogueRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nuzlightDraftSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.nuzlightDraftSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  nuzlightDraftSessionsWon: {
    label_key: "nuzlightRogueWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nuzlightDraftSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.nuzlightDraftSessionsWon.toString() : "???";
    },
    hidden: true
  },
  nuzlockeDraftSessionsPlayed: {
    label_key: "nuzlockeRogueRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nuzlockeDraftSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.nuzlockeDraftSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  nuzlockeDraftSessionsWon: {
    label_key: "nuzlockeRogueWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.nuzlockeDraftSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.nuzlockeDraftSessionsWon.toString() : "???";
    },
    hidden: true
  },
  chaosJourneySessionsPlayed: {
    label_key: "chaosJourneyRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosJourneySessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.chaosJourneySessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  chaosJourneySessionsWon: {
    label_key: "chaosJourneyWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosJourneySessionsWon > 0;
      return isUnlocked ? gameData.gameStats.chaosJourneySessionsWon.toString() : "???";
    },
    hidden: true
  },
  chaosRogueSessionsPlayed: {
    label_key: "chaosRogueRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosRogueSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.chaosRogueSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  chaosRogueSessionsWon: {
    label_key: "chaosRogueWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosRogueSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.chaosRogueSessionsWon.toString() : "???";
    },
    hidden: true
  },
  chaosVoidSessionsPlayed: {
    label_key: "chaosVoidRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosVoidSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.chaosVoidSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  chaosVoidSessionsWon: {
    label_key: "chaosVoidWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosVoidSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.chaosVoidSessionsWon.toString() : "???";
    },
    hidden: true
  },
  chaosRogueVoidSessionsPlayed: {
    label_key: "chaosVoidRogueRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosRogueVoidSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.chaosRogueVoidSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  chaosRogueVoidSessionsWon: {
    label_key: "chaosVoidRogueWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosRogueVoidSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.chaosRogueVoidSessionsWon.toString() : "???";
    },
    hidden: true
  },
  chaosInfiniteSessionsPlayed: {
    label_key: "chaosInfiniteRuns",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosInfiniteSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.chaosInfiniteSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  chaosInfiniteSessionsWon: {
    label_key: "chaosInfiniteWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosInfiniteSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.chaosInfiniteSessionsWon.toString() : "???";
    },
    hidden: true
  },
  chaosInfiniteRogueSessionsPlayed: {
    label_key: "chaosInfiniteRogueRuns",
    sourceFunc: gameData => {
        const isUnlocked = gameData.gameStats.chaosInfiniteRogueSessionsPlayed > 0;
      return isUnlocked ? gameData.gameStats.chaosInfiniteRogueSessionsPlayed.toString() : "???";
    },
    hidden: true
  },
  chaosInfiniteRogueSessionsWon: {
    label_key: "chaosInfiniteRogueWins",
    sourceFunc: gameData => {
      const isUnlocked = gameData.gameStats.chaosInfiniteRogueSessionsWon > 0;
      return isUnlocked ? gameData.gameStats.chaosInfiniteRogueSessionsWon.toString() : "???";
    },
    hidden: true
  },
  normalTypeDefeated: {
    label_key: "normalTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.NORMAL] || 0).toString(),
    hidden: true
  },
  fightingTypeDefeated: {
    label_key: "fightingTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.FIGHTING] || 0).toString(),
    hidden: true
  },
  flyingTypeDefeated: {
    label_key: "flyingTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.FLYING] || 0).toString(),
    hidden: true
  },
  poisonTypeDefeated: {
    label_key: "poisonTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.POISON] || 0).toString(),
    hidden: true
  },
  groundTypeDefeated: {
    label_key: "groundTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.GROUND] || 0).toString(),
    hidden: true
  },
  rockTypeDefeated: {
    label_key: "rockTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.ROCK] || 0).toString(),
    hidden: true
  },
  bugTypeDefeated: {
    label_key: "bugTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.BUG] || 0).toString(),
    hidden: true
  },
  ghostTypeDefeated: {
    label_key: "ghostTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.GHOST] || 0).toString(),
    hidden: true
  },
  steelTypeDefeated: {
    label_key: "steelTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.STEEL] || 0).toString(),
    hidden: true
  },
  fireTypeDefeated: {
    label_key: "fireTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.FIRE] || 0).toString(),
    hidden: true
  },
  waterTypeDefeated: {
    label_key: "waterTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.WATER] || 0).toString(),
    hidden: true
  },
  grassTypeDefeated: {
    label_key: "grassTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.GRASS] || 0).toString(),
    hidden: true
  },
  electricTypeDefeated: {
    label_key: "electricTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.ELECTRIC] || 0).toString(),
    hidden: true
  },
  psychicTypeDefeated: {
    label_key: "psychicTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.PSYCHIC] || 0).toString(),
    hidden: true
  },
  iceTypeDefeated: {
    label_key: "iceTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.ICE] || 0).toString(),
    hidden: true
  },
  dragonTypeDefeated: {
    label_key: "dragonTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.DRAGON] || 0).toString(),
    hidden: true
  },
  darkTypeDefeated: {
    label_key: "darkTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.DARK] || 0).toString(),
    hidden: true
  },
  fairyTypeDefeated: {
    label_key: "fairyTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.FAIRY] || 0).toString(),
    hidden: true
  },
  stellarTypeDefeated: {
    label_key: "stellarTypeDefeated",
    sourceFunc: gameData => (gameData.gameStats.typeOfDefeated[Type.STELLAR] || 0).toString(),
    hidden: true
  },
  normalMovesUsed: {
    label_key: "normalMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.NORMAL] || 0).toString(),
    hidden: true
  },
  fightingMovesUsed: {
    label_key: "fightingMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.FIGHTING] || 0).toString(),
    hidden: true
  },
  flyingMovesUsed: {
    label_key: "flyingMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.FLYING] || 0).toString(),
    hidden: true
  },
  poisonMovesUsed: {
    label_key: "poisonMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.POISON] || 0).toString(),
    hidden: true
  },
  groundMovesUsed: {
    label_key: "groundMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.GROUND] || 0).toString(),
    hidden: true
  },
  rockMovesUsed: {
    label_key: "rockMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.ROCK] || 0).toString(),
    hidden: true
  },
  bugMovesUsed: {
    label_key: "bugMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.BUG] || 0).toString(),
    hidden: true
  },
  ghostMovesUsed: {
    label_key: "ghostMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.GHOST] || 0).toString(),
    hidden: true
  },
  steelMovesUsed: {
    label_key: "steelMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.STEEL] || 0).toString(),
    hidden: true
  },
  fireMovesUsed: {
    label_key: "fireMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.FIRE] || 0).toString(),
    hidden: true
  },
  waterMovesUsed: {
    label_key: "waterMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.WATER] || 0).toString(),
    hidden: true
  },
  grassMovesUsed: {
    label_key: "grassMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.GRASS] || 0).toString(),
    hidden: true
  },
  electricMovesUsed: {
    label_key: "electricMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.ELECTRIC] || 0).toString(),
    hidden: true
  },
  psychicMovesUsed: {
    label_key: "psychicMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.PSYCHIC] || 0).toString(),
    hidden: true
  },
  iceMovesUsed: {
    label_key: "iceMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.ICE] || 0).toString(),
    hidden: true
  },
  dragonMovesUsed: {
    label_key: "dragonMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.DRAGON] || 0).toString(),
    hidden: true
  },
  darkMovesUsed: {
    label_key: "darkMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.DARK] || 0).toString(),
    hidden: true
  },
  fairyMovesUsed: {
    label_key: "fairyMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.FAIRY] || 0).toString(),
    hidden: true
  },
  stellarMovesUsed: {
    label_key: "stellarMovesUsed",
    sourceFunc: gameData => (gameData.gameStats.typeOfMovesUsed[Type.STELLAR] || 0).toString(),
    hidden: true
  },
  normalKnockouts: {
    label_key: "normalKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.NORMAL] || 0).toString(),
    hidden: true
  },
  fightingKnockouts: {
    label_key: "fightingKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.FIGHTING] || 0).toString(),
    hidden: true
  },
  flyingKnockouts: {
    label_key: "flyingKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.FLYING] || 0).toString(),
    hidden: true
  },
  poisonKnockouts: {
    label_key: "poisonKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.POISON] || 0).toString(),
    hidden: true
  },
  groundKnockouts: {
    label_key: "groundKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.GROUND] || 0).toString(),
    hidden: true
  },
  rockKnockouts: {
    label_key: "rockKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.ROCK] || 0).toString(),
    hidden: true
  },
  bugKnockouts: {
    label_key: "bugKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.BUG] || 0).toString(),
    hidden: true
  },
  ghostKnockouts: {
    label_key: "ghostKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.GHOST] || 0).toString(),
    hidden: true
  },
  steelKnockouts: {
    label_key: "steelKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.STEEL] || 0).toString(),
    hidden: true
  },
  fireKnockouts: {
    label_key: "fireKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.FIRE] || 0).toString(),
    hidden: true
  },
  waterKnockouts: {
    label_key: "waterKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.WATER] || 0).toString(),
    hidden: true
  },
  grassKnockouts: {
    label_key: "grassKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.GRASS] || 0).toString(),
    hidden: true
  },
  electricKnockouts: {
    label_key: "electricKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.ELECTRIC] || 0).toString(),
    hidden: true
  },
  psychicKnockouts: {
    label_key: "psychicKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.PSYCHIC] || 0).toString(),
    hidden: true
  },
  iceKnockouts: {
    label_key: "iceKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.ICE] || 0).toString(),
    hidden: true
  },
  dragonKnockouts: {
    label_key: "dragonKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.DRAGON] || 0).toString(),
    hidden: true
  },
  darkKnockouts: {
    label_key: "darkKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.DARK] || 0).toString(),
    hidden: true
  },
  fairyKnockouts: {
    label_key: "fairyKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.FAIRY] || 0).toString(),
    hidden: true
  },
  stellarKnockouts: {
    label_key: "stellarKnockouts",
    sourceFunc: gameData => (gameData.gameStats.playerKnockoutType[Type.STELLAR] || 0).toString(),
    hidden: true
  }
  
};

function getCompleteDisplayStats(gameData: GameData): DisplayStats {
  const modifierStats = generateModifierStats(gameData);
  const allStats = {
    ...displayStats,
    ...modifierStats
  };
  
  const sortedEntries = Object.entries(allStats).sort(([keyA, statA], [keyB, statB]) => {
    const valueA = typeof statA === 'string' ? statA : (statA as DisplayStat).sourceFunc!(gameData);
    const valueB = typeof statB === 'string' ? statB : (statB as DisplayStat).sourceFunc!(gameData);
    
    const getIsLabelLocked = (key: string, stat: DisplayStat | string, value: string) => {
      if (typeof stat === 'string') return false;
      
      const isLocked = value === "???";
      const isSmittysDefeated = key === "smittysDefeated" && (value === "???" || parseInt(value) < 1);
      
      return isLocked || (stat.hidden && (!isNaN(parseInt(value)) && !parseInt(value))) || isSmittysDefeated;
    };
    
    const isLabelLockedA = getIsLabelLocked(keyA, statA, valueA);
    const isLabelLockedB = getIsLabelLocked(keyB, statB, valueB);
    
    if (isLabelLockedA && !isLabelLockedB) return 1;
    if (!isLabelLockedA && isLabelLockedB) return -1;
    
    return 0;
  });
  
  return Object.fromEntries(sortedEntries);
}

export default class GameStatsUiHandler extends UiHandler {
  private gameStatsContainer: Phaser.GameObjects.Container;
  private statsContainer: Phaser.GameObjects.Container;

  private statLabels: Phaser.GameObjects.Text[];
  private statValues: Phaser.GameObjects.Text[];

  private arrowUp: Phaser.GameObjects.Sprite;
  private arrowDown: Phaser.GameObjects.Sprite;

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);

    this.statLabels = [];
    this.statValues = [];
  }

  setup() {
    const ui = this.getUi();

    this.gameStatsContainer = this.scene.add.container(1, -(this.scene.game.canvas.height / 6) + 1);

    this.gameStatsContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);

    const headerBg = addWindow(this.scene, 0, 0, (this.scene.game.canvas.width / 6) - 2, 24);
    headerBg.setOrigin(0, 0);

    const headerText = addTextObject(this.scene, 0, 0, i18next.t("gameStatsUiHandler:stats"), TextStyle.SETTINGS_LABEL);
    headerText.setOrigin(0, 0);
    headerText.setPositionRelative(headerBg, 8, 4);

    const statsBgWidth = ((this.scene.game.canvas.width / 6) - 2) / 2;
    const [ statsBgLeft, statsBgRight ] = new Array(2).fill(null).map((_, i) => {
      const width = statsBgWidth + 2;
      const height = Math.floor((this.scene.game.canvas.height / 6) - headerBg.height - 2);
      const statsBg = addWindow(this.scene, (statsBgWidth - 2) * i, headerBg.height, width, height, false, false, i>0?-3:0, 1);
      statsBg.setOrigin(0, 0);
      return statsBg;
    });

    this.statsContainer = this.scene.add.container(0, 0);


    new Array(18).fill(null).map((_, s) => {

      const statLabel = addTextObject(this.scene, 8 + (s % 2 === 1 ? statsBgWidth : 0), 28 + Math.floor(s / 2) * 16, "", TextStyle.STATS_LABEL);
      statLabel.setOrigin(0, 0);
      this.statsContainer.add(statLabel);
      this.statLabels.push(statLabel);

      const statValue = addTextObject(this.scene, (statsBgWidth * ((s % 2) + 1)) - 8, statLabel.y, "", TextStyle.STATS_VALUE);
      statValue.setOrigin(1, 0);
      this.statsContainer.add(statValue);
      this.statValues.push(statValue);
    });

    this.gameStatsContainer.add(headerBg);
    this.gameStatsContainer.add(headerText);
    this.gameStatsContainer.add(statsBgLeft);
    this.gameStatsContainer.add(statsBgRight);
    this.gameStatsContainer.add(this.statsContainer);

    const isLegacyTheme = this.scene.uiTheme === UiTheme.LEGACY;
    this.arrowDown = this.scene.add.sprite(statsBgWidth, this.scene.game.canvas.height / 6 - (isLegacyTheme? 9 : 5), "prompt");
    this.gameStatsContainer.add(this.arrowDown);
    this.arrowUp = this.scene.add.sprite(statsBgWidth, headerBg.height + (isLegacyTheme? 7 : 3), "prompt");
    this.arrowUp.flipY = true;
    this.gameStatsContainer.add(this.arrowUp);

    ui.add(this.gameStatsContainer);

    this.setCursor(0);

    this.gameStatsContainer.setVisible(false);
  }

  show(args: any[]): boolean {
    super.show(args);

    this.setCursor(0);

    this.updateStats();

    this.arrowUp.play("prompt");
    this.arrowDown.play("prompt");
    if (this.scene.uiTheme === UiTheme.LEGACY) {
      this.arrowUp.setTint(0x484848);
      this.arrowDown.setTint(0x484848);
    }

    this.updateArrows();

    this.gameStatsContainer.setVisible(true);

    this.getUi().moveTo(this.gameStatsContainer, this.getUi().length - 1);

    this.getUi().hideTooltip();

    return true;
  }

  updateStats(): void {
    const completeStats = getCompleteDisplayStats(this.scene.gameData);
    const statKeys = Object.keys(completeStats).slice(this.cursor * 2, this.cursor * 2 + 18);
    statKeys.forEach((key, s) => {
      const stat = completeStats[key] as DisplayStat;
      const value = stat.sourceFunc!(this.scene.gameData);
      const isLocked = value === "???";
      const isSmittysDefeated = key === "smittysDefeated" && (value === "???" || parseInt(value) < 1);
      
      let labelText = "???";
      if (!isLocked && (!stat.hidden || isNaN(parseInt(value)) || parseInt(value)) && !isSmittysDefeated) {
        if (stat.label_key) {
          labelText = i18next.t(`gameStatsUiHandler:${stat.label_key}`);
        } else if (stat.labelFunc) {
          labelText = stat.labelFunc();
        } else {
          labelText = key;
        }
      }
      
      this.statLabels[s].setText(labelText);
      this.statValues[s].setText(value);
    });
    if (statKeys.length < 18) {
      for (let s = statKeys.length; s < 18; s++) {
        this.statLabels[s].setText("");
        this.statValues[s].setText("");
      }
    }
  }

  updateArrows(): void {
    const completeStats = getCompleteDisplayStats(this.scene.gameData);
    const showUpArrow = this.cursor > 0;
    this.arrowUp.setVisible(showUpArrow);

    const showDownArrow = this.cursor < Math.ceil((Object.keys(completeStats).length - 18) / 2);
    this.arrowDown.setVisible(showDownArrow);
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;

    if (button === Button.CANCEL) {
      success = true;
      this.scene.ui.revertMode();
    } else {
      const completeStats = getCompleteDisplayStats(this.scene.gameData);
      switch (button) {
        case Button.UP:
          if (this.cursor) {
            success = this.setCursor(this.cursor - 1);
          }
          break;
        case Button.DOWN:
          if (this.cursor < Math.ceil((Object.keys(completeStats).length - 18) / 2)) {
            success = this.setCursor(this.cursor + 1);
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    }

    return success;
  }

  setCursor(cursor: integer): boolean {
    const ret = super.setCursor(cursor);

    if (ret) {
      this.updateStats();
      this.updateArrows();
    }

    return ret;
  }

  clear() {
    super.clear();
    this.gameStatsContainer.setVisible(false);
  }
}

export function initStatsKeys() {
  const statKeys = Object.keys(displayStats);

  for (const key of statKeys) {
    if (typeof displayStats[key] === "string") {
      let label = displayStats[key] as string;
      let hidden = false;
      if (label.endsWith("?")) {
        label = label.slice(0, -1);
        hidden = true;
      }
      displayStats[key] = {
        label_key: label,
        sourceFunc: gameData => gameData.gameStats[key].toString(),
        hidden: hidden
      };
    } else if (displayStats[key] === null) {
      displayStats[key] = {
        sourceFunc: gameData => gameData.gameStats[key].toString()
      };
    }
    if (!(displayStats[key] as DisplayStat).label_key) {
      const splittableKey = key.replace(/([a-z]{2,})([A-Z]{1}(?:[^A-Z]|$))/g, "$1_$2");
      (displayStats[key] as DisplayStat).label_key = Utils.toReadableString(`${splittableKey[0].toUpperCase()}${splittableKey.slice(1)}`);
    }
  }
}
