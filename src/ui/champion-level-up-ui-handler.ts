import BattleScene from "../battle-scene";
import { Button } from "../enums/buttons";
import { TextStyle, addTextObject } from "./text";
import { Mode } from "./ui";
import { ModalUiHandler } from "./modal-ui-handler";
import i18next from "../plugins/i18n";
import { ChampionUtils } from "#app/system/champion-utils";
import { ChampionSkillDef, PlayableChampionData } from "../system/playable-champions";
import { SkillTreeNodeGenerator } from "#app/system/skill-tree-node-generator";
import { SkillTreeReward, SkillTreeRewardType } from "#app/system/skill-tree-data";
import { Type } from "#app/data/type";
import { Abilities } from "#app/enums/abilities";
import { Moves } from "#app/enums/moves";
import { Species } from "#app/enums/species";
import { FormChangeItem } from "#app/enums/form-change-items";
import { UpgradePath } from "#app/enums/upgrade-path";

export interface ChampionLevelUpConfig {
  championData: PlayableChampionData;
  newSkill: ChampionSkillDef;
  onAcknowledged: () => void;
}

export default class ChampionLevelUpUiHandler extends ModalUiHandler {
  private levelUpContainer: Phaser.GameObjects.Container;
  private championSprite: Phaser.GameObjects.Sprite;
  private titleText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private skillNameText: Phaser.GameObjects.Text;
  private skillDescText: Phaser.GameObjects.Text;
  private continueText: Phaser.GameObjects.Text;

