import * as ModifierTypes from "./modifier-type";
import BattleScene from "../battle-scene";
import { SkillPointSources } from "../system/skill-point-sources";
import {getLevelTotalExp} from "../data/exp";
import {MAX_PER_TYPE_POKEBALLS, PokeballType} from "../data/pokeball";
import Pokemon, {PlayerPokemon} from "../field/pokemon";
import {Stat} from "../data/pokemon-stat";
import {addTextObject, TextStyle} from "../ui/text";
import {setChangeNormalTyping, Type, getTypeRgb} from "../data/type";
import {EvolutionPhase} from "../phases/evolution-phase";
import {FusionSpeciesFormEvolution, pokemonEvolutions, pokemonPrevolutions} from "../data/pokemon-evolutions";
import {getPokemonNameWithAffix} from "../messages";
import * as Utils from "../utils";
import {TempBattleStat} from "../data/temp-battle-stat";
import {getBerryEffectFunc, getBerryPredicate} from "../data/berry";
import {BattlerTagType} from "#enums/battler-tag-type";
import {BerryType} from "#enums/berry-type";
import {StatusEffect, getStatusEffectHealText} from "../data/status-effect";
import {achvs} from "../system/achv";
import {VoucherType} from "../system/voucher";
import {pokemonFormChanges, SpeciesFormChange, SpeciesFormChangeItemTrigger, AltBuildTrigger} from "../data/pokemon-forms";
import {FormChangeItem} from "#enums/form-change-items";
import {Nature} from "#app/data/nature";
import Overrides from "#app/overrides";
import {Species} from "#enums/species";
import {SpeciesFormKey} from "#enums/species-form-key";
import i18next from "i18next";

import {allMoves} from "#app/data/move";
import {Abilities} from "#app/enums/abilities";
import { calculateAltBuildStatsWithSwapping } from "../data/alt-build-stat-calculator";
import {LearnMovePhase} from "#app/phases/learn-move-phase.js";
import {LevelUpPhase} from "#app/phases/level-up-phase.js";
import {PokemonHealPhase} from "#app/phases/pokemon-heal-phase.js";
import {Unlockables} from "#app/system/unlockables.js";
import {UnlockPhase} from "#app/phases/unlock-phase.js";

import {RunType, RunDuration} from "#enums/quest-type-conditions";
import Trainer from "#app/field/trainer";
import Move from "#app/data/move";
import {Ability, allAbilities} from "#app/data/ability";
import {QuestState, QuestUnlockables, QuestUnlockData} from "#app/system/game-data";
import {RewardType} from "#enums/reward-type";
import {QuestUnlockPhase} from "#app/phases/quest-unlock-phase";
import {PermaDuration, PermaType} from "#app/modifier/perma-modifiers";
import {hasPermaModifierByType, hasTerastallizeAccess} from '#app/modifier/perma-modifier-checker';
import {QuestStage} from "#app/modifier/modifier-quest-config";
import {getRandomPermaModifierKey, ModifierRewardPhase} from "#app/phases/modifier-reward-phase";
import {UnlockUniSmittyPhase} from "#app/phases/unlock-unismitty-phase";
import {QuestManagerPhase} from "#app/phases/quest-manager-phase";
import {Phase} from "#app/phase";
import {Mode} from "#app/ui/ui";
import {Command} from "../ui/command-ui-handler";
import {getPokemonSpecies} from "#app/data/pokemon-species";
import {FormChangePhase} from "#app/phases/form-change-phase";
import {TrainerType} from "#enums/trainer-type";
import {trainerConfigs} from "#app/data/trainer-config";
import { Moves } from "#app/enums/moves.js";
import { MoveTarget, MoveCategory, MoveAttr, MoveCondition, MoveFlags, ChangeMultiHitTypeAttr, MultiHitAttr, FlinchAttr, StatusEffectAttr, MultiStatusEffectAttr } from "#app/data/move.js";
import { UpgradePath } from "#app/enums/upgrade-path.js";
import { UpgradeCategory } from "#app/enums/upgrade-category.js";
import { MoveUpgradeTooltipUtils } from "../ui/move-upgrade-tooltip";
import { ModifierTooltipUtils } from "../ui/modifier-tooltip-utils";
import { PathNodeContext } from "#app/phases/battle-path-phase";
import { PokemonAltBuildDefinition, AltBuildColorPalette } from "#app/data/pokemon-alt-buid.js";
import { ChampionUtils } from "#app/system/champion-utils";
export type ModifierPredicate = (modifier: Modifier) => boolean;

const iconOverflowIndex = 40;

export const modifierSortFunc = (a: Modifier, b: Modifier): number => {
    const aName = a.type?.name ?? "";
    const bName = b.type?.name ?? "";
    const itemNameMatch = aName.localeCompare(bName);
    const typeNameMatch = (a.constructor?.name ?? "").localeCompare(b.constructor?.name ?? "");
    const aId = a instanceof PokemonHeldItemModifier && a.pokemonId ? a.pokemonId : 4294967295;
    const bId = b instanceof PokemonHeldItemModifier && b.pokemonId ? b.pokemonId : 4294967295;

    if (aId < bId) {
        return 1;
    } else if (aId > bId) {
        return -1;
    } else if (aId === bId) {
        if (typeNameMatch === 0) {
            return itemNameMatch;
        } else {
            return typeNameMatch;
        }
    } else {
        return 0;
    }
};

export class ModifierBar extends Phaser.GameObjects.Container {
    private player: boolean;
    private modifierCache: PersistentModifier[];
    private overflowHideTimeout: number | null = null;
    constructor(scene: BattleScene, enemy?: boolean) {
        super(scene, 1 + (enemy ? 302 : 0), 13);

        this.player = !enemy;
        this.setScale(this.player ? 0.3 : 0.35);
        this.overflowHideTimeout = null;
    }
    updateModifiers(modifiers: PersistentModifier[], hideHeldItems: boolean = false) {
        this.removeAll(true);

        const visibleIconModifiers = modifiers.filter(m => m.isIconVisible(this.scene as BattleScene));
        const nonPokemonSpecificModifiers = visibleIconModifiers.filter(m => !(m as PokemonHeldItemModifier).pokemonId).sort(modifierSortFunc);
        const pokemonSpecificModifiers = visibleIconModifiers.filter(m => (m as PokemonHeldItemModifier).pokemonId).sort(modifierSortFunc);

        const sortedVisibleIconModifiers = hideHeldItems ? nonPokemonSpecificModifiers : nonPokemonSpecificModifiers.concat(pokemonSpecificModifiers);

        const thisArg = this;

        sortedVisibleIconModifiers.forEach((modifier: PersistentModifier, i: integer) => {
            const icon = modifier.getIcon(this.scene as BattleScene, false, !this.player);
            if (i >= iconOverflowIndex) {
                icon.setVisible(false);
            }
            this.add(icon);
            this.setModifierIconPosition(icon, sortedVisibleIconModifiers.length);
            icon.setInteractive(new Phaser.Geom.Rectangle(0, 0, 32, 24), Phaser.Geom.Rectangle.Contains);
            icon.on("pointerover", () => {
                if (thisArg.overflowHideTimeout !== null) {
                    clearTimeout(thisArg.overflowHideTimeout);
                    thisArg.overflowHideTimeout = null;
                }
                const highestWave = ((this.scene as BattleScene).gameData?.gameStats?.highestWaveReached || 0);
                if (!Overrides.BYPASS_MODIFIER_TOOLTIP_UNLOCK_OVERRIDE && highestWave < 25 && !(modifier instanceof MoveUpgradeModifier)) {
                    if (this.modifierCache && this.modifierCache.length > iconOverflowIndex) {
                        thisArg.updateModifierOverflowVisibility(true);
                    }
                    return;
                }
                if (modifier instanceof MoveUpgradeModifier) {
                    MoveUpgradeTooltipUtils.showTooltip(
                        this.scene as BattleScene,
                        modifier.type as ModifierTypes.MoveUpgradeModifierType,
                        { x: icon.x, y: icon.y },
                        this.player
                    );
                } else {
                    ModifierTooltipUtils.showForModifier(this.scene as BattleScene, modifier);
                }
                if (this.modifierCache && this.modifierCache.length > iconOverflowIndex) {
                    thisArg.updateModifierOverflowVisibility(true);
                }
            });
            icon.on("pointerout", () => {
                if (modifier instanceof MoveUpgradeModifier) {
                    MoveUpgradeTooltipUtils.hideTooltip(this.scene as BattleScene);
                } else {
                    ModifierTooltipUtils.hideIfNotPinned(this.scene as BattleScene);
                }
                if (this.modifierCache && this.modifierCache.length > iconOverflowIndex) {
                    if (thisArg.overflowHideTimeout !== null) {
                        clearTimeout(thisArg.overflowHideTimeout);
                    }
                    thisArg.overflowHideTimeout = window.setTimeout(() => {
                        thisArg.updateModifierOverflowVisibility(false);
                        thisArg.overflowHideTimeout = null;
                    }, 150);
                }
            });
        });

        for (const icon of this.getAll()) {
            this.sendToBack(icon);
        }

        this.modifierCache = modifiers;
    }

    updateModifierOverflowVisibility(ignoreLimit: boolean) {
        const modifierIcons = this.getAll().reverse();
        for (const modifier of modifierIcons.map(m => m as Phaser.GameObjects.Container).slice(iconOverflowIndex)) {
            modifier.setVisible(ignoreLimit);
        }
    }

    setModifierIconPosition(icon: Phaser.GameObjects.Container, modifierCount: integer) {
        const scene = this.scene as BattleScene;
        const isInBattle = scene.currentBattle !== null && scene.currentBattle !== undefined;
        const rowIcons: integer = isInBattle ? 23 : 27;

        const x = (this.getIndex(icon) % rowIcons) * 28;
        const y = Math.floor(this.getIndex(icon) / rowIcons) * 30;

        icon.setPosition(this.player ? x : -x, y);
    }
}

export abstract class Modifier {
    public type: ModifierTypes.ModifierType;

    constructor(type: ModifierTypes.ModifierType) {
        this.type = type;
    }

    match(_modifier: Modifier): boolean {
        return false;
    }

    shouldApply(_args: any[]): boolean {
        return true;
    }

    abstract apply(args: any[]): boolean | Promise<boolean>;
}

export abstract class PersistentModifier extends Modifier {
    public stackCount: integer;
    public virtualStackCount: integer;
    protected replaceExisting: boolean = false;
    public isRemovable: boolean = true;

    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type);
        this.stackCount = stackCount === undefined ? 1 : stackCount;
        this.virtualStackCount = 0;
    }

    add(modifiers: PersistentModifier[], virtual: boolean, scene: BattleScene): boolean {
        for (const modifier of modifiers) {
            if (this.match(modifier)) {
                if(this.replaceExisting) {
                    scene.removeModifier(modifier);
                }
                else {
                    return modifier.incrementStack(scene, this.stackCount, virtual);
                }
            }
        }

        if (virtual) {
            this.virtualStackCount += this.stackCount;
            this.stackCount = 0;
        }
        modifiers.push(this);
        return true;
    }

    abstract clone(): PersistentModifier;

    getArgs(): any[] {
        return [];
    }

    incrementStack(scene: BattleScene, amount: integer, virtual: boolean): boolean {
        if (this.getStackCount() + amount <= this.getMaxStackCount(scene)) {
            if (!virtual) {
                this.stackCount += amount;
            } else {
                this.virtualStackCount += amount;
            }
            return true;
        }

        return false;
    }

    getStackCount(): integer {
        return this.stackCount + this.virtualStackCount;
    }

    abstract getMaxStackCount(scene: BattleScene, forThreshold?: boolean): integer;

    isIconVisible(scene: BattleScene): boolean {
        return true;
    }

    getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
        const container = scene.add.container(0, 0);

        const _useSmitemAtlas = useSmitemAtlas(this.type);
        const item = scene.add.sprite(0, 12, _useSmitemAtlas ? "smitems": "items");
        if (_useSmitemAtlas) {
            item.setScale(0.5);
        }
        item.setFrame(this.type.iconImage);
        item.setOrigin(0, 0.5);
        container.add(item);

        const stackText = this.getIconStackText(scene, false, forEnemyBar);
        if (stackText) {
            container.add(stackText);
        }

        const virtualStackText = this.getIconStackText(scene, true, forEnemyBar);
        if (virtualStackText) {
            container.add(virtualStackText);
        }

        return container;
    }

    getIconStackText(scene: BattleScene, virtual?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.GameObject | null {
        const max = this.getMaxStackCount(scene);
        if (max === 1 || (virtual && !this.virtualStackCount)) {
            return null;
        }

        const value = virtual ? this.virtualStackCount : this.stackCount;
        const showFraction = !virtual && !forEnemyBar && max > 1 && max < 11;
        const isCapped = this.getStackCount() >= max;

        if (!showFraction) {
            const text = scene.add.bitmapText(10, 15, "item-count", value.toString(), 14);
            text.letterSpacing = -0.5;
            if (isCapped) {
                text.setTint(0xf89890);
            }
            text.setOrigin(0, 0);
            return text;
        }

        const container = scene.add.container(10, 15);

        const left = scene.add.bitmapText(0, 0, "item-count", value.toString(), 14);
        left.letterSpacing = -0.5;
        left.setOrigin(0, 0);

        const slash = scene.add.graphics();
        const slashColor = isCapped ? 0xf89890 : 0xffffff;
        const slashX = left.width + 1;
        slash.lineStyle(4, 0x000000, 0.8);
        slash.lineBetween(slashX, 11, slashX + 4, 1);
        slash.lineStyle(2, slashColor, 1);
        slash.lineBetween(slashX, 11, slashX + 4, 1);

        const right = scene.add.bitmapText(slashX + 6, 0, "item-count", max.toString(), 14);
        right.letterSpacing = -0.5;
        right.setOrigin(0, 0);

        if (isCapped) {
            left.setTint(0xf89890);
            right.setTint(0xf89890);
        }

        container.add([left, slash, right]);
        return container;
    }
}

export abstract class ConsumableModifier extends Modifier {
    constructor(type: ModifierTypes.ModifierType) {
        super(type);
    }

    add(_modifiers: Modifier[]): boolean {
        return true;
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 1 && args[0] instanceof BattleScene;
    }
}

export class AddPokeballModifier extends ConsumableModifier {
    private pokeballType: PokeballType;
    private count: integer;

    constructor(type: ModifierTypes.ModifierType, pokeballType: PokeballType, count: integer) {
        super(type);

        this.pokeballType = pokeballType;
        this.count = count;
    }

    apply(args: any[]): boolean {
        const pokeballCounts = (args[0] as BattleScene).pokeballCounts;
        pokeballCounts[this.pokeballType] = Math.min(pokeballCounts[this.pokeballType] + this.count, MAX_PER_TYPE_POKEBALLS);

        return true;
    }
}

export class AddTypeBallModifier extends ConsumableModifier {
    private targetType: Type;
    private count: integer;

    constructor(type: ModifierTypes.ModifierType, targetType: Type, count: integer) {
        super(type);
        this.targetType = targetType;
        this.count = count;
    }

    apply(args: any[]): boolean {
        const scene = args[0] as BattleScene;
        scene.typeBallCounts[this.targetType] = Math.min(
            (scene.typeBallCounts[this.targetType] || 0) + this.count,
            MAX_PER_TYPE_POKEBALLS
        );
        return true;
    }
}

export class AddVoucherModifier extends ConsumableModifier {
    private voucherType: VoucherType;
    private count: integer;

    constructor(type: ModifierTypes.ModifierType, voucherType: VoucherType, count: integer) {
        super(type);

        this.voucherType = voucherType;
        this.count = count;
    }

    apply(args: any[]): boolean {
        const voucherCounts = (args[0] as BattleScene).gameData.voucherCounts;
        voucherCounts[this.voucherType] += this.count;

        return true;
    }
}

export abstract class LapsingPersistentModifier extends PersistentModifier {
    protected battlesLeft: integer;

    constructor(type: ModifierTypes.ModifierTypes.ModifierType, battlesLeft?: integer, stackCount?: integer) {
        super(type, stackCount);

        this.battlesLeft = battlesLeft!;
    }

    lapse(args: any[]): boolean {
        return !!--this.battlesLeft;
    }

    getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
        const container = super.getIcon(scene, forSummary, forEnemyBar);

        const battleCountText = addTextObject(scene, 27, 0, this.battlesLeft.toString(), TextStyle.PARTY, {
            fontSize: "66px",
            color: "#f89890"
        });
        battleCountText.setShadow(0, 0);
        battleCountText.setStroke("#984038", 16);
        battleCountText.setOrigin(1, 0);
        container.add(battleCountText);

        return container;
    }

    getBattlesLeft(): integer {
        return this.battlesLeft;
    }

    getMaxStackCount(scene: BattleScene, forThreshold?: boolean): number {
        return 99;
    }
}

export class DoubleBattleChanceBoosterModifier extends LapsingPersistentModifier {
    constructor(type: ModifierTypes.DoubleBattleChanceBoosterModifierType, battlesLeft: integer, stackCount?: integer) {
        super(type, battlesLeft, stackCount);
    }

    match(modifier: Modifier): boolean {
        if (modifier instanceof DoubleBattleChanceBoosterModifier) {
            return modifier.type.id === this.type.id && modifier.battlesLeft === this.battlesLeft;
        }
        return false;
    }

    clone(): DoubleBattleChanceBoosterModifier {
        return new DoubleBattleChanceBoosterModifier(this.type as ModifierTypes.DoubleBattleChanceBoosterModifierType, this.battlesLeft, this.stackCount);
    }

    getArgs(): any[] {
        return [this.battlesLeft];
    }
    apply(args: any[]): boolean {
        const doubleBattleChance = args[0] as Utils.NumberHolder;
        doubleBattleChance.value = Math.ceil(doubleBattleChance.value / 2);

        return true;
    }
}

export class TempBattleStatBoosterModifier extends LapsingPersistentModifier {
    private tempBattleStat: TempBattleStat;

    constructor(type: ModifierTypes.TempBattleStatBoosterModifierType, tempBattleStat: TempBattleStat, battlesLeft?: integer, stackCount?: integer) {
        let duration = 3;
        if (hasPermaModifierByType(PermaType.PERMA_LONGER_STAT_BOOSTS_3)) {
            duration = 6;
        } else if (hasPermaModifierByType(PermaType.PERMA_LONGER_STAT_BOOSTS_2)) {
            duration = 5;
        } else if (hasPermaModifierByType(PermaType.PERMA_LONGER_STAT_BOOSTS_1)) {
            duration = 4;
        }
        super(type, battlesLeft || duration, stackCount);

        this.tempBattleStat = tempBattleStat;
    }

    match(modifier: Modifier): boolean {
        if (modifier instanceof TempBattleStatBoosterModifier) {
            return (modifier as TempBattleStatBoosterModifier).tempBattleStat === this.tempBattleStat
                && (modifier as TempBattleStatBoosterModifier).battlesLeft === this.battlesLeft;
        }
        return false;
    }

    clone(): TempBattleStatBoosterModifier {
        return new TempBattleStatBoosterModifier(this.type as ModifierTypes.TempBattleStatBoosterModifierType, this.tempBattleStat, this.battlesLeft, this.stackCount);
    }

    getArgs(): any[] {
        return [this.tempBattleStat, this.battlesLeft];
    }

    apply(args: any[]): boolean {
        const tempBattleStat = args[0] as TempBattleStat;

        if (tempBattleStat === this.tempBattleStat) {
            const statLevel = args[1] as Utils.IntegerHolder;
            statLevel.value = Math.min(statLevel.value + 1, 6);
            return true;
        }

        return false;
    }
}

export class MapModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    clone(): MapModifier {
        return new MapModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }
}

