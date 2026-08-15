import type BattleScene from "../battle-scene";
import type { SessionSaveData } from "./game-data";
import type { BattleReplayPackage, BattleReplayPackageStep, ReplayMessage } from "./replay-package";
import Pokemon, { FieldPosition, PokemonMove } from "../field/pokemon";
import { clearPendingReplay } from "./replay-boot";
import { Status } from "../data/status-effect";
import { initMoveAnim, loadMoveAnimAssets, MoveAnim } from "../data/battle-anims";
import { Moves } from "../enums/moves";
import { BattlerIndex } from "../battle";
import { TitlePhase } from "../phases/title-phase";
import { MovePhase } from "../phases/move-phase";
import { ReplayHaltPhase } from "../phases/replay-halt-phase";
import { SwitchSummonPhase } from "../phases/switch-summon-phase";
import { enterSandbox, exitSandbox, isSandboxActive } from "./replay-sandbox";
import { Command } from "../ui/command-ui-handler";

interface TurnBoundary {
  turn: integer;
  firstStepIndex: integer;
  lastStepIndex: integer;
  endFrame: integer;
}

export default class ReplayPlayer {
  private scene: BattleScene;
  private pkg: BattleReplayPackage;
  private frameIndex: integer = 0;
  private playing: boolean = false;
  private loadToken: integer = 0;
  private playToken: integer = 0;
  private turnBoundaries: TurnBoundary[] | null = null;
  private originSessionSlotId: integer = -1;
  private originHadActiveBattle: boolean = false;
  private stepping: boolean = false;
  private sceneHydrated: boolean = false;

  constructor(scene: BattleScene, pkg: BattleReplayPackage) {
    this.scene = scene;
    this.pkg = pkg;
    this.originSessionSlotId = scene.sessionSlotId ?? -1;
    this.originHadActiveBattle = !!(scene.currentBattle && this.originSessionSlotId >= 0);
  }

  public getMaxFrame(): integer {
    return this.pkg.steps.length;
  }

  public getFrameIndex(): integer {
    return this.frameIndex;
  }

  public isPlaying(): boolean {
    return this.playing;
  }

  public togglePlayPause(): void {
    if (this.playing) {
      this.stopAuto();
      return;
    }
    this.playing = true;
    const token = ++this.playToken;
    this.autoAdvance(token);
  }

  public stopAuto(): void {
    this.playing = false;
    this.playToken++;
  }

  public async stepBack(): Promise<void> {
    if (this.stepping) {
      this.replayLog(`stepBack BLOCKED: stepping=${this.stepping}`);
      return;
    }
    this.stepping = true;
    try {
      this.stopAuto();
      const next = this.getPrevTurnEndFrame(this.frameIndex);
      this.replayLog(`stepBack: ${this.frameIndex} → ${next}`);
      if (next === this.frameIndex) {
        this.replayLog(`stepBack: no-op (same frame)`);
        return;
      }
      if (next <= 0) {
        const baselineSession = this.resolveBattleStartSession();
        await this.applySession(baselineSession);
        this.sceneHydrated = true;
        this.frameIndex = 0;
        this.replayLog(`stepBack complete: reset to frame 0`);
      } else {
        const stepIdx = Math.min(this.pkg.steps.length - 1, next - 1);
        const session = this.pkg.steps[stepIdx].keyframe;
        await this.applySession(session);
        this.sceneHydrated = true;
        this.frameIndex = next;
        this.replayLog(`stepBack complete: frameIndex now ${this.frameIndex}`);
      }
      this.logSceneState("stepBack");
      try { this.scene.ui?.getMessageHandler?.()?.clearText?.(); } catch {}
    } finally {
      this.stepping = false;
    }
  }

  public async stepForward(fromAuto: boolean = false): Promise<void> {
    if (this.stepping) {
      this.replayLog(`stepForward BLOCKED: stepping=${this.stepping}`);
      return;
    }
    this.stepping = true;
    this.replayLog(`stepForward START: frameIndex=${this.frameIndex}, maxFrame=${this.getMaxFrame()}, sceneHydrated=${this.sceneHydrated}`);
    try {
      await this._stepForwardImpl(fromAuto);
    } catch (err) {
      this.replayLog(`stepForward ERROR: ${err}`);
    } finally {
      this.stepping = false;
      this.replayLog(`stepForward END: stepping released, frameIndex=${this.frameIndex}`);
    }
  }

