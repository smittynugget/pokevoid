import BattleScene from "../battle-scene";
import { GameModes } from "../game-mode";
import UiHandler from "./ui-handler";
import { SessionSaveData } from "../system/game-data";
import { TextStyle, addTextObject, addBBCodeTextObject, getTextColor } from "./text";
import { Mode } from "./ui";
import { addWindow } from "./ui-theme";
import * as Utils from "../utils";
import PokemonData from "../system/pokemon-data";
import i18next from "i18next";
import {Button} from "../enums/buttons";
import { BattleType } from "../battle";
import { TrainerVariant } from "../field/trainer";
import { Challenges } from "#enums/challenges";
import RoundRectangle from "phaser3-rex-plugins/plugins/roundrectangle.js";
import { Type, getTypeRgb } from "../data/type";
import { getNatureStatMultiplier, getNatureName } from "../data/nature";
import { getVariantTint } from "#app/data/variant";
import { PokemonHeldItemModifier, TerastallizeModifier } from "../modifier/modifier";
import {modifierSortFunc} from "../modifier/modifier";
import { Species } from "#enums/species";
import { PlayerGender } from "#enums/player-gender";
import { PlayerPokemon } from "../field/pokemon";
import Pokemon from "#app/field/pokemon.js";
import { GameOverPhase } from "#app/phases/game-over-phase.js";
enum RunInfoUiMode {
  MAIN,
  HALL_OF_FAME,
}
export default class RunInfoUiHandler extends UiHandler {
  protected runInfo: SessionSaveData;
  protected isVictory: boolean;
  protected pageMode: RunInfoUiMode;
  protected runContainer: Phaser.GameObjects.Container;
  protected isActiveRun: boolean;
  protected isFinalBattleContext: boolean;

  private runResultContainer: Phaser.GameObjects.Container;
  private runInfoContainer: Phaser.GameObjects.Container;
  private partyContainer: Phaser.GameObjects.Container;
  private partyHeldItemsContainer: Phaser.GameObjects.Container;
  private statsBgWidth: integer;
  private partyContainerHeight: integer;
  private partyContainerWidth: integer;

  private hallofFameContainer: Phaser.GameObjects.Container;
  private endCardContainer: Phaser.GameObjects.Container;

  private partyInfo: Phaser.GameObjects.Container[];
  private partyVisibility: Boolean;
  private modifiersModule: any;

  constructor(scene: BattleScene) {
    super(scene, Mode.RUN_INFO);
  }

  override async setup() {
 		this.runContainer = this.scene.add.container(1, -(this.scene.game.canvas.height / 6) + 1);

    this.modifiersModule = await import("../modifier/modifier");
    this.runContainer.setVisible(false);
 	}
 	override show(args: any[]): boolean {
 		super.show(args);

    const gameStatsBg = this.scene.add.nineslice(0, 0, "default_bg", undefined, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6, 0, 0, 16, 0);
    gameStatsBg.setOrigin(0, 0);
    try {
        if (gameStatsBg.postFX && typeof gameStatsBg.postFX.addColorMatrix === 'function') {
            const colorMatrix = gameStatsBg.postFX.addColorMatrix();
            colorMatrix.negative();
        } else {
            gameStatsBg.setTint(0xFFFFFF);
            gameStatsBg.setBlendMode(Phaser.BlendModes.DIFFERENCE);
        }
    } catch (error) {
        gameStatsBg.setTint(0x000000);
        gameStatsBg.setBlendMode(Phaser.BlendModes.SCREEN);
    }
    this.runContainer.add(gameStatsBg);

    const run = args[0];
    this.runInfo = this.scene.gameData.parseSessionData(JSON.stringify(run.entry));
    this.isVictory = run.isVictory;
    this.isActiveRun = 'isActive' in run && run.isActive === true;
    this.isFinalBattleContext = 'isFinalBattleContext' in run && run.isFinalBattleContext === true;
    this.pageMode = RunInfoUiMode.MAIN;
    this.addHeader();

    this.statsBgWidth = ((this.scene.game.canvas.width / 6) - 2) / 3;
    this.runResultContainer = this.scene.add.container(0, 24);
    const runResultWindow = addWindow(this.scene, 0, 0, this.statsBgWidth-11, 65);
    runResultWindow.setOrigin(0, 0);
    this.runResultContainer.add(runResultWindow);
    this.parseRunResult();
    this.runInfoContainer = this.scene.add.container(0, 89);
    const runInfoWindow = addWindow(this.scene, 0, 0, this.statsBgWidth-11, 90);
    const runInfoWindowCoords = runInfoWindow.getBottomRight();
    this.runInfoContainer.add(runInfoWindow);
 		this.parseRunInfo(runInfoWindowCoords.x, runInfoWindowCoords.y);
    this.partyContainer = this.scene.add.container(this.statsBgWidth-10, 23);
    this.parsePartyInfo();
    this.showParty(true);

    this.runContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);
    this.getUi().bringToTop(this.runContainer);
    this.runContainer.setVisible(true);
    if (this.isVictory && !this.isActiveRun) {
      this.createHallofFame();
      this.getUi().bringToTop(this.hallofFameContainer);
    }

