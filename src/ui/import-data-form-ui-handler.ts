import { FormModalUiHandler } from "./form-modal-ui-handler";
import { Mode } from "./ui";
import BattleScene from "../battle-scene";
import { ModalConfig } from "./modal-ui-handler";
import { GameDataType } from "../enums/game-data-type";
import InputText from "phaser3-rex-plugins/plugins/inputtext";
import { TextStyle, addTextObject } from "./text";
import { WindowVariant, addWindow } from "./ui-theme";
import i18next from "i18next";
import { loadModGlitchFormFromJson } from "../data/mod-glitch-form-utils";
import { modStorage } from "../system/mod-storage";

export default class ImportDataFormUiHandler extends FormModalUiHandler {
    private dataType: GameDataType;
    private slotId: number;
    private isIOS: boolean;
    private fileInputElement: HTMLInputElement | null = null;
    private fileInputContainer: HTMLDivElement | null = null;
    private customOverlay: HTMLDivElement | null = null;
    private isModImport: boolean = false;

    constructor(scene: BattleScene) {
        super(scene, Mode.IMPORT_DATA_FORM);
        this.dataType = GameDataType.COMBINED;
        this.slotId = 0;
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        console.log("ImportDataFormUiHandler created, isIOS:", this.isIOS);
    }

    setup(): void {
        super.setup();
    }

    protected getInputPosition(): { x: number, y: number } {
        return {
            x: 70,
            y: 28
        };
    }

    protected getInputConfig(field: string): InputText.IConfig {
        return {
            type: "text",
            maxLength: 18
        };
    }

    getModalTitle(config?: ModalConfig): string {
        return this.isModImport ? i18next.t("importData:importModData") : i18next.t("importData:importSaveData");
    }

    getFields(config?: ModalConfig): string[] {
        return [];
    }

    getWidth(config?: ModalConfig): number {
        return 200;
    }

    getHeight(config?: ModalConfig): number {
        return 120;
    }

    getMargin(config?: ModalConfig): [number, number, number, number] {
        return [0, 0, 48, 0];
    }

    getButtonLabels(config?: ModalConfig): string[] {
        return [i18next.t("importData:cancel")];
    }

    handleButtonClick(button: string): void {
        switch (button) {
            case i18next.t("importData:cancel"):
                this.onCancel();
                break;
            default:
                break;
        }
    }

    setImportParameters(dataType: GameDataType, slotId: number = 0, isModImport: boolean = false): void {
        this.dataType = dataType;
        this.slotId = slotId;
        this.isModImport = isModImport;
    }
    
    private createInGameFileInput(): void {
        this.removeFileInput();
        
        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '50%';
        overlay.style.top = '50%';
        overlay.style.transform = 'translate(-50%, -50%)';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        overlay.style.padding = '20px';
        overlay.style.borderRadius = '5px';
        overlay.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        overlay.style.zIndex = '1000';
        overlay.style.minWidth = '250px';
        overlay.style.textAlign = 'center';
        
        const title = document.createElement('h3');
        title.textContent = this.isModImport ? i18next.t("importData:importModData") : i18next.t("importData:importSaveData");
        title.style.color = 'white';
        title.style.margin = '0 0 15px 0';
        title.style.fontFamily = 'monospace, Arial';
        overlay.appendChild(title);
        
        const fileInputContainer = document.createElement('div');
        fileInputContainer.style.position = 'relative';
        fileInputContainer.style.width = '120px';
        fileInputContainer.style.height = '30px';
        fileInputContainer.style.margin = '0 auto 15px auto';
        fileInputContainer.style.backgroundColor = '#4a90e2';
        fileInputContainer.style.borderRadius = '5px';
        fileInputContainer.style.cursor = 'pointer';
        fileInputContainer.style.overflow = 'hidden';
        fileInputContainer.style.border = '2px solid white';
        
        const label = document.createElement('div');
        label.textContent = i18next.t("importData:selectFile");
        label.style.position = 'absolute';
        label.style.top = '0';
        label.style.left = '0';
        label.style.width = '100%';
        label.style.height = '100%';
        label.style.lineHeight = '30px';
        label.style.color = 'white';
        label.style.textAlign = 'center';
        label.style.fontFamily = 'monospace, Arial';
        label.style.fontSize = '14px';
        label.style.pointerEvents = 'none';
        fileInputContainer.appendChild(label);
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = this.isModImport ? '.json' : '.prsv';
        fileInput.multiple = this.isModImport;
        fileInput.style.position = 'absolute';
        fileInput.style.top = '0';
        fileInput.style.left = '0';
        fileInput.style.width = '100%';
        fileInput.style.height = '100%';
        fileInput.style.opacity = '0';
        fileInput.style.cursor = 'pointer';
        fileInput.style.fontSize = '100px';
        
        const infoText = document.createElement('p');
        infoText.textContent = this.isModImport 
            ? i18next.t("importData:selectJsonModFiles") 
            : i18next.t("importData:selectPrsvSaveFile");
        infoText.style.color = 'white';
        infoText.style.fontFamily = 'monospace, Arial';
        infoText.style.fontSize = '12px';
        infoText.style.margin = '0 0 15px 0';
        overlay.appendChild(infoText);
        
        fileInput.addEventListener('change', (e: Event) => {
            this.handleFileSelected(e);
            overlay.remove();
        });
        
        fileInputContainer.appendChild(fileInput);
        overlay.appendChild(fileInputContainer);
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = i18next.t("importData:cancel");
        cancelButton.style.padding = '8px 15px';
        cancelButton.style.backgroundColor = 'transparent';
        cancelButton.style.border = '2px solid white';
        cancelButton.style.borderRadius = '5px';
        cancelButton.style.color = 'white';
        cancelButton.style.fontFamily = 'monospace, Arial';
        cancelButton.style.fontSize = '14px';
        cancelButton.style.cursor = 'pointer';
        cancelButton.onclick = () => {
            overlay.remove();
            this.onCancel();
        };
        overlay.appendChild(cancelButton);
        
        this.fileInputElement = fileInput;
        this.fileInputContainer = fileInputContainer;
        this.customOverlay = overlay;
        
        document.body.appendChild(overlay);
        
        this.applyGameStylingToOverlay(overlay);
    }
    
