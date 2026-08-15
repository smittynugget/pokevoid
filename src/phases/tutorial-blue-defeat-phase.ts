import BattleScene from "#app/battle-scene";
import { Phase } from "#app/phase";
import { SlideshowCutscenePhase } from "./slideshow-cutscene-phase";
import { STORY_CUTSCENES } from "#app/system/story-cutscenes";

export class TutorialBlueDefeatPhase extends Phase {
  start() {
    super.start();
    const scene = this.scene as BattleScene;
    const script = scene.gameData.tutorialBattleScript;
    if (!script || script.wakeUpTriggered) {
      this.end();
      return;
    }
    script.wakeUpTriggered = true;
    scene.clearPhaseQueue();

    scene.ui.getMessageHandler().applySmitomPanelStyle();
    scene.showFieldOverlay(500, { withDialogueBg: true, bgTextureKey: "smitom_dialogue_bg" }).then(() => {
      scene.charSprite.showCharacter("blue", "").then(() => {
        scene.ui.showDialogue("dialogue:tutorial_blue.defeat.1", "Blue", null, () => {
          scene.ui.showDialogue("dialogue:tutorial_blue.defeat.2", "Blue", null, () => {
            scene.ui.getMessageHandler().hideNameText();
            Promise.all([
              scene.ui.getMessageHandler().glitchOutDialogue(350),
              scene.charSprite.hide(),
              scene.hideFieldOverlay(750),
            ]).then(() => {
              scene.ui.clearText();
              scene.ui.getMessageHandler().restoreDefaultPanelStyle();
              const fadeDuration = 3000;
              scene.fadeOutBgm(fadeDuration, true);
              const activeBattlers = scene.getField().filter(p => p?.isActive(true));
              activeBattlers.forEach(p => p.hideInfo());
              scene.ui.fadeOut(fadeDuration).then(() => {
                activeBattlers.forEach(p => p.setVisible(false));
                import("#app/system/champion-mode-integration").then(({ beginTutorialChaosFtlAfterTrance }) => {
                  scene.unshiftPhase(new SlideshowCutscenePhase(scene, {
                    ...STORY_CUTSCENES.tutorial_void_trance,
                    canSkip: false,
                    onComplete: () => { beginTutorialChaosFtlAfterTrance(scene); }
                  }));
                  scene.shiftPhase();
                });
              });
            });
          });
        });
      });
    });
  }
}