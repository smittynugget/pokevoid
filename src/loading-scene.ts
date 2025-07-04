import { GachaType } from "./enums/gacha-types";
import { trainerConfigs } from "./data/trainer-config";
import { getBiomeHasProps } from "./field/arena";
import CacheBustedLoaderPlugin from "./plugins/cache-busted-loader-plugin";
import { SceneBase } from "./scene-base";
import { WindowVariant, getWindowVariantSuffix } from "./ui/ui-theme";
import { isMobile } from "./touch-controls";
import EmbeddedAtlasFile, * as Utils from "./utils";
import { initI18n } from "./plugins/i18n";
import {initPokemonPrevolutions} from "#app/data/pokemon-evolutions";
import {initBiomes} from "#app/data/biomes";
import {initEggMoves} from "#app/data/egg-moves";
import {initPokemonForms, initSmittyForms} from "#app/data/pokemon-forms";
import {initSpecies} from "#app/data/pokemon-species";
import {initMoves} from "#app/data/move";
import {initMoveRegistry} from "#app/data/move-registry";
import {initAbilities} from "#app/data/ability";
import {initAchievements} from "#app/system/achv";
import {initTrainerTypeDialogue} from "#app/data/dialogue";
import { initChallenges } from "./data/challenge";
import i18next from "i18next";
import { initStatsKeys } from "./ui/game-stats-ui-handler";
import { initVouchers } from "./system/voucher";
import { Biome } from "#enums/biome";
import { TrainerType } from "#enums/trainer-type";
import { modStorage } from "./system/mod-storage";
import { loadModGlitchFormFromJson } from "./data/mod-glitch-form-utils";
import { loadAndStoreMod } from "./data/mod-glitch-form-utils";

export class LoadingScene extends SceneBase {
  public static readonly KEY = "loading";

  readonly LOAD_EVENTS = Phaser.Loader.Events;

  private userInteracted: boolean = false;

  private loadingGraphics: any[] = [];

  constructor() {
    super(LoadingScene.KEY);

    Phaser.Plugins.PluginCache.register("Loader", CacheBustedLoaderPlugin, "load");
    Phaser.Loader.FileTypesManager.register('embeddedAtlas', function(key, url, xhrSettings) {
     this.addFile(new EmbeddedAtlasFile(this, key, url, xhrSettings));
   });
    initI18n();

  }