    private applyGameStylingToOverlay(overlay: HTMLDivElement): void {
        const canvas = this.scene.game.canvas;
        const bounds = canvas.getBoundingClientRect();
        
        overlay.style.backgroundColor = '#000000';
        overlay.style.border = '2px solid white';
        overlay.style.boxShadow = '0 0 10px rgba(255, 255, 255, 0.3)';
        overlay.style.color = 'white';
        
        if (bounds) {
            overlay.style.maxWidth = `${Math.min(300, bounds.width * 0.8)}px`;
        }
    }
    
    private removeFileInput(): void {
        if (this.customOverlay) {
            if (this.customOverlay.parentNode) {
                this.customOverlay.remove();
            }
            this.customOverlay = null;
            this.fileInputContainer = null;
            this.fileInputElement = null;
        }
    }
    
    private async handleFileSelected(e: Event): Promise<void> {
        const files = (e.target as HTMLInputElement).files;
        if (!files || files.length === 0) return;

        if (this.isModImport) {
            await this.handleModFilesSelected(files);
        } else {
            this.handleSaveFileSelected(files[0]);
        }
    }

    private handleSaveFileSelected(file: File): void {
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const encryptedData = event.target?.result?.toString() || "";
                    this.scene.gameData.processImportedData(encryptedData, this.dataType, this.slotId);
                    this.clear();
                    this.getUi().setMode(Mode.MESSAGE);
                } catch (ex) {
                    console.error("Import error:", ex);
                    this.scene.ui.showText(
                        i18next.t("importData:importFailed"),
                        null,
                        () => this.scene.ui.showText("", 0),
                        null,
                        true
                    );
                }
            };
            reader.readAsText(file);
        }
    }

    private async handleModFilesSelected(files: FileList): Promise<void> {
        const successfulMods = [];
        const failedMods = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            try {
                const jsonData = await this.readFileAsJson(file);
                const success = await loadModGlitchFormFromJson(this.scene, jsonData);
                
                if (success) {
                    try {
                        await modStorage.storeMod({
                            speciesId: jsonData.speciesId,
                            formName: jsonData.formName,
                            jsonData,
                            spriteData: jsonData.sprites.front,
                            iconData: jsonData.sprites.icon || jsonData.sprites.front
                        });
                        
                        successfulMods.push(jsonData.formName);
                    } catch (storageError) {
                        console.error("Error storing mod:", storageError);
                        failedMods.push(`${jsonData.formName} (storage error)`);
                    }
                } else {
                    failedMods.push(`${jsonData.formName || file.name} (invalid format)`);
                }
            } catch (error) {
                console.error("Error processing mod file:", error);
                failedMods.push(`${file.name} (${error.message || "unknown error"})`);
            }
        }

        await this.scene.gameData.saveAll(this.scene);
        
        
        const message = this.generateModUploadResultMessage(successfulMods, failedMods);
        this.clear();
        this.getUi().setMode(Mode.MESSAGE);
        
        this.scene.ui.showText(message, null, () => {
            if (successfulMods.length > 0) {
                window.location.reload();
            } else {
                this.scene.ui.setMode(Mode.TITLE);
            }
        });
    }

    private async readFileAsJson(file: File): Promise<any> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const jsonData = JSON.parse(event.target.result as string);
                    resolve(jsonData);
                } catch (error) {
                    reject(new Error(`Invalid JSON format in file ${file.name}`));
                }
            };
            reader.onerror = () => reject(new Error(`Failed to read file ${file.name}`));
            reader.readAsText(file);
        });
    }

    private generateModUploadResultMessage(successfulMods: string[], failedMods: string[]): string {
        let message = "";
        
        if (successfulMods.length > 0) {
            message += i18next.t("importData:uploadSuccess", { count: successfulMods.length });
            if (successfulMods.length <= 5) {
                message += "\n• " + successfulMods.join("\n• ");
            }
            message += "\n\n";
        }
        
        if (failedMods.length > 0) {
            message += i18next.t("importData:uploadFailed", { count: failedMods.length });
            if (failedMods.length <= 5) {
                message += "\n• " + failedMods.join("\n• ");
            }
        }
        
        if (successfulMods.length > 0) {
            message += "\n\n" + i18next.t("importData:reloadRequired");
        }
        
        return message;
    }

    async onSubmit(values: string[]): Promise<void> {
        if (this.isModImport || this.isIOS) {
            this.createInGameFileInput();
        } else {
            this.scene.gameData.importData(this.dataType, this.slotId);
        }
        this.clear();
        this.getUi().setMode(Mode.MESSAGE);
    }

    private onCancel(): void {
        console.log("Import cancelled");
        this.removeFileInput();
        this.clear();
        if(this.isModImport) {
            this.getUi().setMode(Mode.TITLE);
        } else {
            this.getUi().setMode(Mode.MENU);
        }
    }

    show(args: any[]): boolean {
        console.log("ImportDataFormUiHandler show method called with args:", args);
        
        if (!this.modalContainer) {
            console.warn("modalContainer not initialized, setting up handler");
            this.setup();
        }
        
        if (args && args.length > 0 && args[0] === 'mod') {
            this.setImportParameters(GameDataType.COMBINED, 0, true);
            console.log("Set for mod import");
            
            const buttonLabels = this.getButtonLabels();
            const config: ModalConfig = {
                buttonActions: buttonLabels.map(label => () => this.handleButtonClick(label))
            };
            args = [config];
        }
        else if (args && args.length === 1 && typeof args[0] === 'number') {
            const dataType = args[0] as GameDataType;
            this.setImportParameters(dataType, 0, false);
            console.log("Set import parameters from numeric arg:", { dataType, slotId: 0 });
            
            const buttonLabels = this.getButtonLabels();
            const config: ModalConfig = {
                buttonActions: buttonLabels.map(label => () => this.handleButtonClick(label))
            };
            args = [config];
        }
        else if (args && args.length >= 2) {
            const dataType = args[0] as GameDataType;
            const slotId = args[1] as number;
            const isModImport = args.length >= 3 ? !!args[2] : false;
            this.setImportParameters(dataType, slotId, isModImport);
            console.log("Set import parameters:", { dataType, slotId, isModImport });
        }
        
        if (!args || !args.length || !args[0] || typeof args[0] !== 'object' || !("buttonActions" in args[0])) {
            console.log("Creating default buttonActions config");
            const buttonLabels = this.getButtonLabels();
            const config: ModalConfig = {
                buttonActions: buttonLabels.map(label => () => this.handleButtonClick(label))
            };
            args = [config];
        }
        
        try {
            if (this.isIOS || this.isModImport) {
                const result = super.show(args);
                
                setTimeout(() => {
                    this.createInGameFileInput();
                    if (this.modalContainer) {
                        this.modalContainer.setVisible(false);
                    }
                }, 100);
                
                return result;
            } else {
                return super.show(args);
            }
        } catch (error) {
            console.error("Error in ImportDataFormUiHandler.show:", error);
            this.onCancel();
            return false;
        }
    }
    
    clear(): void {
        super.clear();
        this.removeFileInput();
    }
} 