    this.setCursor(0);

    this.getUi().add(this.runContainer);

    this.getUi().hideTooltip();

    return true;
 	}
  private addHeader() {
    const headerBg = addWindow(this.scene, 0, 0, (this.scene.game.canvas.width / 6) - 2, 24);
    headerBg.setOrigin(0, 0);
    this.runContainer.add(headerBg);
    if (this.runInfo.modifiers.length !== 0) {
      const headerBgCoords = headerBg.getTopRight();
      const abilityButtonContainer = this.scene.add.container(0, 0);
      const abilityButtonText = addTextObject(this.scene, 8, 0, i18next.t("runHistory:viewHeldItems"), TextStyle.WINDOW, {fontSize:"34px"});
      const abilityButtonElement = new Phaser.GameObjects.Sprite(this.scene, 0, 2, "keyboard", "E.png");
      abilityButtonContainer.add([abilityButtonText, abilityButtonElement]);
      abilityButtonContainer.setPosition(headerBgCoords.x - abilityButtonText.displayWidth - abilityButtonElement.displayWidth - 8, 10);
      this.runContainer.add(abilityButtonContainer);
    }
    const headerText = addTextObject(this.scene, 0, 0, i18next.t("runHistory:runInfo"), TextStyle.SETTINGS_LABEL);
    headerText.setOrigin(0, 0);
    headerText.setPositionRelative(headerBg, 8, 4);
    this.runContainer.add(headerText);
  }
  private async parseRunResult() {
    const genderIndex = this.scene.gameData.gender ?? PlayerGender.UNSET;
    const genderStr = PlayerGender[genderIndex];

    if (this.isActiveRun) {

      const runResultText = addBBCodeTextObject(this.scene, 6, 5, `${i18next.t("runHistory:inProgress", { defaultValue: "In Progress" })} - ${i18next.t("saveSlotSelectUiHandler:wave")} ${this.runInfo.waveIndex}`, TextStyle.SUMMARY, {fontSize : "65px", lineSpacing: 0.1});
      this.runResultContainer.add(runResultText);
      return;
    }
    const runResultTextStyle = this.isVictory ? TextStyle.SUMMARY : TextStyle.SUMMARY_RED;
    const runResultTitle = this.isVictory ? i18next.t("runHistory:victory") : i18next.t("runHistory:defeated", { context: genderStr });
    const runResultText = addBBCodeTextObject(this.scene, 6, 5, `${runResultTitle} - ${i18next.t("saveSlotSelectUiHandler:wave")} ${this.runInfo.waveIndex}`, runResultTextStyle, {fontSize : "65px", lineSpacing: 0.1});

    if (this.isVictory) {
      const hallofFameInstructionContainer = this.scene.add.container(0, 0);
      const shinyButtonText = addTextObject(this.scene, 8, 0, i18next.t("runHistory:viewHallOfFame"), TextStyle.WINDOW, {fontSize:"65px"});
      const shinyButtonElement = new Phaser.GameObjects.Sprite(this.scene, 0, 4, "keyboard", "R.png");
      hallofFameInstructionContainer.add([shinyButtonText, shinyButtonElement]);

      hallofFameInstructionContainer.setPosition(12, 25);
      this.runResultContainer.add(hallofFameInstructionContainer);
    }

    this.runResultContainer.add(runResultText);

    if (!this.isVictory) {
      const enemyContainer = this.scene.add.container(0, 0);

      if (this.runInfo.battleType === BattleType.WILD) {
        switch (this.runInfo.enemyParty.length) {
        case 1:

          this.parseWildSingleDefeat(enemyContainer);
          break;
        case 2:

          this.parseWildDoubleDefeat(enemyContainer);
          break;
        }
      } else if (this.runInfo.battleType === BattleType.TRAINER) {
        this.parseTrainerDefeat(enemyContainer);
      }
      this.runResultContainer.add(enemyContainer);
    }
    this.runContainer.add(this.runResultContainer);
  }
  private parseWildSingleDefeat(enemyContainer: Phaser.GameObjects.Container) {
    const enemyIconContainer = this.scene.add.container(0, 0);
    const enemyData = this.runInfo.enemyParty[0];
    const bossStatus = enemyData.boss;
    enemyData.boss = false;
    enemyData["player"] = true;

    const enemy = enemyData.toPokemon(this.scene);
    const enemyIcon = this.scene.addPokemonIcon(enemy, 0, 0, 0, 0);
    const enemyLevelStyle = bossStatus ? TextStyle.PARTY_RED : TextStyle.PARTY;
    const enemyLevel = addTextObject(this.scene, 36, 26, `${i18next.t("saveSlotSelectUiHandler:lv")}${Utils.formatLargeNumber(enemy.level, 1000)}`, enemyLevelStyle, { fontSize: "44px", color: "#f8f8f8" });
    enemyLevel.setShadow(0, 0, undefined);
    enemyLevel.setStroke("#424242", 14);
    enemyLevel.setOrigin(1, 0);
    enemyIconContainer.add(enemyIcon);
    enemyIconContainer.add(enemyLevel);
    enemyContainer.add(enemyIconContainer);
    enemyContainer.setPosition(27, 12);
    enemy.destroy();
  }
  private parseWildDoubleDefeat(enemyContainer: Phaser.GameObjects.Container) {
    this.runInfo.enemyParty.forEach((enemyData, e) => {
      const enemyIconContainer = this.scene.add.container(0, 0);
      const bossStatus = enemyData.boss;
      enemyData.boss = false;
      enemyData["player"] = true;
      const enemy = enemyData.toPokemon(this.scene);
      const enemyIcon = this.scene.addPokemonIcon(enemy, 0, 0, 0, 0);
      const enemyLevel = addTextObject(this.scene, 36, 26, `${i18next.t("saveSlotSelectUiHandler:lv")}${Utils.formatLargeNumber(enemy.level, 1000)}`, bossStatus ? TextStyle.PARTY_RED : TextStyle.PARTY, { fontSize: "44px", color: "#f8f8f8" });
      enemyLevel.setShadow(0, 0, undefined);
      enemyLevel.setStroke("#424242", 14);
      enemyLevel.setOrigin(1, 0);
      enemyIconContainer.add(enemyIcon);
      enemyIconContainer.add(enemyLevel);
      enemyIconContainer.setPosition(e*35, 0);
      enemyContainer.add(enemyIconContainer);
      enemy.destroy();
    });
    enemyContainer.setPosition(8, 14);
  }
  private parseTrainerDefeat(enemyContainer: Phaser.GameObjects.Container) {

    const tObj = this.runInfo.trainer.toTrainer(this.scene);
    const tObjSpriteKey = tObj.config.getSpriteKey(this.runInfo.trainer.variant === TrainerVariant.FEMALE, false);
    const tObjSprite = this.scene.add.sprite(0, 5, tObjSpriteKey);
    if (this.runInfo.trainer.variant === TrainerVariant.DOUBLE) {
      const doubleContainer = this.scene.add.container(5, 8);
      tObjSprite.setPosition(-3, -3);
      const tObjPartnerSpriteKey = tObj.config.getSpriteKey(true, true);
      const tObjPartnerSprite = this.scene.add.sprite(5, -3, tObjPartnerSpriteKey);

      tObjPartnerSprite.setScale(0.20);
      tObjSprite.setScale(0.20);
      doubleContainer.add(tObjSprite);
      doubleContainer.add(tObjPartnerSprite);
      doubleContainer.setPosition(12, 38);
      enemyContainer.add(doubleContainer);
    } else {
      tObjSprite.setScale(0.35, 0.35);
      tObjSprite.setPosition(12, 28);
      enemyContainer.add(tObjSprite);
    }
    const teraPokemon = {};
    this.runInfo.enemyModifiers.forEach((m) => {
      const modifier = m.toModifier(this.scene, this.modifiersModule[m.className]);
      if (modifier instanceof TerastallizeModifier) {
        const teraDetails = modifier?.getArgs();
        const pkmnId = teraDetails[0];
        teraPokemon[pkmnId] = teraDetails[1];
      }
    });
    const enemyPartyContainer = this.scene.add.container(0, 0);
    this.runInfo.enemyParty.forEach((enemyData, e) => {
      const pokemonRowHeight = Math.floor(e/3);
      const enemyIconContainer = this.scene.add.container(0, 0);
      enemyIconContainer.setScale(0.6);
      const isBoss = enemyData.boss;
      enemyData.boss = false;
      enemyData["player"] = true;
      const enemy = enemyData.toPokemon(this.scene);
      const enemyIcon = this.scene.addPokemonIcon(enemy, 0, 0, 0, 0);
      const enemySprite1 = enemyIcon.list[0] as Phaser.GameObjects.Sprite;
      const enemySprite2 = (enemyIcon.list.length > 1) ? enemyIcon.list[1] as Phaser.GameObjects.Sprite : undefined;
      if (teraPokemon[enemyData.id]) {
        const teraTint = getTypeRgb(teraPokemon[enemyData.id]);
        const teraColor = new Phaser.Display.Color(teraTint[0], teraTint[1], teraTint[2]);
        enemySprite1.setTint(teraColor.color);
        if (enemySprite2) {
          enemySprite2.setTint(teraColor.color);
        }
      }
      enemyIcon.setPosition(39*(e%3)+5, (35*pokemonRowHeight));
      const enemyLevel = addTextObject(this.scene, 43*(e%3), (27*(pokemonRowHeight+1)), `${i18next.t("saveSlotSelectUiHandler:lv")}${Utils.formatLargeNumber(enemy.level, 1000)}`, isBoss ? TextStyle.PARTY_RED : TextStyle.PARTY, { fontSize: "54px" });
      enemyLevel.setShadow(0, 0, undefined);
      enemyLevel.setStroke("#424242", 14);
      enemyLevel.setOrigin(0, 0);

      enemyIconContainer.add(enemyIcon);
      enemyIconContainer.add(enemyLevel);
      enemyPartyContainer.add(enemyIconContainer);
      enemy.destroy();
    });
    enemyPartyContainer.setPosition(25, 15);
    enemyContainer.add(enemyPartyContainer);
  }
  private async parseRunInfo(windowX: number, windowY: number) {
    const modeText = addBBCodeTextObject(this.scene, 7, 0, "", TextStyle.WINDOW, {fontSize : "50px", lineSpacing:3});
    modeText.setPosition(7, 5);
    modeText.appendText(i18next.t("runHistory:mode")+": ", false);
    switch (this.runInfo.gameMode) {
    case GameModes.DAILY:
      modeText.appendText(`${i18next.t("gameMode:dailyRun")}`, false);
      break;
    case GameModes.SPLICED_ENDLESS:
      modeText.appendText(`${i18next.t("gameMode:endlessSpliced")}`, false);
      if (this.runInfo.waveIndex === this.scene.gameData.gameStats.highestEndlessWave) {
        modeText.appendText(` [${i18next.t("runHistory:personalBest")}]`, false);
        modeText.setTint(0xffef5c, 0x47ff69, 0x6b6bff, 0xff6969);
      }
      break;
    case GameModes.CHALLENGE:
      modeText.appendText(`${i18next.t("gameMode:challenge")}`, false);
      modeText.appendText(`\t\t${i18next.t("runHistory:challengeRules")}: `);
      const rules: string[] = this.challengeParser();
      if (rules) {
        for (let i = 0; i < rules.length; i++) {
          const newline = i > 0 && i%2 === 0;
          if (i > 0) {
            modeText.appendText(" + ", newline);
          }
          modeText.appendText(rules[i], newline);
        }
      }
      break;
    case GameModes.ENDLESS:
      modeText.appendText(`${i18next.t("gameMode:endless")}`, false);

      if (this.runInfo.waveIndex === this.scene.gameData.gameStats.highestEndlessWave) {
        modeText.appendText(` [${i18next.t("runHistory:personalBest")}]`, false);
        modeText.setTint(0xffef5c, 0x47ff69, 0x6b6bff, 0xff6969);
      }
      break;
    case GameModes.CLASSIC:
      modeText.appendText(`${i18next.t("gameMode:classic")}`, false);
      break;
    }

    const runInfoTextContainer = this.scene.add.container(0, 0);
    const runInfoText = addBBCodeTextObject(this.scene, 7, 0, "", TextStyle.WINDOW, {fontSize: "50px", lineSpacing: 3});
    const runTime = Utils.getPlayTimeString(this.runInfo.playTime);
    runInfoText.appendText(`${i18next.t("runHistory:runLength")}: ${runTime}`, false);
    const runMoney = Utils.formatMoney(this.scene.moneyFormat, this.runInfo.money);
    runInfoText.appendText(`[color=${getTextColor(TextStyle.MONEY)}]${i18next.t("battleScene:moneyOwned", {formattedMoney : runMoney})}[/color]`);
    runInfoText.setPosition(7, 70);
    runInfoTextContainer.add(runInfoText);
    if (this.runInfo.modifiers.length) {
      let visibleModifierIndex = 0;

      const modifierIconsContainer = this.scene.add.container(8, (this.runInfo.gameMode === GameModes.CHALLENGE) ? 20 : 15);
      modifierIconsContainer.setScale(0.45);
      for (const m of this.runInfo.modifiers) {
        const modifier = m.toModifier(this.scene, this.modifiersModule[m.className]);
        if (modifier instanceof PokemonHeldItemModifier) {
          continue;
        }
        const icon = modifier?.getIcon(this.scene, false);
        if (icon) {
          const rowHeightModifier = Math.floor(visibleModifierIndex/7);
          icon.setPosition(24 * (visibleModifierIndex%7), 20 + (35 * rowHeightModifier));
          modifierIconsContainer.add(icon);
        }

        if (++visibleModifierIndex === 20) {
          const maxItems = addTextObject(this.scene, 45, 90, "+", TextStyle.WINDOW);
          maxItems.setPositionRelative(modifierIconsContainer, 70, 45);
          this.runInfoContainer.add(maxItems);
          break;
        }
      }
      this.runInfoContainer.add(modifierIconsContainer);
    }

    this.runInfoContainer.add(modeText);
    this.runInfoContainer.add(runInfoTextContainer);
    this.runContainer.add(this.runInfoContainer);
  }
  private challengeParser(): string[] {
    const rules: string[] = [];
    for (let i = 0; i < this.runInfo.challenges.length; i++) {
      if (this.runInfo.challenges[i].value !== 0) {
        switch (this.runInfo.challenges[i].id) {
        case Challenges.SINGLE_GENERATION:
          rules.push(i18next.t(`runHistory:challengeMonoGen${this.runInfo.challenges[i].value}`));
          break;
        case Challenges.SINGLE_TYPE:
          rules.push(i18next.t(`pokemonInfo:Type.${Type[this.runInfo.challenges[i].value-1]}` as const));
          break;
        case Challenges.FRESH_START:
          rules.push(i18next.t("challenges:freshStart.name"));
          break;
        case Challenges.INVERSE_BATTLE:

          rules.push(i18next.t("challenges:inverseBattle.shortName").split("").reverse().join(""));
          break;
        }
      }
    }
    return rules;
  }
 	  private parsePartyInfo(): void {
    const isCurrentSession = this.isActiveRun && this.scene.sessionSlotId >= 0 && this.runInfo.seed === this.scene.seed;
    const party = isCurrentSession ? this.scene.getParty() : this.runInfo.party;
    const currentLanguage = i18next.resolvedLanguage ?? "en";
 		const windowHeight = ((this.scene.game.canvas.height / 6) - 23)/6;

 		party.forEach((p: PokemonData | PlayerPokemon, i: integer) => {
      const pokemonInfoWindow = new RoundRectangle(this.scene, 0, 14, (this.statsBgWidth*2)+10, windowHeight-2, 3);

 			const pokemon = (isCurrentSession && p instanceof PlayerPokemon) ? p : (p as PokemonData).toPokemon(this.scene);
 			const pokemonInfoContainer = this.scene.add.container(this.statsBgWidth+5, (windowHeight-0.5)*i);

 			const types = pokemon.getTypes();
 			const type1 = getTypeRgb(types[0]);
 			const type1Color = new Phaser.Display.Color(type1[0], type1[1], type1[2]);

 			const bgColor = type1Color.clone().darken(45);
      pokemonInfoWindow.setFillStyle(bgColor.color);

      const iconContainer = this.scene.add.container(0, 0);
      const icon = this.scene.addPokemonIcon(pokemon, 0, 0, 0, 0);
      icon.setScale(0.75);
      icon.setPosition(-99, 1);
      const type2 = types[1] ? getTypeRgb(types[1]) : undefined;
      const type2Color = type2 ? new Phaser.Display.Color(type2[0], type2[1], type2[2]) : undefined;
      type2Color ? pokemonInfoWindow.setStrokeStyle(1, type2Color.color, 0.95) : pokemonInfoWindow.setStrokeStyle(1, type1Color.color, 0.95);

      this.getUi().bringToTop(icon);
      const pokeInfoTextContainer = this.scene.add.container(-85, 3.5);
      const textContainerFontSize = "34px";
      const pNature = getNatureName(pokemon.nature);
      const pName = pokemon.getNameToRender();
      const exemptedLanguages = ["ko", "zh_CN", "zh_TW"];
      let passiveLabel = i18next.t("starterSelectUiHandler:passive") ?? "-";
      let abilityLabel = i18next.t("starterSelectUiHandler:ability") ?? "-";
      if (!exemptedLanguages.includes(currentLanguage)) {
        passiveLabel = passiveLabel.charAt(0);
        abilityLabel = abilityLabel.charAt(0);
      }
      const pPassiveInfo = pokemon.passive ? passiveLabel+": "+pokemon.getPassiveAbility().name : "";
      const pAbilityInfo = abilityLabel + ": " + pokemon.getAbility().name;
      const pokeInfoText = addBBCodeTextObject(this.scene, 0, 0, pName, TextStyle.SUMMARY, {fontSize: textContainerFontSize, lineSpacing: 3});
      pokeInfoText.appendText(`${i18next.t("saveSlotSelectUiHandler:lv")}${Utils.formatFancyLargeNumber(pokemon.level, 1)} - ${pNature}`);
      pokeInfoText.appendText(pAbilityInfo);
      pokeInfoText.appendText(pPassiveInfo);
      pokeInfoTextContainer.add(pokeInfoText);
      const pokeStatTextContainer = this.scene.add.container(-35, 6);
      const pStats : string[]= [];
      pokemon.stats.forEach((element) => pStats.push(Utils.formatFancyLargeNumber(element, 1)));
      for (let i = 0; i < pStats.length; i++) {
        const isMult = getNatureStatMultiplier(pokemon.nature, i);
        pStats[i] = (isMult < 1) ? pStats[i] + "[color=#40c8f8]↓[/color]" : pStats[i];
        pStats[i] = (isMult > 1) ? pStats[i] + "[color=#f89890]↑[/color]" : pStats[i];
      }
      const hp = i18next.t("pokemonInfo:Stat.HPshortened")+": "+pStats[0];
      const atk = i18next.t("pokemonInfo:Stat.ATKshortened")+": "+pStats[1];
      const def = i18next.t("pokemonInfo:Stat.DEFshortened")+": "+pStats[2];
      const spatk = i18next.t("pokemonInfo:Stat.SPATKshortened")+": "+pStats[3];
      const spdef = i18next.t("pokemonInfo:Stat.SPDEFshortened")+": "+pStats[4];
      const speedLabel = (currentLanguage==="es"||currentLanguage==="pt_BR") ? i18next.t("runHistory:SPDshortened") : i18next.t("pokemonInfo:Stat.SPDshortened");
      const speed = speedLabel+": "+pStats[5];

      const pokeStatText1 = addBBCodeTextObject(this.scene, -5, 0, hp, TextStyle.SUMMARY, {fontSize: textContainerFontSize, lineSpacing: 3});
      pokeStatText1.appendText(atk);
      pokeStatText1.appendText(def);
      pokeStatTextContainer.add(pokeStatText1);

      const pokeStatText2 = addBBCodeTextObject(this.scene, 25, 0, spatk, TextStyle.SUMMARY, {fontSize: textContainerFontSize, lineSpacing: 3});
      pokeStatText2.appendText(spdef);
      pokeStatText2.appendText(speed);
      pokeStatTextContainer.add(pokeStatText2);
      const marksContainer = this.scene.add.container(0, 0);
      if (pokemon.fusionSpecies) {
        const splicedIcon = this.scene.add.image(0, 0, "icon_spliced");
        splicedIcon.setScale(0.35);
        splicedIcon.setOrigin(0, 0);
        pokemon.isShiny() ? splicedIcon.setPositionRelative(pokeInfoTextContainer, 35, 0) : splicedIcon.setPositionRelative(pokeInfoTextContainer, 28, 0);
        marksContainer.add(splicedIcon);
        this.getUi().bringToTop(splicedIcon);
      }
      if (pokemon.isShiny()) {
        const doubleShiny = pokemon.isFusion() && pokemon.shiny && pokemon.fusionShiny;
        const shinyStar = this.scene.add.image(0, 0, `shiny_star_small${doubleShiny ? "_1" : ""}`);
        shinyStar.setOrigin(0, 0);
        shinyStar.setScale(0.65);
        shinyStar.setPositionRelative(pokeInfoTextContainer, 28, 0);
        shinyStar.setTint(getVariantTint(!doubleShiny ? pokemon.getVariant() : pokemon.variant));
        marksContainer.add(shinyStar);
        this.getUi().bringToTop(shinyStar);
        if (doubleShiny) {
          const fusionShinyStar = this.scene.add.image(0, 0, "shiny_star_small_2");
          fusionShinyStar.setOrigin(0, 0);
          fusionShinyStar.setScale(0.5);
          fusionShinyStar.setPosition(shinyStar.x+1, shinyStar.y+1);
          fusionShinyStar.setTint(getVariantTint(pokemon.fusionVariant));
          marksContainer.add(fusionShinyStar);
          this.getUi().bringToTop(fusionShinyStar);
        }
      }
      const pokemonMoveset = pokemon.getMoveset();
      const movesetContainer = this.scene.add.container(70, -29);
      const pokemonMoveBgs : Phaser.GameObjects.NineSlice[] = [];
      const pokemonMoveLabels : Phaser.GameObjects.Text[] = [];
      const movePos = [[-6.5, 35.5], [37, 35.5], [-6.5, 43.5], [37, 43.5]];
      for (let m = 0; m < pokemonMoveset?.length; m++) {
      	const moveContainer = this.scene.add.container(movePos[m][0], movePos[m][1]);
        moveContainer.setScale(0.5);
      	const moveBg = this.scene.add.nineslice(0, 0, "type_bgs", "unknown", 85, 15, 2, 2, 2, 2);
      	moveBg.setOrigin(1, 0);
      	const moveLabel = addTextObject(this.scene, -moveBg.width / 2, 2, "-", TextStyle.PARTY);
      	moveLabel.setOrigin(0.5, 0);
      	moveLabel.setName("text-move-label");
      	pokemonMoveBgs.push(moveBg);
      	pokemonMoveLabels.push(moveLabel);
      	moveContainer.add(moveBg);
      	moveContainer.add(moveLabel);
      	movesetContainer.add(moveContainer);
      	const move = pokemonMoveset[m]?.getMove();
        pokemonMoveBgs[m].setFrame(Type[move ? move.type : Type.UNKNOWN].toString().toLowerCase());
        pokemonMoveLabels[m].setText(move ? move.name : "-");
    	}
      const heldItemsScale = (this.runInfo.gameMode === GameModes.SPLICED_ENDLESS || this.runInfo.gameMode === GameModes.ENDLESS) ? 0.25 : 0.5;
      const heldItemsContainer = this.scene.add.container(-82, 6);
      const heldItemsList : PokemonHeldItemModifier[] = [];
      if (this.runInfo.modifiers.length) {
        for (const m of this.runInfo.modifiers) {
          const modifier = m.toModifier(this.scene, this.modifiersModule[m.className]);
          if (modifier instanceof PokemonHeldItemModifier && modifier.pokemonId === pokemon.id) {
            modifier.stackCount = m["stackCount"];
            heldItemsList.push(modifier);
          }
        }
        if (heldItemsList.length > 0) {
          (heldItemsList as PokemonHeldItemModifier[]).sort(modifierSortFunc);
          let row = 0;
          for (const [index, item] of heldItemsList.entries()) {
            if ( index > 36 ) {
              const overflowIcon = addTextObject(this.scene, 182, 4, "+", TextStyle.WINDOW);
              heldItemsContainer.add(overflowIcon);
              break;
            }
            const itemIcon = item?.getIcon(this.scene, true);
            itemIcon.setScale(heldItemsScale);
            itemIcon.setPosition((index%19) * 10, row * 10);
            heldItemsContainer.add(itemIcon);
            if (index !== 0 && index % 18 === 0) {
              row++;
            }
          }
        }
      }
      heldItemsContainer.setName("heldItems");
      heldItemsContainer.setVisible(false);
      pokemonInfoContainer.add(pokemonInfoWindow);
      iconContainer.add(icon);
      pokemonInfoContainer.add(iconContainer);
      marksContainer.setName("PkmnMarks");
      pokemonInfoContainer.add(marksContainer);
      movesetContainer.setName("PkmnMoves");
      pokemonInfoContainer.add(movesetContainer);
      pokeInfoTextContainer.setName("PkmnInfoText");
      pokemonInfoContainer.add(pokeInfoTextContainer);
      pokeStatTextContainer.setName("PkmnStatsText");
      pokemonInfoContainer.add(pokeStatTextContainer);
      pokemonInfoContainer.add(heldItemsContainer);
      pokemonInfoContainer.setName("PkmnInfo");
      this.partyContainer.add(pokemonInfoContainer);
      if (!isCurrentSession || !(p instanceof PlayerPokemon)) {
        pokemon.destroy();
      }
 		});
    this.runContainer.add(this.partyContainer);
 	}
  private showParty(partyVisible: boolean): void {
    const allContainers = this.partyContainer.getAll("name", "PkmnInfo");
    allContainers.forEach((c: Phaser.GameObjects.Container) => {
      c.getByName<Phaser.GameObjects.Container>("PkmnMoves").setVisible(partyVisible);
      c.getByName<Phaser.GameObjects.Container>("PkmnInfoText").setVisible(partyVisible);
      c.getByName<Phaser.GameObjects.Container>("PkmnStatsText").setVisible(partyVisible);
      c.getByName<Phaser.GameObjects.Container>("PkmnMarks").setVisible(partyVisible);
      c.getByName<Phaser.GameObjects.Container>("heldItems").setVisible(!partyVisible);
      this.partyVisibility = partyVisible;
    });
  }
  private createVictorySplash(): void {
    this.endCardContainer = this.scene.add.container(0, 0);
    const hallOfFameBg = this.scene.add.image(0, 0, "hall_of_fame");
    hallOfFameBg.setOrigin(0);
    hallOfFameBg.setDisplaySize(this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6);
    const text = addTextObject(this.scene, this.scene.game.canvas.width / 12, (this.scene.game.canvas.height / 6) - 16, i18next.t("battle:congratulations"), TextStyle.SUMMARY, { fontSize: "128px" });
    text.setOrigin(0.5);
    this.endCardContainer.add(hallOfFameBg);
    this.endCardContainer.add(text);
  }

  public static populateHallOfFame(
    scene: BattleScene,
    container: Phaser.GameObjects.Container,
    party: (PokemonData | Pokemon)[],
    options: { visible?: boolean } = {}
  ): void {
    const { visible = false } = options;
    const genderIndex = scene.gameData.gender ?? PlayerGender.UNSET;
    const genderStr = PlayerGender[genderIndex].toLowerCase();
    const hallOfFameBg = scene.add.image(0, 0, "hall_of_fame");
    hallOfFameBg.setOrigin(0, 0);
    hallOfFameBg.setPosition(0, 0);
    hallOfFameBg.setDisplaySize(scene.game.canvas.width / 6, scene.game.canvas.height / 6);
    container.add(hallOfFameBg);
    const hallOfFameText = addTextObject(scene, scene.game.canvas.width / 12, 164, i18next.t("runHistory:hallofFameText", { context: genderStr }), TextStyle.SUMMARY_GOLD);
    hallOfFameText.setOrigin(0.5, 0.5);
    container.add(hallOfFameText);
    party.forEach((p, i) => {
      const pkmn = p instanceof Pokemon ? p : p.toPokemon(scene);
      const shouldDestroy = !(p instanceof Pokemon);
      const row = i % 2;
      const shiny = pkmn.shiny;
      const formIndex = pkmn.formIndex;
      const variant = pkmn.variant;
      const species = pkmn.getSpeciesForm();
      const pokemonSprite = scene.add.sprite(60 + 40 * i, 40 + row * 80, "pkmn__sub");
      pokemonSprite.setPipeline(scene.spritePipeline, { tone: [0.0, 0.0, 0.0, 0.0], ignoreTimeTint: true });
      container.add(pokemonSprite);
      const female = pkmn.gender === 1;
      species.loadAssets(scene, female, formIndex, shiny, variant, true).then(() => {
        pokemonSprite.play(species.getSpriteKey(female, formIndex, shiny, variant));
        pokemonSprite.setPipelineData("shiny", shiny);
        pokemonSprite.setPipelineData("variant", variant);
        pokemonSprite.setPipelineData("spriteKey", species.getSpriteKey(female, formIndex, shiny, variant));
        pokemonSprite.setVisible(true);
      });
      if (pkmn.isFusion()) {
        const fusionIcon = scene.add.sprite(80 + 40 * i, 50 + row * 80, pkmn.getFusionIconAtlasKey());
        fusionIcon.setName("sprite-fusion-icon");
        fusionIcon.setOrigin(0.5, 0);
        fusionIcon.setFrame(pkmn.getFusionIconId(true));
        container.add(fusionIcon);
      }
      if (shouldDestroy) {
        pkmn.destroy();
      }
    });
    container.setVisible(visible);
  }

  private createHallofFame(): void {
    this.hallofFameContainer = this.scene.add.container(0, 0);
    RunInfoUiHandler.populateHallOfFame(this.scene, this.hallofFameContainer, this.runInfo.party, { visible: false });
    this.runContainer.add(this.hallofFameContainer);
  }
 	override processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;
    const error = false;

    switch (button) {
    case Button.CANCEL:
      success = true;
      if (this.pageMode === RunInfoUiMode.MAIN) {
        this.runInfoContainer.removeAll(true);
        this.runResultContainer.removeAll(true);
        this.partyContainer.removeAll(true);
        this.runContainer.removeAll(true);
        if (this.isVictory && !this.isActiveRun) {
          this.hallofFameContainer.removeAll(true);
        }
        super.clear();
        this.runContainer.setVisible(false);
        if (this.isFinalBattleContext) {
          ui.revertMode();
          this.scene.pushPhase(new GameOverPhase(this.scene, this.isVictory));
          this.scene.shiftPhase();
        } else {
          ui.revertMode();
        }
      } else if (this.pageMode === RunInfoUiMode.HALL_OF_FAME) {
        this.hallofFameContainer.setVisible(false);
        this.pageMode = RunInfoUiMode.MAIN;
      }

      break;
    case Button.DOWN:
    case Button.UP:
      break;
    case Button.CYCLE_FORM:
    case Button.CYCLE_SHINY:
    case Button.CYCLE_ABILITY:
      this.buttonCycleOption(button);
      break;
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }
    return success || error;
  }
  private buttonCycleOption(button: Button) {
    switch (button) {
    case Button.CYCLE_SHINY:

      if (this.isVictory && !this.isActiveRun) {
        if (!this.hallofFameContainer.visible) {
          this.hallofFameContainer.setVisible(true);
          this.pageMode = RunInfoUiMode.HALL_OF_FAME;
        } else {
          this.hallofFameContainer.setVisible(false);
          this.pageMode = RunInfoUiMode.MAIN;
        }
      }
      break;
    case Button.CYCLE_ABILITY:
      if (this.partyVisibility) {
        this.showParty(false);
      } else {
        this.showParty(true);
      }
      break;
    }
  }
}