import QuestBountyUiHandler from "./quest-bounty-ui-handler";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import { Species } from "#enums/species";
import { PermaRunQuestModifier } from "../modifier/modifier";
import {addTextObject, TextStyle} from "#app/ui/text";
import i18next from "i18next";
import {randSeedInt} from "#app/utils";
import { RewardType } from "../system/game-data";
import { GameModes } from "../game-mode";

export default class QuestActiveUiHandler extends QuestBountyUiHandler {
    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode);
    }

    getModalTitle(): string {
        return i18next.t("questUi:bounty.quest.activeQuest.modalTitle");
    }

    protected getSwapButtonLabel(): string {
        return i18next.t("questUi:bounty.quest.activeQuest.buttons.swap");
    }

    protected getActivateButtonLabel(): string {
        return i18next.t("questUi:bounty.quest.activeQuest.buttons.activate");
    }

    protected getRewardChances(): string {
        if (this.questModifier?.questUnlockData?.rewardText) {
            return this.questModifier.questUnlockData.rewardText;
        }

        return i18next.t("questUi:bounty.quest.activeQuest.rewards.unlockForm", {
            pokemonName: this.formatBountyTarget(this.bountyTarget)
        });
    }

    protected assignBountyTarget(): void {
        if (this.questModifier?.questUnlockData?.rewardId) {
            const rewardId = this.questModifier.questUnlockData.rewardId;
            if (Array.isArray(rewardId)) {
                const randomIndex = randSeedInt(rewardId.length);
                this.bountyTarget = Species[rewardId[randomIndex]];
            } else {
                this.bountyTarget = Species[rewardId];
            }
        } else {
            console.error('[QuestActiveUI] No reward ID found in quest modifier');
            this.bountyTarget = null;
        }
    }

    protected rewardSection(): void {
        super.rewardSection();

        if (this.questModifier?.questUnlockData?.rewardType === RewardType.GAME_MODE) {
            const gameMode = this.questModifier.questUnlockData.rewardId;
            
            let unlocks: string[] = [];
            switch (gameMode) {
                case GameModes.CLASSIC:
                    unlocks = [
                        i18next.t("questUi:modeRewards.classicModeRewardFusion"),
                        i18next.t("questUi:modeRewards.commonModeRewardAbilities"),
                        `${i18next.t("rewardObtainedUi:titles.newShopItem")}: ${i18next.t("modifierType:ModifierType.MEGA_BRACELET.name")}`,
                        `${i18next.t("rewardObtainedUi:titles.newShopItem")}: ${i18next.t("modifierType:ModifierType.TERA_ORB.name")}`,
                        `${i18next.t("rewardObtainedUi:titles.newShopItem")}: ${i18next.t("modifierType:ModifierType.DYNAMAX_BAND.name")}`,
                    ];
                    break;
                case GameModes.NUZLIGHT:
                    unlocks = [
                        `${i18next.t("rewardObtainedUi:titles.newShopItem")}: ${i18next.t("modifierType:ModifierType.SacrificeToggleModifierType.name")}`,
                        `${i18next.t("rewardObtainedUi:titles.newShopItem")}: ${i18next.t("questUi:modeRewards.nuzlightModeRewardUpdatedInventory")}`,
                        `${i18next.t("rewardObtainedUi:titles.newItem")}: ${i18next.t("questUi:modeRewards.nuzlightModeRewardTypeSwitch")}`,
                        `${i18next.t("rewardObtainedUi:titles.newItem")}: ${i18next.t("questUi:modeRewards.nuzlightModeRewardMoveRelease")}`,
                        i18next.t("questUi:modeRewards.commonModeRewardAbilities"),
                        i18next.t("questUi:modeRewards.accessQuestsInBattle")
                    ];
                    break;
                case GameModes.NUZLOCKE:
                    unlocks = [
                        `${i18next.t("rewardObtainedUi:ui.new")} ${i18next.t("modifier:permaRunQuest.rewardTypes.permaModifier")}: ${i18next.t("modifierType:ModifierType.PermaModifierType.PERMA_TRANSFER_TERA.name")}`,
                        `${i18next.t("rewardObtainedUi:ui.new")} ${i18next.t("modifier:permaRunQuest.rewardTypes.permaModifier")}: ${i18next.t("modifierType:ModifierType.PermaModifierType.PERMA_NEW_NORMAL.name")}`,
                        `${i18next.t("rewardObtainedUi:ui.new")} ${i18next.t("modifier:permaRunQuest.rewardTypes.permaModifier")}: ${i18next.t("modifierType:ModifierType.PermaModifierType.PERMA_METRONOME_LEVELUP.name")}`,
                        i18next.t("questUi:modeRewards.commonModeRewardAbilities"),
                        `${i18next.t("questUi:modeRewards.nuzlockeModeRewardRank2")} ${i18next.t("modifier:permaRunQuest.rewardTypes.permaModifier")}`,
                        i18next.t("questUi:modeRewards.accessShopInBattle")
                    ];
                    break;
            }

            let yOffset = 18;
            unlocks.forEach(unlock => {
                const text = addTextObject(
                    this.scene,
                    0,
                    yOffset,
                    unlock,
                    TextStyle.WINDOW,
                    { fontSize: '35px' }
                );
                this.rewardsContainer.add(text);
                yOffset += 7;
            });
        }
    }

    protected setupSpecificUI(config: any): void {
        const questStatus = this.getQuestStatus();
        const maxStage = this.getMaxStages();

        if (maxStage > 1) {
            const progressContainer = this.scene.add.container(120, 80);
            this.uiContainer.add(progressContainer);

            const progressText = addTextObject(
                this.scene,
                0,
                0,
                i18next.t("questUi:bounty.quest.activeQuest.progress.title"),
                TextStyle.WINDOW,
                { fontSize: '60px' }
            );
            progressContainer.add(progressText);

            const stageText = addTextObject(
                this.scene,
                0,
                10,
                i18next.t("questUi:bounty.quest.activeQuest.progress.count", {
                    current: questStatus.stage || 1,
                    max: maxStage
                }),
                TextStyle.WINDOW,
                { fontSize: '40px' }
            );
            progressContainer.add(stageText);
        }
    }

    show(args: any[]): boolean {
        if (this.active || !args.length) {
            return false;
        }

        this.questModifier = args[2] as PermaRunQuestModifier;
        this.viewOnly = args[3] ?? false;

        if (!this.questModifier) {
            console.error('[QuestActiveUI] No quest modifier provided');
            return false;
        }

        return super.show(args);
    }

    protected canModifyBounty(): boolean {
        return true;
    }

    protected avoidDuplicateConsoleBounty(modifier: PermaRunQuestModifier): boolean {
        return true;
    }

    protected getQuestStatus(): { status: string, stage?: number } {
        const activeModifier = this.scene.findModifiers(m =>
            m instanceof PermaRunQuestModifier &&
            m.modifierId === this.questModifier.modifierId
        )[0] as PermaRunQuestModifier;

        return {
            status: activeModifier 
                ? i18next.t("questUi:bounty.common.status.active")
                : i18next.t("questUi:bounty.common.status.inactive")
        };
    }

    clear(): void {
        if (this.questSprite) {
            this.questSprite.destroy();
            this.questSprite = null;
        }
        this.questModifier = null;
        super.clear();
    }
}