  private async _stepForwardImpl(fromAuto: boolean): Promise<void> {
    if (!fromAuto) {
      this.stopAuto();
    }
    const boundaries = this.getTurnBoundaries();
    const currentFrame = this.frameIndex;
    const max = this.getMaxFrame();

    if (currentFrame >= max) return;

    let targetBoundary: TurnBoundary | null = null;
    if (currentFrame <= 0 && boundaries.length > 0) {
      targetBoundary = boundaries[0];
    } else {
      const currentStepIdx = Math.min(this.pkg.steps.length - 1, currentFrame - 1);
      const currentTurn = this.pkg.steps[currentStepIdx]?.turn;
      const currentBoundaryIdx = boundaries.findIndex(b => b.turn === currentTurn);
      const currentEnd = currentBoundaryIdx >= 0 ? boundaries[currentBoundaryIdx].endFrame : currentFrame;

      if (currentFrame < currentEnd && currentBoundaryIdx >= 0) {
        targetBoundary = boundaries[currentBoundaryIdx];
      } else if (currentBoundaryIdx < boundaries.length - 1) {
        targetBoundary = boundaries[currentBoundaryIdx + 1];
      }
    }

    if (!targetBoundary) {
      const next = this.getNextTurnEndFrame(this.frameIndex);
      this.replayLog(`stepForward(fallback): ${this.frameIndex} → ${next}`);
      if (next === this.frameIndex) return;
      await this.loadFrame(next, { showMessages: true, turnMode: true });
      return;
    }

    this.replayLog(`stepForward(sandbox): turn ${targetBoundary.turn}, steps ${targetBoundary.firstStepIndex}..${targetBoundary.lastStepIndex}, currentFrame=${currentFrame}`);

    if (this.pkg.steps.length > 0) {
      const baselineSession = this.getPreStepSession(targetBoundary.firstStepIndex);
      await this.applySession(baselineSession);
      this.sceneHydrated = true;
      const battle = (this.scene as any).currentBattle;
      if (battle) {
        battle.turn = targetBoundary.turn;
      }
      this.replayLog(`  loaded baseline (enemies: ${baselineSession.enemyParty?.length ?? 0}), synced turn to ${targetBoundary.turn}`);
      this.logSceneState(`post-baseline-turn${targetBoundary.turn}`);
    }

    const totalSteps = targetBoundary.lastStepIndex - targetBoundary.firstStepIndex + 1;
    for (let si = targetBoundary.firstStepIndex; si <= targetBoundary.lastStepIndex; si++) {
      const stepNum = si - targetBoundary.firstStepIndex + 1;
      this.replayLog(`  === STEP ${stepNum}/${totalSteps} (idx=${si}) START ===`);
      try {
        await this.executeStepViaPhases(si);
      } catch (stepErr) {
        this.replayLog(`  === STEP ${stepNum}/${totalSteps} (idx=${si}) ERROR: ${stepErr} ===`);
      }
      this.logSceneState(`post-step[${si}]`);
      this.replayLog(`  === STEP ${stepNum}/${totalSteps} (idx=${si}) DONE ===`);
    }

    this.frameIndex = targetBoundary.endFrame;
    this.replayLog(`stepForward COMPLETE: frameIndex now ${this.frameIndex}, total steps executed: ${totalSteps}`);
    this.logSceneState("stepForward-done");
  }

  public async jumpToEnd(): Promise<void> {
    if (this.stepping) return;
    this.stepping = true;
    try {
      this.stopAuto();
      await this.loadFrame(this.getMaxFrame(), { showMessages: true, turnMode: true });
    } finally {
      this.stepping = false;
    }
  }

  public exitReplay(): void {
    this.replayLog(`exitReplay START: frameIndex=${this.frameIndex}, stepping=${this.stepping}, originHadActiveBattle=${this.originHadActiveBattle}, originSessionSlotId=${this.originSessionSlotId}`);
    this.stopAuto();
    this.loadToken++;
    try { clearPendingReplay(); } catch {}
    if (isSandboxActive()) {
      exitSandbox(this.scene);
    }
    this.scene.replaySandboxActive = false;
    this.scene.replayAwaitingStep = false;
    this.scene.replayMode = false;
    try { delete (globalThis as any).__POKEVOID_REPLAY_MODE__; } catch {}
    const returnToSession = this.originHadActiveBattle && this.originSessionSlotId >= 0;
    const slotId = this.originSessionSlotId;
    this.scene.replayPlayer = null;
    try { this.scene.ui.getHandler()?.clear?.(); } catch {}
    try { (this.scene.ui as any)?.setReplayHudSuppressed?.(false); } catch {}
    this.scene.clearAllPhaseQueues();
    try { (this.scene as any).currentPhase = null; } catch {}

    if (returnToSession) {
      const fallbackToTitle = () => {
        try {
          this.scene.reset(false);
          this.scene.unshiftPhase(new TitlePhase(this.scene));
          this.scene.shiftPhase();
        } catch {
          try { window.location.reload(); } catch {}
        }
      };
      try {
        this.scene.sessionSlotId = slotId;
        this.scene.gameData.loadSession(this.scene, slotId).then((success) => {
          if (!success) { fallbackToTitle(); return; }
          import("../phases/encounter-phase").then(({ EncounterPhase }) => {
            try {
              this.scene.clearAllPhaseQueues();
              this.scene.pushPhase(new EncounterPhase(this.scene, true));
              this.scene.shiftPhase();
            } catch { fallbackToTitle(); }
          }).catch(() => fallbackToTitle());
        }).catch(() => fallbackToTitle());
      } catch { fallbackToTitle(); }
    } else {
      try {
        this.scene.reset(false);
        this.scene.unshiftPhase(new TitlePhase(this.scene));
        this.scene.shiftPhase();
      } catch {
        try { window.location.reload(); } catch {}
      }
    }
  }

