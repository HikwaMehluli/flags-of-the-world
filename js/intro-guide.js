import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const driverObj = driver({
    popoverClass: 'driverjs-theme',
    prevBtnText: "Back",
    nextBtnText: "Next",
    closeBtnText: "Close",
    showProgress: true,
    steps: [
        { element: '.intro-menu', popover: { title: 'Navigation', description: 'This is where you can access the main menu navigation.' } },
        { element: '.intro-continent', popover: { title: 'Game Play', description: 'Start by selecting the continent you wish to explore.' } },
        { element: '.intro-difficulty', popover: { title: 'Level Difficulty', description: 'Next, choose the level of difficulty you want to play.' } },
        { element: '.intro-region', popover: { title: 'Region Selection', description: 'Finally, select the specific region you want to play with.' } },
        { popover: { title: 'Good Luck', description: 'Have fun playing the game!' } }
    ]
});

driverObj.drive();