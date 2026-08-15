import { SlideConfig } from "../utils/slideshow-controller";
import * as Utils from "../utils";

export type StoryCutsceneId =
  | "title_intro"
  | "title_intro_a"
  | "title_intro_b"
  | "title_intro_c"
  | "title_intro_d"
  | "champion_unlock"
  | "rival_defeat"
  | "rival_defeat_final"
  | "nightmare_start"
  | "nightmare_century"
  | "nightmare_wave_400"
  | "smitty_battle_first"
  | "smitty_post_battle"
  | "void_smitty_battle"
  | "smitty_victory"
  | "void_victory"
  | "all_smittys_complete_victory"
  | "loss_whiteout_homebase"
  | "tutorial_void_trance"
  | "tutorial_void_trance_journey";

export interface StoryCutsceneDefinition {
  bgmKey: string;
  slides: SlideConfig[];
}

const POWER_PAUSE_AFTER_TEXT = 9999999;
const RIVAL_FADE_PAUSE_AFTER_TEXT = 2500;

const TITLE_INTRO_A: StoryCutsceneDefinition = {
  bgmKey: "wasteland",
  slides: [
    { imageKey: "peace", textKey: "cutscene:title_a_peace" },
    { imageKey: "voidbreak", textKey: "cutscene:title_a_voidbreak" },
    { imageKey: "voidbreak2", textKey: "cutscene:title_a_voidbreak2" },
    { imageKey: "locked", textKey: "cutscene:title_a_locked" },
    { imageKey: "shadows", textKey: "cutscene:title_a_shadows" },
    { imageKey: "you", textKey: "cutscene:title_a_you" },
    { imageKey: "choose", textKey: "cutscene:title_a_choose" },
    { imageKey: "journey", textKey: "cutscene:title_a_journey" },
  ],
};