  public async executeStepViaPhases(stepIndex: integer): Promise<void> {
    const step = this.pkg.steps[stepIndex];
    if (!step) {
      this.replayLog(`executeStepViaPhases: step[${stepIndex}] NOT FOUND`);
      return;
    }

    this.replayLog(`executeStepViaPhases: step[${stepIndex}] turn=${step.turn}, command=${step.command}, actor=${step.actor}, move=${step.move?.move ?? 'none'}`);
    this.logSceneState(`pre-step[${stepIndex}]`);

    if (!isSandboxActive()) {
      enterSandbox(this.scene);
    }

    const preStepSession = this.getPreStepSession(stepIndex);
    const postStepSession = step.keyframe;
    try { await this.applyHpFromSessionAsync(preStepSession, true); } catch {}

    this.scene.replaySandboxActive = true;
    this.scene.replayAwaitingStep = false;
    this.scene.clearAllPhaseQueues();
    (this.scene as any).currentPhase = null;

    if (step.command === "FIGHT" && step.move?.move != null) {
      const actorIdx = step.actor as BattlerIndex;
      const field = this.scene.getField();
      const user = field?.[actorIdx];
      const fieldDebug = field.map((p, i) => p ? `[${i}]${(p as any).name || p.id}(hp:${p.hp}/${(p as any).getMaxHp?.() ?? '?'})` : `[${i}]null`).join(', ');
      this.replayLog(`  field: ${fieldDebug}`);
      this.replayLog(`  actor[${actorIdx}]: ${user ? `${(user as any).name || user.id} active=${(user as any).isActive?.()}` : 'null'}`);

      if (user && (user as any).isActive?.()) {
        const moveId = step.move.move as Moves;
        const targets = (step.move.targets ?? [actorIdx]) as BattlerIndex[];

        const pokemonMove = user.getMoveset().find(m => m?.moveId === moveId) || new PokemonMove(moveId);

        try {
          this.ensureBattlerTurnData();
        } catch {}

        const battle = this.scene.currentBattle;
        if (battle) {
          if (!battle.turnCommands) {
            battle.turnCommands = new Array(4).fill(null);
          }
          battle.turnCommands[actorIdx] = {
            command: Command.FIGHT,
            cursor: 0,
            move: { move: moveId, targets },
            targets,
          };
        }

        try {
          if (!user.turnData) {
            (user as any).resetTurnData?.();
          }
          user.turnData.acted = false;
          user.turnData.hitCount = 0;
          user.turnData.hitsLeft = -1;
          user.turnData.damageDealt = 0;
          user.turnData.currDamageDealt = 0;
          user.turnData.damageTaken = 0;
          user.turnData.fpiDamageTotal = 0;
        } catch {}

        const movePhase = new MovePhase(this.scene, user, targets, pokemonMove, false, true);
        this.scene.pushPhase(movePhase);
        this.scene.pushPhase(new ReplayHaltPhase(this.scene));

        const queuePreShift = this.scene.phaseQueue?.map(p => p?.constructor?.name || '?').join(',') || 'empty';
        this.replayLog(`  injected MovePhase(${Moves[moveId]}) targets=[${targets}] + ReplayHaltPhase, queue=[${queuePreShift}]`);

        this.scene.shiftPhase();
        this.replayLog(`  shiftPhase done, currentPhase=${this.scene.currentPhase?.constructor?.name || 'null'}`);

        await this.waitForHalt();
        this.logSceneState(`post-halt-step[${stepIndex}]`);
      } else {
        this.replayLog(`  SKIPPED step[${stepIndex}]: user at actor[${actorIdx}] is ${user ? `inactive` : 'null'}`);
      }
    } else if (step.command === "POKEMON") {
      const actorIdx = step.actor as BattlerIndex;
      if (actorIdx === null || actorIdx === undefined) {
        this.replayLog(`  SKIPPED step[${stepIndex}]: command=POKEMON missing actor`);
        try { await this.applyHpFromSessionAsync(postStepSession, false); } catch {}
        this.replayLog(`  step[${stepIndex}] complete, HP reconciled`);
        return;
      }
      const isEnemy = actorIdx >= BattlerIndex.ENEMY;
      const player = !isEnemy;
      const fieldIndex = isEnemy ? (actorIdx - BattlerIndex.ENEMY) : actorIdx;

      const preParty = player ? (preStepSession as any)?.party : (preStepSession as any)?.enemyParty;
      const postParty = player ? (postStepSession as any)?.party : (postStepSession as any)?.enemyParty;
      const incoming = Array.isArray(postParty) ? postParty[fieldIndex] : null;
      const outgoing = Array.isArray(preParty) ? preParty[fieldIndex] : null;

      let slotIndex = -1;
      if (incoming && Array.isArray(preParty)) {
        slotIndex = preParty.findIndex((p: any) => p && p.id === incoming.id);
      }

      const doReturn = !!outgoing && typeof outgoing.hp === "number" ? outgoing.hp > 0 : true;

      if (player && slotIndex < 0) {
        this.replayLog(`  SKIPPED step[${stepIndex}]: command=POKEMON could not infer slotIndex for actor=${actorIdx}`);
      } else {
        const battle = this.scene.currentBattle;
        if (battle) {
          if (!battle.turnCommands) {
            battle.turnCommands = new Array(4).fill(null);
          }
          battle.turnCommands[actorIdx] = {
            command: Command.POKEMON,
            cursor: slotIndex,
            args: [false, false],
          };
        }

        const switchPhase = new SwitchSummonPhase(this.scene as any, fieldIndex, slotIndex, doReturn, false, player, false);
        this.scene.pushPhase(switchPhase);
        this.scene.pushPhase(new ReplayHaltPhase(this.scene));

        const queuePreShift = this.scene.phaseQueue?.map(p => p?.constructor?.name || '?').join(',') || 'empty';
        this.replayLog(`  injected SwitchSummonPhase(fieldIndex=${fieldIndex}, slotIndex=${slotIndex}, player=${player}) + ReplayHaltPhase, queue=[${queuePreShift}]`);

        this.scene.shiftPhase();
        await this.waitForHalt();
        this.logSceneState(`post-halt-step[${stepIndex}]`);
      }
    } else {
      this.replayLog(`  SKIPPED step[${stepIndex}]: command=${step.command} (not FIGHT or no move)`);
    }

    try { await this.applyHpFromSessionAsync(postStepSession, false); } catch {}

    this.replayLog(`  step[${stepIndex}] complete, HP reconciled`);
  }

