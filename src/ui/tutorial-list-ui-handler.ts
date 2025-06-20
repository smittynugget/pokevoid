import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import UiHandler from "./ui-handler";
import { Button } from "../enums/buttons";
import { addTextObject, TextStyle } from "./text";
import { addWindow } from "./ui-theme";
import { Tutorial } from "../tutorial";
import { EnhancedTutorial } from "./tutorial-registry";
import { TutorialService } from "./tutorial-service";

const DEBUG_UI = true;

export default class TutorialListUiHandler extends UiHandler {
    private modalContainer: Phaser.GameObjects.Container;
    private modalBg: Phaser.GameObjects.NineSlice;
    private titleText: Phaser.GameObjects.Text;
    private container: Phaser.GameObjects.Container;
    
    private tutorialNavContainer: Phaser.GameObjects.Container;
    private tutorialContentContainer: Phaser.GameObjects.Container;
    private tutorialButtonContainers: Phaser.GameObjects.Container[] = [];
    private currentTutorialIndex: number = 0;
    private activeTutorialCount: number = 0;
    
    private getWidth(): number {
        return 600;
    }
    
    private getHeight(): number {
        return 600;
    }
    
    private getMargin(): [number, number, number, number] {
        return [0, 0, 0, 0];
    }
    
    private tutorialCategories: { id: string, name: string, tutorials: (Tutorial | EnhancedTutorial)[] }[] = [];
    private allTutorials: { name: string, tutorial: Tutorial | EnhancedTutorial }[] = [];
    private tutorialService: TutorialService;
    
    constructor(scene: BattleScene, mode: Mode | null = null) {
        super(scene, mode || Mode.OPTION_SELECT);
        this.tutorialService = new TutorialService(scene);
        
        this.container = this.scene.add.container(0, 0);
        
        if (DEBUG_UI) {
            console.log("TutorialListUiHandler constructed", 
                this.scene.game.canvas.width, 
                this.scene.game.canvas.height,
                "Game scale:", this.scene.scale.displayScale.x, this.scene.scale.displayScale.y
            );
        }
    }

    setup(): void {
    }

    show(args: any[]): boolean {
        if (this.active) {
            return false;
        }

        this.currentTutorialIndex = 0;

        this.initializeTutorials();
        
        this.setupModalContainer();
        this.setupContent();
        
        if (DEBUG_UI) {
            console.log("Tutorial UI shown", {
                canvasWidth: this.scene.game.canvas.width,
                canvasHeight: this.scene.game.canvas.height,
                modalPos: { x: this.modalContainer.x, y: this.modalContainer.y },
                windowDimensions: { w: this.getWidth(), h: this.getHeight() }
            });
        }
        
        this.active = true;
        return true;
    }
    
