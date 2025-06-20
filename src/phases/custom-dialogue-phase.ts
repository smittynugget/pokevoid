import BattleScene from "../battle-scene";
import { Mode } from "../ui/ui";
import {Phase} from "../phase";

export class CustomDialoguePhase extends Phase {
    private charKey: string;
    private dialogueKey: string;
    private name: string;
    private callback: Function;

    constructor(scene: BattleScene, charKey: string, dialogueKey: string, name: string, callback: Function) {
        super(scene);
        this.scene = scene;
        this.charKey = charKey;
        this.dialogueKey = dialogueKey;
        this.name = name;
        this.callback = callback;
    }

    public start(): void {
        this.scene.showFieldOverlay(0).then(() => {
            this.scene.ui.setMode(Mode.MESSAGE);
            this.scene.charSprite.showCharacter(this.charKey, "").then(() => {
                this.scene.ui.showDialogue(this.dialogueKey, this.name, null, () => {
                    this.scene.ui.getMessageHandler().hideNameText();
                    this.scene.ui.clearText();
                    // this.scene.ui.revertMode();
                    this.scene.charSprite.hide().then(() => {
                        this.scene.hideFieldOverlay(250);
                        this.callback();
                        this.end();
                    });
                });
            });
        });
    }

    // public end(): void {
    //     super.end();
    // }
}