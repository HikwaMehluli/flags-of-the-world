import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Check if the primary tour element exists before doing anything else.
// This ensures the tour only runs on the intended page.
if (document.querySelector(".intro-continent")) {
	const tourSeenKey = "driverjs-tour-seen-count";
	let seenCount = localStorage.getItem(tourSeenKey);

	if (seenCount === null) {
		seenCount = 0;
	} else {
		seenCount = parseInt(seenCount, 10);
	}

	if (seenCount < 2) {
		const newCount = seenCount + 1;
		localStorage.setItem(tourSeenKey, newCount);

		const driverObj = driver({
			popoverClass: "driverjs-theme",
			prevBtnText: "Back",
			nextBtnText: "Next",
			closeBtnText: "Close",
			showProgress: true,
			overlayColor: "blue",
			steps: [
				{
					element: ".intro-continent",
					popover: {
						title: "Game Play",
						description:
							"Start by selecting the continent you wish to explore.",
					},
				},
				{
					element: ".intro-difficulty",
					popover: {
						title: "Level Difficulty",
						description:
							"Next, choose the level of difficulty you want to play.",
					},
				},
				{
					element: ".intro-region",
					popover: {
						title: "Region Selection",
						description:
							"Finally, select the specific region you want to play with.",
					},
				},
				{
					popover: {
						title: "Good Luck",
						description:
							"Have fun playing the game and learning about our worlds diversity!",
					},
				},
			],
		});

		driverObj.drive();
	}
}