  private config: ChampionLevelUpConfig | null = null;

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode ?? Mode.CHAMPION_LEVEL_UP);
  }

  getModalTitle(): string { return ""; }
  getWidth(): number { return 300; }
  getHeight(): number { return 200; }
  getMargin(): [number, number, number, number] { return [0, 0, 0, 0]; }
  getButtonLabels(): string[] { return []; }

  setup(): void {
    const ui = this.getUi();

    this.levelUpContainer = this.scene.add.container(ui.width / 2, ui.height / 2);
    this.levelUpContainer.setName("championLevelUpContainer");
    this.levelUpContainer.setVisible(false);
    ui.add(this.levelUpContainer);

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x000000, 0.8);
    bg.fillRect(-300, -200, 600, 400);
    bg.lineStyle(4, 0xFFD700);
    bg.strokeRect(-300, -200, 600, 400);
    this.levelUpContainer.add(bg);

    this.titleText = addTextObject(this.scene, 0, -150, "", TextStyle.WINDOW, {
      fontSize: "96px",
      align: "center",
      fontStyle: "bold",
    });
    this.titleText.setOrigin(0.5);
    this.levelUpContainer.add(this.titleText);

    this.championSprite = this.scene.add.sprite(-150, -50, "trainer_m");
    this.championSprite.setScale(2);
    this.levelUpContainer.add(this.championSprite);

    this.levelText = addTextObject(this.scene, 0, -80, "", TextStyle.WINDOW, {
      fontSize: "72px",
      align: "center",
    });
    this.levelText.setOrigin(0.5);
    this.levelUpContainer.add(this.levelText);

    this.skillNameText = addTextObject(this.scene, 50, -20, "", TextStyle.SUMMARY_GOLD, {
      fontSize: "80px",
      fontStyle: "bold",
    });
    this.skillNameText.setOrigin(0, 0.5);
    this.levelUpContainer.add(this.skillNameText);

    this.skillDescText = addTextObject(this.scene, 50, 30, "", TextStyle.WINDOW_ALT, {
      fontSize: "60px",
      wordWrap: { width: 220 } as any,
    });
    this.skillDescText.setOrigin(0, 0);
    this.levelUpContainer.add(this.skillDescText);

    this.continueText = addTextObject(
      this.scene,
      0,
      150,
      i18next.t("championLevelUp:continue"),
      TextStyle.WINDOW,
      { fontSize: "56px", align: "center" }
    );
    this.continueText.setOrigin(0.5);
    this.levelUpContainer.add(this.continueText);

    this.scene.tweens.add({
      targets: this.continueText,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  show(args: any[] = []): boolean {
    if (args.length >= 1) {
      this.config = args[0] as ChampionLevelUpConfig;
    }
    if (!this.config) return false;

    this.updateContent();
    this.levelUpContainer.setVisible(true);

    this.scene.playSound("ui/level_up");

    return super.show(args);
  }

  private updateContent(): void {
    if (!this.config) return;

    const championName = ChampionUtils.getChampionDisplayName(this.config.championData.id);
    this.titleText.setText(i18next.t("championLevelUp:title", { champion: championName }));
    this.levelText.setText(
      i18next.t("championLevelUp:levelReached", { level: this.config.championData.level })
    );

    const spriteKey = ChampionUtils.getChampionSpriteKey(this.config.championData.id, this.scene.gameData.gender);
    if (spriteKey) {
      this.championSprite.setTexture(spriteKey);
    }

    const skillNameKey = `championSkill:${this.config.championData.id}.level_${this.config.newSkill.unlockLevel}.name`;
    const skillName = i18next.t(skillNameKey);

    let skillDesc: string;
    if (this.config.newSkill.rewardType) {
      const rewardData: SkillTreeReward = {
        type: this.config.newSkill.rewardType,
        data: this.buildRewardData(this.config.newSkill),
        immediate: false
      };
      const nodeGen = new SkillTreeNodeGenerator(0, this.config.championData.id, this.scene);
      skillDesc = nodeGen.getRewardDescription(rewardData);
    } else {
      skillDesc = i18next.t(this.config.newSkill.descriptionKey || "");
    }

    this.skillNameText.setText(skillName);
    this.skillDescText.setText(skillDesc);

    this.addLevelUpEffect();
  }

  private buildRewardData(skill: ChampionSkillDef): any {
    const data: any = {};

    switch (skill.rewardType) {
      case SkillTreeRewardType.TRAINER_BOND_ABILITY:
      case SkillTreeRewardType.ABILITY_GRANT:
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
      case SkillTreeRewardType.SMITTY_ABILITY:
      case SkillTreeRewardType.TERA_ABILITY:
        data.abilityId = skill.unlockableId as Abilities;
        break;

      case SkillTreeRewardType.TM_FILTERED:
      case SkillTreeRewardType.XM_FILTERED:
        data.moveId = skill.unlockableId as Moves;
        break;

      case SkillTreeRewardType.SIGNATURE_POKEMON:
      case SkillTreeRewardType.LEGENDARY_POKEMON:
        data.species = skill.unlockableId as Species;
        break;

      case SkillTreeRewardType.MEGA_STONE:
      case SkillTreeRewardType.DYNA_MUSHROOM:
      case SkillTreeRewardType.GLITCH_CHANGE:
        data.itemId = skill.unlockableId as FormChangeItem;
        break;

      case SkillTreeRewardType.TYPE_SWITCHER:
      case SkillTreeRewardType.TYPE_BOOSTER_ITEM:
      case SkillTreeRewardType.TERA_TYPE:
      case SkillTreeRewardType.ESSENCE_BUNDLE:
        data.type = skill.unlockableId as Type;
        break;

      case SkillTreeRewardType.STAT_BOOST:
        data.boostId = skill.unlockableId as string;
        break;

      case SkillTreeRewardType.MOVE_UPGRADE:
        data.filterUpgrades = { moveUpgrades: [skill.unlockableId as UpgradePath] };
        break;

      case SkillTreeRewardType.POKEMON_ALT_BUILD:
        data.altBuildId = skill.unlockableId;
        break;

      case SkillTreeRewardType.GLITCH_FORM_UNLOCK:
        data.unlockableId = skill.unlockableId;
        break;

      case SkillTreeRewardType.EGG_VOUCHER:
      case SkillTreeRewardType.MONEY_REWARD:
      case SkillTreeRewardType.PERMA_MONEY:
      case SkillTreeRewardType.ROGUEBALL_RARITY_SELECT:
      case SkillTreeRewardType.MASTERBALL_RARITY_SELECT:
      case SkillTreeRewardType.GOLDEN_POKEBALL:
      case SkillTreeRewardType.MASTER_BALL:
      case SkillTreeRewardType.ROGUE_BALL:
      case SkillTreeRewardType.HEALING_ITEMS:
      case SkillTreeRewardType.MEMORY_MUSHROOM:
      case SkillTreeRewardType.BERRY_ITEMS:
      case SkillTreeRewardType.ABILITY_SWITCHER:
      case SkillTreeRewardType.GENERAL_ITEMS:
      case SkillTreeRewardType.BATON_ITEM:
      case SkillTreeRewardType.PP_MAX_ITEM:
      case SkillTreeRewardType.GENERAL_POKEMON:
        break;

      default:
        console.warn(`Unknown reward type for buildRewardData: ${skill.rewardType}`);
    }

    return data;
  }

  private addLevelUpEffect(): void {
    const particles = this.scene.add.particles(0, 0, "sparkle", {
      scale: { start: 0.8, end: 0.1 },
      speed: { min: 100, max: 200 },
      lifespan: 1000,
      quantity: 20,
      tint: 0xFFD700,
      blendMode: "ADD",
    } as any);
    this.levelUpContainer.add(particles);
    this.scene.time.delayedCall(2000, () => particles.destroy());
  }

  processInput(button: Button): boolean {
    switch (button) {
      case Button.ACTION:
      case Button.CANCEL:
        return this.acknowledge();
    }
    return false;
  }

  private acknowledge(): boolean {
    if (this.config?.onAcknowledged) {
      const cb = this.config.onAcknowledged;
      this.clear();
      cb();
    }
    return true;
  }

  clear(): void {
    if (this.levelUpContainer) {
      this.levelUpContainer.setVisible(false);
    }
    this.config = null;
    super.clear();
  }
}