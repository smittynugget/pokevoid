import BattleScene from "#app/battle-scene.js";
import { ModalConfig } from "./modal-ui-handler";
import { Mode } from "./ui";
import * as Utils from "../utils";
import { FormModalUiHandler } from "./form-modal-ui-handler";
import { Button } from "#app/enums/buttons.js";
import { transferSave, transferLoad } from "#app/account";

export default class AdminUiHandler extends FormModalUiHandler {
    private scene: BattleScene;

  constructor(scene: BattleScene, mode: Mode | null = null) {
    super(scene, mode);
        this.scene = scene;
  }

  setup(): void {
    super.setup();
        this.setupTransferButtons();
  }

  getModalTitle(config?: ModalConfig): string {
    return "Admin panel";
  }

  getFields(config?: ModalConfig): string[] {
        return ["Username (Email)", "Password"];
  }

  getWidth(config?: ModalConfig): number {
        return 300;
  }

  getMargin(config?: ModalConfig): [number, number, number, number] {
    return [0, 0, 48, 0];
  }

  getButtonLabels(config?: ModalConfig): string[] {
        return ["Transfer SAVE", "Transfer LOAD", "Cancel"];
  }

    handleButtonClick(button: string): void {
        switch (button) {
            case "Transfer SAVE":
                this.promptTransferSave();
                break;
            case "Transfer LOAD":
                this.promptTransferLoad();
                break;
            case "Cancel":
                this.closeModal();
                break;
            default:
                break;
    }
  }

    private promptTransferSave(): void {
        const username = prompt("Enter your username (Email):");
        const password = prompt("Enter your password:");

        if (username && password) {
            this.handleTransferSave(username, password);
        } else {
            this.scene.ui.showText("Transfer SAVE failed. Username and password are required.", null, () => {}, null, true);
    }
  }

  show(args: any[]): boolean {
    if (super.show(args)) {
      const config = args[0] as ModalConfig;
      const originalSubmitAction = this.submitAction;
      this.submitAction = (_) => {
        this.submitAction = originalSubmitAction;
        this.scene.ui.setMode(Mode.LOADING, { buttonActions: [] });
        const onFail = error => {
          this.scene.ui.setMode(Mode.ADMIN, Object.assign(config, { errorMessage: error?.trim() }));
          this.scene.ui.playError();
        };
        if (!this.inputs[0].text) {
          return onFail("Username is required");
        }
        if (!this.inputs[1].text) {
          return onFail("Discord Id is required");
        }

        return false;
      };
      return true;
    }
    return false;

  }

    private promptTransferLoad(): void {
        const username = prompt("Enter your username (Email):");
        const password = prompt("Enter your password:");

        if (username && password) {
            this.handleTransferLoad(username, password);
        } else {
            this.scene.ui.showText("Transfer LOAD failed. Username and password are required.", null, () => {}, null, true);
        }
    }

    async handleTransferSave(username: string, password: string): Promise<void> {
        const systemData = this.scene.gameData.getSystemSaveData();
        const sessionData = this.scene.gameData.getSessionSaveData();

        const success = await transferSave(username, password, systemData, sessionData);
        if (success) {
            this.scene.ui.showText("Transfer SAVE successful.", null, () => {
            }, null, true);
        } else {
            this.scene.ui.showText("Transfer SAVE failed.", null, () => {
            }, null, true);
        }
    }

    async handleTransferLoad(username: string, password: string): Promise<void> {
        const data = await transferLoad(username, password);
        if (data) {
            const {systemData, sessionData} = data;
            const loadSuccess = await this.scene.gameData.initSystemWithStr(JSON.stringify(systemData), JSON.stringify(sessionData));
            if (loadSuccess) {
                this.scene.ui.showText("Transfer LOAD successful.", null, () => {
                }, null, true);
            } else {
                this.scene.ui.showText("Transfer LOAD failed. Data initialization error.", null, () => {}, null, true);
            }
        } else {
            this.scene.ui.showText("Transfer LOAD failed. No data found.", null, () => {
            }, null, true);
        }
    }

    private setupTransferButtons(): void {
        const transferSaveButton = this.scene.add.text(0, 0, "Transfer SAVE", { color: '#ffffff' })
            .setInteractive()
            .on('pointerdown', () => this.promptTransferSave());

        const transferLoadButton = this.scene.add.text(0, 40, "Transfer LOAD", { color: '#ffffff' })
            .setInteractive()
            .on('pointerdown', () => this.promptTransferLoad());

    }

  clear(): void {
    super.clear();
  }

    // closeModal(): void {
    //     this.clear();
    //     this.scene.ui.closeModal();
}
