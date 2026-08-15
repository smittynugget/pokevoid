import type BattleScene from "../battle-scene";
import type { SessionSaveData, SystemSaveData } from "./game-data";

const REPLAY_PHASE_DENYLIST = new Set([
  "VictoryPhase",
  "TrainerVictoryPhase",
  "BattleEndPhase",
  "GameOverPhase",
  "PostGameOverPhase",
  "ExpPhase",
  "LevelUpPhase",
  "LearnMovePhase",
  "EvolutionPhase",
  "FormChangePhase",
  "RankUpPhase",
  "SelectModifierPhase",
  "ShopModifierSelectPhase",
  "AttemptCapturePhase",
  "AttemptRunPhase",
  "ModifierRewardPhase",
  "MoneyRewardPhase",
  "BattlePathPhase",
  "NewBattlePhase",
  "HallOfFamePhase",
  "EndCardPhase",
  "UnlockPhase",
  "QuestUnlockPhase",
  "EggLapsePhase",
  "EggHatchPhase",
  "ChampionLevelUpPhase",
  "SkillTreePhase",
  "TitlePhase",
  "LoginPhase",
  "CommandPhase",
  "EnemyCommandPhase",
  "TurnInitPhase",
  "SelectStarterPhase",
  "SelectGenderPhase",
  "CharacterSelectPhase",
  "ChampionSelectPhase",
  "SelectDraftPhase",
  "SelectNightmareDraftPhase",
  "SelectChallengePhase",
  "RunInfoPhase",
  "RibbonModifierRewardPhase",
  "GameOverModifierRewardPhase",
  "SkillTreeModifierPhase",
  "SkillTreeRewardPhase",
  "BountyRewardPhase",
  "CollectedTypeShopPhase",
  "SelectPermaModifierPhase",
  "SelectMoveUpgradeModifierPhase",
  "MoveUpgradePhase",
  "RandomRankUpPhase",
  "RankUpTransformPhase",
  "UnlockModFormPhase",
  "UnlockUniSmittyPhase",
  "RivalModUnlockPhase",
  "ReloadSessionPhase",
  "OutdatedPhase",
  "UnavailablePhase",
  "SwitchPhase",
  "CheckSwitchPhase",
  "EncounterPhase",
  "NextEncounterPhase",
  "NewBiomeEncounterPhase",
  "ChaosEncounterPhase",
  "ShowPartyExpBarPhase",
  "HidePartyExpBarPhase",
  "RewardObtainDisplayPhase",
  "SlideshowCutscenePhase",
  "QuestManagerPhase",
  "ShinyPowerPhase",
  "PartyHealPhase",
  "AddEnemyBuffModifierPhase",
  "EndEvolutionPhase",
  "ScanIvsPhase",
  "TutorialBattlePhase",
  "TutorialOnboardScriptPhase",
  "TutorialBlueDefeatPhase",
  "SmitomTutorialPhase",
  "SelectBiomePhase",
  "SwitchBiomePhase",
  "YuMovePhase",
  "CustomDialoguePhase",
  "SummonMissingPhase",
  "PostSummonPhase",
]);

export function isReplayDeniedPhase(phaseName: string): boolean {
  return REPLAY_PHASE_DENYLIST.has(phaseName);
}

interface SandboxSnapshot {
  sessionData: SessionSaveData;
  systemGameStats: any;
  systemDexData: any;
  systemStarterData: any;
  systemAchvUnlocks: any;
  systemVoucherUnlocks: any;
  systemVoucherCounts: any;
  systemPermaMoney: number;
  systemEggs: any;
  systemEggPity: any;
  systemUnlockPity: any;
  originSlotId: number;
  originHadActiveBattle: boolean;
  playTimeTimerPaused: boolean;
}

let activeSnapshot: SandboxSnapshot | null = null;

function deepClone<T>(value: T): T {
  const sc = (globalThis as any).structuredClone;
  if (typeof sc === "function") {
    try {
      return sc(value);
    } catch {}
  }
  return JSON.parse(JSON.stringify(value));
}

export function enterSandbox(scene: BattleScene): void {
  if (activeSnapshot) return;

  const gd = scene.gameData;

  const sessionSnap = deepClone(gd.getSessionSaveData(scene));

  const systemSnap: SandboxSnapshot = {
    sessionData: sessionSnap,
    systemGameStats: deepClone(gd.gameStats),
    systemDexData: deepClone(gd.dexData),
    systemStarterData: deepClone(gd.starterData),
    systemAchvUnlocks: deepClone(gd.achvUnlocks),
    systemVoucherUnlocks: deepClone(gd.voucherUnlocks),
    systemVoucherCounts: deepClone(gd.voucherCounts),
    systemPermaMoney: gd.permaMoney,
    systemEggs: deepClone(gd.eggs),
    systemEggPity: gd.eggPity ? gd.eggPity.slice(0) : [],
    systemUnlockPity: gd.unlockPity ? gd.unlockPity.slice(0) : [],
    originSlotId: scene.sessionSlotId ?? -1,
    originHadActiveBattle: !!(scene.currentBattle && (scene.sessionSlotId ?? -1) >= 0),
    playTimeTimerPaused: false,
  };

  activeSnapshot = systemSnap;

  scene.replaySandboxActive = true;

  try {
    const pt = (scene as any).playTimeTimer;
    if (pt && typeof pt.paused !== "undefined") {
      pt.paused = true;
      activeSnapshot.playTimeTimerPaused = true;
    }
  } catch {}

  scene.sessionSlotId = -1;
}

export function exitSandbox(scene: BattleScene): void {
  if (!activeSnapshot) return;
  const snap = activeSnapshot;
  activeSnapshot = null;

  scene.replaySandboxActive = false;

  const gd = scene.gameData;
  try { gd.gameStats = deepClone(snap.systemGameStats); } catch {}
  try { gd.dexData = snap.systemDexData; } catch {}
  try { gd.starterData = snap.systemStarterData; } catch {}
  try { gd.achvUnlocks = snap.systemAchvUnlocks; } catch {}
  try { gd.voucherUnlocks = snap.systemVoucherUnlocks; } catch {}
  try { gd.voucherCounts = snap.systemVoucherCounts; } catch {}
  try { gd.permaMoney = snap.systemPermaMoney; } catch {}
  try { gd.eggs = snap.systemEggs; } catch {}
  try { gd.eggPity = snap.systemEggPity; } catch {}
  try { gd.unlockPity = snap.systemUnlockPity; } catch {}

  try {
    const pt = (scene as any).playTimeTimer;
    if (pt && snap.playTimeTimerPaused) {
      pt.paused = false;
    }
  } catch {}

  scene.sessionSlotId = snap.originSlotId;
}

export function isSandboxActive(): boolean {
  return activeSnapshot !== null;
}

export function getSandboxSnapshot(): SandboxSnapshot | null {
  return activeSnapshot;
}

export function getSandboxSessionData(): SessionSaveData | null {
  return activeSnapshot?.sessionData ?? null;
}