export class MegaEvolutionAccessModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    clone(): MegaEvolutionAccessModifier {
        return new MegaEvolutionAccessModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }
}
export class GlitchPieceModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        let initialStackCount = Utils.randSeedInt(4, 2);

        if(stackCount) {
            initialStackCount = stackCount;
        }
        else if (hasPermaModifierByType(PermaType.PERMA_MORE_GLITCH_PIECES_3)) {
            initialStackCount = Utils.randSeedInt(5, 4);
        } else if (hasPermaModifierByType(PermaType.PERMA_MORE_GLITCH_PIECES_2)) {
            initialStackCount = 4;
        } else if (hasPermaModifierByType(PermaType.PERMA_MORE_GLITCH_PIECES_1)) {
            initialStackCount = Utils.randSeedInt(4, 3);
        }

        super(type, initialStackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof GlitchPieceModifier;
    }

    apply(args: any[]): boolean {
            if (args[0] instanceof Pokemon) {
                args[0].scene.updateModifiers(true).then(() => {
                });
            }
            else {
                args[0].updateModifiers(true).then(() => {
                    console.log("Updated modifiers after reducing Glitch Piece.");
                });
        }
            return true;
    }

    clone(): GlitchPieceModifier {
        return new GlitchPieceModifier(this.type, this.stackCount);
    }

    getMaxStackCount(scene: BattleScene): integer {
        let increase = 0;

        if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_3)) {
            increase = 3;
        } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_2)) {
            increase = 2;
        } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_GLITCH_PIECE_MAX_PLUS_1)) {
            increase = 1;
        }

        if (this.stackCount == 4 + increase) {
            return 7 + increase;
        } else if (this.stackCount == 5 + increase) {
            return 8 + increase;
        }
        return 6 + increase;
    }

    incrementStack(scene: BattleScene, amount: integer, virtual: boolean): boolean {
        const maxStackCount = this.getMaxStackCount(scene);
        const newStackCount = Math.min(this.getStackCount() + amount, maxStackCount);

        if (newStackCount > maxStackCount) {
            if (!virtual) {
            this.stackCount = maxStackCount;
            }
            return true;
        }

        const increase = newStackCount - this.getStackCount();

        if (virtual) {
            this.virtualStackCount += increase;
        } else {
            this.stackCount += increase;
        }

        return true;
    }
}

export class SacrificeToggleModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof SacrificeToggleModifier;
    }

    apply(args: any[]): boolean {
        const sacrificeToggleOn = args[0].gameData.sacrificeToggleOn;
        args[0].gameData.sacrificeToggleOn = !sacrificeToggleOn;
        return true;
    }

    clone(): SacrificeToggleModifier {
        return new SacrificeToggleModifier(this.type, this.stackCount);
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 2;
    }

    incrementStack(scene: BattleScene, amount: integer, virtual: boolean): boolean {
        if(this.stackCount == 1) {
            this.stackCount = 0
        }
        else {
        this.stackCount++;
        }
        scene.updateModifiers(true).then(() => {
        });
        return true;
    }
}

export class GigantamaxAccessModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    clone(): GigantamaxAccessModifier {
        return new GigantamaxAccessModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }
}

export class TerastallizeAccessModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    clone(): TerastallizeAccessModifier {
        return new TerastallizeAccessModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }
}

export abstract class PokemonHeldItemModifier extends PersistentModifier {
    public pokemonId: integer;
    readonly isTransferrable: boolean = true;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, stackCount);

        this.pokemonId = pokemonId;
    }

    abstract matchType(_modifier: Modifier): boolean;

    match(modifier: Modifier) {
        return this.matchType(modifier) && (modifier as PokemonHeldItemModifier).pokemonId === this.pokemonId;
    }

    getArgs(): any[] {
        return [this.pokemonId];
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length !== 0 && args[0] instanceof Pokemon && (this.pokemonId === -1 || (args[0] as Pokemon).id === this.pokemonId);
    }

    isIconVisible(scene: BattleScene): boolean {
        return !!(this.getPokemon(scene)?.isOnField());
    }

    getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
        const container = !forSummary ? scene.add.container(0, 0) : super.getIcon(scene, forSummary, forEnemyBar);

        if (!forSummary) {
            const pokemon = this.getPokemon(scene);
            if (pokemon) {
                const pokemonIcon = scene.addPokemonIcon(pokemon, -2, 10, 0, 0.5);

                container.add(pokemonIcon);
                container.setName(pokemon.id.toString());
            }

            const item = scene.add.sprite(16, this.virtualStackCount ? 8 : 16, "items");
            item.setScale(0.5);
            item.setOrigin(0, 0.5);
            const _useSmitemAtlas = useSmitemAtlas(this.type);
            item.setTexture(_useSmitemAtlas ? "smitems" : "items", this.type.iconImage);
            if (_useSmitemAtlas) {
                item.setScale(0.25);
            }
            container.add(item);

            const stackText = this.getIconStackText(scene, false, forEnemyBar);
            if (stackText) {
                container.add(stackText);
            }

            const virtualStackText = this.getIconStackText(scene, true, forEnemyBar);
            if (virtualStackText) {
                container.add(virtualStackText);
            }
        } else {
            container.setScale(0.5);
        }

        return container;
    }

    getPokemon(scene: BattleScene): Pokemon | undefined {
        return this.pokemonId ? scene.getPokemonById(this.pokemonId) ?? undefined : undefined;
    }

    getScoreMultiplier(): number {
        return 1;
    }

    getSecondaryChanceMultiplier(pokemon: Pokemon): integer {
        if (!pokemon.getLastXMoves(0)[0]) {
            return 1;
        }
        const sheerForceAffected = allMoves[pokemon.getLastXMoves(0)[0].move].chance >= 0 && pokemon.hasAbility(Abilities.SHEER_FORCE);

        if (sheerForceAffected) {
            return 0;
        } else if (pokemon.hasAbility(Abilities.SERENE_GRACE)) {
            return 2;
        }
        return 1;
    }

    getMaxStackCount(scene: BattleScene, forThreshold?: boolean): integer {
        const pokemon = this.getPokemon(scene);
        if (!pokemon) {
            return 0;
        }
        if (pokemon.isPlayer() && forThreshold) {
            return scene.getParty().map(p => this.getMaxHeldItemCount(p)).reduce((stackCount: integer, maxStackCount: integer) => Math.max(stackCount, maxStackCount), 0);
        }
        return this.getMaxHeldItemCount(pokemon);
    }

    abstract getMaxHeldItemCount(pokemon?: Pokemon): integer;
}

export abstract class LapsingPokemonHeldItemModifier extends PokemonHeldItemModifier {
    protected battlesLeft: integer;
    readonly isTransferrable: boolean = false;

    constructor(type: ModifierTypes.ModifierTypes.ModifierType, pokemonId: integer, battlesLeft?: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);

        this.battlesLeft = battlesLeft!;
    }

    lapse(args: any[]): boolean {
        return !!--this.battlesLeft;
    }

    getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
        const container = super.getIcon(scene, forSummary, forEnemyBar);

        if (this.getPokemon(scene)?.isPlayer()) {
            const battleCountText = addTextObject(scene, 27, 0, this.battlesLeft.toString(), TextStyle.PARTY, {
                fontSize: "66px",
                color: "#f89890"
            });
            battleCountText.setShadow(0, 0);
            battleCountText.setStroke("#984038", 16);
            battleCountText.setOrigin(1, 0);
            container.add(battleCountText);
        }

        return container;
    }

    getBattlesLeft(): integer {
        return this.battlesLeft;
    }

    getMaxStackCount(scene: BattleScene, forThreshold?: boolean): number {
        return 1;
    }
}

export class TerastallizeModifier extends LapsingPokemonHeldItemModifier {
    public teraType: Type;
    isTransferrable: boolean = false;
    constructor(type: ModifierTypes.TerastallizeModifierType, pokemonId: integer, teraType: Type, battlesLeft?: integer, stackCount?: integer) {
        let duration = 10;
        if (hasTerastallizeAccess()) {
            duration = 20;
        }
        if (hasPermaModifierByType(PermaType.PERMA_LONGER_TERA_3)) {
            duration += 30;
        } else if (hasPermaModifierByType(PermaType.PERMA_LONGER_TERA_2)) {
            duration += 20;
        } else if (hasPermaModifierByType(PermaType.PERMA_LONGER_TERA_1)) {
            duration += 10;
        }
        super(type, pokemonId, battlesLeft || duration, stackCount);

        this.teraType = teraType;
        this.isTransferrable = false;
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof TerastallizeModifier && modifier.teraType === this.teraType) {
            return true;
        }
        return false;
    }

    clone(): TerastallizeModifier {
        return new TerastallizeModifier(this.type as ModifierTypes.TerastallizeModifierType, this.pokemonId, this.teraType, this.battlesLeft, this.stackCount);
    }

    getArgs(): any[] {
        return [this.pokemonId, this.teraType, this.battlesLeft];
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        if (pokemon.isPlayer()) {
            pokemon.scene.validateAchv(achvs.TERASTALLIZE);
            if (this.teraType === Type.STELLAR) {
                pokemon.scene.validateAchv(achvs.STELLAR_TERASTALLIZE);
            }
        }
        pokemon.updateSpritePipelineData();
        return true;
    }

    lapse(args: any[]): boolean {
        const ret = super.lapse(args);
        const pokemon = args[0] as Pokemon;
        if (!ret) {
            pokemon.updateSpritePipelineData();
        }
        if(pokemon.isPlayer()) {
            this.isTransferrable = pokemon.scene.gameData.hasPermaModifierByType(PermaType.PERMA_TRANSFER_TERA);
        } else {
            this.isTransferrable = false;
        }
        return ret;
    }

    getScoreMultiplier(): number {
        return 1.25;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }

    getTransferrable(withinParty: boolean): boolean {
        return withinParty && this.isTransferrable;
    }
}

export class PokemonBaseStatModifier extends PokemonHeldItemModifier {
    protected stat: Stat;
    readonly isTransferrable: boolean = false;

    constructor(type: ModifierTypes.PokemonBaseStatBoosterModifierType, pokemonId: integer, stat: Stat, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.stat = stat;
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof PokemonBaseStatModifier) {
            return (modifier as PokemonBaseStatModifier).stat === this.stat;
        }
        return false;
    }

    clone(): PersistentModifier {
        return new PokemonBaseStatModifier(this.type as ModifierTypes.PokemonBaseStatBoosterModifierType, this.pokemonId, this.stat, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat(this.stat);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 2 && args[1] instanceof Array;
    }

    apply(args: any[]): boolean {
        args[1][this.stat] = Math.min(Math.floor(args[1][this.stat] * (1 + this.getStackCount() * 0.1)), 999999);

        return true;
    }

    getScoreMultiplier(): number {
        return 1.1;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 5;
    }
}

export class PlayerPokemonBaseStatBoosterModifier extends PokemonHeldItemModifier {
    protected stat: Stat;
    readonly isTransferrable: boolean = false;

    constructor(type: ModifierTypes.PlayerPokemonBaseStatBoosterModifierType, pokemonId: integer, stat: Stat, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.stat = stat;
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof PlayerPokemonBaseStatBoosterModifier) {
            return (modifier as PlayerPokemonBaseStatBoosterModifier).stat === this.stat;
        }
        return false;
    }

    clone(): PersistentModifier {
        return new PlayerPokemonBaseStatBoosterModifier(this.type as ModifierTypes.PlayerPokemonBaseStatBoosterModifierType, this.pokemonId, this.stat, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat(this.stat);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 2 && args[1] instanceof Array;
    }

    apply(args: any[]): boolean {
        args[1][this.stat] = Math.min(Math.floor(args[1][this.stat] * (1 + this.getStackCount() * 0.01)), 999999);

        return true;
    }

    getScoreMultiplier(): number {
        return 1.01;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 250;
    }
}
export class StatBoosterModifier extends PokemonHeldItemModifier {

    protected stats: Stat[];

    protected multiplier: number;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stats: Stat[], multiplier: number, stackCount?: integer) {
        super(type, pokemonId, stackCount);

        this.stats = stats;
        this.multiplier = multiplier;
    }

    clone() {
        return new StatBoosterModifier(this.type, this.pokemonId, this.stats, this.multiplier, this.stackCount);
    }

    getArgs(): any[] {
        return [...super.getArgs(), this.stats, this.multiplier];
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof StatBoosterModifier) {
            const modifierInstance = modifier as StatBoosterModifier;
            if ((modifierInstance.multiplier === this.multiplier) && (modifierInstance.stats.length === this.stats.length)) {
                return modifierInstance.stats.every((e, i) => e === this.stats[i]);
            }
        }

        return false;
    }
    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && this.stats.includes(args[1] as Stat);
    }
    apply(args: any[]): boolean {
        const statValue = args[2] as Utils.NumberHolder;

        statValue.value *= this.multiplier;
        return true;
    }

    getMaxHeldItemCount(_pokemon: Pokemon): number {
        return 1;
    }
}
export class EvolutionStatBoosterModifier extends StatBoosterModifier {
    clone() {
        return super.clone() as EvolutionStatBoosterModifier;
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof EvolutionStatBoosterModifier;
    }
    apply(args: any[]): boolean {
        const holder = args[0] as Pokemon;
        const statValue = args[2] as Utils.NumberHolder;
        const isUnevolved = holder.getSpeciesForm(true).speciesId in pokemonEvolutions;

        if (holder.isFusion() && (holder.getFusionSpeciesForm(true).speciesId in pokemonEvolutions) !== isUnevolved) {
            statValue.value *= 1 + (this.multiplier - 1) / 2;
            return true;
        } else if (isUnevolved) {
            return super.apply(args);
        }

        return false;
    }
}
export class SpeciesStatBoosterModifier extends StatBoosterModifier {

    private species: Species[];

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stats: Stat[], multiplier: number, species: Species[], stackCount?: integer) {
        super(type, pokemonId, stats, multiplier, stackCount);

        this.species = species;
    }

    clone() {
        return new SpeciesStatBoosterModifier(this.type, this.pokemonId, this.stats, this.multiplier, this.species, this.stackCount);
    }

    getArgs(): any[] {
        return [...super.getArgs(), this.species];
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof SpeciesStatBoosterModifier) {
            const modifierInstance = modifier as SpeciesStatBoosterModifier;
            if (modifierInstance.species.length === this.species.length) {
                return super.matchType(modifier) && modifierInstance.species.every((e, i) => e === this.species[i]);
            }
        }

        return false;
    }
    shouldApply(args: any[]): boolean {
        const holder = args[0] as Pokemon;
        return super.shouldApply(args) && (this.species.includes(holder.getSpeciesForm(true).speciesId) || (holder.isFusion() && this.species.includes(holder.getFusionSpeciesForm(true).speciesId)));
    }
    contains(speciesId: Species, stat: Stat): boolean {
        return this.species.includes(speciesId) && this.stats.includes(stat);
    }
}
export class CritBoosterModifier extends PokemonHeldItemModifier {

    protected stageIncrement: number;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stageIncrement: number, stackCount?: integer) {
        super(type, pokemonId, stackCount);

        this.stageIncrement = stageIncrement;
    }

    clone() {
        return new CritBoosterModifier(this.type, this.pokemonId, this.stageIncrement, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat(this.stageIncrement);
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof CritBoosterModifier) {
            return (modifier as CritBoosterModifier).stageIncrement === this.stageIncrement;
        }

        return false;
    }
    apply(args: any[]): boolean {
        const critStage = args[1] as Utils.NumberHolder;

        critStage.value += this.stageIncrement;
        return true;
    }

    getMaxHeldItemCount(_pokemon: Pokemon): number {
        return 1;
    }
}
export class SpeciesCritBoosterModifier extends CritBoosterModifier {

    private species: Species[];

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stageIncrement: number, species: Species[], stackCount?: integer) {
        super(type, pokemonId, stageIncrement, stackCount);

        this.species = species;
    }

    clone() {
        return new SpeciesCritBoosterModifier(this.type, this.pokemonId, this.stageIncrement, this.species, this.stackCount);
    }

    getArgs(): any[] {
        return [...super.getArgs(), this.species];
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof SpeciesCritBoosterModifier;
    }
    shouldApply(args: any[]) {
        const holder = args[0] as Pokemon;

        return super.shouldApply(args) && (this.species.includes(holder.getSpeciesForm(true).speciesId) || (holder.isFusion() && this.species.includes(holder.getFusionSpeciesForm(true).speciesId)));
    }
}
export class AttackTypeBoosterModifier extends PokemonHeldItemModifier {
    private moveType: Type;
    private boostMultiplier: number;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, moveType: Type, boostPercent: number, stackCount?: integer) {
        super(type, pokemonId, stackCount);

        this.moveType = moveType;
        this.boostMultiplier = boostPercent * 0.01;
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof AttackTypeBoosterModifier) {
            const attackTypeBoosterModifier = modifier as AttackTypeBoosterModifier;
            return attackTypeBoosterModifier.moveType === this.moveType && attackTypeBoosterModifier.boostMultiplier === this.boostMultiplier;
        }

        return false;
    }

    clone() {
        return new AttackTypeBoosterModifier(this.type, this.pokemonId, this.moveType, this.boostMultiplier * 100, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.moveType, this.boostMultiplier * 100]);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 3 && typeof args[1] === "number" && args[2] instanceof Utils.NumberHolder;
    }
    apply(args: any[]): boolean {
        if (args[1] === this.moveType && (args[2] as Utils.NumberHolder).value >= 1) {
            (args[2] as Utils.NumberHolder).value = Math.floor((args[2] as Utils.NumberHolder).value * (1 + (this.getStackCount() * this.boostMultiplier)));
            return true;
        }

        return false;
    }

    getScoreMultiplier(): number {
        return 1.2;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 3;
    }
}

export class SurviveDamageModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof SurviveDamageModifier;
    }

    clone() {
        return new SurviveDamageModifier(this.type, this.pokemonId, this.stackCount);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 2 && args[1] instanceof Utils.BooleanHolder;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        const surviveDamage = args[1] as Utils.BooleanHolder;

        if (!surviveDamage.value && pokemon.randSeedInt(10) < this.getStackCount()) {
            surviveDamage.value = true;

            pokemon.scene.queueMessage(i18next.t("modifier:surviveDamageApply", {
                pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
                typeName: this.type.name
            }));
            return true;
        }

        return false;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 5;
    }
}

export class BypassSpeedChanceModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier) {
        return modifier instanceof BypassSpeedChanceModifier;
    }

    clone() {
        return new BypassSpeedChanceModifier(this.type, this.pokemonId, this.stackCount);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 2 && args[1] instanceof Utils.BooleanHolder;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        const bypassSpeed = args[1] as Utils.BooleanHolder;

        if (!bypassSpeed.value && pokemon.randSeedInt(10) < this.getStackCount()) {
            bypassSpeed.value = true;
            const isCommandFight = pokemon.scene.currentBattle.turnCommands[pokemon.getBattlerIndex()]?.command === Command.FIGHT;
            const hasQuickClaw = this.type instanceof ModifierTypes.PokemonHeldItemModifierType && this.type.id === "QUICK_CLAW";

            if (isCommandFight && hasQuickClaw) {
                pokemon.scene.queueMessage(i18next.t("modifier:bypassSpeedChanceApply", {
                    pokemonName: getPokemonNameWithAffix(pokemon),
                    itemName: i18next.t("modifierType:ModifierType.QUICK_CLAW.name")
                }));
            }
            return true;
        }

        return false;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 3;
    }
}

export class FlinchChanceModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier) {
        return modifier instanceof FlinchChanceModifier;
    }

    clone() {
        return new FlinchChanceModifier(this.type, this.pokemonId, this.stackCount);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 2 && args[1] instanceof Utils.BooleanHolder;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        const flinched = args[1] as Utils.BooleanHolder;

        if (!flinched.value && pokemon.randSeedInt(10) < (this.getStackCount() * this.getSecondaryChanceMultiplier(pokemon))) {
            flinched.value = true;
            return true;
        }

        return false;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 3;
    }
}

export class TurnHealModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier) {
        return modifier instanceof TurnHealModifier;
    }

    clone() {
        return new TurnHealModifier(this.type, this.pokemonId, this.stackCount);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;

        if (pokemon.scene.dynamicMode?.noHealingItems && pokemon.isPlayer()) {
            return false;
        }

        if (!pokemon.isFullHp()) {
            const scene = pokemon.scene;
            scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
                Utils.toDmgValue(pokemon.getMaxHp() / 16) * this.stackCount, i18next.t("modifier:turnHealApply", {
                    pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
                    typeName: this.type.name
                }), true));
            return true;
        }

        return false;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 4;
    }
}
export class TurnStatusEffectModifier extends PokemonHeldItemModifier {

