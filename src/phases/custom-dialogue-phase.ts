import BattleScene from "../battle-scene";
import { Mode } from "../ui/ui";
import {Phase} from "../phase";
import { createSporadicPattern } from "../utils";

export interface CharDialogueOptions {
    bgTextureKey?: string;
    overlayDuration?: number;
    variant?: string;
    preDialogueAction?: () => Promise<void>;
}

export class CustomDialoguePhase extends Phase {
    private charKey: string;
    private dialogueKey: string;
    private name: string;
    private callback: Function;
    private dialoguePatternOverlay: Phaser.GameObjects.Container | null = null;
    private options?: CharDialogueOptions;

    constructor(scene: BattleScene, charKey: string, dialogueKey: string, name: string, callback: Function, options?: CharDialogueOptions) {
        super(scene);
        this.scene = scene;
        this.charKey = charKey;
        this.dialogueKey = dialogueKey;
        this.name = name;
        this.callback = callback;
        this.options = options;
    }

    public start(): void {
        this.createPatternOverlay();
        const fieldUIWasVisible = this.scene.fieldUI.visible;
        this.scene.fieldUI.setVisible(true);
        const bgKey = this.options?.bgTextureKey ?? "smitom_dialogue_bg";
        const overlayDuration = this.options?.overlayDuration ?? 0;
        const variant = this.options?.variant ?? "";

        const doOverlayAndDialogue = () => {
            this.scene.showFieldOverlay(overlayDuration, { withDialogueBg: true, bgTextureKey: bgKey }).then(() => {
                this.showPatternOverlay();
                this.scene.ui.setMode(Mode.MESSAGE);
                this.scene.ui.getMessageHandler().clear();
                this.scene.ui.clearText();
                this.scene.ui.getMessageHandler().applySmitomPanelStyle();
                const ensureTexture = (): Promise<void> => {
                    if (this.scene.textures.exists(this.charKey)) return Promise.resolve();
                    return new Promise<void>(resolve => {
                        this.scene.load.image(this.charKey, `images/pokemon/glitch/${this.charKey.replace("pkmn__glitch__", "")}.png`);
                        this.scene.load.once("complete", () => resolve());
                        this.scene.load.start();
                    });
                };
                ensureTexture().then(() => {
                    this.scene.charSprite.showCharacter(this.charKey, variant).then(() => {
                        this.scene.ui.showDialogue(this.dialogueKey, this.name, null, () => {
                            this.scene.ui.getMessageHandler().hideNameText();
                            const glitchPromise = this.scene.ui.getMessageHandler().glitchOutDialogue(350);
                            glitchPromise.then(() => {
                                this.scene.ui.showMessageChrome();
                                this.scene.ui.clearText();
                                this.scene.ui.getMessageHandler().restoreDefaultPanelStyle();
                            });
                            Promise.all([
                                glitchPromise,
                                this.scene.charSprite.hide(),
                                this.scene.hideFieldOverlay(750),
                            ]).then(() => {
                                this.hidePatternOverlay();
                                if (!fieldUIWasVisible) {
                                    this.scene.fieldUI.setVisible(false);
                                }
                                this.callback();
                                this.end();
                            });
                        });
                    });
                });
            });
        };

        if (this.options?.preDialogueAction) {
            this.options.preDialogueAction().then(() => doOverlayAndDialogue());
        } else {
            doOverlayAndDialogue();
        }
    }

    public end(): void {
        this.destroyPatternOverlay();
        super.end();
    }

    private createPatternOverlay(): void {
        if (this.dialoguePatternOverlay) return;

        this.dialoguePatternOverlay = this.scene.add.container(0, 0);
        const logicalH = this.scene.game.canvas.height / 6;
        this.dialoguePatternOverlay.setPosition(0, -logicalH);
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