    private initializeTutorials(): void {
        this.tutorialCategories = [
            { 
                id: "essentials", 
                name: "Essential Basics", 
                tutorials: [
                    EnhancedTutorial.MENU_ACCESS,
                    EnhancedTutorial.SAVING_1,
                    EnhancedTutorial.STATS,
                    EnhancedTutorial.RUN_HISTORY_1,
                    EnhancedTutorial.RUN_DETAILS_1,
                    EnhancedTutorial.INTRASHOP_1
                ]
            },
            { 
                id: "gameModes", 
                name: "Game Modes", 
                tutorials: [
                    EnhancedTutorial.JOURNEY_1,
                    EnhancedTutorial.ROGUE_MODE,
                    EnhancedTutorial.NUZLOCKE,
                    EnhancedTutorial.NUZLIGHT,
                    EnhancedTutorial.ENDGAME,
                    EnhancedTutorial.CHAOS_AND_GAUNTLET_MODES
                ]
            },
            { 
                id: "specialPokemon", 
                name: "Special Pokémon", 
                tutorials: [
                    EnhancedTutorial.FUSION_POKEMON_1,
                    EnhancedTutorial.TRAINER_POKEMON_1,
                    EnhancedTutorial.EGGS_1,
                    EnhancedTutorial.EGG_SWAP_1,
                    EnhancedTutorial.LEGENDARY_POKEMON_1
                ]
            },
            { 
                id: "progression", 
                name: "Game Progression", 
                tutorials: [
                    EnhancedTutorial.RIVALS_1, 
                    EnhancedTutorial.RIVAL_QUESTS,
                    EnhancedTutorial.FIRST_VICTORY,
                    EnhancedTutorial.THE_VOID_UNLOCKED,
                    EnhancedTutorial.MOVE_UPGRADES_1,
                    EnhancedTutorial.FIRST_MOVE_UPGRADE_1
                ]
            },
            { 
                id: "permanentFeatures", 
                name: "Permanent Features", 
                tutorials: [
                    EnhancedTutorial.PERMA_MONEY_1,
                    EnhancedTutorial.BOUNTIES_1,
                    EnhancedTutorial.DAILY_BOUNTY,
                    EnhancedTutorial.SMITTY_ITEMS_1
                ]
            },
            { 
                id: "glitchSystem", 
                name: "Glitch System", 
                tutorials: [
                    EnhancedTutorial.GLITCH_ITEMS_1,
                    EnhancedTutorial.ANY_TMS,
                    EnhancedTutorial.ANY_ABILITIES,
                    EnhancedTutorial.ABILITY_SWITCHER,
                    EnhancedTutorial.TYPE_SWITCHER,
                    EnhancedTutorial.STAT_SWITCHERS,
                    EnhancedTutorial.GLITCH_RIVALS_1
                ]
            },
            { 
                id: "battleMechanics", 
                name: "Battle Mechanics", 
                tutorials: [
                    EnhancedTutorial.ABILITIES_1,
                    EnhancedTutorial.PASSIVE_ABILITIES_1,
                    EnhancedTutorial.PARTY_ABILITY_1
                ]
            },
            { 
                id: "formChanges", 
                name: "Form Changes", 
                tutorials: [
                    EnhancedTutorial.NEW_FORMS_1,
                    EnhancedTutorial.SMITTY_FORMS_1,
                    EnhancedTutorial.MEGA_DYNAMAX_1
                ]
            },
            { 
                id: "community", 
                name: "Community Features", 
                tutorials: [
                    EnhancedTutorial.DISCORD,
                    EnhancedTutorial.SMITOM,
                    EnhancedTutorial.POKEROGUE_1,
                    EnhancedTutorial.THANK_YOU
                ]
            }
        ];
        
        this.allTutorials = [];
        this.tutorialCategories.forEach(category => {
            this.allTutorials.push({ 
                name: category.name,
                tutorial: null 
            });
            
            category.tutorials.forEach(tutorial => {
                this.allTutorials.push({
                    name: this.getTutorialName(tutorial),
                    tutorial: tutorial
                });
            });
        });
        
        this.allTutorials.push({
            name: "Back",
            tutorial: null
        });
        
        this.activeTutorialCount = this.allTutorials.length;
    }
    
    private setupModalContainer(): void {
        this.modalContainer = this.scene.add.container(0, 0);
        this.container.add(this.modalContainer);
        
        this.modalBg = addWindow(this.scene, 0, 0, this.getWidth(), this.getHeight());
        this.modalContainer.add(this.modalBg);
        
        this.titleText = addTextObject(
            this.scene, 
            this.getWidth() / 2, 
            10, 
            "Tutorial Hub", 
            TextStyle.WINDOW,
            { fontSize: "120px" }  
        );
        this.titleText.setOrigin(0.5, 0);
        this.modalContainer.add(this.titleText);

        const gameWidth = this.scene.game.canvas.width / 6;
        const gameHeight = this.scene.game.canvas.height / 6;
        
        const centerX = gameWidth / 2;
        const centerY = gameHeight / 2;
        
        this.modalContainer.setPosition(
            centerX - (this.getWidth()/2)/2,  
            centerY - (this.getHeight()/2)/2  
        );
        
        this.modalContainer.setScale(1);
        
        this.container.setDepth(1000);
        this.container.setVisible(true);
        
        if (DEBUG_UI) {
            console.log("Modal container setup", {
                gameWidth, 
                gameHeight,
                centerX,
                centerY,
                windowWidth: this.getWidth(),
                windowHeight: this.getHeight(), 
                position: { 
                    x: centerX - (this.getWidth()/2)/2, 
                    y: centerY - (this.getHeight()/2)/2 
                },
                scale: this.modalContainer.scale
            });
        }
    }
    