  private waitForHalt(timeoutMs: number = 10000): Promise<void> {
    return new Promise<void>(resolve => {
      const startTime = Date.now();
      let pollCount = 0;
      const check = () => {
        pollCount++;
        const elapsed = Date.now() - startTime;
        const currentPhaseName = this.scene.currentPhase?.constructor?.name || 'null';
        const queueLen = this.scene.phaseQueue?.length ?? 0;

        if (pollCount <= 3 || pollCount % 20 === 0) {
          this.replayLog(`waitForHalt poll #${pollCount}: elapsed=${elapsed}ms, phase=${currentPhaseName}, queueLen=${queueLen}, awaitingStep=${this.scene.replayAwaitingStep}`);
        }

        if (this.scene.replayAwaitingStep || !this.scene.replaySandboxActive) {
          this.replayLog(`waitForHalt RESOLVED: awaitingStep=${this.scene.replayAwaitingStep} sandboxActive=${this.scene.replaySandboxActive} after ${elapsed}ms (${pollCount} polls)`);
          resolve();
          return;
        }
        if (!this.scene.currentPhase && !this.scene.phaseQueue?.length) {
          this.scene.replayAwaitingStep = true;
          this.replayLog(`waitForHalt RESOLVED: no phase/queue after ${elapsed}ms (${pollCount} polls)`);
          resolve();
          return;
        }
        if (elapsed > timeoutMs) {
          this.replayLog(`waitForHalt TIMEOUT after ${timeoutMs}ms (${pollCount} polls), stuck on: ${currentPhaseName}, queueLen=${queueLen}`);
          if (queueLen > 0) {
            const queueNames = this.scene.phaseQueue!.slice(0, 5).map(p => p?.constructor?.name || '?').join(',');
            this.replayLog(`waitForHalt TIMEOUT queue preview: [${queueNames}${queueLen > 5 ? ',...' : ''}]`);
          }
          this.scene.clearAllPhaseQueues();
          this.scene.replayAwaitingStep = true;
          (this.scene as any).currentPhase = null;
          resolve();
          return;
        }
        this.scene.time.delayedCall(50, check);
      };
      check();
    });
  }

  public async loadFrame(frameIndex: integer, opts: { showMessages: boolean; showAnim?: boolean; turnMode?: boolean } = { showMessages: true, showAnim: true }): Promise<void> {
    const token = ++this.loadToken;
    const prevFrame = this.frameIndex;
    this.frameIndex = frameIndex;
    this.scene.replayMode = true;
    try {
      (globalThis as any).__POKEVOID_REPLAY_MODE__ = true;
    } catch {}

    this.replayLog(`loadFrame(${frameIndex}) from ${prevFrame}, turnMode=${!!opts.turnMode}, showMessages=${opts.showMessages}, showAnim=${opts.showAnim !== false}`);

    this.scene.clearAllPhaseQueues();
    try {
      this.scene.ui?.getMessageHandler?.()?.clear?.();
    } catch {}

    const session = this.getSessionForFrame(frameIndex);
    const useDelta = this.canUseDelta(prevFrame, frameIndex);
    this.replayLog(`  path=${useDelta ? "DELTA" : "FULL_REBUILD"}`);

    if (useDelta) {
      this.killBattlerHpTweens();
      await this.applyKeyframeDelta(session);
    } else {
      await this.applySession(session);
    }

    if (token !== this.loadToken) return;

    try {
      (this.scene.ui as any)?.setReplayHudSuppressed?.(true);
    } catch {}

    const boundary = opts.turnMode ? this.getBoundaryForEndFrame(frameIndex) : null;

    if (boundary && opts.showMessages && frameIndex > 0) {
      this.replayLog(`  per-step interleave: steps ${boundary.firstStepIndex}..${boundary.lastStepIndex}`);
      let prevStepSession = this.getSessionForFrame(Math.max(0, prevFrame));

      for (let si = boundary.firstStepIndex; si <= boundary.lastStepIndex; si++) {
        if (token !== this.loadToken) return;
        const step = this.pkg.steps[si];
        const stepSession = step.keyframe;

        this.replayLog(`    step[${si}] command=${step.command}, msgs=${step.messages?.length ?? 0}`);

        try { await this.applyHpFromSessionAsync(prevStepSession, true); } catch {}
        this.replayLog(`      HP set to pre-step values (instant)`);

        if (opts.showAnim !== false) {
          await this.playMoveAnimForStep(step, token);
          if (token !== this.loadToken) return;
        }

        await this.playMessagesForStep(step, token);
        if (token !== this.loadToken) return;

        this.replayLog(`      HP tween to post-step values`);
        try { await this.applyHpFromSessionAsync(stepSession, false); } catch {}

        prevStepSession = stepSession;
      }
    } else if (opts.showMessages && frameIndex > 0) {
      try { await this.applyHpFromSessionAsync(this.getSessionForFrame(Math.max(0, prevFrame)), true); } catch {}

      if (opts.showAnim !== false) {
        const step = this.pkg.steps[Math.min(this.pkg.steps.length - 1, frameIndex - 1)];
        await this.playMoveAnimForStep(step, token);
        if (token !== this.loadToken) return;
      }

      await this.playMessagesForFrame(frameIndex, token);
      if (token !== this.loadToken) return;

      try { await this.applyHpFromSessionAsync(session, false); } catch {}
    } else if (opts.showAnim !== false && frameIndex > 0) {
      if (boundary) {
        for (let si = boundary.firstStepIndex; si <= boundary.lastStepIndex; si++) {
          if (token !== this.loadToken) return;
          await this.playMoveAnimForStep(this.pkg.steps[si], token);
        }
      } else {
        const step = this.pkg.steps[Math.min(this.pkg.steps.length - 1, frameIndex - 1)];
        await this.playMoveAnimForStep(step, token);
      }
    }

    this.replayLog(`  loadFrame(${frameIndex}) complete`);
  }

  private autoAdvance(token: integer): void {
    if (!this.playing) return;
    if (token !== this.playToken) return;
    if (this.frameIndex >= this.getMaxFrame()) {
      this.playing = false;
      return;
    }

    this.stepForward(true).then(() => {
      if (!this.playing) return;
      if (token !== this.playToken) return;
      this.scene.time.delayedCall(50, () => this.autoAdvance(token));
    }).catch(() => {
      this.playing = false;
    });
  }