    private effect: StatusEffect;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);

        switch (type.id) {
            case "TOXIC_ORB":
                this.effect = StatusEffect.TOXIC;
                break;
            case "FLAME_ORB":
                this.effect = StatusEffect.BURN;
                break;
        }
    }
    matchType(modifier: Modifier): boolean {
        return modifier instanceof TurnStatusEffectModifier;
    }

    clone() {
        return new TurnStatusEffectModifier(this.type, this.pokemonId, this.stackCount);
    }
    apply(args: any[]): boolean {
        return (args[0] as Pokemon).trySetStatus(this.effect, true, undefined, undefined, this.type.name);
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }

    getStatusEffect(): StatusEffect {
        return this.effect;
    }
}

export class HitHealModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier) {
        return modifier instanceof HitHealModifier;
    }

    clone() {
        return new HitHealModifier(this.type, this.pokemonId, this.stackCount);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;

        if (pokemon.scene.dynamicMode?.noHealingItems && pokemon.isPlayer()) {
            return false;
        }

        if (pokemon.turnData.damageDealt && !pokemon.isFullHp()) {
            const scene = pokemon.scene;
            scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
                Utils.toDmgValue(pokemon.turnData.damageDealt / 8) * this.stackCount, i18next.t("modifier:hitHealApply", {
                    pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
                    typeName: this.type.name
                }), true));
        }

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 4;
    }
}

export class LevelIncrementBoosterModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier) {
        return modifier instanceof LevelIncrementBoosterModifier;
    }

    clone() {
        return new LevelIncrementBoosterModifier(this.type, this.stackCount);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args[0] instanceof Utils.IntegerHolder;
    }

    apply(args: any[]): boolean {
        (args[0] as Utils.IntegerHolder).value += this.getStackCount();

        return true;
    }

    getMaxStackCount(scene: BattleScene, forThreshold?: boolean): number {
        return 99;
    }
}

export class BerryModifier extends PokemonHeldItemModifier {
    public berryType: BerryType;
    public consumed: boolean;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, berryType: BerryType, stackCount?: integer) {
        super(type, pokemonId, stackCount);

        this.berryType = berryType;
        this.consumed = false;
    }

    matchType(modifier: Modifier) {
        return modifier instanceof BerryModifier && (modifier as BerryModifier).berryType === this.berryType;
    }

    clone() {
        return new BerryModifier(this.type, this.pokemonId, this.berryType, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat(this.berryType);
    }

    shouldApply(args: any[]): boolean {
        return !this.consumed && super.shouldApply(args) && getBerryPredicate(this.berryType)(args[0] as Pokemon);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;

        if (pokemon.scene.dynamicMode?.noHealingItems && pokemon.isPlayer()) {
            return false;
        }

        const preserve = new Utils.BooleanHolder(false);
        pokemon.scene.applyModifiers(PreserveBerryModifier, pokemon.isPlayer(), pokemon, preserve);

        getBerryEffectFunc(this.berryType)(pokemon);
        if (!preserve.value) {
            this.consumed = true;
        }

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        if ([BerryType.LUM, BerryType.LEPPA, BerryType.SITRUS, BerryType.ENIGMA].includes(this.berryType)) {
            return 2;
        }
        return 3;
    }
}

export class PreserveBerryModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier) {
        return modifier instanceof PreserveBerryModifier;
    }

    clone() {
        return new PreserveBerryModifier(this.type, this.stackCount);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args[0] instanceof Pokemon && args[1] instanceof Utils.BooleanHolder;
    }

    apply(args: any[]): boolean {
        if (!(args[1] as Utils.BooleanHolder).value) {
            (args[1] as Utils.BooleanHolder).value = (args[0] as Pokemon).randSeedInt(100) < this.getStackCount() * 5;
        }

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 4;
    }
}

export class PokemonInstantReviveModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier) {
        return modifier instanceof PokemonInstantReviveModifier;
    }

    clone() {
        return new PokemonInstantReviveModifier(this.type, this.pokemonId, this.stackCount);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;

        if (pokemon.scene.dynamicMode?.noHealingItems && pokemon.isPlayer()) {
            return false;
        }

        pokemon.scene.unshiftPhase(new PokemonHealPhase(pokemon.scene, pokemon.getBattlerIndex(),
            Utils.toDmgValue(pokemon.getMaxHp() / 2), i18next.t("modifier:pokemonInstantReviveApply", {
                pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
                typeName: this.type.name
            }), false, false, true));

        pokemon.resetStatus(true, false, true);
        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }
}
export class PokemonResetNegativeStatStageModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier) {
        return modifier instanceof PokemonResetNegativeStatStageModifier;
    }

    clone() {
        return new PokemonResetNegativeStatStageModifier(this.type, this.pokemonId, this.stackCount);
    }
    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        const loweredStats = pokemon.summonData.battleStats.filter(s => s < 0);
        if (loweredStats.length) {
            for (let s = 0; s < pokemon.summonData.battleStats.length; s++) {
                pokemon.summonData.battleStats[s] = Math.max(0, pokemon.summonData.battleStats[s]);
            }
            pokemon.scene.queueMessage(i18next.t("modifier:pokemonResetNegativeStatStageApply", {
                pokemonNameWithAffix: getPokemonNameWithAffix(pokemon),
                typeName: this.type.name
            }));
            return true;
        }
        return false;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 2;
    }
}

export abstract class ConsumablePokemonModifier extends ConsumableModifier {
    public pokemonId: integer;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer) {
        super(type);

        this.pokemonId = pokemonId;
    }

    shouldApply(args: any[]): boolean {
        return args.length !== 0 && args[0] instanceof PlayerPokemon && (this.pokemonId === -1 || (args[0] as PlayerPokemon).id === this.pokemonId);
    }

    getPokemon(scene: BattleScene) {
        return scene.getParty().find(p => p.id === this.pokemonId);
    }
}

export class PokemonHpRestoreModifier extends ConsumablePokemonModifier {
    private restorePoints: integer;
    private restorePercent: number;
    private healStatus: boolean;
    public fainted: boolean;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, restorePoints: integer, restorePercent: number, healStatus: boolean, fainted?: boolean) {
        super(type, pokemonId);

        this.restorePoints = restorePoints;
        this.restorePercent = restorePercent;
        this.healStatus = healStatus;
        this.fainted = !!fainted;
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && (this.fainted || (args.length > 1 && typeof (args[1]) === "number"));
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        if (!pokemon.hp === this.fainted) {
            let restorePoints = this.restorePoints;
            if (!this.fainted) {
                restorePoints = Math.floor(restorePoints * (args[1] as number));
            }
            if (this.fainted || this.healStatus) {
                pokemon.resetStatus(true, true);
            }
            pokemon.hp = Math.min(pokemon.hp + Math.max(Math.ceil(Math.max(Math.floor((this.restorePercent * 0.01) * pokemon.getMaxHp()), restorePoints)), 1), pokemon.getMaxHp());

            return true;
        }

        return false;
    }
}

export class PokemonStatusHealModifier extends ConsumablePokemonModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer) {
        super(type, pokemonId);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.resetStatus(true, true);
        return true;
    }
}

export class RerollModifier extends ConsumableModifier {
    constructor(type: ModifierTypes.ModifierType) {
        super(type);
    }

    apply(args: any[]): boolean {
        return true;
    }
}

export abstract class ConsumablePokemonMoveModifier extends ConsumablePokemonModifier {
    public moveIndex: integer;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, moveIndex: integer) {
        super(type, pokemonId);

        this.moveIndex = moveIndex;
    }
}

export class PokemonPpRestoreModifier extends ConsumablePokemonMoveModifier {
    private restorePoints: integer;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, moveIndex: integer, restorePoints: integer) {
        super(type, pokemonId, moveIndex);

        this.restorePoints = restorePoints;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        const move = pokemon.getMoveset()[this.moveIndex]!;
        move.ppUsed = this.restorePoints > -1 ? Math.max(move.ppUsed - this.restorePoints, 0) : 0;

        return true;
    }
}

export class PokemonAllMovePpRestoreModifier extends ConsumablePokemonModifier {
    private restorePoints: integer;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, restorePoints: integer) {
        super(type, pokemonId);

        this.restorePoints = restorePoints;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        for (const move of pokemon.getMoveset()) {
            move!.ppUsed = this.restorePoints > -1 ? Math.max(move!.ppUsed - this.restorePoints, 0) : 0;
        }

        return true;
    }
}

export class PokemonPpUpModifier extends ConsumablePokemonMoveModifier {
    private upPoints: integer;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, moveIndex: integer, upPoints: integer) {
        super(type, pokemonId, moveIndex);

        this.upPoints = upPoints;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        const move = pokemon.getMoveset()[this.moveIndex]!;
        move.ppUp = Math.min(move.ppUp + this.upPoints, 3);

        return true;
    }
}

export class PokemonNatureChangeModifier extends ConsumablePokemonModifier {
    public nature: Nature;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, nature: Nature) {
        super(type, pokemonId);

        this.nature = nature;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.natureOverride = this.nature;
        let speciesId = pokemon.species.speciesId;
        pokemon.scene.gameData.dexData[speciesId].natureAttr |= 1 << (this.nature + 1);

        while (pokemonPrevolutions.hasOwnProperty(speciesId)) {
            speciesId = pokemonPrevolutions[speciesId];
            pokemon.scene.gameData.dexData[speciesId].natureAttr |= 1 << (this.nature + 1);
        }

        return true;
    }
}

export class PokemonLevelIncrementModifier extends ConsumablePokemonModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer) {
        super(type, pokemonId);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as PlayerPokemon;
        const levelCount = new Utils.IntegerHolder(1);
        pokemon.scene.applyModifiers(LevelIncrementBoosterModifier, true, levelCount);

        pokemon.level += levelCount.value;
        if (pokemon.level <= pokemon.scene.getMaxExpLevel(true)) {
            pokemon.exp = getLevelTotalExp(pokemon.level, pokemon.species.growthRate);
            pokemon.levelExp = 0;
        }

        pokemon.addFriendship(5);

        pokemon.scene.unshiftPhase(new LevelUpPhase(pokemon.scene, pokemon.scene.getParty().indexOf(pokemon), pokemon.level - levelCount.value, pokemon.level));

        return true;
    }
}

export class TmModifier extends ConsumablePokemonModifier {
    constructor(type: ModifierTypes.TmModifierType, pokemonId: integer) {
        super(type, pokemonId);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as PlayerPokemon;

        pokemon.scene.unshiftPhase(new LearnMovePhase(pokemon.scene, pokemon.scene.getParty().indexOf(pokemon), (this.type as ModifierTypes.TmModifierType).moveId));

        return true;
    }
}

export class RememberMoveModifier extends ConsumablePokemonModifier {
    public levelMoveIndex: integer;

    constructor(type: ModifierTypes.ModifierTypes.ModifierType, pokemonId: integer, levelMoveIndex: integer) {
        super(type, pokemonId);

        this.levelMoveIndex = levelMoveIndex;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as PlayerPokemon;

        pokemon.scene.unshiftPhase(new LearnMovePhase(pokemon.scene, pokemon.scene.getParty().indexOf(pokemon), pokemon.getLearnableLevelMoves()[this.levelMoveIndex]));

        return true;
    }
}

export class EvolutionItemModifier extends ConsumablePokemonModifier {
    constructor(type: ModifierTypes.EvolutionItemModifierType, pokemonId: integer) {
        super(type, pokemonId);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as PlayerPokemon;

        let matchingEvolution = pokemonEvolutions.hasOwnProperty(pokemon.species.speciesId)
            ? pokemonEvolutions[pokemon.species.speciesId].find(e => e.item === (this.type as ModifierTypes.EvolutionItemModifierType).evolutionItem
                && (e.evoFormKey === null || (e.preFormKey || "") === pokemon.getFormKey())
                && (!e.condition || e.condition.predicate(pokemon)))
            : null;

        if (!matchingEvolution && pokemon.isFusion()) {
            matchingEvolution = pokemonEvolutions[pokemon.fusionSpecies!.speciesId].find(e => e.item === (this.type as ModifierTypes.EvolutionItemModifierType).evolutionItem
                && (e.evoFormKey === null || (e.preFormKey || "") === pokemon.getFusionFormKey())
                && (!e.condition || e.condition.predicate(pokemon)));
            if (matchingEvolution) {
                matchingEvolution = new FusionSpeciesFormEvolution(pokemon.species.speciesId, matchingEvolution);
            }
        }

        if (matchingEvolution) {
            pokemon.scene.unshiftPhase(new EvolutionPhase(pokemon.scene, pokemon, matchingEvolution, pokemon.level - 1));
            return true;
        }

        return false;
    }
}

export class FusePokemonModifier extends ConsumablePokemonModifier {
    public fusePokemonId: integer;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, fusePokemonId: integer) {
        super(type, pokemonId);

        this.fusePokemonId = fusePokemonId;
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args[1] instanceof PlayerPokemon && this.fusePokemonId === (args[1] as PlayerPokemon).id;
    }

    apply(args: any[]): Promise<boolean> {
        return new Promise<boolean>(resolve => {
            (args[0] as PlayerPokemon).fuse(args[1] as PlayerPokemon).then(() => resolve(true));
        });
    }
}

export class MultipleParticipantExpBonusModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof MultipleParticipantExpBonusModifier;
    }

    apply(_args: any[]): boolean {
        return true;
    }

    clone(): MultipleParticipantExpBonusModifier {
        return new MultipleParticipantExpBonusModifier(this.type, this.stackCount);
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 5;
    }
}

export class HealingBoosterModifier extends PersistentModifier {
    private multiplier: number;

    constructor(type: ModifierTypes.ModifierType, multiplier: number, stackCount?: integer) {
        super(type, stackCount);

        this.multiplier = multiplier;
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof HealingBoosterModifier;
    }

    clone(): HealingBoosterModifier {
        return new HealingBoosterModifier(this.type, this.multiplier, this.stackCount);
    }

    getArgs(): any[] {
        return [this.multiplier];
    }

    apply(args: any[]): boolean {
        const healingMultiplier = args[0] as Utils.IntegerHolder;
        healingMultiplier.value *= 1 + ((this.multiplier - 1) * this.getStackCount());

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 5;
    }
}

export class ExpBoosterModifier extends PersistentModifier {
    private boostMultiplier: integer;

    constructor(type: ModifierTypes.ModifierType, boostPercent: number, stackCount?: integer) {
        super(type, stackCount);

        this.boostMultiplier = boostPercent * 0.01;
    }

    match(modifier: Modifier): boolean {
        if (modifier instanceof ExpBoosterModifier) {
            const expModifier = modifier as ExpBoosterModifier;
            return expModifier.boostMultiplier === this.boostMultiplier;
        }
        return false;
    }

    clone(): ExpBoosterModifier {
        return new ExpBoosterModifier(this.type, this.boostMultiplier * 100, this.stackCount);
    }

    getArgs(): any[] {
        return [this.boostMultiplier * 100];
    }

    apply(args: any[]): boolean {
        (args[0] as Utils.NumberHolder).value = Math.floor((args[0] as Utils.NumberHolder).value * (1 + (this.getStackCount() * this.boostMultiplier)));

        return true;
    }

    getMaxStackCount(scene: BattleScene, forThreshold?: boolean): integer {
        return this.boostMultiplier < 1 ? this.boostMultiplier < 0.6 ? 100000 : 30 : 10;
    }
}

export class PokemonExpBoosterModifier extends PokemonHeldItemModifier {
    private boostMultiplier: integer;

    constructor(type: ModifierTypes.PokemonExpBoosterModifierType, pokemonId: integer, boostPercent: number, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.boostMultiplier = boostPercent * 0.01;
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof PokemonExpBoosterModifier) {
            const pokemonExpModifier = modifier as PokemonExpBoosterModifier;
            return pokemonExpModifier.boostMultiplier === this.boostMultiplier;
        }
        return false;
    }

    clone(): PersistentModifier {
        return new PokemonExpBoosterModifier(this.type as ModifierTypes.PokemonExpBoosterModifierType, this.pokemonId, this.boostMultiplier * 100, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat(this.boostMultiplier * 100);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 2 && args[1] instanceof Utils.NumberHolder;
    }

    apply(args: any[]): boolean {
        (args[1] as Utils.NumberHolder).value = Math.floor((args[1] as Utils.NumberHolder).value * (1 + (this.getStackCount() * this.boostMultiplier)));

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1000;
    }
}

export class ExpShareModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof ExpShareModifier;
    }

    clone(): ExpShareModifier {
        return new ExpShareModifier(this.type, this.stackCount);
    }

    apply(_args: any[]): boolean {
        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 5;
    }
}

export class ExpBalanceModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof ExpBalanceModifier;
    }

    clone(): ExpBalanceModifier {
        return new ExpBalanceModifier(this.type, this.stackCount);
    }

    apply(_args: any[]): boolean {
        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 4;
    }
}

export class PokemonFriendshipBoosterModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.PokemonFriendshipBoosterModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof PokemonFriendshipBoosterModifier;
    }

    clone(): PersistentModifier {
        return new PokemonFriendshipBoosterModifier(this.type as ModifierTypes.PokemonFriendshipBoosterModifierType, this.pokemonId, this.stackCount);
    }

    apply(args: any[]): boolean {
        const friendship = args[1] as Utils.IntegerHolder;
        friendship.value = Math.floor(friendship.value * (1 + 0.5 * this.getStackCount()));

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 3;
    }
}

export class PokemonNatureWeightModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof PokemonNatureWeightModifier;
    }

    clone(): PersistentModifier {
        return new PokemonNatureWeightModifier(this.type, this.pokemonId, this.stackCount);
    }

    apply(args: any[]): boolean {
        const multiplier = args[1] as Utils.IntegerHolder;
        if (multiplier.value !== 1) {
            multiplier.value += 0.1 * this.getStackCount() * (multiplier.value > 1 ? 1 : -1);
            return true;
        }

        return false;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 2;
    }
}

export class PokemonMoveAccuracyBoosterModifier extends PokemonHeldItemModifier {
    private accuracyAmount: integer;

    constructor(type: ModifierTypes.PokemonMoveAccuracyBoosterModifierType, pokemonId: integer, accuracy: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.accuracyAmount = accuracy;
    }

    matchType(modifier: Modifier): boolean {
        if (modifier instanceof PokemonMoveAccuracyBoosterModifier) {
            const pokemonAccuracyBoosterModifier = modifier as PokemonMoveAccuracyBoosterModifier;
            return pokemonAccuracyBoosterModifier.accuracyAmount === this.accuracyAmount;
        }
        return false;
    }

    clone(): PersistentModifier {
        return new PokemonMoveAccuracyBoosterModifier(this.type as ModifierTypes.PokemonMoveAccuracyBoosterModifierType, this.pokemonId, this.accuracyAmount, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat(this.accuracyAmount);
    }

    shouldApply(args: any[]): boolean {
        return super.shouldApply(args) && args.length === 2 && args[1] instanceof Utils.NumberHolder;
    }

    apply(args: any[]): boolean {
        const moveAccuracy = (args[1] as Utils.IntegerHolder);
        moveAccuracy.value = Math.min(moveAccuracy.value + this.accuracyAmount * this.getStackCount(), 100);

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 3;
    }
}

export class PokemonMultiHitModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.PokemonMultiHitModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof PokemonMultiHitModifier;
    }

    clone(): PersistentModifier {
        return new PokemonMultiHitModifier(this.type as ModifierTypes.PokemonMultiHitModifierType, this.pokemonId, this.stackCount);
    }

    apply(args: any[]): boolean {
        (args[1] as Utils.IntegerHolder).value *= (this.getStackCount() + 1);

        const power = args[2] as Utils.NumberHolder;
        switch (this.getStackCount()) {
            case 1:
                power.value *= 0.4;
                break;
            case 2:
                power.value *= 0.25;
                break;
            case 3:
                power.value *= 0.175;
                break;
        }

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 3;
    }
}

export class PokemonFormChangeItemModifier extends PokemonHeldItemModifier {
    public formChangeItem: FormChangeItem;
    public active: boolean;

    readonly isTransferrable: boolean = false;

    constructor(type: ModifierTypes.FormChangeItemModifierType, pokemonId: integer, formChangeItem: FormChangeItem, active: boolean, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.formChangeItem = formChangeItem;
        this.active = active;
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof PokemonFormChangeItemModifier && modifier.formChangeItem === this.formChangeItem;
    }

