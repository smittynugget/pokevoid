import BattleScene from "#app/battle-scene.js";
import { applyChallenges, ChallengeType } from "#app/data/challenge.js";
import { Gender } from "#app/data/gender.js";
import { SpeciesFormChangeMoveLearnedTrigger } from "#app/data/pokemon-forms.js";
import { getPokemonSpecies } from "#app/data/pokemon-species.js";
import { Species } from "#app/enums/species.js";
import { PlayerPokemon } from "#app/field/pokemon.js";
import { overrideModifiers, overrideHeldItems, applySignatureTypeSwitcher } from "#app/modifier/modifier.js";
import { Phase } from "#app/phase.js";
import { SaveSlotUiMode } from "#app/ui/save-slot-select-ui-handler.js";
import { Starter } from "#app/ui/starter-select-ui-handler.js";
import { Mode } from "#app/ui/ui.js";
import SoundFade from "phaser3-rex-plugins/plugins/soundfade";
import { TitlePhase } from "./title-phase";
import Overrides from "#app/overrides";
import { Species as SpeciesEnum } from "#enums/species";
import { SkillTreeUtils } from "#app/system/skill-tree-utils";
import { PokemonAltBuildId, POKEMON_ALT_BUILDS } from "#app/data/pokemon-alt-buid";
import { PokemonAltBuildModifierType, modifierTypes } from "#app/modifier/modifier-type";
import * as Modifiers from "#app/modifier/modifier";
import { ChampionUtils } from "#app/system/champion-utils";
import { DEBUG_FORCE_SMITOM_TUTORIAL } from "#app/overrides.js";
import { SmitomTipConfig } from "#app/ui/smitom-tip-ui-handler.js";
import i18next from "i18next";

export interface StarterSelectConfig {
  availableStarters?: SpeciesEnum[];
  championData?: any;
  onStarterSelected?: (starters: Starter | Starter[]) => void;
  onCancel?: () => void;
}

export class SelectStarterPhase extends Phase {
  private config?: StarterSelectConfig;
  private static smitomStarterDebugShown = false;

  constructor(scene: BattleScene, config?: StarterSelectConfig) {
    super(scene);
    this.config = config;
  }

  private triggerSmitomTipIfNeeded(): void {
    const flags = this.scene.gameData.smitomTutorialFlags;
    if (DEBUG_FORCE_SMITOM_TUTORIAL && !SelectStarterPhase.smitomStarterDebugShown) {
      SelectStarterPhase.smitomStarterDebugShown = true;
      flags["starter_select_welcome"] = false;
    }
    if (!flags["starter_select_welcome"]) {
      this.scene.time.delayedCall(400, () => {
        const tipConfig: SmitomTipConfig = {
          tutorialKey: "starter_select_welcome",
          title: i18next.t("tutorial:smitomTip.starterSelect.title"),
          texts: [
            i18next.t("tutorial:smitomTip.starterSelect.1"),
            i18next.t("tutorial:smitomTip.starterSelect.2"),
            i18next.t("tutorial:smitomTip.starterSelect.3"),
          ],
          offerReplay: true,
          onComplete: () => {
            this.scene.gameData.smitomTutorialFlags["starter_select_welcome"] = true;
            this.scene.gameData.saveSystem();
          }
        };
        this.scene.ui.setOverlayMode(Mode.SMITOM_TIP, tipConfig);
      });
    }
  }

