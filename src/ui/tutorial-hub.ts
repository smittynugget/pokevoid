import BattleScene from "../battle-scene";
import { Mode } from "./ui";
import i18next from "i18next";


export function showTutorialHub(scene: BattleScene): void {
    if (!scene) {
        console.error("Invalid scene passed to showTutorialHub");
        return;
    }
    
    if (!scene.ui) {
        console.error("Scene UI is not initialized");
        return;
    }
    
    try {
        console.log("Opening tutorial hub menu");
        scene.ui.setOverlayMode(Mode.TUTORIAL, {}, {
            isFromMenu: true,
            title: i18next.t("tutorial:hubTitle", "Tutorial Hub"),
            stages: [],
            isTipActive: false
        });
    } catch (error) {
        console.error("Error opening tutorial hub:", error);
    }
}

export function addTutorialHubToMainMenu(scene: BattleScene, menuOptions: string[], menuActions: Function[]): void {
    if (!scene || !menuOptions || !menuActions) {
        console.error("Invalid parameters for addTutorialHubToMainMenu");
        return;
    }
    
    const tutorialOptionText = "Tutorials";
    const insertIndex = Math.max(0, menuOptions.length - 1);
    
    menuOptions.splice(insertIndex, 0, tutorialOptionText);
    menuActions.splice(insertIndex, 0, () => {
        showTutorialHub(scene);
    });
    
    console.log(`Added Tutorial hub to main menu at index ${insertIndex}`);
}