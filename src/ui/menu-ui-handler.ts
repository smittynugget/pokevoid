import BattleScene, { bypassLogin } from "../battle-scene";
import { TextStyle, addTextObject, getTextStyleOptions } from "./text";
import { Mode } from "./ui";
import * as Utils from "../utils";
import { addWindow, WindowVariant } from "./ui-theme";
import MessageUiHandler from "./message-ui-handler";
import { OptionSelectConfig, OptionSelectItem } from "./abstact-option-select-ui-handler";
import { Tutorial, handleTutorial } from "../tutorial";
import { loggedInUser, updateUserInfo, transferSave, transferLoad } from "../account";
import i18next from "i18next";
import { Button } from "#enums/buttons";
import { GameDataType } from "#enums/game-data-type";
import BgmBar from "#app/ui/bgm-bar";
import AwaitableUiHandler from "./awaitable-ui-handler";
import { SelectModifierPhase } from "#app/phases/select-modifier-phase";
import { TutorialService } from "#app/ui/tutorial-service";
import { PermaQuestModifier, PermaRunQuestModifier, PersistentModifier, PermaPartyAbilityModifier } from "../modifier/modifier";
import { TitlePhase } from "../phases/title-phase";

import {signOut} from "firebase/auth";
import {auth, db} from "#app/server/firebase";
import {doc, updateDoc} from "firebase/firestore";

enum MenuOptions {
  GAME_SETTINGS,
  ACHIEVEMENTS,
  STATS,
  RUN_HISTORY,
  EGG_LIST,
  EGG_GACHA,
  MANAGE_DATA,
  COMMUNITY,
  TUTORIAL,
  SAVE_AND_QUIT,
}

let socialUrl = "https://www.tiktok.com/@smittynugget";
const discordUrl = "https://discord.gg/xsQummMK3H";

export default class MenuUiHandler extends MessageUiHandler {
  private readonly textPadding = 8;
  private readonly defaultMessageBoxWidth = 220;
  private readonly defaultWordWrapWidth = 1224;

  private menuContainer: Phaser.GameObjects.Container;
  private menuMessageBoxContainer: Phaser.GameObjects.Container;
  private menuOverlay: Phaser.GameObjects.Rectangle;

  private menuBg: Phaser.GameObjects.NineSlice;
  protected optionSelectText: Phaser.GameObjects.Text;

  private cursorObj: Phaser.GameObjects.Image | null;

  private excludedMenus: () => ConditionalMenu[];
  private menuOptions: MenuOptions[];

  protected manageDataConfig: OptionSelectConfig;
  protected communityConfig: OptionSelectConfig;

  // Windows for the default message box and the message box for testing dialogue
  private menuMessageBox: Phaser.GameObjects.NineSlice;
  private dialogueMessageBox: Phaser.GameObjects.NineSlice;

  protected scale: number = 0.1666666667;