  private resolveBattleStartSession(): SessionSaveData {
    const bs = this.pkg.battleStart.session;
    try {
      const partyOk = Array.isArray((bs as any)?.party) && (bs as any).party.length > 0;
      const enemyOk = Array.isArray((bs as any)?.enemyParty) && (bs as any).enemyParty.length > 0;
      if (partyOk && enemyOk) return bs;
      const step0 = this.pkg.steps[0]?.keyframe;
      if (!step0) return bs;
      const party = partyOk ? (bs as any).party : ((step0 as any)?.party ?? (bs as any).party);
      const enemyParty = enemyOk ? (bs as any).enemyParty : ((step0 as any)?.enemyParty ?? (bs as any).enemyParty);
      return { ...(bs as any), party, enemyParty } as any;
    } catch {
      return bs;
    }
  }

  private getPreStepSession(stepIndex: integer): SessionSaveData {
    if (stepIndex > 0) {
      return this.pkg.steps[stepIndex - 1].keyframe;
    }
    return this.resolveBattleStartSession();
  }

  private getSessionForFrame(frameIndex: integer): SessionSaveData {
    if (frameIndex <= 0) {
      return this.resolveBattleStartSession();
    }
    const step = this.pkg.steps[Math.min(this.pkg.steps.length - 1, frameIndex - 1)];
    return step.keyframe;
  }

  private canUseDelta(prevFrame: integer, nextFrame: integer): boolean {
    if (nextFrame <= 0 || prevFrame <= 0) return false;
    try {
      const prevSession = this.getSessionForFrame(prevFrame);
      const nextSession = this.getSessionForFrame(nextFrame);
      if (!prevSession || !nextSession) return false;
      if (prevSession.arena?.biome !== nextSession.arena?.biome) return false;
      if (prevSession.waveIndex !== nextSession.waveIndex) return false;
      const party = this.scene.getParty();
      if (!party || party.length === 0) return false;
      const battle = (this.scene as any).currentBattle;
      if (!battle) return false;
      const prevPartyIds = prevSession.party?.map((p: any) => p.id).sort();
      const nextPartyIds = nextSession.party?.map((p: any) => p.id).sort();
      if (!prevPartyIds || !nextPartyIds) return false;
      if (prevPartyIds.length !== nextPartyIds.length) return false;
      for (let i = 0; i < prevPartyIds.length; i++) {
        if (prevPartyIds[i] !== nextPartyIds[i]) return false;
      }
      const prevEnemyIds = prevSession.enemyParty?.map((p: any) => p.id).sort();
      const nextEnemyIds = nextSession.enemyParty?.map((p: any) => p.id).sort();
      if (!prevEnemyIds || !nextEnemyIds) return false;
      if (prevEnemyIds.length !== nextEnemyIds.length) return false;
      for (let i = 0; i < prevEnemyIds.length; i++) {
        if (prevEnemyIds[i] !== nextEnemyIds[i]) return false;
      }
      return true;
    } catch {
      return false;
    }
  }

  private async applyKeyframeDelta(session: SessionSaveData): Promise<void> {
    this.replayLog(`  applyKeyframeDelta: patching existing scene objects in-place`);
    try {
      const party = this.scene.getParty();
      if (session.party) {
        const sessionPartyById = new Map<number, any>();
        for (const p of session.party) {
          if (p && p.id != null) sessionPartyById.set(p.id, p);
        }
        for (const pokemon of party) {
          const data = sessionPartyById.get(pokemon.id);
          if (!data) continue;
          try {
            pokemon.hp = data.hp ?? pokemon.hp;
            if (data.status && data.status.effect != null) {
              pokemon.status = new Status(data.status.effect, data.status.turnCount ?? 0, data.status.cureTurn ?? undefined);
            } else {
              pokemon.status = null;
            }
            if (data.summonData) {
              try { pokemon.primeSummonData(data.summonData); } catch {}
              try { (pokemon as any).resetSummonData?.(); } catch {}
            }
            try { pokemon.updateInfo(true); } catch {}
          } catch {}
        }
      }

      const enemyParty = this.scene.getEnemyParty();
      if (session.enemyParty) {
        const sessionEnemyById = new Map<number, any>();
        for (const p of session.enemyParty) {
          if (p && p.id != null) sessionEnemyById.set(p.id, p);
        }
        for (const pokemon of enemyParty) {
          const data = sessionEnemyById.get(pokemon.id);
          if (!data) continue;
          try {
            pokemon.hp = data.hp ?? pokemon.hp;
            if (data.status && data.status.effect != null) {
              pokemon.status = new Status(data.status.effect, data.status.turnCount ?? 0, data.status.cureTurn ?? undefined);
            } else {
              pokemon.status = null;
            }
            if (data.summonData) {
              try { pokemon.primeSummonData(data.summonData); } catch {}
              try { (pokemon as any).resetSummonData?.(); } catch {}
            }
            try { pokemon.updateInfo(true); } catch {}
          } catch {}
        }
      }

      const arena = this.scene.arena;
      if (arena && session.arena) {
        if (session.arena.weather !== undefined) arena.weather = session.arena.weather;
        if (session.arena.terrain !== undefined) arena.terrain = session.arena.terrain;
        if (session.arena.tags) arena.tags = session.arena.tags;
      }

      const battle = (this.scene as any).currentBattle;
      if (battle && typeof session.battleTurn === "number") {
        battle.turn = session.battleTurn;
      }
    } catch {}
  }

