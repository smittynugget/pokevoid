import type BattleScene from "../battle-scene";
import type { Phase } from "../phase";
import { MovePhase } from "../phases/move-phase";
import { MoveEndPhase } from "../phases/move-end-phase";
import { AttemptCapturePhase } from "../phases/attempt-capture-phase";
import { AttemptRunPhase } from "../phases/attempt-run-phase";
import { PostSummonPhase } from "../phases/post-summon-phase";
import { SwitchSummonPhase } from "../phases/switch-summon-phase";
import { MoveEffectPhase } from "../phases/move-effect-phase";
import {
  type BattleReplayPackage,
  type ReplayMessage,
  sanitizeSessionForReplay,
} from "./replay-package";

type StepCommand = "FIGHT" | "BALL" | "POKEMON" | "RUN" | "START" | "UNKNOWN";

type StepContext = {
  step: any;
  orphanMoveEffectStep: boolean;
  followUpMoveEffectStep: boolean;
};

export default class BattleReplayRecorder {
  private scene: BattleScene;
  private active: boolean = false;
  private battleSeed: string | null = null;
  private battleStartKeyframe: any = null;
  private battleStartTurn: integer = 0;
  private battleStartRefreshed: boolean = false;

  private steps: any[] = [];
  private nextStepIndex: integer = 0;
  private currentStep: any = null;
  private preStepMessages: ReplayMessage[] = [];
  private pendingDeferQueue: boolean[] = [];
  private orphanMoveEffectStep: boolean = false;
  private followUpMoveEffectStep: boolean = false;
  private stepStack: StepContext[] = [];

  constructor(scene: BattleScene) {
    this.scene = scene;
  }

  public startBattleRecording(): void {
    if (this.scene.replayMode) return;
    this.active = true;
    this.battleSeed = this.scene.currentBattle?.battleSeed ?? null;
    this.battleStartTurn = this.scene.currentBattle?.turn ?? 0;
    const session = this.scene.gameData.getSessionSaveData(this.scene);
    this.battleStartKeyframe = sanitizeSessionForReplay(session, { publicShare: false });
    this.battleStartRefreshed = false;
    this.steps = [];
    this.nextStepIndex = 0;
    this.currentStep = null;
    this.preStepMessages = [];
    this.pendingDeferQueue = [];
    this.orphanMoveEffectStep = false;
    this.followUpMoveEffectStep = false;
    this.stepStack = [];
  }

  public maybeRefreshBattleStartKeyframe(): void {
    if (!this.active) return;
    if (this.scene.replayMode) return;
    if (this.battleStartRefreshed) return;
    if (!this.scene.encounterInitComplete) return;
    try {
      const session = this.scene.gameData.getSessionSaveData(this.scene);
      const partyCount = Array.isArray((session as any)?.party) ? (session as any).party.length : 0;
      const enemyCount = Array.isArray((session as any)?.enemyParty) ? (session as any).enemyParty.length : 0;
      if (partyCount > 0 && enemyCount > 0) {
        this.battleStartKeyframe = sanitizeSessionForReplay(session, { publicShare: false });
        this.battleStartRefreshed = true;
      }
    } catch {}
  }

  public stop(): void {
    this.active = false;
  }

  public onQueueMessageMeta(defer?: boolean | null, message?: string): void {
    if (!this.active) return;
    if (this.scene.replayMode) return;
    const d = !!defer;
    let count = 1;
    try {
      if (typeof message === "string" && message.indexOf("$") > -1) {
        count = message.split(/\$/g).length;
      }
    } catch {}
    for (let i = 0; i < count; i++) {
      this.pendingDeferQueue.push(d);
    }
  }

