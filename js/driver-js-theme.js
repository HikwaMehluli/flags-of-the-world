import { driver } from "driver.js";
import "driver.js/dist/driver.css";

// Check if the primary tour element exists before doing anything else.
// This ensures the tour only runs on the intended page.
if (document.querySelector("#intro-tour-check")) {
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
					element: "#continent-select",
					popover: {
						title: "Game Play",
						description:
							"Start by selecting the continent you wish to explore.",
					},
				},
				{
					element: "#difficulty-select",
					popover: {
						title: "Level Difficulty",
						description:
							"Next, choose the level of difficulty you want to play.",
					},
				},
				{
					element: "#region-select",
					popover: {
						title: "Region Selection",
						description:
							"Finally, select the specific region you want to play.",
					},
				},
				{
					popover: {
						title: "Good Luck",
						description:
							"Have fun playing the game and learning about the worlds diversity!",
					},
				},
			],
		});

		driverObj.drive();
	}
}