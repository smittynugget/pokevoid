import BattleScene from "../battle-scene";
import OptionSelectUiHandler from "./settings/option-select-ui-handler";
import { Mode } from "./ui";
import * as Utils from "../utils";
import { TextStyle, addTextObject, getTextStyleOptions } from "./text";
import { getBattleCountSplashMessage, getSplashMessages } from "../data/splash-messages";
import i18next from "i18next";
import { TimedEventDisplay } from "#app/timed-event-manager.js";
import {addWindow, WindowVariant} from "#app/ui/ui-theme";
import {getSmitomDialogue} from "#app/data/dialogue";
import {CustomDialoguePhase} from "#app/phases/custom-dialogue-phase";
import {TitlePhase} from "#app/phases/title-phase";
import {RewardObtainDisplayPhase} from "#app/phases/reward-obtain-display-phase";
import {RewardObtainedType} from "#app/ui/reward-obtained-ui-handler";
import {ModifierRewardPhase} from "#app/phases/modifier-reward-phase";

export default class TitleUiHandler extends OptionSelectUiHandler {
  private titleContainer: Phaser.GameObjects.Container;
  private playerCountLabel: Phaser.GameObjects.Text;
  private splashMessage: string;
  private splashMessageText: Phaser.GameObjects.Text;
  private eventDisplay: TimedEventDisplay;
  private smittySprite: Phaser.GameObjects.Sprite;
  private textureLoaded: boolean = false;
  private exclamationWindow: Phaser.GameObjects.Container;

  private titleStatsTimer: NodeJS.Timeout | null;

  constructor(scene: BattleScene, mode: Mode = Mode.TITLE) {
    super(scene, mode);
  }

  setup() {
    super.setup();

    const ui = this.getUi();

    this.titleContainer = this.scene.add.container(0, -(this.scene.game.canvas.height / 6));
    this.titleContainer.setName("title");
    this.titleContainer.setAlpha(0);
    ui.add(this.titleContainer);

    const logo = this.scene.add.image((this.scene.game.canvas.width / 6) / 2, 30, "logo");
    logo.setOrigin(0.5, 0);
    logo.setScale(0.2);
    this.titleContainer.add(logo);

    const taglineText = addTextObject(this.scene, logo.x, logo.y + logo.displayHeight + 3, i18next.t("menu:tagline"), TextStyle.TITLE_MESSAGE, { fontSize: "40px" });
    taglineText.setOrigin(0.5, 0);
    this.titleContainer.add(taglineText);

    if (this.scene.eventManager.isEventActive()) {
      this.eventDisplay = new TimedEventDisplay(this.scene, 0, 0, this.scene.eventManager.activeEvent());
      this.eventDisplay.setup();
      this.titleContainer.add(this.eventDisplay);
    }

    this.splashMessageText = addTextObject(this.scene, logo.x + 64, logo.y + logo.displayHeight - 8, "", TextStyle.MONEY, { fontSize: "54px" });
    this.splashMessageText.setOrigin(0.5, 0.5);
    this.splashMessageText.setAngle(-20);
    this.titleContainer.add(this.splashMessageText);


    this.splashMessageText.setVisible(false);

    this.loadSmittyTexture()
        .then(() => {
          this.setupSmittySprite();
        })
        .catch(error => {
          console.error('[TitleUiHandler] Error loading Smitty texture:', error);
        });
  }