  public onRenderedMessage(msg: Omit<ReplayMessage, "defer">): void {
    if (!this.active) return;
    if (this.scene.replayMode) return;
    const consumesDefer = msg.kind === "text" || msg.kind === "dialogue";
    if (consumesDefer && (!msg.text || !msg.text.trim())) {
      if (this.pendingDeferQueue.length) {
        this.pendingDeferQueue.shift();
      }
      return;
    }
    const defer = consumesDefer ? (this.pendingDeferQueue.length ? this.pendingDeferQueue.shift()! : false) : null;
    const message: ReplayMessage = { ...msg, defer };
    if (this.currentStep) {
      this.currentStep.messages.push(message);
      return;
    }

    let lastIdx = this.steps.length - 1;
    while (lastIdx >= 0 && !this.steps[lastIdx]) lastIdx--;
    if (lastIdx >= 0 && this.steps[lastIdx]) {
      this.steps[lastIdx].messages.push(message);
      try {
        const session = this.scene.gameData.getSessionSaveData(this.scene);
        this.steps[lastIdx].keyframe = sanitizeSessionForReplay(session, { publicShare: false });
      } catch {}
      return;
    }

    this.preStepMessages.push(message);
  }

  public onPhaseComplete(prevPhase: Phase | null, nextPhase: Phase | null): void {
    if (!this.active) return;
    if (this.scene.replayMode) return;

    if (prevPhase) {
      this.maybeFinalizeStep(prevPhase, nextPhase);
    }

    if (nextPhase) {
      this.maybeStartStep(nextPhase);
    }
  }

  public buildPackage(): BattleReplayPackage | null {
    if (!this.active) return null;
    if (!this.battleStartKeyframe) return null;

    try {
      this.maybeRefreshBattleStartKeyframe();
      const bsPartyCount = Array.isArray((this.battleStartKeyframe as any)?.party) ? (this.battleStartKeyframe as any).party.length : 0;
      const bsEnemyCount = Array.isArray((this.battleStartKeyframe as any)?.enemyParty) ? (this.battleStartKeyframe as any).enemyParty.length : 0;
      if (!(bsPartyCount > 0 && bsEnemyCount > 0)) {
        const session = this.scene.gameData.getSessionSaveData(this.scene);
        const partyCount = Array.isArray((session as any)?.party) ? (session as any).party.length : 0;
        const enemyCount = Array.isArray((session as any)?.enemyParty) ? (session as any).enemyParty.length : 0;
        if (partyCount > 0 && enemyCount > 0) {
          this.battleStartKeyframe = sanitizeSessionForReplay(session, { publicShare: false });
          this.battleStartRefreshed = true;
        }
      }
    } catch {}

    while (this.currentStep) {
      this.finalizeStep();
    }

    const battleType = (this.scene.currentBattle as any)?.battleType ?? "";
    const waveIndex = (this.scene.currentBattle as any)?.waveIndex ?? 0;
    const double = !!(this.scene.currentBattle as any)?.double;
    const gameMode = (this.scene.gameMode as any)?.modeId ?? 0;
    const gameVersion = (this.scene.gameData as any)?.getDisplayVersion?.() ?? (this.battleStartKeyframe?.gameVersion ?? "");

    return {
      v: 1,
      kind: "battle_replay_keyframes",
      meta: {
        gameVersion,
        gameMode,
        waveIndex,
        battleType,
        double,
        createdAt: Date.now(),
      },
      privacy: {
        redactedNicknames: true,
        redactedTrainerId: true,
        redactedSeed: false,
      },
      battleStart: {
        session: this.battleStartKeyframe,
        battleSeed: this.battleSeed,
        battleTurn: this.battleStartTurn,
      },
      steps: this.steps,
    };
  }