    private setupContent(): void {
        this.tutorialNavContainer = this.scene.add.container(20, 40);
        this.modalContainer.add(this.tutorialNavContainer);
        
        this.tutorialContentContainer = this.scene.add.container(80, 40);
        this.modalContainer.add(this.tutorialContentContainer);
        
        this.createVerticalNav();
        
        this.showTutorialContent(0);
    }
    
    private createVerticalNav(): void {
        this.tutorialButtonContainers.forEach(container => container.destroy());
        this.tutorialButtonContainers = [];
        
        const buttonWidth = 60;
        const buttonHeight = 8;
        const spacing = 10;
        let yPos = 0;
        
        this.allTutorials.forEach((item, index) => {
            const buttonContainer = this.scene.add.container(0, yPos);
            
            let bg;
            if (item.tutorial === null && item.name !== "Back") {
                bg = this.scene.add.rectangle(
                    buttonWidth / 2,
                    0,
                    buttonWidth,
                    buttonHeight,
                    0x666666
                );
            } else {
                bg = this.scene.add.rectangle(
                    buttonWidth / 2,
                    0,
                    buttonWidth,
                    buttonHeight,
                    0x444444
                );
            }
            
            bg.setInteractive();
            
            let buttonText;
            if (item.tutorial === null && item.name !== "Back") {
                buttonText = addTextObject(
                    this.scene,
                    buttonWidth / 2,
                    0,
                    item.name,
                    TextStyle.WINDOW,
                    { 
                        fontSize: "70px",
                        fontStyle: "bold"
                    }
                );
            } else {
                const xOffset = item.name === "Back" ? 0 : 5;
                buttonText = addTextObject(
                    this.scene,
                    buttonWidth / 2 + xOffset,
                    0,
                    item.name,
                    TextStyle.WINDOW,
                    { fontSize: "60px" }
                );
            }
            
            buttonText.setOrigin(0.5, 0.5);
            
            buttonContainer.add([bg, buttonText]);
            
            bg.on('pointerup', () => {
                this.selectTutorial(index);
            });
            
            this.tutorialButtonContainers.push(buttonContainer);
            
            this.tutorialNavContainer.add(buttonContainer);
            
            yPos += buttonHeight + spacing;
        });
        
        this.setTutorialIndex(0);
    }
    
    private selectTutorial(index: number): void {
        if (index < 0 || index >= this.allTutorials.length) {
            return;
        }
        
        const item = this.allTutorials[index];
        
        this.setTutorialIndex(index);
        
        if (item.name === "Back") {
            this.exitTutorialList();
            return;
        }
        
        if (item.tutorial === null) {
            return;
        }
        
        this.showTutorialContent(index);
    }
    
    private showTutorialContent(index: number): void {
        if (index < 0 || index >= this.allTutorials.length) {
            return;
        }
        
        const item = this.allTutorials[index];
        
        this.tutorialContentContainer.removeAll(true);
        
        if (item.tutorial === null) {
            if (item.name === "Back") {
                const exitText = addTextObject(
                    this.scene,
                    80,
                    40,
                    "Exit tutorial viewer?",
                    TextStyle.WINDOW,
                    { 
                        fontSize: "80px",
                        wordWrap: { width: 150 * 6, useAdvancedWrap: true }
                    }
                );
                exitText.setOrigin(0.5, 0.5);
                this.tutorialContentContainer.add(exitText);
            } else {
                const categoryText = addTextObject(
                    this.scene,
                    80,
                    40,
                    `${item.name} tutorials`,
                    TextStyle.WINDOW,
                    { 
                        fontSize: "80px",
                        wordWrap: { width: 150 * 6, useAdvancedWrap: true }
                    }
                );
                categoryText.setOrigin(0.5, 0.5);
                this.tutorialContentContainer.add(categoryText);
            }
            return;
        }
        
        const tutorialName = this.getTutorialName(item.tutorial);
        
        const titleText = addTextObject(
            this.scene,
            0,
            0,
            tutorialName,
            TextStyle.WINDOW,
            { fontSize: "90px" }
        );
        this.tutorialContentContainer.add(titleText);
        
        const descText = addTextObject(
            this.scene,
            0,
            30,
            `View this tutorial to learn about ${tutorialName}.`,
            TextStyle.WINDOW,
            { 
                fontSize: "70px",
                wordWrap: { width: 150 * 6, useAdvancedWrap: true }
            }
        );
        this.tutorialContentContainer.add(descText);
        
        const viewButton = this.scene.add.rectangle(
            75,
            90,
            100,
            20,
            0x555555
        );
        viewButton.setInteractive();
        
        const viewText = addTextObject(
            this.scene,
            75,
            90,
            "View Tutorial",
            TextStyle.WINDOW,
            { fontSize: "70px" }
        );
        viewText.setOrigin(0.5, 0.5);
        
        viewButton.on('pointerup', () => {
            this.showSingleTutorial(item.tutorial);
        });
        
        this.tutorialContentContainer.add([viewButton, viewText]);
    }
    