  private resetSceneForReplayLoad(): void {
    try {
      const party = this.scene.getParty(true);
      for (const p of party) {
        try { (p as any)?.destroy?.(true); } catch {}
      }
      (this.scene as any).party = [];
    } catch {}

    try {
      const enemyParty = this.scene.getEnemyParty();
      for (const p of enemyParty) {
        try { (p as any)?.destroy?.(true); } catch {}
      }
    } catch {}

    try {
      const field = (this.scene as any).field;
      const keep = new Set<any>();
      keep.add((this.scene as any).arenaPlayer);
      keep.add((this.scene as any).arenaPlayerTransition);
      keep.add((this.scene as any).arenaEnemy);
      keep.add((this.scene as any).arenaNextEnemy);
      keep.add((this.scene as any).trainer);
      const list = field?.list;
      if (Array.isArray(list)) {
        for (const child of [...list]) {
          if (keep.has(child)) continue;
          try {
            child?.destroy?.(true);
          } catch {}
        }
      }
    } catch {}

    try {
      if ((this.scene as any).currentBattle?.trainer) {
        (this.scene as any).currentBattle.trainer.destroy();
      }
    } catch {}

    try {
      this.scene.modifiers = [];
      (this.scene as any).enemyModifiers = [];
      (this.scene as any).modifierBar?.removeAll?.(true);
      (this.scene as any).enemyModifierBar?.removeAll?.(true);
    } catch {}

    try {
      const cb = (this.scene as any).currentBattle;
      if (cb) {
        (this.scene as any)._replayPrevBattle = cb;
      }
      (this.scene as any).currentBattle = null;
    } catch {}
  }

  private async applySession(session: SessionSaveData): Promise<void> {
    this.replayLog(`  applySession: party=${session.party?.length ?? 0}, enemies=${session.enemyParty?.length ?? 0}, wave=${session.waveIndex ?? '?'}, turn=${session.battleTurn ?? '?'}`);
    this.resetSceneForReplayLoad();
    await this.scene.gameData.loadSession(this.scene, -1, session);
    this.scene.clearAllPhaseQueues();
    this.hydrateActiveBattlersToFieldForReplay();
    this.ensureBattlerTurnData();
    if (this.pkg.battleStart.battleSeed && this.scene.currentBattle) {
      (this.scene.currentBattle as any).battleSeed = this.pkg.battleStart.battleSeed;
    }
    this.logSceneState("post-applySession");
  }

  private hydrateActiveBattlersToFieldForReplay(): void {
    try {
      const battle = (this.scene as any).currentBattle;
      if (!battle) return;
      const battlerCount = battle?.getBattlerCount?.() ?? (battle?.double ? 2 : 1);
      const party = this.scene.getParty();
      const enemyParty = this.scene.getEnemyParty();
      const availablePartyMembers = party.filter(p => p && p.isAllowedInBattle()).length;
      const availableEnemyMembers = enemyParty.filter(p => p && !p.isFainted()).length;

      const place = (pokemon: Pokemon, player: boolean, fieldIndex: integer, availableCount: integer) => {
        if ((pokemon as any).isOnField?.()) {
          pokemon.setVisible(true);
          try { pokemon.getSprite().setVisible(true); } catch {}
          return;
        }
        if (fieldIndex === 1) {
          pokemon.setFieldPosition(FieldPosition.RIGHT, 0);
        } else {
          const position = !battle.double || availableCount === 1 ? FieldPosition.CENTER : FieldPosition.LEFT;
          pokemon.setFieldPosition(position, 0);
        }
        this.scene.add.existing(pokemon);
        (this.scene as any).field?.add?.(pokemon);
        if (!player) {
          try {
            const playerPokemon = (this.scene as any).getPlayerPokemon?.();
            if (playerPokemon?.visible && (this.scene as any).field?.getIndex?.(playerPokemon) > -1) {
              (this.scene as any).field?.moveBelow?.(pokemon as any, playerPokemon);
            }
          } catch {}
          try {
            battle.seenEnemyPartyMemberIds?.add?.(pokemon.id);
          } catch {}
        }
        try { (this.scene as any).updateModifiers?.(player); } catch {}
        try { (this.scene as any).updateFieldScale?.(); } catch {}
        try {
          if ((pokemon as any).battleInfo) {
            (pokemon as any).battleInfo.setVisible(true);
          }
          (pokemon as any).updateInfo?.(true);
        } catch {}
        try { (pokemon as any).playAnim?.(); } catch {}
        pokemon.setVisible(true);
        try { pokemon.getSprite().setVisible(true); } catch {}
        try {
          if ((pokemon as any).usesCustomFieldSpriteLayout?.()) {
            (pokemon as any).finalizeSummonSpriteLayout?.();
          } else {
            (pokemon as any).updateScale?.();
          }
        } catch {}
        try { (this.scene as any).updateFieldScale?.(); } catch {}
      };

      for (let i = 0; i < Math.min(battlerCount, party.length); i++) {
        const p = party[i];
        if (p) place(p as any, true, i, availablePartyMembers);
      }
      for (let i = 0; i < Math.min(battlerCount, enemyParty.length); i++) {
        const p = enemyParty[i];
        if (p) place(p as any, false, i, availableEnemyMembers);
      }
    } catch {}
  }