  private maybeStartStep(nextPhase: Phase): void {
    if (nextPhase instanceof MovePhase) {
      const followUp = !!(nextPhase as any).followUp;
      const actor = (nextPhase as any).pokemon?.getBattlerIndex?.() ?? null;
      const moveId = (nextPhase as any).move?.moveId ?? null;
      const targets = Array.isArray((nextPhase as any).targets) ? (nextPhase as any).targets.slice() : [];
      if (followUp) {
        if (this.currentStep) {
          if (actor !== null && this.currentStep.actor !== actor) {
            this.stepStack.push({
              step: this.currentStep,
              orphanMoveEffectStep: this.orphanMoveEffectStep,
              followUpMoveEffectStep: this.followUpMoveEffectStep,
            });
            this.currentStep = null;
          } else {
            return;
          }
        }
        this.orphanMoveEffectStep = false;
        this.followUpMoveEffectStep = true;
        this.startStep("FIGHT", actor, { move: moveId, targets });
        return;
      }
      if (this.currentStep) return;
      this.orphanMoveEffectStep = false;
      this.followUpMoveEffectStep = false;
      this.startStep("FIGHT", actor, { move: moveId, targets });
      return;
    }

    if (this.currentStep) return;

    if (nextPhase instanceof AttemptCapturePhase) {
      this.orphanMoveEffectStep = false;
      this.followUpMoveEffectStep = false;
      this.startStep("BALL", 0, null);
      return;
    }

    if (nextPhase instanceof AttemptRunPhase) {
      const actor = (nextPhase as any).getPokemon?.()?.getBattlerIndex?.() ?? (nextPhase as any).fieldIndex ?? 0;
      this.orphanMoveEffectStep = false;
      this.followUpMoveEffectStep = false;
      this.startStep("RUN", actor, null);
      return;
    }

    if (nextPhase instanceof SwitchSummonPhase) {
      const actor = (nextPhase as any).getPokemon?.()?.getBattlerIndex?.() ?? null;
      this.orphanMoveEffectStep = false;
      this.followUpMoveEffectStep = false;
      this.startStep("POKEMON", actor, null);
      return;
    }

    if (nextPhase instanceof MoveEffectPhase) {
      if (this.currentStep) return;
      this.orphanMoveEffectStep = true;
      this.followUpMoveEffectStep = false;
      const actor = (nextPhase as any).battlerIndex ?? null;
      const moveId = (nextPhase as any).move?.moveId ?? null;
      const targets = Array.isArray((nextPhase as any).targets) ? (nextPhase as any).targets.slice() : [];
      this.startStep("FIGHT", actor, moveId ? { move: moveId, targets } : null);
      return;
    }
  }

  private maybeFinalizeStep(prevPhase: Phase, nextPhase: Phase | null): void {
    if (!this.currentStep) return;

    if (prevPhase instanceof MoveEndPhase) {
      this.finalizeStep();
      return;
    }
    if (prevPhase instanceof AttemptCapturePhase) {
      this.finalizeStep();
      return;
    }
    if (prevPhase instanceof AttemptRunPhase) {
      this.finalizeStep();
      return;
    }
    if (prevPhase instanceof PostSummonPhase) {
      this.finalizeStep();
      return;
    }
    if (prevPhase instanceof MovePhase) {
      const canMove = (prevPhase as any).canMove?.() ?? true;
      const followUp = !!(prevPhase as any).followUp;
      const actor = (prevPhase as any).pokemon?.getBattlerIndex?.() ?? null;
      if (!canMove) {
        if (followUp && this.stepStack.length === 0 && actor !== null && this.currentStep.actor === actor) {
          return;
        }
        this.finalizeStep();
      }
      return;
    }
    if (prevPhase instanceof MoveEffectPhase && (this.orphanMoveEffectStep || this.followUpMoveEffectStep)) {
      if (!(nextPhase instanceof MoveEffectPhase)) {
        this.finalizeStep();
      }
      return;
    }
  }

  private startStep(command: StepCommand, actor: any, move: any): void {
    const turn = (this.scene.currentBattle as any)?.turn ?? 0;
    const i = this.nextStepIndex++;
    this.currentStep = {
      i,
      turn,
      actor,
      command,
      move,
      messages: [],
      keyframe: null,
    };
    if (this.preStepMessages.length && this.steps.every(s => !s)) {
      this.currentStep.messages.push(...this.preStepMessages);
      this.preStepMessages = [];
    }
  }

  private finalizeStep(): void {
    const session = this.scene.gameData.getSessionSaveData(this.scene);
    const keyframe = sanitizeSessionForReplay(session, { publicShare: false });
    this.currentStep.keyframe = keyframe;
    this.steps[this.currentStep.i] = this.currentStep;
    this.currentStep = null;
    this.orphanMoveEffectStep = false;
    this.followUpMoveEffectStep = false;
    if (this.stepStack.length) {
      const ctx = this.stepStack.pop()!;
      this.currentStep = ctx.step;
      this.orphanMoveEffectStep = ctx.orphanMoveEffectStep;
      this.followUpMoveEffectStep = ctx.followUpMoveEffectStep;
    }
  }
}