  private async loadSmittyTexture(): Promise<void> {
    const smittyForm = "smitom";
    const spriteKey = `pkmn__glitch__${smittyForm}`;

    if (this.scene.textures.exists(spriteKey)) {
      this.textureLoaded = true;
      return;
    }

    return new Promise((resolve, reject) => {
      this.scene.load.embeddedAtlas(
          spriteKey,
          `images/pokemon/glitch/${smittyForm}.png`
      );

      this.scene.load.once(Phaser.Loader.Events.COMPLETE, () => {
        this.textureLoaded = true;
        resolve();
      });

      this.scene.load.once(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: any) => {
        reject(new Error(`Failed to load texture: ${file.key}`));
      });

      if (!this.scene.load.isLoading()) {
        this.scene.load.start();
      }
    });
  }

  private setupSmittySprite(): void {
    if (!this.textureLoaded) {
        console.error("[TitleUiHandler] Smitty texture not loaded.");
        return;
    }

    
    const spriteKey = `pkmn__glitch__smitom`;
    const x = (this.scene.game.canvas.width / 6) - 25; 
    const y = this.scene.game.canvas.height / 6 - 10;


    this.smittySprite = this.scene.addPokemonSprite(
        null,
        x,
        y,
        spriteKey,
        undefined,
        false,
        true
    );

    this.smittySprite.setOrigin(0.5, 1);
    this.smittySprite.setScale(0.2); 

    this.scene.tweens.add({
        targets: this.smittySprite,
        angle: { from: -2, to: 2 },
        duration: 3500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1
    });



    if (this.smittySprite.texture.frameTotal > 1) {
        this.smittySprite.play(spriteKey);
    }

    if (this.scene.spritePipeline) {
        this.smittySprite.setPipeline(this.scene.spritePipeline);
    }

    this.titleContainer.add(this.smittySprite);

    this.smittySprite.setInteractive({ useHandCursor: true });
    this.smittySprite.on('pointerdown', () => {
        this.activateSmitomTalk();
    });
  }

public activateSmitomTalk(initialTalk: boolean = false): void {
  this.scene.getRandomSmittySound(undefined, true);
        const dialogueKey = getSmitomDialogue(this.scene);
        this.scene.unshiftPhase(new CustomDialoguePhase(
            this.scene,
            "pkmn__glitch__smitom",
            dialogueKey,
            "Smitom",
            () => {
                if(initialTalk == true || this.scene.gameData.isSmitomRewardTime()) {
                    this.scene.pushPhase(new ModifierRewardPhase(
                        this.scene, null, true
                    ));
                    if(initialTalk == false) {
                        this.scene.gameData.updateSmitomRewardTime();
                    }
                }
                this.scene.gameData.localSaveAll(this.scene);
                this.scene.pushPhase(new TitlePhase(this.scene)) }
        ));
        this.scene.shiftPhase();
}