  private ensureBattlerTurnData(): void {
    const allBattlers = [
      ...this.scene.getParty(),
      ...this.scene.getEnemyParty(),
    ];
    let fixed = 0;
    for (const pokemon of allBattlers) {
      if (!pokemon) continue;
      try {
        const hadTurnData = !!pokemon.turnData;
        const hadSummonData = !!pokemon.summonData;
        if (!pokemon.turnData) {
          (pokemon as any).resetTurnData?.();
        }
        if (!pokemon.summonData) {
          (pokemon as any).resetSummonData?.();
        }
        if (!(pokemon as any).battleSummonData) {
          (pokemon as any).battleSummonData = {};
        }
        if (!hadTurnData || !hadSummonData) {
          fixed++;
          this.replayLog(`  ensureBattlerTurnData: ${(pokemon as any).name || pokemon.id} - turnData:${hadTurnData}->${!!pokemon.turnData} summonData:${hadSummonData}->${!!pokemon.summonData}`);
        }
      } catch {}
    }
    if (fixed > 0) {
      this.replayLog(`  ensureBattlerTurnData: fixed ${fixed}/${allBattlers.length} battlers`);
    }
  }

  public async preloadMoveAnims(): Promise<void> {
    try {
      const moveIds: Moves[] = [];
      for (const step of this.pkg.steps) {
        if (step.command === "FIGHT" && step.move?.move != null) {
          const id = step.move.move as Moves;
          if (!moveIds.includes(id)) moveIds.push(id);
        }
      }
      if (!moveIds.length) return;
      await Promise.all(moveIds.map(id => initMoveAnim(this.scene, id)));
      await loadMoveAnimAssets(this.scene, moveIds, true);
    } catch {}
  }

  private async playMoveAnimForStep(step: BattleReplayPackageStep, token: number): Promise<void> {
    try {
      if (step.command !== "FIGHT") return;
      if (!step.move?.move) return;
      if (token !== this.loadToken) return;
      if (!this.scene.moveAnimations) return;

      const moveId = step.move.move as Moves;
      const actorIdx = step.actor as BattlerIndex;
      const targetIdx = (step.move.targets?.[0] ?? actorIdx) as BattlerIndex;

      const field = this.scene.getField();
      const user = field?.[actorIdx];
      const target = field?.[targetIdx];

      if (!user || !(user as any).isOnField?.()) return;
      if (!target || !(target as any).isOnField?.()) return;

      await initMoveAnim(this.scene, moveId);
      await loadMoveAnimAssets(this.scene, [moveId], true);

      if (token !== this.loadToken) return;

      await new Promise<void>(resolve => {
        try {
          new MoveAnim(moveId, user, targetIdx).play(this.scene, () => resolve());
        } catch {
          resolve();
        }
      });
    } catch {}
  }

  private async playMessagesForFrame(frameIndex: integer, token: integer): Promise<void> {
    if (frameIndex <= 0) return;
    if (token !== this.loadToken) return;
    const step = this.pkg.steps[Math.min(this.pkg.steps.length - 1, frameIndex - 1)];
    const messages = Array.isArray(step.messages) ? step.messages.slice() : [];
    const filtered = messages.filter(m => m && !m.skipped && m.text?.trim());
    if (!filtered.length) return;

    await new Promise<void>(resolve => {
      let i = 0;
      const showNext = () => {
        if (token !== this.loadToken) { resolve(); return; }
        if (i >= filtered.length) { resolve(); return; }
        const m = filtered[i++];
        const text = this.formatSingleMessage(m);
        if (!text) { showNext(); return; }
        const charDelay = m.charDelay ?? null;
        const cbDelay = m.callbackDelay ?? (m.prompt ? 800 : 1500);
        this.scene.ui.showText(text, charDelay, showNext, cbDelay, false, null);
      };
      showNext();
    });
  }

  private async playMessagesForStep(step: BattleReplayPackageStep, token: integer): Promise<void> {
    if (token !== this.loadToken) return;
    const messages = Array.isArray(step.messages) ? step.messages.slice() : [];
    const filtered = messages.filter(m => m && !m.skipped && m.text?.trim());
    if (!filtered.length) return;

    await new Promise<void>(resolve => {
      let i = 0;
      const showNext = () => {
        if (token !== this.loadToken) { resolve(); return; }
        if (i >= filtered.length) { resolve(); return; }
        const m = filtered[i++];
        const text = this.formatSingleMessage(m);
        if (!text) { showNext(); return; }
        const charDelay = m.charDelay ?? null;
        const cbDelay = m.callbackDelay ?? (m.prompt ? 800 : 1500);
        this.scene.ui.showText(text, charDelay, showNext, cbDelay, false, null);
      };
      showNext();
    });
  }

  private formatSingleMessage(m: ReplayMessage): string {
    if (!m || !m.text) return "";
    if (m.kind === "dialogue") {
      const n = (m as any).speakerName;
      const t = m.text || "";
      return n ? `${n}: ${t}` : t;
    }
    if (m.kind === "levelUpStats") return `Level Up Stats\n${m.text || ""}`;
    if (m.kind === "ivScan") return `IV Scan\n${m.text || ""}`;
    return m.text || "";
  }

  private getTurnBoundaries(): TurnBoundary[] {
    if (this.turnBoundaries) return this.turnBoundaries;
    const boundaries: TurnBoundary[] = [];
    let current: TurnBoundary | null = null;
    for (let i = 0; i < this.pkg.steps.length; i++) {
      const step = this.pkg.steps[i];
      if (!current || current.turn !== step.turn) {
        if (current) boundaries.push(current);
        current = { turn: step.turn, firstStepIndex: i, lastStepIndex: i, endFrame: i + 1 };
      } else {
        current.lastStepIndex = i;
        current.endFrame = i + 1;
      }
    }
    if (current) boundaries.push(current);
    this.turnBoundaries = boundaries;
    return boundaries;
  }

  private getBoundaryForEndFrame(endFrame: integer): TurnBoundary | null {
    return this.getTurnBoundaries().find(b => b.endFrame === endFrame) ?? null;
  }

