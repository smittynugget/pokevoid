import BattleScene from "../battle-scene";
import { Mode } from "../ui/ui";
import {Phase} from "../phase";
import { createSporadicPattern } from "../utils";

export class CustomDialoguePhase extends Phase {
    private charKey: string;
    private dialogueKey: string;
    private name: string;
    private callback: Function;
    private dialoguePatternOverlay: Phaser.GameObjects.Container | null = null;

    constructor(scene: BattleScene, charKey: string, dialogueKey: string, name: string, callback: Function) {
        super(scene);
        this.scene = scene;
        this.charKey = charKey;
        this.dialogueKey = dialogueKey;
        this.name = name;
        this.callback = callback;
    }

    public start(): void {
        this.createPatternOverlay();
        this.scene.showFieldOverlay(0).then(() => {
            this.showPatternOverlay();
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.charSprite.showCharacter(this.charKey, "").then(() => {
                this.scene.ui.showDialogue(this.dialogueKey, this.name, null, () => {
                    this.scene.ui.getMessageHandler().hideNameText();
                    this.scene.ui.clearText();
                    this.scene.charSprite.hide().then(() => {
                        this.hidePatternOverlay();
                        this.scene.hideFieldOverlay(250);
                        this.callback();
                        this.end();
                    });
                });
            });
        });
    }

    public end(): void {
        this.destroyPatternOverlay();
        super.end();
    }

    private createPatternOverlay(): void {
        if (this.dialoguePatternOverlay) return;

        this.dialoguePatternOverlay = this.scene.add.container(0, 0);
        const overlayHeight = (this.scene.game.canvas.height / 6) - 48;
        this.dialoguePatternOverlay.setPosition(0, overlayHeight * -1 - 48);
        this.dialoguePatternOverlay.setAlpha(0);

        this.scene.fieldUI.add(this.dialoguePatternOverlay);
        const fieldOverlay = (this.scene as any).fieldOverlay;
        if (fieldOverlay) {
            this.scene.fieldUI.moveAbove(this.dialoguePatternOverlay, fieldOverlay);
        }

        createSporadicPattern(this.scene, this.dialoguePatternOverlay);
    }

    private showPatternOverlay(): void {
        if (!this.dialoguePatternOverlay) return;

        this.scene.tweens.add({
            targets: this.dialoguePatternOverlay,
            alpha: 1,
            duration: 250,
            ease: "Sine.easeOut"
        });
    }

    private hidePatternOverlay(): void {
        if (!this.dialoguePatternOverlay) return;

        this.scene.tweens.add({
            targets: this.dialoguePatternOverlay,
            alpha: 0,
            duration: 250,
            ease: "Cubic.easeIn"
        });
    }

    private destroyPatternOverlay(): void {
        if (this.dialoguePatternOverlay) {
            this.dialoguePatternOverlay.destroy();
            this.dialoguePatternOverlay = null;
        }
    }
}