export const STORY_CUTSCENES: Record<StoryCutsceneId, StoryCutsceneDefinition> = {
  title_intro: TITLE_INTRO_A,
  title_intro_a: TITLE_INTRO_A,
  title_intro_b: {
    bgmKey: "battle_legendary_kor_mir",
    slides: [
      { imageKey: "shadows", textKey: "cutscene:title_b_shadows" },
      { imageKey: "shadowPower", textKey: "cutscene:title_b_shadowPower" },
      { imageKey: "power", textKey: "cutscene:title_b_power" },
      { imageKey: "journey", textKey: "cutscene:title_b_journey" },
      { imageKey: "thronemystery", textKey: "cutscene:title_b_thronemystery" },
    ],
  },
  title_intro_c: {
    bgmKey: "battle_alola_elite",
    slides: [
      { imageKey: "dethroned", textKey: "cutscene:title_c_dethroned" },
      { imageKey: "power", textKey: "cutscene:title_c_power" },
      { imageKey: "voidwin", textKey: "cutscene:title_c_voidwin" },
      { imageKey: "mystery", textKey: "cutscene:title_c_mystery" },
      { imageKey: "smitty", textKey: "cutscene:title_c_smitty" },
      { imageKey: "smittys", textKey: "cutscene:title_c_smittys" },
      { imageKey: "journey", textKey: "cutscene:title_c_journey" },
    ],
  },
  title_intro_d: {
    bgmKey: "end_summit",
    slides: [
      { imageKey: "peace", textKey: "cutscene:all_smittys_peace" },
      { imageKey: "voidbreak", textKey: "cutscene:all_smittys_voidbreak" },
      { imageKey: "mystery", textKey: "cutscene:all_smittys_mystery" },
      { imageKey: "journey", textKey: "cutscene:all_smittys_journey" },
    ],
  },
  champion_unlock: {
    bgmKey: "battle_legendary_terapagos",
    slides: [
      { imageKey: "unlocked", textKey: "cutscene:champion_unlocked" },
      { imageKey: "bond", textKey: "cutscene:champion_bond" },
    ],
  },
  rival_defeat: {
    bgmKey: "battle_legendary_kor_mir",
    slides: [
      { imageKey: "flame", textKey: "cutscene:rival_flame", pauseAfterText: RIVAL_FADE_PAUSE_AFTER_TEXT },
      { imageKey: "shadowPower", textKey: "cutscene:rival_shadowPower" },
      { imageKey: "power", textKey: "cutscene:rival_power", pauseAfterText: POWER_PAUSE_AFTER_TEXT },
      { imageKey: "shadows", textKey: "cutscene:rival_shadows" },
    ],
  },
  rival_defeat_final: {
    bgmKey: "battle_legendary_calyrex",
    slides: [
      { imageKey: "flame", textKey: "cutscene:rival_final_flame", pauseAfterText: RIVAL_FADE_PAUSE_AFTER_TEXT },
      { imageKey: "shadowPower", textKey: "cutscene:rival_final_shadowPower" },
      { imageKey: "power", textKey: "cutscene:rival_final_power", pauseAfterText: POWER_PAUSE_AFTER_TEXT },
      { imageKey: "shadows", textKey: "cutscene:rival_shadows" },
      { imageKey: "thronemystery", textKey: "cutscene:rival_final_thronemystery" },
    ],
  },
  nightmare_start: {
    bgmKey: "battle_legendary_kanto",
    slides: [
      { imageKey: "journey", textKey: "cutscene:nightmare_start_journey" },
      { imageKey: "shadows", textKey: "cutscene:nightmare_start_shadows" },
      { imageKey: "shadowPower", textKey: "cutscene:nightmare_start_shadowPower" },
      { imageKey: "power", textKey: "cutscene:nightmare_start_power", pauseAfterText: POWER_PAUSE_AFTER_TEXT },
      { imageKey: "mystery", textKey: "cutscene:nightmare_start_mystery" },
      { imageKey: "thronemystery", textKey: "cutscene:nightmare_start_thronemystery" },
    ],
  },
  nightmare_century: {
    bgmKey: "battle_alola_elite",
    slides: [
      { imageKey: "power", textKey: "cutscene:nightmare_century_power" },
      { imageKey: "choose", textKey: "cutscene:nightmare_century_choose", pauseAfterText: POWER_PAUSE_AFTER_TEXT },
    ],
  },
  nightmare_wave_400: {
    bgmKey: "battle_legendary_ruinous",
    slides: [
      { imageKey: "thronemystery", textKey: "cutscene:nightmare_400_thronemystery" },
      { imageKey: "power", textKey: "cutscene:nightmare_400_power" },
      { imageKey: "choose", textKey: "cutscene:nightmare_400_choose", pauseAfterText: POWER_PAUSE_AFTER_TEXT },
    ],
  },
  smitty_post_battle: {
    bgmKey: "battle_legendary_terapagos",
    slides: [
      { imageKey: "mystery", textKey: "cutscene:smitty_post_mystery" },
      { imageKey: "power", textKey: "cutscene:smitty_post_power", pauseAfterText: POWER_PAUSE_AFTER_TEXT },
    ],
  },
  smitty_battle_first: {
    bgmKey: "battle_flare_boss",
    slides: [
      { imageKey: "mystery", textKey: "cutscene:smitty_first_mystery" },
      { imageKey: "smitty", textKey: "cutscene:smitty_first_smitty" },
    ],
  },
  void_smitty_battle: {
    bgmKey: "battle_bb_elite",
    slides: [
      { imageKey: "thronemystery", textKey: "cutscene:void_smitty_thronemystery" },
      { imageKey: "throne", textKey: "cutscene:void_smitty_throne" },
    ],
  },
  smitty_victory: {
    bgmKey: "battle_legendary_calyrex",
    slides: [
      { imageKey: "inevitable", textKey: "cutscene:smitty_victory_inevitable1", transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "inevitable2", textKey: "cutscene:smitty_victory_inevitable1", keepText: true, transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "inevitable3", textKey: "cutscene:smitty_victory_inevitable1", keepText: true, transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "inevitable4", textKey: "cutscene:smitty_victory_inevitable1", keepText: true, transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "inevitable5", textKey: "cutscene:smitty_victory_inevitable1", keepText: true, transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "dethroned", textKey: "cutscene:smitty_victory_dethroned" },
      { imageKey: "power", textKey: "cutscene:smitty_victory_power", pauseAfterText: POWER_PAUSE_AFTER_TEXT },
    ],
  },
  void_victory: {
    bgmKey: "graveyard",
    slides: [
      { imageKey: "inevitable", textKey: "cutscene:void_victory_inevitable1", transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "inevitable2", textKey: "cutscene:void_victory_inevitable1", keepText: true, transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "inevitable3", textKey: "cutscene:void_victory_inevitable1", keepText: true, transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "inevitable4", textKey: "cutscene:void_victory_inevitable1", keepText: true, transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "inevitable5", textKey: "cutscene:void_victory_inevitable1", keepText: true, transitionCadenceMs: 1000, fadeDuration: 100 },
      { imageKey: "dethroned", textKey: "cutscene:void_victory_dethroned" },
      { imageKey: "power", textKey: "cutscene:void_victory_power", pauseAfterText: POWER_PAUSE_AFTER_TEXT },
      { imageKey: "voidwin", textKey: "cutscene:void_victory_voidwin" },
      { imageKey: "smittys", textKey: "cutscene:void_victory_smittys" },
      { imageKey: "journey", textKey: "cutscene:void_victory_journey" },
    ],
  },
  all_smittys_complete_victory: {
    bgmKey: "end_summit",
    slides: [
      { imageKey: "whiteout", textKey: "cutscene:all_smittys_whiteout" },
      { imageKey: "complete1", textKey: "cutscene:all_smittys_complete1" },
      { imageKey: "complete2", textKey: "cutscene:all_smittys_complete2" },
      { imageKey: "peace", textKey: "cutscene:all_smittys_peace" },
      { imageKey: "voidbreak", textKey: "cutscene:all_smittys_voidbreak" },
      { imageKey: "mystery", textKey: "cutscene:all_smittys_mystery" },
      { imageKey: "journey", textKey: "cutscene:all_smittys_journey" },
    ],
  },
  loss_whiteout_homebase: {
    bgmKey: "menu",
    slides: [
      { imageKey: "whiteout", textKey: "cutscene:loss_whiteout_13" },
      { imageKey: "homebase", textKey: "cutscene:loss_homebase_1" },
    ],
  },
  tutorial_void_trance: {
    bgmKey: "battle_legendary_kor_mir",
    slides: [
      { imageKey: "whiteout", textKey: "cutscene:tutorial_trance_1a" },
      { imageKey: "whiteout", textKey: "cutscene:tutorial_trance_1b", fadeDuration: 0 },
      { imageKey: "homebase", textKey: "cutscene:tutorial_trance_2a" },
      { imageKey: "homebase", textKey: "cutscene:tutorial_trance_2b", fadeDuration: 0 },
      { imageKey: "you", textKey: "cutscene:tutorial_trance_3a" },
      { imageKey: "you", textKey: "cutscene:tutorial_trance_3b", fadeDuration: 0 },
      { imageKey: "choose", textKey: "cutscene:tutorial_trance_4a" },
      { imageKey: "choose", textKey: "cutscene:tutorial_trance_4b", fadeDuration: 0 },
    ],
  },
  tutorial_void_trance_journey: {
    bgmKey: "battle_legendary_kor_mir",
    slides: [
      { imageKey: "journey", textKey: "cutscene:tutorial_trance_5a" },
      { imageKey: "journey", textKey: "cutscene:tutorial_trance_5b", fadeDuration: 0 },
    ],
  },
};