  public bgmBar: BgmBar;

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);

    this.excludedMenus = () => [
      { condition: [Mode.COMMAND, Mode.TITLE].includes(mode ?? Mode.TITLE), options: [MenuOptions.EGG_GACHA, MenuOptions.EGG_LIST] },
      { condition: bypassLogin, options: [MenuOptions.LOG_OUT] }
    ];

    this.menuOptions = Utils.getEnumKeys(MenuOptions)
      .map(m => parseInt(MenuOptions[m]) as MenuOptions)
      .filter(m => {
        return !this.excludedMenus().some(exclusion => exclusion.condition && exclusion.options.includes(m));
      });
  }

  setup(): void {
    const ui = this.getUi();
    const lang = i18next.resolvedLanguage?.substring(0, 2)!; // TODO: is this bang correct?

    this.bgmBar = new BgmBar(this.scene);
    this.bgmBar.setup();

    ui.bgmBar = this.bgmBar;

    this.menuContainer = this.scene.add.container(1, -(this.scene.game.canvas.height / 6) + 1);
    this.menuContainer.setName("menu");
    this.menuContainer.setInteractive(new Phaser.Geom.Rectangle(0, 0, this.scene.game.canvas.width / 6, this.scene.game.canvas.height / 6), Phaser.Geom.Rectangle.Contains);

    this.menuOverlay = new Phaser.GameObjects.Rectangle(this.scene, -1, -1, this.scene.scaledCanvas.width, this.scene.scaledCanvas.height, 0xffffff, 0.3);
    this.menuOverlay.setName("menu-overlay");
    this.menuOverlay.setOrigin(0, 0);
    this.menuContainer.add(this.menuOverlay);

    this.menuContainer.add(this.bgmBar);

    this.menuContainer.setVisible(false);

  }


  render() {
    const ui = this.getUi();
    this.excludedMenus = () => [
      { condition: this.scene.getCurrentPhase() instanceof SelectModifierPhase, options: [MenuOptions.EGG_GACHA, MenuOptions.EGG_LIST] },
      { condition: bypassLogin, options: [MenuOptions.LOG_OUT] }
    ];

    this.menuOptions = Utils.getEnumKeys(MenuOptions)
      .map(m => parseInt(MenuOptions[m]) as MenuOptions)
      .filter(m => {
        return !this.excludedMenus().some(exclusion => exclusion.condition && exclusion.options.includes(m));
      });

    this.optionSelectText = addTextObject(
        this.scene,
        0,
        0,
        this.menuOptions.map(o => this.getMenuOptionText(o)).join("\n"),
        TextStyle.WINDOW,
        { maxLines: this.menuOptions.length }
    );
    this.optionSelectText.setLineSpacing(12);

    this.scale = getTextStyleOptions(TextStyle.WINDOW, (this.scene as BattleScene).uiTheme).scale;
    this.menuBg = addWindow(this.scene,
      (this.scene.game.canvas.width / 6) - (this.optionSelectText.displayWidth + 25),
      0,
      this.optionSelectText.displayWidth + 19 + 24 * this.scale,
      (this.scene.game.canvas.height / 6) - 2
    );
    this.menuBg.setOrigin(0, 0);

    this.optionSelectText.setPositionRelative(this.menuBg, 10 + 24 * this.scale, 6);

    this.menuContainer.add(this.menuBg);

    this.menuContainer.add(this.optionSelectText);

    ui.add(this.menuContainer);

    this.menuMessageBoxContainer = this.scene.add.container(0, 130);
    this.menuMessageBoxContainer.setName("menu-message-box");
    this.menuMessageBoxContainer.setVisible(false);

    // Window for general messages
    this.menuMessageBox = addWindow(this.scene, 0, 0, this.defaultMessageBoxWidth, 48);
    this.menuMessageBox.setOrigin(0, 0);
    this.menuMessageBoxContainer.add(this.menuMessageBox);

    // Full-width window used for testing dialog messages in debug mode
    this.dialogueMessageBox = addWindow(this.scene, -this.textPadding, 0, this.scene.game.canvas.width / 6 + this.textPadding * 2, 49, false, false, 0, 0, WindowVariant.THIN);
    this.dialogueMessageBox.setOrigin(0, 0);
    this.menuMessageBoxContainer.add(this.dialogueMessageBox);

    const menuMessageText = addTextObject(this.scene, this.textPadding, this.textPadding, "", TextStyle.WINDOW, { maxLines: 2 });
    menuMessageText.setName("menu-message");
    menuMessageText.setOrigin(0, 0);
    this.menuMessageBoxContainer.add(menuMessageText);

    this.message = menuMessageText;

    // By default we use the general purpose message window
    this.setDialogTestMode(false);

    this.menuContainer.add(this.menuMessageBoxContainer);

    const manageDataOptions: any[] = []; // TODO: proper type

    const confirmSlot = (message: string, slotFilter: (i: integer) => boolean, callback: (i: integer) => void) => {
      ui.revertMode();
      ui.showText(message, null, () => {
        const config: OptionSelectConfig = {
          options: new Array(5).fill(null).map((_, i) => i).filter(slotFilter).map(i => {
            return {
              label: i18next.t("menuUiHandler:slot", {slotNumber: i+1}),
              handler: () => {
                callback(i);
                ui.revertMode();
                ui.showText("", 0);
                return true;
              }
            };
          }).concat([{
            label: i18next.t("menuUiHandler:cancel"),
            handler: () => {
              ui.revertMode();
              ui.showText("", 0);
              return true;
            }
          }]),
          xOffset: 98
        };
        ui.setOverlayMode(Mode.MENU_OPTION_SELECT, config);
      });
    };

    if (Utils.isLocal || Utils.isBeta || true) {
      manageDataOptions.push({
        label: i18next.t("menuUiHandler:importData"),
        handler: () => {
          ui.revertMode();
          
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
          console.log("Import Data clicked, isIOS:", isIOS);
          
          if (isIOS) {
            console.log("Setting mode to IMPORT_DATA_FORM for iOS");
            ui.setMode(Mode.IMPORT_DATA_FORM, GameDataType.COMBINED);
          } else {
            console.log("Using traditional import method");
            this.scene.gameData.importData(GameDataType.COMBINED);
          }
          
          return true;
        },
        keepOpen: true
      });
    }
    
    
    
    manageDataOptions.push(
        {
          label: i18next.t("menuUiHandler:exportData"),
          handler: () => {
            this.scene.gameData.tryExportData(GameDataType.COMBINED);
            return true;
          },
          keepOpen: true
        });
    manageDataOptions.push({
      label: i18next.t("menuUiHandler:removePermaItems", { defaultValue: "Remove ∞ITEMS" }),
      handler: () => {
        ui.revertMode();
        
        const allModifiers = this.scene.gameData.permaModifiers.getModifiers();
        
        const nonQuestModifiers = allModifiers.filter(m => 
          !(m instanceof PermaQuestModifier || m instanceof PermaRunQuestModifier)
        );
        
        if (nonQuestModifiers.length === 0) {
          ui.showText(i18next.t("menuUiHandler:noPermaItems", { defaultValue: "No ∞ITEMS to remove." }), null, () => ui.showText(""), Utils.fixedInt(1500));
          return true;
        }
        
        const permaModifierOptions = nonQuestModifiers.map(modifier => {
          return {
            label:  modifier instanceof PermaPartyAbilityModifier ? modifier.type.name + ": " + modifier.ability.name : modifier.type.name,
            handler: () => {
              ui.setOverlayMode(Mode.CONFIRM, 
                () => {
                  this.scene.gameData.permaModifiers.removeModifier(modifier, false, this.scene);
                  this.scene.gameData.saveAll(this.scene, true);
                  
                  this.scene.ui.updatePermaModifierBar(this.scene.gameData.permaModifiers);
                  
                  ui.revertMode();
                  
                  setTimeout(() => {
                    ui.revertMode();
                    
                    setTimeout(() => {
                      ui.revertMode();
                    }, 50);
                  }, 50);
                  
                  return true;
                }, 
                () => {
                  ui.revertMode();
                  return true;
                },
                false,
                -98,
                32,
                500
              );
              return true;
            },
            keepOpen: true
          };
        });
        
        permaModifierOptions.push({
          label: i18next.t("menuUiHandler:cancel"),
          handler: () => {
            ui.revertMode();
            return true;
          },
          keepOpen: true
        });
        
        ui.setOverlayMode(Mode.MENU_OPTION_SELECT, {
          xOffset: -1,
          options: permaModifierOptions,
          maxOptions: 10,
          isRemoveItemsMenu: true
        });
        
        return true;
      },
      keepOpen: true
    });
    manageDataOptions.push({
          label: i18next.t("menuUiHandler:cancel"),
          handler: () => {
            this.scene.ui.revertMode();
            return true;
      },
      keepOpen: true
    });

    //Thank you Vassiat
    this.manageDataConfig = {
      xOffset: 98,
      options: manageDataOptions,
      maxOptions: 7
    };

    const communityOptions: OptionSelectItem[] = [
      {
        label: "Tiktok",
        handler: () => {
          window.open(socialUrl, "_blank")?.focus();
          return true;
        },
        keepOpen: true
      },
      {
        label: "Discord",
        handler: () => {
          window.open(discordUrl, "_blank")?.focus();
          return true;
        },
        keepOpen: true
      },
      ];
    if (!bypassLogin && loggedInUser?.hasAdminRole) {
      communityOptions.push({
        label: "Admin",
        handler: () => {
          ui.playSelect();
          ui.setOverlayMode(Mode.ADMIN, {
            buttonActions: [
              () => {
                ui.revertMode();
      },
              () => {
                ui.revertMode();
              }
            ]
          });
          return true;
        },
        keepOpen: true
      });
    }
    communityOptions.push({
        label: i18next.t("menuUiHandler:cancel"),
        handler: () => {
          this.scene.ui.revertMode();
          return true;
        }
    });
    this.communityConfig = {
      xOffset: 98,
      options: communityOptions
    };

    this.setCursor(0);
  }

  show(args: any[]): boolean {
    this.render();
    super.show(args);

    this.menuOptions = Utils.getEnumKeys(MenuOptions)
      .map(m => parseInt(MenuOptions[m]) as MenuOptions)
      .filter(m => {
        return !this.excludedMenus().some(exclusion => exclusion.condition && exclusion.options.includes(m));
      });

    this.menuContainer.setVisible(true);
    this.setCursor(0);

    this.getUi().moveTo(this.menuContainer, this.getUi().length - 1);

    this.getUi().hideTooltip();

    this.scene.playSound("ui/menu_open");

    handleTutorial(this.scene, Tutorial.Menu);

    this.bgmBar.toggleBgmBar(true);


    return true;
  }

  processInput(button: Button): boolean {
    const ui = this.getUi();

    let success = false;
    let error = false;

    if (button === Button.ACTION) {
      let adjustedCursor = this.cursor;
      const excludedMenu = this.excludedMenus().find(e => e.condition);
      if (excludedMenu !== undefined && excludedMenu.options !== undefined && excludedMenu.options.length > 0) {
        const sortedOptions = excludedMenu.options.sort();
        for (const imo of sortedOptions) {
          if (adjustedCursor >= imo) {
            adjustedCursor++;
          } else {
            break;
          }
        }
      }
      switch (adjustedCursor) {
        case MenuOptions.GAME_SETTINGS:
          ui.setOverlayMode(Mode.SETTINGS);
          success = true;
          break;
        case MenuOptions.ACHIEVEMENTS:
          ui.setOverlayMode(Mode.ACHIEVEMENTS);
          success = true;
          break;
        case MenuOptions.STATS:
          ui.setOverlayMode(Mode.GAME_STATS);
          success = true;
          break;
      case MenuOptions.RUN_HISTORY:
        ui.setOverlayMode(Mode.RUN_HISTORY);
          success = true;
          break;
        case MenuOptions.EGG_LIST:
          if (this.scene.gameData.eggs.length) {
            ui.revertMode();
            ui.setOverlayMode(Mode.EGG_LIST);
            success = true;
          } else {
          ui.showText(i18next.t("menuUiHandler:noEggs"), null, () => ui.showText(""), Utils.fixedInt(1500));
            error = true;
          }
          break;
        case MenuOptions.EGG_GACHA:
          ui.revertMode();
          ui.setOverlayMode(Mode.EGG_GACHA);
          success = true;
          break;
        case MenuOptions.MANAGE_DATA:
          ui.setOverlayMode(Mode.MENU_OPTION_SELECT, this.manageDataConfig);
          success = true;
          break;
        case MenuOptions.COMMUNITY:
          ui.setOverlayMode(Mode.MENU_OPTION_SELECT, this.communityConfig);
          success = true;
          break;
        case MenuOptions.TUTORIAL:
          const tutorialService = new TutorialService(this.scene);
          tutorialService.showTutorialsByCategory('all', true);
          success = true;
          break;
        case MenuOptions.SAVE_AND_QUIT:
          if (this.scene.currentBattle) {
            success = true;
            if (this.scene.currentBattle.turn > 1) {
              ui.showText(i18next.t("menuUiHandler:losingProgressionWarning"), null, () => {
                ui.setOverlayMode(Mode.CONFIRM, () => this.scene.gameData.saveAll(this.scene, true, true, true, true).then(() => this.scene.reset(true)), () => {
                  ui.revertMode();
                ui.showText("", 0);
                }, false, -98);
              });
            } else {
              this.scene.gameData.saveAll(this.scene, true, true, true, true).then(() => this.scene.reset(true));
            }
          } else {
            error = true;
          }
          break;
      }
    } else if (button === Button.CANCEL) {
      success = true;
      ui.revertMode().then(result => {
        if (!result) {
          ui.setMode(Mode.MESSAGE);
        }
      });
    } else {
      switch (button) {
        case Button.UP:
          if (this.cursor) {
            success = this.setCursor(this.cursor - 1);
          } else {
            success = this.setCursor(this.menuOptions.length - 1);
          }
          break;
        case Button.DOWN:
          if (this.cursor + 1 < this.menuOptions.length) {
            success = this.setCursor(this.cursor + 1);
          } else {
            success = this.setCursor(0);
          }
          break;
      }
    }

    if (success) {
      ui.playSelect();
    } else if (error) {
      ui.playError();
    }

    return success || error;
  }

  /**
   * Switch the message window style and size when we are replaying dialog for debug purposes
   * In "dialog test mode", the window takes the whole width of the screen and the text
   * is set up to wrap around the same way as the dialogue during the game
   * @param isDialogMode whether to use the dialog test
   */
  setDialogTestMode(isDialogMode: boolean) {
    this.menuMessageBox.setVisible(!isDialogMode);
    this.dialogueMessageBox.setVisible(isDialogMode);
    // If we're testing dialog, we use the same word wrapping as the battle message handler
    this.message.setWordWrapWidth(isDialogMode ? this.scene.ui.getMessageHandler().wordWrapWidth : this.defaultWordWrapWidth);
    this.message.setX(isDialogMode ? this.textPadding + 1 : this.textPadding);
    this.message.setY(isDialogMode ? this.textPadding + 0.4 : this.textPadding);
  }

  showText(text: string, delay?: number, callback?: Function, callbackDelay?: number, prompt?: boolean, promptDelay?: number): void {
    this.menuMessageBoxContainer.setVisible(!!text);

    super.showText(text, delay, callback, callbackDelay, prompt, promptDelay);
  }

  setCursor(cursor: integer): boolean {
    const ret = super.setCursor(cursor);

    if (!this.cursorObj) {
      this.cursorObj = this.scene.add.image(0, 0, "cursor");
      this.cursorObj.setOrigin(0, 0);
      this.menuContainer.add(this.cursorObj);
    }

    this.cursorObj.setScale(this.scale * 6);
    this.cursorObj.setPositionRelative(this.menuBg, 7, 6 + (18 + this.cursor * 96) * this.scale);

    return ret;
  }

  clear() {
    super.clear();
    this.menuContainer.setVisible(false);
    this.bgmBar.toggleBgmBar(false);
    this.eraseCursor();
  }

  eraseCursor() {
    if (this.cursorObj) {
      this.cursorObj.destroy();
    }
    this.cursorObj = null;
  }

  private getMenuOptionText(option: MenuOptions): string {
    if (option === MenuOptions.TUTORIAL) {
      return i18next.t('settings:tutorials');
    }
    return i18next.t(`menuUiHandler:${MenuOptions[option]}`);
  }

  private showCustomDialog(title: string, callback: (username: string, password: string) => void): void {
    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.left = '50%';
    dialog.style.top = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.backgroundColor = 'white';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '5px';
    dialog.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    dialog.style.zIndex = '1000';

    const titleElement = document.createElement('h2');
    titleElement.textContent = title;
    dialog.appendChild(titleElement);

    const usernameLabel = document.createElement('label');
    usernameLabel.textContent = i18next.t("menu:transferDialog.username");
    usernameLabel.style.display = 'block';
    usernameLabel.style.marginTop = '10px';
    dialog.appendChild(usernameLabel);

    const usernameInput = document.createElement('input');
    usernameInput.type = 'text';
    usernameInput.style.display = 'block';
    usernameInput.style.margin = '5px 0';
    usernameInput.style.padding = '5px';
    usernameInput.style.width = '200px';
    dialog.appendChild(usernameInput);

    const passwordLabel = document.createElement('label');
    passwordLabel.textContent = i18next.t("menu:transferDialog.password");
    passwordLabel.style.display = 'block';
    passwordLabel.style.marginTop = '10px';
    dialog.appendChild(passwordLabel);

    const passwordInput = document.createElement('input');
    passwordInput.type = 'password';
    passwordInput.style.display = 'block';
    passwordInput.style.margin = '5px 0';
    passwordInput.style.padding = '5px';
    passwordInput.style.width = '200px';
    dialog.appendChild(passwordInput);

    const captchaLabel = document.createElement('label');
    captchaLabel.textContent = i18next.t("menu:captcha.label");
    captchaLabel.style.display = 'block';
    captchaLabel.style.marginTop = '15px';
    dialog.appendChild(captchaLabel);

    const captchaContainer = document.createElement('div');
    captchaContainer.style.marginBottom = '10px';
    dialog.appendChild(captchaContainer);

    const generateCaptchaText = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        const length = 6 + Math.floor(Math.random() * 2);
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    let captchaText = generateCaptchaText();
    
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 60;
    const ctx = canvas.getContext('2d')!;

    const drawCaptcha = () => {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        for (let i = 0; i < 20; i++) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.1)`;
            ctx.lineWidth = 1 + Math.random() * 2;
            ctx.bezierCurveTo(
                Math.random() * canvas.width, Math.random() * canvas.height,
                Math.random() * canvas.width, Math.random() * canvas.height,
                Math.random() * canvas.width, Math.random() * canvas.height
            );
            ctx.stroke();
        }

        for (let i = 0; i < captchaText.length; i++) {
            ctx.save();
            const x = 25 + i * (20 + Math.random() * 10);
            const y = 35 + Math.sin(i * 0.5) * 5;
            ctx.translate(x, y);
            ctx.rotate((Math.random() - 0.5) * 0.5);
            const fonts = ['Arial', 'Verdana', 'Times New Roman', 'Courier'];
            const fontSize = 25 + Math.random() * 10;
            const fontStyle = Math.random() > 0.5 ? 'bold' : 'normal';
            ctx.font = `${fontStyle} ${fontSize}px ${fonts[Math.floor(Math.random() * fonts.length)]}`;
            const hue = Math.random() * 360;
            ctx.fillStyle = `hsl(${hue}, 50%, 30%)`;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetX = 2;
            ctx.shadowOffsetY = 2;
            ctx.fillText(captchaText[i], 0, 0);
            ctx.restore();
        }

        for (let i = 0; i < 100; i++) {
            ctx.fillStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;
            ctx.fillRect(
                Math.random() * canvas.width,
                Math.random() * canvas.height,
                Math.random() * 3,
                Math.random() * 3
            );
        }

        for (let i = 0; i < 8; i++) {
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255},0.5)`;
            ctx.lineWidth = 0.5 + Math.random();
            ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
            ctx.bezierCurveTo(
                Math.random() * canvas.width, Math.random() * canvas.height,
                Math.random() * canvas.width, Math.random() * canvas.height,
                Math.random() * canvas.width, Math.random() * canvas.height
            );
            ctx.stroke();
        }
    };

    drawCaptcha();
    captchaContainer.appendChild(canvas);

    const captchaInput = document.createElement('input');
    captchaInput.type = 'text';
    captchaInput.style.display = 'block';
    captchaInput.style.margin = '5px 0';
    captchaInput.style.padding = '5px';
    captchaInput.style.width = '200px';
    captchaInput.placeholder = i18next.t("menu:captcha.placeholder");
    dialog.appendChild(captchaInput);

    const refreshButton = document.createElement('button');
    refreshButton.textContent = i18next.t("menu:captcha.refresh");
    refreshButton.style.marginTop = '5px';
    refreshButton.style.marginBottom = '10px';
    refreshButton.onclick = () => {
        captchaText = generateCaptchaText();
        drawCaptcha();
        captchaInput.value = '';
    };
    dialog.appendChild(refreshButton);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'space-between';
    buttonContainer.style.marginTop = '15px';
    buttonContainer.style.gap = '10px';

    const submitButton = document.createElement('button');
    submitButton.textContent = i18next.t("menu:transferDialog.submit");
    submitButton.style.flex = '1';
    submitButton.style.padding = '8px';
    submitButton.onclick = () => {
        if (captchaInput.value.toUpperCase() === captchaText) {
            callback(usernameInput.value, passwordInput.value);
            document.body.removeChild(dialog);
        } else {
            alert(i18next.t("menu:captcha.incorrect"));
            captchaText = generateCaptchaText();
            drawCaptcha();
            captchaInput.value = '';
        }
    };

    const cancelButton = document.createElement('button');
    cancelButton.textContent = i18next.t("menu:cancel");
    cancelButton.style.flex = '1';
    cancelButton.style.padding = '8px';
    cancelButton.onclick = () => {
        document.body.removeChild(dialog);
        this.scene.ui.revertMode();
        this.scene.ui.showText("", 0);
    };

    buttonContainer.appendChild(submitButton);
    buttonContainer.appendChild(cancelButton);
    dialog.appendChild(buttonContainer);

    document.body.appendChild(dialog);
    setTimeout(() => usernameInput.focus(), 0);

    const handleKeyPress = (event: KeyboardEvent) => {
        if (event.key === 'Enter') {
            submitButton.click();
        } else if (event.key === 'Escape') {
            cancelButton.click();
        }
    };
    
    dialog.addEventListener('keydown', handleKeyPress);
    
    const cleanup = () => {
        dialog.removeEventListener('keydown', handleKeyPress);
    };
    
    const originalSubmitClick = submitButton.onclick;
    submitButton.onclick = () => {
        cleanup();
        if (originalSubmitClick) originalSubmitClick.call(submitButton);
    };
    
    const originalCancelClick = cancelButton.onclick;
    cancelButton.onclick = () => {
        cleanup();
        if (originalCancelClick) originalCancelClick.call(cancelButton);
    };
  }

  private async promptTransferSave(): Promise<void> {
    await new Promise<void>(resolve => {
        this.showCustomDialog(i18next.t("menu:transferDialog.saveTitle"), async (username, password) => {
            if (username && password) {
                const systemData = this.scene.gameData.getSystemSaveData();
                const sessionData = [];
                for (let slotId = 0; slotId < 5; slotId++) {
                    const slotData = this.scene.gameData.getSessionSavedData(this.scene, slotId);
                    if (slotData) {
                        sessionData.push(slotData);
                    }
                }

                const fakeEmail = username + '@smittynugget.com';
                const result = await transferSave(fakeEmail, password, systemData, sessionData);
                this.scene.ui.setMode(Mode.MESSAGE);

                if (result.success) {
                    this.scene.ui.showText(i18next.t("menu:transferSaveSuccess"), null, () => {
                        this.scene.ui.showText(null, 0);
                        resolve();
                    }, null, true);
                } else {
                    this.scene.ui.showText(i18next.t("menu:transferSaveFailed", { error: result.error }), null, () => {
                        this.scene.ui.showText(null, 0);
                        resolve();
                    }, null, true);
                }
            } else {
                this.scene.ui.showText(i18next.t("menu:transferCredentialsRequired"), null, () => {
                    this.scene.ui.showText(null, 0);
                    resolve();
                }, null, true);
            }
        });
    });
  }

  private async promptTransferLoad(): Promise<void> {
    await new Promise<void>(resolve => {
        this.showCustomDialog(i18next.t("menu:transferDialog.loadTitle"), async (username, password) => {
            if (username && password) {
                const fakeEmail = username + '@smittynugget.com';
                const result = await transferLoad(fakeEmail, password);
                this.scene.ui.setMode(Mode.MESSAGE);
                if (result.success && result.data) {
                    const {systemData, sessionData} = result.data;
                    const loadSuccess = await this.scene.gameData.initSystem(systemData, sessionData);
                    if (loadSuccess) {
                        this.scene.ui.showText(i18next.t("menu:transferLoadSuccess"), null, () => {
                            this.scene.ui.showText(null, 0, () => {
                                window.location = window.location;
                            });
                        }, null, true);
                    } else {
                        this.scene.ui.showText(i18next.t("menu:transferDataInitError"), null, () => {
                            this.scene.ui.showText(null, 0);
                            resolve();
                        }, null, true);
                    }
                } else {
                    this.scene.ui.showText(i18next.t("menu:transferLoadFailed", { error: result.error }), null, () => {
                        this.scene.ui.showText(null, 0);
                        resolve();
                    }, null, true);
                }
            } else {
                this.scene.ui.showText(i18next.t("menu:transferCredentialsRequired"), null, () => {
                    this.scene.ui.showText(null, 0);
                    resolve();
                }, null, true);
            }
            resolve();
        });
    });
  }

  private showTransferOptions(): void {
    const transferOptions: OptionSelectItem[] = [
        {
            label: i18next.t("menu:transferSave"),
            handler: () => {
                this.promptTransferSave();
                return true;
            }
        },
        {
            label: i18next.t("menu:transferLoad"),
            handler: () => {
                this.promptTransferLoad();
                return true;
            }
        },
        {
            label: i18next.t("menu:cancel"),
            handler: () => {
                this.scene.ui.revertMode();
                return true;
            }
        }
    ];
    this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, {options: transferOptions});
  }
}

interface ConditionalMenu {
  condition: boolean;
  options: MenuOptions[];
}
