import i18next from "i18next";
import BattleScene from "../battle-scene";
import { FormModalConfig, FormModalUiHandler } from "./form-modal-ui-handler";
import { Mode } from "./ui";
import { ModGlitchFormData } from "../data/mod-glitch-form-data";
import { loadModGlitchFormFromJson } from "../data/mod-glitch-form-utils";
import { ModalConfig } from "./modal-ui-handler";
import { TextStyle, addTextObject } from "./text";
import { modStorage } from "../system/mod-storage";


export default class ModGlitchFormUiHandler extends FormModalUiHandler {
    private jsonData: any = null;
    
    private isUploading: boolean = false;
    private uploadError: string | null = null;
    
    private formFields: { [key: string]: { 
        element: Phaser.GameObjects.GameObject,
        input?: HTMLInputElement,
        setValue: (value: string) => void,
        setVisible?: (visible: boolean) => void
    } } = {};
    
    constructor(scene: BattleScene) {
        super(scene);
    }
    
    getModalTitle(): string {
        return "Upload Glitch Form Mod";
    }
    
    getWidth(): number {
        return 480;
    }
    
    getHeight(): number {
        return 280;
    }
    
    getMargin(): [number, number, number, number] {
        return [0, 0, 48, 0];
    }
    
    getFields(): string[] {
        return ["JSON Configuration", "Status"];
    }
    
    getButtonLabels(): string[] {
        return ["Upload", "Cancel"];
    }
    
    async handleButtonPress(index: number): Promise<boolean> {
        if (index === 0) {
            return this.uploadMod();
        } else {
            this.clear();
            this.scene.ui.revertMode();
            return true;
        }
    }
    
    setup(): void {
        super.setup();
        
        this.setupFileInputs();
    }
    
    private setupFileInputs(): void {
        const hasTitle = !!this.getModalTitle();
        const startY = hasTitle ? 31 : 5;
        
        const instructions = addTextObject(
            this.scene, 
            10, 
            startY - 15, 
            "Upload a JSON file with glitch form data including embedded sprite data", 
            TextStyle.TOOLTIP_CONTENT
        );
        this.modalContainer.add(instructions);
        
        this.createFileInput("jsonFile", "JSON Configuration", startY + 20, ".json", this.handleJsonFileChange.bind(this));
        
        const statusField = addTextObject(
            this.scene,
            10,
            startY + 80,
            "",
            TextStyle.TOOLTIP_CONTENT
        );
        statusField.setColor("#FF0000");
        statusField.setVisible(false);
        this.modalContainer.add(statusField);
        this.formFields["status"] = { 
            element: statusField, 
            setValue: (text) => statusField.setText(text),
            setVisible: (visible) => statusField.setVisible(visible)
        };
        
        const formatNote = addTextObject(
            this.scene,
            10,
            startY + 50,
            "JSON must include embedded sprites in base64 format",
            TextStyle.TOOLTIP_CONTENT
        );
        formatNote.setColor("#AAAAAA");
        this.modalContainer.add(formatNote);
        
        const langNote = addTextObject(
            this.scene,
            10,
            startY + 65,
            "Include a 'lang' object for localized names",
            TextStyle.TOOLTIP_CONTENT
        );
        langNote.setColor("#AAAAAA");
        this.modalContainer.add(langNote);
    }
    
    private createFileInput(key: string, label: string, y: number, accept: string, onChange: (event: Event) => void): void {
        const labelText = addTextObject(
            this.scene,
            10,
            y,
            label,
            TextStyle.TOOLTIP_CONTENT
        );
        this.modalContainer.add(labelText);
        
        const fileButton = addTextObject(
            this.scene,
            250,
            y,
            "Select File",
            TextStyle.TOOLTIP_CONTENT
        );
        fileButton.setInteractive({ useHandCursor: true });
        
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.style.display = "none";
        input.addEventListener("change", onChange);
        document.body.appendChild(input);
        
        fileButton.on("pointerdown", () => {
            input.click();
        });
        
        this.modalContainer.add(fileButton);
        
        this.formFields[key] = {
            element: fileButton,
            input: input,
            setValue: (text) => {
                if (text) {
                    fileButton.setText(text);
                } else {
                    fileButton.setText("Select File");
                }
            },
            setVisible: (visible) => {
                fileButton.setVisible(visible);
                labelText.setVisible(visible);
            }
        };
    }
    