    clone(): PersistentModifier {
        return new PokemonFormChangeItemModifier(this.type as ModifierTypes.FormChangeItemModifierType, this.pokemonId, this.formChangeItem, this.active, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat(this.formChangeItem, this.active);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        const active = args[1] as boolean;

        const isSmittyItem = this.formChangeItem >= FormChangeItem.SMITTY_AURA && this.formChangeItem <= FormChangeItem.SMITTY_VOID;

        let formChange: SpeciesFormChange | null = null;
        if (isSmittyItem) {
            formChange = pokemon.checkAndAddUniversalSmittyForms();
        }

        const switchActive = this.active && !active;

        if (switchActive) {
            this.active = false;
        }

        let ret: boolean;
        if (formChange) {
            ret = pokemon.scene.triggerPokemonFormChange(pokemon, formChange);
        } else {
            ret = pokemon.scene.triggerPokemonFormChange(pokemon, SpeciesFormChangeItemTrigger);
        }

        if(isSmittyItem || this.formChangeItem >= FormChangeItem.GLITCHI_GLITCHI_FRUIT && this.formChangeItem <= FormChangeItem.GLITCH_MASTER_PARTS) {
            reduceGlitchPieceModifier(pokemon, 5);
        }

        if (switchActive) {
            this.active = true;
        }

        return ret;
    }

    isGlitchOrSmittyItem(): boolean {
        return (this.formChangeItem >= FormChangeItem.GLITCHI_GLITCHI_FRUIT && this.formChangeItem <= FormChangeItem.GLITCH_MASTER_PARTS) ||
            (this.formChangeItem >= FormChangeItem.SMITTY_AURA && this.formChangeItem <= FormChangeItem.SMITTY_VOID);
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }
}

export class MoneyRewardModifier extends ConsumableModifier {
    private moneyMultiplier: number;

    constructor(type: ModifierTypes.ModifierType, moneyMultiplier: number) {
        super(type);

        this.moneyMultiplier = moneyMultiplier;
    }

    apply(args: any[]): boolean {
        const scene = args[0] as BattleScene;
        const moneyAmount = new Utils.IntegerHolder(scene.getWaveMoneyAmount(this.moneyMultiplier));

        scene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);

        scene.addMoney(moneyAmount.value);

        return true;
    }
}

export class MoneyMultiplierModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof MoneyMultiplierModifier;
    }

    clone(): MoneyMultiplierModifier {
        return new MoneyMultiplierModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        (args[0] as Utils.IntegerHolder).value += Math.floor((args[0] as Utils.IntegerHolder).value * 0.2 * this.getStackCount());

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 5;
    }
}

export class DamageMoneyRewardModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof DamageMoneyRewardModifier;
    }

    clone(): DamageMoneyRewardModifier {
        return new DamageMoneyRewardModifier(this.type, this.pokemonId, this.stackCount);
    }

    apply(args: any[]): boolean {
        const scene = (args[0] as Pokemon).scene;
        const moneyAmount = new Utils.IntegerHolder(Math.floor((args[1] as Utils.IntegerHolder).value * (0.5 * this.getStackCount())));
        scene.applyModifiers(MoneyMultiplierModifier, true, moneyAmount);
        scene.addMoney(moneyAmount.value);

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 5;
    }
}

export class MoneyInterestModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof MoneyInterestModifier;
    }

    apply(args: any[]): boolean {
        const scene = args[0] as BattleScene;
        const interestAmount = Math.floor(scene.money * 0.1 * this.getStackCount());
        scene.addMoney(interestAmount);

        const userLocale = navigator.language || "en-US";
        const formattedMoneyAmount = interestAmount.toLocaleString(userLocale);
        const message = i18next.t("modifier:moneyInterestApply", {
            moneyAmount: formattedMoneyAmount,
            typeName: this.type.name
        });
        scene.queueMessage(message, undefined, true);

        return true;
    }

    clone(): MoneyInterestModifier {
        return new MoneyInterestModifier(this.type, this.stackCount);
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 5;
    }
}

export class HiddenAbilityRateBoosterModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof HiddenAbilityRateBoosterModifier;
    }

    clone(): HiddenAbilityRateBoosterModifier {
        return new HiddenAbilityRateBoosterModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        (args[0] as Utils.IntegerHolder).value *= Math.pow(2, -1 - this.getStackCount());

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 4;
    }
}

export class ShinyRateBoosterModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof ShinyRateBoosterModifier;
    }

    clone(): ShinyRateBoosterModifier {
        return new ShinyRateBoosterModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        (args[0] as Utils.IntegerHolder).value *= Math.pow(2, 2 + this.getStackCount());

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 4;
    }
}

export class LockModifierTiersModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof LockModifierTiersModifier;
    }

    apply(args: any[]): boolean {
        return true;
    }

    clone(): LockModifierTiersModifier {
        return new LockModifierTiersModifier(this.type, this.stackCount);
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }
}

export class SwitchEffectTransferModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof SwitchEffectTransferModifier;
    }

    clone(): SwitchEffectTransferModifier {
        return new SwitchEffectTransferModifier(this.type, this.pokemonId, this.stackCount);
    }

    apply(args: any[]): boolean {
        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }
}

export class PermaMoneyModifier extends ConsumableModifier {
    public amount: number;
    public reduceGlitchPiece: boolean;
    constructor(type: ModifierTypes.ModifierType, amount: number, reduceGlitchPiece: boolean = false) {
        super(type);
        this.amount = amount;
        this.reduceGlitchPiece = reduceGlitchPiece;
    }

    apply(args: any[]): boolean {
        const scene = args[0] as BattleScene;
        if (this.reduceGlitchPiece) {
            reduceGlitchPieceModifier(scene.getParty()[0], 4);
        }
        scene.addPermaMoney(this.amount);
        return true;
    }
}

export abstract class PermaLapsingPersistentModifier extends LapsingPersistentModifier {
    constructor(type: ModifierTypes.ModifierType, battlesLeft: integer, stackCount?: integer) {
        super(type, battlesLeft, stackCount);
    }

    match(modifier: Modifier): boolean {
        if (modifier instanceof PermaLapsingPersistentModifier && modifier.type.id === this.type.id) {
            this.battlesLeft += modifier.battlesLeft;
            return true;
        }
        return false;
    }
}

export class IncreasedMoneyBoostModifier extends PermaLapsingPersistentModifier {
    private moneyBoostMultiplier: number;

    constructor(type: ModifierTypes.ModifierType, battlesLeft: integer, moneyBoostMultiplier: number, stackCount?: integer) {
        super(type, battlesLeft, stackCount);
        this.moneyBoostMultiplier = moneyBoostMultiplier;
    }

    apply(args: any[]): boolean {
        const moneyAmount = args[0] as Utils.NumberHolder;
        moneyAmount.value = Math.floor(moneyAmount.value * this.moneyBoostMultiplier);
        return true;
    }

    clone(): IncreasedMoneyBoostModifier {
        return new IncreasedMoneyBoostModifier(this.type, this.getBattlesLeft(), this.moneyBoostMultiplier, this.stackCount);
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 5;
    }
}

export abstract class PermaLimitedUseModifier extends PersistentModifier {
    protected usesLeft: integer;

    constructor(type: ModifierTypes.ModifierType, usesLeft: integer, stackCount?: integer) {
        super(type, stackCount);
        this.usesLeft = usesLeft;
    }

    abstract applyEffect(args: any[]): boolean;

    apply(args: any[]): boolean {
        if (this.usesLeft > 0) {
            const result = this.applyEffect(args);
            if (result) {
                this.usesLeft--;
                if (this.usesLeft === 0) {
                    args[0].scene.removeModifier(this);
                }
            }
            return result;
        }
        return false;
    }

    getUsesLeft(): integer {
        return this.usesLeft;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }

    match(modifier: Modifier): boolean {
        if (modifier instanceof PermaLimitedUseModifier && modifier.type.id === this.type.id) {
            this.usesLeft += modifier.usesLeft;
            return true;
        }
        return false;
    }
}

export class ReduceShopCostModifier extends PermaLimitedUseModifier {
    private costReductionPercent: number;

    constructor(type: ModifierTypes.ModifierType, usesLeft: integer, costReductionPercent: number, stackCount?: integer) {
        super(type, usesLeft, stackCount);
        this.costReductionPercent = costReductionPercent;
    }

    applyEffect(args: any[]): boolean {
        const cost = args[0] as Utils.NumberHolder;
        cost.value = Math.floor(cost.value * (1 - this.costReductionPercent));
        return true;
    }

    clone(): ReduceShopCostModifier {
        return new ReduceShopCostModifier(this.type, this.getUsesLeft(), this.costReductionPercent, this.stackCount);
    }
}
export abstract class HeldItemTransferModifier extends PokemonHeldItemModifier {
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }
    getTargets(args: any[]): Pokemon[] {
        const pokemon = args[0];

        return pokemon instanceof Pokemon
            ? pokemon.getOpponents()
            : [];
    }
    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        const opponents = this.getTargets(args);

        if (!opponents.length) {
            return false;
        }

        const targetPokemon = opponents[pokemon.randSeedInt(opponents.length)];

        const transferredItemCount = this.getTransferredItemCount();
        if (!transferredItemCount) {
            return false;
        }

        const poolType = pokemon.isPlayer() ? ModifierTypes.ModifierPoolType.PLAYER : pokemon.hasTrainer() ? ModifierTypes.ModifierPoolType.TRAINER : ModifierTypes.ModifierPoolType.WILD;

        const transferredModifierTypes: ModifierTypes.ModifierTypes.ModifierType[] = [];
        const itemModifiers = pokemon.scene.findModifiers(m => m instanceof PokemonHeldItemModifier
            && m.pokemonId === targetPokemon.id && m.isTransferrable, targetPokemon.isPlayer()) as PokemonHeldItemModifier[];
        let highestItemTier = itemModifiers.map(m => m.type.getOrInferTier(poolType)).reduce((highestTier, tier) => Math.max(tier!, highestTier), 0);
        let tierItemModifiers = itemModifiers.filter(m => m.type.getOrInferTier(poolType) === highestItemTier);

        const heldItemTransferPromises: Promise<void>[] = [];

        for (let i = 0; i < transferredItemCount; i++) {
            if (!tierItemModifiers.length) {
                while (highestItemTier-- && !tierItemModifiers.length) {
                    tierItemModifiers = itemModifiers.filter(m => m.type.tier === highestItemTier);
                }
                if (!tierItemModifiers.length) {
                    break;
                }
            }
            const randItemIndex = pokemon.randSeedInt(itemModifiers.length);
            const randItem = itemModifiers[randItemIndex];
            heldItemTransferPromises.push(pokemon.scene.tryTransferHeldItemModifier(randItem, pokemon, false).then(success => {
                if (success) {
                    transferredModifierTypes.push(randItem.type);
                    itemModifiers.splice(randItemIndex, 1);
                }
            }));
        }

        Promise.all(heldItemTransferPromises).then(() => {
            for (const mt of transferredModifierTypes) {
                pokemon.scene.queueMessage(this.getTransferMessage(pokemon, targetPokemon, mt));
            }
        });

        return !!transferredModifierTypes.length;
    }

    abstract getTransferredItemCount(): integer;

    abstract getTransferMessage(pokemon: Pokemon, targetPokemon: Pokemon, item: ModifierTypes.ModifierTypes.ModifierType): string;
}
export class TurnHeldItemTransferModifier extends HeldItemTransferModifier {
    isTransferrable: boolean = false;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof TurnHeldItemTransferModifier;
    }

    clone(): TurnHeldItemTransferModifier {
        return new TurnHeldItemTransferModifier(this.type, this.pokemonId, this.stackCount);
    }

    getTransferredItemCount(): integer {
        return this.getStackCount();
    }

    getTransferMessage(pokemon: Pokemon, targetPokemon: Pokemon, item: ModifierTypes.ModifierTypes.ModifierType): string {
        return i18next.t("modifier:turnHeldItemTransferApply", {
            pokemonNameWithAffix: getPokemonNameWithAffix(targetPokemon),
            itemName: item.name,
            pokemonName: pokemon.name,
            typeName: this.type.name
        });
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }

    setTransferrableFalse(): void {
        this.isTransferrable = false;
    }
}
export class ContactHeldItemTransferChanceModifier extends HeldItemTransferModifier {
    private chance: number;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, chancePercent: number, stackCount?: integer) {
        super(type, pokemonId, stackCount);

        this.chance = chancePercent / 100;
    }
    getTargets(args: any[]): Pokemon[] {
        const target = args[1];

        return target instanceof Pokemon
            ? [target]
            : [];
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof ContactHeldItemTransferChanceModifier;
    }

    clone(): ContactHeldItemTransferChanceModifier {
        return new ContactHeldItemTransferChanceModifier(this.type, this.pokemonId, this.chance * 100, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat(this.chance * 100);
    }

    getTransferredItemCount(): integer {
        return Phaser.Math.RND.realInRange(0, 1) < (this.chance * this.getStackCount()) ? 1 : 0;
    }

    getTransferMessage(pokemon: Pokemon, targetPokemon: Pokemon, item: ModifierTypes.ModifierTypes.ModifierType): string {
        return i18next.t("modifier:contactHeldItemTransferApply", {
            pokemonNameWithAffix: getPokemonNameWithAffix(targetPokemon),
            itemName: item.name,
            pokemonName: getPokemonNameWithAffix(pokemon),
            typeName: this.type.name
        });
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 5;
    }
}

export class IvScannerModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof IvScannerModifier;
    }

    clone(): IvScannerModifier {
        return new IvScannerModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 3;
    }

}

export class ExtraModifierModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof ExtraModifierModifier;
    }

    clone(): ExtraModifierModifier {
        return new ExtraModifierModifier(this.type, this.stackCount);
    }

    apply(args: any[]): boolean {
        (args[0] as Utils.IntegerHolder).value += this.getStackCount();

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 3;
    }
}

export abstract class EnemyPersistentModifier extends PersistentModifier {
    constructor(type: ModifierTypes.ModifierType, stackCount?: integer) {
        super(type, stackCount);
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 5;
    }
}

abstract class EnemyDamageMultiplierModifier extends EnemyPersistentModifier {
    protected damageMultiplier: number;

    constructor(type: ModifierTypes.ModifierType, damageMultiplier: number, stackCount?: integer) {
        super(type, stackCount);

        this.damageMultiplier = damageMultiplier;
    }

    apply(args: any[]): boolean {
        (args[0] as Utils.NumberHolder).value = Math.floor((args[0] as Utils.NumberHolder).value * Math.pow(this.damageMultiplier, this.getStackCount()));

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 99;
    }
}

export class EnemyDamageBoosterModifier extends EnemyDamageMultiplierModifier {
    constructor(type: ModifierTypes.ModifierType, boostPercent: number, stackCount?: integer) {
        super(type, 1.05, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof EnemyDamageBoosterModifier;
    }

    clone(): EnemyDamageBoosterModifier {
        return new EnemyDamageBoosterModifier(this.type, (this.damageMultiplier - 1) * 100, this.stackCount);
    }

    getArgs(): any[] {
        return [(this.damageMultiplier - 1) * 100];
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 999;
    }
}

export class EnemyDamageReducerModifier extends EnemyDamageMultiplierModifier {
    constructor(type: ModifierTypes.ModifierType, reductionPercent: number, stackCount?: integer) {
        super(type, 0.975, stackCount);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof EnemyDamageReducerModifier;
    }

    clone(): EnemyDamageReducerModifier {
        return new EnemyDamageReducerModifier(this.type, (1 - this.damageMultiplier) * 100, this.stackCount);
    }

    getArgs(): any[] {
        return [(1 - this.damageMultiplier) * 100];
    }

    getMaxStackCount(scene: BattleScene): integer {
        return scene.currentBattle.waveIndex < 2000 ? super.getMaxStackCount(scene) : 999;
    }
}

export class EnemyTurnHealModifier extends EnemyPersistentModifier {
    public healPercent: number;

    constructor(type: ModifierTypes.ModifierType, healPercent: number, stackCount?: integer) {
        super(type, stackCount);

        this.healPercent = 2;
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof EnemyTurnHealModifier;
    }

    clone(): EnemyTurnHealModifier {
        return new EnemyTurnHealModifier(this.type, this.healPercent, this.stackCount);
    }

    getArgs(): any[] {
        return [this.healPercent];
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;

        if (!pokemon.isFullHp()) {
            const scene = pokemon.scene;
            scene.unshiftPhase(new PokemonHealPhase(scene, pokemon.getBattlerIndex(),
                Math.max(Math.floor(pokemon.getMaxHp() / (100 / this.healPercent)) * this.stackCount, 1), i18next.t("modifier:enemyTurnHealApply", {pokemonNameWithAffix: getPokemonNameWithAffix(pokemon)}), true, false, false, false, true));
            return true;
        }

        return false;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 10;
    }
}

export class EnemyAttackStatusEffectChanceModifier extends EnemyPersistentModifier {
    public effect: StatusEffect;
    public chance: number;

    constructor(type: ModifierTypes.ModifierType, effect: StatusEffect, chancePercent: number, stackCount?: integer) {
        super(type, stackCount);

        this.effect = effect;
        this.chance = .025 * ((this.effect === StatusEffect.BURN || this.effect === StatusEffect.POISON) ? 2 : 1);
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof EnemyAttackStatusEffectChanceModifier && modifier.effect === this.effect;
    }

    clone(): EnemyAttackStatusEffectChanceModifier {
        return new EnemyAttackStatusEffectChanceModifier(this.type, this.effect, this.chance * 100, this.stackCount);
    }

    getArgs(): any[] {
        return [this.effect, this.chance * 100];
    }

    apply(args: any[]): boolean {
        const target = (args[0] as Pokemon);
        if (Phaser.Math.RND.realInRange(0, 1) < (this.chance * this.getStackCount())) {
            return target.trySetStatus(this.effect, true);
        }

        return false;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 10;
    }
}

export class EnemyStatusEffectHealChanceModifier extends EnemyPersistentModifier {
    public chance: number;

    constructor(type: ModifierTypes.ModifierType, chancePercent: number, stackCount?: integer) {
        super(type, stackCount);

        this.chance = .025;
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof EnemyStatusEffectHealChanceModifier;
    }

    clone(): EnemyStatusEffectHealChanceModifier {
        return new EnemyStatusEffectHealChanceModifier(this.type, this.chance * 100, this.stackCount);
    }

    getArgs(): any[] {
        return [this.chance * 100];
    }

    apply(args: any[]): boolean {
        const target = (args[0] as Pokemon);
        if (target.status && Phaser.Math.RND.realInRange(0, 1) < (this.chance * this.getStackCount())) {
            target.scene.queueMessage(getStatusEffectHealText(target.status.effect, getPokemonNameWithAffix(target)));
            target.resetStatus();
            target.updateInfo();
            return true;
        }

        return false;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 10;
    }
}

export class EnemyEndureChanceModifier extends EnemyPersistentModifier {
    public chance: number;

    constructor(type: ModifierTypes.ModifierType, chancePercent?: number, stackCount?: integer) {
        super(type, stackCount || 10);

        this.chance = .02;
    }

    match(modifier: Modifier) {
        return modifier instanceof EnemyEndureChanceModifier;
    }

    clone() {
        return new EnemyEndureChanceModifier(this.type, this.chance * 100, this.stackCount);
    }

    getArgs(): any[] {
        return [this.chance * 100];
    }

    apply(args: any[]): boolean {
        const target = (args[0] as Pokemon);

        if (target.battleData.endured || Phaser.Math.RND.realInRange(0, 1) >= (this.chance * this.getStackCount())) {
            return false;
        }

        target.addTag(BattlerTagType.ENDURING, 1);

        target.battleData.endured = true;

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 10;
    }
}

export class EnemyFusionChanceModifier extends EnemyPersistentModifier {
    private chance: number;

    constructor(type: ModifierTypes.ModifierType, chancePercent: number, stackCount?: integer) {
        super(type, stackCount);

        this.chance = chancePercent / 100;
    }

    match(modifier: Modifier) {
        return modifier instanceof EnemyFusionChanceModifier && modifier.chance === this.chance;
    }

