import BattleScene, { starterColors } from "../battle-scene";
import { Mode } from "./ui";
import UiHandler from "./ui-handler";
import * as Utils from "../utils";
import { PlayerPokemon, PokemonMove } from "../field/pokemon";
import { getStarterValueFriendshipCap, speciesStarters } from "../data/pokemon-species";
import { argbFromRgba } from "@material/material-color-utilities";
import { Type, getTypeRgb } from "../data/type";
import { TextStyle, addBBCodeTextObject, addTextObject, getBBCodeFrag } from "./text";
import Move, { MoveCategory } from "../data/move";
import { getPokeballAtlasKey } from "../data/pokeball";
import { getGenderColor, getGenderSymbol } from "../data/gender";
import { getLevelRelExp, getLevelTotalExp } from "../data/exp";
import { Stat, getStatName } from "../data/pokemon-stat";
import { PokemonHeldItemModifier } from "../modifier/modifier";
import { StatusEffect } from "../data/status-effect";
import { getBiomeName } from "../data/biomes";
import { Nature, getNatureName, getNatureStatMultiplier } from "../data/nature";
import { loggedInUser } from "../account";
import { Variant, getVariantTint } from "#app/data/variant";
import {Button} from "#enums/buttons";
import { Ability } from "../data/ability.js";
import i18next from "i18next";
import { ModifierTooltipUtils } from "./modifier-tooltip-utils";
import {modifierSortFunc} from "../modifier/modifier";
import { PlayerGender } from "#enums/player-gender";
import { attachModalBackground, ModalBackgroundHandle } from "./modal-background-utils";
import { isIPhone } from "../loading-scene";
import Overrides from "../overrides";
import { AssetLoadProfiler } from "../system/asset-load-profiler";

export enum Page {
  PROFILE,
  STATS,
  MOVES
}