  preload() {
    Utils.localPing();

    this.loadSe("logoSmittyNugget", "voice", "intro_smitty_nugget.mp3");
    this.loadImage("loading_bg", "arenas");
    this.loadImage("logo", "");
    this.loadImage("smittyLogo", "smitty_logos", `${Math.floor(Math.random() * 134)}.png`);
    this.loadImage("title_bg", "");

    this.loadAtlas("bg", "ui");
    this.loadAtlas("prompt", "ui");
    this.loadImage("candy", "ui");
    this.loadImage("candy_overlay", "ui");
    this.loadImage("cursor", "ui");
    this.loadImage("cursor_reverse", "ui");
    for (const wv of Utils.getEnumValues(WindowVariant)) {
      for (let w = 1; w <= 5; w++) {
        this.loadImage(`window_${w}${getWindowVariantSuffix(wv)}`, "ui/windows");
      }
    }
    this.loadAtlas("namebox", "ui");
    this.loadImage("pbinfo_player", "ui");
    this.loadImage("pbinfo_player_stats", "ui");
    this.loadImage("pbinfo_player_mini", "ui");
    this.loadImage("pbinfo_player_mini_stats", "ui");
    this.loadAtlas("pbinfo_player_type", "ui");
    this.loadAtlas("pbinfo_player_type1", "ui");
    this.loadAtlas("pbinfo_player_type2", "ui");
    this.loadImage("pbinfo_enemy_mini", "ui");
    this.loadImage("pbinfo_enemy_mini_stats", "ui");
    this.loadImage("pbinfo_enemy_boss", "ui");
    this.loadImage("pbinfo_enemy_boss_stats", "ui");
    this.loadAtlas("pbinfo_enemy_type", "ui");
    this.loadAtlas("pbinfo_enemy_type1", "ui");
    this.loadAtlas("pbinfo_enemy_type2", "ui");
    this.loadAtlas("pbinfo_stat", "ui");
    this.loadAtlas("pbinfo_stat_numbers", "ui");
    this.loadImage("overlay_lv", "ui");
    this.loadAtlas("numbers", "ui");
    this.loadAtlas("numbers_red", "ui");
    this.loadAtlas("overlay_hp", "ui");
    this.loadAtlas("overlay_hp_boss", "ui");
    this.loadImage("overlay_exp", "ui");
    this.loadImage("icon_owned", "ui");
    this.loadImage("ability_bar_left", "ui");
    this.loadImage("bgm_bar", "ui");
    this.loadImage("party_exp_bar", "ui");
    this.loadImage("achv_bar", "ui");
    this.loadImage("achv_bar_2", "ui");
    this.loadImage("achv_bar_3", "ui");
    this.loadImage("achv_bar_4", "ui");
    this.loadImage("achv_bar_5", "ui");
    this.loadImage("shiny_star", "ui", "shiny.png");
    this.loadImage("shiny_star_1", "ui", "shiny_1.png");
    this.loadImage("shiny_star_2", "ui", "shiny_2.png");
    this.loadImage("shiny_star_small", "ui", "shiny_small.png");
    this.loadImage("shiny_star_small_1", "ui", "shiny_small_1.png");
    this.loadImage("shiny_star_small_2", "ui", "shiny_small_2.png");
    this.loadImage("favorite", "ui", "favorite.png");
    this.loadImage("passive_bg", "ui", "passive_bg.png");
    this.loadAtlas("shiny_icons", "ui");
    this.loadImage("ha_capsule", "ui", "ha_capsule.png");
    this.loadImage("champion_ribbon", "ui", "champion_ribbon.png");
    this.loadImage("icon_spliced", "ui");
    this.loadImage("icon_tera", "ui");
    this.loadImage("type_tera", "ui");
    this.loadAtlas("type_bgs", "ui");

    this.loadImage("dawn_icon_fg", "ui");
    this.loadImage("dawn_icon_mg", "ui");
    this.loadImage("dawn_icon_bg", "ui");
    this.loadImage("day_icon_fg", "ui");
    this.loadImage("day_icon_mg", "ui");
    this.loadImage("day_icon_bg", "ui");
    this.loadImage("dusk_icon_fg", "ui");
    this.loadImage("dusk_icon_mg", "ui");
    this.loadImage("dusk_icon_bg", "ui");
    this.loadImage("night_icon_fg", "ui");
    this.loadImage("night_icon_mg", "ui");
    this.loadImage("night_icon_bg", "ui");

    this.loadImage("pb_tray_overlay_player", "ui");
    this.loadImage("pb_tray_overlay_enemy", "ui");
    this.loadAtlas("pb_tray_ball", "ui");

    this.loadImage("party_bg", "ui");
    this.loadImage("party_bg_double", "ui");
    this.loadAtlas("party_slot_main", "ui");
    this.loadAtlas("party_slot", "ui");
    this.loadImage("party_slot_overlay_lv", "ui");
    this.loadImage("party_slot_hp_bar", "ui");
    this.loadAtlas("party_slot_hp_overlay", "ui");
    this.loadAtlas("party_pb", "ui");
    this.loadAtlas("party_cancel", "ui");

    this.loadImage("summary_bg", "ui");
    this.loadImage("summary_overlay_shiny", "ui");
    this.loadImage("summary_profile", "ui");
    this.loadImage("summary_profile_prompt_z", "ui");      // The pixel Z button prompt
    this.loadImage("summary_profile_prompt_a", "ui");     // The pixel A button prompt
    this.loadImage("summary_profile_ability", "ui");      // Pixel text 'ABILITY'
    this.loadImage("summary_profile_passive", "ui");      // Pixel text 'PASSIVE'
    this.loadImage("summary_status", "ui");
    this.loadImage("summary_stats", "ui");
    this.loadImage("summary_stats_overlay_exp", "ui");
    this.loadImage("summary_moves", "ui");
    this.loadImage("summary_moves_effect", "ui");
    this.loadImage("summary_moves_overlay_row", "ui");
    this.loadImage("summary_moves_overlay_pp", "ui");
    this.loadAtlas("summary_moves_cursor", "ui");
    for (let t = 1; t <= 3; t++) {
      this.loadImage(`summary_tabs_${t}`, "ui");
    }

    this.loadImage("scroll_bar", "ui");
    this.loadImage("scroll_bar_handle", "ui");
    this.loadImage("starter_container_bg", "ui");
    this.loadImage("starter_select_bg", "ui");
    this.loadImage("select_cursor", "ui");
    this.loadImage("select_cursor_highlight", "ui");
    this.loadImage("select_cursor_highlight_thick", "ui");
    this.loadImage("select_cursor_pokerus", "ui");
    this.loadImage("select_gen_cursor", "ui");
    this.loadImage("select_gen_cursor_highlight", "ui");

    this.loadImage("saving_icon", "ui");
    this.loadImage("discord", "ui");

    this.loadImage("default_bg", "arenas");
    // Load arena images
    Utils.getEnumValues(Biome).map(bt => {
      const btKey = Biome[bt].toLowerCase();
      const isBaseAnimated = btKey === "end";
      const baseAKey = `${btKey}_a`;
      const baseBKey = `${btKey}_b`;
      this.loadImage(`${btKey}_bg`, "arenas");
      if (!isBaseAnimated) {
        this.loadImage(baseAKey, "arenas");
      } else {
        this.loadAtlas(baseAKey, "arenas");
      }
      if (!isBaseAnimated) {
        this.loadImage(baseBKey, "arenas");
      } else {
        this.loadAtlas(baseBKey, "arenas");
      }
      if (getBiomeHasProps(bt)) {
        for (let p = 1; p <= 3; p++) {
          const isPropAnimated = p === 3 && [ "power_plant", "end" ].find(b => b === btKey);
          const propKey = `${btKey}_b_${p}`;
          if (!isPropAnimated) {
            this.loadImage(propKey, "arenas");
          } else {
            this.loadAtlas(propKey, "arenas");
          }
        }
      }
    });

    this.load.bitmapFont("item-count", "fonts/item-count.png", "fonts/item-count.xml");

    this.loadAtlas("trainer_m_back", "trainer");
    this.loadAtlas("trainer_m_back_pb", "trainer");
    this.loadAtlas("trainer_f_back", "trainer");
    this.loadAtlas("trainer_f_back_pb", "trainer");

    Utils.getEnumValues(TrainerType).map(tt => {
      const config = trainerConfigs[tt];
      try {
        this.loadAtlas(config.getSpriteKey(), "trainer");
      } catch (error) {
        console.error(`Failed to load trainer sprite for TrainerType ${tt}:`, error);
      }
    });


    this.loadImage("pkmn__back__sub", "pokemon/back", "sub.png");
    this.loadImage("pkmn__sub", "pokemon", "sub.png");
    this.loadAtlas("battle_stats", "effects");
    this.loadAtlas("shiny", "effects");
    this.loadAtlas("shiny_2", "effects");
    this.loadAtlas("shiny_3", "effects");
    this.loadImage("tera", "effects");
    this.loadAtlas("pb_particles", "effects");
    this.loadImage("evo_sparkle", "effects");
    this.loadAtlas("tera_sparkle", "effects");
    this.load.video("evo_bg", "images/effects/evo_bg.mp4", true);

    this.loadAtlas("pb", "");
    this.loadAtlas("items", "");
    this.loadAtlas("types", "");

    const lang = i18next.resolvedLanguage;
    if (lang !== "en") {
      if (Utils.verifyLang(lang)) {
        this.loadAtlas(`types_${lang}`, "");
      } else {
        this.loadAtlas("types", "");
      }
    } else {
      this.loadAtlas("types", "");
    }

    this.loadAtlas("statuses", "");
    this.loadAtlas("categories", "");

    this.loadAtlas("egg", "egg");
    this.loadAtlas("egg_crack", "egg");
    this.loadAtlas("egg_icons", "egg");
    this.loadAtlas("egg_shard", "egg");
    this.loadAtlas("egg_lightrays", "egg");
    Utils.getEnumKeys(GachaType).forEach(gt => {
      const key = gt.toLowerCase();
      this.loadImage(`gacha_${key}`, "egg");
      this.loadAtlas(`gacha_underlay_${key}`, "egg");
    });
    this.loadImage("gacha_glass", "egg");
    this.loadImage("gacha_eggs", "egg");
    this.loadAtlas("gacha_hatch", "egg");
    this.loadImage("gacha_knob", "egg");

    this.loadImage("egg_list_bg", "ui");

    for (let i = 0; i < 10; i++) {
      this.loadAtlas(`pokemon_icons_${i}`, "");
      if (i) {
        this.loadAtlas(`pokemon_icons_${i}v`, "");
      }
    }
    this.loadAtlas(`pokemon_icons_glitch`, "");
    this.loadAtlas(`smitty_trainers`, "smittytrainers");

    this.loadAtlas(`smitems_32`, "smitems");
    this.loadAtlas(`smitems_192`, "smitems");
  
    this.loadAtlas("dualshock", "inputs");
    this.loadAtlas("xbox", "inputs");
    this.loadAtlas("keyboard", "inputs");

    this.loadSe("select", "ui");
    this.loadSe("menu_open", "ui");
    this.loadSe("error", "ui");
    this.loadSe("hit");
    this.loadSe("hit_strong");
    this.loadSe("hit_weak");
    this.loadSe("stat_up");
    this.loadSe("stat_down");
    this.loadSe("faint");
    this.loadSe("flee");
    this.loadSe("low_hp");
    this.loadSe("exp");
    this.loadSe("level_up");
    this.loadSe("sparkle");
    this.loadSe("restore");
    this.loadSe("shine");
    this.loadSe("shing");
    this.loadSe("charge");
    this.loadSe("beam");
    this.loadSe("upgrade");
    this.loadSe("buy");
    this.loadSe("achv");

    this.loadSe("pb_rel");
    this.loadSe("pb_throw");
    this.loadSe("pb_bounce_1");
    this.loadSe("pb_bounce_2");
    this.loadSe("pb_move");
    this.loadSe("pb_catch");
    this.loadSe("pb_lock");

    this.loadSe("pb_tray_enter");
    this.loadSe("pb_tray_ball");
    this.loadSe("pb_tray_empty");

    this.loadSe("egg_crack");
    this.loadSe("egg_hatch");
    this.loadSe("gacha_dial");
    this.loadSe("gacha_running");
    this.loadSe("gacha_dispense");

    this.loadSe("PRSFX- Transform", "battle_anims");

    this.loadBgm("menu");

    this.loadSe("hellowelcome", "voice", "hellowelcome.mp3");

    if(!isIPhone()) {
      for (let i = 1; i <= 84; i++) {
        this.loadSe(`smitty_sound_${i}`, "voice", `smitty_sound_${i}.mp3`);
      }
    }

    this.loadBgm("level_up_fanfare", "bw/level_up_fanfare.mp3");
    this.loadBgm("item_fanfare", "bw/item_fanfare.mp3");
    this.loadBgm("minor_fanfare", "bw/minor_fanfare.mp3");
    this.loadBgm("heal", "bw/heal.mp3");
    this.loadBgm("victory_trainer", "bw/victory_trainer.mp3");
    this.loadBgm("victory_team_plasma", "bw/victory_team_plasma.mp3");
    this.loadBgm("victory_gym", "bw/victory_gym.mp3");
    this.loadBgm("victory_champion", "bw/victory_champion.mp3");
    this.loadBgm("evolution", "bw/evolution.mp3");
    this.loadBgm("evolution_fanfare", "bw/evolution_fanfare.mp3");

    this.load.plugin("rextexteditplugin", "https://raw.githubusercontent.com/rexrainbow/phaser3-rex-notes/master/dist/rextexteditplugin.min.js", true);

    this.loadLoadingScreen();

    initAchievements();
    initVouchers();
    initStatsKeys();
    initPokemonPrevolutions();
    initBiomes();
    initEggMoves();
    initPokemonForms();
    initTrainerTypeDialogue();
    initSpecies();
    initSmittyForms();
    initMoves();
    initMoveRegistry();
    initAbilities();
    initChallenges();
  }