    clone() {
        return new EnemyFusionChanceModifier(this.type, this.chance * 100, this.stackCount);
    }

    getArgs(): any[] {
        return [this.chance * 100];
    }

    apply(args: any[]): boolean {
        if (Phaser.Math.RND.realInRange(0, 1) >= (this.chance * this.getStackCount())) {
            return false;
        }

        (args[0] as Utils.BooleanHolder).value = true;

        return true;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 10;
    }
}
export function overrideModifiers(scene: BattleScene, isPlayer: boolean = true): void {
    const modifiersOverride: ModifierTypes.ModifierOverride[] = isPlayer ? Overrides.STARTING_MODIFIER_OVERRIDE : Overrides.OPP_MODIFIER_OVERRIDE;
    if (!modifiersOverride || modifiersOverride.length === 0 || !scene) {
        return;
    }

    if (!isPlayer) {
        scene.clearEnemyModifiers();
    }

    modifiersOverride.forEach(item => {
        const modifierFunc = ModifierTypes.modifierTypes[item.name];
        const modifier = modifierFunc().withIdFromFunc(modifierFunc).newModifier() as PersistentModifier;
        modifier.stackCount = item.count || 1;

        if (isPlayer) {
            scene.addModifier(modifier, true, false, false, true);
        } else {
            scene.addEnemyModifier(modifier, true, true);
        }
    });
}
export function overrideHeldItems(scene: BattleScene, pokemon: Pokemon, isPlayer: boolean = true): void {
    const heldItemsOverride: ModifierTypes.ModifierOverride[] = isPlayer ? Overrides.STARTING_HELD_ITEMS_OVERRIDE : Overrides.OPP_HELD_ITEMS_OVERRIDE;
    if (!heldItemsOverride || heldItemsOverride.length === 0 || !scene) {
        return;
    }

    heldItemsOverride.forEach(item => {
        const modifierFunc = ModifierTypes.modifierTypes[item.name];
        let modifierType: ModifierTypes.ModifierType | null = modifierFunc();
        const qty = item.count || 1;

        if (modifierType instanceof ModifierTypes.ModifierTypes.ModifierTypeGenerator) {
            const pregenArgs = ("type" in item) && (item.type !== null) ? [item.type] : undefined;
            modifierType = modifierType.generateType([], pregenArgs);
        }

        const heldItemModifier = modifierType && modifierType.withIdFromFunc(modifierFunc).newModifier(pokemon) as PokemonHeldItemModifier;
        if (heldItemModifier) {
            heldItemModifier.pokemonId = pokemon.id;
            heldItemModifier.stackCount = qty;
            if (isPlayer) {
                scene.addModifier(heldItemModifier, true, false, false, true);
            } else {
                scene.addEnemyModifier(heldItemModifier, true, true);
            }
        }
    })
}
export function reduceGlitchPieceModifier(pokemon: Pokemon, count:number = 1): void {
    const reduceChance = Utils.randSeedInt(100) <= 50;
    if(pokemon && pokemon.isPlayer() && reduceChance && (!pokemon.scene.gameMode.isChaosMode || pokemon.scene?.pathNodeContext === PathNodeContext.BATTLE_NODE)) {
        const glitchModifier = pokemon.scene.findModifier(m => m instanceof GlitchPieceModifier) as GlitchPieceModifier;
        if (glitchModifier) {
            glitchModifier.stackCount = Math.max(glitchModifier.stackCount - count, 0);
            pokemon.scene.updateModifiers(true).then(() => {
            });
        }
    }
}
export class AnyAbilityModifier extends PokemonHeldItemModifier {
    ability: Abilities;
    readonly isTransferrable: boolean = false;
    protected replaceExisting: boolean = true;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, ability: Abilities, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.ability = ability;
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.ability]);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.makeSpeciesUnique();
        let currentAbilityIndex = 0;
        if(pokemon.isFusion()) {
            currentAbilityIndex = pokemon.fusionAbilityIndex;
        }
        else {
            currentAbilityIndex = pokemon.getCurrentAbilityIndex();
        }
        pokemon.setAbility(this.ability, currentAbilityIndex);
        reduceGlitchPieceModifier(pokemon);
        return true;
    }

    clone(): AnyAbilityModifier {
        return new AnyAbilityModifier(this.type, this.pokemonId, this.ability, this.stackCount);
    }

    match(modifier: Modifier): boolean {
        return super.match(modifier);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof AnyAbilityModifier &&
            modifier.pokemonId === this.pokemonId;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}
export class AnyPassiveAbilityModifier extends PokemonHeldItemModifier {
    ability: Abilities;
    readonly isTransferrable: boolean = false;
    protected replaceExisting: boolean = true;
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, ability: Abilities, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.ability = ability;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.makeSpeciesUnique();
        pokemon.altPassiveForRun = this.ability;
        pokemon.passive = true;
        reduceGlitchPieceModifier(pokemon);
        return true;
    }

    clone(): AnyPassiveAbilityModifier {
        return new AnyPassiveAbilityModifier(this.type, this.pokemonId, this.ability, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.ability]);
    }

    match(modifier: Modifier): boolean {
        return super.match(modifier);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof AnyPassiveAbilityModifier &&
            modifier.pokemonId === this.pokemonId;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}
export class StatSwitcherModifier extends PokemonHeldItemModifier {
    private stat1: Stat;
    private stat2: Stat;
    private glitchReduced: boolean;
    readonly isTransferrable: boolean = false;
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stat1: Stat, stat2: Stat, glitchReduced: boolean = false, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.stat1 = stat1;
        this.stat2 = stat2;
        this.glitchReduced = glitchReduced;

    }

    getArgs(): any[] {
        return super.getArgs().concat([this.stat1, this.stat2, this.glitchReduced]);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof StatSwitcherModifier &&
            (modifier as StatSwitcherModifier).stat1 === this.stat1 &&
            (modifier as StatSwitcherModifier).stat2 === this.stat2;
    }

    clone(): StatSwitcherModifier {
        return new StatSwitcherModifier(this.type, this.pokemonId, this.stat1, this.stat2, this.glitchReduced, this.stackCount);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.makeSpeciesUnique();
        const temp = args[1][this.stat1];
        args[1][this.stat1] = args[1][this.stat2];
        args[1][this.stat2] = temp;
        if (!this.glitchReduced) {
            this.glitchReduced = true;
            reduceGlitchPieceModifier(pokemon);
        }
        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 10;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}
export class AbilitySwitcherModifier extends PokemonHeldItemModifier {
    private assignedAbilityIndex: integer | undefined = undefined;
    readonly isTransferrable: boolean = false;
    protected replaceExisting: boolean = true;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, assignedAbilityIndex?: integer, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.assignedAbilityIndex = assignedAbilityIndex;
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.assignedAbilityIndex]);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;

        if (this.assignedAbilityIndex !== undefined) {
            if (pokemon.isFusion()) {
                pokemon.fusionAbilityIndex = this.assignedAbilityIndex;
            } else {
                pokemon.abilityIndex = this.assignedAbilityIndex;
            }
            return true;
        }

        const currentAbility = pokemon.getAbility(true).id;
        const abilities: Abilities[] = [];

        const currentForm = pokemon.isFusion()
            ? pokemon.fusionSpecies!.forms[pokemon.fusionFormIndex] || pokemon.fusionSpecies
            : pokemon.species.forms[pokemon.formIndex] || pokemon.species;

        if (currentForm.ability1) {
            abilities.push(currentForm.ability1);
        }
        if (currentForm.ability2) {
            abilities.push(currentForm.ability2);
        }
        if (currentForm.abilityHidden) {
            abilities.push(currentForm.abilityHidden);
        }

        let newAbility;
            do {
                let newIndex = Utils.randSeedInt(abilities.length);
                if (pokemon.isFusion()) {
                    pokemon.fusionAbilityIndex = newIndex;
                } else {
                    pokemon.abilityIndex = newIndex;
                }
            } while ((pokemon.getAbility(true).id === currentAbility && abilities.length > 1) && !(abilities.length == 2 && abilities[0] === abilities[1]) && !(abilities.length == 3 && abilities[0] === abilities[1] && abilities[1] === abilities[2]));

        this.assignedAbilityIndex = pokemon.isFusion()
            ? pokemon.fusionAbilityIndex
            : pokemon.abilityIndex;

        reduceGlitchPieceModifier(pokemon);

        return true;
    }

    clone(): AbilitySwitcherModifier {
        return new AbilitySwitcherModifier(this.type, this.pokemonId, this.stackCount);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof AbilitySwitcherModifier &&
            modifier.pokemonId === this.pokemonId;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 2;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}
