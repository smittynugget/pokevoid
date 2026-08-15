import BattleScene from "../battle-scene";
import { Button } from "../enums/buttons";
import { TextStyle, addTextObject } from "./text";
import { Mode } from "./mode";
import { ModalUiHandler } from "./modal-ui-handler";
import i18next from "../plugins/i18n";
import { ChampionUtils } from "#app/system/champion-utils";
import { ChampionSkillDef, PlayableChampionData } from "../system/playable-champions";
import { SkillTreeNodeGenerator, getDisplayRarityForRewardType } from "#app/system/skill-tree-node-generator";
import { SkillTreeReward, SkillTreeRewardType, SkillTreeRarity } from "#app/system/skill-tree-data";
import { Type } from "#app/data/type";
import { Abilities } from "#app/enums/abilities";
import { Moves } from "#app/enums/moves";
import { Species } from "#app/enums/species";
import { FormChangeItem } from "#app/enums/form-change-items";
import { UpgradePath } from "#app/enums/upgrade-path";
import { ModifierOption } from "./modifier-select-ui-handler";

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

    if (this.scene.textures.exists("level_up")) {
      const bgImage = this.scene.add.image(0, 0, "level_up");
      bgImage.setDisplaySize(600, 400);
      bgImage.setOrigin(0.5, 0.5);
      this.levelUpContainer.add(bgImage);
    } else {
      const bg = this.scene.add.graphics();
      bg.fillStyle(0x000000, 0.8);
      bg.fillRect(-300, -200, 600, 400);
      bg.lineStyle(4, 0xFFD700);
      bg.strokeRect(-300, -200, 600, 400);
      this.levelUpContainer.add(bg);
    }

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

    const rarity = this.config.newSkill.rewardType
      ? getDisplayRarityForRewardType(this.config.newSkill.rewardType)
      : "common";
    const soundKey = ModifierOption.EMBER_RARITY_SOUNDS[rarity] || "se/shing";
    const soundConfig = soundKey.startsWith("battle_anims/") ? { volumeGroup: "se" } : undefined;
    this.scene.playSound(soundKey, soundConfig as any);

    return super.show(args);
  }

  private updateContent(): void {
    if (!this.config) return;

    let skillName = "???";
    let skillDesc = "";

    if (this.config.newSkill.rewardType) {
      const rewardData: SkillTreeReward = {
        type: this.config.newSkill.rewardType,
        data: this.buildRewardData(this.config.newSkill),
        immediate: false
      };
      const nodeGen = new SkillTreeNodeGenerator(0, this.config.championData.id, this.scene);
      const generatedName = nodeGen.getRewardName(rewardData);
      if (generatedName && generatedName !== "Unknown Reward") {
        skillName = generatedName.includes(": ") ? generatedName.substring(generatedName.indexOf(": ") + 2) : generatedName;
      }
      skillDesc = nodeGen.getRewardDescription(rewardData);
    } else {
      skillDesc = i18next.t(this.config.newSkill.descriptionKey || "");
    }

    if (this.config.newSkill.customLabel) {
      skillName = this.config.newSkill.customLabel;
    }

    this.titleText.setText(i18next.t("championLevelUp:skillObtained", { skillName }));
    this.levelText.setText(
      i18next.t("championLevelUp:levelReached", { level: this.config.championData.level })
    );

    const spriteKey = ChampionUtils.getChampionSpriteKey(this.config.championData.id, this.scene.gameData.gender);
    if (spriteKey) {
      this.championSprite.setTexture(spriteKey);
    }

    this.skillNameText.setText(skillName);
    this.skillDescText.setText(skillDesc);

    this.addLevelUpEffect();
    this.playEmberCardReveal(skillName);
  }

  private playEmberCardReveal(skillName: string): void {
    if (!this.config) return;
    ModifierOption.ensureEmberTextures(this.scene);

    const rarity = this.config.newSkill.rewardType
      ? getDisplayRarityForRewardType(this.config.newSkill.rewardType)
      : SkillTreeRarity.COMMON;
    const rarityColors = ModifierOption.EMBER_RARITY_COLORS[rarity] || ModifierOption.EMBER_RARITY_COLORS[SkillTreeRarity.COMMON];
    const cardX = 50;
    const cardY = 60;

    const glowTexKey = "ember_mat_glow";
    if (this.scene.textures.exists(glowTexKey)) {
      const glow = this.scene.add.image(cardX, cardY, glowTexKey);
      glow.setScale((40 * 1.4) / 64);
      glow.setAlpha(0);
      glow.setTint(Phaser.Display.Color.GetColor(rarityColors.glow[0], rarityColors.glow[1], rarityColors.glow[2]));
      this.levelUpContainer.add(glow);
      this.scene.tweens.add({
        targets: glow,
        alpha: 0.45,
        duration: 350,
        ease: "Quad.easeIn"
      });
      this.scene.time.delayedCall(1800, () => {
        if (glow?.active) {
          this.scene.tweens.add({ targets: glow, alpha: 0.15, duration: 400 });
        }
      });
    }

    const softTexKey = "ember_mat_soft";
    if (this.scene.textures.exists(softTexKey)) {
      const particles: Phaser.GameObjects.Image[] = [];
      for (let j = 0; j < 10; j++) {
        const img = this.scene.add.image(cardX, cardY, softTexKey);
        img.setVisible(false);
        this.levelUpContainer.add(img);
        particles.push(img);
      }
      this.scene.tweens.addCounter({
        from: 0, to: 1, duration: 800,
        onUpdate: (t: Phaser.Tweens.Tween) => {
          const p = t.getValue();
          if (p <= 0.03 || p >= 0.85) {
            for (const img of particles) img.setVisible(false);
            return;
          }
          const ea = Math.min(1, p / 0.06) * Math.max(0, 1 - (p - 0.65) / 0.2);
          for (let j = 0; j < particles.length; j++) {
            const img = particles[j];
            const seed = (j * 7 + 13) % 97 / 97;
            const ex = cardX + (seed - 0.5) * 36;
            const ey = cardY - p * 100 * (0.5 + seed * 0.5) - j * 3;
            const cVar = (seed - 0.5) * 40;
            const pr = Math.min(255, Math.max(0, rarityColors.particle[0] + cVar));
            const pg = Math.min(255, Math.max(0, rarityColors.particle[1] + cVar));
            const pb = Math.min(255, Math.max(0, rarityColors.particle[2] + cVar));
            img.setVisible(ea > 0.01);
            img.setPosition(ex, ey);
            img.setScale(0.18 + seed * 0.12);
            img.setTint(Phaser.Display.Color.GetColor(Math.floor(pr), Math.floor(pg), Math.floor(pb)));
            img.setAlpha(ea * 0.6 * (0.3 + seed * 0.7));
          }
        },
        onComplete: () => { for (const img of particles) img.setVisible(false); }
      });
    }

    const cardContainer = this.scene.add.container(cardX, cardY);
    cardContainer.setAlpha(0);
    this.levelUpContainer.add(cardContainer);

    const iconCfg = this.getSkillIconForCard();
    if (this.scene.textures.exists(iconCfg.key)) {
      const icon = this.scene.add.sprite(0, 0, iconCfg.key, iconCfg.frame);
      const scale = iconCfg.scale >= 2.0 ? 1.0 : 0.5;
      icon.setScale(scale);
      icon.setOrigin(0.5, 0.5);
      if (iconCfg.inverted && icon.postFX && typeof icon.postFX.addColorMatrix === "function") {
        icon.postFX.addColorMatrix().negative();
      }
      cardContainer.add(icon);
    }

    this.scene.time.delayedCall(375, () => {
      cardContainer.setAlpha(1);
      if (cardContainer.postFX && typeof cardContainer.postFX.addPixelate === "function") {
        const pixFx = cardContainer.postFX.addPixelate(16);
        this.scene.tweens.add({
          targets: pixFx,
          amount: -1,
          duration: 400,
          ease: "Linear",
          onComplete: () => {
            if (cardContainer.postFX) cardContainer.postFX.remove(pixFx);
          }
        });
      }
    });
  }

  private getSkillIconForCard(): { key: string; frame: string; scale: number; inverted?: boolean } {
    const skill = this.config?.newSkill;
    if (!skill) return { key: "smitems", frame: "permaMoreRevive", scale: 1.0 };

    switch (skill.rewardType) {
      case SkillTreeRewardType.TM_FILTERED:
        return { key: "items", frame: "tm_normal", scale: 2.0 };
      case SkillTreeRewardType.XM_FILTERED:
        return { key: "smitems", frame: "glitchTm", scale: 1.0 };
      case SkillTreeRewardType.ABILITY_GRANT:
      case SkillTreeRewardType.PASSIVE_ABILITY_GRANT:
      case SkillTreeRewardType.SMITTY_ABILITY:
        return { key: "smitems", frame: "modPassiveAbility", scale: 1.0 };
      case SkillTreeRewardType.TERA_ABILITY:
        return { key: "items", frame: "stellar_tera_shard", scale: 2.0, inverted: true };
      case SkillTreeRewardType.MEGA_STONE:
        return { key: "items", frame: "pinsirite", scale: 2.0 };
      case SkillTreeRewardType.STAT_BOOST:
        return { key: "items", frame: "protein", scale: 2.0 };
      case SkillTreeRewardType.LEGENDARY_POKEMON:
        return { key: "items", frame: "mb", scale: 2.0 };
      case SkillTreeRewardType.GENERAL_POKEMON:
      case SkillTreeRewardType.SIGNATURE_POKEMON:
        return { key: "smitems", frame: "draftMode", scale: 1.0 };
      case SkillTreeRewardType.TRAINER_BOND_ABILITY:
        return { key: "smitems", frame: "modPassiveAbility", scale: 1.0 };
      default:
        return { key: "smitems", frame: "permaMoreRevive", scale: 1.0 };
    }
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
        data.megaStone = skill.unlockableId as FormChangeItem;
        break;
      case SkillTreeRewardType.DYNA_MUSHROOM:
      case SkillTreeRewardType.GLITCH_CHANGE:
        data.formChangeItem = skill.unlockableId as FormChangeItem;
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