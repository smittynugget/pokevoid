import i18next from "i18next";
import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import { ModGlitchFormData, StatDistributionType } from "../data/mod-glitch-form-data";
import { loadModGlitchFormFromJson } from "../data/mod-glitch-form-utils";
import { modStorage } from "../system/mod-storage";
import { Species } from "../enums/species";
import { Abilities } from "../enums/abilities";
import { Type } from "../data/type";
import { Stat } from "../enums/stat";
import { getAllRivalTrainerTypes } from "../data/trainer-config";
import { Button } from "../enums/buttons";
import UiHandler from "./ui-handler";
import { TrainerType } from "../enums/trainer-type";
import { getPokemonSpecies } from "../data/pokemon-species";
import { distributeStatIncrease, calculateTotalIncrease, StatIndex } from "../data/mod-glitch-form-utils";
import { REMOVED_ABILITIES } from "../modifier/modifier-type";

const DEBUG_FORM_UI = true;

interface FormField {
    element?: Phaser.GameObjects.GameObject;
    input?: HTMLElement;
    value?: any;
    isValid?: boolean;
    setValue: (value: any) => void;
    getValue: () => any;
    setVisible?: (visible: boolean) => void;
    validate?: () => boolean;
}

export default class ModGlitchCreateFormUiHandler extends UiHandler {
    private formData: Partial<ModGlitchFormData> = {};
    private formFields: { [key: string]: FormField } = {};
    private isCreating: boolean = false;
    private statusMessage: string | null = null;
    private createdModData: any = null;
    private formOverlay: HTMLDivElement | null = null;
    private formContainer: HTMLDivElement | null = null;
    private resizeHandler: () => void;
    private wheelHandler: (event: WheelEvent) => void | null = null;
    
    constructor(scene: BattleScene) {
        super(scene, Mode.MOD_GLITCH_CREATE_FORM);
        this.formData = {};
        this.formFields = {};
        this.isCreating = false;
        this.statusMessage = null;
        this.createdModData = null;
    }
    
    getModalTitle(): string {
        return i18next.t("modGlitchCreateFormUi:title");
    }
    
    getWidth(): number {
        return 550;
    }
    
    getHeight(): number {
        return 650;
    }
    
    getButtonLabels(): string[] {
        return [
            i18next.t("modGlitchCreateFormUi:buttons.saveAndAdd"),
            i18next.t("modGlitchCreateFormUi:buttons.cancel")
        ];
    }
    
    async handleButtonPress(index: number): Promise<boolean> {
        if (index === 0) {
            return this.createAndSaveMod();
        } else {
            this.clear();
            this.scene.ui.setMode(Mode.TITLE);
            return true;
        }
    }
    
    setup(): void {
        console.log("ModGlitchCreateFormUiHandler: Setup method called");
    }
    
    show(args: any[] = []): boolean {
        console.log("ModGlitchCreateFormUiHandler: Show method called", args);
        
        this.createFormOverlay();
        
        return true;
    }
    
    handleModeChange(...args: any[]): boolean {
        console.log("ModGlitchCreateFormUiHandler: handleModeChange called with args:", args);
        return this.show(args);
    }
    
    processInput(button: Button): boolean {
        console.log("ModGlitchCreateFormUiHandler: processInput called with button:", button);

        if (button === Button.CANCEL) {
            if (this.formContainer && this.formContainer.contains(document.activeElement) &&
                (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'BUTTON' || document.activeElement.tagName === 'TEXTAREA')) {
                console.log("Cancel button ignored because an input field is focused.");
                return true; 
            }

            this.clear();
            this.scene.ui.setMode(Mode.TITLE);
            return true;
        }

        return false;
    }
    
    clear(): void {
        console.log("ModGlitchCreateFormUiHandler: clear method called");
        
        this.removeFormOverlay();
        
        this.formFields = {};
        this.formData = {};
        this.isCreating = false;
        this.statusMessage = null;
    }
    
    private updateStatus(message: string | null): void {
        this.statusMessage = message;
        const statusField = this.formFields["status"];
        
        if (statusField) {
            if (message) {
                statusField.setValue(message);
                statusField.setVisible(true);
            } else {
                statusField.setVisible(false);
            }
        }
    }
    
    private validateForm(): boolean {
        let isValid = true;
        
        Object.values(this.formFields).forEach(field => {
            if (field.validate && !field.validate()) {
                isValid = false;
            }
        });
        
        const stat1 = this.formFields["stat1"].getValue();
        const stat2 = this.formFields["stat2"].getValue();
        const stat3 = this.formFields["stat3"].getValue();

        const selectedStats = [stat1, stat2, stat3].filter(stat => stat !== "" && stat !== undefined && stat !== null);
        const uniqueStats = new Set(selectedStats);

        if (selectedStats.length !== uniqueStats.size) {
             this.updateStatus(i18next.t("modGlitchCreateFormUi:validation.uniqueStats"));
             isValid = false;
        } else {
             const statusField = this.formFields["status"];
             if (statusField && statusField.getValue() === i18next.t("modGlitchCreateFormUi:validation.uniqueStats")) {
                 this.updateStatus(null);
             }
        }

        if (!isValid) {
             
             if (!this.statusMessage || this.statusMessage === i18next.t("modGlitchCreateFormUi:validation.uniqueStats")) {
                  
                 const otherValidationFailed = Object.values(this.formFields).some(field => field.validate && !field.validate());
                 if (otherValidationFailed && this.statusMessage !== i18next.t("modGlitchCreateFormUi:validation.requiredField")) {
                      this.updateStatus(i18next.t("modGlitchCreateFormUi:validation.requiredField"));
                 } else if (!otherValidationFailed && this.statusMessage === i18next.t("modGlitchCreateFormUi:validation.uniqueStats")) {
                     
                      this.updateStatus(i18next.t("modGlitchCreateFormUi:validation.uniqueStats"));
                 } else if (!this.statusMessage) {
                     
                      this.updateStatus(i18next.t("modGlitchCreateFormUi:validation.requiredField"));
                 }
             }
        } else {
             
             this.updateStatus(null);
        }

        return isValid;
    }
    