export class TypeSwitcherModifier extends PokemonHeldItemModifier {
    newPrimaryType: Type | null;
    newSecondaryType: Type | null;
    readonly isTransferrable: boolean = false;
    protected replaceExisting: boolean = true;
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, newPrimaryType: Type | null, newSecondaryType: Type | null, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.newPrimaryType = newPrimaryType;
        this.newSecondaryType = newSecondaryType;
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.newPrimaryType, this.newSecondaryType]);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.makeSpeciesUnique();

        const getForm = (species: Species, formIndex: integer) =>
            species.forms.length > 0 ? species.forms[formIndex] : species;

        const normalForm = getForm(pokemon.species, pokemon.formIndex);

        if (this.newPrimaryType !== null && this.newPrimaryType >= 0) {
            normalForm.type1 = this.newPrimaryType;
        }
        if (this.newSecondaryType !== null && this.newSecondaryType >= 0) {
            normalForm.type2 = this.newSecondaryType;
        }

        if (pokemon.isFusion()) {
            const fusionForm = getForm(pokemon.fusionSpecies!, pokemon.fusionFormIndex);
            if (this.newPrimaryType) {
                fusionForm.type1 = this.newPrimaryType;
            }
            if (this.newSecondaryType) {
                fusionForm.type2 = this.newSecondaryType;
            }
        }

        reduceGlitchPieceModifier(pokemon);

        this.applyTypeColorEffect(pokemon);

        if (pokemon.pokeball === PokeballType.TYPE_BALL) {
            const newBallType = this.newPrimaryType ?? this.newSecondaryType;
            if (newBallType !== null && newBallType !== undefined && newBallType >= 0) {
                pokemon.typeBallType = newBallType;
            }
        }

        return true;
    }

    private applyTypeColorEffect(pokemon: Pokemon): void {
        const targetType = this.newPrimaryType ?? this.newSecondaryType;
        if (targetType === null || targetType === undefined || targetType < 0) return;
        const rgb = getTypeRgb(targetType);
        if (!rgb) return;

        const toHex = (r: number, g: number, b: number) =>
            `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        const targetPalette = [
            toHex(Math.round(rgb[0] * 0.25), Math.round(rgb[1] * 0.25), Math.round(rgb[2] * 0.25)),
            toHex(Math.round(rgb[0] * 0.50), Math.round(rgb[1] * 0.50), Math.round(rgb[2] * 0.50)),
            toHex(Math.round(rgb[0] * 0.78), Math.round(rgb[1] * 0.78), Math.round(rgb[2] * 0.78)),
            toHex(rgb[0], rgb[1], rgb[2]),
        ];

        const syntheticAltBuild = {
            spriteColorPalette: {
                targetPalette: targetPalette,
                blendMode: 'grayscale_overlay',
            },
            inversionFactor: 0.0,
        };

        const realSpriteKey = pokemon.getSpriteKey();
        const realTextureLoaded = pokemon.scene.textures.exists(realSpriteKey)
            && pokemon.scene.textures.get(realSpriteKey).key !== '__MISSING';
        if (realTextureLoaded) {
            pokemon.updateAltBuildPalette(syntheticAltBuild);
        } else {
            pokemon.altBuildBlendMode = 'grayscale_overlay';
            pokemon.altBuildInversionFactor = 0.0;
            (pokemon as any)._pendingTypeSwitcherPalette = syntheticAltBuild;
        }
    }

    clone(): TypeSwitcherModifier {
        return new TypeSwitcherModifier(this.type, this.pokemonId, this.newPrimaryType, this.newSecondaryType);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof TypeSwitcherModifier && modifier.pokemonId === this.pokemonId ;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}

export class AnyTmModifier extends TmModifier {
    constructor(type: ModifierTypes.TmModifierType, pokemonId: integer) {
        super(type, pokemonId);
    }

    apply(args: any[]): boolean {
        const result = super.apply(args);
        if (result) {
            const pokemon = args[0] as PlayerPokemon;
            reduceGlitchPieceModifier(pokemon);
        }
        return result;
    }

    clone(): AnyTmModifier {
        return new AnyTmModifier(this.type as ModifierTypes.TmModifierType, this.pokemonId);
    }
}

export class StatSacrificeModifier extends PokemonHeldItemModifier {
    private stat: Stat;
    private glitchReduced: boolean;
    private pokemonSacrifice: PlayerPokemon | undefined;
    readonly isTransferrable: boolean = false;
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, stat: Stat, pokemonSacrifice?: PlayerPokemon, glitchReduced: boolean = false, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.stat = stat;
        this.glitchReduced = glitchReduced;
        this.pokemonSacrifice = pokemonSacrifice;
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof StatSacrificeModifier && (modifier as StatSacrificeModifier).stat === this.stat;
    }

    clone(): StatSacrificeModifier {
        return new StatSacrificeModifier(this.type, this.pokemonId, this.stat, this.pokemonSacrifice, this.glitchReduced, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.stat, this.pokemonSacrifice, this.glitchReduced]);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.makeSpeciesUnique();
        args[1][this.stat] = Math.min(Math.floor(args[1][this.stat] * (1 + this.getStackCount() * 0.1)), 999999);

        if (this.pokemonSacrifice instanceof PlayerPokemon) {
            if(!reduceCollectedTypeModifiers(pokemon.scene, this.pokemonSacrifice)) {
                let scene = pokemon.scene;
                const pokemonIndex = pokemon.scene.getParty().indexOf(this.pokemonSacrifice);
                this.pokemonSacrifice = undefined;
                pokemon.scene.removePartyMemberModifiers(pokemonIndex);
                pokemon.scene.getParty().splice(pokemonIndex, 1)[0].destroy();
            }
            else {
                this.pokemonSacrifice = undefined;
            }
        }
        if (!this.glitchReduced) {
            this.glitchReduced = true;
            reduceGlitchPieceModifier(pokemon);
        }
        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 2;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}

export class MoveSacrificeModifier extends PokemonHeldItemModifier {
    private pokemonSacrifice: PlayerPokemon | undefined;
    private glitchReduced: boolean;
    readonly isTransferrable: boolean = false;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, pokemonSacrifice?: PlayerPokemon, glitchReduced: boolean = false, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.pokemonSacrifice = pokemonSacrifice;
        this.glitchReduced = glitchReduced;
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof MoveSacrificeModifier;
    }

    clone(): MoveSacrificeModifier {
        return new MoveSacrificeModifier(this.type, this.pokemonId, this.pokemonSacrifice, this.glitchReduced, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.glitchReduced]);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;

        if (this.pokemonSacrifice instanceof PlayerPokemon) {
            const moves = this.pokemonSacrifice.getMoveset();
            moves.forEach((move, index) => {
                if (move) {
                    pokemon.setMove(index, move.moveId);
                }
            });

            if(!reduceCollectedTypeModifiers(pokemon.scene, this.pokemonSacrifice)) {
                const scene = pokemon.scene;
                const pokemonIndex = scene.getParty().indexOf(this.pokemonSacrifice);
                this.pokemonSacrifice = undefined;
                scene.removePartyMemberModifiers(pokemonIndex);
                scene.getParty().splice(pokemonIndex, 1)[0].destroy();
            }
            else {
                this.pokemonSacrifice = undefined;
            }
        }

        if (!this.glitchReduced) {
            this.glitchReduced = true;
            reduceGlitchPieceModifier(pokemon);
        }

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 10;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}

export class TypeSacrificeModifier extends PokemonHeldItemModifier {
    private sacrificePokemon: PlayerPokemon | undefined = undefined;
    private primaryType: Type;
    private secondaryType: Type;
    private glitchReduced: boolean = false;
    readonly isTransferrable: boolean = false;
    protected replaceExisting: boolean = true;
    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, primaryType: Type = Type.UNKNOWN, secondaryType: Type = Type.UNKNOWN, sacrificePokemon?: PlayerPokemon, glitchReduced: boolean = false, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.sacrificePokemon = sacrificePokemon;
        this.primaryType = primaryType;
        this.secondaryType = secondaryType;
        this.glitchReduced = glitchReduced;
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof TypeSacrificeModifier;
    }

    clone(): TypeSacrificeModifier {
        return new TypeSacrificeModifier(this.type, this.pokemonId, this.primaryType, this.secondaryType, this.sacrificePokemon, this.glitchReduced, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.primaryType, this.secondaryType, this.sacrificePokemon, this.glitchReduced]);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.makeSpeciesUnique();

        if (this.sacrificePokemon) {
            const types = this.sacrificePokemon.getTypes();
            this.primaryType = types[0];
            this.secondaryType = types.length > 1 ? types[1] : Type.UNKNOWN;

            const normalForm = pokemon.species.forms.length > 0 ? pokemon.species.forms[pokemon.formIndex] : pokemon.species;
            normalForm.type1 = this.primaryType;
            normalForm.type2 = this.secondaryType;

            if (pokemon.isFusion()) {
                const fusionForm = pokemon.fusionSpecies!.forms.length > 0 ? pokemon.fusionSpecies!.forms[pokemon.fusionFormIndex] : pokemon.fusionSpecies;
                fusionForm.type1 = this.primaryType;
                fusionForm.type2 = this.secondaryType;
            }

            reduceGlitchPieceModifier(pokemon);
            this.glitchReduced = true;

            if(!reduceCollectedTypeModifiers(pokemon.scene, this.sacrificePokemon)) {
                let scene = pokemon.scene;
                const pokemonIndex = pokemon.scene.getParty().indexOf(this.sacrificePokemon);
                this.sacrificePokemon = undefined;
                pokemon.scene.removePartyMemberModifiers(pokemonIndex);
                pokemon.scene.getParty().splice(pokemonIndex, 1)[0].destroy();
            }
            else {
                this.sacrificePokemon = undefined;
            }
        } else if (this.primaryType !== Type.UNKNOWN) {
            const normalForm = pokemon.species.forms.length > 0 ? pokemon.species.forms[pokemon.formIndex] : pokemon.species;
            normalForm.type1 = this.primaryType;
            normalForm.type2 = this.secondaryType;

            if (pokemon.isFusion()) {
                const fusionForm = pokemon.fusionSpecies!.forms.length > 0 ? pokemon.fusionSpecies!.forms[pokemon.fusionFormIndex] : pokemon.fusionSpecies;
                fusionForm.type1 = this.primaryType;
                fusionForm.type2 = this.secondaryType;
            }
        }

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 2;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}

export class AbilitySacrificeModifier extends PokemonHeldItemModifier {
    private sacrificePokemon: PlayerPokemon | undefined;
    private ability: Abilities;
    private glitchReduced: boolean;
    readonly isTransferrable: boolean = false;
    protected replaceExisting: boolean = true;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, ability: Abilities, sacrificePokemon: PlayerPokemon, glitchReduced: boolean = false, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.sacrificePokemon = sacrificePokemon;
        this.ability = ability;
        this.glitchReduced = glitchReduced;
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof AbilitySacrificeModifier;
    }

    clone(): AbilitySacrificeModifier {
        return new AbilitySacrificeModifier(this.type, this.pokemonId, this.ability, this.sacrificePokemon!, this.glitchReduced, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.ability, this.sacrificePokemon, this.glitchReduced]);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.makeSpeciesUnique();
        if (this.sacrificePokemon) {
            this.ability = this.sacrificePokemon.getAbility().id;
            let currentAbilityIndex = 0;

            if(pokemon.isFusion()) {
                currentAbilityIndex = pokemon.fusionAbilityIndex;
            }
            else {
                currentAbilityIndex = pokemon.getCurrentAbilityIndex();
            }
            pokemon.setAbility(this.ability, currentAbilityIndex);

            if(!reduceCollectedTypeModifiers(pokemon.scene, this.sacrificePokemon)) {
                const pokemonIndex = pokemon.scene.getParty().indexOf(this.sacrificePokemon);
                this.sacrificePokemon = undefined;
                pokemon.scene.removePartyMemberModifiers(pokemonIndex);
                pokemon.scene.getParty().splice(pokemonIndex, 1)[0].destroy();
            }
            else {
                this.sacrificePokemon = undefined;
            }

            if (!this.glitchReduced) {
                this.glitchReduced = true;
                reduceGlitchPieceModifier(pokemon);
            }

        } else {
            const currentAbilityIndex = pokemon.getCurrentAbilityIndex();
            pokemon.setAbility(this.ability, currentAbilityIndex);
        }

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 2;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}

export class PassiveAbilitySacrificeModifier extends PokemonHeldItemModifier {
    private sacrificePokemon: PlayerPokemon | undefined;
    private ability: Abilities;
    private glitchReduced: boolean;
    readonly isTransferrable: boolean = false;
    protected replaceExisting: boolean = true;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, ability: Abilities, sacrificePokemon: PlayerPokemon, glitchReduced: boolean = false, stackCount?: integer) {
        super(type, pokemonId, stackCount);
        this.sacrificePokemon = sacrificePokemon;
        this.ability = ability;
        this.glitchReduced = glitchReduced;
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof PassiveAbilitySacrificeModifier;
    }

    clone(): PassiveAbilitySacrificeModifier {
        return new PassiveAbilitySacrificeModifier(this.type, this.pokemonId, this.ability, this.sacrificePokemon!, this.glitchReduced, this.stackCount);
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.ability, this.sacrificePokemon, this.glitchReduced]);
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        pokemon.makeSpeciesUnique();
        if (this.sacrificePokemon) {
            this.ability = this.sacrificePokemon.getAbility().id;

            pokemon.altPassiveForRun = this.ability;
            pokemon.passive = true;

            if(!reduceCollectedTypeModifiers(pokemon.scene, this.sacrificePokemon)) {
                const pokemonIndex = pokemon.scene.getParty().indexOf(this.sacrificePokemon);
                this.sacrificePokemon = undefined;
                pokemon.scene.removePartyMemberModifiers(pokemonIndex);
                pokemon.scene.getParty().splice(pokemonIndex, 1)[0].destroy();
            }
            else {
                this.sacrificePokemon = undefined;
            }

            if (!this.glitchReduced) {
                this.glitchReduced = true;
                reduceGlitchPieceModifier(pokemon);
            }

        } else if(this.ability) {
            pokemon.altPassiveForRun = this.ability;
            pokemon.passive = true;
        }

        return true;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 2;
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }
}

export function reduceCollectedTypeModifiers(scene: BattleScene, pokemon: PlayerPokemon): boolean {
  const collectedTypeModifiers = scene.findModifiers(m =>
    m instanceof CollectedTypeModifier &&
    m.pokemonId === pokemon.id
  ) as CollectedTypeModifier[];

  if (collectedTypeModifiers.length === 0) {
    return false;
  }

  for (const modifier of collectedTypeModifiers) {
    if (modifier.hasEnoughCollected(4)) {
      return modifier.reduceCollected(4);
    }
  }

  return false;
}

export class AddPokemonModifier extends ConsumableModifier {
    private scene: BattleScene;
    private newPokemon: PlayerPokemon;

    constructor(type: ModifierTypes.ModifierType, scene: BattleScene, newPokemon: PlayerPokemon) {
        super(type);
        this.scene = scene;
        this.newPokemon = newPokemon;
    }

    apply(args: any[]): boolean {
        const scene = args[0] as BattleScene;
        scene.getParty().push(this.newPokemon);
        this.newPokemon.setVisible(false);
        this.newPokemon.loadAssets();
        reduceGlitchPieceModifier(this.newPokemon, 3);
        return true;
    }
}
export class CollectedTypeModifier extends PokemonHeldItemModifier {
    public collectedTypes: Record<Type, number>;
    readonly isTransferrable: boolean = false;

    constructor(type: ModifierTypes.ModifierType, pokemonId: integer, collectedTypeOrRecord: Type | Record<Type, number>, stackCount?: integer) {
        super(type, pokemonId, stackCount);

        if (typeof collectedTypeOrRecord === 'number') {
            this.collectedTypes = {} as Record<Type, number>;

            const count = stackCount && stackCount > 1 ? stackCount : 1;
            this.collectedTypes[collectedTypeOrRecord] = count;

            this.stackCount = 1;
        } else {
            this.collectedTypes = { ...collectedTypeOrRecord };
            const actualCount = Object.values(this.collectedTypes).reduce((sum, count) => sum + count, 0);
            this.stackCount = actualCount;
        }
    }

    public getTypeCount(type: Type): number {
        return this.collectedTypes[type] || 0;
    }

    public hasEnoughCollected(threshold: number = 4): boolean {
        const totalCount = Object.values(this.collectedTypes).reduce((sum, count) => sum + count, 0);
        return totalCount >= threshold;
    }

    public reduceCollected(amountToReduce: number = 4): boolean {
        if (!this.hasEnoughCollected(amountToReduce)) {
            return false;
        }

        let remainingToReduce = amountToReduce;
        const typeKeys = Object.keys(this.collectedTypes).map(key => parseInt(key) as Type);

        while (remainingToReduce > 0 && typeKeys.length > 0) {
            const randomIndex = Math.floor(Math.random() * typeKeys.length);
            const randomType = typeKeys[randomIndex];
            const currentCount = this.collectedTypes[randomType];

            if (currentCount <= remainingToReduce) {
                remainingToReduce -= currentCount;
                delete this.collectedTypes[randomType];
                typeKeys.splice(randomIndex, 1);
            } else {
                this.collectedTypes[randomType] -= remainingToReduce;
                remainingToReduce = 0;
            }
        }

        this.stackCount = Object.values(this.collectedTypes).reduce((sum, count) => sum + count, 0);

        return true;
    }

    getStackCount(): number {
        return Math.max(Object.values(this.collectedTypes).reduce((sum, count) => sum + count, 0), 0);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof CollectedTypeModifier &&
            modifier.pokemonId === this.pokemonId;
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.collectedTypes]);
    }

    getTransferrable(withinParty: boolean): boolean {
        return false;
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 200;
    }

    clone(): CollectedTypeModifier {
        return new CollectedTypeModifier(this.type, this.pokemonId, this.collectedTypes, this.stackCount);
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }

    apply(args: any[]): boolean {
        const pokemon = args[0] as Pokemon;
        if (!pokemon) {
            return false;
        }
        return pokemon.id === this.pokemonId;
    }

    add(modifiers: PersistentModifier[], virtual: boolean, scene: BattleScene): boolean {
        const existingModifier = modifiers.find(m =>
            m instanceof CollectedTypeModifier &&
            m.pokemonId === this.pokemonId
        ) as CollectedTypeModifier;

        if (existingModifier) {
            for (const [type, count] of Object.entries(this.collectedTypes)) {
                const typeKey = parseInt(type) as Type;
                existingModifier.collectedTypes[typeKey] = (existingModifier.collectedTypes[typeKey] || 0) + count;
            }
            existingModifier.stackCount = Object.values(existingModifier.collectedTypes).reduce((sum, count) => sum + count, 0);
            return true;
        }

        return super.add(modifiers, virtual, scene);
    }
}

export class PermaCollectedTypeModifier extends PersistentModifier {
    public collectedTypes: Record<Type, number>;
    readonly isTransferrable: boolean = false;

    constructor(type: ModifierTypes.ModifierType, collectedTypeOrRecord?: Type | Record<Type, number>, stackCount?: integer) {
        super(type, stackCount);

        if (typeof collectedTypeOrRecord === 'number') {
            this.collectedTypes = {} as Record<Type, number>;
            const count = stackCount && stackCount > 1 ? stackCount : 1;
            this.collectedTypes[collectedTypeOrRecord] = count;
        } else if (collectedTypeOrRecord) {
            this.collectedTypes = { ...collectedTypeOrRecord };
        } else {
            this.collectedTypes = {} as Record<Type, number>;
        }
    }

    addCollected(type: Type, count: number = 1): void {
        this.collectedTypes[type] = (this.collectedTypes[type] || 0) + count;
    }

    removeCollected(type: Type, count: number = 1): boolean {
        const current = this.collectedTypes[type] || 0;
        if (current < count) return false;
        this.collectedTypes[type] = current - count;
        if (this.collectedTypes[type] <= 0) delete this.collectedTypes[type];
        return true;
    }

      getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }

    getTypeCount(type: Type): number {
        return this.collectedTypes[type] || 0;
    }

    getStackCount(): number {
        return Math.max(Object.values(this.collectedTypes).reduce((sum, count) => sum + count, 0), 0);
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof PermaCollectedTypeModifier;
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof PermaCollectedTypeModifier;
    }

    getArgs(): any[] {
        return super.getArgs().concat([this.collectedTypes]);
    }

    clone(): PermaCollectedTypeModifier {
        return new PermaCollectedTypeModifier(this.type, this.collectedTypes, this.stackCount);
    }
}

export abstract class PermaQuestModifier extends PersistentModifier {
    protected condition: () => boolean;
    public questUnlockData: QuestUnlockData;
    protected count: number;

    constructor(type: ModifierTypes.ModifierType, condition: () => boolean, questUnlockData: QuestUnlockData, count: number = 1) {
        super(type);
        this.condition = condition;
        this.questUnlockData = questUnlockData;
        this.count = count;
    }

    apply(args: any[]): boolean {
        if (this.condition()) {
            this.count--;
            if (this.count <= 0) {
                const scene = args.pop() as BattleScene;
                scene.gameData.setQuestState(this.questUnlockData.questId, QuestState.COMPLETED, this.questUnlockData);
                scene.unshiftPhase(new QuestUnlockPhase(scene, this.questUnlockData));
                return true;
            }
        }
        return false;
    }

    protected setIconText(scene: BattleScene, container: Phaser.GameObjects.Container): void {
        const countText = addTextObject(scene, 27, 0, this.count.toString(), TextStyle.PARTY, {
            fontSize: "70px",
            color: "#fff"
        });

        countText.setStroke("#000", 16);
        countText.setOrigin(1, 0);
        container.add(countText);
    }

    getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
        const container = super.getIcon(scene, forSummary, forEnemyBar);
        this.setIconText(scene, container);
        return container;
    }

    abstract clone(): PermaQuestModifier;

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }

}

export class PermaRunQuestModifier extends PermaQuestModifier {
    protected runType: RunType;
    protected duration: RunDuration;
    protected goalCount: number;
    protected currentCount: number;
    public modifierId: string;
    protected resetOnFail: boolean;
    protected stages?: QuestStage[];
    public currentStageIndex?: number;
    public task?: string;
    public consoleCode?: string;
    private currentMode: Mode;

    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration, condition: (...args: any[]) => boolean, goalCount: number, questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0, resetOnFail: boolean = false, stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "" ) {
        super(type, condition, questUnlockData, goalCount);
        this.runType = runType;
        this.duration = duration;
        this.goalCount = goalCount;
        this.task = task;
        this.currentCount = currentCount;
        this.modifierId = `${type.name}_${questUnlockData.questId}`;
        this.resetOnFail = resetOnFail;
        this.stages = stages;
        this.currentStageIndex = currentStageIndex;
        this.consoleCode = consoleCode;
        this.currentMode = Mode.MESSAGE;

        if (stages && stages.length > 0) {
            this.updateCurrentStage(0);
        }
    }

    apply(args: any[]): boolean {
        const scene = args.shift() as BattleScene;
        this.currentMode = scene.ui.getMode();
        if (this.checkRunTypeAndDuration(scene) && this.condition.apply(null, args)) {
            this.incrementCurrentCount(scene);
            const currentCount = this.getCurrentCount(scene);

            if (currentCount >= this.goalCount) {
                this.completeQuest(scene);
            }
            scene.ui.updatePermaModifierBar(scene.gameData.permaModifiers);
            return true;
        } else if (this.resetOnFail) {
            this.resetCount(scene);
            scene.ui.updatePermaModifierBar(scene.gameData.permaModifiers);
        }
        return false;
    }

    private handleQuestManagerPhase(scene: BattleScene, action: () => Promise<void>): void {
        scene.pushPhase(new QuestManagerPhase(
            scene,
            this as PermaRunQuestModifier,
            [{
                action: async () => {
                    try {
                        scene.ui.getHandler().clear();
                        await action();
                    } catch (error) {
                        console.error('QuestManagerPhase action failed:', error);
                        scene.ui.setMode(this.currentMode);
                    }
                },
                label: i18next.t("modifier:permaRunQuest.collectRewards")
            }]
        ));
    }

    private handleRewardPhase<T extends Phase>(scene: BattleScene, PhaseClass: new (...args: any[]) => T, phaseArgs: any[]): void {
        const completeQuest = () => {
            if (!this.isActiveStageQuest()) {
                scene.gameData.permaModifiers.removeModifier(this as PersistentModifier);
            }
            scene.ui.updatePermaModifierBar(scene.gameData.permaModifiers);
            scene.updateModifiers(true);
            scene.ui.setMode(this.currentMode);
        };

        const args = [...phaseArgs, completeQuest];
        scene.unshiftPhase(new PhaseClass(...args));
    }

    private finalizeQuest(scene: BattleScene): void {
        this.handleQuestManagerPhase(scene, async () => {
            if (!this.consoleCode) {
                scene.gameData.setQuestState(
                    this.questUnlockData.questId,
                    QuestState.COMPLETED,
                    this.questUnlockData
                );
                if(this.questUnlockData.rewardType == RewardType.NEW_MOVES_FOR_SPECIES) {
                    scene.gameData.addSpeciesQuestMoves(this.questUnlockData.rewardId as Species);
                }
                this.handleRewardPhase(scene, QuestUnlockPhase, [scene, this.questUnlockData, false]);
            } else {
                this.handleQuestReward(scene, this.questUnlockData);
            }
        });
    }

    protected isActiveStageQuest(): boolean {
        return this.stages && this.currentStageIndex !== undefined && this.currentStageIndex < this.stages.length - 1;
    }

    protected completeQuest(scene: BattleScene): void {
        if (this.consoleCode && this.consoleCode !== "") {
            scene.gameData.gameStats.bountiesCompleted++;
        } else {
            scene.gameData.gameStats.questsCompleted++;
        }

        if (this.stages && this.currentStageIndex !== undefined) {
            let assignStage = false;
            if(scene.currentBattle.trainer?.rivalStage) {
                this.currentStageIndex = scene.currentBattle.trainer?.rivalStage - 1;
                assignStage = true;
            }
            if (this.currentStageIndex < this.stages.length - 1) {
                this.handleQuestManagerPhase(scene, async () => {
                    this.handleQuestReward(scene, this.stages[this.currentStageIndex].questUnlockData);
                    let currentStage = null
                    if(assignStage) {
                        currentStage = this.updateCurrentStage(this.currentStageIndex, true);
                    }
                    else {
                        currentStage = this.updateCurrentStage();
                    }
                    scene.gameData.setQuestStageProgress(
                        this.questUnlockData.questId,
                        this.currentStageIndex,
                        currentStage.questUnlockData
                    );
                });
            } else {
                this.finalizeQuest(scene);
            }
        } else {
            this.finalizeQuest(scene);
        }
    }

    private getRandomReward(): RewardType {
        const rand = Math.random() * 100;
        if (rand < 45) {
            return RewardType.PERMA_MONEY;
        } else if (rand < 95) {
            return RewardType.PERMA_MODIFIER;
        } else {
            return RewardType.PERMA_MONEY_AND_MODIFIER;
        }
    }

    protected handleQuestReward(scene: BattleScene, questUnlockData: QuestUnlockData, skipUnismittyCheck: boolean = false): void {
        if (!skipUnismittyCheck) {
            const randUnismitty = Utils.randSeedInt(100);
            if (randUnismitty === 1) {
                if (this.handleRandomUnismittyUnlock(scene)) {
                    return;
                }
            }
        }

        if ([RewardType.PERMA_MODIFIER, RewardType.PERMA_MONEY, RewardType.PERMA_MONEY_AND_MODIFIER].includes(questUnlockData.rewardType)) {
            switch (questUnlockData.rewardType) {
                case RewardType.PERMA_MODIFIER:
                    this.handlePermaModifierReward(scene);
                    break;
                case RewardType.PERMA_MONEY:
                    this.handleMoneyReward(scene, questUnlockData.rewardId as keyof typeof ModifierTypes.modifierTypes);
                    break;
                case RewardType.PERMA_MONEY_AND_MODIFIER:
                    this.handleMoneyReward(scene, questUnlockData.rewardId as keyof typeof ModifierTypes.modifierTypes);
                    this.handlePermaModifierReward(scene);
                    break;
            }
        } else {
            const randomRewardType = this.getRandomReward();
            const newQuestUnlockData = {
                ...questUnlockData,
                rewardType: randomRewardType
            };
            this.handleQuestReward(scene, newQuestUnlockData, true);
        }
    }

    protected handlePermaModifierReward(scene: BattleScene): void {
            const randomKey = getRandomPermaModifierKey();
            let modifierTypeFunc = ModifierTypes.modifierTypes[randomKey];
            try {
                this.handleRewardPhase(scene, ModifierRewardPhase, [
                    scene,
                    modifierTypeFunc,
                    true
                ]);
            } catch (error) {
                console.error(`Failed to add perma modifier ${randomKey}: ${error.message}`);
            }

    }

    protected handleMoneyReward(scene: BattleScene, moneyModifierKey: keyof typeof ModifierTypes.modifierTypes): void {
        try {
            const modifierTypeFunc = ModifierTypes.modifierTypes[moneyModifierKey];

            if (modifierTypeFunc && moneyModifierKey.startsWith('PERMA_MONEY_')) {
                this.handleRewardPhase(scene, ModifierRewardPhase, [
                    scene,
                    modifierTypeFunc,
                    false
                ]);
            }
        } catch (error) {
            console.error(`Failed to apply money modifier: ${error.message}`);
        }
    }

    protected handleRandomUnismittyUnlock(scene: BattleScene): boolean {
        this.handleRewardPhase(scene, UnlockUniSmittyPhase, [scene]);

        return true;
    }

    protected updateCurrentStage(increment: number = 1, assignStage: boolean = false): QuestStage {
        if (!this.stages || this.currentStageIndex >= this.stages.length) return;

        if(assignStage) {
            this.currentStageIndex = increment;
        } else {
            this.currentStageIndex += increment
        }
        const currentStage = this.stages[this.currentStageIndex];
        this.runType = currentStage.runType;
        this.duration = currentStage.duration;
        this.condition = currentStage.condition;
        this.goalCount = currentStage.goalCount;
        this.currentCount = 0;

        if (currentStage.questUnlockData) {
            this.questUnlockData = currentStage.questUnlockData;
        }
        return currentStage
    }

    getArgs(): any[] {
        return [this.runType, this.duration, this.condition, this.goalCount, this.questUnlockData, this.task, this.currentCount, this.resetOnFail, null, null, this.stages, this.currentStageIndex, this.consoleCode];
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof PermaRunQuestModifier &&
            modifier.modifierId === this.modifierId && modifier.consoleCode === this.consoleCode;
    }
    resetCount(scene: BattleScene): void {
        if (this.duration === RunDuration.SINGLE_RUN) {
            scene.gameData.resetSessionQuestModifierCount(this.modifierId);
        } else {
            this.currentCount = 0;
        }
    }

    private getCurrentCount(scene: BattleScene): number {
        return this.duration === RunDuration.SINGLE_RUN
            ? scene.gameData.getSessionQuestModifierCount(this.modifierId)
            : this.currentCount;
    }

    private incrementCurrentCount(scene: BattleScene): void {
        if (this.duration === RunDuration.SINGLE_RUN) {
            scene.gameData.incrementSessionQuestModifierCount(this.modifierId);
        } else {
            this.currentCount++;
        }
    }

    private checkRunTypeAndDuration(scene: BattleScene): boolean {
        if (this.runType !== RunType.ANY && !scene.gameMode.isRunType(this.runType) && !(this.runType === RunType.NIGHTMARE && scene.gameMode.isChaosMode && scene.currentBattle?.waveIndex > 1000)) {
            return false;
        }
        if (this.duration === RunDuration.SINGLE_RUN && scene.currentBattle.waveIndex === 0) {
            this.resetCount(scene);
        }
        return true;
    }

    protected setIconText(scene: BattleScene, container: Phaser.GameObjects.Container): void {
        if (this.duration !== RunDuration.SINGLE_RUN || scene.currentBattle != undefined) {
            const displayCount = this.getCurrentCount(scene);
            const progressText = addTextObject(
                scene,
                27,
                15,
                this.stages
                    ? `${this.currentStageIndex + 1}/${this.stages.length}`
                    : `${displayCount}/${this.goalCount}`,
                TextStyle.PARTY,
                {fontSize: "70px", color: "#fff"}
            );
            progressText.setShadow(0, 0);
            progressText.setStroke("#000", 12);
            progressText.setOrigin(1, 0);
            container.add(progressText);
        }
    }

    getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
        const container = !forSummary ? scene.add.container(0, 0) : super.getIcon(scene, forSummary, forEnemyBar);

        if (!forSummary) {
            const questData = this.questUnlockData;
            let speciesId: Species | undefined;
        let trainerType: TrainerType | undefined;
        let smittyName: string | undefined;

        if(this instanceof PermaFormChangeQuestModifier && this.type.id.includes('SMITTY')) {
            smittyName = this.type.id.split('_')[0].toLowerCase();
        }
        else if (this instanceof PermaBeatTrainerQuestModifier &&
            typeof questData.questSpriteId === 'number' &&
            questData.questSpriteId in TrainerType) {
            trainerType = questData.questSpriteId;
        } else {
            if (!speciesId && questData.questSpriteId) {
                speciesId = questData.questSpriteId;
            }
            else if (typeof questData.rewardId === 'number') {
                speciesId = questData.rewardId;
            }
            else if (Array.isArray(questData.rewardId) && questData.rewardId.length > 0 &&
                typeof questData.rewardId[0] === 'number') {
                speciesId = questData.rewardId[0];
            }

        }

            const questBG = scene.add.sprite(5, this.virtualStackCount ? 8 : 16, "smitems", "quest");
            questBG.setScale(0.45);
            questBG.setOrigin(0, 0.5);
            container.add(questBG);

        if(smittyName) {
            const smittyIcon = scene.add.sprite(-4, 10, "pokemon_icons_glitch", smittyName);
            smittyIcon.setScale(.8);
            smittyIcon.setOrigin(0, 0.5);
            container.add(smittyIcon);
        }
        else if (trainerType) {
            const config = trainerConfigs[trainerType];
            const spriteKey = config.getSpriteKey(false, false);

            try {
                const trainerSprite = scene.add.sprite(-4, 16, spriteKey);
                trainerSprite.setOrigin(0, 0.5);
                trainerSprite.setScale(0.3);

                if (trainerSprite.texture.frameTotal > 1) {
                    trainerSprite.setFrame(0);
                }

                container.add(trainerSprite);
            } catch (error) {
                console.error(`Failed to load trainer sprite: ${error.message}`);
                this.addFallbackIcon(scene, container);
            }
        } else if (speciesId) {
                const pokemon = getPokemonSpecies(speciesId);
                const pokemonIcon = scene.add.sprite(-4, 10, pokemon.getIconAtlasKey());
                pokemonIcon.setFrame(pokemon.getIconId(false));
                pokemonIcon.setScale(.8);
                pokemonIcon.setOrigin(0, 0.5);
                container.add(pokemonIcon);
            } else {
            this.addFallbackIcon(scene, container);
            }

        } else {
            container.setScale(0.5);
        }

        this.setIconText(scene, container);
        return container;
    }

private addFallbackIcon(scene: BattleScene, container: Phaser.GameObjects.Container): void {
    const item = scene.add.sprite(16, this.virtualStackCount ? 8 : 16, "smitems",
        this.modifierTypeOption.type.iconImage);
    item.setScale(0.25);
    item.setOrigin(0, 0.5);
    container.add(item);
}

    clone(): PermaRunQuestModifier {
        return new PermaRunQuestModifier(this.type, this.runType, this.duration, this.condition, this.goalCount, this.questUnlockData,  this.task, this.currentCount, this.resetOnFail, this.stages, this.currentStageIndex, this.consoleCode);
    }

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }

    getDescription(scene: BattleScene): string {
        if (this.task) {
            return `${this.task}`;
        }
        return super.getDescription(scene);
    }
}

export class PermaWinQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaWinQuestModifier {
        return new PermaWinQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaLoseQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaLoseQuestModifier {
        return new PermaLoseQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaRivalWinQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaRivalWinQuestModifier {
        return new PermaRivalWinQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaEndOfBattleQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaEndOfBattleQuestModifier {
        return new PermaEndOfBattleQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaCatchQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaCatchQuestModifier {
        return new PermaCatchQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaMoveQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaMoveQuestModifier {
        return new PermaMoveQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaFaintQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaFaintQuestModifier {
        return new PermaFaintQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaKnockoutQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaKnockoutQuestModifier {
        return new PermaKnockoutQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaSpecialMoveQuestModifier extends PermaRunQuestModifier {
    private conditionQuest: Unlockables;

    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
        this.conditionQuest = conditionUnlockable;
    }

    clone(): PermaSpecialMoveQuestModifier {
        return new PermaSpecialMoveQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, this.conditionQuest, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaBeatTrainerQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaBeatTrainerQuestModifier {
        return new PermaBeatTrainerQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaUseAbilityQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaUseAbilityQuestModifier {
        return new PermaUseAbilityQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaHitQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaHitQuestModifier {
        return new PermaHitQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaWaveCheckQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (scene: BattleScene, waveIndex: number) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaWaveCheckQuestModifier {
        return new PermaWaveCheckQuestModifier(this.type, this.runType, this.duration,
            this.condition as (scene: BattleScene, waveIndex: number) => boolean,
            this.goalCount, this.questUnlockData, this.task, this.currentCount,
            this.resetOnFail, null, null, this.stages, this.currentStageIndex, this.consoleCode);
    }
}

export class PermaCountdownWaveCheckQuestModifier extends PermaWaveCheckQuestModifier {
    public readonly startWave: number;

    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (scene: BattleScene, waveIndex: number) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, startWave, null, stages, currentStageIndex, consoleCode);
        this.startWave = this.type.config.startWave;
    }

    clone(): PermaCountdownWaveCheckQuestModifier {
        return new PermaCountdownWaveCheckQuestModifier(this.type, this.runType, this.duration,
            this.condition as (scene: BattleScene, waveIndex: number) => boolean,
            this.goalCount, this.questUnlockData, this.task, this.currentCount,
            this.resetOnFail, this.startWave, null, this.stages, this.currentStageIndex, this.consoleCode);
    }
}

export class PermaTagRemovalQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaTagRemovalQuestModifier {
        return new PermaTagRemovalQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}

export class PermaFormChangeQuestModifier extends PermaRunQuestModifier {
    constructor(type: ModifierTypes.ModifierType, runType: RunType, duration: RunDuration,
                condition: (...args: any[]) => boolean, goalCount: number,
                questUnlockData: QuestUnlockData, task?: string, currentCount: number = 0,
                resetOnFail: boolean = false, startWave?: number, conditionUnlockable?: Unlockables,
                stages?: QuestStage[], currentStageIndex: number = 0, consoleCode: string = "") {
        super(type, runType, duration, condition, goalCount, questUnlockData, task,
            currentCount, resetOnFail, stages, currentStageIndex, consoleCode);
    }

    clone(): PermaFormChangeQuestModifier {
        return new PermaFormChangeQuestModifier(this.type, this.runType, this.duration,
            this.condition, this.goalCount, this.questUnlockData, this.task,
            this.currentCount, this.resetOnFail, null, null, this.stages,
            this.currentStageIndex, this.consoleCode);
    }
}
export class PermaModifier extends PersistentModifier {
    constructor(
        type: ModifierTypes.PermaModifierType,
        public permaType: PermaType,
        public remainingCount: number,
        public permaDuration: PermaDuration,
        public condition: () => boolean = () => true,
        stackCount?: integer
    ) {
        super(type, stackCount);
        this.condition = condition;
    }

    reduceCount(scene: BattleScene): void {
        if (this.permaDuration === PermaDuration.WAVE_BASED) {
            if (scene.currentBattle && scene.currentBattle.waveIndex >= 10) {
                this.remainingCount--;
            }
        } else {
            this.remainingCount--;
        }
        if (this.remainingCount <= 0) {
            if (this.permaType == PermaType.PERMA_NEW_NORMAL) {
                setChangeNormalTyping(false);
            }
            scene.gameData.permaModifiers.removeModifier(this as PersistentModifier);
        }
        scene.ui.updatePermaModifierBar(scene.gameData.permaModifiers);
    }

    match(modifier: Modifier): boolean {
        if (modifier instanceof PermaModifier) {
            return this.type.id === modifier.type.id &&
                this.permaDuration === modifier.permaDuration &&
                this.permaType === modifier.permaType;
        }
        return false;
    }

    getArgs(): any[] {
        return [this.permaType, this.remainingCount, this.permaDuration, this.condition];
    }

    protected setIconText(scene: BattleScene, container: Phaser.GameObjects.Container): void {
        const countText = addTextObject(scene, 27, 0, this.remainingCount.toString(), TextStyle.PARTY, {
            fontSize: "75px",
            color: "#fff"
        });
        countText.setStroke("#000", 16);
        countText.setOrigin(1, 0);
        container.add(countText);
    }

    getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
        const container = super.getIcon(scene, forSummary, forEnemyBar);
        this.setIconText(scene, container);
        return container;
    }

    clone(): PermaModifier {
        return new PermaModifier(this.type as ModifierTypes.PermaModifierType, this.permaType, this.remainingCount, this.permaDuration, this.condition, this.stackCount);

    }

    getMaxStackCount(scene: BattleScene): integer {
        return 1;
    }

    add(modifiers: PersistentModifier[], virtual: boolean, scene: BattleScene): boolean {
        const MAX_REMAINING_COUNT = 40;

        for (const modifier of modifiers) {
            if (this.match(modifier)) {
                const permaModifier = modifier as PermaModifier;
                permaModifier.remainingCount = Math.min(permaModifier.remainingCount + this.remainingCount, MAX_REMAINING_COUNT);
                return true;
            }
        }

        this.remainingCount = Math.min(this.remainingCount, MAX_REMAINING_COUNT);
        if (this.permaType == PermaType.PERMA_NEW_NORMAL) {
            setChangeNormalTyping(true);
        }
        modifiers.push(this);
        return true;
    }

    apply(args: any[]): boolean {
        if ((this.condition == null || this.condition()) && this.permaDuration == PermaDuration.USE_BASED) {
            this.reduceCount(args[0] as BattleScene);
            return true;
        }
        return false;
    }
}

export class PermaPartyAbilityModifier extends PermaModifier {
    public readonly ability: Ability;

    constructor(type: ModifierTypes.ModifierType, initialCount: number, permaDuration: PermaDuration, abilityID: Abilities, condition: () => boolean = () => true, stackCount?: integer) {
        super(type, PermaType.PERMA_PARTY_ABILITY, initialCount, permaDuration, condition, stackCount);
        this.ability = allAbilities[abilityID];
    }

    clone(): PermaPartyAbilityModifier {
        return new PermaPartyAbilityModifier(this.type, this.remainingCount, this.permaDuration, this.ability.id, this.condition);
    }

    getArgs(): any[] {
        return [this.remainingCount, this.permaDuration, this.ability.id, this.condition];
    }

    match(modifier: Modifier): boolean {
        return modifier instanceof PermaPartyAbilityModifier &&
            modifier.ability.id === this.ability.id;
    }

    matchType(modifier: Modifier): boolean {
        return modifier instanceof PermaPartyAbilityModifier;
    }

    getMaxHeldItemCount(pokemon: Pokemon): integer {
        return 1;
    }
}

function useSmitemAtlas(modifierType :ModifierTypes.ModifierType): boolean {
    return modifierType.group == "perma" || modifierType.group == "glitch";
}

export class MoveUpgradeModifier extends PersistentModifier {
    public moveId: Moves;
    public powerBoost: integer;
    public typeChange: Type | null;
    public categoryChange: MoveCategory | null;
    public accuracyBoost: integer;
    public effectChange: string | null;
    public chanceChange: integer | null;
    public moveTargetChange: MoveTarget | null;
    public additionalAttrs: MoveAttr[];
    public additionalConditions: MoveCondition[];
    public flagsToAdd: integer;

    public upgradeCategory?: UpgradeCategory;
    public upgradeTier?: number;

    constructor(
        type: ModifierTypes.ModifierType,
        moveId: Moves,
        powerBoost: integer = 0,
        typeChange: Type | null = null,
        categoryChange: MoveCategory | null = null,
        accuracyBoost: integer = 0,
        effectChange: string | null = null,
        chanceChange: integer | null = null,
        moveTargetChange: MoveTarget | null = null,
        additionalAttrs: MoveAttr[] = [],
        additionalConditions: MoveCondition[] = [],
        flagsToAdd: integer = 0,
        stackCount?: integer,
        upgradeCategory?: UpgradeCategory,
        upgradeTier?: number
    ) {
        super(type, stackCount);

        this.moveId = moveId;
        this.powerBoost = powerBoost;
        this.typeChange = typeChange;
        this.categoryChange = categoryChange;
        this.accuracyBoost = accuracyBoost;
        this.effectChange = effectChange;
        this.chanceChange = chanceChange;
        this.moveTargetChange = moveTargetChange;
        this.additionalAttrs = additionalAttrs;
        this.additionalConditions = additionalConditions;
        this.flagsToAdd = flagsToAdd;
        this.upgradeCategory = upgradeCategory;
        this.upgradeTier = upgradeTier;
    }

    match(modifier: Modifier): boolean {
        if (!(modifier instanceof MoveUpgradeModifier)) {
            return false;
        }
        const other = modifier as MoveUpgradeModifier;

        if (this.upgradeCategory && other.upgradeCategory) {
            return this.moveId === other.moveId && this.upgradeCategory === other.upgradeCategory;
        }

        if (!this.upgradeCategory && !other.upgradeCategory) {
            return this.moveId === other.moveId;
        }

        return false;
    }

    apply(args: any[]): boolean {
        return true;
    }

    getMove(move?: Move): Move {
        const baseMove = move && move.id === this.moveId
            ? move
            : allMoves[this.moveId].clone();

        const initialMoveHasMultiHitAttr = baseMove.attrs.some(
            attr => attr instanceof MultiHitAttr || attr instanceof ChangeMultiHitTypeAttr
        );

        const modifierAddsMultiHitAttr = this.additionalAttrs.some(
            attr => attr instanceof MultiHitAttr || attr instanceof ChangeMultiHitTypeAttr
        );

        const hasMultiAttr = initialMoveHasMultiHitAttr && !modifierAddsMultiHitAttr;

        const initialMoveHasFlinchAttr = baseMove.attrs.some(
            attr => attr instanceof FlinchAttr
        );

        const modifierAddsFlinchAttr = this.additionalAttrs.some(
            attr => attr instanceof FlinchAttr
        );

        const hasFlinchAttr = initialMoveHasFlinchAttr && !modifierAddsFlinchAttr;

        const initialMoveHasStatusEffectAttr = baseMove.attrs.some(
            attr => attr instanceof StatusEffectAttr
        );

        const modifierAddsMultiStatusEffectAttr = this.additionalAttrs.some(
            attr => attr instanceof MultiStatusEffectAttr
        );

        if (initialMoveHasStatusEffectAttr && modifierAddsMultiStatusEffectAttr) {
            baseMove.attrs = baseMove.attrs.filter(attr => !(attr instanceof StatusEffectAttr));
        }

        if (this.powerBoost !== 0 && !hasMultiAttr) {
            baseMove.power += this.powerBoost;
        }

        if (this.typeChange !== null) {
            baseMove.type = this.typeChange;
        }

        if (this.categoryChange !== null) {
            baseMove.category = this.categoryChange;
        }

        if (this.accuracyBoost !== 0) {
            baseMove.accuracy += this.accuracyBoost;
            if (baseMove.accuracy > 100) {
                baseMove.accuracy = 100;
            }
        }

        if (this.effectChange !== null) {
            baseMove.effect += " " + this.effectChange;
        }

        if (this.chanceChange !== null && !hasMultiAttr) {
            if (hasFlinchAttr) {
                baseMove.chance = Math.min(this.chanceChange, 30);
            }
            baseMove.chance = this.chanceChange;
        }

        if (this.moveTargetChange !== null) {
            baseMove.moveTarget = this.moveTargetChange;
        }

        for (const attr of this.additionalAttrs) {
            baseMove.addAttr(attr);
        }

        for (const condition of this.additionalConditions) {
            baseMove.conditions.push(condition);
        }

        if (this.flagsToAdd !== 0) {
            const checkAllFlag = MoveFlags.CHECK_ALL_HITS;
            if ((this.flagsToAdd & checkAllFlag) && baseMove.hasFlag(checkAllFlag)) {
                baseMove.flags &= ~checkAllFlag;
                baseMove.flags |= (this.flagsToAdd & ~checkAllFlag);
            } else {
                baseMove.flags |= this.flagsToAdd;
            }
        }

        return baseMove;
    }

    clone(): PersistentModifier {
        return new MoveUpgradeModifier(
            this.type,
            this.moveId,
            this.powerBoost,
            this.typeChange,
            this.categoryChange,
            this.accuracyBoost,
            this.effectChange,
            this.chanceChange,
            this.moveTargetChange,
            [...this.additionalAttrs],
            [...this.additionalConditions],
            this.flagsToAdd,
            this.stackCount,
            this.upgradeCategory,
            this.upgradeTier
        );
    }

    getArgs(): any[] {
        return [
            this.moveId,
            this.powerBoost,
            this.typeChange,
            this.categoryChange,
            this.accuracyBoost,
            this.effectChange,
            this.chanceChange,
            this.moveTargetChange,
            this.additionalAttrs,
            this.additionalConditions,
            this.flagsToAdd,
            this.stackCount,
            this.upgradeCategory,
            this.upgradeTier
        ];
    }

    getMaxStackCount(_scene: BattleScene): integer {
        return 1000000;
    }
}
export class TrainerBondAbilityModifier extends PersistentModifier {
  public ability: Abilities;
  private bonusActivationChance: number;
  private championId: string;
  private activatedThisTurn: boolean = false;
  private lastCheckTurn: number = -1;

  constructor(type: ModifierType, championId: string, ability: Abilities, bonusChance: number = 0.05) {
    super(type, 1 as unknown as integer);
    this.ability = ability;
    this.bonusActivationChance = bonusChance;
    this.championId = championId;
  }

  match(modifier: any): boolean {
    return modifier instanceof TrainerBondAbilityModifier && modifier.championId === this.championId && modifier.ability === this.ability;
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    const scene = pokemon.scene as BattleScene;
    if (scene.gameData.selectedChampionId !== this.championId || !pokemon.isPlayer()) {
      return false;
    }

    const currentTurn = scene.currentBattle?.turn || 0;
    if (currentTurn !== this.lastCheckTurn) {
      this.lastCheckTurn = currentTurn;
      const stackCount = this.getStackCount();
      const effectiveChance = Math.min(1.0, 0.05 * stackCount);
      const chance = Math.round(effectiveChance * 100);
      this.activatedThisTurn = Utils.randSeedInt(100) < chance;
    }

    return this.activatedThisTurn;
  }

  clone(): TrainerBondAbilityModifier {
    return new TrainerBondAbilityModifier(this.type, this.championId, this.ability, this.bonusActivationChance);
  }

  getMaxStackCount(): integer {
    return 50 as unknown as integer;
  }

  getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
    const container = scene.add.container(0, 0);

    const championSpriteKey = this.type.iconImage;
    const championScale = ChampionUtils.getChampionTrainerBondScale(this.championId);
    const iconScale = 0.45 * championScale;

    try {
      if (scene.textures.exists(championSpriteKey)) {
        const sprite = scene.add.sprite(0, 15, championSpriteKey);
        sprite.setOrigin(0, 0.5);
        sprite.setScale(iconScale);

        if (sprite.postFX && typeof sprite.postFX.addColorMatrix === 'function') {
          const colorMatrix = sprite.postFX.addColorMatrix();
          colorMatrix.negative();
        }

        container.add(sprite);
      } else {
        const fallbackSprite = scene.add.sprite(0, 6, "items");
        fallbackSprite.setFrame("trainer");
        fallbackSprite.setOrigin(0, 0.5);

        if (fallbackSprite.postFX && typeof fallbackSprite.postFX.addColorMatrix === 'function') {
          const colorMatrix = fallbackSprite.postFX.addColorMatrix();
          colorMatrix.negative();
        }

        container.add(fallbackSprite);
      }
    } catch (error) {
      const fallbackSprite = scene.add.sprite(0, 6, "items");
      fallbackSprite.setFrame("trainer");
      fallbackSprite.setOrigin(0, 0.5);

      if (fallbackSprite.postFX && typeof fallbackSprite.postFX.addColorMatrix === 'function') {
        const colorMatrix = fallbackSprite.postFX.addColorMatrix();
        colorMatrix.negative();
      }

      container.add(fallbackSprite);
    }

    const stackText = this.getIconStackText(scene, false, forEnemyBar);
    if (stackText) {
      container.add(stackText);
    }

    return container;
  }

  getArgs(): any[] { return [this.championId, this.ability, this.bonusActivationChance]; }
}

export class PokemonAltBuildModifier extends PokemonHeldItemModifier {
  private altBuild: PokemonAltBuildDefinition;

  matchType(modifier: Modifier): boolean {
    return modifier instanceof PokemonAltBuildModifier;
  }

  getMaxHeldItemCount(pokemon: Pokemon): integer {
    return 1;
  };

  constructor(type: ModifierType, pokemonId: integer, altBuild: PokemonAltBuildDefinition) {
    super(type, pokemonId, 1);

    if (altBuild && !altBuild.name) {
      altBuild.name = `Alt Build ${altBuild.id}`;
    }

    this.altBuild = altBuild;
  }

  match(modifier: Modifier): boolean {
    if (modifier instanceof PokemonAltBuildModifier) {
      const sameId = modifier.pokemonId === this.pokemonId && modifier.altBuild.id === this.altBuild.id;
      const sameRank = (modifier.altBuild.rank || 1) === (this.altBuild.rank || 1);
      return sameId && sameRank;
    }
    return false;
  }

  getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
    const container = scene.add.container(0, 0);

    const pokemon = this.getPokemon(scene);
    if (pokemon) {
      const pokemonIcon = scene.addPokemonIcon(pokemon, -2, 10, 0, 0.5);
      container.add(pokemonIcon);
      container.setName(pokemon.id.toString());
    }

    if (!forSummary) {
      const stackText = this.getIconStackText(scene, false, forEnemyBar);
      if (stackText) {
        container.add(stackText);
      }

      const virtualStackText = this.getIconStackText(scene, true, forEnemyBar);
      if (virtualStackText) {
        container.add(virtualStackText);
      }
    } else {
      container.setScale(0.5);
    }

    return container;
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    const isAlreadyApplied = pokemon.altBuildId === this.altBuild.id
        && pokemon.altBuildRank === this.altBuild.rank;
    if (pokemon.id !== this.pokemonId) return false;

    if (!isAlreadyApplied) {
      pokemon.altBuildChange = true;
    }

    const preStateSnapshot = {
      altBuildSpriteColors: pokemon.altBuildSpriteColors ? [...pokemon.altBuildSpriteColors] : null,
      altBuildTargetColors: pokemon.altBuildTargetColors ? [...pokemon.altBuildTargetColors] : null,
      altBuildBlendMode: pokemon.altBuildBlendMode,
      altBuildInversionFactor: pokemon.altBuildInversionFactor || 0.0,
      altBuildRank: pokemon.altBuildRank || 0
    };

    this.applyAltBuildToPokemon(pokemon, isAlreadyApplied);

    if (isAlreadyApplied) {
      return true;
    }

    const altBuildFormChange = new SpeciesFormChange(
      pokemon.species.speciesId,
      pokemon.species.forms[pokemon.formIndex]?.formKey || "",
      SpeciesFormKey.ALT_BUILD,
      new AltBuildTrigger(this.altBuild.id)
    );

    (pokemon as any)._preStateAltBuildSnapshot = preStateSnapshot;

    pokemon.scene.unshiftPhase(new FormChangePhase(pokemon.scene, pokemon, altBuildFormChange, false));
    return true;
  }

  public applyAltBuildToPokemon(pokemon: Pokemon, skipColorUpdate: boolean = false): void {
    const existingBuildId = pokemon.altBuildId;
    const existingRank = pokemon.altBuildRank ?? 0;
    const newRank = this.altBuild.rank ?? 1;

    const isProgressingRank = existingBuildId === this.altBuild.id && newRank > existingRank;

    const species = pokemon.makeSpeciesUnique();
    const currentForm = species.forms && species.forms.length > pokemon.formIndex
      ? species.forms[pokemon.formIndex]
      : species;

    let originalStats: integer[];
    if (this.altBuild.species) {
      const defaultSpecies = getPokemonSpecies(this.altBuild.species);
      if (defaultSpecies) {
        if (pokemon.formIndex > 0 && defaultSpecies.forms && defaultSpecies.forms[pokemon.formIndex]) {
          originalStats = [...defaultSpecies.forms[pokemon.formIndex].baseStats];
        } else {
          originalStats = [...defaultSpecies.baseStats];
        }
      } else {
        originalStats = [...currentForm.baseStats];
      }
    } else {
      originalStats = [...currentForm.baseStats];
    }

    if (isProgressingRank) {
      currentForm.baseStats = [...originalStats];
    }

    if (this.altBuild.statFocus) {
      const focusStats = this.altBuild.statFocus;
      if (focusStats.length < 2 || focusStats.length > 3) {
        console.error(`Alt build ${this.altBuild.id}: statFocus must have 2-3 elements`);
        return;
      }

      const uniqueStats = new Set(focusStats);
      if (uniqueStats.size !== focusStats.length) {
        console.error(`Alt build ${this.altBuild.id}: statFocus contains duplicates`);
        return;
      }

      for (const stat of focusStats) {
        if (stat < Stat.HP || stat > Stat.SPD) {
          console.error(`Alt build ${this.altBuild.id}: Invalid stat ${stat}`);
          return;
        }
      }

      const originalBaseStats = [...currentForm.baseStats];
      const newBaseStats = calculateAltBuildStatsWithSwapping(
        originalBaseStats,
        focusStats,
        this.altBuild.rank || 0
      );

      currentForm.baseStats = newBaseStats;
      currentForm.baseTotal = newBaseStats.reduce((sum, s) => sum + s, 0);
    }

    if (!isProgressingRank) {
      const [a1, a2, ah] = this.altBuild.abilityChanges;
      if (a1 !== undefined) currentForm.ability1 = a1;
      if (a2 !== undefined) currentForm.ability2 = a2;
      if (ah !== undefined) currentForm.abilityHidden = ah;

      if (this.altBuild.passiveAbilityChange) {
        pokemon.altPassiveForRun = this.altBuild.passiveAbilityChange;
        pokemon.passive = true;
      }

      if (this.altBuild.typeChanges) {
        const [t1, t2] = this.altBuild.typeChanges;
        if (t1 !== undefined) currentForm.type1 = t1;
        if (t2 !== undefined) currentForm.type2 = t2;
      }
    } else if (newRank === 10) {
      if (this.altBuild.finalAbilityReplacements) {
        const [a1, a2, ah] = this.altBuild.finalAbilityReplacements;
        if (a1 !== undefined) currentForm.ability1 = a1;
        if (a2 !== undefined) currentForm.ability2 = a2;
        if (ah !== undefined) currentForm.abilityHidden = ah;
      }

      if (this.altBuild.finalPassive) {
        pokemon.altPassiveForRun = this.altBuild.finalPassive;
        pokemon.passive = true;
      }
    }

    pokemon.calculateStats();

    pokemon.altBuildId = this.altBuild.id;
    pokemon.altBuildRank = newRank;

    const baseName = pokemon.species.getName(pokemon.formIndex);

    let altBuildDisplayName = i18next.t(`pokemonAltBuild:${this.altBuild.id}.name`);

    if (this.altBuild.id.includes('apollo_diana_signature')) {
      const scene = pokemon.scene as BattleScene;
      const championId = scene?.gameData?.selectedChampionId;
      if (championId === 'apollo' || championId === 'diana') {
        const championName = ChampionUtils.getChampionDisplayName(championId);
        altBuildDisplayName = i18next.t("pokemonAltBuild:championPartner", { champion: championName });
      }
    }

    const rankSuffix = Utils.intToRoman(newRank);
    const altBuildName = rankSuffix
      ? `${baseName} (${altBuildDisplayName} ${rankSuffix})`
      : `${baseName} (${altBuildDisplayName})`;
    pokemon.nickname = btoa(unescape(encodeURIComponent(altBuildName)));

    if (this.altBuild.spriteColorPalette && pokemon.scene) {
      if (skipColorUpdate) {
        return;
      }
      const adjustedPalette = this.createRankAdjustedPalette(
        this.altBuild.spriteColorPalette,
        newRank
      );

      const inversionFactor = newRank >= 6 ? (newRank - 5) / 5 * 0.7 : 0.0;

      pokemon.updateAltBuildPalette({
        ...this.altBuild,
        spriteColorPalette: adjustedPalette,
        inversionFactor: inversionFactor
      });
    }

    pokemon.altBuildChange = false;
  }

  private createIntensityAdjustedPalette(palette: AltBuildColorPalette, intensity: number): AltBuildColorPalette {
    const adjustedPalette = palette.targetPalette.map(targetHex => {
      const targetRgb = this.hexToRgb(targetHex);
      const baseGray = Math.round((targetRgb.r + targetRgb.g + targetRgb.b) / 3);

      const adjustedRgb = {
        r: Math.round(baseGray + (targetRgb.r - baseGray) * intensity),
        g: Math.round(baseGray + (targetRgb.g - baseGray) * intensity),
        b: Math.round(baseGray + (targetRgb.b - baseGray) * intensity),
      };

      return this.rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b);
    });

    return {
      ...palette,
      targetPalette: adjustedPalette
    };
  }

  private createRankAdjustedPalette(palette: AltBuildColorPalette, rank: number): AltBuildColorPalette {
    const basePalette = (rank >= 6 && palette.darkPalette) ? palette.darkPalette : palette.targetPalette;
    const isPhase1 = rank <= 5;

    if (!palette.rankProgression) {
      const colorIntensity = rank >= 10 ? 1.0 :
                             rank >= 8 ? 0.75 :
                             rank >= 6 ? 0.5 :
                             rank >= 3 ? 0.25 : 0.1;
      return this.createIntensityAdjustedPalette({ ...palette, targetPalette: basePalette }, colorIntensity);
    }

    const progression = palette.rankProgression;

    let saturationMultiplier: number;
    let lightnessMultiplier: number;

    if (isPhase1) {
      switch (progression.type) {
        case 'exponential':
          saturationMultiplier = Math.pow(rank / 5, 2);
          break;
        case 'milestone':
          saturationMultiplier = rank >= 5 ? 1.0 :
                                rank >= 4 ? 0.85 :
                                rank >= 3 ? 0.7 :
                                rank >= 2 ? 0.55 : 0.55;
          break;
        default:
          saturationMultiplier = rank / 5;
      }

      if (rank <= 2) {
        lightnessMultiplier = 0.0;
      } else {
        lightnessMultiplier = -(rank - 2) / 3;
      }
    } else {
      saturationMultiplier = 1.0;
      const darkRank = rank - 5;
      lightnessMultiplier = 1.0 - (darkRank / 5) * 0.5;
    }

    const adjustedPalette = basePalette.map(targetHex => {
      const rgb = this.hexToRgb(targetHex);
      const hsl = this.rgbToHsl(rgb);

      if (progression.saturationScale !== undefined) {
        hsl.s *= (progression.saturationScale * saturationMultiplier);
        hsl.s = Math.max(0, Math.min(1, hsl.s));
      } else {
        hsl.s *= saturationMultiplier;
      }

      if (progression.lightnessAdjust !== undefined) {
        const lightnessOffset = progression.lightnessAdjust * lightnessMultiplier;
        hsl.l += lightnessOffset;
        hsl.l = Math.max(0, Math.min(1, hsl.l));
      }

      if (progression.hueShift !== undefined) {
        const hueOffset = progression.hueShift * lightnessMultiplier;
        hsl.h = (hsl.h + hueOffset + 360) % 360;
      }

      const adjustedRgb = this.hslToRgb(hsl);
      return this.rgbToHex(adjustedRgb.r, adjustedRgb.g, adjustedRgb.b);
    });

    return {
      ...palette,
      targetPalette: adjustedPalette
    };
  }

  private rgbToHsl(rgb: { r: number, g: number, b: number }): { h: number, s: number, l: number } {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
      return { h: 0, s: 0, l };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
      default: h = 0;
    }

    return { h: h * 360, s, l };
  }

  private hslToRgb(hsl: { h: number, s: number, l: number }): { r: number, g: number, b: number } {
    const h = hsl.h / 360;
    const s = hsl.s;
    const l = hsl.l;

    if (s === 0) {
      const gray = Math.round(l * 255);
      return { r: gray, g: gray, b: gray };
    }

    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
      r: Math.round(hue2rgb(p, q, h + 1/3) * 255),
      g: Math.round(hue2rgb(p, q, h) * 255),
      b: Math.round(hue2rgb(p, q, h - 1/3) * 255),
    };
  }

  private hexToRgb(hex: string): { r: number, g: number, b: number } {
    hex = hex.replace(/^#/, '');
    return {
      r: parseInt(hex.substring(0, 2), 16),
      g: parseInt(hex.substring(2, 4), 16),
      b: parseInt(hex.substring(4, 6), 16),
    };
  }

  private rgbToHex(r: number, g: number, b: number): string {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  clone(): PokemonAltBuildModifier {
    return new PokemonAltBuildModifier(this.type, this.pokemonId, this.altBuild);
  }

  getArgs(): any[] {
    return [this.pokemonId, this.altBuild];
  }
}

export class TeraAbilityModifier extends PersistentModifier {
  public abilityId: Abilities;
  public teraType: Type;
  private championId: string;
  private activationChance: number;
  private activatedThisTurn: boolean = false;
  private lastCheckTurn: number = -1;

  constructor(type: ModifierType, championId: string, abilityId: Abilities, teraType: Type, activationChance: number = 0.10) {
    super(type, 1);
    this.championId = championId;
    this.abilityId = abilityId;
    this.teraType = teraType;
    this.activationChance = activationChance;
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof TeraAbilityModifier &&
        modifier.abilityId === this.abilityId &&
        modifier.teraType === this.teraType &&
        modifier.championId === this.championId;
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    if (!pokemon.isPlayer()) return false;

    const scene = pokemon.scene as BattleScene;
    if (scene.gameData.selectedChampionId !== this.championId) return false;

    const teraActive = !!scene.findModifiers(m => (m as any).pokemonId === pokemon.id && m instanceof TerastallizeModifier).length;
    if (!teraActive) return false;

    const currentTurn = scene.currentBattle?.turn || 0;
    if (currentTurn !== this.lastCheckTurn) {
      this.lastCheckTurn = currentTurn;
      const stackCount = this.getStackCount();
      const effectiveChance = Math.min(1.0, 0.10 * stackCount);
      const chance = Math.round(effectiveChance * 100);
      this.activatedThisTurn = Utils.randSeedInt(100) < chance;
    }

    return this.activatedThisTurn;
  }

  clone(): TeraAbilityModifier {
    return new TeraAbilityModifier(this.type, this.championId, this.abilityId, this.teraType, this.activationChance);
  }

  getMaxStackCount(): integer {
    return 50 as unknown as integer;
  }

  getIcon(scene: BattleScene, forSummary?: boolean, forEnemyBar?: boolean): Phaser.GameObjects.Container {
    const container = scene.add.container(0, 0);

    const item = scene.add.sprite(0, 12, "items");
    item.setFrame(this.type.iconImage);
    item.setOrigin(0, 0.5);

    if (item.postFX && typeof item.postFX.addColorMatrix === 'function') {
      const colorMatrix = item.postFX.addColorMatrix();
      colorMatrix.negative();
    }

    container.add(item);

    const stackText = this.getIconStackText(scene, false, forEnemyBar);
    if (stackText) {
      container.add(stackText);
    }

    return container;
  }

  getArgs(): any[] {
    return [this.championId, this.abilityId, this.teraType, this.activationChance];
  }
}

export class SkillPointRewardModifier extends ConsumableModifier {
  private amount: number;

  constructor(type: ModifierTypes.ModifierType, amount: number) {
    super(type);
    this.amount = amount;
  }

  apply(args: any[]): boolean {
    const scene = args[0] as BattleScene;
    if (!scene) {
      return false;
    }
    const activeSkillTree = scene.gameData?.activeSkillTree;
    if (!activeSkillTree) {
      return false;
    }
    activeSkillTree.skillPoints = (activeSkillTree.skillPoints || 0) + this.amount;
    return true;
  }
}

export class SkillTreeTokenRewardModifier extends ConsumableModifier {
  private amount: number;

  constructor(type: ModifierTypes.ModifierType, amount: number) {
    super(type);
    this.amount = amount;
  }

  apply(args: any[]): boolean {
    const scene = args[0] as BattleScene;
    if (!scene) {
      return false;
    }
    const activeSkillTree = scene.gameData?.activeSkillTree;
    if (!activeSkillTree) {
      return false;
    }
    activeSkillTree.tokens = (activeSkillTree.tokens || 0) + this.amount;
    return true;
  }
}

export class ChampionPokemonStatBoosterModifier extends PokemonHeldItemModifier {
  private championId: string;
  private stats: Stat[];
  private boostPercent: number;
  private championTypes: Type[];
  readonly isTransferrable: boolean = false;

  constructor(type: ModifierType, pokemonId: integer, championId: string, stats: Stat[], boostPercent: number = 0.01, championTypes?: Type[]) {
    super(type, pokemonId, 1);
    this.championId = championId;
    this.stats = stats;
    this.boostPercent = boostPercent;
    this.championTypes = championTypes || [];
  }

  match(modifier: Modifier): boolean {
    return modifier instanceof ChampionPokemonStatBoosterModifier &&
      modifier.pokemonId === this.pokemonId &&
      modifier.championId === this.championId &&
      JSON.stringify([...(modifier.stats || [])].sort()) === JSON.stringify([...(this.stats || [])].sort());
  }

  shouldApply(args: any[]): boolean {
    return super.shouldApply(args) && args.length === 2 && args[1] instanceof Array;
  }

  apply(args: any[]): boolean {
    const pokemon = args[0] as Pokemon;
    const baseStats = args[1] as number[];
    const scene = pokemon.scene as BattleScene;

    if (pokemon.id !== this.pokemonId) return false;
    if (scene.gameData.selectedChampionId !== this.championId || !pokemon.isPlayer()) {
      return false;
    }
    let effectiveStats = this.stats;
    if (this.championTypes.length > 0 && this.stats.length > 1) {
      const hasTypeMatch = this.championTypes.some(champType => pokemon.isOfType(champType));

      if (hasTypeMatch) {
        effectiveStats = this.stats;
      } else {
        effectiveStats = [this.stats[0]];
      }
    }
    for (const stat of effectiveStats) {
      baseStats[stat] = Math.min(
        Math.floor(baseStats[stat] * (1 + (this.boostPercent * this.getStackCount()))),
        999999
      );
    }

    return true;
  }

  clone(): ChampionPokemonStatBoosterModifier {
    return new ChampionPokemonStatBoosterModifier(this.type, this.pokemonId, this.championId, this.stats.slice(), this.boostPercent, this.championTypes);
  }

  matchType(modifier: Modifier): boolean {
    return modifier instanceof ChampionPokemonStatBoosterModifier &&
      modifier.championId === this.championId &&
      JSON.stringify([...(modifier.stats || [])].sort()) === JSON.stringify([...(this.stats || [])].sort());
  }

  getMaxHeldItemCount(_pokemon?: Pokemon): integer {
    return 250;
  }

  getMaxStackCount(): integer { return 5 as unknown as integer; }
  getArgs(): any[] { return [this.pokemonId, this.championId, this.stats, this.boostPercent, this.championTypes]; }
}