private setupExclamationWindow(x: number, y: number): void {
    this.scene.time.addEvent({
        delay: 0,
        callback: () => {
            const smitomWidth = this.smittySprite.displayWidth;
            const smitomHeight = this.smittySprite.displayHeight;
            
            const relativeX = this.smittySprite.x;  
            const relativeY = this.smittySprite.y - smitomHeight - 4;  
            
            this.exclamationWindow = this.scene.add.container(relativeX, relativeY);
            
            const exclamationSprite = this.scene.add.sprite(0, 0, 'smitems_192', 'exclamationMark');
            exclamationSprite.setScale(0.085); 
            exclamationSprite.setOrigin(0.5, 0.5); 
            
            this.exclamationWindow.add(exclamationSprite);
            
            this.titleContainer.add(this.exclamationWindow);
            
            this.scene.tweens.add({
                targets: this.exclamationWindow,
                y: relativeY - 2, 
                duration: 2500,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });

            exclamationSprite.on('error', () => {
                console.error('[TitleUiHandler] Failed to load exclamation mark sprite frame. Falling back to text version.');
                exclamationSprite.destroy();
                
                const baseSize = Math.max(smitomWidth, smitomHeight) / 5;
                const windowSize = baseSize * 1.2;
                
                const windowBg = addWindow(
                    this.scene,
                    -windowSize/2,
                    -windowSize/2,
                    windowSize,
                    windowSize,
                    false,
                    false,
                    0,
                    0,
                    WindowVariant.XTHIN
                );
                
                const exclamationText = addTextObject(
                    this.scene,
                    0,
                    -windowSize/12,
                    "!",
                    TextStyle.MONEY,
                    { fontSize: `45px` }
                );
                exclamationText.setOrigin(0.5);
                
                this.exclamationWindow.add([windowBg, exclamationText]);
            });
        },
        callbackScope: this
    });
}

  show(args: any[]): boolean {
    const ret = super.show(args);

    if (ret) {
        this.splashMessage = Utils.randItem(getSplashMessages());
        this.splashMessageText.setText(this.splashMessage.replace("{COUNT}", "?"));

        const ui = this.getUi();

        if (this.scene.eventManager.isEventActive()) {
            this.eventDisplay.show();
        }

        this.titleContainer.setAlpha(0);
        this.titleContainer.setVisible(true);

        if (this.optionSelectContainer) {
            let xPos = 85;
            const lang = i18next.resolvedLanguage;
            if (lang === 'en') {
                xPos = 85;
            } else if (lang === 'es' || lang === 'pt-BR') {
                xPos = 105;
            }
            else if (lang === 'it') {
                xPos = 80;
            }
            else if (lang === 'de') {
                xPos = 95;
            }
            else if (lang === 'zh-CN' || lang === 'zh-TW' || lang === 'ja') {
                xPos = 65;
            }
            else if (lang === 'ko') {
                xPos = 75;
            }
            const yPos = -6;
            this.optionSelectContainer.setPosition(xPos, yPos);
            this.optionSelectBg.setVisible(false);
        }

        this.scene.tweens.add({
            targets: [ this.titleContainer, ui.getMessageHandler().bg ],
            duration: Utils.fixedInt(325),
            alpha: (target: any) => target === this.titleContainer ? 1 : 0,
            ease: "Sine.easeInOut",
            onStart: () => {
            },
            onComplete: () => {
            }
        });

        const smitomButton = document.getElementById("apadSmitom");
        if (smitomButton) {
            smitomButton.dataset.activeState = this.scene.gameData.isSmitomRewardTime() ? "true" : "false";
        }

        if (!this.smittySprite) {
            this.loadSmittyTexture()
                .then(() => {
                    this.setupSmittySprite();
                    if(!this.exclamationWindow && this.scene.gameData.isSmitomRewardTime()) {
                        this.setupExclamationWindow(this.smittySprite.x - 60, this.smittySprite.y - 80);
                    }
                })
                .catch(error => {
                    console.error('[TitleUiHandler] Error loading Smitty texture:', error);
                });
        }
        else {
            this.smittySprite.setVisible(true);
            if(!this.exclamationWindow && this.scene.gameData.isSmitomRewardTime()) {
                this.setupExclamationWindow(this.smittySprite.x - 60, this.smittySprite.y - 80);
            }
        }
    }

    return ret;
  }

  clear(): void {
    super.clear();

    const ui = this.getUi();

    this.eventDisplay?.clear();

    this.titleStatsTimer && clearInterval(this.titleStatsTimer);
    this.titleStatsTimer = null;

    this.scene.tweens.add({
        targets: [ this.titleContainer, ui.getMessageHandler().bg ],
        duration: Utils.fixedInt(325),
        alpha: (target: any) => target === this.titleContainer ? 0 : 1,
        ease: "Sine.easeInOut"
    });

    const smitomButton = document.getElementById("apadSmitom");
    if (smitomButton) {
        smitomButton.dataset.activeState = "false";
    }

    if (this.smittySprite) {
        this.smittySprite.destroy();
        this.smittySprite = null;
        this.textureLoaded = false;
    }

    if (this.exclamationWindow) {
        this.exclamationWindow.destroy();
        this.exclamationWindow = null;
    }
  }
}

/**
 * Activates Smitom's dialogue and handles reward logic
 * @param scene - The BattleScene instance
 * @param initialTalk - Whether this is the initial talk with Smitom
 */
export function activateSmitomTalk(scene: BattleScene, initialTalk: boolean = false): void {
  scene.getRandomSmittySound(undefined, true);
  const dialogueKey = getSmitomDialogue(scene);
  scene.unshiftPhase(new CustomDialoguePhase(
    scene,
    "pkmn__glitch__smitom",
    dialogueKey,
    "Smitom",
    () => {
      if(initialTalk == true || scene.gameData.isSmitomRewardTime()) {
        scene.pushPhase(new ModifierRewardPhase(
          scene, null, true
        ));
        if(initialTalk == false) {
          scene.gameData.updateSmitomRewardTime();
        }
      }
      scene.gameData.localSaveAll(scene);
      scene.pushPhase(new TitlePhase(scene));
    }
  ));
  scene.shiftPhase();
}