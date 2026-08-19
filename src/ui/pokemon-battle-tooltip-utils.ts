import Phaser from "phaser";
import i18next from "i18next";
import BattleScene from "#app/battle-scene";
import { addTextObject, addBBCodeTextObject, getTextColor, TextStyle } from "#app/ui/text";
import { Device } from "#app/enums/devices";
import { getUpgradeRarityColors, getRarityFromLevel, getLocalizedSpriteKey } from "#app/utils";
import { SkillTreeRarity } from "#app/system/skill-tree-data";
import { Stat } from "#app/data/pokemon-stat";
import { Type, getTypeRgb } from "#app/data/type";
import { MoveCategory, allMoves } from "#app/data/move";
import { Moves } from "#enums/moves";
import { Nature, getNatureStatMultiplier } from "#app/data/nature";
import { tweakCopyToClipboard } from "./tweak/tweak-meta-types";
import { allAbilities } from "#app/data/ability";
import { Abilities } from "#enums/abilities";
import type Pokemon from "#app/field/pokemon";
import { modifierSortFunc } from "#app/modifier/modifier";
import { adjustDuelmonIconScale } from "#app/data/pokemon-species";
import { intToRoman } from "#app/utils";
import { ModifierTooltipUtils } from "#app/ui/modifier-tooltip-utils";
import { attachModalBackground } from "./modal-background-utils";
import { Mode } from "./mode";
import { getFieldEffectText } from "#app/ui/arena-flyout";
import { WeatherType } from "#enums/weather-type";
import { Button } from "#enums/buttons";
import { TerrainType } from "#app/data/terrain";
import { ArenaTagType } from "#enums/arena-tag-type";
import { ArenaTagSide } from "#app/data/arena-tag";
import { BattlerTagType } from "#enums/battler-tag-type";
import { TimeOfDay } from "#enums/time-of-day";
import { FormChangeItem } from "#enums/form-change-items";

import { isPrimaryPointer } from "./pointer-utils";

export const BATTLE_TOOLTIP_PLAYER_VIEWS = 4;
export const BATTLE_TOOLTIP_ENEMY_VIEWS = 5;

export function getBattleTooltipTotalViews(pokemon: Pokemon): number {
  return pokemon.isPlayer() ? BATTLE_TOOLTIP_PLAYER_VIEWS : BATTLE_TOOLTIP_ENEMY_VIEWS;
}

export class PokemonBattleTooltipUtils {
  private static container: Phaser.GameObjects.Container | null = null;
  private static _tweakTargetMap: Map<string, Phaser.GameObjects.GameObject[]> = new Map();

  static tagTweakTarget(name: string, obj: Phaser.GameObjects.GameObject): void {
    const arr = this._tweakTargetMap.get(name);
    if (arr) { arr.push(obj); } else { this._tweakTargetMap.set(name, [obj]); }
  }

  static getTweakTargets(name: string): Phaser.GameObjects.GameObject[] | undefined {
    return this._tweakTargetMap.get(name);
  }

  static clearTweakTargets(): void {
    this._tweakTargetMap.clear();
  }

  static getTooltipPosition(): { x: number; y: number; width: number } | null {
    if (!this.container) return null;
    return { x: this.container.x, y: this.container.y, width: this._activeTooltipWidth };
  }

