import BattleScene from "#app/battle-scene.js";
import { PathNodeTypeFilter } from "#app/modifier/modifier-type.js";
import { PermaType } from "#app/modifier/perma-modifiers.js";
import * as Utils from "#app/utils.js";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase.js";
import { CollectedTypeShopPhase } from "#app/phases/collected-type-shop-phase.js";
import { CollectedTypeModifier } from "#app/modifier/modifier.js";
import Overrides from "#app/overrides";

function getTotalCollectedTypes(scene: BattleScene): number {
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

export function ShowRewards(scene: BattleScene, chance: integer = 20, overrideChance: boolean = true, unshiftRatherThanPush: boolean = true, pathNodeFilter: PathNodeTypeFilter = PathNodeTypeFilter.NONE) {
    if (scene.gameMode.isTestMod) {
        for (const species of scene.gameData.testSpeciesForMod) {
            scene.unshiftPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, pathNodeFilter));
        }
        return;
    }

    if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_3)) {
        chance = 14;
    } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_2)) {
        chance = 16;
    } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_1)) {
        chance = 18;
    }

    if(scene.gameMode.isChaosMode) {
        chance -= 2;
    }

    let permaReduced = false;

    if (scene.currentBattle.waveIndex <= 1 ||
        Utils.randSeedInt(chance, 1) == 1 ||
        (overrideChance && (scene.currentBattle.trainer &&
            (scene.currentBattle.trainer.config.title == "Rival") ||
            (scene.dynamicMode ||
            scene.currentBattle.waveIndex % 10 == 0)))
    ) {
        if(unshiftRatherThanPush) {
            scene.unshiftPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, pathNodeFilter));
        }
        else {
            scene.pushPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, pathNodeFilter));
        }

        scene.gameData.reducePermaModifierByType([PermaType.PERMA_SHOW_REWARDS_1, PermaType.PERMA_SHOW_REWARDS_2, PermaType.PERMA_SHOW_REWARDS_3], scene);
        permaReduced = true;
    }

    const chaosChance = chance * 3;
    const totalCollectedTypes = getTotalCollectedTypes(scene);
    if (Overrides.FORCE_COLLECTOR_SHOP_OVERRIDE || (totalCollectedTypes > 10 && ((scene.currentBattle.waveIndex > 1) &&
    scene.gameMode.isChaosMode && Utils.randSeedInt(chaosChance, 1) == 1 ||
        (!scene.gameMode.isChaosMode && (scene.currentBattle.waveIndex % 26 == 0 || Utils.randSeedInt(chance, 1) == 1 ))))) {
        if(unshiftRatherThanPush) {
            scene.unshiftPhase(new CollectedTypeShopPhase(scene, 1, undefined, false, undefined, undefined));
        }
        else {
            scene.pushPhase(new CollectedTypeShopPhase(scene, 1, undefined, false, undefined, undefined));
        }
        if(!permaReduced) {
            permaReduced = true;
            scene.gameData.reducePermaModifierByType([PermaType.PERMA_SHOW_REWARDS_1, PermaType.PERMA_SHOW_REWARDS_2, PermaType.PERMA_SHOW_REWARDS_3], scene);
        }
    }

    const easierChance = chance - 4;
    if (scene.moveUpgradesEnabledForRun && (scene.currentBattle.waveIndex > 1) &&
    ((Utils.randSeedInt(easierChance, 1) == 1) || overrideChance) &&
        (scene.currentBattle.waveIndex % 10 == 0 ||
        scene.dynamicMode)) {
        if(unshiftRatherThanPush) {
            scene.unshiftPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, PathNodeTypeFilter.MOVE_UPGRADE));
            if(Utils.randSeedInt(easierChance, 1) == 1) {
                scene.unshiftPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, PathNodeTypeFilter.MOVE_UPGRADE));
            }
        }
        else {
            scene.pushPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, PathNodeTypeFilter.MOVE_UPGRADE));
            if(Utils.randSeedInt(easierChance, 1) == 1) {
                scene.pushPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, PathNodeTypeFilter.MOVE_UPGRADE));
            }
        }
        if(!permaReduced) {
            scene.gameData.reducePermaModifierByType([PermaType.PERMA_SHOW_REWARDS_1, PermaType.PERMA_SHOW_REWARDS_2, PermaType.PERMA_SHOW_REWARDS_3], scene);
        }
    }

    if ((scene.currentBattle.waveIndex > 1) &&
    ((Utils.randSeedInt(easierChance, 1) == 1) || overrideChance) &&
        (scene.currentBattle.waveIndex % 10 == 0 ||
        scene.dynamicMode)) {
        if(unshiftRatherThanPush) {
            scene.unshiftPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, PathNodeTypeFilter.VITAMIN));
            if(Utils.randSeedInt(easierChance, 1) == 1) {
                scene.unshiftPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, PathNodeTypeFilter.VITAMIN));
            }
        }
        else {
            scene.pushPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, PathNodeTypeFilter.VITAMIN));
            if(Utils.randSeedInt(easierChance, 1) == 1) {
                scene.pushPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, PathNodeTypeFilter.VITAMIN));
            }
        }
        if(!permaReduced) {
            scene.gameData.reducePermaModifierByType([PermaType.PERMA_SHOW_REWARDS_1, PermaType.PERMA_SHOW_REWARDS_2, PermaType.PERMA_SHOW_REWARDS_3], scene);
        }
    }
}