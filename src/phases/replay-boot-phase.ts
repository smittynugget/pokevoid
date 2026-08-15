import BattleScene from "../battle-scene";
import { Phase } from "../phase";
import { Mode } from "../ui/ui";
import ReplayPlayer from "../system/replay-player";
import { decodeReplayHash } from "../system/replay-package";
import { clearReplayHashFromLocation, getPendingReplay, setPendingReplayPackage, setReplayBootError } from "../system/replay-boot";

export class ReplayBootPhase extends Phase {
  start(): void {
    super.start();
    const scene = this.scene as BattleScene;
    scene.replayMode = true;
    try {
      (globalThis as any).__POKEVOID_REPLAY_MODE__ = true;
    } catch {}

    scene.clearAllPhaseQueues();
    scene.ui.clearAllHandlerVisuals();

    const boot = async (): Promise<void> => {
      await scene.ui.setMode(Mode.LOADING, { buttonActions: [] });
      const pending = getPendingReplay();
      if (!pending) {
        try {
          setReplayBootError("Replay data was not available to load.");
        } catch {}
        clearReplayHashFromLocation();
        window.location.reload();
        return;
      }

      let pkg = pending.pkg;
      if (!pkg && pending.hashPayload) {
        pkg = decodeReplayHash(pending.hashPayload, { maxCompressedBytes: 5 * 1024 * 1024, maxInflatedChars: 5 * 1024 * 1024 });
        setPendingReplayPackage(pkg, "hash");
      }
      if (!pkg) {
        try {
          setReplayBootError("Replay package was missing or invalid.");
        } catch {}
        clearReplayHashFromLocation();
        window.location.reload();
        return;
      }

      try {
        clearReplayHashFromLocation();
      } catch {}

      const player = new ReplayPlayer(scene, pkg);
      scene.replayPlayer = player;

      await player.loadFrame(0, { showMessages: false, showAnim: false });

      player.preloadMoveAnims().catch(() => {});

      await scene.ui.setModeForceTransition(Mode.REPLAY_VIEWER, {
        onPlayPause: () => player.togglePlayPause(),
        onStepBack: () => { player.stepBack(); },
        onStepForward: () => { player.stepForward(); },
        onJumpToEnd: () => { player.jumpToEnd(); },
        onExit: () => player.exitReplay(),
      });

      (scene as any).currentPhase = null;
    };

    boot().catch(() => {
      try {
        setReplayBootError("Failed to load replay. The link or file may be corrupted.");
      } catch {}
      try {
        clearReplayHashFromLocation();
      } catch {}
      try {
        window.location.reload();
      } catch {}
    });
  }
}