  private getNextTurnEndFrame(fromFrame: integer): integer {
    const boundaries = this.getTurnBoundaries();
    const max = this.getMaxFrame();
    if (!boundaries.length) return Math.min(max, fromFrame + 1);
    if (fromFrame <= 0) return boundaries[0].endFrame;
    if (fromFrame >= max) return max;

    const currentStepIdx = Math.min(this.pkg.steps.length - 1, fromFrame - 1);
    const currentTurn = this.pkg.steps[currentStepIdx].turn;
    const currentIdx = boundaries.findIndex(b => b.turn === currentTurn);
    if (currentIdx < 0) return Math.min(max, fromFrame + 1);

    const currentEnd = boundaries[currentIdx].endFrame;
    if (fromFrame < currentEnd) return currentEnd;

    if (currentIdx >= boundaries.length - 1) return max;
    return boundaries[currentIdx + 1].endFrame;
  }

  private getPrevTurnEndFrame(fromFrame: integer): integer {
    if (fromFrame <= 0) return 0;
    const boundaries = this.getTurnBoundaries();
    if (!boundaries.length) return Math.max(0, fromFrame - 1);

    const stepIdx = Math.min(this.pkg.steps.length - 1, fromFrame - 1);
    const currentTurn = this.pkg.steps[stepIdx].turn;
    const currentIdx = boundaries.findIndex(b => b.turn === currentTurn);
    if (currentIdx <= 0) return 0;
    return boundaries[currentIdx - 1].endFrame;
  }

  private async applyHpFromSessionAsync(session: SessionSaveData, instant: boolean = true): Promise<void> {
    try {
      const promises: Promise<void>[] = [];
      const party = this.scene.getParty();
      if (session.party) {
        const byId = new Map<number, any>();
        for (const p of session.party) {
          if (p && p.id != null) byId.set(p.id, p);
        }
        for (const pokemon of party) {
          const data = byId.get(pokemon.id);
          if (data && data.hp != null) {
            const oldHp = pokemon.hp;
            pokemon.hp = data.hp;
            if (oldHp !== data.hp) {
              const dir = data.hp > oldHp ? "HEAL-BACK" : "CORRECT";
              this.replayLog(`      HP ${pokemon.name || pokemon.id}: ${oldHp} → ${data.hp} [${dir}] (${instant ? "instant" : "tween"})`);
            }
            try {
              if (!instant) {
                this.killBattlerHpTweens();
              }
              promises.push(pokemon.updateInfo(instant));
            } catch {}
          }
        }
      }
      const enemyParty = this.scene.getEnemyParty();
      if (session.enemyParty) {
        const byId = new Map<number, any>();
        for (const p of session.enemyParty) {
          if (p && p.id != null) byId.set(p.id, p);
        }
        for (const pokemon of enemyParty) {
          const data = byId.get(pokemon.id);
          if (data && data.hp != null) {
            const oldHp = pokemon.hp;
            pokemon.hp = data.hp;
            if (oldHp !== data.hp) {
              const dir = data.hp > oldHp ? "HEAL-BACK" : "CORRECT";
              this.replayLog(`      HP ${pokemon.name || pokemon.id}: ${oldHp} → ${data.hp} [${dir}] (${instant ? "instant" : "tween"})`);
            }
            try {
              if (!instant) {
                this.killBattlerHpTweens();
              }
              promises.push(pokemon.updateInfo(instant));
            } catch {}
          }
        }
      }
      if (!instant && promises.length > 0) {
        this.replayLog(`      applyHpFromSessionAsync: awaiting ${promises.length} tween(s)...`);
        const timeout = new Promise<void>(resolve => setTimeout(resolve, 3000));
        await Promise.race([Promise.all(promises), timeout]);
        this.replayLog(`      applyHpFromSessionAsync: tweens done or timed out`);
      }
    } catch (err) {
      this.replayLog(`      applyHpFromSessionAsync ERROR: ${err}`);
    }
  }

  private killBattlerHpTweens(): void {
    try {
      const allBattlers = [...this.scene.getParty(), ...this.scene.getEnemyParty()];
      for (const pokemon of allBattlers) {
        try {
          const hpBar = (pokemon as any)?.battleInfo?.hpBar;
          if (hpBar) {
            this.scene.tweens.killTweensOf(hpBar);
          }
        } catch {}
      }
    } catch {}
  }

  private logSceneState(context: string): void {
    try {
      const party = this.scene.getParty();
      const enemies = this.scene.getEnemyParty();
      const partyStr = party.map(p => `${(p as any).name || p.id}(hp:${p.hp}/${(p as any).getMaxHp?.() ?? '?'} td:${!!p.turnData} sd:${!!(p as any).summonData})`).join(', ');
      const enemyStr = enemies.map(p => `${(p as any).name || p.id}(hp:${p.hp}/${(p as any).getMaxHp?.() ?? '?'} td:${!!p.turnData} sd:${!!(p as any).summonData})`).join(', ');
      const battle = (this.scene as any).currentBattle;
      this.replayLog(`[STATE:${context}] frame=${this.frameIndex} stepping=${this.stepping} sandboxActive=${this.scene.replaySandboxActive} awaitingStep=${this.scene.replayAwaitingStep}`);
      this.replayLog(`[STATE:${context}] party(${party.length}): ${partyStr || 'none'}`);
      this.replayLog(`[STATE:${context}] enemies(${enemies.length}): ${enemyStr || 'none'}`);
      this.replayLog(`[STATE:${context}] battle: ${battle ? `turn=${battle.turn} started=${battle.started} double=${battle.double}` : 'null'}`);
      this.replayLog(`[STATE:${context}] currentPhase=${this.scene.currentPhase?.constructor?.name || 'null'} queueLen=${this.scene.phaseQueue?.length ?? 0}`);
    } catch {}
  }

  private replayLog(msg: string): void {
    try {
      console.log(`[ReplayPlayer] ${msg}`);
    } catch {}
  }
}