  loadLoadingScreen() {
    const mobile = isMobile();

    const loadingGraphics: any[] = [];

    const bg = this.add.image(0, 0, "");
    bg.setOrigin(0, 0);
    bg.setScale(6);
    bg.setVisible(false);

    const graphics = this.add.graphics();

    graphics.lineStyle(4, 0xff00ff, 1).setDepth(10);

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.lineStyle(5, 0xff00ff, 1.0);
    progressBox.fillStyle(0x222222, 0.8);

    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const midWidth = width / 2;
    const midHeight = height / 2;

    const logo = this.add.image(midWidth, 240, "");
    logo.setVisible(false);

    const percentText = this.make.text({
      x: midWidth,
      y: midHeight - 24,
      text: "0%",
      style: {
        font: "72px emerald",
        color: "#ffffff",
      },
    });
    percentText.setOrigin(0.5, 0.5);

    const assetText = this.make.text({
      x: midWidth,
      y: midHeight + 48,
      text: "",
      style: {
        font: "48px emerald",
        color: "#ffffff",
      },
    });
    assetText.setOrigin(0.5, 0.5);

    const disclaimerText = this.make.text({
      x: midWidth,
      y: assetText.y + 152,
      text: i18next.t("menu:disclaimer"),
      style: {
        font: "72px emerald",
        color: "#DA3838",
      },
    });
    disclaimerText.setOrigin(0.5, 0.5);

    const disclaimerDescriptionText = this.make.text({
      x: midWidth,
      y: disclaimerText.y + 120,
      text: i18next.t("menu:disclaimerDescription"),
      style: {
        font: "48px emerald",
        color: "#ffffff",
        align: "center"
      },
    });
    disclaimerDescriptionText.setOrigin(0.5, 0.5);

    loadingGraphics.push(bg, graphics, progressBar, progressBox, logo, percentText, assetText, disclaimerText, disclaimerDescriptionText);

    loadingGraphics.map(g => g.setVisible(false));
    
    this.loadingGraphics = loadingGraphics;
    this.mainLoadingComplete = false;

    const intro = this.add.video(0, 0);

    const smittyLogo = this.add.image(midWidth, midHeight - 80, "");
    smittyLogo.setScale(2.25);
    smittyLogo.setOrigin(0.5, 0.5);
    smittyLogo.setVisible(false);
    
    let videoCheckHandler: () => void;
    let introSoundPlayed = false;

    videoCheckHandler = () => {
      if(intro.isPlaying()) {
        if(intro.getCurrentTime() >= 4.8 && smittyLogo.visible) {
          this.tweens.add({
            targets: [intro, smittyLogo],
            duration: 200,
            alpha: 0,
            ease: "Sine.easeIn",
            onComplete: () => {
              intro.destroy();
              
              smittyLogo.destroy();
              if (isIPhone() && this.textures.exists('smittyLogo')) {
                this.textures.remove('smittyLogo');
                console.log('[LoadingScene] Removed smittyLogo texture from cache');
              }
              this.events.off("update", videoCheckHandler);
              
              if (this.loadingGraphics) {
                this.loadingGraphics.forEach(g => {
                  if (g && g.scene) {
                    g.setVisible(true); 
                  }
                });
                console.log('[LoadingScene] Showing main loading screen elements');
              }
            },
          });
        }
        else if (intro.getCurrentTime() >= 1.5 && !smittyLogo.visible) {
          smittyLogo.setTexture("smittyLogo");
          smittyLogo.setVisible(true);
        }
        else if(intro.getCurrentTime() >= 1.7 && smittyLogo.visible && !introSoundPlayed) {
          try {
            const soundConfig = {
              loop: false,
              mute: false,
              volume: .2
            };

            if (this.cache.audio.exists('voice/logoSmittyNugget')) {
              this.sound.play('voice/logoSmittyNugget', soundConfig);
              introSoundPlayed = true;
            } else {
              console.warn('logoSmittyNugget sound not found in cache');
            }
          } catch (error) {
            console.error('Failed to play logoSmittyNugget sound:', error);
          }
        }
      }
    };
    this.events.on("update", videoCheckHandler);

    intro.setOrigin(0, 0);
    intro.setScale(3);

    this.load.once(this.LOAD_EVENTS.START, () => {
      intro.loadURL("images/intro_smitty.mp4", true);
      if (mobile) {
        intro.video?.setAttribute("webkit-playsinline", "webkit-playsinline");
        intro.video?.setAttribute("playsinline", "playsinline");
      }
      intro.play();
    });

    this.load.on(this.LOAD_EVENTS.PROGRESS , (progress: number) => {
      try {
        if (percentText && percentText.scene) {
          percentText.setText(`${Math.floor(progress * 100)}%`);
        }
        if (progressBar && progressBar.scene) {
          progressBar.clear();
          progressBar.fillStyle(0xffffff, 0.8);
          progressBar.fillRect(midWidth - 320, 360, 640 * progress, 64);
        }
      } catch (error) {
        console.error("Error updating progress:", error);
      }
    });

    this.load.on(this.LOAD_EVENTS.FILE_COMPLETE, (key: string) => {
      try {
        if (assetText && assetText.scene) {
          assetText.setText(i18next.t("menu:loadingAsset", { assetName: key }));
        }
        switch (key) {
        case "loading_bg":
          if (bg && bg.scene) {
            bg.setTexture("loading_bg");
            if (mobile) {
              bg.setVisible(true);
            }
          }
          break;
        case "logo":
          if (logo && logo.scene) {
            logo.setTexture("logo");
            if (mobile) {
              logo.setVisible(true);
            }
          }
          break;
      }
      } catch (error) {
        console.error("Error handling file complete:", error);
      }
    });

    this.load.on(this.LOAD_EVENTS.COMPLETE, () => {
      this.mainLoadingComplete = true;
      console.log('[LoadingScene] Main loading complete');
      
      this.events.emit('mainLoadingComplete');
    });
  }