    private getTutorialName(tutorialEnum: Tutorial | EnhancedTutorial): string {
        const enumStr = tutorialEnum.toString();
        
        return enumStr.split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    
    private showSingleTutorial(tutorialEnum: Tutorial | EnhancedTutorial): void {
        if (DEBUG_UI) {
            console.log(`Showing single tutorial: ${tutorialEnum}`);
        }
        
        this.tutorialService.showTutorial(tutorialEnum, false);
    }
    
    private exitTutorialList(): void {
        if (DEBUG_UI) {
            console.log("Exiting tutorial list");
        }
        
        this.scene.ui.revertMode();
    }

    private setTutorialIndex(index: number): boolean {
        if (index < 0 || index >= this.activeTutorialCount) {
            return false;
        }
        
        if (this.currentTutorialIndex >= 0 && this.currentTutorialIndex < this.tutorialButtonContainers.length) {
            const currentButton = this.tutorialButtonContainers[this.currentTutorialIndex].getAt(0) as Phaser.GameObjects.Rectangle;
            if (this.allTutorials[this.currentTutorialIndex].tutorial === null && 
                this.allTutorials[this.currentTutorialIndex].name !== "Back") {
                currentButton.setFillStyle(0x666666);
            } else {
                currentButton.setFillStyle(0x444444);
            }
        }
        
        const previousIndex = this.currentTutorialIndex;
        this.currentTutorialIndex = index;
        
        if (this.currentTutorialIndex >= 0 && this.currentTutorialIndex < this.tutorialButtonContainers.length) {
            const newButton = this.tutorialButtonContainers[this.currentTutorialIndex].getAt(0) as Phaser.GameObjects.Rectangle;
            newButton.setFillStyle(0x888888);
            
            if (previousIndex !== this.currentTutorialIndex) {
                this.showTutorialContent(this.currentTutorialIndex);
            }
        }
        
        return true;
    }
    
    processInput(button: Button): boolean {
        const ui = this.getUi();
        let handled = false;
        
        switch (button) {
            case Button.UP:
                if (this.setTutorialIndex(this.currentTutorialIndex - 1)) {
                    ui.playSelect();
                    handled = true;
                }
                break;
                
            case Button.DOWN:
                if (this.setTutorialIndex(this.currentTutorialIndex + 1)) {
                    ui.playSelect();
                    handled = true;
                }
                break;
                
            case Button.SUBMIT:
            case Button.RIGHT:
                const currentItem = this.allTutorials[this.currentTutorialIndex];
                if (currentItem.tutorial) {
                    this.showSingleTutorial(currentItem.tutorial);
                    ui.playSelect();
                    handled = true;
                } else if (currentItem.name === "Back") {
                    this.exitTutorialList();
                    ui.playSelect();
                    handled = true;
                }
                break;
                
            case Button.ACTION:
                const item = this.allTutorials[this.currentTutorialIndex];
                if (item.tutorial) {
                    this.showSingleTutorial(item.tutorial);
                    ui.playSelect();
                    handled = true;
                } else if (item.name === "Back") {
                    this.exitTutorialList();
                    ui.playSelect();
                    handled = true;
                }
                break;
                
            case Button.CANCEL:
                this.exitTutorialList();
                ui.playSelect();
                handled = true;
                break;
        }
        
        return handled;
    }
    
    clear(): void {
        if (DEBUG_UI) {
            console.log("Clearing tutorial list UI");
        }
        
        if (this.modalContainer) {
            this.modalContainer.destroy();
            this.modalContainer = null;
        }
        
        if (this.container) {
            this.container.destroy();
            this.container = null;
        }
        
        this.tutorialButtonContainers = [];
        this.currentTutorialIndex = 0;
        this.activeTutorialCount = 0;
        
        this.active = false;
    }
} 