const LOSS_WHITEOUT_POOL = [1, 2, 3, 4, 5, 6, 8, 13, 14, 16, 17, 18, 20, 21, 26, 28, 29, 32, 33, 35, 37, 38, 42, 46, 54, 63, 70, 77, 79, 86, 88, 89, 94];
const LOSS_HOMEBASE_POOL = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 15, 16, 17, 18, 19, 20, 24, 26, 27, 30, 31, 32, 35, 36, 40, 41, 48, 49, 50, 51, 53, 55, 56, 58, 60, 62, 64, 68, 69, 70, 71, 72, 73, 76, 81, 87, 91, 95, 99];

export function getLossWhiteoutHomebaseSlidesRandomized(): SlideConfig[] {
  const eligibleWhiteout = LOSS_WHITEOUT_POOL.filter((n) => n >= 10);
  const whiteoutPick = eligibleWhiteout[Utils.randSeedInt(eligibleWhiteout.length)];
  const homebasePick = LOSS_HOMEBASE_POOL[Utils.randSeedInt(LOSS_HOMEBASE_POOL.length)];
  return [
    { imageKey: "whiteout", textKey: `cutscene:loss_whiteout_${whiteoutPick}` },
    { imageKey: "homebase", textKey: `cutscene:loss_homebase_${homebasePick}` },
  ];
}