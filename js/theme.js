document.addEventListener('DOMContentLoaded', () => {
	const themeToggle = document.getElementById('theme-toggle');
	const body = document.body;

	// Function to apply the theme based on preference
	const applyTheme = (theme) => {
		if (theme === 'dark') {
			body.classList.add('dark-mode');
		} else {
			body.classList.remove('dark-mode');
		}
	};

	// Check for saved theme in localStorage
	const savedTheme = localStorage.getItem('theme');

	if (savedTheme) {
		applyTheme(savedTheme);
	} else {
		// Check system preference if no saved theme
		const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
		applyTheme(prefersDark ? 'dark' : 'light');
	}

	// Save theme preference on click
	themeToggle.addEventListener('click', () => {
		if (body.classList.contains('dark-mode')) {
			applyTheme('light');
			localStorage.setItem('theme', 'light');
		} else {
			applyTheme('dark');
			localStorage.setItem('theme', 'dark');
		}
	});

	// Listen for system theme changes
	window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
		// Only apply system theme change if user hasn't set a preference
		if (!localStorage.getItem('theme')) {
			applyTheme(e.matches ? 'dark' : 'light');
		}
	});
});