  start() {
    super.start();

    this.scene.moveUpgradesEnabledForRun = !this.scene.disableMoveUpgrades;
    this.scene.statSwitchersEnabledForRun = !this.scene.disableStatSwitchers;
    this.scene.releaseItemsEnabledForRun = !this.scene.disableReleaseItems;
    this.scene.ivScannerEnabledForRun = !this.scene.disableIvScanner;
    this.scene.mapEnabledForRun = !this.scene.disableMap;
    this.scene.duelmonsEnabledForRun = !this.scene.disableDuelmons;
    this.scene.wave35UnlockedThisRun = false;

    if (this.config && (this.config.availableStarters?.length || this.config.onStarterSelected)) {
      if (this.config.availableStarters?.length && !this.config.onStarterSelected) {
        this.scene.ui.setMode(Mode.STARTER_SELECT,
          (starters: Starter[]) => this.handleLegacySaveAndStart(starters),
          { availableStarters: this.config.availableStarters, championData: this.config.championData }
        );
        this.preGenerateSkillTreeNodes();
        this.triggerSmitomTipIfNeeded();
        return;
      }
      this.scene.ui.setMode(Mode.STARTER_SELECT,
        (starters: Starter[]) => {
          if (starters.length > 0 && this.config?.onStarterSelected) {
            this.scene.clearPhaseQueue();
            this.config.onStarterSelected(starters);
            return;
          }
          this.end();
        },
        {
          availableStarters: this.config.availableStarters,
          championData: this.config.championData
        }
      );
      this.preGenerateSkillTreeNodes();
      this.triggerSmitomTipIfNeeded();
      return;
    }

    this.scene.ui.setMode(Mode.STARTER_SELECT, (starters: Starter[]) => {
      this.handleLegacySaveAndStart(starters);
    });
    this.preGenerateSkillTreeNodes();
    this.triggerSmitomTipIfNeeded();
  }