    private async createAndSaveMod(): Promise<boolean> {
        if (this.isCreating) {
            return false;
        }
        
        
        if (!this.validateForm()) {
            this.updateStatus(i18next.t("modGlitchCreateFormUi:validation.requiredField"));
            return false;
        }
        
        this.isCreating = true;
        this.updateStatus(i18next.t("modGlitchCreateFormUi:statusMessages.creatingMod"));
        this.setButtonsEnabled(false);
        
        try {
            const speciesId = Number(this.formFields["species"].getValue());
            const formName = this.formFields["formName"].getValue();
            const primaryType = Number(this.formFields["primaryType"].getValue());
            const secondaryType = this.formFields["secondaryType"].getValue();
            const secondaryTypeNumber = (secondaryType !== null && secondaryType !== '') ? Number(secondaryType) : undefined;
            const ability1 = Number(this.formFields["ability1"].getValue());
            const ability2 = Number(this.formFields["ability2"].getValue());
            const hiddenAbility = Number(this.formFields["hiddenAbility"].getValue());
            const stat1 = Number(this.formFields["stat1"].getValue());
            const stat2 = Number(this.formFields["stat2"].getValue());
            const stat3 = Number(this.formFields["stat3"].getValue());
            const distributionType = this.formFields["distributionType"].getValue() as StatDistributionType;
            const rivalTrainerTypes = [
                Number(this.formFields["rivalTrainerType1"].getValue()),
                Number(this.formFields["rivalTrainerType2"].getValue()),
                Number(this.formFields["rivalTrainerType3"].getValue()),
                Number(this.formFields["rivalTrainerType4"].getValue()),
            ].filter(type => !isNaN(type) && type !== -1); 
            
            const frontSprite = this.formFields["frontSprite"].getValue();
            const backSprite = this.formFields["backSprite"].getValue();
            const iconData = await this.createIconFromSprite(frontSprite);
            
            
            const lang: {[key: string]: string} = {};
            lang["en"] = formName;
            Object.keys(this.formFields)
                .filter(key => key.startsWith("lang_"))
                .forEach(key => {
                    const langCode = key.replace("lang_", "");
                    const value = this.formFields[key].getValue();
                    if (value) {
                        lang[langCode] = value;
                    }
                });
            
            const jsonData = {
                speciesId,
                formName,
                primaryType,
                secondaryType: secondaryTypeNumber,
                abilities: [ability1, ability2, hiddenAbility],
                stats: {
                    statsToBoost: [stat1, stat2, stat3],
                    distributionType
                },
                sprites: {
                    front: frontSprite,
                    back: backSprite,
                    icon: iconData
                },
                lang,
                unlockConditions: {
                    rivalTrainerTypes: rivalTrainerTypes
                }
            };
            
            this.createdModData = jsonData;
            
            
            const success = await loadModGlitchFormFromJson(this.scene, jsonData);
            
            if (success) {
                try {
                    
                    await modStorage.storeMod({
                        speciesId: jsonData.speciesId,
                        formName: jsonData.formName,
                        jsonData,
                        spriteData: jsonData.sprites.front,
                        iconData: jsonData.sprites.icon
                    });
                    
                    this.scene.gameData.gameStats.glitchModsCreated++;
                    
                    this.downloadModJson(jsonData);

                    this.scene.gameData.testSpeciesForMod.push(jsonData.speciesId);
                    
                    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
                    
                    await this.scene.gameData.saveAll(this.scene);
                    
                    if (isIOS) {
                        console.log("iOS device detected, using alternative page reload method");
                        setTimeout(() => {
                            console.log("Performing iOS page reload");
                            window.location.href = window.location.href;
                        }, 100);
                    } else {
                        window.location.reload();
                    }
                    
                    return true;
                } catch (storageError) {
                    console.error("Error storing mod:", storageError);
                    
                    
                    this.downloadModJson(jsonData);
                    
                    this.updateStatus(i18next.t("modGlitchCreateFormUi:statusMessages.storageError"));
                    return false;
                }
            } else {
                this.updateStatus(i18next.t("modGlitchCreateFormUi:statusMessages.error", { message: "Failed to register glitch form" }));
                return false;
            }
        } catch (error) {
            console.error("Error creating mod:", error);
            this.updateStatus(i18next.t("modGlitchCreateFormUi:statusMessages.error", { message: error.message || "Unknown error" }));
            return false;
        } finally {
            this.isCreating = false;
            this.setButtonsEnabled(true);
        }
    }
    
    
    private setButtonsEnabled(enabled: boolean): void {
        if (!this.formContainer) return;
        
        
        const buttons = this.formContainer.querySelectorAll('button');
        buttons.forEach(button => {
            button.disabled = !enabled;
            button.style.opacity = enabled ? '1' : '0.5';
            button.style.cursor = enabled ? 'pointer' : 'not-allowed';
        });
    }
    
    
    private async createIconFromSprite(spriteDataUrl: string): Promise<string> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                
                const canvas = document.createElement("canvas");
                const size = 32; 
                canvas.width = size;
                canvas.height = size;
                
                
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                    reject(new Error("Couldn't get canvas context"));
                    return;
                }
                
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(img, 0, 0, size, size);
                resolve(canvas.toDataURL("image/png"));
            };
            
            img.onerror = () => {
                reject(new Error("Failed to load sprite for icon creation"));
            };
            
            img.src = spriteDataUrl;
        });
    }
    
    
    private downloadModJson(jsonData: any): void {
        const speciesName = i18next.t(`species:${Object.keys(Species).find(key => Species[key] === jsonData.speciesId)?.toLowerCase()}`);
        const formName = jsonData.formName;
        const filename = `${speciesName.toLowerCase()}_${formName.toLowerCase().replace(/\s+/g, '_')}_mod.json`;
        
        const jsonString = JSON.stringify(jsonData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
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
    }
    
    
    private createFormOverlay(): void {
        this.removeFormOverlay();

        const overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        overlay.style.zIndex = '1000';
        overlay.style.display = 'flex';
        overlay.style.justifyContent = 'center';
        overlay.style.alignItems = 'center';
        
        const formContainer = document.createElement('div');
        formContainer.style.backgroundColor = '#1a2233';
        formContainer.style.border = '2px solid #6688aa';
        formContainer.style.borderRadius = '5px';
        formContainer.style.padding = '20px';
        formContainer.style.width = `${Math.min(this.getWidth(), window.innerWidth - 40)}px`;
        formContainer.style.maxHeight = `${Math.min(this.getHeight(), window.innerHeight - 40)}px`;
        formContainer.style.overflowY = 'auto';
        formContainer.style.boxShadow = '0 0 20px rgba(0, 0, 100, 0.5)';
        formContainer.style.color = '#ffffff';
        formContainer.style.fontFamily = 'monospace, Arial, sans-serif';
        
        const title = document.createElement('h2');
        title.textContent = this.getModalTitle();
        title.style.textAlign = 'center';
        title.style.margin = '0 0 20px 0';
        title.style.color = '#aaddff';
        title.style.borderBottom = '1px solid #6688aa';
        title.style.paddingBottom = '10px';
        formContainer.appendChild(title);
        
        
        this.formOverlay = overlay;
        this.formContainer = formContainer;
        
        
        overlay.appendChild(formContainer);
        
        
        document.body.appendChild(overlay);
        
        
        this.setupFormFields();
        
        
        this.addActionButtons();
        
        
        this.resizeHandler = () => {
            if (this.formContainer) {
                this.formContainer.style.width = `${Math.min(this.getWidth(), window.innerWidth - 40)}px`;
                this.formContainer.style.maxHeight = `${Math.min(this.getHeight(), window.innerHeight - 40)}px`;
            }
        };
        
        window.addEventListener('resize', this.resizeHandler);
        
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.clear();
                this.scene.ui.setMode(Mode.TITLE);
            }
        });
    }
    
    private removeFormOverlay(): void {
        if (this.formOverlay) {
            document.body.removeChild(this.formOverlay);
            this.formOverlay = null;
            this.formContainer = null;
        }
        
        if (this.resizeHandler) {
            window.removeEventListener('resize', this.resizeHandler);
        }
        
        
        Object.values(this.formFields).forEach(field => {
            if (field.input && field.input.parentNode) {
                try {
                    field.input.parentNode.removeChild(field.input);
                } catch (e) {
                    console.warn("Error removing input element:", e);
                }
            }
        });
        
        this.formFields = {};
    }

    private setupFormFields(): void {
        if (!this.formContainer) return;
        
        
        const statusContainer = document.createElement('div');
        statusContainer.style.color = '#ff5555';
        statusContainer.style.marginBottom = '15px';
        statusContainer.style.display = 'none';
        this.formContainer.appendChild(statusContainer);
        
        this.formFields["status"] = {
            input: statusContainer,
            setValue: (text) => {
                statusContainer.textContent = text;
                statusContainer.style.display = text ? 'block' : 'none';
            },
            getValue: () => statusContainer.textContent || "",
            setVisible: (visible) => {
                statusContainer.style.display = visible ? 'block' : 'none';
            }
        };
        
        
        this.addSectionDivider("modGlitchCreateFormUi:sections.basicInformation");
        
        
        this.createDropdown("species", i18next.t("modGlitchCreateFormUi:fields.species"), 
            Object.keys(Species)
                .filter(key => isNaN(Number(key)) && key !== "NONE" && !key.includes("_FORM"))
                .map(key => ({
                    value: Species[key],
                    label: i18next.t(`pokemon:${key.toLowerCase()}`)
                }))
        );
        
        
        const speciesSelect = this.formFields["species"].input as HTMLSelectElement;
        speciesSelect.addEventListener('change', () => {
            const selectedSpeciesId = Number(speciesSelect.value);
            this.updateBaseStatsDisplay(selectedSpeciesId);
        });
        
        this.createTextInput("formName", i18next.t("modGlitchCreateFormUi:fields.formName"));
        
        const langSection = document.createElement('div');
        langSection.style.margin = '15px 0';
        
        const langHeader = document.createElement('div');
        langHeader.textContent = i18next.t("modGlitchCreateFormUi:fields.formLanguages") + " ▼";
        langHeader.style.color = '#bbddff';
        langHeader.style.cursor = 'pointer';
        langHeader.style.marginBottom = '5px';
        langSection.appendChild(langHeader);
        
        const langContainer = document.createElement('div');
        langContainer.style.display = 'none';
        langContainer.style.marginLeft = '15px';
        langSection.appendChild(langContainer);
        this.formContainer.appendChild(langSection);
        
        langHeader.addEventListener('click', () => {
            const isVisible = langContainer.style.display !== 'none';
            langContainer.style.display = isVisible ? 'none' : 'block';
            langHeader.textContent = i18next.t("modGlitchCreateFormUi:fields.formLanguages") + (isVisible ? " ▼" : " ▲");
        });
        
        const languages = [
            { code: "es", name: i18next.t("modGlitchCreateFormUi:languages.es") },
            { code: "fr", name: i18next.t("modGlitchCreateFormUi:languages.fr") },
            { code: "de", name: i18next.t("modGlitchCreateFormUi:languages.de") },
            { code: "ja", name: i18next.t("modGlitchCreateFormUi:languages.ja") },
            { code: "ko", name: i18next.t("modGlitchCreateFormUi:languages.ko") },
            { code: "pt-BR", name: i18next.t("modGlitchCreateFormUi:languages.pt-BR") },
            { code: "it", name: i18next.t("modGlitchCreateFormUi:languages.it") },
            { code: "zh-TW", name: i18next.t("modGlitchCreateFormUi:languages.zh-TW") },
            { code: "zh-CN", name: i18next.t("modGlitchCreateFormUi:languages.zh-CN") }
        ];
        
        languages.forEach(lang => {
            const langFieldContainer = document.createElement('div');
            langFieldContainer.style.display = 'flex';
            langFieldContainer.style.alignItems = 'center';
            langFieldContainer.style.marginBottom = '10px';
            
            const langLabel = document.createElement('label');
            langLabel.textContent = lang.name;
            langLabel.style.width = '150px';
            langLabel.style.marginRight = '10px';
            langFieldContainer.appendChild(langLabel);
            
            const input = document.createElement("input");
            input.type = "text";
            input.placeholder = lang.name;
            input.style.flex = '1';
            input.style.padding = '5px';
            input.style.backgroundColor = '#334455';
            input.style.color = '#ffffff';
            input.style.border = '1px solid #6688aa';
            input.style.borderRadius = '3px';
            langFieldContainer.appendChild(input);
            langContainer.appendChild(langFieldContainer);
            
            this.formFields[`lang_${lang.code}`] = {
                input: input,
                setValue: (value) => { input.value = value; },
                getValue: () => input.value,
                validate: () => true 
            };
        });
        
        
        this.addSectionDivider("modGlitchCreateFormUi:sections.typesAbilities");
        
        this.createDropdown("primaryType", i18next.t("modGlitchCreateFormUi:fields.primaryType"),
            Object.keys(Type)
                .filter(key => isNaN(Number(key)) && key != "UNKNOWN" && key != "ALL" && key != "STELLAR")
                .map(key => ({
                    value: Type[key],
                    label: i18next.t(`pokemonInfo:Type:${key}`)
                }))
        );
        this.createDropdown("secondaryType", i18next.t("modGlitchCreateFormUi:fields.secondaryType"),
            [{ value: -1, label: "None" }].concat(
                Object.keys(Type)
                    .filter(key => isNaN(Number(key)) && key != "UNKNOWN" && key != "ALL" && key != "STELLAR")
                    .map(key => ({
                        value: Type[key],
                        label: i18next.t(`pokemonInfo:Type:${key}`)
                    }))
            ),
            true 
        );
        
        const abilityOptions = Object.keys(Abilities)
            .filter(key => isNaN(Number(key)) && key !== "NONE") 
            .map(key => {
                const i18nKey = key.split("_").filter(f => f).map((f, i) =>
                    i ? `${f[0]}${f.slice(1).toLowerCase()}` : f.toLowerCase()
                ).join("");
                return {
                    value: Abilities[key],
                    label: i18next.t(`ability:${i18nKey}.name`),
                    descriptionKey: i18nKey
                };
            })
            .filter(option => {
                const abilityId = Number(option.value);
                const maxAbilityIndex = 310; 
                const labelEndsWithN = option.label.endsWith(" (N)");
                const exceedsMaxIndex = abilityId > maxAbilityIndex;
                const isRemovedAbility = REMOVED_ABILITIES.includes(abilityId);
                return !labelEndsWithN && !exceedsMaxIndex && !isRemovedAbility;
            });

        this.createDropdown("ability1", i18next.t("modGlitchCreateFormUi:fields.ability1"), abilityOptions);
        this.createDropdown("ability2", i18next.t("modGlitchCreateFormUi:fields.ability2"), abilityOptions);
        this.createDropdown("hiddenAbility", i18next.t("modGlitchCreateFormUi:fields.hiddenAbility"), abilityOptions);
        const abilityKeys = ["ability1", "ability2", "hiddenAbility"];
        abilityKeys.forEach(key => {
            const dropdownField = this.formFields[key];
            if (dropdownField && dropdownField.input) {
                const descriptionElement = document.createElement('p');
                descriptionElement.style.color = '#ccccff';
                descriptionElement.style.fontSize = '12px';
                descriptionElement.style.marginTop = '5px';
                descriptionElement.style.fontStyle = 'italic';
                descriptionElement.style.wordBreak = 'break-word';
                descriptionElement.style.whiteSpace = 'pre-wrap'; 
                
                const parentContainer = dropdownField.input.parentElement;
                if (parentContainer) {
                  
                  let fieldContainer: HTMLElement | null = parentContainer;
                  while(fieldContainer && fieldContainer.style.display !== 'flex') {
                    fieldContainer = fieldContainer.parentElement;
                  }
                  if (fieldContainer && fieldContainer.parentElement) {
                     
                    fieldContainer.parentElement.insertBefore(descriptionElement, fieldContainer.nextSibling);
                  } else {
                    
                     parentContainer.appendChild(descriptionElement);
                  }
                }
                const updateDescription = (selectedValue: string) => {
                  const selectedOption = abilityOptions.find(opt => opt.value == selectedValue); 
                    if (selectedOption && selectedOption.descriptionKey) {
                        descriptionElement.textContent = i18next.t(`ability:${selectedOption.descriptionKey}.description`);
                    } else {
                        descriptionElement.textContent = '';
                    }
                };

                
                updateDescription(dropdownField.getValue());
                dropdownField.input.addEventListener('change', (event) => {
                    const selectedValue = (event.target as HTMLSelectElement).value;
                    updateDescription(selectedValue);
                });
            }
        });
        
        this.addSectionDivider("modGlitchCreateFormUi:sections.stats");
        const baseStatsDisplayContainer = document.createElement('div');
        baseStatsDisplayContainer.style.marginTop = '20px';
        baseStatsDisplayContainer.style.borderTop = 'none'; 
        baseStatsDisplayContainer.style.paddingTop = '0px'; 
        this.formContainer.appendChild(baseStatsDisplayContainer);

        this.formFields["baseStatsDisplay"] = {
            input: baseStatsDisplayContainer,
            setValue: (htmlContent) => { baseStatsDisplayContainer.innerHTML = htmlContent; },
            getValue: () => baseStatsDisplayContainer.innerHTML, 
            setVisible: (visible) => { baseStatsDisplayContainer.style.display = visible ? 'block' : 'none'; },
            validate: () => true 
        };
        
        const statOptions = Object.keys(Stat)
            .filter(key => isNaN(Number(key)))
            .map(key => ({
                value: Stat[key],
                label: i18next.t(`pokemonInfo:Stat:${key}`)
            }));

        this.createDropdown("stat1", i18next.t("modGlitchCreateFormUi:fields.stat1"), statOptions, false); 
        
        const stat1Select = this.formFields["stat1"].input as HTMLSelectElement;
        stat1Select.value = Stat.HP.toString();
        this.createDropdown("stat2", i18next.t("modGlitchCreateFormUi:fields.stat2"), statOptions, false); 
        
        const stat2Select = this.formFields["stat2"].input as HTMLSelectElement;
        stat2Select.value = Stat.ATK.toString();
        this.createDropdown("stat3", i18next.t("modGlitchCreateFormUi:fields.stat3"), statOptions, false); 
        
        const stat3Select = this.formFields["stat3"].input as HTMLSelectElement;
        stat3Select.value = Stat.DEF.toString();
        
        const handleStatChange = (currentSelect: HTMLSelectElement, otherSelect1: HTMLSelectElement, otherSelect2: HTMLSelectElement) => {
            const newValue = currentSelect.value;
            const previousValue = (currentSelect as any)._previousValue; 
            const otherValue1 = otherSelect1.value;
            const otherValue2 = otherSelect2.value;
            
            if (newValue !== '' && newValue === otherValue1) {
                
                otherSelect1.value = previousValue !== undefined ? previousValue : ''; 
                 (otherSelect1 as any)._previousValue = otherValue1; 
            } else if (newValue !== '' && newValue === otherValue2) {
                
                otherSelect2.value = previousValue !== undefined ? previousValue : ''; 
                 (otherSelect2 as any)._previousValue = otherValue2; 
            }
            (currentSelect as any)._previousValue = newValue;
            this.validateForm();
            
            const speciesSelect = this.formFields["species"].input as HTMLSelectElement;
            this.updateBaseStatsDisplay(Number(speciesSelect.value));
        };

         (stat1Select as any)._previousValue = stat1Select.value;
         (stat2Select as any)._previousValue = stat2Select.value;
         (stat3Select as any)._previousValue = stat3Select.value;

        stat1Select.addEventListener('change', () => {
            handleStatChange(stat1Select, stat2Select, stat3Select);
        });

        stat2Select.addEventListener('change', () => {
            handleStatChange(stat2Select, stat1Select, stat3Select);
        });

        stat3Select.addEventListener('change', () => {
            handleStatChange(stat3Select, stat1Select, stat2Select);
        });

        const distributionTypes: Array<{value: StatDistributionType, label: string}> = [
            { value: 'even', label: i18next.t("modGlitchCreateFormUi:distributionTypes.even") },
            { value: 'twoPriority', label: i18next.t("modGlitchCreateFormUi:distributionTypes.twoPriority") },
            { value: 'scaling', label: i18next.t("modGlitchCreateFormUi:distributionTypes.scaling") },
            { value: 'topPriority', label: i18next.t("modGlitchCreateFormUi:distributionTypes.topPriority") }
        ];
        
        this.createDropdown("distributionType", i18next.t("modGlitchCreateFormUi:fields.distributionType"), distributionTypes);
        
        const distributionTypeSelect = this.formFields["distributionType"].input as HTMLSelectElement;
        distributionTypeSelect.addEventListener('change', () => {
            
            const speciesSelect = this.formFields["species"].input as HTMLSelectElement;
            this.updateBaseStatsDisplay(Number(speciesSelect.value));
        });
        
        this.addSectionDivider("modGlitchCreateFormUi:sections.sprites");
        this.createImageUpload("frontSprite", i18next.t("modGlitchCreateFormUi:fields.frontSprite"));
        this.createImageUpload("backSprite", i18next.t("modGlitchCreateFormUi:fields.backSprite"));
        
        this.addSectionDivider("modGlitchCreateFormUi:sections.rivalTrainer");
        
        const rivalTypes = getAllRivalTrainerTypes();
        const rivalOptions = rivalTypes.map(rivalType => ({
            value: rivalType,
            label: i18next.t(`trainerNames:${TrainerType[rivalType].toLowerCase()}`)
        }));
        
        (this as any)._rivalOptions = rivalOptions; 
        
        this.createDropdown("rivalTrainerType1", i18next.t("modGlitchCreateFormUi:fields.rivalTrainer"), rivalOptions, false); 
        this.createDropdown("rivalTrainerType2", i18next.t("modGlitchCreateFormUi:fields.orRivalTrainer"), rivalOptions, false); 
        this.createDropdown("rivalTrainerType3", i18next.t("modGlitchCreateFormUi:fields.orRivalTrainer"), rivalOptions, false); 
        this.createDropdown("rivalTrainerType4", i18next.t("modGlitchCreateFormUi:fields.orRivalTrainer"), rivalOptions, false); 

        if (rivalOptions.length >= 2) (this.formFields["rivalTrainerType1"].input as HTMLSelectElement).value = String(rivalOptions[1].value);
        if (rivalOptions.length >= 3) (this.formFields["rivalTrainerType2"].input as HTMLSelectElement).value = String(rivalOptions[2].value);
        if (rivalOptions.length >= 4) (this.formFields["rivalTrainerType3"].input as HTMLSelectElement).value = String(rivalOptions[3].value);
        if (rivalOptions.length >= 5) (this.formFields["rivalTrainerType4"].input as HTMLSelectElement).value = String(rivalOptions[4].value);
        
        const rivalSelect1 = this.formFields["rivalTrainerType1"].input as HTMLSelectElement;
        const rivalSelect2 = this.formFields["rivalTrainerType2"].input as HTMLSelectElement;
        const rivalSelect3 = this.formFields["rivalTrainerType3"].input as HTMLSelectElement;
        const rivalSelect4 = this.formFields["rivalTrainerType4"].input as HTMLSelectElement;

        const updateRivalOptions = () => {
            const selectedValues = new Set([
                rivalSelect1.value,
                rivalSelect2.value,
                rivalSelect3.value,
                rivalSelect4.value,
            ].filter(value => value !== '' && value !== '-1')); 

            const allOptions = (this as any)._rivalOptions; 

            [rivalSelect1, rivalSelect2, rivalSelect3, rivalSelect4].forEach(selectElement => {
                const currentValue = selectElement.value;
                
                while (selectElement.options.length > 0) {
                    selectElement.remove(0);
                }

                allOptions.forEach(option => {
                    if (option.value == currentValue || !selectedValues.has(String(option.value))) { 
                        const optionElement = document.createElement('option');
                        optionElement.value = option.value;
                        optionElement.text = option.label;
                        selectElement.appendChild(optionElement);
                    }
                });
                selectElement.value = currentValue;
            });
             this.validateForm(); 
        };
        
        this.scene.time.delayedCall(100, updateRivalOptions);

        rivalSelect1.addEventListener('change', updateRivalOptions);
        rivalSelect2.addEventListener('change', updateRivalOptions);
        rivalSelect3.addEventListener('change', updateRivalOptions);
        rivalSelect4.addEventListener('change', updateRivalOptions);
    }
    
    private addSectionDivider(localizationKey: string): void {
        if (!this.formContainer) return;
        const divider = document.createElement('div');
        divider.style.margin = '20px 0 15px 0';
        
        const titleElement = document.createElement('h3');
        titleElement.textContent = i18next.t(localizationKey);
        titleElement.style.color = '#aaddff';
        titleElement.style.margin = '0 0 5px 0';
        titleElement.style.fontWeight = 'bold';
        divider.appendChild(titleElement);
        
        const line = document.createElement('div');
        line.style.height = '1px';
        line.style.backgroundColor = '#6688aa';
        line.style.width = '100%';
        divider.appendChild(line);
        
        this.formContainer.appendChild(divider);
    }
    
    private createTextInput(key: string, label: string, required: boolean = true): void {
        if (!this.formContainer) return;
        
        const fieldContainer = document.createElement('div');
        fieldContainer.style.display = 'flex';
        fieldContainer.style.alignItems = 'center';
        fieldContainer.style.marginBottom = '15px';
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label + (required ? ' *' : '');
        labelElement.style.width = '150px';
        labelElement.style.color = '#bbddff';
        labelElement.style.marginRight = '10px';
        fieldContainer.appendChild(labelElement);
        
        const input = document.createElement('input');
        input.type = 'text';
        input.style.flex = '1';
        input.style.padding = '8px';
        input.style.backgroundColor = '#334455';
        input.style.color = '#ffffff';
        input.style.border = '2px solid #88aadd';
        input.style.borderRadius = '4px';
        input.style.fontSize = '14px';
        input.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
        fieldContainer.appendChild(input);
        
        this.formContainer.appendChild(fieldContainer);
        
        this.formFields[key] = {
            input: input,
            setValue: (value) => { input.value = value; },
            getValue: () => input.value,
            validate: () => {
                const isValid = !required || !!input.value.trim();
                labelElement.style.color = isValid ? '#bbddff' : '#ff5555';
                return isValid;
            }
        };
    }
    
    private createDropdown(key: string, label: string, options: Array<{value: any, label: string}>, optional: boolean = false): void {
        if (!this.formContainer) return;
        
        const fieldContainer = document.createElement('div');
        fieldContainer.style.display = 'flex';
        fieldContainer.style.alignItems = 'center';
        fieldContainer.style.marginBottom = '15px';
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label + (optional ? '' : ' *');
        labelElement.style.width = '150px';
        labelElement.style.color = '#bbddff';
        labelElement.style.marginRight = '10px';
        fieldContainer.appendChild(labelElement);
        
        const select = document.createElement('select');
        select.style.flex = '1';
        select.style.padding = '8px';
        select.style.backgroundColor = '#334455';
        select.style.color = '#ffffff';
        select.style.border = '2px solid #88aadd';
        select.style.borderRadius = '4px';
        select.style.fontSize = '14px';
        select.style.boxShadow = '0 0 5px rgba(0,0,0,0.5)';
        
        if (optional) {
            const emptyOption = document.createElement('option');
            emptyOption.value = '';
            emptyOption.text = i18next.t("modGlitchCreateFormUi:dropdowns.selectOptional");
            select.appendChild(emptyOption);
        }
        
        options.forEach(option => {
            const optionElement = document.createElement('option');
            optionElement.value = option.value;
            optionElement.text = option.label;
            select.appendChild(optionElement);
        });
        
        fieldContainer.appendChild(select);
        this.formContainer.appendChild(fieldContainer);
        
        this.formFields[key] = {
            input: select,
            setValue: (value) => { select.value = value; },
            getValue: () => select.value,
            validate: () => {
                const isValid = optional || !!select.value;
                labelElement.style.color = isValid ? '#bbddff' : '#ff5555';
                return isValid;
            }
        };
    }
    
    private createImageUpload(key: string, label: string): void {
        if (!this.formContainer) return;
        const fieldContainer = document.createElement('div');
        fieldContainer.style.marginBottom = '20px';
        
        const labelRow = document.createElement('div');
        labelRow.style.display = 'flex';
        labelRow.style.alignItems = 'center';
        labelRow.style.marginBottom = '10px';
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label + ' *';
        labelElement.style.width = '150px';
        labelElement.style.color = '#bbddff';
        labelElement.style.marginRight = '10px';
        labelRow.appendChild(labelElement);
        
        fieldContainer.appendChild(labelRow);
        const uploadRow = document.createElement('div');
        uploadRow.style.display = 'flex';
        uploadRow.style.alignItems = 'center';
        
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';
        
        const uploadButton = document.createElement('button');
        uploadButton.textContent = i18next.t("modGlitchCreateFormUi:imageUpload.uploadButton");
        uploadButton.style.backgroundColor = '#336699';
        uploadButton.style.color = '#ffffff';
        uploadButton.style.border = '2px solid #88aadd';
        uploadButton.style.borderRadius = '4px';
        uploadButton.style.padding = '8px 15px';
        uploadButton.style.marginRight = '10px';
        uploadButton.style.cursor = 'pointer';
        
        const fileNameDisplay = document.createElement('span');
        fileNameDisplay.textContent = i18next.t("modGlitchCreateFormUi:imageUpload.noFileSelected");
        fileNameDisplay.style.color = '#bbbbbb';
        
        uploadButton.addEventListener('click', () => {
            fileInput.click();
        });
        
        uploadRow.appendChild(uploadButton);
        uploadRow.appendChild(fileNameDisplay);
        fieldContainer.appendChild(uploadRow);
        const previewContainer = document.createElement('div');
        previewContainer.style.marginTop = '10px';
        previewContainer.style.width = '150px';
        previewContainer.style.height = '150px';
        previewContainer.style.border = '1px dashed #6688aa';
        previewContainer.style.display = 'flex';
        previewContainer.style.alignItems = 'center';
        previewContainer.style.justifyContent = 'center';
        fieldContainer.appendChild(previewContainer);
        
        this.formContainer.appendChild(fieldContainer);
        
        let imageData: string | null = null;
        let isValid = false;
        
        fileInput.addEventListener('change', (e) => {
            const file = fileInput.files?.[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                const img = new Image();
                img.onload = () => {
                    
                    if (img.width >= 130 && img.width <= 200 && img.height >= 130 && img.height <= 200) {
                        
                        fileNameDisplay.textContent = file.name.length > 15 ? file.name.substring(0, 12) + "..." : file.name;
                        fileNameDisplay.style.color = '#ffffff';
                        previewContainer.innerHTML = '';
                        
                        const previewImg = document.createElement('img');
                        previewImg.src = event.target?.result as string;
                        previewImg.style.maxWidth = '100%';
                        previewImg.style.maxHeight = '100%';
                        previewContainer.appendChild(previewImg);
                        
                        
                        imageData = event.target?.result as string;
                        isValid = true;
                        labelElement.style.color = '#bbddff';
                        
                        
                        this.scene.textures.addBase64(key, imageData);
                    } else {
                        this.updateStatus(i18next.t("modGlitchCreateFormUi:validation.imageSize"));
                        isValid = false;
                        labelElement.style.color = '#ff5555';
                        fileNameDisplay.textContent = i18next.t("modGlitchCreateFormUi:imageUpload.invalidSize");
                        fileNameDisplay.style.color = '#ff5555';
                    }
                };
                img.src = event.target?.result as string;
            };
            reader.readAsDataURL(file);
        });
        
        this.formFields[key] = {
            input: fileInput,
            setValue: () => {}, 
            getValue: () => imageData,
            validate: () => {
                labelElement.style.color = isValid ? '#bbddff' : '#ff5555';
                return isValid;
            }
        };
    }
    
    private addActionButtons(): void {
        if (!this.formContainer) return;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.style.display = 'flex';
        buttonContainer.style.justifyContent = 'center';
        buttonContainer.style.marginTop = '25px';
        buttonContainer.style.gap = '20px';
        
        const saveButton = document.createElement('button');
        saveButton.textContent = i18next.t("modGlitchCreateFormUi:buttons.saveAndAdd");
        saveButton.style.backgroundColor = '#4a90e2';
        saveButton.style.color = '#ffffff';
        saveButton.style.border = 'none';
        saveButton.style.borderRadius = '4px';
        saveButton.style.padding = '10px 20px';
        saveButton.style.fontSize = '16px';
        saveButton.style.cursor = 'pointer';
        
        saveButton.addEventListener('click', () => {
            this.createAndSaveMod();
        });
        
        const cancelButton = document.createElement('button');
        cancelButton.textContent = i18next.t("modGlitchCreateFormUi:buttons.cancel");
        cancelButton.style.backgroundColor = '#666666';
        cancelButton.style.color = '#ffffff';
        cancelButton.style.border = 'none';
        cancelButton.style.borderRadius = '4px';
        cancelButton.style.padding = '10px 20px';
        cancelButton.style.fontSize = '16px';
        cancelButton.style.cursor = 'pointer';
        
        cancelButton.addEventListener('click', () => {
            this.clear();
            this.scene.ui.setMode(Mode.TITLE);
        });
        
        buttonContainer.appendChild(saveButton);
        buttonContainer.appendChild(cancelButton);
        this.formContainer.appendChild(buttonContainer);
    }
    
    private updateBaseStatsDisplay(speciesId: number): void {
        const baseStatsDisplayContainer = this.formFields["baseStatsDisplay"]?.input as HTMLDivElement;
        if (!baseStatsDisplayContainer || speciesId === undefined || isNaN(speciesId) || speciesId === -1) {
            
            if(baseStatsDisplayContainer) {
                 baseStatsDisplayContainer.innerHTML = '';
                 this.formFields["baseStatsDisplay"].setVisible(false);
            }
            return;
        }

        try {
            const speciesData = getPokemonSpecies(speciesId);
            const baseStats = speciesData.baseStats;

            if (!baseStats || baseStats.length !== 6) {
                 console.error("Invalid base stats data for species ID:", speciesId, baseStats);
                 baseStatsDisplayContainer.innerHTML = '<p style="color: #ff5555;">Error loading stats.</p>';
                 this.formFields["baseStatsDisplay"].setVisible(true);
                 return;
            }

            const stat1 = this.formFields["stat1"].getValue();
            const stat2 = this.formFields["stat2"].getValue();
            const stat3 = this.formFields["stat3"].getValue();
            const distributionType = this.formFields["distributionType"].getValue() as StatDistributionType;

            const statKeys = Object.keys(Stat).filter(key => isNaN(Number(key)));
            const selectedStatValues = [stat1, stat2, stat3].filter(stat => stat !== "" && stat !== undefined && stat !== null).map(Number);
            const statsToBoostNames = selectedStatValues.map(value => statKeys.find(key => Stat[key] === value)).filter(name => name !== undefined) as string[];

            const boostedStats = distributeStatIncrease(baseStats, statsToBoostNames, distributionType);

            const statNames = [i18next.t('pokemonInfo:Stat.HPStat'), i18next.t('pokemonInfo:Stat.ATKshortened'), i18next.t('pokemonInfo:Stat.DEFshortened'), i18next.t('pokemonInfo:Stat.SPATKshortened'), i18next.t('pokemonInfo:Stat.SPDEFshortened'), i18next.t('pokemonInfo:Stat.SPDshortened')];
            let statsHtml = '<div style="display: grid; grid-template-columns: max-content 1fr; gap: 10px; align-items: center;">';
            const maxStatValue = Math.max(...baseStats, ...boostedStats, 255); 

            for (let i = 0; i < baseStats.length; i++) {
                const statName = statNames[i];
                const baseValue = baseStats[i];
                const boostedValue = boostedStats[i];
                const increaseValue = boostedValue - baseValue;

                
                const totalValue = baseValue + increaseValue;
                const maxDisplayValue = Math.max(maxStatValue, totalValue); 

                const baseBarWidthPercent = (baseValue / maxDisplayValue) * 100;
                
                const increaseBarWidthPercent = (increaseValue / maxDisplayValue) * 100;

                statsHtml += `
                    <div style="color: #bbddff; font-weight: bold;">${statName}:</div>
                    <div style="display: flex; align-items: center; width: 100%;">
                        <div style="width: ${baseBarWidthPercent}%; background-color: #4a90e2; height: 20px; display: flex; justify-content: center; align-items: center; color: #ffffff; font-size: 10px;">${baseValue}</div>
                        ${increaseValue > 0 ? `<div style="width: ${increaseBarWidthPercent}%; background-color: #00ff00; height: 20px; display: flex; justify-content: center; align-items: center; color: #000000; font-size: 10px;">+${increaseValue}</div>` : ''}
                        <span style="color: #ffffff; font-size: 12px; margin-left: 5px;">${totalValue}</span>
                    </div>
                `;
            }

            statsHtml += '</div>';

            const totalBaseStats = baseStats.reduce((sum, stat) => sum + stat, 0);
            const totalBoostedStats = boostedStats.reduce((sum, stat) => sum + stat, 0);
            const totalIncreaseValue = totalBoostedStats - totalBaseStats;

            const maxTotalValue = totalBoostedStats > 0 ? totalBoostedStats : totalBaseStats > 0 ? totalBaseStats : 1;
            const baseTotalBarWidthPercent = (totalBaseStats / maxTotalValue) * 100;
            const increaseTotalBarWidthPercent = totalIncreaseValue > 0 ? (totalIncreaseValue / maxTotalValue) * 100 : 0;

            statsHtml += `
                <div style="margin: 20px 0 20px 0; display: grid; grid-template-columns: max-content 1fr; gap: 10px; align-items: center; border-top: 1px solid #6688aa; padding-top: 15px;">
                    <div style="color: #bbddff; font-weight: bold;">${i18next.t('pokemonInfo:Stat.Total')}:</div>
                    <div style="display: flex; align-items: center; width: 100%;">
                        <div style="width: ${baseTotalBarWidthPercent}%; background-color: #4a90e2; height: 20px; display: flex; justify-content: center; align-items: center; color: #ffffff; font-size: 10px;">${totalBaseStats}</div>
                        ${totalIncreaseValue > 0 ? `<div style="width: ${increaseTotalBarWidthPercent}%; background-color: #00ff00; height: 20px; display: flex; justify-content: center; align-items: center; color: #000000; font-size: 10px;">+${totalIncreaseValue}</div>` : ''}
                        <span style="color: #ffffff; font-size: 12px; margin-left: 5px;">${totalBoostedStats}</span>
                    </div>
                </div>
            `;

            baseStatsDisplayContainer.innerHTML = statsHtml;
            this.formFields["baseStatsDisplay"].setVisible(true);

        } catch (error) {
             console.error("Error updating base stats display:", error);
             baseStatsDisplayContainer.innerHTML = '<p style="color: #ff5555;">Error loading stats.</p>';
             this.formFields["baseStatsDisplay"].setVisible(true);
        }
    }
}