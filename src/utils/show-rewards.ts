import BattleScene from "#app/battle-scene.js";
import { PathNodeTypeFilter } from "#app/modifier/modifier-type.js";
import { PermaType } from "#app/modifier/perma-modifiers.js";
import * as Utils from "#app/utils.js";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase.js";
import { getPartyCollectedTypeTotal } from "#app/utils/collected-type-totals.js";
import Overrides from "#app/overrides";

export function ShowRewards(scene: BattleScene, chance: integer = 19, overrideChance: boolean = true, unshiftRatherThanPush: boolean = true, pathNodeFilter: PathNodeTypeFilter = PathNodeTypeFilter.NONE) {
    if (scene.gameData.tutorialOnboardActive) return;

    if (scene.gameMode.isTestMod) {
        for (const species of scene.gameData.testSpeciesForMod) {
            scene.unshiftPhase(new SelectModifierPhase(scene, 1, undefined, false, undefined, pathNodeFilter));
        }
        return;
    }

    if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_3)) {
        chance = 13;
    } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_2)) {
        chance = 15;
    } else if (scene.gameData.hasPermaModifierByType(PermaType.PERMA_SHOW_REWARDS_1)) {
        chance = 17;
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
    const totalCollectedTypes = getPartyCollectedTypeTotal(scene);
    if (Overrides.FORCE_COLLECTOR_SHOP_OVERRIDE || (totalCollectedTypes > 10 && ((scene.currentBattle.waveIndex > 1) &&
    scene.gameMode.isChaosMode && Utils.randSeedInt(chaosChance, 1) == 1 ||
        (!scene.gameMode.isChaosMode && (scene.currentBattle.waveIndex % 26 == 0 || Utils.randSeedInt(chance, 1) == 1 ))))) {
        import("#app/phases/collected-type-shop-phase.js").then(({ CollectedTypeShopPhase }) => {
            if(unshiftRatherThanPush) {
                scene.unshiftPhase(new CollectedTypeShopPhase(scene, 1, undefined, false, undefined, undefined));
            }
            else {
                scene.pushPhase(new CollectedTypeShopPhase(scene, 1, undefined, false, undefined, undefined));
            }
        });
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