  private handleLegacySaveAndStart(starters: Starter[]) {
    this.scene.ui.clearText();
    this.scene.ui.setMode(Mode.SAVE_SLOT, SaveSlotUiMode.SAVE, (slotId: integer) => {
      if (slotId === -1) {
        this.scene.clearPhaseQueue();
        this.scene.pushPhase(new TitlePhase(this.scene, false, true));
        return this.end();
      }
      this.scene.sessionSlotId = slotId;
      this.initBattle(starters);
    });
  }
  private preGenerateSkillTreeNodes(): void {
    try {
      const activeSkillTree = this.scene.gameData.activeSkillTree;
      if (!activeSkillTree) {
        return;
      }

      const championId = activeSkillTree.championId || "apollo_diana";
      const championData = (this.scene.gameData as any).championData?.[championId];
      if (!championData) {
        return;
      }

      const nodes = SkillTreeUtils.generateDepth1Nodes(activeSkillTree, championData, this.scene);

      (this.scene.gameData as any).tempSkillTreeNodes = nodes;
    } catch (e) {
    }
  }
  initBattle(starters: Starter[]) {
    const party = this.scene.getParty();
    const loadPokemonAssets: Promise<void>[] = [];
    starters.forEach((starter: Starter, i: integer) => {
      if (!i && Overrides.STARTER_SPECIES_OVERRIDE) {
        starter.species = getPokemonSpecies(Overrides.STARTER_SPECIES_OVERRIDE as Species);
      }
      const starterProps = this.scene.gameData.getSpeciesDexAttrProps(starter.species, starter.dexAttr);
      let starterFormIndex = Math.min(starterProps.formIndex, Math.max(starter.species.forms.length - 1, 0));
      if (
        starter.species.speciesId in Overrides.STARTER_FORM_OVERRIDES &&
        starter.species.forms[Overrides.STARTER_FORM_OVERRIDES[starter.species.speciesId]!]
      ) {
        starterFormIndex = Overrides.STARTER_FORM_OVERRIDES[starter.species.speciesId]!;
      }

      let starterGender = starter.species.malePercent !== null
        ? !starterProps.female ? Gender.MALE : Gender.FEMALE
        : Gender.GENDERLESS;
      if (Overrides.GENDER_OVERRIDE !== null) {
        starterGender = Overrides.GENDER_OVERRIDE;
      }
      const starterIvs = this.scene.gameData.dexData[starter.species.speciesId].ivs.slice(0);
      const starterPokemon = this.scene.addPlayerPokemon(starter.species, this.scene.gameMode.getStartingLevel(), starter.abilityIndex, starterFormIndex, starterGender, starterProps.shiny, starterProps.variant, starterIvs, starter.nature);
      starter.moveset && starterPokemon.tryPopulateMoveset(starter.moveset);
      if (starter.passive) {
        starterPokemon.passive = true;
      }
      starterPokemon.luck = this.scene.gameData.getDexAttrLuck(this.scene.gameData.dexData[starter.species.speciesId].caughtAttr);
      if (starter.pokerus) {
        starterPokemon.pokerus = true;
      }

      if (starter.nickname) {
        starterPokemon.nickname = starter.nickname;
      }

      const championId = this.scene.gameData.selectedChampionId;
      let selectedIsSignature = false;
      let altBuildId: PokemonAltBuildId | null = null;

      if (championId) {
        const championData = (this.scene.gameData as any).championData?.[championId];
        if (championData) {

          ChampionUtils.syncChampionUnlocks(championData);

          const inBaseList = championData.signaturePokemon?.includes(starter.species.speciesId) || false;

          const unlockedSignatures = (championData as any).unlockedSignaturePokemon as Species[] | undefined;
          const inUnlockedList = unlockedSignatures?.includes(starter.species.speciesId) || false;

          selectedIsSignature = (inBaseList || inUnlockedList) && starter.isSignature !== false;

          if (selectedIsSignature) {
            altBuildId = ChampionUtils.getSignatureAltBuildId(starter.species.speciesId, championData);
          }
        }
      }

      if (selectedIsSignature) {
        starterPokemon.isSignature = true;
      }

      if (!selectedIsSignature) {
          if (Overrides.STARTER_FUSION_SPECIES_OVERRIDE) {
            starterPokemon.generateFusionViaSpeciesID(Overrides.STARTER_FUSION_SPECIES_OVERRIDE as Species, true);
          } else if(starter.fusionIndex > -1) {
            starterPokemon.generateFusionViaSpeciesID(this.scene.gameData.starterData[starter.species.speciesId].obtainedFusions[starter.fusionIndex]);
          } else if (this.scene.gameMode.isSplicedOnly) {
            starterPokemon.generateFusionSpecies(true);
          }
      }

          starterPokemon.tryPopulateMoveset(starter.moveset);
      starterPokemon.setVisible(false);
      applyChallenges(this.scene.gameMode, ChallengeType.STARTER_MODIFY, starterPokemon);
      party.push(starterPokemon);
      applySignatureTypeSwitcher(this.scene, starterPokemon);
      if (starterPokemon.isSignature && altBuildId) {
        const def = POKEMON_ALT_BUILDS[altBuildId];
        if (def) {
          const rank = starterPokemon.altBuildRank ?? def.rank ?? 1;
          const modType = new PokemonAltBuildModifierType(def, rank);
          modType.withIdFromFunc(modifierTypes.POKEMON_ALT_BUILD);
          const altBuildMod = modType.newModifier(starterPokemon) as Modifiers.PokemonAltBuildModifier;
          altBuildMod.applyAltBuildToPokemon(starterPokemon);
          this.scene.addModifier(altBuildMod, true);
        } else {
          console.warn(`[SelectStarterPhase] initBattle: Alt build ${altBuildId} not found in POKEMON_ALT_BUILDS`);
        }
      }
      loadPokemonAssets.push(starterPokemon.loadAssets());
    });
    overrideModifiers(this.scene);
    overrideHeldItems(this.scene, party[0]);
    Promise.all(loadPokemonAssets).then(() => {
      SoundFade.fadeOut(this.scene, this.scene.sound.get("menu"), 500, true);
      this.scene.time.delayedCall(500, () => this.scene.playBgm());
      if (this.scene.gameMode.isClassic) {
        this.scene.gameData.gameStats.classicSessionsPlayed++;
      } else {
        this.scene.gameData.gameStats.endlessSessionsPlayed++;
      }
      this.scene.newBattle();
      this.scene.arena.init();
      this.scene.sessionPlayTime = 0;
      this.scene.lastSavePlayTime = 0;
      this.scene.resetRunEndSummaryRunData();

      this.scene.getParty().forEach((p: PlayerPokemon) => {
        this.scene.triggerPokemonFormChange(p, SpeciesFormChangeMoveLearnedTrigger);
      });
      this.end();
    });
  }
}