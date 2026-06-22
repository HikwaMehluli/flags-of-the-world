document.addEventListener('DOMContentLoaded', () => {
    // Get references to the menu icon, sidebar, overlay, and game container elements
    const menuIcon = document.getElementById('menu-icon');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const gameContainer = document.querySelector('.game-container');

    // Check if the menu icon exists to avoid errors on pages where it might be absent
    if (menuIcon) {
        // Add a click event listener to the menu icon
        menuIcon.addEventListener('click', () => {
            // Toggle the 'open' class on the menu icon, sidebar, and overlay to show or hide them
            menuIcon.classList.toggle('open');
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
        });
    }

    // Check if the overlay exists
    if (overlay) {
        // Add a click event listener to the overlay
        overlay.addEventListener('click', () => {
            // When the overlay is clicked, close the sidebar by removing the 'open' class
            menuIcon.classList.remove('open');
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            // Also, remove the blur effect from the game container if it exists
            if (gameContainer) {
                gameContainer.classList.remove('blur');
            }
        });
    }
});