  private mainLoadingComplete: boolean = false;

  async create() {
    try {
      if (this.load.isLoading() || !this.mainLoadingComplete) {
        console.log('[LoadingScene] Waiting for main loading to complete...');
        await new Promise<void>(resolve => {
          if (this.mainLoadingComplete) {
            resolve();
          } else {
            this.events.once('mainLoadingComplete', resolve);
          }
        });
      }
     
      let hasMods = false;
      try {
        // await this.loadExampleGlitchMod();
        hasMods = await modStorage.hasMods();
      } catch (storageError) {
        console.error("Error checking for mods:", storageError);
        hasMods = false;
      }
      
      if (this.loadingGraphics && this.loadingGraphics.length > 0) {
        if (hasMods) {
          console.log('[LoadingScene] Fading out loading graphics before loading mods');
          await new Promise<void>(resolve => {
            this.tweens.add({
              targets: this.loadingGraphics,
              alpha: 0,
              duration: 500,
              ease: 'Power2',
              onComplete: () => {
                this.loadingGraphics.forEach(g => {
                  if (g && g.scene) {
                    g.destroy();
                  }
                });
                this.loadingGraphics = [];
                console.log('[LoadingScene] Main loading screen removed');
                resolve();
              }
            });
          });
          
          await new Promise<void>(resolve => {
            this.loadCustomMods().then(() => {
              resolve();
            });
          });
          this.scene.start("battle");
          this.hideModLoadingScreen();
          } else {
          await new Promise(resolve => setTimeout(resolve, 1000));
          this.scene.start("battle");
          console.log('[LoadingScene] No mods found, immediately destroying loading graphics');
          this.loadingGraphics.forEach(g => {
            if (g && g.scene) {
              g.destroy();
            }
          });
          this.loadingGraphics = [];
          console.log('[LoadingScene] Main loading screen removed without fade');
        }
      }
    } catch (error) {
      console.error("Error in create method:", error);
      if (!this.scene.isActive("battle")) {
        this.scene.start("battle");
      }
    }
  }