export enum SummaryUiMode {
  DEFAULT,
  LEARN_MOVE
}
const LABEL_CONSTANTS = {
  PROFILE: { x: 16, y: -3, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  ABILITY: { x: 16, y: 40, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  PASSIVE: { x: 16, y: 40, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  ID_NO: { x: 141, y: 10, style: TextStyle.SUMMARY_VOID, fontSize: "106px" },
  TRAINER_MEMO: { x: 16, y: 100, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  ITEMS: { x: 18, y: -3, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  STATS: { x: 18, y: 44, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  EXP: { x: 20, y: 101, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  EXP_BAR: { x: 120, y: 145, width: 458, height: 27 },
  MOVES: { x: 12, y: -29, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  DESCRIPTION: { x: 12, y: 71, style: TextStyle.SUMMARY_VOID, fontSize: "80px" },
  EFFECT: { x: 16, y: -2, style: TextStyle.SUMMARY_VOID, fontSize: "80px" }
};
interface abilityContainer {

  labelText: Phaser.GameObjects.Text,

  ability: Ability | null,

  nameText: Phaser.GameObjects.Text | null,

  descriptionText: Phaser.GameObjects.Text | null,
}

export default class SummaryUiHandler extends UiHandler {
  private summaryUiMode: SummaryUiMode;
  private summaryAssetsLoaded: boolean = false;

  private summaryContainer: Phaser.GameObjects.Container;
  private _summaryPattern?: ModalBackgroundHandle;
  private tabSprite: Phaser.GameObjects.Sprite;
  private shinyOverlay: Phaser.GameObjects.Image;
  private numberText: Phaser.GameObjects.Text;
  private pokemonSprite: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private splicedIcon: Phaser.GameObjects.Sprite;
  private pokeball: Phaser.GameObjects.Sprite;
  private levelText: Phaser.GameObjects.Text;
  private genderText: Phaser.GameObjects.Text;
  private shinyIcon: Phaser.GameObjects.Image;
  private fusionShinyIcon: Phaser.GameObjects.Image;
  private candyShadow: Phaser.GameObjects.Sprite;
  private candyIcon: Phaser.GameObjects.Sprite;
  private candyOverlay: Phaser.GameObjects.Sprite;
  private candyCountText: Phaser.GameObjects.Text;
  private championRibbon: Phaser.GameObjects.Image;
  private statusContainer: Phaser.GameObjects.Container;
  private status: Phaser.GameObjects.Image;

  private abilityPrompt: Phaser.GameObjects.Image;

  private abilityContainer: abilityContainer;

  private passiveContainer: abilityContainer;
  private summaryPageContainer: Phaser.GameObjects.Container;
  private movesContainer: Phaser.GameObjects.Container;
  private moveDescriptionText: Phaser.GameObjects.Text;
  private moveCursorObj: Phaser.GameObjects.Sprite | null;
  private selectedMoveCursorObj: Phaser.GameObjects.Sprite | null;
  private moveRowsContainer: Phaser.GameObjects.Container;
  private extraMoveRowContainer: Phaser.GameObjects.Container;
  private moveEffectContainer: Phaser.GameObjects.Container;
  private movePowerText: Phaser.GameObjects.Text;
  private moveAccuracyText: Phaser.GameObjects.Text;
  private moveCategoryIcon: Phaser.GameObjects.Sprite;
  private summaryPageTransitionContainer: Phaser.GameObjects.Container;

  private descriptionScrollTween: Phaser.Tweens.Tween | null;
  private moveCursorBlinkTimer: Phaser.Time.TimerEvent | null;

  private pokemon: PlayerPokemon | null;
  private playerParty: boolean;

  private newMove: Move | null;
  private moveSelectFunction: Function | null;
  private transitioning: boolean;
  private statusVisible: boolean;
  private moveEffectsVisible: boolean;

  private moveSelect: boolean;
  private moveCursor: integer;
  private selectedMoveIndex: integer;
  private selectCallback: Function | null;

  constructor(scene: BattleScene) {
    super(scene, Mode.SUMMARY);
  }

  loadSummaryAssets(): Promise<void> {
    return new Promise(resolve => {
      if (this.summaryAssetsLoaded || !isIPhone()) {
        resolve();
        return;
      }

      if (Overrides.DEBUG_IOS_MODE) {
        AssetLoadProfiler.getInstance().trackLazyLoad("summary_ui", "SummaryUiHandler.loadSummaryAssets");
      }

      const imageAssets = [
        "summary_bg", "summary_overlay_shiny", "summary_profile",
        "summary_profile_prompt_z", "summary_profile_prompt_a",
        "summary_status", "summary_stats", "summary_stats_overlay_exp",
        "summary_stats_exp_bar", "summary_moves", "summary_moves_effect",
        "summary_moves_overlay_row", "summary_moves_overlay_pp"
      ];

      for (const asset of imageAssets) {
        if (!this.scene.textures.exists(asset)) {
          (this.scene as BattleScene).loadImage(asset, "ui");
        }
      }

      for (let t = 1; t <= 3; t++) {
        if (!this.scene.textures.exists(`summary_tabs_${t}`)) {
          (this.scene as BattleScene).loadImage(`summary_tabs_${t}`, "ui");
        }
      }

      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.summaryAssetsLoaded = true;
        resolve();
      });
      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  setup() {
    if (isIPhone()) {
      return;
    }
    this.setupInternal();
  }

  private setupInternal(): void {
    const ui = this.getUi();

    this.summaryContainer = this.scene.add.container(0, 0);
    this.summaryContainer.setVisible(false);
    ui.add(this.summaryContainer);

    const summaryBg = this.scene.add.image(0, 0, "summary_bg");
    summaryBg.setOrigin(0, 1);
    this.summaryContainer.add(summaryBg);

    this.tabSprite = this.scene.add.sprite(134, (-summaryBg.displayHeight) + 16, "summary_tabs_1");
    this.tabSprite.setOrigin(1, 1);
    this.summaryContainer.add(this.tabSprite);

    const isJapaneseLang = i18next.resolvedLanguage === "ja";
    const summaryLabelFontSize = isJapaneseLang ? "117px" : "96px";
    const summaryLabelX = 2;
    const summaryLabel = addTextObject(this.scene, summaryLabelX, -165, "Pokémon Info", TextStyle.SUMMARY, { fontSize: summaryLabelFontSize });
    summaryLabel.setOrigin(0, 1);
    this.summaryContainer.add(summaryLabel);

    this.shinyOverlay = this.scene.add.image(6, -54, "summary_overlay_shiny");
    this.shinyOverlay.setOrigin(0, 1);
    this.shinyOverlay.setVisible(false);
    this.summaryContainer.add(this.shinyOverlay);

    this.numberText = addTextObject(this.scene, 17, -149, "0000", TextStyle.SUMMARY);
    this.numberText.setOrigin(0, 1);
    this.summaryContainer.add(this.numberText);

    this.pokemonSprite = this.scene.initPokemonSprite(this.scene.add.sprite(56, -106, "pkmn__sub"), undefined, false, true);
    this.summaryContainer.add(this.pokemonSprite);

    this.nameText = addTextObject(this.scene, 6, -54, "", TextStyle.SUMMARY);
    this.nameText.setOrigin(0, 0);
    this.summaryContainer.add(this.nameText);

    this.splicedIcon = this.scene.add.sprite(0, -54, "icon_spliced");
    this.splicedIcon.setVisible(false);
    this.splicedIcon.setOrigin(0, 0);
    this.splicedIcon.setScale(0.75);
    this.splicedIcon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 12, 15), Phaser.Geom.Rectangle.Contains);
    this.summaryContainer.add(this.splicedIcon);

    this.shinyIcon = this.scene.add.image(0, -54, "shiny_star");
    this.shinyIcon.setVisible(false);
    this.shinyIcon.setOrigin(0, 0);
    this.shinyIcon.setScale(0.75);
    this.shinyIcon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 12, 15), Phaser.Geom.Rectangle.Contains);
    this.summaryContainer.add(this.shinyIcon);

    this.fusionShinyIcon = this.scene.add.image(0, 0, "shiny_star_2");
    this.fusionShinyIcon.setVisible(false);
    this.fusionShinyIcon.setOrigin(0, 0);
    this.fusionShinyIcon.setScale(0.75);
    this.summaryContainer.add(this.fusionShinyIcon);

    this.pokeball = this.scene.add.sprite(6, -19, "pb");
    this.pokeball.setOrigin(0, 1);
    this.summaryContainer.add(this.pokeball);

    this.candyIcon = this.scene.add.sprite(13, -140, "candy");
    this.candyIcon.setScale(0.8);
    this.summaryContainer.add(this.candyIcon);

    this.candyOverlay = this.scene.add.sprite(13, -140, "candy_overlay");
    this.candyOverlay.setScale(0.8);
    this.summaryContainer.add(this.candyOverlay);

    this.candyShadow = this.scene.add.sprite(13, -140, "candy");
    this.candyShadow.setTint(0x000000);
    this.candyShadow.setAlpha(0.50);
    this.candyShadow.setScale(0.8);
    this.candyShadow.setInteractive(new Phaser.Geom.Rectangle(0, 0, 16, 16), Phaser.Geom.Rectangle.Contains);
    this.summaryContainer.add(this.candyShadow);

    this.candyCountText = addTextObject(this.scene, 20, -146, "x0", TextStyle.WINDOW_ALT, { fontSize: "76px" });
    this.candyCountText.setOrigin(0, 0);
    this.summaryContainer.add(this.candyCountText);

    this.championRibbon = this.scene.add.image(88, -146, "champion_ribbon");
    this.championRibbon.setOrigin(0, 0);

    this.championRibbon.setScale(1.25);
    this.summaryContainer.add(this.championRibbon);
    this.championRibbon.setVisible(false);

    this.levelText = addTextObject(this.scene, 36, -17, "", TextStyle.SUMMARY_ALT);
    this.levelText.setOrigin(0, 1);
    this.summaryContainer.add(this.levelText);

    this.genderText = addTextObject(this.scene, 96, -17, "", TextStyle.SUMMARY);
    this.genderText.setOrigin(0, 1);
    this.summaryContainer.add(this.genderText);

    this.statusContainer = this.scene.add.container(-106, -16);

    const statusBg = this.scene.add.image(0, 0, "summary_status");
    statusBg.setOrigin(0, 0);

    this.statusContainer.add(statusBg);

    const statusLabel = addTextObject(this.scene, 3, 0, i18next.t("pokemonSummary:status"), TextStyle.SUMMARY);
    statusLabel.setOrigin(0, 0);

    this.statusContainer.add(statusLabel);

    this.status = this.scene.add.sprite(91, 4, "statuses");
    this.status.setOrigin(0.5, 0);

    this.statusContainer.add(this.status);

    this.summaryContainer.add(this.statusContainer);

    this.moveEffectContainer = this.scene.add.container(106, -62);

    this.summaryContainer.add(this.moveEffectContainer);

    const moveEffectBg = this.scene.add.image(0, 0, "summary_moves_effect");
    moveEffectBg.setOrigin(0, 0);
    this.moveEffectContainer.add(moveEffectBg);

    const effectLabel = addTextObject(
      this.scene,
      LABEL_CONSTANTS.EFFECT.x,
      LABEL_CONSTANTS.EFFECT.y,
      i18next.t("pokemonSummary:effect"),
      LABEL_CONSTANTS.EFFECT.style,
      { fontSize: LABEL_CONSTANTS.EFFECT.fontSize }
    );
    effectLabel.setOrigin(0, 0);
    this.moveEffectContainer.add(effectLabel);

    const isJapanese = i18next.resolvedLanguage === "ja";
    const labels = i18next.t("pokemonSummary:powerAccuracyCategory").split("\n");

    const baseY = 12;
    const lineHeight = 16;

    const powerLabel = addTextObject(this.scene, 8, baseY, labels[0] || "Power", TextStyle.SUMMARY);
    powerLabel.setOrigin(0, 0);
    this.moveEffectContainer.add(powerLabel);

    const accuracyYOffset = isJapanese ? 2 : 0;
    const accuracyLabel = addTextObject(this.scene, 8, baseY + lineHeight + accuracyYOffset, labels[1] || "Accuracy", TextStyle.SUMMARY);
    accuracyLabel.setOrigin(0, 0);
    this.moveEffectContainer.add(accuracyLabel);

    const categoryYOffset = isJapanese ? 3 : 0;
    const categoryLabel = addTextObject(this.scene, 8, baseY + lineHeight * 2 + categoryYOffset, labels[2] || "Category", TextStyle.SUMMARY);
    categoryLabel.setOrigin(0, 0);
    this.moveEffectContainer.add(categoryLabel);

    this.movePowerText = addTextObject(this.scene, 99, 27, "0", TextStyle.WINDOW_ALT);
    this.movePowerText.setOrigin(1, 1);
    this.moveEffectContainer.add(this.movePowerText);

    this.moveAccuracyText = addTextObject(this.scene, 99, 43, "0", TextStyle.WINDOW_ALT);
    this.moveAccuracyText.setOrigin(1, 1);
    this.moveEffectContainer.add(this.moveAccuracyText);

    this.moveCategoryIcon = this.scene.add.sprite(99, 57, "categories");
    this.moveCategoryIcon.setOrigin(1, 1);
    this.moveEffectContainer.add(this.moveCategoryIcon);

    const getSummaryPageBg = () => {
      const ret = this.scene.add.sprite(0, 0, this.getPageKey(0));
      ret.setOrigin(0, 1);
      return ret;
    };

    this.summaryContainer.add((this.summaryPageContainer = this.scene.add.container(106, 0)));
    this.summaryPageContainer.add(getSummaryPageBg());
    this.summaryPageContainer.setVisible(false);
    this.summaryContainer.add((this.summaryPageTransitionContainer = this.scene.add.container(106, 0)));
    this.summaryPageTransitionContainer.add(getSummaryPageBg());
    this.summaryPageTransitionContainer.setVisible(false);

    this._summaryPattern = attachModalBackground(
      this.scene,
      this.summaryContainer,
      () => ({
        bgX: this.summaryPageContainer.x,
        bgY: -(this.summaryPageContainer.getAt(0) as Phaser.GameObjects.Sprite).height,
        bgWidth: (this.summaryPageContainer.getAt(0) as Phaser.GameObjects.Sprite).width,
        bgHeight: (this.summaryPageContainer.getAt(0) as Phaser.GameObjects.Sprite).height,
      }),
      { mask: true }
    );
  }

  getPageKey(page?: integer) {
    if (page === undefined) {
      page = this.cursor;
    }
    return `summary_${Page[page].toLowerCase()}`;
  }

  show(args: any[]): boolean {
    if (isIPhone() && !this.summaryAssetsLoaded) {
      this.loadSummaryAssets().then(() => {
        if (!this.summaryContainer) {
          this.setupInternal();
        }
        this.showInternal(args);
      });
      return true;
    }
    return this.showInternal(args);
  }

  private showInternal(args: any[]): boolean {
    super.show(args);

    this.pokemon = args[0] as PlayerPokemon;
    this.summaryUiMode = args.length > 1 ? args[1] as SummaryUiMode : SummaryUiMode.DEFAULT;
    this.playerParty = args[4] ?? true;
    this.scene.ui.bringToTop(this.summaryContainer);

    this.summaryContainer.setVisible(true);
    this.cursor = -1;

    this._summaryPattern?.redraw();

    this.shinyOverlay.setVisible(this.pokemon.isShiny());

    const colorScheme = starterColors[this.pokemon.species.getRootSpeciesId()];
    this.candyIcon.setTint(argbFromRgba(Utils.rgbHexToRgba(colorScheme[0])));
    this.candyOverlay.setTint(argbFromRgba(Utils.rgbHexToRgba(colorScheme[1])));

    this.numberText.setText(Utils.padInt(this.pokemon.species.speciesId, 4));
    this.numberText.setColor(this.getTextColor(!this.pokemon.isShiny() ? TextStyle.SUMMARY : TextStyle.SUMMARY_GOLD));
    this.numberText.setShadowColor(this.getTextColor(!this.pokemon.isShiny() ? TextStyle.SUMMARY : TextStyle.SUMMARY_GOLD, true));
    this.pokemonSprite.setScale(this.pokemon.getSpriteScale());

    this.pokemonSprite.play(this.pokemon.getSpriteKey(true));
    this.pokemonSprite.setPipelineData("teraColor", getTypeRgb(this.pokemon.getTeraType()));
    this.pokemonSprite.setPipelineData("ignoreTimeTint", true);
    this.pokemonSprite.setPipelineData("spriteKey", this.pokemon.getSpriteKey());
    this.pokemonSprite.setPipelineData("shiny", this.pokemon.shiny);
    this.pokemonSprite.setPipelineData("variant", this.pokemon.variant);
    const sourcePipelineData = this.pokemon?.getSprite()?.pipelineData;
    [ "spriteColors", "fusionSpriteColors", "altBuildSpriteColors", "altBuildTargetColors" ].forEach((k) => {
      delete this.pokemonSprite.pipelineData[k];
      delete this.pokemonSprite.pipelineData[`${k}Base`];
      let targetKey = k;
      if (this.pokemon?.summonData?.speciesForm) {
        targetKey += "Base";
      }
      if (sourcePipelineData && sourcePipelineData[targetKey] !== undefined) {
        this.pokemonSprite.pipelineData[targetKey] = sourcePipelineData[targetKey];
      }
    });
    delete this.pokemonSprite.pipelineData["altBuildBlendMode"];
    delete this.pokemonSprite.pipelineData["altBuildInversionFactor"];
    if (sourcePipelineData?.["altBuildBlendMode"] !== undefined) {
      this.pokemonSprite.pipelineData["altBuildBlendMode"] = sourcePipelineData["altBuildBlendMode"];
    }
    if (sourcePipelineData?.["altBuildInversionFactor"] !== undefined) {
      this.pokemonSprite.pipelineData["altBuildInversionFactor"] = sourcePipelineData["altBuildInversionFactor"];
    }
    this.pokemon.cry();

    this.nameText.setText(this.pokemon.getNameToRender());

    const isFusion = this.pokemon.isFusion();

    this.splicedIcon.setPositionRelative(this.nameText, this.nameText.displayWidth + 2, 3);
    this.splicedIcon.setVisible(isFusion);
    if (this.splicedIcon.visible) {
      this.splicedIcon.off("pointerover");
      this.splicedIcon.off("pointerout");
      this.splicedIcon.on("pointerover", () => {
        const primary = this.pokemon?.species.getName(this.pokemon.formIndex) || "";
        const fusion = this.pokemon?.fusionSpecies?.getName(this.pokemon?.fusionFormIndex) || "";
        (this.scene as BattleScene).ui.showTooltip(
          i18next.t("battleInfo:fusionTooltipTitle"),
          i18next.t("battleInfo:fusionTooltipBody", { primary, fusion }),
          true
        );
      });
      this.splicedIcon.on("pointerout", () => (this.scene as BattleScene).ui.hideTooltip());
    }

    if (this.scene.gameData.starterData[this.pokemon.species.getRootSpeciesId()].classicWinCount > 0 && this.scene.gameData.starterData[this.pokemon.species.getRootSpeciesId(true)].classicWinCount > 0) {
      this.championRibbon.setVisible(true);
    } else {
      this.championRibbon.setVisible(false);
    }

    let currentFriendship = this.scene.gameData.starterData[this.pokemon.species.getRootSpeciesId()].friendship;
    if (!currentFriendship || currentFriendship === undefined) {
      currentFriendship = 0;
    }

    const friendshipCap = getStarterValueFriendshipCap(speciesStarters[this.pokemon.species.getRootSpeciesId()]);
    const candyCropY = 16 - (16 * (currentFriendship / friendshipCap));

    if (this.candyShadow.visible) {
      this.candyShadow.on("pointerover", () => (this.scene as BattleScene).ui.showTooltip("", `${currentFriendship}/${friendshipCap}`, true));
      this.candyShadow.on("pointerout", () => (this.scene as BattleScene).ui.hideTooltip());
    }

    this.candyCountText.setText(`x${this.scene.gameData.starterData[this.pokemon.species.getRootSpeciesId()].candyCount}`);

    this.candyShadow.setCrop(0, 0, 16, candyCropY);

    const doubleShiny = isFusion && this.pokemon.shiny && this.pokemon.fusionShiny;
    const baseVariant = !doubleShiny ? this.pokemon.getVariant() : this.pokemon.variant;

    this.shinyIcon.setPositionRelative(this.nameText, this.nameText.displayWidth + (this.splicedIcon.visible ? this.splicedIcon.displayWidth + 1 : 0) + 1, 3);
    this.shinyIcon.setTexture(`shiny_star${doubleShiny ? "_1" : ""}`);
    this.shinyIcon.setVisible(this.pokemon.isShiny());
    this.shinyIcon.setTint(getVariantTint(baseVariant));
    if (this.shinyIcon.visible) {
      const shinyDescriptor = doubleShiny || baseVariant ?
        `${baseVariant === 2 ? i18next.t("common:epicShiny") : baseVariant === 1 ? i18next.t("common:rareShiny") : i18next.t("common:commonShiny")}${doubleShiny ? `/${this.pokemon.fusionVariant === 2 ? i18next.t("common:epicShiny") : this.pokemon.fusionVariant === 1 ? i18next.t("common:rareShiny") : i18next.t("common:commonShiny")}` : ""}`
        : "";
      this.shinyIcon.on("pointerover", () => (this.scene as BattleScene).ui.showTooltip("", `${i18next.t("common:shinyOnHover")}${shinyDescriptor ? ` (${shinyDescriptor})` : ""}`, true));
      this.shinyIcon.on("pointerout", () => (this.scene as BattleScene).ui.hideTooltip());
    }

    this.fusionShinyIcon.setPosition(this.shinyIcon.x, this.shinyIcon.y);
    this.fusionShinyIcon.setVisible(doubleShiny);
    if (isFusion) {
      this.fusionShinyIcon.setTint(getVariantTint(this.pokemon.fusionVariant));
    }

    this.pokeball.setFrame(getPokeballAtlasKey(this.pokemon.pokeball));
    this.levelText.setText(this.pokemon.level.toString());
    this.genderText.setText(getGenderSymbol(this.pokemon.getGender(true)));
    this.genderText.setColor(getGenderColor(this.pokemon.getGender(true)));
    this.genderText.setShadowColor(getGenderColor(this.pokemon.getGender(true), true));

    switch (this.summaryUiMode) {
    case SummaryUiMode.DEFAULT:
      const page = args.length < 2 ? Page.PROFILE : args[2] as Page;
      this.hideMoveEffect(true);
      this.setCursor(page);
      if (args.length > 3) {
        this.selectCallback = args[3];
      }
      break;
    case SummaryUiMode.LEARN_MOVE:
      this.newMove = args[2] as Move;
      this.moveSelectFunction = args[3] as Function;

      this.showMoveEffect(true);
      this.setCursor(Page.MOVES);
      this.showMoveSelect();
      break;
    }

    const fromSummary = args.length >= 2;

    if (this.pokemon.status || this.pokemon.pokerus) {
      this.showStatus(!fromSummary);
      this.status.setFrame(this.pokemon.status ? StatusEffect[this.pokemon.status.effect].toLowerCase() : "pokerus");
    } else {
      this.hideStatus(!fromSummary);
    }

    return true;
  }

  processInput(button: Button): boolean {
    if (this.transitioning) {
      return false;
    }

    const ui = this.getUi();
    const fromPartyMode = ui.handlers[Mode.PARTY].active;
    let success = false;
    let error = false;

    if (this.moveSelect) {
      if (button === Button.ACTION) {
        if (this.pokemon && this.moveCursor < this.pokemon.moveset.length) {
          if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
            this.moveSelectFunction && this.moveSelectFunction(this.moveCursor);
          } else {
            if (this.selectedMoveIndex === -1) {
              this.selectedMoveIndex = this.moveCursor;
              this.setCursor(this.moveCursor);
            } else {
              if (this.selectedMoveIndex !== this.moveCursor) {
                const tempMove = this.pokemon?.moveset[this.selectedMoveIndex];
                this.pokemon.moveset[this.selectedMoveIndex] = this.pokemon.moveset[this.moveCursor];
                this.pokemon.moveset[this.moveCursor] = tempMove;

                const selectedMoveRow = this.moveRowsContainer.getAt(this.selectedMoveIndex) as Phaser.GameObjects.Container;
                const switchMoveRow = this.moveRowsContainer.getAt(this.moveCursor) as Phaser.GameObjects.Container;

                this.moveRowsContainer.moveTo(selectedMoveRow, this.moveCursor);
                this.moveRowsContainer.moveTo(switchMoveRow, this.selectedMoveIndex);

                selectedMoveRow.setY(this.moveCursor * 16);
                switchMoveRow.setY(this.selectedMoveIndex * 16);
              }

              this.selectedMoveIndex = -1;
              if (this.selectedMoveCursorObj) {
                this.selectedMoveCursorObj.destroy();
                this.selectedMoveCursorObj = null;
              }
            }
          }
          success = true;
        } else if (this.moveCursor === 4) {
          return this.processInput(Button.CANCEL);
        } else {
          error = true;
        }
      } else if (button === Button.CANCEL) {
        this.hideMoveSelect();
        success = true;
      } else {
        switch (button) {
        case Button.UP:
          success = this.setCursor(this.moveCursor ? this.moveCursor - 1 : 4);
          break;
        case Button.DOWN:
          success = this.setCursor(this.moveCursor < 4 ? this.moveCursor + 1 : 0);
          break;
        case Button.LEFT:
          this.moveSelect = false;
          this.setCursor(Page.STATS);
          if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
            this.hideMoveEffect();
            this.destroyBlinkCursor();
            success = true;
            break;
          } else {
            this.hideMoveSelect();
            success = true;
            break;
          }
        }
      }
    } else {
      if (button === Button.ACTION) {
        if (this.cursor === Page.MOVES) {
          this.showMoveSelect();
          success = true;
        } else if (this.cursor === Page.PROFILE && this.pokemon?.hasPassive()) {
          this.abilityContainer.labelText.setVisible(!this.abilityContainer.labelText.visible);
          this.abilityContainer.nameText?.setVisible(!this.abilityContainer.nameText?.visible);
          this.abilityContainer.descriptionText?.setVisible(!this.abilityContainer.descriptionText.visible);

          this.passiveContainer.labelText.setVisible(!this.passiveContainer.labelText.visible);
          this.passiveContainer.nameText?.setVisible(!this.passiveContainer.nameText?.visible);
          this.passiveContainer.descriptionText?.setVisible(!this.passiveContainer.descriptionText.visible);
        }
      } else if (button === Button.CANCEL) {
        if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
          this.hideMoveSelect();
        } else {
          if (this.selectCallback instanceof Function) {
            const selectCallback = this.selectCallback;
            this.selectCallback = null;
            selectCallback();
          }

          if (!fromPartyMode) {
            ui.setMode(Mode.MESSAGE);
          } else {
            ui.setMode(Mode.PARTY);
          }
        }
        success = true;
      } else {
        const pages = Utils.getEnumValues(Page);
        switch (button) {
        case Button.UP:
        case Button.DOWN:
          if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
            break;
          } else if (!fromPartyMode) {
            break;
          }
          const isDown = button === Button.DOWN;
          const party = this.scene.getParty();
          const partyMemberIndex = this.pokemon ? party.indexOf(this.pokemon) : -1;
          if ((isDown && partyMemberIndex < party.length - 1) || (!isDown && partyMemberIndex)) {
            const page = this.cursor;
            this.clear();
            this.show([ party[partyMemberIndex + (isDown ? 1 : -1)], this.summaryUiMode, page ]);
          }
          break;
        case Button.LEFT:
          if (this.cursor) {
            success = this.setCursor(this.cursor - 1);
          }
          break;
        case Button.RIGHT:
          if (this.cursor < pages.length - 1) {
            success = this.setCursor(this.cursor + 1);
            if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE && this.cursor === Page.MOVES) {
              this.moveSelect = true;
            }
          }
          break;
        }
      }
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }

    return success || error;
  }

  setCursor(cursor: integer, overrideChanged: boolean = false): boolean {
    let changed: boolean = overrideChanged || this.moveCursor !== cursor;

    if (this.moveSelect) {
      this.moveCursor = cursor;

      const selectedMove = this.getSelectedMove();

      if (selectedMove) {
        this.moveDescriptionText.setY(84);
        this.movePowerText.setText(selectedMove.power >= 0 ? selectedMove.power.toString() : "---");
        this.moveAccuracyText.setText(selectedMove.accuracy >= 0 ? selectedMove.accuracy.toString() : "---");
        this.moveCategoryIcon.setFrame(MoveCategory[selectedMove.category].toLowerCase());
        this.showMoveEffect();
      } else {
        this.hideMoveEffect();
      }

      this.moveDescriptionText.setText(selectedMove?.effect || "");
      const moveDescriptionLineCount = Math.floor(this.moveDescriptionText.displayHeight / 14.83);

      if (this.descriptionScrollTween) {
        this.descriptionScrollTween.remove();
        this.descriptionScrollTween = null;
      }

      if (moveDescriptionLineCount > 3) {
        this.descriptionScrollTween = this.scene.tweens.add({
          targets: this.moveDescriptionText,
          delay: Utils.fixedInt(2000),
          loop: -1,
          hold: Utils.fixedInt(2000),
          duration: Utils.fixedInt((moveDescriptionLineCount - 3) * 2000),
          y: `-=${14.83 * (moveDescriptionLineCount - 3)}`
        });
      }

      if (!this.moveCursorObj) {
        this.moveCursorObj = this.scene.add.sprite(-2, 0, "summary_moves_cursor", "highlight");
        this.moveCursorObj.setOrigin(0, 1);
        this.movesContainer.add(this.moveCursorObj);
      }

      this.moveCursorObj.setY(16 * this.moveCursor + 1);

      if (this.moveCursorBlinkTimer) {
        this.moveCursorBlinkTimer.destroy();
      }
      this.moveCursorObj.setVisible(true);
      this.moveCursorBlinkTimer = this.scene.time.addEvent({
        loop: true,
        delay: Utils.fixedInt(600),
        callback: () => {
          this.moveCursorObj?.setVisible(false);
          this.scene.time.delayedCall(Utils.fixedInt(100), () => {
            if (!this.moveCursorObj) {
              return;
            }
            this.moveCursorObj.setVisible(true);
          });
        }
      });
      if (this.selectedMoveIndex > -1) {
        if (!this.selectedMoveCursorObj) {
          this.selectedMoveCursorObj = this.scene.add.sprite(-2, 0, "summary_moves_cursor", "select");
          this.selectedMoveCursorObj.setOrigin(0, 1);
          this.movesContainer.add(this.selectedMoveCursorObj);
          this.movesContainer.moveBelow(this.selectedMoveCursorObj, this.moveCursorObj);
        }

        this.selectedMoveCursorObj.setY(16 * this.selectedMoveIndex + 1);
      }
    } else {
      changed = this.cursor !== cursor;
      if (changed) {
        const forward = this.cursor < cursor;
        this.cursor = cursor;

        this.tabSprite.setTexture(`summary_tabs_${this.cursor + 1}`);

        this.getUi().hideTooltip();

        if (this.summaryPageContainer.visible) {
          this.transitioning = true;
          this.populatePageContainer(this.summaryPageTransitionContainer, forward ? cursor : cursor + 1);
          if (forward) {
            this.summaryPageTransitionContainer.x += 214;
          } else {
            this.populatePageContainer(this.summaryPageContainer);
          }
          this.scene.tweens.add({
            targets: this.summaryPageTransitionContainer,
            x: forward ? "-=214" : "+=214",
            duration: 250,
            onComplete: () => {
              if (forward) {
                this.populatePageContainer(this.summaryPageContainer);
                if (this.cursor===Page.MOVES) {
                  this.moveCursorObj = null;
                  this.showMoveSelect();
                  this.showMoveEffect();
                }
              } else {
                this.summaryPageTransitionContainer.x -= 214;
              }
              this.summaryPageTransitionContainer.setVisible(false);
              this.transitioning = false;
              this._summaryPattern?.redraw();
            }
          });
          this.summaryPageTransitionContainer.setVisible(true);
        } else {
          this.populatePageContainer(this.summaryPageContainer);
          this.summaryPageContainer.setVisible(true);
        }
      }
    }

    return changed;
  }

  populatePageContainer(pageContainer: Phaser.GameObjects.Container, page?: Page) {
    if (page === undefined) {
      page = this.cursor;
    }

    if (pageContainer.getAll().length > 1) {
      pageContainer.each((o: Phaser.GameObjects.GameObject) => {
        if (o instanceof Phaser.GameObjects.Container) {
          o.removeAll(true);
        }
      });
      pageContainer.removeBetween(1, undefined, true);
    }
    const pageBg =  (pageContainer.getAt(0) as Phaser.GameObjects.Sprite);
    pageBg.setTexture(this.getPageKey(page));

    if (this.descriptionScrollTween) {
      this.descriptionScrollTween.remove();
      this.descriptionScrollTween = null;
    }

    switch (page) {
    case Page.PROFILE:
      const profileContainer = this.scene.add.container(0, -pageBg.height);
      pageContainer.add(profileContainer);

      const profileLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.PROFILE.x,
        LABEL_CONSTANTS.PROFILE.y,
        i18next.t("pokemonSummary:profile"),
        LABEL_CONSTANTS.PROFILE.style,
        { fontSize: LABEL_CONSTANTS.PROFILE.fontSize }
      );
      profileLabel.setOrigin(0, 0);
      profileContainer.add(profileLabel);

      const trainerText = addBBCodeTextObject(this.scene, 7, 12, `${i18next.t("pokemonSummary:ot")}/${getBBCodeFrag(loggedInUser?.username || i18next.t("pokemonSummary:unknown"), this.scene.gameData.gender === PlayerGender.FEMALE ? TextStyle.SUMMARY_PINK : TextStyle.SUMMARY_BLUE)}`, TextStyle.SUMMARY_ALT);
      trainerText.setOrigin(0, 0);
      profileContainer.add(trainerText);

      const idNoLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.ID_NO.x,
        LABEL_CONSTANTS.ID_NO.y,
        i18next.t("pokemonSummary:idNo"),
        LABEL_CONSTANTS.ID_NO.style,
        { fontSize: LABEL_CONSTANTS.ID_NO.fontSize }
      );
      idNoLabel.setOrigin(0, 0);
      profileContainer.add(idNoLabel);

      const trainerIdText = addTextObject(this.scene, 174, 12, this.scene.gameData.trainerId.toString(), TextStyle.SUMMARY_ALT);
      trainerIdText.setOrigin(0, 0);
      profileContainer.add(trainerIdText);

      const typeLabel = addTextObject(this.scene, 7, 28, `${i18next.t("pokemonSummary:type")}/`, TextStyle.WINDOW_ALT);
      typeLabel.setOrigin(0, 0);
      profileContainer.add(typeLabel);

      const getTypeIcon = (index: integer, type: Type, tera: boolean = false) => {
        const xCoord = typeLabel.width * typeLabel.scale + 9 + 34 * index;
        const typeIcon = !tera
          ? this.scene.add.sprite(xCoord, 42, Utils.getLocalizedSpriteKey("types"), Type[type].toLowerCase())
          : this.scene.add.sprite(xCoord, 42, "type_tera");
        if (tera) {
          typeIcon.setScale(0.5);
          const typeRgb = getTypeRgb(type);
          typeIcon.setTint(Phaser.Display.Color.GetColor(typeRgb[0], typeRgb[1], typeRgb[2]));
        }
        typeIcon.setOrigin(0, 1);
        return typeIcon;
      };

      const types = this.pokemon?.getTypes(false, false, true)!;
      profileContainer.add(getTypeIcon(0, types[0]));
      if (types.length > 1) {
        profileContainer.add(getTypeIcon(1, types[1]));
      }
      if (this.pokemon?.isTerastallized()) {
        profileContainer.add(getTypeIcon(types.length, this.pokemon.getTeraType(), true));
      }

      this.abilityContainer = {
        labelText: addTextObject(
          this.scene,
          LABEL_CONSTANTS.ABILITY.x,
          LABEL_CONSTANTS.ABILITY.y,
          i18next.t("pokemonSummary:ability"),
          LABEL_CONSTANTS.ABILITY.style,
          { fontSize: LABEL_CONSTANTS.ABILITY.fontSize }
        ),
        ability: this.pokemon?.getAbility(true)!,
        nameText: null,
        descriptionText: null};

      this.abilityContainer.labelText.setOrigin(0, 0);

      const allAbilityInfo = [this.abilityContainer];

      if (this.pokemon?.hasPassive()) {
        this.passiveContainer = {
          labelText: addTextObject(
            this.scene,
            LABEL_CONSTANTS.PASSIVE.x,
            LABEL_CONSTANTS.PASSIVE.y,
            i18next.t("pokemonSummary:passive"),
            LABEL_CONSTANTS.PASSIVE.style,
            { fontSize: LABEL_CONSTANTS.PASSIVE.fontSize }
          ),
          ability: this.pokemon.getPassiveAbility(),
          nameText: null,
          descriptionText: null};

        this.passiveContainer.labelText.setOrigin(0, 0);
        allAbilityInfo.push(this.passiveContainer);
        this.abilityPrompt = this.scene.add.image(0, 0, !this.scene.inputController?.gamepadSupport ? "summary_profile_prompt_z" : "summary_profile_prompt_a");
        this.abilityPrompt.setPosition(8, 43);
        this.abilityPrompt.setVisible(true);
        this.abilityPrompt.setOrigin(0, 0);
        profileContainer.add(this.abilityPrompt);
      }

      allAbilityInfo.forEach(abilityInfo => {
        profileContainer.add(abilityInfo.labelText);

        abilityInfo.nameText = addTextObject(this.scene, 7, 66, abilityInfo.ability?.name!, TextStyle.SUMMARY_ALT);
        abilityInfo.nameText.setOrigin(0, 1);
        profileContainer.add(abilityInfo.nameText);

        abilityInfo.descriptionText = addTextObject(this.scene, 7, 69, abilityInfo.ability?.description!, TextStyle.WINDOW_ALT, { wordWrap: { width: 1224 } });
        abilityInfo.descriptionText.setOrigin(0, 0);
        profileContainer.add(abilityInfo.descriptionText);
        const descriptionTextMaskRect = this.scene.make.graphics({});
        descriptionTextMaskRect.setScale(6);
        descriptionTextMaskRect.fillStyle(0xFFFFFF);
        descriptionTextMaskRect.beginPath();
        descriptionTextMaskRect.fillRect(110, 90.5, 206, 31);

        const abilityDescriptionTextMask = descriptionTextMaskRect.createGeometryMask();

        abilityInfo.descriptionText.setMask(abilityDescriptionTextMask);

        const abilityDescriptionLineCount = Math.floor(abilityInfo.descriptionText.displayHeight / 14.83);
        if (abilityDescriptionLineCount > 2) {
          abilityInfo.descriptionText.setY(69);
          this.descriptionScrollTween = this.scene.tweens.add({
            targets: abilityInfo.descriptionText,
            delay: Utils.fixedInt(2000),
            loop: -1,
            hold: Utils.fixedInt(2000),
            duration: Utils.fixedInt((abilityDescriptionLineCount - 2) * 2000),
            y: `-=${14.83 * (abilityDescriptionLineCount - 2)}`
          });
        }
      });

      this.passiveContainer?.labelText.setVisible(false);
      this.passiveContainer?.nameText?.setVisible(false);
      this.passiveContainer?.descriptionText?.setVisible(false);

      const closeFragment = getBBCodeFrag("", TextStyle.WINDOW_ALT);
      const rawNature = Utils.toReadableString(Nature[this.pokemon?.getNature()!]);
      const nature = `${getBBCodeFrag(Utils.toReadableString(getNatureName(this.pokemon?.getNature()!)), TextStyle.SUMMARY_RED)}${closeFragment}`;

      const memoString = i18next.t("pokemonSummary:memoString", {
        metFragment: i18next.t(`pokemonSummary:metFragment.${this.pokemon?.metBiome === -1? "apparently": "normal"}`, {
          biome: `${getBBCodeFrag(getBiomeName(this.pokemon?.metBiome!), TextStyle.SUMMARY_RED)}${closeFragment}`,
          level: `${getBBCodeFrag(this.pokemon?.metLevel.toString()!, TextStyle.SUMMARY_RED)}${closeFragment}`,
        }),
        natureFragment: i18next.t(`pokemonSummary:natureFragment.${rawNature}`, { nature: nature })
      });

      const trainerMemoLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.TRAINER_MEMO.x,
        LABEL_CONSTANTS.TRAINER_MEMO.y,
        i18next.t("pokemonSummary:trainerMemo"),
        LABEL_CONSTANTS.TRAINER_MEMO.style,
        { fontSize: LABEL_CONSTANTS.TRAINER_MEMO.fontSize }
      );
      trainerMemoLabel.setOrigin(0, 0);
      profileContainer.add(trainerMemoLabel);

      const memoText = addBBCodeTextObject(this.scene, 7, 115, String(memoString), TextStyle.WINDOW_ALT);
      memoText.setOrigin(0, 0);
      profileContainer.add(memoText);
      break;
    case Page.STATS:
      const statsContainer = this.scene.add.container(0, -pageBg.height);
      pageContainer.add(statsContainer);

      const statsLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.STATS.x,
        LABEL_CONSTANTS.STATS.y,
        i18next.t("pokemonSummary:stats"),
        LABEL_CONSTANTS.STATS.style,
        { fontSize: LABEL_CONSTANTS.STATS.fontSize }
      );
      statsLabel.setOrigin(0, 0);
      statsContainer.add(statsLabel);

      const stats = Utils.getEnumValues(Stat) as Stat[];

      stats.forEach((stat, s) => {
        const statName = getStatName(stat);
        const rowIndex = s % 3;
        const colIndex = Math.floor(s / 3);

        const natureStatMultiplier = getNatureStatMultiplier(this.pokemon?.getNature()!, s);

        const statLabel = addTextObject(this.scene, 27 + 115 * colIndex + (colIndex === 1 ?  5 : 0), 56 + 16 * rowIndex, statName, natureStatMultiplier === 1 ? TextStyle.SUMMARY : natureStatMultiplier > 1 ? TextStyle.SUMMARY_PINK : TextStyle.SUMMARY_BLUE);
        statLabel.setOrigin(0.5, 0);
        statsContainer.add(statLabel);

        const statValueText = stat !== Stat.HP
          ? Utils.formatStat(this.pokemon?.stats[s]!)
          : `${Utils.formatStat(this.pokemon?.hp!, true)}/${Utils.formatStat(this.pokemon?.getMaxHp()!, true)}`;

        const statValue = addTextObject(this.scene, 120 + 88 * colIndex, 56 + 16 * rowIndex, statValueText, TextStyle.WINDOW_ALT);
        statValue.setOrigin(1, 0);
        statsContainer.add(statValue);
      });

      const itemModifiers = (this.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
          && m.pokemonId === this.pokemon?.id, this.playerParty) as PokemonHeldItemModifier[])
        .sort(modifierSortFunc);

      const itemsLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.ITEMS.x,
        LABEL_CONSTANTS.ITEMS.y,
        i18next.t("pokemonSummary:items"),
        LABEL_CONSTANTS.ITEMS.style,
        { fontSize: LABEL_CONSTANTS.ITEMS.fontSize }
      );
      itemsLabel.setOrigin(0, 0);
      statsContainer.add(itemsLabel);

      itemModifiers.forEach((item, i) => {
        const icon = item.getIcon(this.scene, true);

        icon.setPosition((i % 17) * 12 + 3, 14 * Math.floor(i / 17) + 22);
        statsContainer.add(icon);

        icon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 32, 32), Phaser.Geom.Rectangle.Contains);
        icon.on("pointerover", () => ModifierTooltipUtils.showForModifier(this.scene as BattleScene, item));
        icon.on("pointerout", () => ModifierTooltipUtils.hideIfNotPinned(this.scene as BattleScene));
      });

      const pkmLvl = this.pokemon?.level!;
      const pkmLvlExp = this.pokemon?.levelExp!;
      const pkmExp = this.pokemon?.exp!;
      const pkmSpeciesGrowthRate = this.pokemon?.species.growthRate!;
      const relLvExp = getLevelRelExp(pkmLvl + 1, pkmSpeciesGrowthRate);
      const expRatio = pkmLvl < this.scene.getMaxExpLevel() ? pkmLvlExp / relLvExp : 0;

      const expLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.EXP.x,
        LABEL_CONSTANTS.EXP.y,
        i18next.t("pokemonSummary:exp"),
        LABEL_CONSTANTS.EXP.style,
        { fontSize: LABEL_CONSTANTS.EXP.fontSize }
      );
      expLabel.setOrigin(0, 0);
      statsContainer.add(expLabel);
      const expBarImage = this.scene.add.image(
        LABEL_CONSTANTS.EXP_BAR.x,
        LABEL_CONSTANTS.EXP_BAR.y + 2,
        "summary_stats_exp_bar"
      );
      expBarImage.setOrigin(0, 0);
      expBarImage.setScale(0.25);
      statsContainer.add(expBarImage);

      const nextLvExpLabel = addTextObject(this.scene, 6, 128, i18next.t("pokemonSummary:nextLv"), TextStyle.SUMMARY);
      nextLvExpLabel.setOrigin(0, 0);
      statsContainer.add(nextLvExpLabel);

      const expText = addTextObject(this.scene, 208, 112, pkmExp.toString(), TextStyle.WINDOW_ALT);
      expText.setOrigin(1, 0);
      statsContainer.add(expText);

      const nextLvExp = pkmLvl < this.scene.getMaxExpLevel()
        ? getLevelTotalExp(pkmLvl + 1, pkmSpeciesGrowthRate) - pkmExp
        : 0;
      const nextLvExpText = addTextObject(this.scene, 208, 128, nextLvExp.toString(), TextStyle.WINDOW_ALT);
      nextLvExpText.setOrigin(1, 0);
      statsContainer.add(nextLvExpText);

      const expOverlay = this.scene.add.image(140, 148, "summary_stats_overlay_exp");
      expOverlay.setOrigin(0, 0);
      statsContainer.add(expOverlay);

      const expMaskRect = this.scene.make.graphics({});
      expMaskRect.setScale(6);
      expMaskRect.fillStyle(0xFFFFFF);
      expMaskRect.beginPath();
      expMaskRect.fillRect(140 + pageContainer.x, 148 + pageContainer.y + 21, Math.floor(expRatio * 64), 3);

      const expMask = expMaskRect.createGeometryMask();

      expOverlay.setMask(expMask);
      break;
    case Page.MOVES:
      this.movesContainer = this.scene.add.container(5, -pageBg.height + 26);
      pageContainer.add(this.movesContainer);

      const movesLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.MOVES.x,
        LABEL_CONSTANTS.MOVES.y,
        i18next.t("pokemonSummary:moves"),
        LABEL_CONSTANTS.MOVES.style,
        { fontSize: LABEL_CONSTANTS.MOVES.fontSize }
      );
      movesLabel.setOrigin(0, 0);
      this.movesContainer.add(movesLabel);

      this.extraMoveRowContainer = this.scene.add.container(0, 64);
      this.extraMoveRowContainer.setVisible(false);
      this.movesContainer.add(this.extraMoveRowContainer);

      const extraRowOverlay = this.scene.add.image(-2, 1, "summary_moves_overlay_row");
      extraRowOverlay.setOrigin(0, 1);
      this.extraMoveRowContainer.add(extraRowOverlay);

      const extraRowText = addTextObject(this.scene, 35, 0, this.summaryUiMode === SummaryUiMode.LEARN_MOVE && this.newMove ? this.newMove.name : i18next.t("pokemonSummary:cancel"),
        this.summaryUiMode === SummaryUiMode.LEARN_MOVE ? TextStyle.SUMMARY_PINK : TextStyle.SUMMARY);
      extraRowText.setOrigin(0, 1);
      this.extraMoveRowContainer.add(extraRowText);

      if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
        this.extraMoveRowContainer.setVisible(true);

        if (this.newMove && this.pokemon) {
          const spriteKey = Utils.getLocalizedSpriteKey("types");
          const moveType = this.pokemon.getMoveType(this.newMove);
          const newMoveTypeIcon = this.scene.add.sprite(0, 0, spriteKey, Type[moveType].toLowerCase());
          newMoveTypeIcon.setOrigin(0, 1);
          this.extraMoveRowContainer.add(newMoveTypeIcon);
        }
        const ppOverlay = this.scene.add.image(163, -1, "summary_moves_overlay_pp");
        ppOverlay.setOrigin(0, 1);
        this.extraMoveRowContainer.add(ppOverlay);

        const pp = Utils.padInt(this.newMove?.pp!, 2, "  ");
        const ppText = addTextObject(this.scene, 173, 1, `${pp}/${pp}`, TextStyle.WINDOW);
        ppText.setOrigin(0, 1);
        this.extraMoveRowContainer.add(ppText);
      }

      this.moveRowsContainer = this.scene.add.container(0, 0);
      this.movesContainer.add(this.moveRowsContainer);

      for (let m = 0; m < 4; m++) {
        const move: PokemonMove | null = this.pokemon && this.pokemon.moveset.length > m ? this.pokemon?.moveset[m] : null;
        const moveRowContainer = this.scene.add.container(0, 16 * m);
        this.moveRowsContainer.add(moveRowContainer);

        if (move && this.pokemon) {
          const spriteKey = Utils.getLocalizedSpriteKey("types");
          const moveType = this.pokemon.getMoveType(move.getMove());
          const typeIcon = this.scene.add.sprite(0, 0, spriteKey, Type[moveType].toLowerCase());
          typeIcon.setOrigin(0, 1);
          moveRowContainer.add(typeIcon);
        }

        const moveText = addTextObject(this.scene, 35, 0, move ? move.getName() : "-", TextStyle.SUMMARY);
        moveText.setOrigin(0, 1);
        moveRowContainer.add(moveText);

        const ppOverlay = this.scene.add.image(163, -1, "summary_moves_overlay_pp");
        ppOverlay.setOrigin(0, 1);
        moveRowContainer.add(ppOverlay);

        const ppText = addTextObject(this.scene, 173, 1, "--/--", TextStyle.WINDOW);
        ppText.setOrigin(0, 1);

        if (move) {
          const maxPP = move.getMovePp();
          const pp = maxPP - move.ppUsed;
          ppText.setText(`${Utils.padInt(pp, 2, "  ")}/${Utils.padInt(maxPP, 2, "  ")}`);
        }

        moveRowContainer.add(ppText);
      }

      const descriptionLabel = addTextObject(
        this.scene,
        LABEL_CONSTANTS.DESCRIPTION.x,
        LABEL_CONSTANTS.DESCRIPTION.y,
        i18next.t("pokemonSummary:description"),
        LABEL_CONSTANTS.DESCRIPTION.style,
        { fontSize: LABEL_CONSTANTS.DESCRIPTION.fontSize }
      );
      descriptionLabel.setOrigin(0, 0);
      this.movesContainer.add(descriptionLabel);

      this.moveDescriptionText = addTextObject(this.scene, 2, 84, "", TextStyle.WINDOW_ALT, { wordWrap: { width: 1212 } });
      this.movesContainer.add(this.moveDescriptionText);

      const moveDescriptionTextMaskRect = this.scene.make.graphics({});
      moveDescriptionTextMaskRect.setScale(6);
      moveDescriptionTextMaskRect.fillStyle(0xFFFFFF);
      moveDescriptionTextMaskRect.beginPath();
      moveDescriptionTextMaskRect.fillRect(112, 130, 202, 46);

      const moveDescriptionTextMask = moveDescriptionTextMaskRect.createGeometryMask();

      this.moveDescriptionText.setMask(moveDescriptionTextMask);
      break;
    }
  }

  showStatus(instant?: boolean) {
    if (this.statusVisible) {
      return;
    }
    this.statusVisible = true;
    this.scene.tweens.add({
      targets: this.statusContainer,
      x: 0,
      duration: instant ? 0 : 250,
      ease: "Sine.easeOut"
    });
  }

  hideStatus(instant?: boolean) {
    if (!this.statusVisible) {
      return;
    }
    this.statusVisible = false;
    this.scene.tweens.add({
      targets: this.statusContainer,
      x: -106,
      duration: instant ? 0 : 250,
      ease: "Sine.easeIn"
    });
  }

  getSelectedMove(): Move | null {
    if (this.cursor !== Page.MOVES) {
      return null;
    }

    if (this.moveCursor < 4 && this.pokemon && this.moveCursor < this.pokemon.moveset.length) {
      return this.pokemon.moveset[this.moveCursor]!.getMove();
    } else if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE && this.moveCursor === 4) {
      return this.newMove;
    }
    return null;
  }

  showMoveSelect() {
    this.moveSelect = true;
    this.extraMoveRowContainer.setVisible(true);
    this.selectedMoveIndex = -1;
    this.setCursor(0);
    this.showMoveEffect();
  }

  hideMoveSelect() {
    if (this.summaryUiMode === SummaryUiMode.LEARN_MOVE) {
      this.moveSelectFunction && this.moveSelectFunction(4);
      return;
    }

    this.moveSelect = false;
    this.extraMoveRowContainer.setVisible(false);
    this.moveDescriptionText.setText("");

    this.destroyBlinkCursor();
    this.hideMoveEffect();
  }

  destroyBlinkCursor() {
    if (this.moveCursorBlinkTimer) {
      this.moveCursorBlinkTimer.destroy();
      this.moveCursorBlinkTimer = null;
    }
    if (this.moveCursorObj) {
      this.moveCursorObj.destroy();
      this.moveCursorObj = null;
    }
    if (this.selectedMoveCursorObj) {
      this.selectedMoveCursorObj.destroy();
      this.selectedMoveCursorObj = null;
    }
  }

  showMoveEffect(instant?: boolean) {
    if (this.moveEffectsVisible) {
      return;
    }
    this.moveEffectsVisible = true;
    this.scene.tweens.add({
      targets: this.moveEffectContainer,
      x: 6,
      duration: instant ? 0 : 250,
      ease: "Sine.easeOut"
    });
  }

  hideMoveEffect(instant?: boolean) {
    if (!this.moveEffectsVisible) {
      return;
    }
    this.moveEffectsVisible = false;
    this.scene.tweens.add({
      targets: this.moveEffectContainer,
      x: 106,
      duration: instant ? 0 : 250,
      ease: "Sine.easeIn"
    });
  }

  clear() {
    this._summaryPattern?.clear();
    this._summaryPattern = undefined;

    super.clear();
    this.pokemon = null;
    this.cursor = -1;
    this.newMove = null;
    if (this.moveSelect) {
      this.moveSelect = false;
      this.moveSelectFunction = null;
      this.extraMoveRowContainer.setVisible(false);
      if (this.moveCursorBlinkTimer) {
        this.moveCursorBlinkTimer.destroy();
        this.moveCursorBlinkTimer = null;
      }
      if (this.moveCursorObj) {
        this.moveCursorObj.destroy();
        this.moveCursorObj = null;
      }
      if (this.selectedMoveCursorObj) {
        this.selectedMoveCursorObj.destroy();
        this.selectedMoveCursorObj = null;
      }
      this.hideMoveEffect(true);
    }
    this.summaryContainer.setVisible(false);
    this.summaryPageContainer.setVisible(false);
  }
}
