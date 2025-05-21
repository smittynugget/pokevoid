import BattleScene from "#app/battle-scene.js";
import { ModifierTier } from "#app/modifier/modifier-tier.js";
import { ModifierType, ModifierTypeOption } from "#app/modifier/modifier-type.js";
import { SelectModifierPhase } from "./select-modifier-phase.js";
import * as Utils from "#app/utils.js";
import { PermaType } from "#app/modifier/perma-modifiers.js";
import { Mode } from "#app/ui/ui.js";
import { PartyUiMode } from "#app/ui/party-ui-handler.js";
import { BattlePhase } from "./battle-phase.js";
import { MoveUpgradePhase } from "./move-upgrade-phase.js";
import { EnhancedTutorial } from "#app/ui/tutorial-registry.js";

export class SelectMoveUpgradeModifierPhase extends SelectModifierPhase {
    private moveUpgradeOptions: ModifierType[];
    private rerollCallback?: () => ModifierType[];
    
    constructor(
        scene: BattleScene,
        rerollCount: number,
        modifierTiers: ModifierTier[],
        draftOnly: boolean,
        moveUpgradeOptions: ModifierType[],
        onEndCallback?: () => void,
        rerollCallback?: () => ModifierType[]
    ) {
        super(scene, rerollCount, modifierTiers, draftOnly, onEndCallback);
        this.moveUpgradeOptions = moveUpgradeOptions;
        this.rerollCallback = rerollCallback;
    }
    
    getModifierTypeOptions(modifierCount: number): ModifierTypeOption[] {
        return this.moveUpgradeOptions.slice(0, modifierCount).map(type => ({ 
            id: Utils.randomString(16),
            type, 
            upgradeCount: 1,
            cost: 0 
        }));
    }

    getRerollCost(): number {
        const baseValue = 10000;
        return Math.min(baseValue * Math.pow(2, this.rerollCount), Number.MAX_SAFE_INTEGER);
    }
    
    getPoolType(): any {
        return null;
    }
    
    start() {
        BattlePhase.prototype.start.call(this); 
        this.scene.reroll = false;

        const typeOptions = this.getModifierTypeOptions(3);
        
        const modifierSelectCallback = (rowCursor: number, cursor: number) => {
            if (rowCursor < 0 || cursor < 0) {
                this.scene.ui.playError();
                return false;
            }
            
            let modifierType: ModifierType | undefined;
            
            switch (rowCursor) {
                case 0: 
                    switch (cursor) {
                        case 0: 
                            const rerollCost = this.getRerollCost();
                            if (this.scene.gameData.permaMoney < rerollCost) {
                                this.scene.ui.playError();
                                return false;
                            } else {
                                const newOptions = this.rerollCallback ? this.rerollCallback() : this.shuffleArray([...this.moveUpgradeOptions]);
                                const newPhase = new SelectMoveUpgradeModifierPhase(
                                    this.scene, 
                                    this.rerollCount + 1, 
                                    [ModifierTier.COMMON, ModifierTier.GREAT, ModifierTier.ULTRA], 
                                    true, 
                                    newOptions,
                                    null,
                                    this.rerollCallback
                                );
                                
                                this.scene.unshiftPhase(newPhase);
                                if(Utils.randSeedInt(100) <= 50) {
                                    this.scene.gameData.reducePermaModifierByType([
                                        PermaType.PERMA_REROLL_COST_1, 
                                        PermaType.PERMA_REROLL_COST_2, 
                                        PermaType.PERMA_REROLL_COST_3
                                    ], this.scene);
                                }
                                
                                this.scene.addPermaMoney(-rerollCost);
                                this.scene.animateMoneyChanged(false);
                                this.scene.playSound("se/buy");
                                this.scene.ui.clearText();
                                this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
                            }
                            break;
                        case 1: 
                            break; 
                        case 2: 
                            this.scene.ui.setModeWithoutClear(Mode.PARTY, PartyUiMode.CHECK, -1, () => {
                                const moveOptions = this.getModifierTypeOptions(3);
                                this.scene.ui.setMode(
                                    Mode.MODIFIER_SELECT, 
                                    this.isPlayer(), 
                                    moveOptions, 
                                    modifierSelectCallback, 
                                    this.getRerollCost(), 
                                    true
                                );
                            });
                            break;
                    }
                    return true;
                case 1: 
                    if (cursor < this.moveUpgradeOptions.length) {
                        modifierType = this.moveUpgradeOptions[cursor];
                    }
                    break;
            }
            if (modifierType) {
                const newModifier = modifierType.newModifier();
                if (newModifier) {
                    const result = this.scene.addModifier(newModifier, false, true);
                    if (result) {
                        this.scene.ui.clearText();
                        this.scene.ui.setMode(Mode.MESSAGE).then(() => this.end());
                    }
                    return result;
                }
            }
            
            this.scene.ui.playError();
            return false;
        };
        this.scene.ui.setMode(
            Mode.MODIFIER_SELECT, 
            this.isPlayer(), 
            typeOptions, 
            modifierSelectCallback, 
            this.getRerollCost(), 
            true
        );

        if(!this.scene.gameData.tutorialService.isTutorialCompleted(EnhancedTutorial.FIRST_MOVE_UPGRADE_1)) {
            this.scene.gameData.tutorialService.showNewTutorial(EnhancedTutorial.FIRST_MOVE_UPGRADE_1, true, false);
        }
    }
    
    private shuffleArray<T>(array: T[]): T[] {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Utils.randSeedInt(i+1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
} 