import BattleScene from "../battle-scene";
import PokemonSpecies, { adjustDuelmonIconScale } from "../data/pokemon-species";
import { addTextObject, TextStyle } from "./text";

export class StarterContainer extends Phaser.GameObjects.Container {
  public scene: BattleScene;
  public species: PokemonSpecies;
  public icon: Phaser.GameObjects.Sprite;
  public shinyIcons: Phaser.GameObjects.Image[] = [];
  public label: Phaser.GameObjects.Text;
  public starterPassiveBgs: Phaser.GameObjects.Image;
  public hiddenAbilityIcon: Phaser.GameObjects.Image;
  public favoriteIcon: Phaser.GameObjects.Image;
  public classicWinIcon: Phaser.GameObjects.Image;
  public candyUpgradeIcon: Phaser.GameObjects.Image;
  public candyUpgradeOverlayIcon: Phaser.GameObjects.Image;
  public cost: number = 0;
  public fusionSpeciesId: number = -1;
  public fusionIndex: number = -1;
  public fusionOverlayIcon: Phaser.GameObjects.Sprite | null = null;
  public fusionOverlayBg: Phaser.GameObjects.Image | null = null;
  public hitZone: Phaser.GameObjects.Zone | null = null;

  constructor(scene: BattleScene, species: PokemonSpecies) {
    super(scene, 0, 0);

    this.species = species;

    const defaultDexAttr = scene.gameData.getSpeciesDefaultDexAttr(species, false, true);
    const defaultProps = scene.gameData.getSpeciesDexAttrProps(species, defaultDexAttr);
    const starterPassiveBg = this.scene.add.image(2, 5, "passive_bg");
    starterPassiveBg.setOrigin(0, 0);
    starterPassiveBg.setScale(0.75);
    starterPassiveBg.setVisible(false);
    this.add(starterPassiveBg);
    this.starterPassiveBgs = starterPassiveBg;
    this.icon = this.scene.add.sprite(7, 2, species.getIconAtlasKey(defaultProps.formIndex, defaultProps.shiny, defaultProps.variant));
    const iconScale = adjustDuelmonIconScale(0.5, this.species.generation);
    this.icon.setScale(this.species.generation === 20 ? iconScale * 0.8 : iconScale);
    this.icon.setOrigin(0.5, 0);
    const _origWarn = console.warn;
    console.warn = () => {};
    this.icon.setFrame(species.getIconId(defaultProps.female, defaultProps.formIndex, defaultProps.shiny, defaultProps.variant));
    console.warn = _origWarn;
    this.checkIconId(defaultProps.female, defaultProps.formIndex, defaultProps.shiny, defaultProps.variant);
    this.icon.setTint(0);
    this.add(this.icon);
    for (let i = 0; i < 3; i++) {
      const shinyIcon = this.scene.add.image(i * -3 + 12, 2, "shiny_star_small");
      shinyIcon.setScale(0.5);
      shinyIcon.setOrigin(0, 0);
      shinyIcon.setVisible(false);
      this.shinyIcons.push(shinyIcon);
    }
    this.add(this.shinyIcons);
    const label = addTextObject(this.scene, 1, 2, "0", TextStyle.WINDOW, { fontSize: "32px" });
    label.setShadowOffset(2, 2);
    label.setOrigin(0, 0);
    label.setVisible(false);
    this.add(label);
    this.label = label;
    const abilityIcon = this.scene.add.image(12, 7, "ha_capsule");
    abilityIcon.setOrigin(0, 0);
    abilityIcon.setScale(0.5);
    abilityIcon.setVisible(false);
    this.add(abilityIcon);
    this.hiddenAbilityIcon = abilityIcon;
    const favoriteIcon = this.scene.add.image(0, 7, "favorite");
    favoriteIcon.setOrigin(0, 0);
    favoriteIcon.setScale(0.5);
    favoriteIcon.setVisible(false);
    this.add(favoriteIcon);
    this.favoriteIcon = favoriteIcon;
    const classicWinIcon = this.scene.add.image(0, 12, "champion_ribbon");
    classicWinIcon.setOrigin(0, 0);
    classicWinIcon.setScale(0.5);
    classicWinIcon.setVisible(false);
    this.add(classicWinIcon);
    this.classicWinIcon = classicWinIcon;
    const candyUpgradeIcon = this.scene.add.image(12, 12, "items", "candy");
    candyUpgradeIcon.setOrigin(0, 0);
    candyUpgradeIcon.setScale(0.25);
    candyUpgradeIcon.setVisible(false);
    this.add(candyUpgradeIcon);
    this.candyUpgradeIcon = candyUpgradeIcon;
    const candyUpgradeOverlayIcon = this.scene.add.image(12, 12, "candy_overlay");
    candyUpgradeOverlayIcon.setOrigin(0, 0);
    candyUpgradeOverlayIcon.setScale(0.25);
    candyUpgradeOverlayIcon.setVisible(false);
    this.add(candyUpgradeOverlayIcon);
    this.candyUpgradeOverlayIcon = candyUpgradeOverlayIcon;

    this.hitZone = this.scene.add.zone(0, 0, 18, 17);
    this.hitZone.setOrigin(0, 0);
    this.hitZone.setInteractive({ useHandCursor: true });
    this.add(this.hitZone);
  }

  checkIconId(female, formIndex, shiny, variant) {
    if (this.icon.frame.name !== this.species.getIconId(female, formIndex, shiny, variant)) {
      console.log(`${this.species.name}'s variant icon does not exist. Replacing with default.`);
      const origWarn = console.warn;
      console.warn = () => {};
      this.icon.setTexture(this.species.getIconAtlasKey(formIndex, false, variant));
      this.icon.setFrame(this.species.getIconId(female, formIndex, false, variant));
      if (this.icon.frame.name !== this.species.getIconId(female, formIndex, false, variant)) {
        this.icon.setTexture("pokemon_icons_0");
        this.icon.setFrame("unknown");
      }
      console.warn = origWarn;
    }
  }

  setFusionOverlay(fusionSpecies: PokemonSpecies): void {
    if (this.fusionOverlayBg) {
      this.fusionOverlayBg.destroy();
      this.fusionOverlayBg = null;
    }
    if (this.fusionOverlayIcon) {
      this.fusionOverlayIcon.destroy();
      this.fusionOverlayIcon = null;
    }
    const defaultDexAttr = this.scene.gameData.getSpeciesDefaultDexAttr(fusionSpecies, false, true);
    const props = this.scene.gameData.getSpeciesDexAttrProps(fusionSpecies, defaultDexAttr);

    this.fusionOverlayBg = this.scene.add.image(13.5, 13.5, "passive_bg");
    this.fusionOverlayBg.setOrigin(0.5, 0.5);
    this.fusionOverlayBg.setScale(0.37);
    this.fusionOverlayBg.setTint(0x000000);
    this.fusionOverlayBg.setAlpha(1.0);
    this.add(this.fusionOverlayBg);

    this.fusionOverlayIcon = this.scene.add.sprite(
      13.5, 12,
      fusionSpecies.getIconAtlasKey(props.formIndex, props.shiny, props.variant)
    );
    this.fusionOverlayIcon.setFrame(fusionSpecies.getIconId(props.female, props.formIndex, props.shiny, props.variant));
    this.fusionOverlayIcon.setScale(adjustDuelmonIconScale(0.3, fusionSpecies.generation));
    this.fusionOverlayIcon.setOrigin(0.5, 0.5);
    this.add(this.fusionOverlayIcon);
  }
}