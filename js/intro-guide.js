import { driver } from "driver.js";
import "driver.js/dist/driver.css";

const driverObj = driver({
    showProgress: true,
    steps: [
        { element: '.page-header', popover: { title: 'Title', description: 'Description' } },
        { element: '.top-nav', popover: { title: 'Title', description: 'Description' } },
        { element: '.sidebar', popover: { title: 'Title', description: 'Description' } },
        { element: '.footer', popover: { title: 'Title', description: 'Description' } },
    ]
});

driverObj.drive();


