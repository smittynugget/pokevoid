import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import UiHandler from "./ui-handler";
import { ModGlitchFormData } from "../data/mod-glitch-form-data";
import { OptionSelectConfig, OptionSelectItem } from "./abstact-option-select-ui-handler";
import i18next from "i18next";
import { modStorage } from "../system/mod-storage";
import { StoredMod } from "../system/mod-storage";
import { loadModGlitchFormFromJson } from "../data/mod-glitch-form-utils";
import * as Utils from "../utils";
import { Button } from "../enums/buttons";
import { GameDataType } from "../enums/game-data-type";

export default class ModManagementUiHandler extends UiHandler {
    private isUploading: boolean = false;
    private mods: StoredMod[] = [];
    private isIOS: boolean;
    
    constructor(scene: BattleScene) {
        super(scene, Mode.MOD_MANAGEMENT);
        this.isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    }
    
    setup(): void {
    }
    
    getWidth(): number {
        return 550;
    }
    
    getHeight(): number {
        return 650;
    }
    
    processInput(button: Button): boolean {
        return false;
    }
    
    show(args: any[] = []): boolean {
        super.show(args);
        
        const options: OptionSelectItem[] = [
            {
                label: i18next.t("modGlitchCreateFormUi:uploadMods"),
                handler: () => {
                    this.handleUploadMods();
                    return true;
                }
            },
            {
                label: i18next.t("modGlitchCreateFormUi:createGlitchEvolution"),
                handler: () => {
                    this.scene.ui.setOverlayMode(Mode.MOD_GLITCH_CREATE_FORM);
                    return true;
                }
            },
            {
                label: i18next.t("modGlitchCreateFormUi:shareAndTakeMods"),
                handler: () => {
                    window.open("https://discord.gg/cnfc8ESx7Z", "_blank");
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                    return true;
                }
            },
            {
                label: i18next.t("menuUiHandler:cancel"),
                handler: () => {
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                    return true;
                }
            }
        ];
        
        modStorage.getAllMods().then(mods => {
            if (mods.length > 0) {
                options.splice(2, 0, {
                    label: i18next.t("modGlitchCreateFormUi:removeMods"),
                    handler: () => {
                        this.showRemoveModsOptions();
                        return true;
                    }
                });
            }
            
            const config: OptionSelectConfig = {
                options: options,
                supportHover: true
            };
            
            this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, config);
        }).catch(error => {
            console.error("Error fetching mods:", error);
            const config: OptionSelectConfig = {
                options: options,
                supportHover: true
            };
            this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, config);
        });
        
        return true;
    }
    
    private handleUploadMods(): void {
        if (this.isUploading) return;
        this.isUploading = true;
        
        if (this.isIOS) {
            try {
                console.log("Attempting to load ImportDataFormUiHandler for iOS mod upload");
                import("../ui/import-data-form-ui-handler").then(module => {
                    console.log("ImportDataFormUiHandler module loaded successfully");
                    try {
                        const handler = new module.default(this.scene);
                        handler.setImportParameters(GameDataType.COMBINED, 0, true);
                        console.log("Setting mode to IMPORT_DATA_FORM for iOS mod upload");
                        this.scene.ui.setMode(Mode.IMPORT_DATA_FORM, GameDataType.COMBINED, 0, true);
                        this.isUploading = false;
                    } catch (e) {
                        console.error("Error instantiating ImportDataFormUiHandler:", e);
                        this.isUploading = false;
                        this.clear();
                        this.scene.ui.setMode(Mode.TITLE);
                    }
                }).catch(error => {
                    console.error("Failed to load ImportDataFormUiHandler:", error);
                    this.isUploading = false;
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                });
            } catch (e) {
                console.error("Error in iOS mod import handler logic:", e);
                this.isUploading = false;
                this.clear();
                this.scene.ui.setMode(Mode.TITLE);
            }
        } else {
            this.isUploading = false;
            this.handleUploadModsFallback();
            this.scene.ui.setMode(Mode.TITLE);
        }
    }
    
    private handleUploadModsFallback(): void {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        document.body.appendChild(fileInput);
        
        fileInput.addEventListener('change', async (event) => {
            this.isUploading = true;
            
            const files = fileInput.files;
            if (!files || files.length === 0) {
                this.isUploading = false;
                document.body.removeChild(fileInput);
                this.clear();
                this.scene.ui.setMode(Mode.TITLE); 
                return;
            }
            
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
            
            document.body.removeChild(fileInput);
            this.isUploading = false;

            
            
            await this.scene.gameData.saveAll(this.scene);
            
            const message = this.generateUploadResultMessage(successfulMods, failedMods);
            this.scene.ui.showText(message, null, () => {
                if (successfulMods.length > 0) {
                    window.location.reload();
                } else {
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                }
            });
        });
        
        fileInput.click();
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
    
    private generateUploadResultMessage(successfulMods: string[], failedMods: string[]): string {
        let message = "";
        
        if (successfulMods.length > 0) {
            message += i18next.t("modGlitchCreateFormUi:uploadSuccess", { count: successfulMods.length });
            if (successfulMods.length <= 5) {
                message += "\n• " + successfulMods.join("\n• ");
            }
            message += "\n\n";
        }
        
        if (failedMods.length > 0) {
            message += i18next.t("modGlitchCreateFormUi:uploadFailed", { count: failedMods.length });
            if (failedMods.length <= 5) {
                message += "\n• " + failedMods.join("\n• ");
            }
        }
        
        if (successfulMods.length > 0) {
            message += "\n\n" + i18next.t("modGlitchCreateFormUi:reloadRequired");
        }
        
        return message;
    }
    
    private async showRemoveModsOptions(): Promise<void> {
        try {
            this.mods = await modStorage.getAllMods();
            
            if (this.mods.length === 0) {
                this.scene.ui.showText(i18next.t("modGlitchCreateFormUi:noModsToRemove"), null, 
                    () => {
                        this.clear();
                        this.scene.ui.setMode(Mode.TITLE);
                    }, Utils.fixedInt(1500));
                return;
            }
            
            const modOptions = this.mods.map(mod => {
                return {
                    label: mod.formName,
                    handler: () => {
                        this.confirmRemoveMod(mod);
                        return true;
                    },
                    keepOpen: true
                };
            });
            
            modOptions.push({
                label: i18next.t("menuUiHandler:cancel"),
                handler: () => {
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                    return true;
                },
                keepOpen: true
            });
            
            this.scene.ui.setOverlayMode(Mode.MENU_OPTION_SELECT, {
                xOffset: -1,
                options: modOptions,
                maxOptions: 10,
                isRemoveItemsMenu: true
            });
            
        } catch (error) {
            console.error("Error loading mods for removal:", error);
            this.scene.ui.showText(i18next.t("modGlitchCreateFormUi:errorLoadingMods"), null, 
                () => {
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                });
        }
    }
    
    private confirmRemoveMod(mod: StoredMod): void {
        this.scene.ui.setOverlayMode(Mode.CONFIRM, 
            async () => {
                try {
                    await modStorage.deleteMod(mod.id);
                    
                    const index = this.scene.gameData.testSpeciesForMod.indexOf(mod.speciesId);
                    if (index !== -1) {
                        this.scene.gameData.testSpeciesForMod.splice(index, 1);
                        await this.scene.gameData.saveAll(this.scene, true);
                    }
                    
                    this.scene.ui.showText(i18next.t("modGlitchCreateFormUi:modRemoved", { name: mod.formName }), null, 
                        () => {
                            window.location.reload();
                        });
                } catch (error) {
                    console.error("Error removing mod:", error);
                    this.scene.ui.showText(i18next.t("modGlitchCreateFormUi:errorRemovingMod"), null, 
                        () => {
                            this.clear();
                            this.scene.ui.setMode(Mode.TITLE);
                        });
                }
                return true;
            }, 
            () => {
                this.clear();
                this.scene.ui.setMode(Mode.TITLE);
                return true;
            },
            false,
            -98,
            32,
            500
        );
    }

    clear(): void {
        this.isUploading = false;
        super.clear();
    }
} 