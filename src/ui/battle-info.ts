import { EnemyPokemon, default as Pokemon } from "../field/pokemon";
import { getLevelTotalExp, getLevelRelExp } from "../data/exp";
import * as Utils from "../utils";
import { addTextObject, TextStyle, getTextColor } from "./text";
import { getGenderSymbol, getGenderColor, Gender } from "../data/gender";
import { StatusEffect } from "../data/status-effect";
import BattleScene from "../battle-scene";
import { Type, getTypeRgb } from "../data/type";
import { getVariantTint } from "#app/data/variant";
import { BattleStat } from "#app/data/battle-stat";
import { adjustDuelmonIconScale, isGlitchFormKey } from "../data/pokemon-species";
import BattleFlyout from "./battle-flyout";
import { WindowVariant, addWindow } from "./ui-theme";
import i18next from "i18next";
import { allMoves } from "#app/data/move.js";
import Overrides, { DEBUG_YU_VISUAL_TUNING } from "#app/overrides";
import { Button } from "#enums/buttons";
import { TweakMetaMode, TWEAK_META_CYCLE, cycleMetaMode, formatMetaHud, tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { TweakDropdownPanel } from "./tweak/tweak-dropdown-panel";
import { FormChangeItem } from "#enums/form-change-items";
import { pokemonFormChanges, SpeciesFormChangeItemTrigger } from "#app/data/pokemon-forms";

export default class BattleInfo extends Phaser.GameObjects.Container {
  private baseY: number;

  private player: boolean;
  private mini: boolean;
  private boss: boolean;
  private bossSegments: integer;
  private offset: boolean;
  private lastName: string | null;
  private lastTeraType: Type;
  private lastStatus: StatusEffect;
  private lastHp: integer;
  private lastMaxHp: integer;
  private lastHpFrame: string | null;
  private lastExp: integer;
  private lastLevelExp: integer;
  private lastLevel: integer;
  private lastLevelCapped: boolean;
  private lastBattleStats: string;

  private box: Phaser.GameObjects.Sprite;
  private nameText: Phaser.GameObjects.Text;
  private glitchFormContainer: Phaser.GameObjects.Container;
  private glitchPokemonIcon: Phaser.GameObjects.Sprite;
  private glitchItemIcon: Phaser.GameObjects.Sprite;
  private rankContainer: Phaser.GameObjects.Container;
  private rankIcon: Phaser.GameObjects.Sprite;
  private rankText: Phaser.GameObjects.Text;
  private genderText: Phaser.GameObjects.Text;
  private ownedIcon: Phaser.GameObjects.Sprite;
  private championRibbon: Phaser.GameObjects.Sprite;
  private teraIcon: Phaser.GameObjects.Sprite;
  private shinyIcon: Phaser.GameObjects.Sprite;
  private fusionShinyIcon: Phaser.GameObjects.Sprite;
  private fusionContainer: Phaser.GameObjects.Container;
  private splicedIcon: Phaser.GameObjects.Sprite;
  private fusionSpeciesIcon: Phaser.GameObjects.Sprite;
  private iconRowContainer: Phaser.GameObjects.Container;
  private _iconRowGap: number = 0;
  private statusIndicator: Phaser.GameObjects.Sprite;
  private levelContainer: Phaser.GameObjects.Container;
  private hpBar: Phaser.GameObjects.Image;
  private hpBarSegmentDividers: Phaser.GameObjects.Rectangle[];
  private levelNumbersContainer: Phaser.GameObjects.Container;
  private hpNumbersContainer: Phaser.GameObjects.Container;
  private type1Icon: Phaser.GameObjects.Sprite;
  private type2Icon: Phaser.GameObjects.Sprite;
  private type3Icon: Phaser.GameObjects.Sprite;
  private expBar: Phaser.GameObjects.Image;
  private effectivenessContainer: Phaser.GameObjects.Container;
  private effectivenessWindow: Phaser.GameObjects.NineSlice;
  private effectivenessText: Phaser.GameObjects.Text;
  private currentEffectiveness?: string;
  private moveLevelContainer: Phaser.GameObjects.Container;

  private moveLevelWindow: Phaser.GameObjects.NineSlice;
  private moveLevelText: Phaser.GameObjects.Text;
  private currentMoveLevel?: string;
  private lastUsedMoveInfo?: { pokemonId: number, moveId: number};

  public expMaskRect: Phaser.GameObjects.Graphics;

  private statsContainer: Phaser.GameObjects.Container;
  private statsBox: Phaser.GameObjects.Sprite;
  private statValuesContainer: Phaser.GameObjects.Container;
  private statNumbers: Phaser.GameObjects.Sprite[];

  public flyoutMenu?: BattleFlyout;

  private battleStatOrder: BattleStat[];
  private battleStatOrderPlayer = [BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.ACC, BattleStat.EVA, BattleStat.SPD];
  private battleStatOrderEnemy = [BattleStat.HP, BattleStat.ATK, BattleStat.DEF, BattleStat.SPATK, BattleStat.SPDEF, BattleStat.ACC, BattleStat.EVA, BattleStat.SPD];

  constructor(scene: Phaser.Scene, x: number, y: number, player: boolean) {
    super(scene, x, y);
    this.baseY = y;
    this.player = player;
    this.mini = !player;
    this.boss = false;
    this.offset = false;
    this.lastName = null;
    this.lastTeraType = Type.UNKNOWN;
    this.lastStatus = StatusEffect.NONE;
    this.lastHp = -1;
    this.lastMaxHp = -1;
    this.lastHpFrame = null;
    this.lastExp = -1;
    this.lastLevelExp = -1;
    this.lastLevel = -1;
    this.setVisible(false);

    this.box = this.scene.add.sprite(0, 0, this.getTextureName());
    this.box.setName("box");
    this.box.setOrigin(1, 0.5);
    this.add(this.box);

    this.nameText = addTextObject(this.scene, player ? -115 : -124, player ? -15.2 : -11.2, "", TextStyle.BATTLE_INFO);
    this.nameText.setName("text_name");
    this.nameText.setOrigin(0, 0);
    this.add(this.nameText);

    this.glitchFormContainer = this.scene.add.container(0, 0);
    this.glitchFormContainer.setName("container_glitch_form");
    this.glitchFormContainer.setVisible(false);

    this.glitchPokemonIcon = this.scene.add.sprite(-14.5, -5.5, "pokemon_icons_0");
    this.glitchPokemonIcon.setOrigin(0, 0);
    this.glitchPokemonIcon.setScale(0.38);
    this.glitchFormContainer.add(this.glitchPokemonIcon);

    this.glitchItemIcon = this.scene.add.sprite(0, 0, "smitems");
    this.glitchItemIcon.setOrigin(0, 0);
    this.glitchItemIcon.setScale(0.10);
    this.glitchFormContainer.add(this.glitchItemIcon);

    this.genderText = addTextObject(this.scene, 0, 0, "", TextStyle.BATTLE_INFO);
    this.genderText.setName("text_gender");
    this.genderText.setOrigin(0, 0);
    this.genderText.setPositionRelative(this.nameText, 0, 2);
    this.add(this.genderText);

    if (!this.player) {
      this.ownedIcon = this.scene.add.sprite(0, 0, "icon_owned");
      this.ownedIcon.setName("icon_owned");
      this.ownedIcon.setVisible(false);
      this.ownedIcon.setOrigin(0, 0);
      this.ownedIcon.setPositionRelative(this.nameText, 0, 11.75);
      this.add(this.ownedIcon);

      this.championRibbon = this.scene.add.sprite(0, 0, "champion_ribbon");
      this.championRibbon.setName("icon_champion_ribbon");
      this.championRibbon.setVisible(false);
      this.championRibbon.setOrigin(0, 0);
      this.championRibbon.setPositionRelative(this.nameText, 8, 11.75);
      this.add(this.championRibbon);
    }

    this.teraIcon = this.scene.add.sprite(0, 0, "icon_tera");
    this.teraIcon.setName("icon_tera");
    this.teraIcon.setVisible(false);
    this.teraIcon.setOrigin(0, 0);
    this.teraIcon.setScale(0.5);
    this.teraIcon.setPositionRelative(this.nameText, 0, 2);
    this.teraIcon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 12, 15), Phaser.Geom.Rectangle.Contains);
    this.add(this.teraIcon);

    this.shinyIcon = this.scene.add.sprite(0, 0, "shiny_star");
    this.shinyIcon.setName("icon_shiny");
    this.shinyIcon.setVisible(false);
    this.shinyIcon.setOrigin(0, 0);
    this.shinyIcon.setScale(0.5);
    this.shinyIcon.setPositionRelative(this.nameText, 0, 2);
    this.shinyIcon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 12, 15), Phaser.Geom.Rectangle.Contains);
    this.add(this.shinyIcon);

    this.fusionShinyIcon = this.scene.add.sprite(0, 0, "shiny_star_2");
    this.fusionShinyIcon.setName("icon_fusion_shiny");
    this.fusionShinyIcon.setVisible(false);
    this.fusionShinyIcon.setOrigin(0, 0);
    this.fusionShinyIcon.setScale(0.5);
    this.fusionShinyIcon.setPosition(this.shinyIcon.x, this.shinyIcon.y);
    this.add(this.fusionShinyIcon);

    this.fusionContainer = this.scene.add.container(0, 0);
    this.fusionContainer.setName("container_fusion");
    this.fusionContainer.setVisible(false);

    this.splicedIcon = this.scene.add.sprite(3.0, -1.0, "icon_spliced");
    this.splicedIcon.setName("icon_spliced");
    this.splicedIcon.setOrigin(0, 0);
    this.splicedIcon.setScale(0.27);
    this.splicedIcon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 12, 15), Phaser.Geom.Rectangle.Contains);

    this.fusionSpeciesIcon = this.scene.add.sprite(this.splicedIcon.displayWidth + 1, 0, "pokemon_icons_1");
    this.fusionSpeciesIcon.setName("icon_fusion_species");
    this.fusionSpeciesIcon.setOrigin(0, 0);
    this.fusionSpeciesIcon.setScale(0.38);
    this.fusionContainer.add(this.fusionSpeciesIcon);
    this.fusionContainer.add(this.splicedIcon);

    this.statusIndicator = this.scene.add.sprite(0, 0, "statuses");
    this.statusIndicator.setName("icon_status");
    this.statusIndicator.setVisible(false);
    this.statusIndicator.setOrigin(0, 0);
    this.statusIndicator.setPositionRelative(this.nameText, 0, 11.5);
    this.add(this.statusIndicator);

    this.levelContainer = this.scene.add.container(player ? -41 : -50, player ? -10 : -5);
    this.levelContainer.setName("container_level");
    this.add(this.levelContainer);

    const levelOverlay = this.scene.add.image(0, 0, "overlay_lv");
    this.levelContainer.add(levelOverlay);

    this.hpBar = this.scene.add.image(player ? -61 : -71, player ? -1 : 4.5, "overlay_hp");
    this.hpBar.setName("hp_bar");
    this.hpBar.setOrigin(0);
    this.add(this.hpBar);

    this.hpBarSegmentDividers = [];

    this.levelNumbersContainer = this.scene.add.container(9.5, (this.scene as BattleScene).uiTheme ? 0 : -0.5);
    this.levelNumbersContainer.setName("container_level");
    this.levelContainer.add(this.levelNumbersContainer);

    this.rankContainer = this.scene.add.container(0, 0);
    this.rankContainer.setVisible(false);

    this.rankIcon = this.scene.add.sprite(-24.0, -0.5, "smitems", "modSoulCollected");
    this.rankIcon.setScale(0.11, 0.12);
    this.rankIcon.setOrigin(0, 0.5);
    this.rankContainer.add(this.rankIcon);

    this.rankText = addTextObject(this.scene, -19.5, 1.5, "", TextStyle.PARTY, { fontSize: "20px", color: "#ffd700" });
    this.rankText.setShadow(0, 0, undefined);
    this.rankText.setStroke("#222222", 14);
    this.rankText.setOrigin(0, 0.5);
    this.rankContainer.add(this.rankText);

    this.iconRowContainer = this.scene.add.container(0, 0);
    this.iconRowContainer.setName("container_icon_row");
    this.iconRowContainer.add(this.fusionContainer);
    this.iconRowContainer.add(this.glitchFormContainer);
    this.iconRowContainer.add(this.rankContainer);
    this.add(this.iconRowContainer);

    if (this.player) {
      this.hpNumbersContainer = this.scene.add.container(-15, 10);
      this.hpNumbersContainer.setName("container_hp");
      this.add(this.hpNumbersContainer);

      const expBar = this.scene.add.image(-98, 18, "overlay_exp");
      expBar.setName("overlay_exp");
      expBar.setOrigin(0);
      this.add(expBar);

      const expMaskRect = this.scene.make.graphics({});
      expMaskRect.setScale(6);
      expMaskRect.fillStyle(0xFFFFFF);
      expMaskRect.beginPath();
      expMaskRect.fillRect(127, 126, 85, 2);

      const expMask = expMaskRect.createGeometryMask();

      expBar.setMask(expMask);

      this.expBar = expBar;
      this.expMaskRect = expMaskRect;
    }

    this.statsContainer = this.scene.add.container(0, 0);
    this.statsContainer.setName("container_stats");
    this.statsContainer.setAlpha(0);
    this.add(this.statsContainer);

    this.statsBox = this.scene.add.sprite(0, 0, `${this.getTextureName()}_stats`);
    this.statsBox.setName("box_stats");
    this.statsBox.setOrigin(1, 0.5);
    this.statsContainer.add(this.statsBox);

    const statLabels: Phaser.GameObjects.Sprite[] = [];
    this.statNumbers = [];

    this.statValuesContainer = this.scene.add.container(0, 0);
    this.statsContainer.add(this.statValuesContainer);
    const startingX = this.player ? -this.statsBox.width + 8 : -this.statsBox.width;
    if (!this.player) {
      console.log(`[BattleInfo-Stats] enemy statsBox.width=${this.statsBox.width} statsBox.height=${this.statsBox.height} startingX=${startingX} BattleInfo.x=${this.x} BattleInfo.y=${this.y} statValuesContainer.x=${this.statValuesContainer.x} statValuesContainer.y=${this.statValuesContainer.y} statsContainer.x=${this.statsContainer.x} statsContainer.y=${this.statsContainer.y}`);
    }
    const paddingX = this.player ? 4 : 2;
    const statOverflow = this.player ? 1 : 0;
    this.battleStatOrder = this.player ? this.battleStatOrderPlayer : this.battleStatOrderEnemy;

    this.battleStatOrder.map((s, i) => {
      const statX = i > statOverflow ? this.statNumbers[Math.max(i - 2, 0)].x + this.statNumbers[Math.max(i - 2, 0)].width + paddingX : startingX;

      const baseY = -this.statsBox.height / 2 + 4;
      let statY: number;
      if (this.battleStatOrder[i] === BattleStat.SPD || this.battleStatOrder[i] === BattleStat.HP) {
        statY = baseY + 5;
      } else {
        statY = baseY + (!!(i % 2) === this.player ? 10 : 0);
      }

      const statFrame = this.battleStatOrder[i] === BattleStat.HP ? "ATK" : BattleStat[s];
      const statLabel = this.scene.add.sprite(statX, statY, "pbinfo_stat", statFrame);
      statLabel.setName("icon_stat_label_" + i.toString());
      statLabel.setOrigin(0, 0);
      statLabels.push(statLabel);
      this.statValuesContainer.add(statLabel);

      const statNumber = this.scene.add.sprite(statX + statLabel.width, statY, "pbinfo_stat_numbers", this.battleStatOrder[i] !== BattleStat.HP ? "3" : "0");
      statNumber.setName("icon_stat_number_" + i.toString());
      statNumber.setOrigin(0, 0);
      this.statNumbers.push(statNumber);
      this.statValuesContainer.add(statNumber);

      if (this.battleStatOrder[i] === BattleStat.HP) {
        statLabel.setVisible(false);
        statNumber.setVisible(false);
      }

    });

    if (!this.player) {
      this.flyoutMenu = new BattleFlyout(this.scene, this.player);
      this.add(this.flyoutMenu);

      this.moveBelow<Phaser.GameObjects.GameObject>(this.flyoutMenu, this.box);
    }

    this.type1Icon = this.scene.add.sprite(player ? -139 : -15, player ? -17 : -15.5, `pbinfo_${player ? "player" : "enemy"}_type1`);
    this.type1Icon.setName("icon_type_1");
    this.type1Icon.setOrigin(0, 0);
    this.add(this.type1Icon);

    this.moveLevelContainer = this.scene.add.container(player ? -300 : 0, 0);
    this.add(this.moveLevelContainer);

    this.moveLevelText = addTextObject(this.scene, 5, 4.5, "", TextStyle.BATTLE_INFO);
    this.moveLevelWindow = addWindow((this.scene as BattleScene), 0, 0, 130, 20, undefined, false, undefined, undefined, WindowVariant.XTHIN);

    this.moveLevelContainer.add(this.moveLevelWindow);
    this.moveLevelContainer.add(this.moveLevelText);

    this.moveLevelContainer.setVisible(false);
    this.type2Icon = this.scene.add.sprite(player ? -139 : -15, player ? -1 : -2.5, `pbinfo_${player ? "player" : "enemy"}_type2`);
    this.type2Icon.setName("icon_type_2");
    this.type2Icon.setOrigin(0, 0);
    this.add(this.type2Icon);

    this.type3Icon = this.scene.add.sprite(player ? -154 : 0, player ? -17 : -15.5, `pbinfo_${player ? "player" : "enemy"}_type`);
    this.type3Icon.setName("icon_type_3");
    this.type3Icon.setOrigin(0, 0);
    this.add(this.type3Icon);

    if (!this.player) {
      this.effectivenessContainer = this.scene.add.container(0, 0);
      this.effectivenessContainer.setPositionRelative(this.type1Icon, 22, 4);
      this.effectivenessContainer.setVisible(false);
      this.add(this.effectivenessContainer);

      this.effectivenessText = addTextObject(this.scene, 5, 4.5, "", TextStyle.BATTLE_INFO);
      this.effectivenessWindow = addWindow((this.scene as BattleScene), 0, 0, 0, 20, undefined, false, undefined, undefined, WindowVariant.XTHIN);

      this.effectivenessContainer.add(this.effectivenessWindow);
      this.effectivenessContainer.add(this.effectivenessText);

      this.moveLevelContainer.setVisible(false);
    }
  }

  getStatsValueContainer(): Phaser.GameObjects.Container {
    return this.statValuesContainer;
  }

  initInfo(pokemon: Pokemon) {
    this.updateNameText(pokemon);
    const nameTextWidth = this.nameText.displayWidth;

    this.name = pokemon.getNameToRender();
    this.box.name = pokemon.getNameToRender();

    this.flyoutMenu?.initInfo(pokemon);

    this.genderText.setText(getGenderSymbol(pokemon.gender));
    this.genderText.setColor(getGenderColor(pokemon.gender));
    this.genderText.setPositionRelative(this.nameText, nameTextWidth, 0);

    this.lastTeraType = pokemon.getTeraType();

    this.teraIcon.setPositionRelative(this.nameText, nameTextWidth + this.genderText.displayWidth + 1, 2);
    this.teraIcon.setVisible(this.lastTeraType !== Type.UNKNOWN);
    if (this.lastTeraType !== Type.UNKNOWN) {
      this.teraIcon.setTintFill(Phaser.Display.Color.GetColor(...getTypeRgb(this.lastTeraType)));
    }
    this.teraIcon.on("pointerover", () => {
      if ((this.scene as BattleScene).uiEditModeActive) return;
      if (this.lastTeraType !== Type.UNKNOWN) {
        (this.scene as BattleScene).ui.showTooltip("", `${Utils.toReadableString(Type[this.lastTeraType])} Terastallized`);
      }
    });
    this.teraIcon.on("pointerout", () => { if (!(this.scene as BattleScene).uiEditModeActive) (this.scene as BattleScene).ui.hideTooltip(); });

    const isFusion = pokemon.isFusion();

    this.fusionContainer.setVisible(isFusion);
    if (isFusion) {
      this.splicedIcon.off("pointerover");
      this.splicedIcon.off("pointerout");
      this.splicedIcon.on("pointerover", () => {
        if ((this.scene as BattleScene).uiEditModeActive) return;
        const primary = pokemon.species.getName(pokemon.formIndex);
        const fusion = pokemon.fusionSpecies?.getName(pokemon.fusionFormIndex) || "";
        (this.scene as BattleScene).ui.showTooltip(
          i18next.t("battleInfo:fusionTooltipTitle"),
            i18next.t("battleInfo:fusionTooltipBody", { primary, fusion }).split("\n\n")[0]
        );
      });
      this.splicedIcon.on("pointerout", () => { if (!(this.scene as BattleScene).uiEditModeActive) (this.scene as BattleScene).ui.hideTooltip(); });
    }

    if (isFusion && pokemon.fusionSpecies) {
      this.fusionSpeciesIcon.setTexture(pokemon.getFusionIconAtlasKey());
      this.fusionSpeciesIcon.setFrame(pokemon.getFusionIconId());
      this.fusionSpeciesIcon.setScale(
        adjustDuelmonIconScale(0.38, pokemon.fusionSpecies.generation) + -0.08
      );
      this.fusionSpeciesIcon.setPosition(
        (this.splicedIcon.displayWidth + 1) + -8.0,
        -5.5
      );
    }

    this.layoutRow2Groups(pokemon);

    const doubleShiny = isFusion && pokemon.shiny && pokemon.fusionShiny;
    const baseVariant = !doubleShiny ? pokemon.getVariant() : pokemon.variant;

    this.shinyIcon.setPositionRelative(this.nameText, nameTextWidth + this.genderText.displayWidth + 1 + (this.teraIcon.visible ? this.teraIcon.displayWidth + 1 : 0), 2.5);
    this.shinyIcon.setTexture(`shiny_star${doubleShiny ? "_1" : ""}`);
    this.shinyIcon.setVisible(pokemon.isShiny());
    this.shinyIcon.setTint(getVariantTint(baseVariant));
    if (this.shinyIcon.visible) {
      const shinyDescriptor = doubleShiny || baseVariant ?
        `${baseVariant === 2 ? i18next.t("common:epicShiny") : baseVariant === 1 ? i18next.t("common:rareShiny") : i18next.t("common:commonShiny")}${doubleShiny ? `/${pokemon.fusionVariant === 2 ? i18next.t("common:epicShiny") : pokemon.fusionVariant === 1 ? i18next.t("common:rareShiny") : i18next.t("common:commonShiny")}` : ""}`
          : "";
      this.shinyIcon.on("pointerover", () => { if (!(this.scene as BattleScene).uiEditModeActive) (this.scene as BattleScene).ui.showTooltip("", `${i18next.t("common:shinyOnHover")}${shinyDescriptor ? ` (${shinyDescriptor})` : ""}`); });
      this.shinyIcon.on("pointerout", () => { if (!(this.scene as BattleScene).uiEditModeActive) (this.scene as BattleScene).ui.hideTooltip(); });
    }

    this.fusionShinyIcon.setPosition(this.shinyIcon.x, this.shinyIcon.y);
    this.fusionShinyIcon.setVisible(doubleShiny);
    if (isFusion) {
      this.fusionShinyIcon.setTint(getVariantTint(pokemon.fusionVariant));
    }

    if (!this.player) {
      if (this.nameText.visible) {
        this.nameText.on("pointerover", () => { if (!(this.scene as BattleScene).uiEditModeActive) (this.scene as BattleScene).ui.showTooltip("", i18next.t("battleInfo:generation", { generation: i18next.t(`starterSelectUiHandler:gen${pokemon.species.generation}`) })); });
        this.nameText.on("pointerout", () => { if (!(this.scene as BattleScene).uiEditModeActive) (this.scene as BattleScene).ui.hideTooltip(); });
      }

      const dexEntry = pokemon.scene.gameData.dexData[pokemon.species.speciesId];
      this.ownedIcon.setVisible(!!dexEntry.caughtAttr);
      const opponentPokemonDexAttr = pokemon.getDexAttr();
      const battleInfoStarterEntry = pokemon.scene.gameData.starterData[pokemon.species.getRootSpeciesId()];
      const battleInfoStarterEntryFusion = pokemon.scene.gameData.starterData[pokemon.species.getRootSpeciesId(true)];
      if (pokemon.scene.gameMode.isClassic) {
        if ((battleInfoStarterEntry?.classicWinCount ?? 0) > 0 && (battleInfoStarterEntryFusion?.classicWinCount ?? 0) > 0) {
          this.championRibbon.setVisible(true);
        }
      }

      if (Overrides.DEBUG_EMULATE_CAUGHT) {
        this.ownedIcon.setVisible(true);
        this.ownedIcon.clearTint();
      }
      if (Overrides.DEBUG_EMULATE_CHAMPION_RIBBON && this.championRibbon) {
        this.championRibbon.setVisible(true);
      }

      const missingDexAttrs = ((dexEntry.caughtAttr & opponentPokemonDexAttr) < opponentPokemonDexAttr);

      const ownedAbilityAttrs = battleInfoStarterEntry?.abilityAttr ?? 0;

      let playerOwnsThisAbility = false;

      if ((ownedAbilityAttrs & 1) > 0 && pokemon.hasSameAbilityInRootForm(0)) {
        playerOwnsThisAbility = true;
      }
      if ((ownedAbilityAttrs & 2) > 0 && pokemon.hasSameAbilityInRootForm(1)) {
        playerOwnsThisAbility = true;
      }
      if ((ownedAbilityAttrs & 4) > 0 && pokemon.hasSameAbilityInRootForm(2)) {
        playerOwnsThisAbility = true;
      }

      if (missingDexAttrs || !playerOwnsThisAbility) {
        this.ownedIcon.setTint(0x808080);
      }

      if (this.boss) {
        this.updateBossSegmentDividers(pokemon as EnemyPokemon);
      }
    }

    this.hpBar.setScale(pokemon.getHpRatio(true), 1);
    this.lastHpFrame = this.hpBar.scaleX > 0.5 ? "high" : this.hpBar.scaleX > 0.25 ? "medium" : "low";
    this.hpBar.setFrame(this.lastHpFrame);
    if (this.player) {
      this.setHpNumbers(pokemon.hp, pokemon.getMaxHp());
    }
    this.lastHp = pokemon.hp;
    this.lastMaxHp = pokemon.getMaxHp();

    this.setLevel(pokemon.level);
    this.setRank(pokemon);
    this.lastLevel = pokemon.level;

    this.shinyIcon.setVisible(pokemon.isShiny());

    const types = pokemon.getTypes(true);
    this.type1Icon.setTexture(`pbinfo_${this.player ? "player" : "enemy"}_type${types.length > 1 ? "1" : ""}`);
    this.type1Icon.setFrame(Type[types[0]].toLowerCase());
    this.type2Icon.setVisible(types.length > 1);
    this.type3Icon.setVisible(types.length > 2);
    if (types.length > 1) {
      this.type2Icon.setFrame(Type[types[1]].toLowerCase());
    }
    if (types.length > 2) {
      this.type3Icon.setFrame(Type[types[2]].toLowerCase());
    }

    if (this.player) {
      const relLevelExp = getLevelRelExp(pokemon.level + 1, pokemon.species.growthRate);
      const ratio = relLevelExp ? (pokemon.levelExp / relLevelExp) : 0;
      this.expMaskRect.x = Math.min(Math.max(ratio, 0), 1) * 510;
      this.lastExp = pokemon.exp;
      this.lastLevelExp = pokemon.levelExp;

      this.statValuesContainer.setPosition(8, 7);
    }

    const battleStats = this.battleStatOrder.map(() => 0);

    this.lastBattleStats = battleStats.join("");
    this.updateBattleStats(battleStats);
  }

  getTextureName(): string {
    return `pbinfo_${this.player ? "player" : "enemy"}${!this.player && this.boss ? "_boss" : this.mini ? "_mini" : ""}`;
  }

  setMini(mini: boolean): void {
    if (this.mini === mini) {
      return;
    }

    this.mini = mini;

    this.box.setTexture(this.getTextureName());
    this.statsBox.setTexture(`${this.getTextureName()}_stats`);

    if (this.player) {
      this.y -= 12 * (mini ? 1 : -1);
      this.baseY = this.y;
    }

    const offsetElements = [ this.nameText, this.genderText, this.teraIcon, this.shinyIcon, this.fusionShinyIcon, this.statusIndicator, this.levelContainer, this.moveLevelContainer, this.iconRowContainer ];
    offsetElements.forEach(el => el.y += 1.5 * (mini ? -1 : 1));

    [ this.type1Icon, this.type2Icon, this.type3Icon ].forEach(el => {
      el.x += 4 * (mini ? 1 : -1);
      el.y += -8 * (mini ? 1 : -1);
    });

    this.statValuesContainer.x += 2 * (mini ? 1 : -1);
    this.statValuesContainer.y += -7 * (mini ? 1 : -1);

    const toggledElements = [ this.hpNumbersContainer, this.expBar ];
    toggledElements.forEach(el => el.setVisible(!mini));
  }

  toggleStats(visible: boolean): void {
    if (visible && !this.player) {
      console.log("[BattleInfo-Stats-Toggle] enemy boss=" + this.boss + " BattleInfo.x=" + this.x + " BattleInfo.y=" + this.y + " statsContainer.x=" + this.statsContainer.x + " statsContainer.y=" + this.statsContainer.y + " statValuesContainer.x=" + this.statValuesContainer.x + " statValuesContainer.y=" + this.statValuesContainer.y);
      if (this.statNumbers && this.statNumbers.length > 0) {
        console.log("[BattleInfo-Stats-Toggle] first stat label x=" + this.statNumbers[0].x + " last stat label x=" + this.statNumbers[this.statNumbers.length - 1].x);
      }
    }
    this.scene.tweens.add({
      targets: this.statsContainer,
      duration: Utils.fixedInt(125),
      ease: "Sine.easeInOut",
      alpha: visible ? 1 : 0
    });
  }
  updateBossSegments(pokemon: EnemyPokemon): void {
    const boss = !!pokemon.bossSegments;
    this.statsContainer.x = boss ? 0 : -20;
    this.statsBox.x = boss ? 0 : 20;

    if (boss !== this.boss) {
      this.boss = boss;
      console.log("[BattleInfo-Boss] switching boss=" + boss + " statValuesContainer.x before=" + this.statValuesContainer.x);

      [ this.nameText, this.genderText, this.teraIcon, this.shinyIcon, this.fusionShinyIcon, this.ownedIcon, this.championRibbon, this.statusIndicator, this.levelContainer, this.statValuesContainer, this.iconRowContainer ].map(e => e.x += 48 * (boss ? -1 : 1));
      this.hpBar.x += 38 * (boss ? -1 : 1);
      this.hpBar.y += 2 * (this.boss ? -1 : 1);
      this.hpBar.setTexture(`overlay_hp${boss ? "_boss" : ""}`);
      this.box.setTexture(this.getTextureName());
      this.statsBox.setTexture(`${this.getTextureName()}_stats`);
    }

    this.bossSegments = boss ? pokemon.bossSegments : 0;
    this.updateBossSegmentDividers(pokemon);
  }

  updateBossSegmentDividers(pokemon: EnemyPokemon): void {
    while (this.hpBarSegmentDividers.length) {
      this.hpBarSegmentDividers.pop()?.destroy();
    }

    if (this.boss && this.bossSegments > 1) {
      const uiTheme = (this.scene as BattleScene).uiTheme;
      const maxHp = pokemon.getMaxHp();
      for (let s = 1; s < this.bossSegments; s++) {
        const dividerX = (Math.round((maxHp / this.bossSegments) * s) /  maxHp) * this.hpBar.width;
        const divider = this.scene.add.rectangle(0, 0, 1, this.hpBar.height - (uiTheme ? 0 : 1), pokemon.bossSegmentIndex >= s ? 0xFFFFFF : 0x404040);
        divider.setOrigin(0.5, 0);
        divider.setName("hpBar_divider_" + s.toString());
        this.add(divider);
        this.moveBelow(divider as Phaser.GameObjects.GameObject, this.statsContainer);

        divider.setPositionRelative(this.hpBar, dividerX, uiTheme ? 0 : 1);
        this.hpBarSegmentDividers.push(divider);
      }
    }
  }

  setOffset(offset: boolean): void {
    if (this.offset === offset) {
      return;
    }

    this.offset = offset;

    this.x += 10 * (this.offset === this.player ? 1 : -1);
    this.y += 27 * (this.offset ? 1 : -1);
    this.baseY = this.y;
  }

  updateInfo(pokemon: Pokemon, instant?: boolean): Promise<void> {
    return new Promise(resolve => {
      if (!this.scene) {
        return resolve();
      }

      const nameUpdated = this.lastName !== pokemon.getNameToRender();

      if (nameUpdated) {
        this.updateNameText(pokemon);
        this.genderText.setPositionRelative(this.nameText, this.nameText.displayWidth, 0);
      }

      const teraType = pokemon.getTeraType();
      const teraTypeUpdated = this.lastTeraType !== teraType;

      if (teraTypeUpdated) {
        this.teraIcon.setVisible(teraType !== Type.UNKNOWN);
        this.teraIcon.setPositionRelative(this.nameText, this.nameText.displayWidth + this.genderText.displayWidth + 1, 2);
        this.teraIcon.setTintFill(Phaser.Display.Color.GetColor(...getTypeRgb(teraType)));
        this.lastTeraType = teraType;
      }

      if (nameUpdated || teraTypeUpdated) {
        this.fusionContainer.setVisible(!!pokemon.fusionSpecies);

        this.teraIcon.setPositionRelative(this.nameText, this.nameText.displayWidth + this.genderText.displayWidth + 1, 2);

        if (this.fusionContainer.visible && pokemon.fusionSpecies) {
          this.fusionSpeciesIcon.setTexture(pokemon.getFusionIconAtlasKey());
          this.fusionSpeciesIcon.setFrame(pokemon.getFusionIconId());
          this.fusionSpeciesIcon.setScale(
            adjustDuelmonIconScale(0.38, pokemon.fusionSpecies.generation) + -0.08
          );
          this.fusionSpeciesIcon.setPosition(
            (this.splicedIcon.displayWidth + 1) + -8.0,
            -5.5
          );
        }

        this.shinyIcon.setPositionRelative(this.nameText, this.nameText.displayWidth + this.genderText.displayWidth + 1 + (this.teraIcon.visible ? this.teraIcon.displayWidth + 1 : 0), 2.5);

        this.layoutRow2Groups(pokemon);
      }

      const showGlitchHint = Overrides.DEBUG_EMULATE_GLITCH_FORM || (!pokemon.isGlitchOrSmittyForm() && !pokemon.isSignature && !pokemon.altBuildId);
      if(showGlitchHint) {
        const glitchFormName = Overrides.DEBUG_EMULATE_GLITCH_FORM
          ? pokemon.species.getGlitchFormName(true)
          : pokemon.species.getGlitchFormName(false, this.scene as BattleScene);
        if (glitchFormName || Overrides.DEBUG_EMULATE_GLITCH_FORM) {
          const iconAtlasKey = pokemon.getIconAtlasKey();
          const iconId = pokemon.getIconId(false);
          this.glitchPokemonIcon.setTexture(iconAtlasKey);
          this.glitchPokemonIcon.setFrame(iconId);
          this.glitchPokemonIcon.setScale(adjustDuelmonIconScale(0.38, pokemon.species.generation) + -0.08);
          this.glitchPokemonIcon.setPosition(
            -14.5,
            -5.5
          );

          const formChangeItem = this.getGlitchFormChangeItem(pokemon);
          const itemFrame = formChangeItem !== null
            ? this.getSmitemFrame(formChangeItem)
            : (Overrides.DEBUG_EMULATE_GLITCH_FORM ? "glitchFruit" : null);
          if (itemFrame) {
            this.glitchItemIcon.setTexture("smitems");
            this.glitchItemIcon.setFrame(itemFrame);
            this.glitchItemIcon.setScale(0.10);
            this.glitchItemIcon.setPosition(
              (this.glitchPokemonIcon.displayWidth - 8) + -12.0,
              -1 + -1.5
            );
            this.glitchItemIcon.setVisible(true);
          } else {
            this.glitchItemIcon.setVisible(false);
          }

          this.glitchFormContainer.setVisible(true);
        } else {
          this.glitchFormContainer.setVisible(false);
        }
      } else {
        this.glitchFormContainer.setVisible(false);
      }

      this.layoutRow2Groups(pokemon);

      const wasMoveLevelVisible = this.moveLevelContainer?.visible || false;

      if (this.lastStatus !== (pokemon.status?.effect || StatusEffect.NONE)) {
        this.lastStatus = pokemon.status?.effect || StatusEffect.NONE;

        if (this.lastStatus !== StatusEffect.NONE) {
          this.statusIndicator.setFrame(StatusEffect[this.lastStatus].toLowerCase());
        }

        const offsetX = !this.player ? (this.ownedIcon.visible ? 8 : 0) + (this.championRibbon.visible ? 8 : 0) : 0;
        this.statusIndicator.setPositionRelative(this.nameText, offsetX, 11.5);

        this.statusIndicator.setVisible(!!this.lastStatus);
      }

      const types = pokemon.getTypes(true);
      this.type1Icon.setTexture(`pbinfo_${this.player ? "player" : "enemy"}_type${types.length > 1 ? "1" : ""}`);
      this.type1Icon.setFrame(Type[types[0]].toLowerCase());
      this.type2Icon.setVisible(types.length > 1);
      this.type3Icon.setVisible(types.length > 2);
      if (types.length > 1) {
        this.type2Icon.setFrame(Type[types[1]].toLowerCase());
      }
      if (types.length > 2) {
        this.type3Icon.setFrame(Type[types[2]].toLowerCase());
      }

      const updateHpFrame = () => {
        const hpFrame = this.hpBar.scaleX > 0.5 ? "high" : this.hpBar.scaleX > 0.25 ? "medium" : "low";
        if (hpFrame !== this.lastHpFrame) {
          this.hpBar.setFrame(hpFrame);
          this.lastHpFrame = hpFrame;
        }
      };

      const updatePokemonHp = () => {
        let duration = !instant ? Utils.clampInt(Math.abs((this.lastHp) - pokemon.hp) * 5, 250, 5000) : 0;
        const speed = (this.scene as BattleScene).hpBarSpeed;
        if (speed) {
          duration = speed >= 3 ? 0 : duration / Math.pow(2, speed);
        }
        this.scene.tweens.add({
          targets: this.hpBar,
          ease: "Sine.easeOut",
          scaleX: pokemon.getHpRatio(true),
          duration: duration,
          onUpdate: () => {
            if (this.player && this.lastHp !== pokemon.hp) {
              const tweenHp = Math.ceil(this.hpBar.scaleX * pokemon.getMaxHp());
              this.setHpNumbers(tweenHp, pokemon.getMaxHp());
              this.lastHp = tweenHp;
            }

            updateHpFrame();
          },
          onComplete: () => {
            updateHpFrame();

            if (wasMoveLevelVisible && this.player && this.lastUsedMoveInfo && !this.flyoutMenu?.flyoutVisible) {
              this.updateMoveLevel(
                this.lastUsedMoveInfo.pokemonId,
                this.lastUsedMoveInfo.moveId
              );
            }

            resolve();
          }
        });
        if (!this.player) {
          this.lastHp = pokemon.hp;
        }
        this.lastMaxHp = pokemon.getMaxHp();
      };

      if (this.player) {
        const isLevelCapped = pokemon.level >= (this.scene as BattleScene).getMaxExpLevel();

        if ((this.lastExp !== pokemon.exp || this.lastLevel !== pokemon.level)) {
          const originalResolve = resolve;
          const durationMultipler = Math.max(Phaser.Tweens.Builders.GetEaseFunction("Cubic.easeIn")(1 - (Math.min(pokemon.level - this.lastLevel, 10) / 10)), 0.1);
          resolve = () => this.updatePokemonExp(pokemon, false, durationMultipler).then(() => {
            if (wasMoveLevelVisible && this.player && this.lastUsedMoveInfo && !this.flyoutMenu?.flyoutVisible) {
              this.updateMoveLevel(
                this.lastUsedMoveInfo.pokemonId,
                this.lastUsedMoveInfo.moveId
              );
            }
            originalResolve();
          });
        } else if (isLevelCapped !== this.lastLevelCapped) {
          this.setLevel(pokemon.level);
          this.setRank(pokemon);
        }

        this.lastLevelCapped = isLevelCapped;
      }

      if (this.lastHp !== pokemon.hp || this.lastMaxHp !== pokemon.getMaxHp()) {
        return updatePokemonHp();
      } else if (!this.player && this.lastLevel !== pokemon.level) {
        this.setLevel(pokemon.level);
        this.setRank(pokemon);
        this.lastLevel = pokemon.level;
      }

      const battleStats = pokemon.summonData
          ? pokemon.summonData.battleStats
        : this.battleStatOrder.map(() => 0);
      const battleStatsStr = battleStats.join("");

      if (this.lastBattleStats !== battleStatsStr) {
        this.updateBattleStats(battleStats);
        this.lastBattleStats = battleStatsStr;
      }

      this.shinyIcon.setVisible(pokemon.isShiny());

      if (wasMoveLevelVisible && this.player && this.lastUsedMoveInfo && !this.flyoutMenu?.flyoutVisible) {
        this.updateMoveLevel(
          this.lastUsedMoveInfo.pokemonId,
          this.lastUsedMoveInfo.moveId
        );
      }

      this.setRank(pokemon);
      resolve();
    });
  }

  private static readonly NAME_DEFAULT_SCALE = 0.1666666667;

  updateNameText(pokemon: Pokemon): void {
    const displayName = pokemon.getNameToRender().replace(/[♂♀]/g, "");

    this.nameText.setScale(BattleInfo.NAME_DEFAULT_SCALE);
    this.nameText.setText(displayName);

    const maxWidth = (this.player ? 80 : (this.boss ? 98 : 80))
        - ((pokemon.gender !== Gender.GENDERLESS ? 6 : 0)
        + (pokemon.isShiny() ? 8 : 0)
        + (pokemon.getTeraType() !== Type.UNKNOWN ? 12 : 0)
        + (Math.min(pokemon.level.toString().length, 3) - 3) * 8);

    const condenseTrigger = displayName.length >= 15 && !this.boss
        ? maxWidth * 0.82
        : maxWidth;
    if (this.nameText.displayWidth > condenseTrigger) {
        const ratio = condenseTrigger / this.nameText.displayWidth;
        this.nameText.setScale(this.nameText.scaleX * ratio, this.nameText.scaleY);
    }

    const isDuelmon = pokemon.species?.generation === 20;
    const isFusion = pokemon.isFusion();
    const isShinyPkm = pokemon.isShiny();
    const isGlitchSmitty = pokemon.isGlitchOrSmittyForm();
    const nameStyle = (isDuelmon || isFusion || isShinyPkm || isGlitchSmitty)
        ? TextStyle.SUMMARY_GOLD : TextStyle.BATTLE_INFO;
    this.nameText.setColor(getTextColor(nameStyle, false, (this.scene as BattleScene).uiTheme));
    this.nameText.setShadowColor(getTextColor(nameStyle, true, (this.scene as BattleScene).uiTheme));

    this.lastName = pokemon.getNameToRender();

    if (this.nameText.visible) {
        this.nameText.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.nameText.width, this.nameText.height), Phaser.Geom.Rectangle.Contains);
    }
  }

  updatePokemonExp(pokemon: Pokemon, instant?: boolean, levelDurationMultiplier: number = 1): Promise<void> {
    return new Promise(resolve => {
      const levelUp = this.lastLevel < pokemon.level;
      const relLevelExp = getLevelRelExp(this.lastLevel + 1, pokemon.species.growthRate);
      const levelExp = levelUp ? relLevelExp : pokemon.levelExp;
      let ratio = relLevelExp ? levelExp / relLevelExp : 0;
      if (this.lastLevel >= (this.scene as BattleScene).getMaxExpLevel(true)) {
        if (levelUp) {
          ratio = 1;
        } else {
          ratio = 0;
        }
        instant = true;
      }
      const durationMultiplier = Phaser.Tweens.Builders.GetEaseFunction("Sine.easeIn")(1 - (Math.max(this.lastLevel - 100, 0) / 150));
      const duration = this.visible && !instant ? (((levelExp - this.lastLevelExp) / relLevelExp) * 1650) * durationMultiplier * levelDurationMultiplier : 0;
      if (ratio === 1) {
        this.lastLevelExp = 0;
        this.lastLevel++;
      } else {
        this.lastExp = pokemon.exp;
        this.lastLevelExp = pokemon.levelExp;
      }
      if (duration) {
        (this.scene as BattleScene).playSound("se/exp");
      }
      this.scene.tweens.add({
        targets: this.expMaskRect,
        ease: "Sine.easeIn",
        x: ratio * 510,
        duration: duration,
        onComplete: () => {
          if (!this.scene) {
            return resolve();
          }
          if (duration) {
            this.scene.sound.stopByKey("se/exp");
          }
          if (ratio === 1) {
            (this.scene as BattleScene).playSound("se/level_up");
            this.setLevel(this.lastLevel);
            this.setRank(pokemon);
            this.scene.time.delayedCall(500 * levelDurationMultiplier, () => {
              this.expMaskRect.x = 0;
              this.updateInfo(pokemon, instant).then(() => resolve());
            });
            return;
          }
          resolve();
        }
      });
    });
  }

  setLevel(level: integer): void {
    const isCapped = level >= (this.scene as BattleScene).getMaxExpLevel();
    this.levelNumbersContainer.removeAll(true);
    if(level === undefined) {
      console.log("level is undefined");
    }
    const levelStr = level.toString();
    for (let i = 0; i < levelStr.length; i++) {
      this.levelNumbersContainer.add(this.scene.add.image(i * 8, 0, `numbers${isCapped && this.player ? "_red" : ""}`, levelStr[i]));
    }
    this.levelContainer.setX((this.player ? -41 : -50) - 8 * Math.max(levelStr.length - 3, 0));
  }

  setRank(pokemon: Pokemon): void {
    const isAltBuild = !!pokemon.altBuildId;
    const displayRank = isAltBuild ? Math.max(1, pokemon.altBuildRank ?? 0) : (pokemon.rankUpCount ?? 0) + 1;
    const showRank = isAltBuild || displayRank > 1;
    const wasVisible = this.rankContainer.visible;
    if (!showRank) {
      this.rankContainer.setVisible(false);
      if (wasVisible) {
        this.setLevel(pokemon.level);
        this.layoutRow2Groups(pokemon);
      }
      return;
    }
    this.rankText.setText(Utils.intToRoman(displayRank));
    this.rankContainer.setVisible(true);
    this.setLevel(pokemon.level);
    this.layoutRow2Groups(pokemon);
  }

  private layoutRow2Groups(pokemon: Pokemon): void {
    let cursorX = 0;
    const gap = this._iconRowGap;

    if (this.fusionContainer.visible) {
      this.fusionContainer.setPosition(cursorX, 0);
      cursorX += (this.splicedIcon.displayWidth + 1 + this.fusionSpeciesIcon.displayWidth) + gap;
    }

    if (this.glitchFormContainer.visible) {
      this.glitchFormContainer.setPosition(cursorX > 0 ? cursorX + 1.5 : cursorX + 17.5, 0);
      const glitchW = this.glitchPokemonIcon.displayWidth + (this.glitchItemIcon.visible ? this.glitchItemIcon.displayWidth : 0);
      cursorX += glitchW + gap;
    }

    if (this.rankContainer.visible) {
      const isFirstGroup = cursorX === 0 && !this.fusionContainer.visible && !this.glitchFormContainer.visible;
      this.rankContainer.setPosition(isFirstGroup ? 0 : cursorX + 3.0, 0);
      const soulNudge = isFirstGroup ? 27.0 : (this.glitchFormContainer.visible ? 0 : 11.0);
      this.rankIcon.setPosition(-24.0 + soulNudge, -0.5);
      this.rankText.setPosition(-19.5 + soulNudge, 1.5);
    }

    this.iconRowContainer.setPosition(this.nameText.x, this.nameText.y + (this.player ? 23.5 : 25.0));
  }

  setHpNumbers(hp: integer, maxHp: integer): void {
    if (!this.player || !this.scene) {
      return;
    }
    this.hpNumbersContainer.removeAll(true);
    const hpStr = hp.toString();
    const maxHpStr = maxHp.toString();
    let offset = 0;
    for (let i = maxHpStr.length - 1; i >= 0; i--) {
      this.hpNumbersContainer.add(this.scene.add.image(offset++ * -8, 0, "numbers", maxHpStr[i]));
    }
    this.hpNumbersContainer.add(this.scene.add.image(offset++ * -8, 0, "numbers", "/"));
    for (let i = hpStr.length - 1; i >= 0; i--) {
      this.hpNumbersContainer.add(this.scene.add.image(offset++ * -8, 0, "numbers", hpStr[i]));
    }
  }

  updateBattleStats(battleStats: integer[]): void {
    this.battleStatOrder.map((s, i) => {
      if (s !== BattleStat.HP) {
      this.statNumbers[i].setFrame(battleStats[s].toString());
      }
    });
  }
  toggleFlyout(visible: boolean): void {
    this.flyoutMenu?.toggleFlyout(visible);

    if (visible) {
      this.effectivenessContainer?.setVisible(false);
      if (this.player) {
        this.moveLevelContainer?.setVisible(false);
        if (this.moveLevelContainer) {
          this.moveLevelContainer.alpha = 0;
        }
      }
    } else {
      this.updateEffectiveness(this.currentEffectiveness);
      if (this.player && this.lastUsedMoveInfo) {
        this.updateMoveLevel(
          this.lastUsedMoveInfo.pokemonId,
          this.lastUsedMoveInfo.moveId
        );
      }
    }
  }
  updateEffectiveness(effectiveness?: string) {
    if (this.player) {
      return;
    }
    this.currentEffectiveness = effectiveness;

    if (!(this.scene as BattleScene).typeHints || effectiveness === undefined || this.flyoutMenu?.flyoutVisible) {
      this.effectivenessContainer.setVisible(false);
      return;
    }

    this.effectivenessText.setText(effectiveness);
    this.effectivenessWindow.width = 10 + this.effectivenessText.displayWidth;
    this.effectivenessContainer.setVisible(true);
  }
  updateMoveLevel(pokemonId?: number, moveId?: number) {
    if (!this.player || pokemonId === undefined || moveId === undefined) {
      this.moveLevelContainer.setVisible(false);
      this.moveLevelContainer.alpha = 0;
      return;
    }

    const gameData = (this.scene as BattleScene).gameData;
    const moveUsageCount = gameData.moveUsageCount?.[moveId] || 0;
    const movesTotalNeeded = (this.scene as BattleScene).getCurrentUsesForLevelUp(moveId);

    const moveLevel = (this.scene as BattleScene).getUpgradesForMove(moveId).length + 1;

    const displayText = `${i18next.t("moveUpgrade:level")} ${moveLevel} (${moveUsageCount % movesTotalNeeded}/${movesTotalNeeded})`;

    if (this.flyoutMenu?.flyoutVisible) {
      this.moveLevelContainer.setVisible(false);
      this.moveLevelContainer.alpha = 0;
      return;
    }

    if (this.currentMoveLevel !== displayText) {
      this.currentMoveLevel = displayText;
      this.moveLevelText.setText(displayText);

      const padding = 20;
      this.moveLevelWindow.width = padding + this.moveLevelText.displayWidth;

      this.moveLevelContainer.setVisible(false);
      this.moveLevelContainer.alpha = 0;

      this.lastUsedMoveInfo = {
        pokemonId,
        moveId,
      };
    } else {
      this.moveLevelContainer.setVisible(false);
      this.moveLevelContainer.alpha = 0;
    }
  }

  hideMoveLevelContainer(): void {
    this.moveLevelContainer.setVisible(false);
    this.moveLevelContainer.alpha = 0;
    this.currentMoveLevel = undefined;
  }

  getBaseY(): number {
    return this.baseY;
  }

  resetY(): void {
    this.y = this.baseY;
  }

  private getGlitchFormChangeItem(pokemon: Pokemon): FormChangeItem | null {
    const changes = pokemonFormChanges[pokemon.species.speciesId] || [];
    for (const fc of changes) {
      if (isGlitchFormKey(fc.formKey)) {
        const trigger = fc.findTrigger(SpeciesFormChangeItemTrigger) as SpeciesFormChangeItemTrigger;
        if (trigger) {
          return trigger.item;
        }
      }
    }
    return null;
  }

  private getSmitemFrame(item: FormChangeItem): string {
    const GLITCH_ICON_OVERRIDES: Record<string, string> = {
      "GLITCHI_GLITCHI_FRUIT": "glitchFruit",
      "GLITCH_MASTER_PARTS": "glitchParts"
    };
    const enumName = FormChangeItem[item];
    if (GLITCH_ICON_OVERRIDES[enumName]) {
      return GLITCH_ICON_OVERRIDES[enumName];
    }
    return enumName.toLowerCase().replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  private static _biTweakSidePlayer = true;
  private static _biTweakSessionOwner: BattleInfo | null = null;

  static getBiTweakSessionOwner(): BattleInfo | null {
    return BattleInfo._biTweakSessionOwner;
  }

  static resolveBiTweakHandler(playerBi: BattleInfo | undefined, enemyBi: BattleInfo | undefined): BattleInfo | null {
    const owner = BattleInfo._biTweakSessionOwner;
    if (!owner || owner._biMetaMode === TweakMetaMode.NONE) {
      return null;
    }
    const focused = BattleInfo.isBiTweakSidePlayer() ? playerBi : enemyBi;
    if (focused && focused !== owner) {
      focused.inheritBiTweakSession(owner);
    }
    return focused ?? owner;
  }

  inheritBiTweakSession(from: BattleInfo): void {
    this._biMetaMode = from._biMetaMode;
    this._biTweakMode = from._biTweakMode;
    this._biTweakAssetIndex = from._biTweakAssetIndex;
    if (!this._biTweakHudText) {
      this.initBiTweak();
    }
    if (from !== this) {
      from._biMetaMode = TweakMetaMode.NONE;
      from.updateBiTweakHUD();
      BattleInfo._biTweakSessionOwner = this;
    }
  }

  static setBiTweakSide(player: boolean): void {
    BattleInfo._biTweakSidePlayer = player;
  }

  static isBiTweakSidePlayer(): boolean {
    return BattleInfo._biTweakSidePlayer;
  }

  private static readonly BI_TWEAK_ASSETS = [
    "TeraIcon", "SplicedIcon", "FusionSpeciesIcon",
    "ShinyIcon", "FusionShinyIcon",
    "GlitchFormText", "RankText",
    "SoulIcon", "SoulText", "GlitchSpeciesIcon", "GlitchItemIcon",
    "SoulBoth", "GlitchBoth", "FusionBoth",
    "IconRow",
  ] as const;

  private static readonly BI_TWEAK_MODES = [
    "scale", "position", "width", "height", "alpha", "fontSize", "textStyle", "textStyleOn", "zOrder", "gap",
  ] as const;

  private static readonly BI_TWEAK_ASSET_GROUPS: Record<string, string[]> = {
    Soul: ["SoulBoth", "SoulIcon", "SoulText"],
    Glitch: ["GlitchBoth", "GlitchSpeciesIcon", "GlitchItemIcon"],
    Fusion: ["FusionBoth", "SplicedIcon", "FusionSpeciesIcon"],
    Icons: ["TeraIcon", "ShinyIcon", "FusionShinyIcon"],
    Text: ["GlitchFormText", "RankText"],
    Row: ["IconRow"],
  };

  private _biMetaMode: TweakMetaMode = TweakMetaMode.NONE;
  private _biTweakMode: number = 0;
  private _biTweakAssetIndex: number = 0;
  private _biTweakBaselines: Map<string, {
    x: number; y: number; scaleX: number; scaleY: number; alpha: number;
    displayWidth: number; displayHeight: number; fontSize: number; listIndex: number;
  }> = new Map();
  private _biTweakDeltas: Map<string, {
    dx: number; dy: number; dScaleX: number; dScaleY: number; dAlpha: number;
    dFontSize: number; dWidth: number; dHeight: number; dListIndex: number;
  }> = new Map();
  private _biDropdownPanel: TweakDropdownPanel | null = null;
  private _biTweakHudText: Phaser.GameObjects.Text | null = null;
  private _biKeyVHandler: (() => void) | null = null;
  private _biKeyFiveHandler: (() => void) | null = null;

  get biTweakActive(): boolean { return this._biMetaMode !== TweakMetaMode.NONE; }

  getIconByName(name: string): Phaser.GameObjects.GameObject | null {
    switch (name) {
      case "TeraIcon": return this.teraIcon;
      case "SplicedIcon": return this.splicedIcon;
      case "FusionSpeciesIcon": return this.fusionSpeciesIcon;
      case "FusionBoth": return this.splicedIcon;
      case "ShinyIcon": return this.shinyIcon;
      case "FusionShinyIcon": return this.fusionShinyIcon;
      case "RankText": return this.rankContainer;
      case "GlitchFormText": return this.glitchFormContainer;
      case "SoulIcon": return this.rankIcon;
      case "SoulText": return this.rankText;
      case "GlitchSpeciesIcon": return this.glitchPokemonIcon;
      case "GlitchItemIcon": return this.glitchItemIcon;
      case "SoulBoth": return this.rankIcon;
      case "GlitchBoth": return this.glitchPokemonIcon;
      case "FusionBoth": return this.splicedIcon;
      case "IconRow": return this.iconRowContainer;
      default: return null;
    }
  }

  private getBiTweakTarget(index: number): Phaser.GameObjects.GameObject | null {
    switch (index) {
      case 0: return this.teraIcon;
      case 1: return this.splicedIcon;
      case 2: return this.fusionSpeciesIcon;
      case 3: return this.shinyIcon;
      case 4: return this.fusionShinyIcon;
      case 5: return this.glitchFormContainer;
      case 6: return this.rankContainer;
      case 7: return this.rankIcon;
      case 8: return this.rankText;
      case 9: return this.glitchPokemonIcon;
      case 10: return this.glitchItemIcon;
      case 11: return this.rankIcon;
      case 12: return this.glitchPokemonIcon;
      case 13: return this.splicedIcon;
      case 14: return this.iconRowContainer;
      default: return null;
    }
  }

  private captureBiTweakBaseline(name: string, target: Phaser.GameObjects.GameObject): void {
    const fontSize = target instanceof Phaser.GameObjects.Text
      ? parseInt(target.style.fontSize as string, 10) || 0
      : 0;
    this._biTweakBaselines.set(name, {
      x: target.x ?? 0,
      y: target.y ?? 0,
      scaleX: target.scaleX ?? 1,
      scaleY: target.scaleY ?? 1,
      alpha: target.alpha ?? 1,
      displayWidth: (target as Phaser.GameObjects.Image).displayWidth ?? 0,
      displayHeight: (target as Phaser.GameObjects.Image).displayHeight ?? 0,
      fontSize,
      listIndex: (target.parentContainer as Phaser.GameObjects.Container)?.getIndex?.(target) ?? 0,
    });
    if (!this._biTweakDeltas.has(name)) {
      this._biTweakDeltas.set(name, {
        dx: 0, dy: 0, dScaleX: 0, dScaleY: 0, dAlpha: 0, dFontSize: 0, dWidth: 0, dHeight: 0, dListIndex: 0,
      });
    }
  }

  captureAllBiTweakBaselines(): void {
    this._biTweakBaselines.clear();
    for (let i = 0; i < BattleInfo.BI_TWEAK_ASSETS.length; i++) {
      const t = this.getBiTweakTarget(i);
      if (t) {
        this.captureBiTweakBaseline(BattleInfo.BI_TWEAK_ASSETS[i], t);
      }
    }
  }

  ensureBiTweakBaselines(): void {
    if (this._biTweakBaselines.size === 0) {
      this.captureAllBiTweakBaselines();
    }
  }

  reapplyBiTweakDeltas(): void {
    for (let i = 0; i < BattleInfo.BI_TWEAK_ASSETS.length; i++) {
      const name = BattleInfo.BI_TWEAK_ASSETS[i];
      const target = this.getBiTweakTarget(i);
      const baseline = this._biTweakBaselines.get(name);
      const delta = this._biTweakDeltas.get(name);
      if (!target || !baseline || !delta) continue;
      const hasDelta = Math.abs(delta.dx) > 0.001 || Math.abs(delta.dy) > 0.001
        || Math.abs(delta.dScaleX) > 0.001 || Math.abs(delta.dScaleY) > 0.001
        || Math.abs(delta.dAlpha) > 0.001 || Math.abs(delta.dFontSize) > 0.001
        || Math.abs(delta.dWidth) > 0.001 || Math.abs(delta.dHeight) > 0.001;
      if (!hasDelta) continue;
      target.setPosition(baseline.x + delta.dx, baseline.y + delta.dy);
      if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
        target.setScale(baseline.scaleX + delta.dScaleX, baseline.scaleY + delta.dScaleY);
        if (delta.dWidth !== 0 || delta.dHeight !== 0) {
          const w = Math.max(1, baseline.displayWidth + delta.dWidth);
          const h = Math.max(1, baseline.displayHeight + delta.dHeight);
          if (typeof (target as Phaser.GameObjects.Image).setDisplaySize === "function") {
            (target as Phaser.GameObjects.Image).setDisplaySize(w, h);
          }
        }
      }
      target.alpha = Math.max(0, Math.min(1, baseline.alpha + delta.dAlpha));
      if (target instanceof Phaser.GameObjects.Text && delta.dFontSize !== 0) {
        target.setFontSize(`${baseline.fontSize + delta.dFontSize}px`);
      }
    }
  }

  private syncBiTweakDelta(name: string, target: Phaser.GameObjects.GameObject): void {
    const baseline = this._biTweakBaselines.get(name);
    if (!baseline) return;
    const fontSize = target instanceof Phaser.GameObjects.Text
      ? parseInt(target.style.fontSize as string, 10) || baseline.fontSize
      : baseline.fontSize;
    const dw = (target as Phaser.GameObjects.Image).displayWidth ?? baseline.displayWidth;
    const dh = (target as Phaser.GameObjects.Image).displayHeight ?? baseline.displayHeight;
    this._biTweakDeltas.set(name, {
      dx: (target.x ?? 0) - baseline.x,
      dy: (target.y ?? 0) - baseline.y,
      dScaleX: (target.scaleX ?? 1) - baseline.scaleX,
      dScaleY: (target.scaleY ?? 1) - baseline.scaleY,
      dAlpha: (target.alpha ?? 1) - baseline.alpha,
      dFontSize: fontSize - baseline.fontSize,
      dWidth: dw - baseline.displayWidth,
      dHeight: dh - baseline.displayHeight,
      dListIndex: ((target.parentContainer as Phaser.GameObjects.Container)?.getIndex?.(target) ?? 0) - baseline.listIndex,
    });
  }

  initBiTweak(): void {
    if (!DEBUG_YU_VISUAL_TUNING) return;
    this._biTweakHudText = addTextObject(
      this.scene,
      this.player ? Math.floor(this.scene.game.canvas.width / 12) : 70,
      this.player ? -12 : -12,
      "", TextStyle.WINDOW, { fontSize: "28px", color: "#00FF00", align: "center" }
    );
    this._biTweakHudText.setOrigin(0.5, 0);
    this._biTweakHudText.setDepth(2000);
    this._biTweakHudText.setVisible(false);
    this.add(this._biTweakHudText);
  }

  onBiTweakCycle(): boolean {
    if (!DEBUG_YU_VISUAL_TUNING) return false;
    const wasActive = this._biMetaMode !== TweakMetaMode.NONE;
    this._biMetaMode = cycleMetaMode(this._biMetaMode, TWEAK_META_CYCLE);
    const isActive = this._biMetaMode !== TweakMetaMode.NONE;
    BattleInfo._biTweakSessionOwner = isActive ? this : null;
    this.updateBiTweakHUD();

    if (isActive && !wasActive) {
      const bs = this.scene as BattleScene;
      if (bs.commandUiTweak?.tweakActive) {
        bs.commandUiTweak.deactivate();
      }
      if (bs.fieldSpriteTweak?.tweakActive) {
        bs.fieldSpriteTweak.deactivate();
      }
      bs.uiEditModeActive = true;
      this.captureAllBiTweakBaselines();
      this._biDropdownPanel = new TweakDropdownPanel({
        scene: this.scene as BattleScene,
        getAnchorGameCoords: () => ({ x: this.player ? 240 : 70, y: 5 }),
        elements: [...BattleInfo.BI_TWEAK_ASSETS],
        modes: [...BattleInfo.BI_TWEAK_MODES],
        views: [
          { value: "player", label: "Player" },
          { value: "enemy", label: "Enemy" },
        ],
        coordSpace: "logical",
        alphabeticalSort: false,
        elementGroups: BattleInfo.BI_TWEAK_ASSET_GROUPS,
        onViewChange: (viewIndex: number) => {
          BattleInfo.setBiTweakSide(viewIndex === 0);
          const scene = this.scene as BattleScene;
          const playerBi = scene.getPlayerField()[0]?.getBattleInfo() as BattleInfo | undefined;
          const enemyBi = scene.getEnemyField()[0]?.getBattleInfo() as BattleInfo | undefined;
          const focused = BattleInfo.resolveBiTweakHandler(playerBi, enemyBi);
          focused?.captureAllBiTweakBaselines();
          focused?.updateBiTweakHUD();
          this._biDropdownPanel?.syncElementValue(BattleInfo.BI_TWEAK_ASSETS[this._biTweakAssetIndex] || "");
        },
        onElementChange: (_name: string, idx: number) => {
          this._biTweakAssetIndex = idx;
          this.updateBiTweakHUD();
        },
        onModeChange: (_name: string, idx: number) => {
          this._biTweakMode = idx;
          this.updateBiTweakHUD();
        },
      });
      this._biDropdownPanel.create();
      this._biDropdownPanel.syncViewValue(BattleInfo.isBiTweakSidePlayer() ? "player" : "enemy");
      this._biKeyVHandler = () => {
        if (this._biMetaMode === TweakMetaMode.NONE) return;
        if (!(this.scene as BattleScene).uiEditModeActive) return;
        this.outputAllBiTweakStates();
      };
      this._biKeyFiveHandler = () => {
        if (this._biMetaMode === TweakMetaMode.NONE) return;
        this._biDropdownPanel?.toggle();
      };
      (this.scene as BattleScene).input.keyboard?.on("keydown-V", this._biKeyVHandler);
      (this.scene as BattleScene).input.keyboard?.on("keydown-FIVE", this._biKeyFiveHandler);
    } else if (!isActive && wasActive) {
      BattleInfo._biTweakSessionOwner = null;
      this._biTweakBaselines.clear();
      if (this._biDropdownPanel) {
        this._biDropdownPanel.destroy();
        this._biDropdownPanel = null;
      }
      if (this._biKeyVHandler) {
        (this.scene as BattleScene).input.keyboard?.off("keydown-V", this._biKeyVHandler);
        this._biKeyVHandler = null;
      }
      if (this._biKeyFiveHandler) {
        (this.scene as BattleScene).input.keyboard?.off("keydown-FIVE", this._biKeyFiveHandler);
        this._biKeyFiveHandler = null;
      }
    }
    return true;
  }

  processBiTweakInput(button: Button): boolean {
    if (this._biMetaMode === TweakMetaMode.NONE) return false;

    if (button === Button.CANCEL) {
      this._biMetaMode = TweakMetaMode.NONE;
      BattleInfo._biTweakSessionOwner = null;
      this._biTweakBaselines.clear();
      this.updateBiTweakHUD();
      if (this._biDropdownPanel) {
        this._biDropdownPanel.destroy();
        this._biDropdownPanel = null;
      }
      if (this._biKeyVHandler) {
        (this.scene as BattleScene).input.keyboard?.off("keydown-V", this._biKeyVHandler);
        this._biKeyVHandler = null;
      }
      if (this._biKeyFiveHandler) {
        (this.scene as BattleScene).input.keyboard?.off("keydown-FIVE", this._biKeyFiveHandler);
        this._biKeyFiveHandler = null;
      }
      (this.scene as BattleScene).refreshUiEditModeActive();
      return true;
    }

    if (button === Button.CYCLE_GENDER) {
      this.outputAllBiTweakStates();
      return true;
    }

    if (this._biMetaMode === TweakMetaMode.EDIT_TYPE) {
      if (button === Button.LEFT) {
        this._biTweakMode = (this._biTweakMode - 1 + BattleInfo.BI_TWEAK_MODES.length) % BattleInfo.BI_TWEAK_MODES.length;
        this.updateBiTweakHUD();
      } else if (button === Button.RIGHT) {
        this._biTweakMode = (this._biTweakMode + 1) % BattleInfo.BI_TWEAK_MODES.length;
        this.updateBiTweakHUD();
      }
      return true;
    }

    if (this._biMetaMode === TweakMetaMode.ELEMENT) {
      if (button === Button.LEFT) {
        this._biTweakAssetIndex = (this._biTweakAssetIndex - 1 + BattleInfo.BI_TWEAK_ASSETS.length) % BattleInfo.BI_TWEAK_ASSETS.length;
        this.updateBiTweakHUD();
      } else if (button === Button.RIGHT) {
        this._biTweakAssetIndex = (this._biTweakAssetIndex + 1) % BattleInfo.BI_TWEAK_ASSETS.length;
        this.updateBiTweakHUD();
      }
      return true;
    }

    const mode = BattleInfo.BI_TWEAK_MODES[this._biTweakMode];
    const assetName = BattleInfo.BI_TWEAK_ASSETS[this._biTweakAssetIndex];
    const target = this.getBiTweakTarget(this._biTweakAssetIndex);
    if (!target) {
      console.log(`[BTL-ICON-TWEAK] ${assetName} target not available`);
      return true;
    }

    const step = mode === "gap" ? 0.5 : (mode === "zOrder" ? 1 : (mode === "fontSize" ? 1 : (mode === "alpha" ? 0.05 : (mode === "position" ? 0.5 : (mode === "scale" ? 0.01 : 1)))));

    if (mode === "gap") {
      const dir = (button === Button.UP || button === Button.RIGHT) ? 1 : (button === Button.DOWN || button === Button.LEFT) ? -1 : 0;
      if (dir !== 0) {
        this._iconRowGap = Math.max(0, this._iconRowGap + dir * step);
        const bs = this.scene as BattleScene;
        const pokemon = BattleInfo.isBiTweakSidePlayer()
          ? bs.getPlayerField()[0]
          : bs.getEnemyField()[0];
        if (pokemon) this.layoutRow2Groups(pokemon);
        console.log(`[BTL-ICON-TWEAK] gap adjust | gap=${this._iconRowGap.toFixed(1)}`);
      }
      this.updateBiTweakHUD();
      return true;
    }

    switch (button) {
      case Button.UP:
        this.applyBiTweak(target, mode, mode === "position" ? -step : step, assetName);
        break;
      case Button.DOWN:
        this.applyBiTweak(target, mode, mode === "position" ? step : -step, assetName);
        break;
      case Button.LEFT:
        if (mode === "position") this.applyBiTweak(target, "positionX", -step, assetName);
        else if (mode === "scale") this.applyBiTweak(target, "scaleX", -step, assetName);
        else if (mode === "width") this.applyBiTweak(target, "width", -1, assetName);
        else if (mode === "height") this.applyBiTweak(target, "height", -1, assetName);
        else if (mode === "textStyle" || mode === "textStyleOn") this.applyBiTweak(target, mode, -1, assetName);
        break;
      case Button.RIGHT:
        if (mode === "position") this.applyBiTweak(target, "positionX", step, assetName);
        else if (mode === "scale") this.applyBiTweak(target, "scaleX", step, assetName);
        else if (mode === "width") this.applyBiTweak(target, "width", 1, assetName);
        else if (mode === "height") this.applyBiTweak(target, "height", 1, assetName);
        else if (mode === "textStyle" || mode === "textStyleOn") this.applyBiTweak(target, mode, 1, assetName);
        break;
      default:
        return true;
    }

    this.syncBiTweakDelta(assetName, target);
    this.mirrorBothAdjust(assetName, button, mode, step);
    this.logBiTweakState(assetName, target, `${mode} adjust`);
    this.updateBiTweakHUD();
    return true;
  }

  private mirrorBothAdjust(assetName: string, button: Button, mode: string, step: number): void {
    let secondaryName: string | null = null;
    let secondary: Phaser.GameObjects.GameObject | null = null;
    if (assetName === "SoulBoth") {
      secondaryName = "SoulText";
      secondary = this.rankText;
    } else if (assetName === "GlitchBoth") {
      secondaryName = "GlitchItemIcon";
      secondary = this.glitchItemIcon;
    } else if (assetName === "FusionBoth") {
      secondaryName = "FusionSpeciesIcon";
      secondary = this.fusionSpeciesIcon;
    }
    if (!secondary || !secondaryName) return;

    switch (button) {
      case Button.UP:
        this.applyBiTweak(secondary, mode, mode === "position" ? -step : step, secondaryName);
        break;
      case Button.DOWN:
        this.applyBiTweak(secondary, mode, mode === "position" ? step : -step, secondaryName);
        break;
      case Button.LEFT:
        if (mode === "position") this.applyBiTweak(secondary, "positionX", -step, secondaryName);
        else if (mode === "scale") this.applyBiTweak(secondary, "scaleX", -step, secondaryName);
        else if (mode === "width") this.applyBiTweak(secondary, "width", -1, secondaryName);
        else if (mode === "height") this.applyBiTweak(secondary, "height", -1, secondaryName);
        else if (mode === "textStyle" || mode === "textStyleOn") this.applyBiTweak(secondary, mode, -1, secondaryName);
        break;
      case Button.RIGHT:
        if (mode === "position") this.applyBiTweak(secondary, "positionX", step, secondaryName);
        else if (mode === "scale") this.applyBiTweak(secondary, "scaleX", step, secondaryName);
        else if (mode === "width") this.applyBiTweak(secondary, "width", 1, secondaryName);
        else if (mode === "height") this.applyBiTweak(secondary, "height", 1, secondaryName);
        else if (mode === "textStyle" || mode === "textStyleOn") this.applyBiTweak(secondary, mode, 1, secondaryName);
        break;
    }
    this.syncBiTweakDelta(secondaryName, secondary);
  }

  private applyBiTweak(target: Phaser.GameObjects.GameObject, mode: string, delta: number, assetName: string): void {
    switch (mode) {
      case "scale":
        if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
          target.setScale(Math.max(0.01, (target.scaleX ?? 1) + delta), Math.max(0.01, (target.scaleY ?? 1) + delta));
        }
        break;
      case "scaleX":
        if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
          target.scaleX = Math.max(0.01, (target.scaleX ?? 1) + delta);
        }
        break;
      case "position":
        target.y = (target.y ?? 0) + delta;
        break;
      case "positionX":
        target.x = (target.x ?? 0) + delta;
        break;
      case "width":
        if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
          const newW = Math.max(1, target.displayWidth + delta);
          target.setDisplaySize(newW, target.displayHeight);
        }
        break;
      case "height":
        if (target instanceof Phaser.GameObjects.Sprite || target instanceof Phaser.GameObjects.Image) {
          const newH = Math.max(1, target.displayHeight + delta);
          target.setDisplaySize(target.displayWidth, newH);
        }
        break;
      case "alpha":
        target.alpha = Math.max(0, Math.min(1, (target.alpha ?? 1) + delta));
        break;
      case "fontSize":
        if (target instanceof Phaser.GameObjects.Text) {
          const current = parseInt(target.style.fontSize as string, 10) || 28;
          target.setFontSize(`${current + delta}px`);
        }
        break;
      case "textStyle":
        if (target instanceof Phaser.GameObjects.Text) {
          const TEXT_STYLE_COUNT = 34;
          let idx = (target as any).__tweakTextStyleIndex ?? 1;
          if (delta > 0) idx = (idx + 1) % TEXT_STYLE_COUNT;
          else if (delta < 0) idx = (idx - 1 + TEXT_STYLE_COUNT) % TEXT_STYLE_COUNT;
          (target as any).__tweakTextStyleIndex = idx;
          const uiTheme = (this.scene as BattleScene).uiTheme;
          target.setColor(getTextColor(idx, false, uiTheme));
          target.setShadowColor(getTextColor(idx, true, uiTheme));
        }
        break;
      case "textStyleOn":
        if (target instanceof Phaser.GameObjects.Text) {
          const isOn = (target as any).__textStyleOn ?? false;
          if (!isOn) {
            (target as any).__textStyleOn = true;
            (target as any).__savedTextColor = target.style.color;
            target.setColor("#ffff00");
          } else {
            (target as any).__textStyleOn = false;
            if ((target as any).__savedTextColor) {
              target.setColor((target as any).__savedTextColor);
            }
          }
        }
        break;
      case "zOrder": {
        const parent = (target.parentContainer ?? this) as Phaser.GameObjects.Container;
        if (delta > 0) {
          parent.moveUp(target);
        } else if (delta < 0) {
          parent.moveDown(target);
        }
        break;
      }
    }
  }

  private logBiTweakState(assetName: string, target: Phaser.GameObjects.GameObject, action: string): void {
    const x = target.x ?? 0;
    const y = target.y ?? 0;
    const sx = target.scaleX ?? 1;
    const sy = target.scaleY ?? 1;
    const a = target.alpha ?? 1;
    const fs = target instanceof Phaser.GameObjects.Text ? parseInt(target.style.fontSize as string, 10) || 0 : 0;
    const dw = (target as Phaser.GameObjects.Image).displayWidth ?? 0;
    const dh = (target as Phaser.GameObjects.Image).displayHeight ?? 0;
    const zi = (target.parentContainer as Phaser.GameObjects.Container)?.getIndex?.(target) ?? 0;
    const baseline = this._biTweakBaselines.get(assetName);
    if (baseline) {
      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dsx = sx - baseline.scaleX;
      const dsy = sy - baseline.scaleY;
      const da = a - baseline.alpha;
      const dfs = fs - baseline.fontSize;
      const ddw = dw - baseline.displayWidth;
      const ddh = dh - baseline.displayHeight;
      const dzi = zi - baseline.listIndex;
      console.log(`[BTL-ICON-TWEAK] ${action} | asset=${assetName}\n  current: x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)} fontSize=${fs} zOrder=${zi}${dw ? ` w=${dw.toFixed(1)} h=${dh.toFixed(1)}` : ""}\n  delta:   Δx=${dx >= 0 ? "+" : ""}${dx.toFixed(1)} Δy=${dy >= 0 ? "+" : ""}${dy.toFixed(1)} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)}${dfs ? ` ΔfontSize=${dfs >= 0 ? "+" : ""}${dfs}` : ""} ΔzOrder=${dzi >= 0 ? "+" : ""}${dzi}${ddw ? ` Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)}` : ""}`);
    } else {
      console.log(`[BTL-ICON-TWEAK] ${action} | asset=${assetName} | x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} alpha=${a.toFixed(2)} zOrder=${zi}`);
    }
  }

  updateBiTweakHUD(): void {
    if (!this._biTweakHudText) return;
    if (this._biMetaMode === TweakMetaMode.NONE) {
      this._biTweakHudText.setVisible(false);
      return;
    }
    const modeName = BattleInfo.BI_TWEAK_MODES[this._biTweakMode].toUpperCase();
    const assetName = BattleInfo.BI_TWEAK_ASSETS[this._biTweakAssetIndex];
    const side = BattleInfo.isBiTweakSidePlayer() ? "PLAYER" : "ENEMY";
    const { text, color } = formatMetaHud(this._biMetaMode, modeName, `${side}:${assetName}`);
    this._biTweakHudText.setText(text);
    this._biTweakHudText.setColor(color);
    this._biTweakHudText.setVisible(true);
  }

  outputAllBiTweakStates(): void {
    const changed: string[] = [];
    const unchanged: string[] = [];
    const unavailable: string[] = [];

    for (let i = 0; i < BattleInfo.BI_TWEAK_ASSETS.length; i++) {
      const name = BattleInfo.BI_TWEAK_ASSETS[i];
      const t = this.getBiTweakTarget(i);
      if (!t) { unavailable.push(name); continue; }
      const baseline = this._biTweakBaselines.get(name);
      if (!baseline) { unavailable.push(name); continue; }

      const x = t.x ?? 0;
      const y = t.y ?? 0;
      const sx = t.scaleX ?? 1;
      const sy = t.scaleY ?? 1;
      const a = t.alpha ?? 1;
      const fs = t instanceof Phaser.GameObjects.Text ? parseInt(t.style.fontSize as string, 10) || 0 : 0;
      const dw = (t as Phaser.GameObjects.Image).displayWidth ?? 0;
      const dh = (t as Phaser.GameObjects.Image).displayHeight ?? 0;
      const zi = (t.parentContainer as Phaser.GameObjects.Container)?.getIndex?.(t) ?? 0;
      const dx = x - baseline.x;
      const dy = y - baseline.y;
      const dsx = sx - baseline.scaleX;
      const dsy = sy - baseline.scaleY;
      const da = a - baseline.alpha;
      const dfs = fs - baseline.fontSize;
      const ddw = dw - baseline.displayWidth;
      const ddh = dh - baseline.displayHeight;
      const dzi = zi - baseline.listIndex;

      const isChanged = Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dsx) > 0.001 || Math.abs(dsy) > 0.001
        || Math.abs(da) > 0.001 || Math.abs(dfs) > 0.001 || Math.abs(ddw) > 0.001 || Math.abs(ddh) > 0.001 || Math.abs(dzi) > 0;
      if (isChanged) {
        let block = `${name}:\n  ORIGINAL: x=${baseline.x.toFixed(1)} y=${baseline.y.toFixed(1)} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} α=${baseline.alpha.toFixed(2)} zOrder=${baseline.listIndex}`;
        if (baseline.fontSize) block += ` fontSize=${baseline.fontSize}`;
        if (baseline.displayWidth) block += ` w=${baseline.displayWidth.toFixed(1)} h=${baseline.displayHeight.toFixed(1)}`;
        block += `\n  CHANGE:   Δx=${dx >= 0 ? "+" : ""}${dx.toFixed(1)} Δy=${dy >= 0 ? "+" : ""}${dy.toFixed(1)} ΔscaleX=${dsx >= 0 ? "+" : ""}${dsx.toFixed(3)} ΔscaleY=${dsy >= 0 ? "+" : ""}${dsy.toFixed(3)} Δα=${da >= 0 ? "+" : ""}${da.toFixed(2)} ΔzOrder=${dzi >= 0 ? "+" : ""}${dzi}`;
        if (dfs) block += ` ΔfontSize=${dfs >= 0 ? "+" : ""}${dfs}`;
        if (ddw) block += ` Δw=${ddw >= 0 ? "+" : ""}${ddw.toFixed(1)} Δh=${ddh >= 0 ? "+" : ""}${ddh.toFixed(1)}`;
        block += `\n  APPLIED:  x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)} zOrder=${zi}`;
        if (fs) block += ` fontSize=${fs}`;
        if (dw) block += ` w=${dw.toFixed(1)} h=${dh.toFixed(1)}`;
        if (name === "IconRow") block += ` gap=${this._iconRowGap.toFixed(1)}`;
        changed.push(block);
      } else {
        if (name === "IconRow" && Math.abs(this._iconRowGap - 3.5) > 0.001) {
          let block = `${name}:\n  ORIGINAL: x=${baseline.x.toFixed(1)} y=${baseline.y.toFixed(1)} scaleX=${baseline.scaleX.toFixed(3)} scaleY=${baseline.scaleY.toFixed(3)} α=${baseline.alpha.toFixed(2)} zOrder=${baseline.listIndex} gap=3.5`;
          block += `\n  CHANGE:   Δgap=${(this._iconRowGap - 3.5) >= 0 ? "+" : ""}${(this._iconRowGap - 3.5).toFixed(1)}`;
          block += `\n  APPLIED:  x=${x.toFixed(1)} y=${y.toFixed(1)} scaleX=${sx.toFixed(3)} scaleY=${sy.toFixed(3)} α=${a.toFixed(2)} zOrder=${zi} gap=${this._iconRowGap.toFixed(1)}`;
          changed.push(block);
        } else {
          unchanged.push(name);
        }
      }
    }

    const side = this.player ? "PLAYER" : "ENEMY";
    const sections: string[] = [`[BTL-ICON-TWEAK-SNAPSHOT] ${side}`, "NOTE: CHANGE values are deltas for code adjustments."];
    if (changed.length > 0) { sections.push("\n── CHANGED ──"); sections.push(changed.join("\n\n")); }
    if (unchanged.length > 0) sections.push(`\n── UNCHANGED ── ${unchanged.join(", ")}`);
    if (unavailable.length > 0) sections.push(`\n── UNAVAILABLE ── ${unavailable.join(", ")}`);

    const snapshot = sections.join("\n");
    console.log(snapshot);
    tweakCopyToClipboard(snapshot);
  }
}

export class PlayerBattleInfo extends BattleInfo {
  constructor(scene: Phaser.Scene) {
    super(scene, Math.floor(scene.game.canvas.width / 6) - 10, -72, true);
  }
}

export class EnemyBattleInfo extends BattleInfo {
  constructor(scene: Phaser.Scene) {
    super(scene, 140, -141, false);
  }

  setMini(mini: boolean): void { }
}