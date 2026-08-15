import BattleScene from "../battle-scene";
import { Mode } from "./mode";
import UiHandler from "./ui-handler";
import { ModGlitchFormData } from "../data/mod-glitch-form-data";
import { OptionSelectConfig, OptionSelectItem } from "./abstact-option-select-ui-handler";
import { TextStyle } from "./text";
import i18next from "i18next";
import { modStorage } from "../system/mod-storage";
import { StoredMod } from "../system/mod-storage";
import { loadModGlitchFormFromJson } from "../data/mod-glitch-form-utils";
import * as Utils from "../utils";
import { Button } from "../enums/buttons";
import { GameDataType } from "../enums/game-data-type";
import { Species } from "../enums/species";

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
                label: i18next.t("modGlitchCreateFormUi:createGlitchEvolution"),
                handler: () => {
                    this.scene.ui.setOverlayMode(Mode.MOD_GLITCH_CREATE_FORM);
                    return true;
                },
                textStyle: TextStyle.SUMMARY_GOLD
            },
            {
                label: i18next.t("modGlitchCreateFormUi:browseUserMods"),
                handler: () => {
                    window.open("https://void.scooom.xyz/gallery.html", "_blank");
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                    return true;
                }
            },
            {
                label: i18next.t("modGlitchCreateFormUi:uploadMods"),
                handler: () => {
                    this.handleUploadMods();
                    return true;
                }
            },
            {
                label: i18next.t("modGlitchCreateFormUi:showOffYourMods"),
                handler: () => {
                    window.open("https://discord.gg/cnfc8ESx7Z", "_blank");
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                    return true;
                }
            },
            {
                label: i18next.t("modGlitchCreateFormUi:gatchaCalendar"),
                handler: () => {
                    window.open("https://void.scooom.xyz/gacha.html", "_blank");
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                    return true;
                }
            },
            {
                label: i18next.t("modGlitchCreateFormUi:browseGlitchForms"),
                handler: () => {
                    window.open("https://void.scooom.xyz/galleryCore.html", "_blank");
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
                options.splice(6, 0, {
                    label: i18next.t("modGlitchCreateFormUi:downloadYourMods"),
                    handler: () => {
                        this.showDownloadModsOptions();
                        return true;
                    },
                    keepOpen: true
                });
                options.splice(7, 0, {
                    label: i18next.t("modGlitchCreateFormUi:removeMods"),
                    handler: () => {
                        this.showRemoveModsOptions();
                        return true;
                    }
                });
            }

            const config: OptionSelectConfig = {
                options: options,
                supportHover: true,
                useTextHeight: true
            };

            this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, config);
        }).catch(error => {
            console.error("Error fetching mods:", error);
            const config: OptionSelectConfig = {
                options: options,
                supportHover: true,
                useTextHeight: true
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

    private async showDownloadModsOptions(): Promise<void> {
        const mods = await modStorage.getAllMods();
        if (mods.length === 0) {
            this.scene.ui.showText(
                i18next.t("modGlitchCreateFormUi:noModsToDownload"), null,
                () => {
                    this.clear();
                    this.scene.ui.setMode(Mode.TITLE);
                }, Utils.fixedInt(1500));
            return;
        }

        const options: OptionSelectItem[] = [
            {
                label: i18next.t("modGlitchCreateFormUi:downloadAll"),
                handler: () => {
                    this.downloadAllModsAsZip(mods);
                    return true;
                }
            },
            {
                label: i18next.t("modGlitchCreateFormUi:downloadSelected"),
                handler: () => {
                    this.showSelectModForDownload(mods);
                    return true;
                },
                keepOpen: true
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

        this.scene.ui.setOverlayMode(Mode.OPTION_SELECT, {
            options,
            supportHover: true
        });
    }

    private showSelectModForDownload(mods: StoredMod[]): void {
        const modOptions: OptionSelectItem[] = mods.map(mod => ({
            label: mod.formName,
            handler: () => {
                this.downloadSingleMod(mod);
                return true;
            },
            keepOpen: true
        }));

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
    }

    private downloadSingleMod(mod: StoredMod): void {
        try {
            const speciesKey = Object.keys(Species).find(k => Species[k] === mod.speciesId);
            const speciesName = speciesKey
                ? i18next.t(`species:${speciesKey.toLowerCase()}`)
                : String(mod.speciesId);
            const filename = `${speciesName.toLowerCase()}_${mod.formName.toLowerCase().replace(/\s+/g, '_')}_mod.json`;
            const blob = new Blob(
                [JSON.stringify(mod.jsonData, null, 2)],
                { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);

            this.scene.ui.showText(
                i18next.t("modGlitchCreateFormUi:downloadStarted"), null,
                () => this.scene.ui.showText(""),
                Utils.fixedInt(1500)
            );
        } catch (e) {
            console.error("Error downloading mod:", e);
            this.scene.ui.showText(
                i18next.t("modGlitchCreateFormUi:downloadFailed"), null,
                () => this.scene.ui.showText(""),
                Utils.fixedInt(1500)
            );
        }
    }

    private downloadAllModsAsZip(mods: StoredMod[]): void {
        try {
            const files: { name: string; data: Uint8Array }[] = mods.map(mod => {
                const speciesKey = Object.keys(Species).find(k => Species[k] === mod.speciesId);
                const speciesName = speciesKey
                    ? i18next.t(`species:${speciesKey.toLowerCase()}`)
                    : String(mod.speciesId);
                const filename = `${speciesName.toLowerCase()}_${mod.formName.toLowerCase().replace(/\s+/g, '_')}_mod.json`;
                const content = new TextEncoder().encode(JSON.stringify(mod.jsonData, null, 2));
                return { name: filename, data: content };
            });

            const zipBlob = this.buildZipBlob(files);
            const url = URL.createObjectURL(zipBlob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "pokevoid_mods.zip";
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 0);

            this.scene.ui.showText(
                i18next.t("modGlitchCreateFormUi:downloadStarted"), null,
                () => this.scene.ui.showText(""),
                Utils.fixedInt(1500)
            );

            this.clear();
            this.scene.ui.setMode(Mode.TITLE);
        } catch (e) {
            console.error("Error creating ZIP:", e);
            this.scene.ui.showText(
                i18next.t("modGlitchCreateFormUi:downloadFailed"), null,
                () => this.scene.ui.showText(""),
                Utils.fixedInt(1500)
            );
        }
    }

    private buildZipBlob(files: { name: string; data: Uint8Array }[]): Blob {
        const pako = (window as any).pako;
        const parts: Uint8Array[] = [];
        const centralDir: Uint8Array[] = [];
        let offset = 0;

        for (const file of files) {
            const nameBytes = new TextEncoder().encode(file.name);
            const compressed = pako.deflateRaw(file.data);

            const localHeader = new Uint8Array(30 + nameBytes.length);
            const lhView = new DataView(localHeader.buffer);
            lhView.setUint32(0, 0x04034b50, true);
            lhView.setUint16(4, 20, true);
            lhView.setUint16(8, 8, true);
            lhView.setUint16(14, 0, true);
            lhView.setUint16(16, 0, true);
            lhView.setUint32(18, this.crc32(file.data), true);
            lhView.setUint32(22, compressed.length, true);
            lhView.setUint32(26, file.data.length, true);
            lhView.setUint16(28, nameBytes.length, true);
            localHeader.set(nameBytes, 30);

            parts.push(localHeader);
            parts.push(compressed);

            const cdEntry = new Uint8Array(46 + nameBytes.length);
            const cdView = new DataView(cdEntry.buffer);
            cdView.setUint32(0, 0x02014b50, true);
            cdView.setUint16(4, 20, true);
            cdView.setUint16(6, 20, true);
            cdView.setUint16(10, 8, true);
            cdView.setUint32(16, this.crc32(file.data), true);
            cdView.setUint32(20, compressed.length, true);
            cdView.setUint32(24, file.data.length, true);
            cdView.setUint16(28, nameBytes.length, true);
            cdView.setUint32(42, offset, true);
            cdEntry.set(nameBytes, 46);
            centralDir.push(cdEntry);

            offset += localHeader.length + compressed.length;
        }

        const cdOffset = offset;
        let cdSize = 0;
        for (const cd of centralDir) {
            parts.push(cd);
            cdSize += cd.length;
        }

        const endRecord = new Uint8Array(22);
        const endView = new DataView(endRecord.buffer);
        endView.setUint32(0, 0x06054b50, true);
        endView.setUint16(8, files.length, true);
        endView.setUint16(10, files.length, true);
        endView.setUint32(12, cdSize, true);
        endView.setUint32(16, cdOffset, true);
        parts.push(endRecord);

        return new Blob(parts, { type: "application/zip" });
    }

    private crc32(data: Uint8Array): number {
        let crc = 0xFFFFFFFF;
        for (let i = 0; i < data.length; i++) {
            crc ^= data[i];
            for (let j = 0; j < 8; j++) {
                crc = (crc >>> 1) ^ (crc & 1 ? 0xEDB88320 : 0);
            }
        }
        return (crc ^ 0xFFFFFFFF) >>> 0;
    }

    clear(): void {
        this.isUploading = false;
        super.clear();
    }
}