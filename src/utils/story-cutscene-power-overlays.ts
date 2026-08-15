import BattleScene from "#app/battle-scene.js";
import { Mode } from "#app/ui/ui.js";
import { RewardConfig, RewardObtainedType } from "#app/ui/reward-obtained-ui-handler.js";
import { SlideshowController } from "#app/utils/slideshow-controller.js";
import * as Utils from "#app/utils.js";

export function runPowerUnlockOverlays(scene: BattleScene, controller: SlideshowController): void {
  const pending = scene.takePendingPowerUnlockRewards()
    .filter(r => r.type !== RewardObtainedType.RIVAL_TO_VOID);
  if (!pending.length) {
    if (controller.isAutoAdvanceBlocked()) {
      return;
    }
    controller.next();
    return;
  }

  const container = controller.getContainer();
  if (!container) {
    controller.next();
    return;
  }

  controller.blockAutoAdvance();

  const prevDepth = container.depth;
  const messageHandler = scene.ui.getMessageHandler();
  const prevMsgBgVisible = messageHandler.bg.visible;
  const prevNameBoxVisible = messageHandler.nameBoxContainer.visible;
  messageHandler.bg.setVisible(false);
  messageHandler.nameBoxContainer.setVisible(false);
  scene.ui.clearText();
  container.setDepth(1.5);

  let index = 0;

  const showNext = () => {
    if (index >= pending.length) {
      scene.ui.revertMode().then(() => {
        container.setDepth(prevDepth);
        messageHandler.bg.setVisible(prevMsgBgVisible);
        messageHandler.nameBoxContainer.setVisible(prevNameBoxVisible);
        controller.next();
      });
      return;
    }

    const reward: RewardConfig = {
      ...pending[index],
      cutsceneStyle: true,
    };

    scene.ui.setOverlayModeForceTransition(
      Mode.REWARD_OBTAINED,
      {
        buttonActions: [
          () => {
            index++;
            showNext();
          },
        ],
      },
      reward
    );
  };

  scene.time.delayedCall(Utils.fixedInt(150) as any, showNext);
}