    private handleJsonFileChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        const files = input.files;
        
        if (files && files[0]) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const json = JSON.parse(e.target?.result as string);
                    
                    if (!this.validateJsonFormat(json)) {
                        this.updateStatus("Invalid JSON format. Please check the required fields and sprite data.");
                        this.jsonData = null;
                        return;
                    }
                    
                    this.jsonData = json;
                    this.updateStatus(null);
                    const field = this.formFields["jsonFile"];
                    if (field) {
                        field.setValue(files[0].name);
                    }
                    this.validateForm();
                } catch (error) {
                    this.updateStatus("Error parsing JSON file. Please check the format.");
                    this.jsonData = null;
                }
            };
            reader.readAsText(files[0]);
        } else {
            this.jsonData = null;
        }
    }
    
    private validateJsonFormat(json: any): boolean {
        if (!json.speciesId || !json.formName || !json.primaryType || !json.abilities || !json.stats) {
            return false;
        }
        
        if (!json.sprites || !json.sprites.front) {
            return false;
        }
        
        if (typeof json.sprites.front !== 'string') {
            return false;
        }
        
        if (json.sprites.back && typeof json.sprites.back !== 'string') {
            return false;
        }
        
        return true;
    }
    
    private validateForm(): void {
        const canUpload = !!this.jsonData;
        this.updateButtons(canUpload);
    }
    
    private updateStatus(message: string | null): void {
        this.uploadError = message;
        const statusField = this.formFields["status"];
        
        if (statusField && statusField.setVisible) {
            if (message) {
                statusField.setValue(message);
                statusField.setVisible(true);
            } else {
                statusField.setVisible(false);
            }
        }
    }
    
    private updateButtons(canUpload: boolean): void {
        if (this.buttonBgs && this.buttonBgs.length > 0) {
            this.buttonBgs[0].setInteractive(canUpload);
            this.buttonBgs[0].setAlpha(canUpload ? 1.0 : 0.5);
        }
    }
    
    private async uploadMod(): Promise<boolean> {
        if (this.isUploading || !this.jsonData) {
            return false;
        }
        
        this.isUploading = true;
        this.updateStatus("Uploading and registering mod...");
        this.updateButtons(false);
        
        try {
            const success = await loadModGlitchFormFromJson(this.scene, this.jsonData);
            
            if (success) {
                try {
                    await modStorage.storeMod({
                        speciesId: this.jsonData.speciesId,
                        formName: this.jsonData.formName,
                        jsonData: this.jsonData,
                        spriteData: this.jsonData.sprites.front,
                        iconData: this.jsonData.sprites.icon || this.jsonData.sprites.front
                    });
                    
                    this.scene.gameData.gameStats.glitchModsUploaded++;
                    
                    this.scene.ui.showText(
                        "Glitch form mod uploaded and saved successfully!",
                        null,
                        () => {
                            this.clear();
                            this.scene.ui.revertMode();
                        }
                    );
                    return true;
                } catch (storageError) {
                    console.error("Error storing mod:", storageError);
                    this.updateStatus("Mod loaded but not saved to storage. It will be lost on refresh.");
                    return false;
                }
            } else {
                this.updateStatus("Failed to register glitch form. Check console for details.");
                return false;
            }
        } catch (error) {
            console.error("Error uploading mod:", error);
            this.updateStatus(`Error: ${error.message || "Unknown error"}`);
            return false;
        } finally {
            this.isUploading = false;
            this.updateButtons(true);
        }
    }
    
    clear(): void {
        Object.values(this.formFields).forEach(field => {
            if (field.input) {
                document.body.removeChild(field.input);
            }
        });
        
        this.jsonData = null;
        this.formFields = {};
        
        super.clear();
    }
} 