  private static _activeTooltipWidth = 130;
  private static readonly TOOLTIP_WIDTH = 130;
  private static readonly PADDING = 6;
  private static readonly RARITY_BAR_HEIGHT = 6;
  private static readonly SECTION_LINE_COLOR = 0x666666;
  private static readonly SECTION_LINE_ALPHA = 0.60;
  private static readonly SECTION_LINE_THICKNESS = 0.5;
  private static readonly SECTION_HEADER_COLOR = "#666666";
  private static readonly SECTION_HEADER_ALPHA = 0.72;
  private static readonly STAT_COLORS = [0x4a90e2, 0xff5555, 0xffaa33, 0xaa55ff, 0x55aa55, 0xff55aa];
  private static readonly STAT_ORDER = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];

  private static readonly SCENE_OVERLAY_DEPTH = 1000;

  private static attachTooltipContainer(
    scene: BattleScene,
    container: Phaser.GameObjects.Container,
    uiX: number,
    uiY: number,
    useSceneOverlay: boolean
  ): void {
    if (useSceneOverlay) {
      const scale = scene.uiContainer.scaleX;
      container.setDepth(PokemonBattleTooltipUtils.SCENE_OVERLAY_DEPTH);
      container.setScrollFactor(0);
      container.setScale(scale);
      container.setPosition(uiX * scale, uiY * scale);
      scene.add.existing(container);
    } else {
      container.setDepth(200);
      scene.uiContainer.add(container);
      container.setPosition(uiX, uiY);
    }
  }

  static show(scene: BattleScene, pokemon: Pokemon): void {
    this.showView(scene, pokemon, 0, false);
  }

  static showView(scene: BattleScene, pokemon: Pokemon, viewIndex: number = 0, showNav: boolean = true, positionOverride?: { x: number; anchorY?: number }, displayOptions?: { replaceFieldWithType?: boolean; natureSuffix?: string; itemPageIndex?: number; shinyStatSwaps?: { from: number; to: number }[]; comparisonStats?: number[] }): void {
    this.hide();
    this.clearTweakTargets();

    const isOwn = pokemon.isPlayer();
    const bd = pokemon.battleData;
    const level = pokemon.level;
    let rarity = getRarityFromLevel(level);
    const isSpecialForm = !!(pokemon as any).altBuildId || pokemon.isGlitchOrSmittyForm();
    if (isSpecialForm) {
      const rarityOrder = [SkillTreeRarity.COMMON, SkillTreeRarity.GREAT, SkillTreeRarity.ULTRA,
        SkillTreeRarity.ROGUE, SkillTreeRarity.MASTER, SkillTreeRarity.LEGENDARY];
      let floor = SkillTreeRarity.ULTRA;
      const rank = (pokemon as any).altBuildRank ?? 0;
      if ((pokemon as any).altBuildId && rank >= 10) floor = SkillTreeRarity.MASTER;
      else if ((pokemon as any).altBuildId && rank >= 5) floor = SkillTreeRarity.ROGUE;
      const levelIdx = rarityOrder.indexOf(rarity);
      const floorIdx = rarityOrder.indexOf(floor);
      if (floorIdx > levelIdx) rarity = floor;
    }
    const rarityColors = getUpgradeRarityColors(rarity);
    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);

    const isTeamView = (isOwn && viewIndex === 2) || (!isOwn && viewIndex === 4);
    const tooltipWidth = isTeamView ? 260 : this.TOOLTIP_WIDTH;
    this._activeTooltipWidth = tooltipWidth;
    const padding = this.PADDING;

    const nsBg = scene.add.nineslice(0, 0, "tooltip_info", undefined, tooltipWidth, 100, 12, 12, 12, 12);
    nsBg.setOrigin(0, 0);

    const header = this.resolveHeader(viewIndex, pokemon, isOwn, scene);
    if (displayOptions?.natureSuffix) {
      header.title = `${header.title} [${displayOptions.natureSuffix}]`;
    }
    const titleText = addTextObject(scene, tooltipWidth / 2 + 2, 8, header.title, TextStyle.WINDOW, { fontSize: "40px" });
    titleText.setOrigin(0.5, 0.5);
    titleText.setColor(isTeamView ? "#F0F0F0" : rarityHex);
    if (titleText.displayWidth > tooltipWidth - 10) {
      const bs = titleText.scaleX;
      titleText.setScale(bs * ((tooltipWidth - 10) / titleText.displayWidth), titleText.scaleY);
    }

    const subtitleText = addTextObject(scene, tooltipWidth / 2 + 2, 17, header.subtitle, TextStyle.WINDOW, { fontSize: "30px" });
    subtitleText.setOrigin(0.5, 0.5);
    subtitleText.setTint(rarityColors.border);

    const dividerY = 14 + this.RARITY_BAR_HEIGHT + 1;
    let currentY: number;
    const textX = padding + 2;
    const children: Phaser.GameObjects.GameObject[] = [nsBg];

    if (isTeamView) {
      children.push(titleText, subtitleText);
      subtitleText.setVisible(false);
      currentY = Math.ceil(8 + titleText.displayHeight / 2) + 1;
    } else {
      const rarityBar = scene.add.graphics();
      rarityBar.fillStyle(0x0f0f1e, 1.0);
      rarityBar.fillRect(2, 14, tooltipWidth - 4, this.RARITY_BAR_HEIGHT);

      children.push(rarityBar, titleText, subtitleText);

      if (displayOptions?.replaceFieldWithType) {
        const pokemonTypes = pokemon.getTypes().filter(t => t !== Type.UNKNOWN);
        const badgeX = tooltipWidth - 12;
        if (pokemonTypes.length > 0) {
          if (pokemonTypes.length === 1) {
            const frame = Type[pokemonTypes[0]]?.toLowerCase() || "unknown";
            const spr = scene.add.sprite(badgeX, 17, "pbinfo_enemy_type", frame);
            spr.setScale(0.35);
            spr.setOrigin(1, 0.5);
            children.push(spr);
          } else {
            const frame0 = Type[pokemonTypes[0]]?.toLowerCase() || "unknown";
            const frame1 = Type[pokemonTypes[1]]?.toLowerCase() || "unknown";
            const spr1 = scene.add.sprite(badgeX, 17, "pbinfo_enemy_type1", frame0);
            spr1.setScale(0.35);
            spr1.setOrigin(1, 1);
            children.push(spr1);
            const spr2 = scene.add.sprite(badgeX, 17, "pbinfo_enemy_type2", frame1);
            spr2.setScale(0.35);
            spr2.setOrigin(1, 0);
            children.push(spr2);
          }
        }
      }

      currentY = 14 + this.RARITY_BAR_HEIGHT + 2;
    }

    if (isOwn) {
      switch (viewIndex) {
        case 0:
          currentY = this.renderMovesView(scene, children, pokemon, true, bd, textX, currentY, tooltipWidth, padding, rarityHex, displayOptions);
          break;
        case 1:
          currentY = this.renderItemsStatsView(scene, children, pokemon, true, bd, textX, currentY, tooltipWidth, padding, rarityHex, displayOptions?.itemPageIndex ?? 0);
          break;
        case 2:
          currentY = this.renderTeamView(scene, children, true, textX, currentY, tooltipWidth, padding);
          break;
        case 3:
          currentY = this.renderOpponentView(scene, children, pokemon, true, textX, currentY, tooltipWidth, padding, rarityHex);
          break;
      }
    } else {
      switch (viewIndex) {
        case 0:
          currentY = this.renderMovesView(scene, children, pokemon, false, bd, textX, currentY, tooltipWidth, padding, rarityHex, displayOptions);
          break;
        case 1:
          currentY = this.renderItemsStatsView(scene, children, pokemon, false, bd, textX, currentY, tooltipWidth, padding, rarityHex, displayOptions?.itemPageIndex ?? 0);
          break;
        case 2: {
          const player = scene.getPlayerField()[0];
          if (player) {
            currentY = this.renderMovesView(scene, children, player, true, player.battleData, textX, currentY, tooltipWidth, padding, rarityHex);
          } else {
            const noText = addTextObject(scene, textX + 2, currentY, i18next.t("pokemonBattleTooltip:noOpponent", { defaultValue: "No opponent" }), TextStyle.WINDOW, { fontSize: "32px" });
            noText.setOrigin(0, 0);
            children.push(noText);
            currentY += 10;
          }
          break;
        }
        case 3: {
          const player3 = scene.getPlayerField()[0];
          if (player3) {
            currentY = this.renderItemsStatsView(scene, children, player3, true, player3.battleData, textX, currentY, tooltipWidth, padding, rarityHex, displayOptions?.itemPageIndex ?? 0);
          } else {
            const noText = addTextObject(scene, textX + 2, currentY, i18next.t("pokemonBattleTooltip:noOpponent", { defaultValue: "No opponent" }), TextStyle.WINDOW, { fontSize: "32px" });
            noText.setOrigin(0, 0);
            children.push(noText);
            currentY += 10;
          }
          break;
        }
        case 4:
          currentY = this.renderTeamView(scene, children, true, textX, currentY, tooltipWidth, padding);
          break;
      }
    }

    if (showNav) {
      const totalViews = getBattleTooltipTotalViews(pokemon);
      currentY = this.renderNavIndicator(scene, children, viewIndex, totalViews, currentY, tooltipWidth);
    }

    const finalHeight = currentY + 6;
    nsBg.setDisplaySize(tooltipWidth, finalHeight);

    this.container.add(children);

    const patternW = tooltipWidth;
    const patternH = finalHeight;
    attachModalBackground(scene, this.container, () => ({
      bgX: 0, bgY: 0, bgWidth: patternW, bgHeight: patternH
    }), { mask: false, alphaMultiplier: 0.6 });

    scene.uiContainer.add(this.container);

    const tooltipY = Math.max(2, Math.min(44, 130 - finalHeight));
    let uiX: number;
    let uiY: number;
    if (positionOverride?.anchorY !== undefined) {
      const modalHeight = scene.game.canvas.height / 6;
      let localY = positionOverride.anchorY - finalHeight / 2;
      localY = Math.max(-modalHeight + 4, Math.min(-finalHeight - 4, localY));
      uiX = positionOverride.x;
      uiY = localY + modalHeight;
    } else if (positionOverride) {
      uiX = positionOverride.x;
      uiY = tooltipY;
    } else if (isOwn) {
      uiX = isTeamView ? Math.max(4, 320 - tooltipWidth - 4) : 186;
      uiY = tooltipY;
    } else {
      uiX = 4;
      uiY = tooltipY;
    }

    if (positionOverride) {
      scene.uiContainer.remove(this.container);
    }
    this.attachTooltipContainer(scene, this.container, uiX, uiY, !!positionOverride);
  }

  private static formatPokemonTitle(pokemon: Pokemon): string {
    const lvLabel = i18next.t("saveSlotSelectUiHandler:lv", { defaultValue: "Lv" });
    const species = pokemon.name;
    const nick = (pokemon as any).nickname ? pokemon.getNameToRender() : null;
    const namePart = nick && nick !== species && !nick.startsWith(`${species} (`)
      ? `${species} (${nick})`
      : pokemon.getNameToRender();
    let rankSuffix = "";
    const isAltBuild = !!(pokemon as any).altBuildId;
    const displayRank = isAltBuild ? Math.max(1, (pokemon as any).altBuildRank ?? 0) : ((pokemon as any).rankUpCount ?? 0) + 1;
    const showRank = isAltBuild || displayRank > 1;
    if (showRank) {
      const rankLabel = isAltBuild
        ? i18next.t("saveSlotSelectUiHandler:rank", { defaultValue: "RANK:" })
        : i18next.t("saveSlotSelectUiHandler:soul", { defaultValue: "SOUL:" });
      rankSuffix = ` ${rankLabel} ${intToRoman(displayRank)}`;
    }
    return `${namePart} ${lvLabel}${pokemon.level}${rankSuffix}`;
  }

  private static resolveHeader(viewIndex: number, pokemon: Pokemon, isOwn: boolean, scene: BattleScene): { title: string; subtitle: string } {
    if (isOwn) {
      switch (viewIndex) {
        case 0:
          return { title: this.formatPokemonTitle(pokemon), subtitle: i18next.t("pokemonBattleTooltip:quickSummary", { defaultValue: "Quick Summary" }) };
        case 1:
          return { title: this.formatPokemonTitle(pokemon), subtitle: i18next.t("pokemonBattleTooltip:itemsMoves", { defaultValue: "Items & Moves" }) };
        case 2:
          return { title: i18next.t("pokemonBattleTooltip:teamTitle", { defaultValue: "Team" }), subtitle: "" };
        case 3: {
          const enemy = scene.getEnemyPokemon() ?? scene.getEnemyField()[0];
          const enemyTitle = enemy ? this.formatPokemonTitle(enemy) : i18next.t("pokemonBattleTooltip:noOpponent", { defaultValue: "No opponent" });
          return { title: enemyTitle, subtitle: i18next.t("pokemonBattleTooltip:enemyInfo", { defaultValue: "Enemy Info" }) };
        }
        default:
          return { title: this.formatPokemonTitle(pokemon), subtitle: "" };
      }
    } else {
      switch (viewIndex) {
        case 0:
          return { title: this.formatPokemonTitle(pokemon), subtitle: i18next.t("pokemonBattleTooltip:quickSummary", { defaultValue: "Quick Summary" }) };
        case 1:
          return { title: this.formatPokemonTitle(pokemon), subtitle: i18next.t("pokemonBattleTooltip:itemsMoves", { defaultValue: "Items & Moves" }) };
        case 2: {
          const player = scene.getPlayerField()[0];
          const playerTitle = player ? this.formatPokemonTitle(player) : "";
          return { title: playerTitle, subtitle: i18next.t("pokemonBattleTooltip:quickSummary", { defaultValue: "Quick Summary" }) };
        }
        case 3: {
          const player3 = scene.getPlayerField()[0];
          const playerTitle3 = player3 ? this.formatPokemonTitle(player3) : "";
          return { title: playerTitle3, subtitle: i18next.t("pokemonBattleTooltip:itemsMoves", { defaultValue: "Items & Moves" }) };
        }
        case 4:
          return { title: i18next.t("pokemonBattleTooltip:teamTitle", { defaultValue: "Team" }), subtitle: "" };
        default:
          return { title: this.formatPokemonTitle(pokemon), subtitle: "" };
      }
    }
  }

  private static renderMovesView(
    scene: BattleScene,
    children: Phaser.GameObjects.GameObject[],
    pokemon: Pokemon,
    isOwn: boolean,
    bd: any,
    textX: number,
    currentY: number,
    tooltipWidth: number,
    padding: number,
    rarityHex: string,
    displayOptions?: { replaceFieldWithType?: boolean; natureSuffix?: string; shinyStatSwaps?: { from: number; to: number }[]; comparisonStats?: number[] }
  ): number {
    const movesLabel = i18next.t("pokemonSummary:moves", { defaultValue: "MOVES" });
    const fieldLabel = displayOptions?.replaceFieldWithType
      ? ""
      : i18next.t("pokemonBattleTooltip:field", { defaultValue: "FIELD" });
    const headerHeight = 6;
    const headerCenterY = currentY + headerHeight / 2;

    const movesHeaderText = addTextObject(scene, textX, headerCenterY, movesLabel, TextStyle.WINDOW, {
      fontSize: "33px", fontStyle: "normal", fontFamily: "pkmnems", letterSpacing: 2
    });
    movesHeaderText.setOrigin(0, 0.5);
    movesHeaderText.setColor(this.SECTION_HEADER_COLOR);
    movesHeaderText.setAlpha(this.SECTION_HEADER_ALPHA);
    movesHeaderText.setShadow(0, 0, undefined);

    const contentLeft = textX + 2;
    const contentRight = tooltipWidth - padding - 2;
    const totalContentW = contentRight - contentLeft;
    const useFullWidth = !!displayOptions?.replaceFieldWithType;
    const movesColW = useFullWidth ? totalContentW : (Math.floor(totalContentW * 0.55) + 10);
    const fieldColX = contentLeft + movesColW + 7;
    const fieldColW = totalContentW - movesColW - 7;

    const midLineX = contentLeft + movesColW;
    const headerLine = scene.add.graphics();
    headerLine.lineStyle(this.SECTION_LINE_THICKNESS, this.SECTION_LINE_COLOR, this.SECTION_LINE_ALPHA);
    const movesLineStartX = textX + movesHeaderText.displayWidth + 4;
    if (useFullWidth) {
      if (contentRight > movesLineStartX) {
        headerLine.lineBetween(movesLineStartX, headerCenterY, contentRight, headerCenterY);
      }
    } else {
      if (midLineX > movesLineStartX) {
        headerLine.lineBetween(movesLineStartX, headerCenterY, midLineX - 2, headerCenterY);
      }
    }

    if (!useFullWidth) {
      const fieldHeaderText = addTextObject(scene, fieldColX, headerCenterY, fieldLabel, TextStyle.WINDOW, {
        fontSize: "33px", fontStyle: "normal", fontFamily: "pkmnems", letterSpacing: 2
      });
      fieldHeaderText.setOrigin(0, 0.5);
      fieldHeaderText.setColor(this.SECTION_HEADER_COLOR);
      fieldHeaderText.setAlpha(this.SECTION_HEADER_ALPHA);
      fieldHeaderText.setShadow(0, 0, undefined);

      const fieldLineStartX = fieldColX + fieldHeaderText.displayWidth + 4;
      if (contentRight > fieldLineStartX) {
        headerLine.lineBetween(fieldLineStartX, headerCenterY, contentRight, headerCenterY);
      }
      children.push(fieldHeaderText);
    }

    children.push(movesHeaderText, headerLine);
    currentY += headerHeight + 1;

    const moveset = pokemon.getMoveset();
    const typeAtlasKey = getLocalizedSpriteKey("types");
    const rowPitch = 9;
    const inlineGap = 2;
    const qsPowLabel = i18next.t("modifierSelectUiHandler:secondaryLabelPow", { defaultValue: "POW" });
    const qsAccLabel = i18next.t("modifierSelectUiHandler:secondaryLabelAcc", { defaultValue: "ACC" });

    for (let i = 0; i < 4; i++) {
      const rowY = currentY + i * rowPitch;
      const slot = moveset[i];

      if (!slot) {
        const emptyText = addTextObject(scene, contentLeft, rowY + 2, i18next.t("modifierSelectUiHandler:secondaryStatNone", { defaultValue: "\u2014" }), TextStyle.WINDOW, { fontSize: "28px" });
        emptyText.setOrigin(0, 0);
        children.push(emptyText);
        continue;
      }

      const revealed = isOwn || (bd?.revealedMoves?.has(slot.moveId) ?? false);
      if (!revealed) {
        const hiddenText = addTextObject(scene, contentLeft, rowY + 2, i18next.t("championSelect:skillList.unknownSkill", { defaultValue: "???" }), TextStyle.WINDOW, { fontSize: "28px" });
        hiddenText.setOrigin(0, 0);
        children.push(hiddenText);
        continue;
      }

      const move = slot.getMove(isOwn);
      const moveType = pokemon.getMoveType(move);

      let typeIconWidth = 0;
      if (scene.textures.exists(typeAtlasKey)) {
        const typeFrame = Type[moveType]?.toLowerCase() || "unknown";
        const typeIcon = scene.add.sprite(contentLeft, rowY + 4, typeAtlasKey, typeFrame);
        typeIcon.setScale(0.32);
        typeIcon.setOrigin(0, 0.5);
        children.push(typeIcon);
        typeIconWidth = typeIcon.displayWidth + 2;
        this.tagTweakTarget("QS_TypeIcon", typeIcon);
      }

      const power = move.power;
      const accuracy = move.accuracy;
      const powStr = power >= 0 ? power.toString() : i18next.t("pokemonBattleTooltip:notApplicable", { defaultValue: "---" });
      const accStr = accuracy >= 0 ? `${accuracy}` : i18next.t("pokemonBattleTooltip:notApplicable", { defaultValue: "---" });
      const powAccStr = `${qsPowLabel}:${powStr} ${qsAccLabel}:${accStr}`;

      const nameText = addTextObject(scene, contentLeft + typeIconWidth, rowY + 1, slot.getName(), TextStyle.WINDOW, { fontSize: "31px" });
      nameText.setOrigin(0, 0);
      this.tagTweakTarget("QS_MoveName", nameText);

      const powAccText = addTextObject(scene, contentLeft + typeIconWidth, rowY + 1, powAccStr, TextStyle.WINDOW, { fontSize: "31px", fontStyle: "normal" });
      powAccText.setOrigin(0, 0);
      powAccText.setColor("#CCCCCC");
      powAccText.setShadow(0, 0, undefined);
      this.tagTweakTarget("QS_PowAcc", powAccText);

      const rowMaxW = (useFullWidth ? totalContentW : movesColW) - typeIconWidth - 2;
      const combinedW = nameText.displayWidth + inlineGap + powAccText.displayWidth;
      if (combinedW > rowMaxW && rowMaxW > 0) {
        const scaleFactor = rowMaxW / combinedW;
        nameText.setScale(nameText.scaleX * scaleFactor, nameText.scaleY);
        powAccText.setScale(powAccText.scaleX * scaleFactor, powAccText.scaleY);
      }
      powAccText.setPosition(contentLeft + typeIconWidth + nameText.displayWidth + inlineGap + 4, rowY + 1);
      children.push(nameText, powAccText);
    }

    const movesBottomY = currentY + 4 * rowPitch;

    if (!useFullWidth) {
      const colDivLine = scene.add.graphics();
      colDivLine.lineStyle(this.SECTION_LINE_THICKNESS, this.SECTION_LINE_COLOR, this.SECTION_LINE_ALPHA);
      colDivLine.lineBetween(midLineX, currentY, midLineX, movesBottomY);
      children.push(colDivLine);
    }

    if (useFullWidth) {
      currentY = movesBottomY + 3;
    } else {
      const fieldLines: string[] = [];
      const arena = scene.arena;

      const tod = arena.getTimeOfDay();
      const todKeys = ["dawn", "day", "dusk", "night"];
      const todKey = tod >= 0 && tod < todKeys.length ? todKeys[tod] : "day";
      fieldLines.push(i18next.t(`arenaFlyout:${todKey}` as any));

      if (arena.weather?.weatherType) {
        fieldLines.push(getFieldEffectText(WeatherType[arena.weather.weatherType]));
      }

      if (arena.terrain?.terrainType) {
        fieldLines.push(getFieldEffectText(TerrainType[arena.terrain.terrainType]));
      }

      for (const tag of arena.tags) {
        let name = getFieldEffectText(ArenaTagType[tag.tagType]);
        if ((tag as any).maxLayers && (tag as any).maxLayers > 1 && (tag as any).layers) {
          name += ` (${(tag as any).layers})`;
        }
        if (tag.side === ArenaTagSide.PLAYER) {
          name = `${i18next.t("pokemonBattleTooltip:youTag")}: ${name}`;
        } else if (tag.side === ArenaTagSide.ENEMY) {
          name = `${i18next.t("pokemonBattleTooltip:foeTag")}: ${name}`;
        }
        fieldLines.push(name);
      }

      const battlerTagsToShow: BattlerTagType[] = [
        BattlerTagType.CURSED,
        BattlerTagType.SEEDED,
        BattlerTagType.TRAPPED,
        BattlerTagType.YU_TRAPPED,
        BattlerTagType.BIND,
        BattlerTagType.WRAP,
        BattlerTagType.FIRE_SPIN,
        BattlerTagType.WHIRLPOOL,
        BattlerTagType.CLAMP,
        BattlerTagType.SAND_TOMB,
        BattlerTagType.MAGMA_STORM,
        BattlerTagType.SNAP_TRAP,
        BattlerTagType.THUNDER_CAGE,
        BattlerTagType.INFESTATION,
        BattlerTagType.SALT_CURED,
        BattlerTagType.OCTOLOCK,
        BattlerTagType.INGRAIN,
      ];

      if (pokemon.summonData?.tags) {
        for (const tag of pokemon.summonData.tags) {
          if (battlerTagsToShow.includes(tag.tagType)) {
            const tagName = getFieldEffectText(tag.tagType);
            if (tagName) {
              const prefix = pokemon.isPlayer()
                ? i18next.t("pokemonBattleTooltip:youTag")
                : i18next.t("pokemonBattleTooltip:foeTag");
              fieldLines.push(`${prefix}: ${tagName}`);
            }
          }
        }
      }

      const fieldRowPitch = 9;
      for (let f = 0; f < fieldLines.length; f++) {
        const fy = currentY + f * fieldRowPitch;
        const ft = addTextObject(scene, fieldColX, fy + 2, fieldLines[f], TextStyle.WINDOW, { fontSize: "28px" });
        ft.setOrigin(0, 0);
        if (ft.displayWidth > fieldColW) {
          ft.setScale(ft.scaleX * (fieldColW / ft.displayWidth), ft.scaleY);
        }
        children.push(ft);
        this.tagTweakTarget("QS_FieldText", ft);
      }

      const fieldBottomY = currentY + Math.max(0, fieldLines.length) * fieldRowPitch;
      currentY = Math.max(movesBottomY, fieldBottomY) + 3;
    }

    currentY = this.renderSectionHeader(scene, children, i18next.t("pokemonSummary:ability", { defaultValue: "ABILITY" }), textX, currentY, tooltipWidth);

    const abilityRevealed = isOwn || (bd?.abilityRevealed ?? false);
    const ability = pokemon.getAbility();
    const unknownStr = i18next.t("championSelect:skillList.unknownSkill", { defaultValue: "???" });
    const abilityName = abilityRevealed ? (ability?.name || unknownStr) : unknownStr;
    const abilityDesc = abilityRevealed ? (ability?.description || "") : "";

    const abilityNameText = addTextObject(scene, textX + 2, currentY, abilityName, TextStyle.WINDOW, { fontSize: "41px" });
    abilityNameText.setOrigin(0, 0);
    if (abilityRevealed) abilityNameText.setColor(rarityHex);
    children.push(abilityNameText);
    this.tagTweakTarget("QS_AbilityName", abilityNameText);
    currentY += abilityNameText.displayHeight + 1;

    if (abilityDesc) {
      const descText = addTextObject(scene, textX + 2, currentY, abilityDesc, TextStyle.WINDOW, { fontSize: "36px", wordWrap: { width: (tooltipWidth - padding * 2 - 4) * 6 } });
      descText.setOrigin(0, 0);
      descText.setColor("#F0F0F0");
      children.push(descText);
      this.tagTweakTarget("QS_AbilityDesc", descText);
      currentY += descText.displayHeight + 2;
    }

    if (pokemon.hasPassive() && (isOwn || abilityRevealed)) {
      const passiveHeaderLabel = i18next.t("pokemonSummary:passive", { defaultValue: "PASSIVE" });
      currentY = this.renderSectionHeader(scene, children, passiveHeaderLabel, textX, currentY, tooltipWidth);

      const passive = pokemon.getPassiveAbility();
      const passiveNameText = addTextObject(scene, textX + 2, currentY, passive.name, TextStyle.WINDOW, { fontSize: "41px" });
      passiveNameText.setOrigin(0, 0);
      passiveNameText.setColor(rarityHex);
      children.push(passiveNameText);
      currentY += passiveNameText.displayHeight + 1;

      if (passive.description) {
        const passiveDescText = addTextObject(scene, textX + 2, currentY, passive.description, TextStyle.WINDOW, { fontSize: "36px", wordWrap: { width: (tooltipWidth - padding * 2 - 4) * 6 } });
        passiveDescText.setOrigin(0, 0);
        passiveDescText.setColor("#F0F0F0");
        children.push(passiveDescText);
        currentY += passiveDescText.displayHeight + 2;
      }
    }

    currentY += 3;
    const statsHeader = displayOptions?.shinyStatSwaps?.length
      ? i18next.t("shinyPower:statSwapsHeader", { defaultValue: "STAT SWAPS" })
      : i18next.t("pokemonSummary:stats", { defaultValue: "STATS" });
    currentY = this.renderSectionHeader(scene, children, statsHeader, textX, currentY, tooltipWidth);

    const statNames = [
      i18next.t("pokemonInfo:Stat.HPStat", { defaultValue: "HP" }),
      i18next.t("pokemonInfo:Stat.ATKshortened", { defaultValue: "ATK" }),
      i18next.t("pokemonInfo:Stat.DEFshortened", { defaultValue: "DEF" }),
      i18next.t("pokemonInfo:Stat.SPATKshortened", { defaultValue: "SPATK" }),
      i18next.t("pokemonInfo:Stat.SPDEFshortened", { defaultValue: "SPDEF" }),
      i18next.t("pokemonInfo:Stat.SPDshortened", { defaultValue: "SPD" })
    ];
    const statOrder = [Stat.HP, Stat.ATK, Stat.DEF, Stat.SPATK, Stat.SPDEF, Stat.SPD];
    const statBarColors = [0x4a90e2, 0xff5555, 0xffaa33, 0xaa55ff, 0x55aa55, 0xff55aa];

    const statCols = 3;
    const statRowCount = 2;
    const statLineSpacing = 14;
    const gridStartX = textX + 2;
    const colWidth = Math.floor((tooltipWidth - gridStartX - padding) / statCols);
    const maxBarW = 20;
    const barH = 3;
    const modifiedBaseStats = pokemon.getModifiedBaseStats();
    const canonicalBaseStats = displayOptions?.comparisonStats ?? pokemon.getComparisonBaseStats();

    const swaps = displayOptions?.shinyStatSwaps;
    const swappedStats = new Set<number>();
    const swappedBaseStats = modifiedBaseStats.slice();
    if (swaps) {
      for (const { from, to } of swaps) {
        const temp = swappedBaseStats[from];
        swappedBaseStats[from] = swappedBaseStats[to];
        swappedBaseStats[to] = temp;
        swappedStats.add(from);
        swappedStats.add(to);
      }
    }

    for (let sRow = 0; sRow < statRowCount; sRow++) {
      for (let sCol = 0; sCol < statCols; sCol++) {
        const idx = sRow * statCols + sCol;
        const stat = statOrder[idx];
        const colLeft = gridStartX + sCol * colWidth;
        const sy = currentY + sRow * statLineSpacing;

        const originalValue = modifiedBaseStats[stat];
        const displayValue = swaps ? swappedBaseStats[stat] : originalValue;
        const stage = stat === Stat.HP ? 0 : (pokemon.summonData?.battleStats?.[(stat - 1)] ?? 0);
        const hasSwapChange = swaps && swappedStats.has(stat) && displayValue !== originalValue;
        const hasModifierChange = !hasSwapChange && displayValue !== canonicalBaseStats[stat];

        const lbl = addTextObject(scene, colLeft + 1, sy + 1, statNames[idx], TextStyle.WINDOW, { fontSize: "30px" });
        lbl.setOrigin(0, 0);
        children.push(lbl);
        this.tagTweakTarget("QS_StatLabel", lbl);

        const barX = colLeft + 13;

        if (hasSwapChange) {
          const minVal = Math.min(originalValue, displayValue);
          const maxVal = Math.max(originalValue, displayValue);
          const isIncrease = displayValue > originalValue;
          const baseW = Math.max(2, Math.min(maxBarW, (minVal / 255) * maxBarW));
          const deltaW = Math.max(1, Math.min(maxBarW - baseW, ((maxVal - minVal) / 255) * maxBarW));

          const baseBar = scene.add.rectangle(barX, sy + 2, baseW, barH, 0x4a90e2);
          baseBar.setOrigin(0, 0);
          children.push(baseBar);
          this.tagTweakTarget("QS_StatBar", baseBar);

          const deltaBar = scene.add.rectangle(barX + baseW, sy + 2, deltaW, barH, isIncrease ? 0x00ff00 : 0xe13d3d);
          deltaBar.setOrigin(0, 0);
          children.push(deltaBar);
          this.tagTweakTarget("QS_StatBar", deltaBar);

          const valX = barX + baseW + deltaW + 2;
          const valText = addTextObject(scene, valX, sy + 1, displayValue.toString(), TextStyle.WINDOW, { fontSize: "28px" });
          valText.setOrigin(0, 0);
          valText.setColor(isIncrease ? "#78c850" : "#e13d3d");
          children.push(valText);
          this.tagTweakTarget("QS_StatValue", valText);

          const swapDeltaAmount = displayValue - originalValue;
          if (swapDeltaAmount !== 0) {
            const swapDeltaSign = swapDeltaAmount > 0 ? "+" : "";
            const swapDeltaStr = `(${swapDeltaSign}${swapDeltaAmount})`;
            const swapDeltaTextX = valX + valText.displayWidth + 1;
            const swapDeltaNumText = addTextObject(scene, swapDeltaTextX, sy + 1, swapDeltaStr, TextStyle.WINDOW, { fontSize: "26px" });
            swapDeltaNumText.setOrigin(0, 0);
            swapDeltaNumText.setColor(isIncrease ? "#78c850" : "#e13d3d");
            swapDeltaNumText.setAlpha(0.75);
            children.push(swapDeltaNumText);
            this.tagTweakTarget("QS_StatDelta", swapDeltaNumText);
          }
        } else if (hasModifierChange) {
          const rawValue = canonicalBaseStats[stat];
          const minVal = Math.min(rawValue, displayValue);
          const maxVal = Math.max(rawValue, displayValue);
          const isIncrease = displayValue > rawValue;
          const baseW = Math.max(2, Math.min(maxBarW, (minVal / 255) * maxBarW));
          const deltaW = Math.max(1, Math.min(maxBarW - baseW, ((maxVal - minVal) / 255) * maxBarW));

          const baseBar = scene.add.rectangle(barX, sy + 2, baseW, barH, 0x4a90e2);
          baseBar.setOrigin(0, 0);
          children.push(baseBar);
          this.tagTweakTarget("QS_StatBar", baseBar);

          const deltaBar = scene.add.rectangle(barX + baseW, sy + 2, deltaW, barH, isIncrease ? 0x78c850 : 0xf08030);
          deltaBar.setOrigin(0, 0);
          children.push(deltaBar);
          this.tagTweakTarget("QS_StatBar", deltaBar);

          const valX = barX + baseW + deltaW + 2;
          const valText = addTextObject(scene, valX, sy + 1, displayValue.toString(), TextStyle.WINDOW, { fontSize: "28px" });
          valText.setOrigin(0, 0);
          valText.setColor(isIncrease ? "#78c850" : "#f08030");
          children.push(valText);
          this.tagTweakTarget("QS_StatValue", valText);

          const deltaAmount = displayValue - rawValue;
          if (deltaAmount !== 0) {
            const deltaSign = deltaAmount > 0 ? "+" : "";
            const deltaStr = `(${deltaSign}${deltaAmount})`;
            const deltaTextX = valX + valText.displayWidth + 1;
            const deltaNumText = addTextObject(scene, deltaTextX, sy + 1, deltaStr, TextStyle.WINDOW, { fontSize: "26px" });
            deltaNumText.setOrigin(0, 0);
            deltaNumText.setColor(isIncrease ? "#78c850" : "#f08030");
            deltaNumText.setAlpha(0.75);
            children.push(deltaNumText);
            this.tagTweakTarget("QS_StatDelta", deltaNumText);
          }
        } else {
          const barWidth = Math.max(2, Math.min(maxBarW, (displayValue / 255) * maxBarW));
          const bar = scene.add.rectangle(barX, sy + 2, barWidth, barH, 0x4a90e2);
          bar.setOrigin(0, 0);
          children.push(bar);
          this.tagTweakTarget("QS_StatBar", bar);

          const valX = barX + barWidth + 2;
          const valText = addTextObject(scene, valX, sy + 1, displayValue.toString(), TextStyle.WINDOW, { fontSize: "28px" });
          valText.setOrigin(0, 0);
          valText.setColor("#FFFFFF");
          children.push(valText);
          this.tagTweakTarget("QS_StatValue", valText);
        }

        if (stage !== 0) {
          const lastChild = children[children.length - 1] as Phaser.GameObjects.Text;
          const stageStartX = lastChild.x + lastChild.displayWidth + 2;
          const mult = Math.max(2, 2 + stage) / Math.max(2, 2 - stage);
          const stageStr = `x${mult < 1 ? mult.toFixed(2) : mult % 1 === 0 ? mult.toFixed(0) : mult.toFixed(1)}`;
          const stageText = addTextObject(scene, stageStartX, sy + 1, stageStr, TextStyle.WINDOW, { fontSize: "28px" });
          stageText.setOrigin(0, 0);
          stageText.setColor(stage > 0 ? "#78c850" : "#f08030");
          children.push(stageText);
          this.tagTweakTarget("QS_StatStage", stageText);
        }
      }
    }

    const totalY = currentY + statRowCount * statLineSpacing;
    let displayBst = 0;
    let baseBst = 0;
    for (const s of statOrder) {
      displayBst += swaps ? swappedBaseStats[s] : modifiedBaseStats[s];
      baseBst += canonicalBaseStats[s];
    }
    const totalLabel = addTextObject(scene, gridStartX, totalY, i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }), TextStyle.WINDOW, { fontSize: "28px" });
    totalLabel.setOrigin(0, 0);
    totalLabel.setColor("#cccccc");
    children.push(totalLabel);
    this.tagTweakTarget("QS_StatTotal", totalLabel);

    const totalValText = addTextObject(scene, gridStartX + totalLabel.displayWidth + 3, totalY, displayBst.toString(), TextStyle.WINDOW, { fontSize: "28px" });
    totalValText.setOrigin(0, 0);
    totalValText.setColor("#f8f8f8");
    children.push(totalValText);
    this.tagTweakTarget("QS_StatTotal", totalValText);

    const bstDelta = displayBst - baseBst;
    if (bstDelta !== 0) {
      const bstDeltaSign = bstDelta > 0 ? "+" : "";
      const bstDeltaStr = `(${bstDeltaSign}${bstDelta})`;
      const bstDeltaText = addTextObject(scene, gridStartX + totalLabel.displayWidth + 3 + totalValText.displayWidth + 1, totalY, bstDeltaStr, TextStyle.WINDOW, { fontSize: "26px" });
      bstDeltaText.setOrigin(0, 0);
      bstDeltaText.setColor(bstDelta > 0 ? "#78c850" : "#e13d3d");
      bstDeltaText.setAlpha(0.75);
      children.push(bstDeltaText);
      this.tagTweakTarget("QS_StatDelta", bstDeltaText);
    }

    currentY += statRowCount * statLineSpacing + 14;
    return currentY;
  }

  private static renderItemsStatsView(
    scene: BattleScene,
    children: Phaser.GameObjects.GameObject[],
    pokemon: Pokemon,
    isOwn: boolean,
    bd: any,
    textX: number,
    currentY: number,
    tooltipWidth: number,
    padding: number,
    rarityHex: string,
    itemPageIndex: number = 0
  ): number {
    currentY += 2;
    currentY = this.renderSectionHeader(scene, children, i18next.t("pokemonSummary:items", { defaultValue: "ITEMS" }), textX, currentY, tooltipWidth);

    const items = pokemon.getHeldItems().sort(modifierSortFunc);
    const iconSpacing = 14;
    const iconsPerRow = 8;
    const maxItemRows = 1;
    const itemsPerPage = iconsPerRow * maxItemRows;
    const itemPageCount = Math.ceil(items.length / itemsPerPage);

    if (items.length === 0) {
      const noneText = addTextObject(scene, textX + 2, currentY, i18next.t("modifierSelectUiHandler:secondaryStatNone", { defaultValue: "\u2014" }), TextStyle.WINDOW, { fontSize: "32px" });
      noneText.setOrigin(0, 0);
      children.push(noneText);
      currentY += 8;
    } else {
      const safePage = Math.min(itemPageIndex, Math.max(0, itemPageCount - 1));
      const pageItems = itemPageCount > 1 ? items.slice(safePage * itemsPerPage, (safePage + 1) * itemsPerPage) : items;

      pageItems.forEach((item, idx) => {
        const icon = item.getIcon(scene, true);
        icon.setScale(0.4);
        const col = idx % iconsPerRow;
        const row = Math.floor(idx / iconsPerRow);
        icon.setPosition(textX + 2 + col * iconSpacing, currentY + row * iconSpacing - 2);
        icon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 32, 32), Phaser.Geom.Rectangle.Contains);
        icon.on("pointerover", () => {
          if ((scene as BattleScene).uiEditModeActive) return;
          const wm = icon.getWorldTransformMatrix();
          ModifierTooltipUtils.showForModifier(scene, item, { x: wm.tx, y: wm.ty });
        });
        icon.on("pointerout", () => {
          ModifierTooltipUtils.hideIfNotPinned(scene);
        });
        children.push(icon);
        this.tagTweakTarget("IM_ItemIcon", icon);
      });
      const displayRows = Math.max(1, Math.ceil(pageItems.length / iconsPerRow));
      currentY += displayRows * iconSpacing + 3;

      if (itemPageCount > 1) {
        const centerX = tooltipWidth / 2;
        const navY = currentY + 1;

        const leftArrow = scene.add.image(centerX - 18, navY, "cursor_reverse");
        leftArrow.setScale(0.4);
        leftArrow.setOrigin(0.5, 0.5);
        leftArrow.setInteractive({ useHandCursor: true });
        leftArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!isPrimaryPointer(pointer)) return;
          const handler = scene.ui.getHandler() as any;
          if (handler && handler.cycleItemPage) {
            handler.cycleItemPage(-1);
          }
        });
        children.push(leftArrow);

        const pageLabel = addTextObject(scene, centerX, navY, `${safePage + 1}/${itemPageCount}`, TextStyle.WINDOW, { fontSize: "30px" });
        pageLabel.setOrigin(0.5, 0.5);
        children.push(pageLabel);

        const rightArrow = scene.add.image(centerX + 18, navY, "cursor");
        rightArrow.setScale(0.4);
        rightArrow.setOrigin(0.5, 0.5);
        rightArrow.setInteractive({ useHandCursor: true });
        rightArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
          if (!isPrimaryPointer(pointer)) return;
          const handler = scene.ui.getHandler() as any;
          if (handler && handler.cycleItemPage) {
            handler.cycleItemPage(1);
          }
        });
        children.push(rightArrow);

        currentY += 8;
      }
    }

    currentY += 3;
    currentY = this.renderSectionHeader(scene, children, i18next.t("pokemonSummary:moves", { defaultValue: "MOVES" }), textX, currentY, tooltipWidth);

    const moveset = pokemon.getMoveset();
    const typeAtlasKey = getLocalizedSpriteKey("types");
    const powLabel = i18next.t("modifierSelectUiHandler:secondaryLabelPow", { defaultValue: "POW" });
    const accLabel = i18next.t("modifierSelectUiHandler:secondaryLabelAcc", { defaultValue: "ACC" });
    for (let i = 0; i < 4; i++) {
      const slot = moveset[i];
      if (!slot) {
        const emptyText = addTextObject(scene, textX + 2, currentY, i18next.t("modifierSelectUiHandler:secondaryStatNone", { defaultValue: "\u2014" }), TextStyle.WINDOW, { fontSize: "36px" });
        emptyText.setOrigin(0, 0);
        children.push(emptyText);
        currentY += 14;
        continue;
      }

      const revealed = isOwn || (bd?.revealedMoves?.has(slot.moveId) ?? false);
      if (!revealed) {
        const hiddenText = addTextObject(scene, textX + 2, currentY, i18next.t("championSelect:skillList.unknownSkill", { defaultValue: "???" }), TextStyle.WINDOW, { fontSize: "36px" });
        hiddenText.setOrigin(0, 0);
        children.push(hiddenText);
        currentY += 14;
        continue;
      }

      const move = slot.getMove(isOwn);
      const moveType = pokemon.getMoveType(move);

      let typeIconWidth = 0;
      if (scene.textures.exists(typeAtlasKey)) {
        const typeFrame = Type[moveType]?.toLowerCase() || "unknown";
        const typeIcon = scene.add.sprite(textX + 2, currentY + 3, typeAtlasKey, typeFrame);
        typeIcon.setScale(0.35);
        typeIcon.setOrigin(0, 0.5);
        children.push(typeIcon);
        typeIconWidth = typeIcon.displayWidth + 3;
        this.tagTweakTarget("IM_TypeIcon", typeIcon);
      }

      const moveNameText = addTextObject(scene, textX + 2 + typeIconWidth, currentY, slot.getName(), TextStyle.WINDOW, { fontSize: "36px" });
      moveNameText.setOrigin(0, 0);
      if (moveNameText.displayWidth > 55 - typeIconWidth) {
        const baseScale = moveNameText.scaleX;
        moveNameText.setScale(baseScale * ((55 - typeIconWidth) / moveNameText.displayWidth), moveNameText.scaleY);
      }
      children.push(moveNameText);
      this.tagTweakTarget("IM_MoveName", moveNameText);

      const power = move.power;
      const accuracy = move.accuracy;
      const powStr = power >= 0 ? power.toString() : i18next.t("pokemonBattleTooltip:notApplicable", { defaultValue: "---" });
      const accStr = accuracy >= 0 ? `${accuracy}` : i18next.t("pokemonBattleTooltip:notApplicable", { defaultValue: "---" });
      const statsStr = `${powLabel}: ${powStr} | ${accLabel}: ${accStr}`;

      let catReserveW = 0;
      if (scene.textures.exists("categories")) {
        const catFrame = MoveCategory[move.category]?.toLowerCase() || "physical";
        const catIcon = scene.add.sprite(tooltipWidth - padding - 2, currentY + 1, "categories", catFrame);
        catIcon.setScale(0.40);
        catIcon.setOrigin(1, 0);
        children.push(catIcon);
        catReserveW = catIcon.displayWidth + 4;
        this.tagTweakTarget("IM_CategoryIcon", catIcon);
      }

      const statsRightX = tooltipWidth - padding - 2 - catReserveW;
      const statsText = addTextObject(scene, statsRightX, currentY, statsStr, TextStyle.WINDOW, { fontSize: "36px" });
      statsText.setOrigin(1, 0);
      statsText.setColor("#AAAAAA");
      this.tagTweakTarget("IM_PowAcc", statsText);
      const maxStatsW = tooltipWidth - padding * 2 - 4 - 55 - catReserveW;
      if (statsText.displayWidth > maxStatsW) {
        statsText.setScale(statsText.scaleX * (maxStatsW / statsText.displayWidth), statsText.scaleY);
      }
      children.push(statsText);

      currentY += 10;

      if (move.effect && (scene as BattleScene).enableMoveInfo) {
        const effectText = addTextObject(scene, textX + 2, currentY, move.effect, TextStyle.WINDOW, {
          fontSize: "35px",
          wordWrap: { width: (tooltipWidth - padding * 2 - 4) * 6 }
        });
        effectText.setOrigin(0, 0);
        effectText.setColor("#FFFFFF");
        effectText.setAlpha(0.8);
        const maxEffectH = 20;
        if (effectText.displayHeight > maxEffectH) {
          effectText.setCrop(0, 0, effectText.width, maxEffectH / effectText.scaleY);
        }
        children.push(effectText);
        this.tagTweakTarget("IM_MoveEffect", effectText);
        currentY += Math.min(effectText.displayHeight, maxEffectH) + 2;
      }

      currentY += 2;
    }

    return currentY;
  }

  private static renderTeamView(
    scene: BattleScene,
    children: Phaser.GameObjects.GameObject[],
    playerSide: boolean,
    textX: number,
    currentY: number,
    tooltipWidth: number,
    padding: number
  ): number {

    const party = playerSide ? scene.getParty() : scene.getEnemyParty();
    const maxSlots = Math.min(party.length, 6);
    const lvLabel = i18next.t("saveSlotSelectUiHandler:lv", { defaultValue: "Lv" });
    const iconScale = 0.3775;
    const iconZoneWidth = 16;
    const teamStatNames = [
      i18next.t("pokemonInfo:Stat.HPStat", { defaultValue: "HP" }),
      i18next.t("pokemonInfo:Stat.ATKshortened", { defaultValue: "Atk" }),
      i18next.t("pokemonInfo:Stat.DEFshortened", { defaultValue: "Def" }),
      i18next.t("pokemonInfo:Stat.SPATKshortened", { defaultValue: "SpAtk" }),
      i18next.t("pokemonInfo:Stat.SPDEFshortened", { defaultValue: "SpDef" }),
      i18next.t("pokemonInfo:Stat.SPDshortened", { defaultValue: "Spd" }),
    ];

    const TEAM_COLS = 2;
    const colGapPx = 4;
    const totalContentW = tooltipWidth - padding * 2 - 4;
    const cellWidth = Math.floor((totalContentW - colGapPx * (TEAM_COLS - 1)) / TEAM_COLS);
    const nameInfoH = 7;
    const columnBlockH = 42;
    const totalRowH = nameInfoH + columnBlockH;
    const gridStartY = currentY;
    const gridRows = Math.ceil(maxSlots / TEAM_COLS);

    if (TEAM_COLS > 1 && maxSlots > 1) {
      const divX = textX + 2 + cellWidth + colGapPx / 2;
      const divider = scene.add.graphics();
      divider.lineStyle(0.5, 0x666666, 0.6);
      divider.lineBetween(divX, gridStartY, divX, gridStartY + gridRows * totalRowH);
      children.push(divider);
    }

    for (let i = 0; i < maxSlots; i++) {
      const member = party[i];
      const col = i % TEAM_COLS;
      const gridRow = Math.floor(i / TEAM_COLS);
      const cellX = textX + col * (cellWidth + colGapPx);
      const rowY = gridStartY + gridRow * totalRowH;
      const cellInfoStartX = cellX + 2 + iconZoneWidth;

      if (gridRow > 0 && col === 0) {
        const dividerLine = scene.add.graphics();
        dividerLine.lineStyle(this.SECTION_LINE_THICKNESS, this.SECTION_LINE_COLOR, this.SECTION_LINE_ALPHA);
        dividerLine.lineBetween(textX + 2, rowY, textX + 2 + totalContentW, rowY);
        children.push(dividerLine);
      }

      const icon = scene.addPokemonIcon(member, cellX - 8, rowY + 3, 0, 0);
      icon.setScale(adjustDuelmonIconScale(iconScale, member.species.generation, member.isGlitchOrSmittyForm?.()));
      children.push(icon);
      this.tagTweakTarget("TM_PokemonIcon", icon);

      const badgeReserve = member.isFusion() && member.isShiny() ? 14 : member.isFusion() || member.isShiny() ? 7 : 0;
      const lineMaxW = cellWidth - iconZoneWidth - 4 - badgeReserve;

      const isAltBuildMember = !!(member as any).altBuildId;
      const memberDisplayRank = isAltBuildMember ? Math.max(1, (member as any).altBuildRank ?? 0) : ((member as any).rankUpCount ?? 0) + 1;
      const showMemberRank = isAltBuildMember || memberDisplayRank > 1;
      const nameStr = member.getNameToRender();
      const nameText = addTextObject(scene, cellInfoStartX, rowY + 1, nameStr, TextStyle.WINDOW, { fontSize: "35px" });
      nameText.setOrigin(0, 0);

      const isDuelmonMember = member.species?.generation === 20;
      const isGlitchSmittyMember = member.isGlitchOrSmittyForm?.() ?? false;
      const isFusionMember = member.isFusion();
      const isShinyMember = member.isShiny();
      if (isDuelmonMember || isGlitchSmittyMember || isFusionMember || isShinyMember) {
        nameText.setColor(getTextColor(TextStyle.SUMMARY_GOLD));
        nameText.setShadowColor(getTextColor(TextStyle.SUMMARY_GOLD, true));
      }

      const lvStr = `${lvLabel}${member.level}`;
      const lvText = addTextObject(scene, icon.x, icon.y + icon.displayHeight + 13, lvStr, TextStyle.WINDOW, { fontSize: "27px" });
      lvText.setOrigin(0.5, 0);
      lvText.setColor("#C8C8C8");
      if (lvText.displayWidth > iconZoneWidth) {
        lvText.setScale(lvText.scaleX * (iconZoneWidth / lvText.displayWidth), lvText.scaleY);
      }
      children.push(lvText);
      this.tagTweakTarget("TM_LevelText", lvText);

      if (showMemberRank) {
        const rankY = lvText.y + lvText.displayHeight - 1;

        const rankIcon = scene.add.sprite(icon.x - 3, rankY + 4.5, "smitems", "modSoulCollected");
        rankIcon.setScale(0.10);
        rankIcon.setOrigin(0.5, 0.5);
        children.push(rankIcon);
        this.tagTweakTarget("TM_RankIcon", rankIcon);

        const rankText = addTextObject(scene, icon.x - 2, rankY + 2, intToRoman(memberDisplayRank), TextStyle.PARTY, { fontSize: "22px" });
        rankText.setShadow(0, 0, undefined);
        rankText.setStroke("#424242", 13);
        rankText.setOrigin(0, 0);
        children.push(rankText);
        this.tagTweakTarget("TM_RankText", rankText);
      }

      const ability = member.getAbility();
      let abilityStr = ability?.name || "";
      if (member.hasPassive() && member.getPassiveAbility()) {
        abilityStr += " / " + member.getPassiveAbility().name;
      }

      const sepStr = " \u00b7 ";
      const sepText = addTextObject(scene, cellInfoStartX + nameText.displayWidth, rowY + 1, sepStr, TextStyle.WINDOW, { fontSize: "24px" });
      sepText.setOrigin(0, 0);
      sepText.setColor("#888888");

      const abilityX = cellInfoStartX + nameText.displayWidth + sepText.displayWidth;
      const abilityText = addTextObject(scene, abilityX, rowY + 1, abilityStr, TextStyle.WINDOW, { fontSize: "33px" });
      abilityText.setOrigin(0, 0);
      abilityText.setColor("#C8C8C8");

      const totalLineW = nameText.displayWidth + sepText.displayWidth + abilityText.displayWidth;
      if (totalLineW > lineMaxW) {
        const scaleFactor = lineMaxW / totalLineW;
        nameText.setScale(nameText.scaleX * scaleFactor, nameText.scaleY);
        sepText.setPosition(cellInfoStartX + nameText.displayWidth, rowY + 1);
        sepText.setScale(sepText.scaleX * scaleFactor, sepText.scaleY);
        abilityText.setPosition(cellInfoStartX + nameText.displayWidth + sepText.displayWidth, rowY + 1);
        abilityText.setScale(abilityText.scaleX * scaleFactor, abilityText.scaleY);
      }
      children.push(nameText, sepText, abilityText);
      this.tagTweakTarget("TM_PokemonName", nameText);
      this.tagTweakTarget("TM_AbilityText", abilityText);

      if (member.isFusion()) {
        const fusionIcon = scene.add.image(cellX + 2 + cellWidth - 2, rowY + 1, "icon_spliced");
        fusionIcon.setScale(0.3);
        fusionIcon.setOrigin(1, 0);
        children.push(fusionIcon);
      }

      if (member.isShiny()) {
        const shinyOff = member.isFusion() ? 7 : 0;
        const shinyStar = scene.add.image(cellX + 2 + cellWidth - 2 - shinyOff, rowY + 1, "shiny_star_small");
        shinyStar.setScale(0.35);
        shinyStar.setOrigin(1, 0);
        children.push(shinyStar);
      }

      const columnTopY = rowY + nameInfoH;
      const statsAreaWidth = cellWidth - iconZoneWidth - 4;
      const statsColWidth = 55;
      const movesColX = cellInfoStartX + statsColWidth;
      const movesColWidth = statsAreaWidth - statsColWidth;

      const statLineSpacing = 6;
      const statBarHeight = 3;

      for (let sIdx = 0; sIdx < 6; sIdx++) {
        const stat = this.STAT_ORDER[sIdx];
        const sy = columnTopY + sIdx * statLineSpacing;
        const statVal = member.getModifiedBaseStats()[stat];
        const baseVal = member.getComparisonBaseStats()[stat];
        const mult = getNatureStatMultiplier(member.getNature(), stat);

        const lbl = addTextObject(scene, cellInfoStartX, sy + 3, teamStatNames[sIdx], TextStyle.WINDOW, { fontSize: "28px" });
        lbl.setOrigin(0, 0.5);
        children.push(lbl);
        this.tagTweakTarget("TM_AllStats", lbl);

        const lblW = lbl.displayWidth + 1;
        const barX = cellInfoStartX + lblW;
        const valReserve = 8;
        const effectiveMaxBar = Math.max(4, statsColWidth - lblW - valReserve - 2);
        let totalBarEnd = barX;

        if (statVal !== baseVal) {
          const minVal = Math.min(statVal, baseVal);
          const maxVal = Math.max(statVal, baseVal);
          const baseWidth = Math.max(2, Math.min(effectiveMaxBar, (minVal / 255) * effectiveMaxBar));
          const baseBar = scene.add.rectangle(barX, sy + 3, baseWidth, statBarHeight, 0x4a90e2);
          baseBar.setOrigin(0, 0.5);
          children.push(baseBar);
          this.tagTweakTarget("TM_AllStats", baseBar);

          const deltaWidth = Math.max(1, Math.min(effectiveMaxBar - baseWidth, ((maxVal - minVal) / 255) * effectiveMaxBar));
          const deltaColor = statVal > baseVal ? 0x00ff00 : 0xe13d3d;
          const deltaBar = scene.add.rectangle(barX + baseWidth, sy + 3, deltaWidth, statBarHeight, deltaColor);
          deltaBar.setOrigin(0, 0.5);
          children.push(deltaBar);
          this.tagTweakTarget("TM_AllStats", deltaBar);

          totalBarEnd = barX + baseWidth + deltaWidth;
        } else {
          const barWidth = Math.max(2, Math.min(effectiveMaxBar, (statVal / 255) * effectiveMaxBar));
          const bar = scene.add.rectangle(barX, sy + 3, barWidth, statBarHeight, 0x4a90e2);
          bar.setOrigin(0, 0.5);
          children.push(bar);
          this.tagTweakTarget("TM_AllStats", bar);
          totalBarEnd = barX + barWidth;
        }

        const val = addTextObject(scene, totalBarEnd + 1, sy + 3, statVal.toString(), TextStyle.WINDOW, { fontSize: "28px" });
        val.setOrigin(0, 0.5);
        this.tagTweakTarget("TM_AllStats", val);

        if (statVal !== baseVal) {
          val.setColor(statVal > baseVal ? "#78c850" : "#e13d3d");
          const delta = statVal - baseVal;
          const deltaSign = delta > 0 ? "+" : "";
          const deltaStr = `(${deltaSign}${delta})`;
          const deltaText = addTextObject(scene, totalBarEnd + 1 + val.displayWidth + 1, sy + 3, deltaStr, TextStyle.WINDOW, { fontSize: "24px" });
          deltaText.setOrigin(0, 0.5);
          deltaText.setColor(statVal > baseVal ? "#78c850" : "#e13d3d");
          deltaText.setAlpha(0.75);
          children.push(deltaText);
          this.tagTweakTarget("TM_AllStats", deltaText);
        } else if (mult > 1) {
          val.setColor("#f89890");
        } else if (mult < 1) {
          val.setColor("#40c8f8");
        }

        const renderedBarW = totalBarEnd - barX;
        const valMaxW = statsColWidth - lblW - renderedBarW - 3;
        if (valMaxW > 0 && val.displayWidth > valMaxW) {
          val.setScale(val.scaleX * (valMaxW / val.displayWidth), val.scaleY);
        }
        children.push(val);
      }

      const bstY = columnTopY + 6 * statLineSpacing;
      let bstSum = 0;
      let bstBaseSum = 0;
      for (let s = 0; s < 6; s++) {
        bstSum += member.getModifiedBaseStats()[this.STAT_ORDER[s]];
        bstBaseSum += member.getComparisonBaseStats()[this.STAT_ORDER[s]];
      }
      const bstLabel = addTextObject(scene, cellInfoStartX, bstY + 3, i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }), TextStyle.WINDOW, { fontSize: "24px" });
      bstLabel.setOrigin(0, 0.5);
      bstLabel.setColor("#cccccc");
      children.push(bstLabel);
      this.tagTweakTarget("TM_AllStats", bstLabel);

      const bstValText = addTextObject(scene, cellInfoStartX + bstLabel.displayWidth + 2, bstY + 3, bstSum.toString(), TextStyle.WINDOW, { fontSize: "24px" });
      bstValText.setOrigin(0, 0.5);
      const bstDelta = bstSum - bstBaseSum;
      bstValText.setColor(bstDelta !== 0 ? (bstDelta > 0 ? "#78c850" : "#e13d3d") : "#f8f8f8");
      children.push(bstValText);
      this.tagTweakTarget("TM_AllStats", bstValText);

      if (bstDelta !== 0) {
        const bstDeltaSign = bstDelta > 0 ? "+" : "";
        const bstDeltaStr = `(${bstDeltaSign}${bstDelta})`;
        const bstDeltaText = addTextObject(scene, bstValText.x + bstValText.displayWidth + 1, bstY + 3, bstDeltaStr, TextStyle.WINDOW, { fontSize: "22px" });
        bstDeltaText.setOrigin(0, 0.5);
        bstDeltaText.setColor(bstDelta > 0 ? "#78c850" : "#e13d3d");
        bstDeltaText.setAlpha(0.75);
        children.push(bstDeltaText);
        this.tagTweakTarget("TM_AllStats", bstDeltaText);
      }

      const moveset = member.getMoveset();
      const moveCellH = Math.floor(columnBlockH / 4) - 1;
      const movesTopY = columnTopY + 4;

      for (let m = 0; m < 4; m++) {
        const mcX = movesColX;
        const cellY = movesTopY + m * moveCellH;
        const centerX = mcX + movesColWidth / 2;
        const centerY = cellY + moveCellH / 2;

        const slot = moveset[m];
        const move = slot?.getMove();
        const moveType = move ? member.getMoveType(move) : Type.UNKNOWN;
        const typeFrame = Type[moveType]?.toString().toLowerCase() || "unknown";

        const moveBg = scene.add.nineslice(centerX, centerY, "type_bgs", typeFrame, 85, 15, 1, 1, 1, 1);
        moveBg.setDisplaySize(movesColWidth, moveCellH);
        moveBg.setOrigin(0.5, 0.5);
        scene.add.existing(moveBg);
        children.push(moveBg);
        this.tagTweakTarget("TM_MoveBG", moveBg);

        const moveLabel = addTextObject(scene, centerX, centerY, move?.name ?? "\u2014", TextStyle.WINDOW, { fontSize: "28px" });
        moveLabel.setOrigin(0.5, 0.5);
        const maxTextW = movesColWidth - 2;
        if (moveLabel.displayWidth > maxTextW) {
          moveLabel.setScale(moveLabel.scaleX * (maxTextW / moveLabel.displayWidth), moveLabel.scaleY);
        }
        children.push(moveLabel);
        this.tagTweakTarget("TM_MoveName", moveLabel);
      }
    }

    currentY = gridStartY + gridRows * totalRowH + 2;
    return currentY;
  }

  static buildTeamStatsContainer(
    scene: BattleScene,
    party: Pokemon[],
    options?: { hideMoves?: boolean; swapStats?: [Stat, Stat]; targetNature?: Nature; tooltipWidth?: number; recommendedMap?: Map<number, string>; displaySlice?: [number, number]; showBstTotal?: boolean }
  ): Phaser.GameObjects.Container {
    const container = scene.add.container(0, 0);
    const children: Phaser.GameObjects.GameObject[] = [];
    const tooltipWidth = options?.tooltipWidth ?? 120;
    const maxSlots = Math.min(party.length, 6);
    const iconScale = 0.35;
    const iconZoneWidth = 12;
    const teamStatNames = [
      i18next.t("pokemonInfo:Stat.HPStat", { defaultValue: "HP" }),
      i18next.t("pokemonInfo:Stat.ATKshortened", { defaultValue: "Atk" }),
      i18next.t("pokemonInfo:Stat.DEFshortened", { defaultValue: "Def" }),
      i18next.t("pokemonInfo:Stat.SPATKshortened", { defaultValue: "SpAtk" }),
      i18next.t("pokemonInfo:Stat.SPDEFshortened", { defaultValue: "SpDef" }),
      i18next.t("pokemonInfo:Stat.SPDshortened", { defaultValue: "Spd" }),
    ];

    const PARTY_COLS = 1;
    const rowWidth = tooltipWidth - 2;
    const cellWidth = Math.floor(rowWidth / PARTY_COLS);
    const statBarHeight = 3;
    const statLineSpacing = 9;
    const statCount = 6;
    const roleRowH = 10;
    const cellHeight = statCount * statLineSpacing + 4 + roleRowH;
    const swapStats = options?.swapStats;
    const targetNature = options?.targetNature;
    const recommendedMap = options?.recommendedMap;

    const displayIndices = recommendedMap ? [...recommendedMap.keys()] : Array.from({length: maxSlots}, (_, idx) => idx);
    const slicedIndices = options?.displaySlice
      ? displayIndices.slice(options.displaySlice[0], options.displaySlice[0] + options.displaySlice[1])
      : displayIndices;
    const displayCount = slicedIndices.length;

    let currentY = 0;

    for (let idx = 0; idx < displayCount; idx++) {
      const i = slicedIndices[idx];
      const member = party[i];
      const col = idx % PARTY_COLS;
      const gridRow = Math.floor(idx / PARTY_COLS);
      const cellX = col * cellWidth;
      const cellY = gridRow * cellHeight;

      if (idx > 0 && col === 0) {
        const divLine = scene.add.graphics();
        divLine.lineStyle(0.5, 0x666666, 0.40);
        divLine.lineBetween(2, cellY - 2, tooltipWidth - 8, cellY - 2);
        children.push(divLine);
      }

      const roleText = recommendedMap?.get(i);
      const statsBaseY = roleText ? cellY + roleRowH + 2 : cellY;

      if (roleText) {
        const statsStartXForRole = cellX + iconZoneWidth + 1;
        const statColWidthForRole = cellWidth - iconZoneWidth - 2;
        const roleLbl = addTextObject(scene, statsStartXForRole, cellY + 1, roleText, TextStyle.SUMMARY_GOLD, { fontSize: "32px" });
        roleLbl.setOrigin(0, 0);
        const maxRoleW = statColWidthForRole;
        if (roleLbl.displayWidth > maxRoleW) {
          roleLbl.setScale(roleLbl.scaleX * (maxRoleW / roleLbl.displayWidth), roleLbl.scaleY);
        }
        children.push(roleLbl);
      }

      const statsEndY = statsBaseY + statCount * statLineSpacing;
      const iconCenterY = (statsBaseY + statsEndY) / 2;
      const icon = scene.addPokemonIcon(member, cellX + iconZoneWidth / 2, 0, 0.5, 0);
      const finalIconScale = adjustDuelmonIconScale(iconScale, member.species.generation, member.isGlitchOrSmittyForm?.());
      icon.setScale(finalIconScale);

      const spriteInner = icon.getAt?.(0) as any;
      const trimTop = spriteInner?.frame?.customData?.spriteSourceSize?.y ?? 0;
      const cutH = spriteInner?.frame?.cutHeight ?? spriteInner?.height ?? 0;
      icon.y = iconCenterY - (trimTop + cutH / 2) * finalIconScale - 2;

      children.push(icon);

      const statsStartX = cellX + iconZoneWidth + 1;
      const statsAreaWidth = cellWidth - iconZoneWidth - 2;
      const statColWidth = statsAreaWidth;
      let bstSum = 0;

      for (let sIdx = 0; sIdx < statCount; sIdx++) {
        const stat = this.STAT_ORDER[sIdx];
        const sy = statsBaseY + sIdx * statLineSpacing;

        let statVal = member.stats[stat];
        let originalVal = statVal;
        let natureChanged = false;
        if (swapStats) {
          const [s1, s2] = swapStats;
          if (stat === s1) { statVal = member.stats[s2]; originalVal = member.stats[s1]; }
          else if (stat === s2) { statVal = member.stats[s1]; originalVal = member.stats[s2]; }
        }
        if (targetNature !== undefined) {
          const currentNature = member.getNature();
          const baseStatVal = member.getModifiedBaseStats()[stat];
          const beforeMult = getNatureStatMultiplier(currentNature, stat);
          const afterMult = getNatureStatMultiplier(targetNature, stat);
          originalVal = Math.floor(baseStatVal * beforeMult);
          statVal = Math.floor(baseStatVal * afterMult);
          natureChanged = statVal !== originalVal;
        }
        bstSum += statVal;

        const mult = targetNature !== undefined
          ? getNatureStatMultiplier(targetNature, stat)
          : getNatureStatMultiplier(member.getNature(), stat);

        const lbl = addTextObject(scene, statsStartX, sy + 3, teamStatNames[sIdx], TextStyle.WINDOW, { fontSize: "35px" });
        lbl.setOrigin(0, 0.5);
        children.push(lbl);

        const lblW = lbl.displayWidth + 1;
        const barX = statsStartX + lblW;
        const valReserve = 12;
        const effectiveMaxBar = Math.max(4, statColWidth - lblW - valReserve - 2);
        const hasChange = (swapStats && (stat === swapStats[0] || stat === swapStats[1])) || natureChanged;
        let totalBarEnd = barX;

        if (hasChange && statVal !== originalVal) {
          const minVal = Math.min(statVal, originalVal);
          const maxVal = Math.max(statVal, originalVal);
          const baseWidth = Math.max(2, Math.min(effectiveMaxBar, (minVal / 255) * effectiveMaxBar));
          const baseBar = scene.add.rectangle(barX, sy + 3, baseWidth, statBarHeight, 0x4a90e2);
          baseBar.setOrigin(0, 0.5);
          children.push(baseBar);

          const deltaWidth = Math.max(1, Math.min(effectiveMaxBar - baseWidth, ((maxVal - minVal) / 255) * effectiveMaxBar));
          const deltaColor = statVal > originalVal ? 0x00ff00 : 0xe13d3d;
          const deltaBar = scene.add.rectangle(barX + baseWidth, sy + 3, deltaWidth, statBarHeight, deltaColor);
          deltaBar.setOrigin(0, 0.5);
          children.push(deltaBar);

          totalBarEnd = barX + baseWidth + deltaWidth;
        } else {
          const barWidth = Math.max(2, Math.min(effectiveMaxBar, (statVal / 255) * effectiveMaxBar));
          const bar = scene.add.rectangle(barX, sy + 3, barWidth, statBarHeight, 0x4a90e2);
          bar.setOrigin(0, 0.5);
          children.push(bar);
          totalBarEnd = barX + barWidth;
        }

        const val = addTextObject(scene, totalBarEnd + 1, sy + 3, statVal.toString(), TextStyle.WINDOW, { fontSize: "35px" });
        val.setOrigin(0, 0.5);
        if (hasChange && statVal !== originalVal) {
          val.setColor(statVal > originalVal ? "#78c850" : "#e13d3d");
          const delta = statVal - originalVal;
          const sign = delta > 0 ? "+" : "";
          const deltaStr = `(${originalVal}${sign}${delta})`;
          const deltaText = addTextObject(scene, totalBarEnd + 1 + val.displayWidth + 2, sy + 3, deltaStr, TextStyle.WINDOW, { fontSize: "33px" });
          deltaText.setOrigin(0, 0.5);
          deltaText.setColor("#aaaaaa");
          children.push(deltaText);
        } else {
          if (mult > 1) val.setColor("#f89890");
          else if (mult < 1) val.setColor("#40c8f8");
        }

        const renderedBarW = totalBarEnd - barX;
        const valMaxW = statColWidth - lblW - renderedBarW - 4;
        if (valMaxW > 0 && val.displayWidth > valMaxW) {
          val.setScale(val.scaleX * (valMaxW / val.displayWidth), val.scaleY);
        }
        children.push(val);
      }

      if (options?.showBstTotal) {
        let beforeBstSum = 0;
        const hasModification = swapStats || targetNature !== undefined;
        if (hasModification) {
          for (let sIdx = 0; sIdx < statCount; sIdx++) {
            const stat = this.STAT_ORDER[sIdx];
            let origVal = member.stats[stat];
            if (targetNature !== undefined) {
              const currentNature = member.getNature();
              const baseStatVal = member.getModifiedBaseStats()[stat];
              origVal = Math.floor(baseStatVal * getNatureStatMultiplier(currentNature, stat));
            }
            beforeBstSum += origVal;
          }
        }
        const bstDelta = hasModification ? (bstSum - beforeBstSum) : 0;
        const bstY = statsBaseY + statCount * statLineSpacing + 2;
        const bstLabel = addTextObject(scene, statsStartX, bstY, i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }), TextStyle.WINDOW, { fontSize: "35px" });
        bstLabel.setOrigin(0, 0);
        bstLabel.setColor("#cccccc");
        children.push(bstLabel);
        const bstValText = addTextObject(scene, statsStartX + bstLabel.displayWidth + 3, bstY, bstSum.toString(), TextStyle.WINDOW, { fontSize: "35px" });
        bstValText.setOrigin(0, 0);
        bstValText.setColor(bstDelta !== 0 ? (bstDelta > 0 ? "#78c850" : "#e13d3d") : "#f8f8f8");
        children.push(bstValText);
        if (bstDelta !== 0) {
          const bstDeltaSign = bstDelta > 0 ? "+" : "";
          const bstDeltaStr = `(${bstDeltaSign}${bstDelta})`;
          const bstDeltaText = addTextObject(scene, bstValText.x + bstValText.displayWidth + 2, bstY, bstDeltaStr, TextStyle.WINDOW, { fontSize: "33px" });
          bstDeltaText.setOrigin(0, 0);
          bstDeltaText.setColor(bstDelta > 0 ? "#78c850" : "#e13d3d");
          bstDeltaText.setAlpha(0.75);
          children.push(bstDeltaText);
        }
      }

      if (col === PARTY_COLS - 1 || idx === displayCount - 1) {
        currentY = (gridRow + 1) * cellHeight;
      }
    }

    if (options?.showBstTotal && displayCount > 0) {
      currentY += 2;
    }

    for (const child of children) {
      container.add(child);
    }
    container.setData("renderedHeight", currentY);
    return container;
  }

  private static renderOpponentView(
    scene: BattleScene,
    children: Phaser.GameObjects.GameObject[],
    pokemon: Pokemon,
    isOwn: boolean,
    textX: number,
    currentY: number,
    tooltipWidth: number,
    padding: number,
    rarityHex: string
  ): number {
    const opponent = isOwn
      ? (scene.getEnemyPokemon() ?? scene.getEnemyField()[0])
      : (scene.getPlayerField()[0]);

    if (!opponent || !opponent.isOnField()) {
      const noText = addTextObject(scene, textX + 2, currentY, i18next.t("pokemonBattleTooltip:noOpponent", { defaultValue: "No opponent" }), TextStyle.WINDOW, { fontSize: "32px" });
      noText.setOrigin(0, 0);
      children.push(noText);
      return currentY + 10;
    }

    const oppBd = opponent.battleData;
    const oppOwn = opponent.isPlayer();
    return this.renderMovesView(scene, children, opponent, oppOwn, oppBd, textX, currentY, tooltipWidth, padding, rarityHex);
  }

  private static renderNavIndicator(
    scene: BattleScene,
    children: Phaser.GameObjects.GameObject[],
    currentView: number,
    totalViews: number,
    currentY: number,
    tooltipWidth: number
  ): number {
    currentY += 3;
    const centerX = tooltipWidth / 2;

    const leftArrow = scene.add.image(centerX - 18, currentY + 3, "cursor_reverse");
    leftArrow.setScale(0.5);
    leftArrow.setOrigin(0.5, 0.5);
    leftArrow.setInteractive({ useHandCursor: true });
    leftArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      const handler = scene.ui.getHandler();
      if (handler && typeof handler.processInput === "function") {
        handler.processInput(Button.LEFT);
      }
    });
    children.push(leftArrow);

    const pageText = addTextObject(scene, centerX, currentY + 3, i18next.t("pokemonBattleTooltip:pageIndicator", { current: currentView + 1, total: totalViews, defaultValue: `${currentView + 1}/${totalViews}` }), TextStyle.WINDOW, { fontSize: "35px" });
    pageText.setOrigin(0.5, 0.5);
    children.push(pageText);

    const rightArrow = scene.add.image(centerX + 18, currentY + 3, "cursor");
    rightArrow.setScale(0.5);
    rightArrow.setOrigin(0.5, 0.5);
    rightArrow.setInteractive({ useHandCursor: true });
    rightArrow.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      if (!isPrimaryPointer(pointer)) return;
      const handler = scene.ui.getHandler();
      if (handler && typeof handler.processInput === "function") {
        handler.processInput(Button.RIGHT);
      }
    });
    children.push(rightArrow);

    return currentY + 10;
  }

  static renderSingleMoveBlock(
    scene: BattleScene,
    children: Phaser.GameObjects.GameObject[],
    moveId: Moves,
    textX: number,
    currentY: number,
    tooltipWidth: number,
    padding: number,
    options?: { showPP?: boolean; showEffect?: boolean; useUpgraded?: boolean; showName?: boolean; compactSingleLine?: boolean }
  ): number {
    const baseMove = allMoves[moveId];
    if (!baseMove) return currentY;
    const move = options?.useUpgraded ? scene.getUpgradedMove(baseMove) : baseMove;

    const typeAtlasKey = getLocalizedSpriteKey("types");
    const contentLeft = textX + 2;
    const contentRight = tooltipWidth - padding - 2;

    if (options?.compactSingleLine) {
      let xCursor = contentLeft;

      if (scene.textures.exists(typeAtlasKey)) {
        const typeFrame = Type[move.type]?.toLowerCase() || "unknown";
        const typeIcon = scene.add.sprite(xCursor, currentY + 5, typeAtlasKey, typeFrame);
        typeIcon.setScale(0.30);
        typeIcon.setOrigin(0, 0.5);
        children.push(typeIcon);
        xCursor += typeIcon.displayWidth + 2;
      }

      if (options?.showName !== false) {
        const nameText = addTextObject(scene, xCursor, currentY + 2, move.name, TextStyle.WINDOW, { fontSize: "36px" });
        nameText.setOrigin(0, 0);
        children.push(nameText);
      }

      let catReserveW = 0;
      if (scene.textures.exists("categories")) {
        const catFrame = MoveCategory[move.category]?.toLowerCase() || "physical";
        const catIcon = scene.add.sprite(contentRight, currentY + 5, "categories", catFrame);
        catIcon.setScale(0.30);
        catIcon.setOrigin(1, 0.5);
        children.push(catIcon);
        catReserveW = catIcon.displayWidth + 4;
      }

      const statParts: string[] = [];
      if (move.power > 0) statParts.push(`POW: ${move.power}`);
      if (move.accuracy > 0) statParts.push(`ACC: ${move.accuracy}`);
      if (options?.showPP !== false && move.pp > 0) statParts.push(`PP: ${move.pp}`);

      if (statParts.length > 0) {
        const statsStr = statParts.join(" | ");
        const statsRightX = contentRight - catReserveW;
        const statsText = addTextObject(scene, statsRightX, currentY + 2, statsStr, TextStyle.WINDOW, { fontSize: "36px" });
        statsText.setOrigin(1, 0);
        statsText.setColor("#AAAAAA");
        statsText.setShadow(0, 0, undefined);
        children.push(statsText);
      }

      currentY += 10;

      if (options?.showEffect !== false && move.effect) {
        const wrapWidth = (tooltipWidth - padding * 2 - 4) * 6;
        const effectText = addTextObject(scene, contentLeft, currentY + 1, move.effect, TextStyle.WINDOW, {
          fontSize: "35px",
          wordWrap: { width: wrapWidth }
        });
        effectText.setOrigin(0, 0);
        effectText.setColor("#FFFFFF");
        effectText.setAlpha(0.80);
        children.push(effectText);
        const maxEffectH = 24;
        if (effectText.displayHeight > maxEffectH) {
          effectText.setCrop(0, 0, effectText.width, maxEffectH * 6);
          currentY += maxEffectH + 2;
        } else {
          currentY += effectText.displayHeight + 2;
        }
      }

      return currentY;
    }

    let typeIconWidth = 0;
    if (scene.textures.exists(typeAtlasKey)) {
      const typeFrame = Type[move.type]?.toLowerCase() || "unknown";
      const typeIcon = scene.add.sprite(contentLeft, currentY + 5, typeAtlasKey, typeFrame);
      typeIcon.setScale(0.35);
      typeIcon.setOrigin(0, 0.5);
      children.push(typeIcon);
      typeIconWidth = typeIcon.displayWidth + 2;
    }

    if (options?.showName !== false) {
      const nameText = addTextObject(scene, contentLeft + typeIconWidth, currentY + 2, move.name, TextStyle.WINDOW, { fontSize: "36px" });
      nameText.setOrigin(0, 0);
      const maxNameW = (tooltipWidth * 0.55) - typeIconWidth - 4;
      if (nameText.displayWidth > maxNameW && maxNameW > 0) {
        nameText.setScale(nameText.scaleX * (maxNameW / nameText.displayWidth), nameText.scaleY);
      }
      children.push(nameText);
    }

    if (options?.showName !== false) {
      currentY += 10;
    }

    const statParts: string[] = [];
    if (move.power > 0) statParts.push(`POW: ${move.power}`);
    if (move.accuracy > 0) statParts.push(`ACC: ${move.accuracy}`);
    if (options?.showPP !== false && move.pp > 0) statParts.push(`PP: ${move.pp}`);

    if (statParts.length > 0) {
      const statsStr = statParts.join(" | ");
      const statsText = addTextObject(scene, contentRight, currentY + 2, statsStr, TextStyle.WINDOW, { fontSize: "36px" });
      statsText.setOrigin(1, 0);
      statsText.setColor("#AAAAAA");
      statsText.setShadow(0, 0, undefined);
      children.push(statsText);
    }

    if (scene.textures.exists("categories")) {
      const catIcon = scene.add.sprite(contentLeft, currentY + 4, "categories", move.category.toString());
      catIcon.setScale(0.40);
      catIcon.setOrigin(0, 0.5);
      children.push(catIcon);
    }

    if (statParts.length > 0 || scene.textures.exists("categories")) {
      currentY += 10;
    }

    if (options?.showEffect !== false && move.effect) {
      const wrapWidth = (tooltipWidth - padding * 2 - 4) * 6;
      const effectText = addTextObject(scene, contentLeft, currentY + 1, move.effect, TextStyle.WINDOW, {
        fontSize: "35px",
        wordWrap: { width: wrapWidth }
      });
      effectText.setOrigin(0, 0);
      effectText.setColor("#FFFFFF");
      effectText.setAlpha(0.80);
      children.push(effectText);
      const maxEffectH = 24;
      if (effectText.displayHeight > maxEffectH) {
        effectText.setCrop(0, 0, effectText.width, maxEffectH * 6);
        currentY += maxEffectH + 2;
      } else {
        currentY += effectText.displayHeight + 2;
      }
    }

    return currentY;
  }

  static isActive(): boolean {
    return this.container !== null;
  }

  static showGlitchFormView(
    scene: BattleScene,
    data: {
      speciesName?: string | null;
      formName?: string | null;
      description?: string;
      types?: Type[];
      abilities?: Abilities[];
      targetStats?: number[];
      targetTotal?: number;
      baseStats?: number[];
      baseTotal?: number;
      formChangeItem?: number | null;
    } | null,
    focusedAbilityIndex: number,
    rarity: SkillTreeRarity,
    positionOverride: { x: number; anchorY?: number }
  ): void {
    this.hide();
    this.clearTweakTargets();

    if (!data) return;

    const rarityColors = getUpgradeRarityColors(rarity);
    const rarityHex = `#${rarityColors.border.toString(16).padStart(6, "0")}`;

    this.container = scene.add.container(0, 0);
    this.container.setDepth(200);

    const tooltipWidth = this.TOOLTIP_WIDTH;
    this._activeTooltipWidth = tooltipWidth;
    const padding = this.PADDING;
    const textX = padding + 2;

    const nsBg = scene.add.nineslice(0, 0, "tooltip_info", undefined, tooltipWidth, 100, 12, 12, 12, 12);
    nsBg.setOrigin(0, 0);

    const formTitle = data.formName || i18next.t("skillTree:fallback.unknownGlitchForm");
    const titleText = addTextObject(scene, tooltipWidth / 2 + 2, 8, formTitle, TextStyle.WINDOW, { fontSize: "40px" });
    titleText.setOrigin(0.5, 0.5);
    titleText.setColor(rarityHex);
    if (titleText.displayWidth > tooltipWidth - 10) {
      const bs = titleText.scaleX;
      titleText.setScale(bs * ((tooltipWidth - 10) / titleText.displayWidth), titleText.scaleY);
    }

    const rarityString = rarity.toString();
    const speciesSubtitle = i18next.t(`championSelect:rarity.${rarityString}`, { defaultValue: rarityString.toUpperCase() });
    const subtitleText = addTextObject(scene, tooltipWidth / 2 + 2, 17, speciesSubtitle, TextStyle.WINDOW, { fontSize: "30px" });
    subtitleText.setOrigin(0.5, 0.5);
    subtitleText.setTint(rarityColors.border);

    const rarityBar = scene.add.graphics();
    rarityBar.fillStyle(0x0f0f1e, 1.0);
    rarityBar.fillRect(2, 14, tooltipWidth - 4, this.RARITY_BAR_HEIGHT);

    const children: Phaser.GameObjects.GameObject[] = [nsBg, rarityBar, titleText, subtitleText];

    const types = (data.types || []).filter(t => t !== Type.UNKNOWN);
    const badgeX = tooltipWidth - 12;
    if (types.length > 0) {
      if (types.length === 1) {
        const frame = Type[types[0]]?.toLowerCase() || "unknown";
        const spr = scene.add.sprite(badgeX, 17, "pbinfo_enemy_type", frame);
        spr.setScale(0.35);
        spr.setOrigin(1, 0.5);
        children.push(spr);
      } else {
        const frame0 = Type[types[0]]?.toLowerCase() || "unknown";
        const frame1 = Type[types[1]]?.toLowerCase() || "unknown";
        const spr1 = scene.add.sprite(badgeX, 17, "pbinfo_enemy_type1", frame0);
        spr1.setScale(0.35);
        spr1.setOrigin(1, 1);
        children.push(spr1);
        const spr2 = scene.add.sprite(badgeX, 17, "pbinfo_enemy_type2", frame1);
        spr2.setScale(0.35);
        spr2.setOrigin(1, 0);
        children.push(spr2);
      }
    }

    let currentY = 14 + this.RARITY_BAR_HEIGHT + 2;

    const contentLeft = textX + 2;
    const contentRight = tooltipWidth - padding - 2;
    const totalContentW = contentRight - contentLeft;

    const descLabel = i18next.t("modifierSelectUiHandler:tooltipDescriptionHeader", { defaultValue: "DESCRIPTION" });

    const headerHeight = 6;
    const headerCenterY = currentY + headerHeight / 2;

    const descHeaderText = addTextObject(scene, textX, headerCenterY, descLabel, TextStyle.WINDOW, {
      fontSize: "33px", fontStyle: "normal", fontFamily: "pkmnems", letterSpacing: 2
    });
    descHeaderText.setOrigin(0, 0.5);
    descHeaderText.setColor(this.SECTION_HEADER_COLOR);
    descHeaderText.setAlpha(this.SECTION_HEADER_ALPHA);
    descHeaderText.setShadow(0, 0, undefined);

    const headerLine = scene.add.graphics();
    headerLine.lineStyle(this.SECTION_LINE_THICKNESS, this.SECTION_LINE_COLOR, this.SECTION_LINE_ALPHA);
    const descLineStartX = textX + descHeaderText.displayWidth + 4;
    if (contentRight > descLineStartX) {
      headerLine.lineBetween(descLineStartX, headerCenterY, contentRight, headerCenterY);
    }

    children.push(descHeaderText, headerLine);
    currentY += headerHeight + 1;

    const species = data.speciesName || "";
    const form = data.formName || "";
    let descText: string;
    if (data.description) {
      descText = data.description;
    } else if (data.isSmitty) {
      descText = i18next.t("skillTree:descriptions.smittyFormTooltipDescription");
    } else if (species && form) {
      const itemKey = typeof data.formChangeItem === "number" ? (FormChangeItem[data.formChangeItem] || "NONE") : "NONE";
      const item = i18next.t(`modifierType:FormChangeItem.${itemKey}`, { defaultValue: itemKey });
      descText = i18next.t("skillTree:descriptions.forbiddenFormUnlockRunIntro", { species, form, item });
    } else {
      descText = i18next.t("skillTree:descriptions.randomGlitchFormsForRun");
    }

    const descObj = addTextObject(scene, contentLeft, currentY, descText, TextStyle.WINDOW, { fontSize: "31px" });
    descObj.setOrigin(0, 0);
    const descScaleX = descObj.scaleX || 1;
    const descWrapWidth = Math.max(0, (totalContentW - 4) / descScaleX);
    descObj.setStyle({ ...(descObj.style as any), wordWrap: { width: descWrapWidth, useAdvancedWrap: true } } as any);
    descObj.setColor("#F0F0F0");
    children.push(descObj);

    currentY = currentY + descObj.displayHeight + 3;
    const abilities: Abilities[] = Array.isArray(data.abilities) ? data.abilities : [];
    if (abilities.length > 0) {
      currentY += 3;
      currentY = this.renderSectionHeader(scene, children, i18next.t("pokemonSummary:ability", { defaultValue: "ABILITY" }), textX, currentY, tooltipWidth);

      const safeIdx = abilities.length > 0 ? ((focusedAbilityIndex % abilities.length) + abilities.length) % abilities.length : 0;
      const focusedAbility = abilities[safeIdx];

      for (let i = 0; i < abilities.length; i++) {
        const ab = allAbilities[abilities[i]];
        const abName = ab?.name || i18next.t("skillTree:fallback.unknownAbility");
        const isFocused = i === safeIdx;

        const abNameText = addTextObject(scene, textX + 2 + i * 0, currentY, abName, TextStyle.WINDOW, { fontSize: "36px" });
        abNameText.setOrigin(0, 0);
        abNameText.setColor(isFocused ? "#78c850" : "#888888");

        if (i === 0) {
          abNameText.setPosition(textX + 2, currentY);
        } else {
          const prevChildren = children.filter(c => (c as any)._abNameTag);
          let accX = textX + 2;
          for (const pc of prevChildren) {
            accX += (pc as Phaser.GameObjects.Text).displayWidth + 6;
          }
          abNameText.setPosition(accX, currentY);
        }
        (abNameText as any)._abNameTag = true;
        children.push(abNameText);
      }

      currentY += 8;

      if (focusedAbility && allAbilities[focusedAbility]?.description) {
        const abDesc = addTextObject(scene, textX + 2, currentY, allAbilities[focusedAbility].description, TextStyle.WINDOW, { fontSize: "36px" });
        abDesc.setOrigin(0, 0);
        abDesc.setColor("#F0F0F0");
        const abDescScaleX = abDesc.scaleX || 1;
        const abWrapWidth = Math.max(0, (tooltipWidth - padding * 2 - 4) / abDescScaleX);
        abDesc.setStyle({ ...(abDesc.style as any), wordWrap: { width: abWrapWidth, useAdvancedWrap: true } } as any);
        children.push(abDesc);
        currentY += abDesc.displayHeight + 2;
      }

      if (abilities.length > 1) {
        const navContainer = scene.add.container(textX + 2, currentY);
        const arrowStr = `\u2190 ${safeIdx + 1}/${abilities.length} \u2192  `;
        const arrowText = addTextObject(scene, 0, 0, arrowStr, TextStyle.WINDOW, { fontSize: "30px" });
        arrowText.setOrigin(0, 0);
        arrowText.setColor("#888888");
        navContainer.add(arrowText);

        const inputMethod = scene.inputMethod || "keyboard";
        const gamepadType = inputMethod === "gamepad"
          ? (scene.inputController?.getConfig(scene.inputController.selectedDevice[Device.GAMEPAD])?.padType || "keyboard")
          : "keyboard";
        const isGamepad = gamepadType !== "keyboard" && inputMethod !== "touch";
        const iconPath = isGamepad
          ? (scene.inputController?.getIconForLatestInputRecorded("BUTTON_STATS") || "C.png")
          : "C.png";
        const keySprite = scene.add.sprite(arrowText.displayWidth, arrowText.displayHeight / 2, gamepadType);
        keySprite.setFrame(iconPath);
        keySprite.setScale(isGamepad ? 0.5 : 0.4);
        keySprite.setOrigin(0, 0.5);
        navContainer.add(keySprite);

        children.push(navContainer);
        currentY += arrowText.displayHeight + 2;
      }
    }

    currentY += 3;

    if (Array.isArray(data.targetStats) && data.targetStats.length === 6) {
      currentY = this.renderSectionHeader(scene, children, i18next.t("pokemonSummary:stats", { defaultValue: "STATS" }), textX, currentY, tooltipWidth);

      const statNames = [
        i18next.t("pokemonInfo:Stat.HPStat", { defaultValue: "HP" }),
        i18next.t("pokemonInfo:Stat.ATKshortened", { defaultValue: "ATK" }),
        i18next.t("pokemonInfo:Stat.DEFshortened", { defaultValue: "DEF" }),
        i18next.t("pokemonInfo:Stat.SPATKshortened", { defaultValue: "SPATK" }),
        i18next.t("pokemonInfo:Stat.SPDEFshortened", { defaultValue: "SPDEF" }),
        i18next.t("pokemonInfo:Stat.SPDshortened", { defaultValue: "SPD" })
      ];
      const statCols = 3;
      const statRowCount = 2;
      const statLineSpacing = 7;
      const gridStartX = textX + 2;
      const colWidth = Math.floor((tooltipWidth - gridStartX - padding) / statCols);
      const maxBarW = 20;
      const barH = 3;

      for (let sRow = 0; sRow < statRowCount; sRow++) {
        for (let sCol = 0; sCol < statCols; sCol++) {
          const idx = sRow * statCols + sCol;
          const colLeft = gridStartX + sCol * colWidth;
          const sy = currentY + sRow * statLineSpacing;
          const baseValue = data.targetStats[idx] || 0;

          const lbl = addTextObject(scene, colLeft + 1, sy + 1, statNames[idx], TextStyle.WINDOW, { fontSize: "30px" });
          lbl.setOrigin(0, 0);
          children.push(lbl);

          const barX = colLeft + 13;
          const barWidth = Math.max(2, Math.min(maxBarW, (baseValue / 255) * maxBarW));
          const bar = scene.add.rectangle(barX, sy + 2, barWidth, barH, 0x4a90e2);
          bar.setOrigin(0, 0);
          children.push(bar);

          const valText = addTextObject(scene, barX + barWidth + 2, sy + 1, baseValue.toString(), TextStyle.WINDOW, { fontSize: "28px" });
          valText.setOrigin(0, 0);
          valText.setColor("#FFFFFF");
          children.push(valText);
        }
      }

      currentY += statRowCount * statLineSpacing + 2;

      const totalValue = data.targetTotal ?? data.targetStats.reduce((s, v) => s + (v || 0), 0);
      const totalLabel = addTextObject(scene, gridStartX, currentY, i18next.t("pokemonInfo:Stat.Total", { defaultValue: "Total" }), TextStyle.WINDOW, { fontSize: "28px" });
      totalLabel.setOrigin(0, 0);
      totalLabel.setColor("#cccccc");
      children.push(totalLabel);
      const totalValText = addTextObject(scene, gridStartX + totalLabel.displayWidth + 3, currentY, totalValue.toString(), TextStyle.WINDOW, { fontSize: "28px" });
      totalValText.setOrigin(0, 0);
      children.push(totalValText);
      if (data.baseTotal != null && data.baseTotal !== totalValue) {
        const bstDelta = totalValue - data.baseTotal;
        const bstDeltaStr = `(${bstDelta > 0 ? "+" : ""}${bstDelta})`;
        totalValText.setColor(bstDelta > 0 ? "#78c850" : "#e13d3d");
        const bstDeltaText = addTextObject(scene, totalValText.x + totalValText.displayWidth + 1, currentY, bstDeltaStr, TextStyle.WINDOW, { fontSize: "26px" });
        bstDeltaText.setOrigin(0, 0);
        bstDeltaText.setColor(bstDelta > 0 ? "#78c850" : "#e13d3d");
        bstDeltaText.setAlpha(0.75);
        children.push(bstDeltaText);
      } else {
        totalValText.setColor("#f8f8f8");
      }
      currentY += 8;
    }

    const hintKey = data.isSmitty
      ? "skillTree:descriptions.smittyFormTooltipHint"
      : "skillTree:descriptions.glitchFormTooltipHint";
    const hintStr = i18next.t(hintKey);
    if (hintStr && hintStr !== hintKey) {
      const loreStripePad = 3;
      const hintObj = addBBCodeTextObject(scene, tooltipWidth / 2, 0, hintStr, TextStyle.WINDOW, { fontSize: "30px", fontStyle: "italic" });
      hintObj.setOrigin(0.5, 0);
      hintObj.setColor("#B0B0B0");
      const hintScaleX = hintObj.scaleX || 1;
      const hintWrapWidth = Math.max(0, (tooltipWidth - padding * 2 - 8) / hintScaleX);
      hintObj.setStyle({ ...(hintObj.style as any), wordWrap: { width: hintWrapWidth, useAdvancedWrap: true } } as any);
      const hintTextH = Math.min(hintObj.displayHeight, 50);
      const hintBarHeight = hintTextH + loreStripePad * 2;
      currentY += 5;
      const loreBarY = currentY;
      const hintBarBg = scene.add.graphics();
      hintBarBg.fillStyle(0x0f0f1e, 0.85);
      hintBarBg.fillRect(2, loreBarY, tooltipWidth - 4, hintBarHeight);
      children.push(hintBarBg);
      hintObj.setPosition(tooltipWidth / 2, loreBarY + loreStripePad);
      children.push(hintObj);
      currentY += hintBarHeight;
    }

    const finalHeight = currentY + 2;
    nsBg.setDisplaySize(tooltipWidth, finalHeight);

    this.container.add(children);

    const gpW = tooltipWidth;
    const gpH = finalHeight;
    attachModalBackground(scene, this.container, () => ({
      bgX: 0, bgY: 0, bgWidth: gpW, bgHeight: gpH
    }), { mask: false, alphaMultiplier: 0.6 });

    scene.uiContainer.add(this.container);

    let uiX: number;
    let uiY: number;
    if (positionOverride?.anchorY !== undefined) {
      const modalHeight = scene.game.canvas.height / 6;
      let localY = positionOverride.anchorY - finalHeight / 2;
      localY = Math.max(-modalHeight + 4, Math.min(-finalHeight - 4, localY));
      uiX = positionOverride.x;
      uiY = localY + modalHeight;
    } else {
      const tooltipY = Math.max(2, Math.min(44, 130 - finalHeight));
      uiX = positionOverride.x;
      uiY = tooltipY;
    }

    if (positionOverride) {
      scene.uiContainer.remove(this.container);
    }
    this.attachTooltipContainer(scene, this.container, uiX, uiY, !!positionOverride);
  }

  static hide(): void {
    if (this.container) {
      const s = this.container.scene as BattleScene;
      if (s) ModifierTooltipUtils.hideIfNotPinned(s);
      this.container.destroy();
      this.container = null;
    }
  }

  private static renderSectionHeader(
    scene: BattleScene,
    children: Phaser.GameObjects.GameObject[],
    label: string,
    textX: number,
    currentY: number,
    tooltipWidth: number
  ): number {
    const headerHeight = 6;
    const headerCenterY = currentY + headerHeight / 2;
    const header = addTextObject(scene, textX, headerCenterY, label, TextStyle.WINDOW, {
      fontSize: "33px",
      fontStyle: "normal",
      fontFamily: "pkmnems",
      letterSpacing: 2
    });
    header.setOrigin(0, 0.5);
    header.setColor(this.SECTION_HEADER_COLOR);
    header.setAlpha(this.SECTION_HEADER_ALPHA);
    header.setShadow(0, 0, undefined);

    const line = scene.add.graphics();
    line.lineStyle(this.SECTION_LINE_THICKNESS, this.SECTION_LINE_COLOR, this.SECTION_LINE_ALPHA);
    const lineStartX = textX + header.displayWidth + 4;
    const lineEndX = tooltipWidth - this.PADDING - 2;
    if (lineEndX > lineStartX) {
      line.lineBetween(lineStartX, headerCenterY, lineEndX, headerCenterY);
    }

    children.push(header, line);
    return currentY + headerHeight + 1;
  }

  private static tweakGraphics: Phaser.GameObjects.Graphics | null = null;
  private static playerTweakRect = { x: 42, y: 90, w: 113, h: 41 };
  private static enemyTweakRect = { x: 203, y: 19, w: 73, h: 65 };
  private static activeHoverBoxTarget: "player" | "enemy" = "enemy";
  private static tweakMode: "position" | "size" = "position";
  private static tweakActive = false;

  static setActiveHoverBox(target: "player" | "enemy"): void {
    this.activeHoverBoxTarget = target;
  }

  private static getActiveTweakRect(): { x: number; y: number; w: number; h: number } {
    return this.activeHoverBoxTarget === "player" ? this.playerTweakRect : this.enemyTweakRect;
  }

  static showHoverTweak(scene: BattleScene): void {
    if (!this.tweakGraphics) {
      this.tweakGraphics = scene.add.graphics();
      this.tweakGraphics.setDepth(9999);
      (scene as any).uiContainer.add(this.tweakGraphics);
    }
    this.tweakActive = true;
    this.drawTweakRect();
  }

  static hideHoverTweak(): void {
    if (this.tweakGraphics) {
      this.tweakGraphics.destroy();
      this.tweakGraphics = null;
    }
    this.tweakActive = false;
  }

  static isTweakActive(): boolean {
    return this.tweakActive;
  }

  static setTweakMode(mode: "position" | "size"): void {
    this.tweakMode = mode;
  }

  static resetTweakRect(): void {
    if (this.activeHoverBoxTarget === "player") {
      this.playerTweakRect = { x: 42, y: 90, w: 113, h: 41 };
    } else {
      this.enemyTweakRect = { x: 203, y: 19, w: 73, h: 65 };
    }
    this.drawTweakRect();
  }

  static applyTweakInput(direction: string): void {
    const step = 1;
    const rect = this.getActiveTweakRect();
    if (this.tweakMode === "position") {
      if (direction === "left") rect.x -= step;
      if (direction === "right") rect.x += step;
      if (direction === "up") rect.y -= step;
      if (direction === "down") rect.y += step;
    } else {
      if (direction === "left") rect.w = Math.max(1, rect.w - step);
      if (direction === "right") rect.w += step;
      if (direction === "up") rect.h = Math.max(1, rect.h - step);
      if (direction === "down") rect.h += step;
    }
    this.drawTweakRect();
  }

  static snapshotTweak(): void {
    const rect = this.getActiveTweakRect();
    const output = `[BTL-TOOLTIP-TWEAK] [${this.activeHoverBoxTarget.toUpperCase()}] ${JSON.stringify(rect)} mode: ${this.tweakMode}`;
    console.log(output);
    tweakCopyToClipboard(output);
  }

  private static drawTweakRect(): void {
    if (!this.tweakGraphics) return;
    this.tweakGraphics.clear();
    const pRect = this.playerTweakRect;
    const eRect = this.enemyTweakRect;
    const activeColor = 0x00ff00;
    const inactiveColor = 0x888888;
    const pColor = this.activeHoverBoxTarget === "player" ? activeColor : inactiveColor;
    const eColor = this.activeHoverBoxTarget === "enemy" ? activeColor : inactiveColor;
    this.tweakGraphics.fillStyle(pColor, 0.15);
    this.tweakGraphics.fillRect(pRect.x, pRect.y, pRect.w, pRect.h);
    this.tweakGraphics.lineStyle(1, pColor, 0.8);
    this.tweakGraphics.strokeRect(pRect.x, pRect.y, pRect.w, pRect.h);
    this.tweakGraphics.fillStyle(eColor, 0.15);
    this.tweakGraphics.fillRect(eRect.x, eRect.y, eRect.w, eRect.h);
    this.tweakGraphics.lineStyle(1, eColor, 0.8);
    this.tweakGraphics.strokeRect(eRect.x, eRect.y, eRect.w, eRect.h);
  }

  private static enemyHoverZone: Phaser.GameObjects.Zone | null = null;

  static ensureEnemyHoverZone(scene: BattleScene): void {
    return;
    if (this.enemyHoverZone) return;
    const w = 73;
    const h = 65;
    this.enemyHoverZone = scene.add.zone(203, 19, w, h);
    this.enemyHoverZone.setOrigin(0, 0);
    (scene as any).uiContainer.add(this.enemyHoverZone);
    this.enemyHoverZone.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, w, h),
      Phaser.Geom.Rectangle.Contains
    );
    this.enemyHoverZone.on("pointerover", () => {
      if (!scene.currentBattle?.started) return;
      if (scene.uiEditModeActive) return;
      const mode = scene.ui.getMode();
      if (mode === Mode.POKEMON_BATTLE_TOOLTIP) return;
      if (mode !== Mode.COMMAND && mode !== Mode.MESSAGE) return;
      const enemy = scene.getEnemyPokemon() ?? scene.getEnemyField()[0];
      if (!enemy || !enemy.isOnField()) return;
      scene.time.delayedCall(1, () => {
        if (scene.uiEditModeActive) return;
        const currentMode = scene.ui.getMode();
        if (currentMode !== Mode.COMMAND && currentMode !== Mode.MESSAGE) return;
        scene.ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, enemy, 0, true);
      });
    });
    this.enemyHoverZone.on("pointerout", () => {
      const mode = scene.ui.getMode();
      if (mode === Mode.POKEMON_BATTLE_TOOLTIP) {
        const handler = scene.ui.getHandler() as any;
        if (handler.isPinned?.() || handler.getViewIndex?.() > 0) return;
        handler.clear?.();
        scene.ui.revertMode();
        return;
      }
      PokemonBattleTooltipUtils.hide();
    });
  }

  static destroyEnemyHoverZone(): void {
    if (this.enemyHoverZone) {
      this.enemyHoverZone.destroy();
      this.enemyHoverZone = null;
    }
  }

  private static playerHoverZone: Phaser.GameObjects.Zone | null = null;

  static ensurePlayerHoverZone(scene: BattleScene): void {
    return;
    if (this.playerHoverZone) return;
    const rect = this.playerTweakRect;
    this.playerHoverZone = scene.add.zone(rect.x, rect.y, rect.w, rect.h);
    this.playerHoverZone.setOrigin(0, 0);
    (scene as any).uiContainer.add(this.playerHoverZone);
    this.playerHoverZone.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, rect.w, rect.h),
      Phaser.Geom.Rectangle.Contains
    );
    this.playerHoverZone.on("pointerover", () => {
      if (!scene.currentBattle?.started) return;
      if (scene.uiEditModeActive) return;
      const mode = scene.ui.getMode();
      if (mode === Mode.POKEMON_BATTLE_TOOLTIP) return;
      if (mode !== Mode.COMMAND && mode !== Mode.MESSAGE) return;
      const player = scene.getPlayerPokemon() ?? scene.getPlayerField()[0];
      if (!player || !player.isOnField()) return;
      scene.time.delayedCall(1, () => {
        if (scene.uiEditModeActive) return;
        const currentMode = scene.ui.getMode();
        if (currentMode !== Mode.COMMAND && currentMode !== Mode.MESSAGE) return;
        scene.ui.setOverlayMode(Mode.POKEMON_BATTLE_TOOLTIP, player, 0, true);
      });
    });
    this.playerHoverZone.on("pointerout", () => {
      const mode = scene.ui.getMode();
      if (mode === Mode.POKEMON_BATTLE_TOOLTIP) {
        const handler = scene.ui.getHandler() as any;
        if (handler.isPinned?.() || handler.getViewIndex?.() > 0) return;
        handler.clear?.();
        scene.ui.revertMode();
        return;
      }
      PokemonBattleTooltipUtils.hide();
    });
  }

  static destroyPlayerHoverZone(): void {
    if (this.playerHoverZone) {
      this.playerHoverZone.destroy();
      this.playerHoverZone = null;
    }
  }

  static disableBattleHoverZones(): void {
    if (this.enemyHoverZone) this.enemyHoverZone.disableInteractive();
    if (this.playerHoverZone) this.playerHoverZone.disableInteractive();
  }

  static enableBattleHoverZones(): void {
    if (this.enemyHoverZone) this.enemyHoverZone.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, 73, 65),
      Phaser.Geom.Rectangle.Contains
    );
    if (this.playerHoverZone) {
      const rect = this.playerTweakRect;
      this.playerHoverZone.setInteractive(
        new Phaser.Geom.Rectangle(0, 0, rect.w, rect.h),
        Phaser.Geom.Rectangle.Contains
      );
    }
  }
}