  handleDestroy() {
    console.debug(`Destroying ${LoadingScene.KEY} scene`);
    this.load.off(this.LOAD_EVENTS.PROGRESS);
    this.load.off(this.LOAD_EVENTS.FILE_COMPLETE);
    this.load.off(this.LOAD_EVENTS.COMPLETE);
    this.children.removeAll(true);
    console.debug(`Destroyed ${LoadingScene.KEY} scene`);
  }

  private async loadCustomMods(): Promise<void> {
    try {
      console.log(i18next.t("menu:loadingModsFromStorage"));
      
      this.createModLoadingScreen();
      
      this.updateModLoadingScreen(0, 1, i18next.t("menu:checkingForMods"));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      let mods = [];
      try {
        mods = await modStorage.getAllMods();
      } catch (storageError) {
        console.error("Error retrieving mods from storage:", storageError);
        this.updateModLoadingScreen(0, 1, i18next.t("menu:errorRetrievingMods"));
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.hideModLoadingScreen();
        return;
      }
      
      const totalSteps = mods.length > 0 ? mods.length + 2 : 2;
      let currentStep = 1;
      
      if (mods.length > 0) {
        console.log(i18next.t("menu:modsFound", { count: mods.length, plural: mods.length > 1 ? "s" : "" }));
        
        this.updateModLoadingScreen(
          currentStep / totalSteps, 
          1, 
          i18next.t("menu:modsFound", { count: mods.length, plural: mods.length > 1 ? "s" : "" })
        );
        
        await new Promise(resolve => setTimeout(resolve, 100));
        currentStep++;
        
        for (let i = 0; i < mods.length; i++) {
          const mod = mods[i];
          try {
            this.updateModLoadingScreen(
              currentStep / totalSteps, 
              1, 
              i18next.t("menu:loadingMod", { modName: mod.formName })
            );
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
            const success = await loadModGlitchFormFromJson(this as any, mod.jsonData);
            if (success) {
              console.log(`Successfully loaded mod: ${mod.formName} for species ${mod.speciesId}`);
              this.updateModLoadingScreen(
                (currentStep + 0.5) / totalSteps, 
                1, 
                i18next.t("menu:modLoaded", { modName: mod.formName })
              );
            } else {
              console.warn(`Failed to load mod: ${mod.formName} for species ${mod.speciesId}`);
              this.updateModLoadingScreen(
                (currentStep + 0.5) / totalSteps, 
                1, 
                i18next.t("menu:modFailed", { modName: mod.formName })
              );
              await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            currentStep++;
          } catch (error) {
            console.error(`Error loading mod ${mod.formName}:`, error);
            this.updateModLoadingScreen(
              currentStep / totalSteps, 
              1, 
              i18next.t("menu:modError", { modName: mod.formName })
            );
            currentStep++;
          }
        }
        
        this.updateModLoadingScreen(1, 1, i18next.t("menu:allModsLoaded"));
        
        await new Promise(resolve => setTimeout(resolve, 200));
      } else {
        console.log(i18next.t("menu:noModsFoundInStorage"));
        
        this.updateModLoadingScreen(
          currentStep / totalSteps, 
          1, 
          i18next.t("menu:noModsFound")
        );
        
        await new Promise(resolve => setTimeout(resolve, 500));
        currentStep++;
        this.updateModLoadingScreen(1, 1, i18next.t("menu:readyToStartGame"));
        
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

    } catch (error) {
      console.error("Error in loadCustomMods:", error);
      if (this.modLoadingGraphics.length > 0) {
        this.updateModLoadingScreen(1, 1, i18next.t("menu:errorLoadingMods"));
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.hideModLoadingScreen();
      }
    }
  }
  
  private hideModLoadingScreen(): Promise<void> {
    return new Promise<void>(resolve => {
      if (this.modLoadingGraphics.length > 0) {
        this.tweens.add({
          targets: this.modLoadingGraphics,
          alpha: 0,
          duration: 500,
          ease: 'Power2',
          onComplete: () => {
            this.modLoadingGraphics.forEach(g => g.destroy());
            this.modLoadingGraphics = [];
            this.modPercentText = null;
            this.modNameText = null;
            this.modProgressBar = null;
            this.modDoneBootGameText = null;
            resolve();
          }
        });
      } else {
        resolve();
      }
    });
  }

  private async ensureModSpriteAnimations(): Promise<void> {
    try {
      const textureKeys = this.textures.getTextureKeys();
      
      const modPokemonTextures = textureKeys.filter(key => 
        key.startsWith('pkmn__glitch__')
      );
      
      for (const textureKey of modPokemonTextures) {
        if (!this.anims.exists(textureKey)) {
          console.log(`Creating animation for mod texture: ${textureKey}`);
          this.anims.create({
            key: textureKey,
            frames: [{ key: textureKey }],
            frameRate: 1,
            repeat: -1
          });
        }
      }
    } catch (error) {
      console.error("Error ensuring mod sprite animations:", error);
    }
  }

  private modLoadingGraphics: Phaser.GameObjects.GameObject[] = [];
  private modPercentText: Phaser.GameObjects.Text | null = null;
  private modNameText: Phaser.GameObjects.Text | null = null;
  private modProgressBar: Phaser.GameObjects.Graphics | null = null;
  private modDoneBootGameText: Phaser.GameObjects.Text | null = null;
  
  private createModLoadingScreen(): void {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const midWidth = width / 2;
    const midHeight = height / 2;
    
    const bgOverlay = this.add.graphics();
    bgOverlay.fillStyle(0x220044, 0.85);
    bgOverlay.fillRect(0, 0, width, height);
    
    const panelBorder = this.add.graphics();
    panelBorder.lineStyle(6, 0xff00ff, 1.0);
    panelBorder.strokeRect(midWidth - 350, midHeight - 150, 700, 300);
    
    const titleText = this.make.text({
      x: midWidth,
      y: midHeight - 100,
      text: i18next.t("menu:loadingMods"),
      style: {
        font: "72px emerald",
        color: "#ffffff",
        stroke: "#ff00ff",
        strokeThickness: 6
      },
    });
    titleText.setOrigin(0.5, 0.5);
    
    const subTitleText = this.make.text({
      x: midWidth,
      y: midHeight - 50,
      text: i18next.t("menu:modsWillAppear"),
      style: {
        font: "32px emerald",
        color: "#ccccff",
      },
    });
    subTitleText.setOrigin(0.5, 0.5);
    
    const progressBox = this.add.graphics();
    progressBox.lineStyle(5, 0xff00ff, 1.0);
    progressBox.fillStyle(0x330055, 0.8);
    progressBox.fillRect(midWidth - 320, midHeight, 640, 64);
    progressBox.strokeRect(midWidth - 320, midHeight, 640, 64);
    
    const progressBar = this.add.graphics();
    
    const percentText = this.make.text({
      x: midWidth,
      y: midHeight + 32,
      text: "0%",
      style: {
        font: "72px emerald",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 4
      },
    });
    percentText.setOrigin(0.5, 0.5);
    
    const modNameText = this.make.text({
      x: midWidth,
      y: midHeight + 100,
      text: "",
      style: {
        font: "48px emerald",
        color: "#ffffff",
      },
    });
    modNameText.setOrigin(0.5, 0.5);
    
    const modDoneBootGameText = this.make.text({
      x: midWidth,
      y: modNameText.y + 160,
      text: i18next.t("menu:modComplete"),
      style: {
        font: "120px emerald",
        color: "#ffffff",
        stroke: "#ff00ff",
        strokeThickness: 6
      },
    });
    modDoneBootGameText.setOrigin(0.5, 0.5);
    modDoneBootGameText.setVisible(false);

    this.modLoadingGraphics = [bgOverlay, panelBorder, titleText, subTitleText, progressBox, progressBar, percentText, modNameText, modDoneBootGameText];
    this.modPercentText = percentText;
    this.modNameText = modNameText;
    this.modProgressBar = progressBar;
    this.modDoneBootGameText = modDoneBootGameText;
  }
  
  private updateModLoadingScreen(current: number, total: number, modName: string = ""): void {
    if (!this.modPercentText || !this.modNameText || !this.modProgressBar || !this.modDoneBootGameText) return;
    
    let progress = total > 0 ? current / total : 0;
    if (total === 1 && current === 0) {
      progress = 0.10; 
    }
    
    const percent = Math.floor(progress * 100);
    
    this.modPercentText.setText(`${percent}%`);
    
    if (modName) {
      this.modNameText.setText(modName);
    }
    
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;
    const midWidth = width / 2;
    const midHeight = height / 2;
    
    this.modProgressBar.clear();
    this.modProgressBar.fillStyle(0xffffff, 0.8);
    this.modProgressBar.fillRect(midWidth - 320, midHeight, 640 * progress, 64);

    if (percent >= 100) {
      this.modDoneBootGameText.setVisible(true);
    } 
  }

  get gameHeight() {
    return this.game.config.height as number;
  }

  get gameWidth() {
    return this.game.config.width as number;
  }

  private async loadExampleGlitchMod(): Promise<void> {
    try {
      console.log("Loading example glitch mod...");
      
      try {
        const response = await fetch('docs/mod-glitch-form-example.json');
        if (!response.ok) {
          throw new Error(`Failed to fetch mod JSON: ${response.status}`);
        }
        
        const exampleModJson = await response.json();
        if (!exampleModJson) {
          console.error("Empty example mod JSON");
          return;
        }
        
        const success = await loadModGlitchFormFromJson(this as any, exampleModJson);
        if (success) {
          try {
            await modStorage.storeMod({
              speciesId: exampleModJson.speciesId,
              formName: exampleModJson.formName,
              jsonData: exampleModJson,
              spriteData: exampleModJson.sprites.front,
              iconData: exampleModJson.sprites.icon || exampleModJson.sprites.front
            });
            console.log("Successfully loaded and stored example glitch mod");
          } catch (storageError) {
            console.error("Error storing mod:", storageError);
            console.log("Mod loaded but not saved to storage. It will be lost on refresh.");
          }
        } else {
          console.error("Failed to load and store example glitch mod");
        }
      } catch (error) {
        console.error("Error loading example mod:", error);
      }
      
      return Promise.resolve();
    } catch (error) {
      console.error("Error in loadExampleGlitchMod:", error);
      return Promise.resolve();
    }
  }
}

export function isIPhone() {
  
  const isUA = /iPhone/i.test(navigator.userAgent) && !(window as any).MSStream;
  
  const isPlatform = /iPhone/i.test(navigator.platform);
  
  const hasIOSQuirks = (
    'maxTouchPoints' in navigator && 
    navigator.maxTouchPoints > 1 &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) || 
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  ) && !(window as any).MSStream;

  return isUA || (isPlatform && hasIOSQuirks);
} 
