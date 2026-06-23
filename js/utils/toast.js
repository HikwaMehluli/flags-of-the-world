/**
 * toast.js — Toast notification system
 *
 * Shows small pop-up messages that auto-dismiss.
 * Only used for the "New Personal Best!" celebration.
 *
 * @module utils/toast
 */

let toastContainer = null;

/**
 * Create the container element that holds all toasts.
 * Only called once — subsequent calls are no-ops.
 */
function initContainer() {
	if (toastContainer) return;
	toastContainer = document.createElement('div');
	toastContainer.className = 'toast-container';
	toastContainer.setAttribute('aria-live', 'polite');
	document.body.appendChild(toastContainer);
}

/**
 * Show a toast notification.
 *
 * @param {string} message - The text to display
 * @param {'success'|'error'|'warning'|'info'} [type='info'] - Visual style
 * @param {number} [duration=5000] - Auto-dismiss time in ms (0 = sticky)
 * @returns {HTMLElement} The toast DOM element
 */
export function showToast(message, type = 'info', duration = 5000) {
	initContainer();

	const toast = document.createElement('div');
	toast.className = `toast toast-${type}`;
	toast.setAttribute('role', 'alert');

	const icon = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[type] || 'ℹ';

	toast.innerHTML = `
		<span class="toast-icon">${icon}</span>
		<span class="toast-message">${message}</span>
		<button class="toast-dismiss" aria-label="Close">&times;</button>
	`;

	toastContainer.appendChild(toast);

	// Animate in (CSS transition)
	requestAnimationFrame(() => toast.classList.add('show'));

	// Dismiss button
	toast.querySelector('.toast-dismiss').onclick = () => hideToast(toast);

	// Auto-dismiss (if duration > 0)
	if (duration > 0) {
		setTimeout(() => hideToast(toast), duration);
	}

	return toast;
}

/**
 * Hide and remove a toast with a fade-out animation.
 *
 * @param {HTMLElement} toast - The toast element to hide
 */
export function hideToast(toast) {
	if (!toast || !toast.parentNode) return;
	toast.classList.remove('show');
	toast.classList.add('hide');
	setTimeout(() => toast.remove(), 300);
}

/**
 * Convenience: show a success toast (used when player gets a personal best).
 *
 * @param {string} message - Success message
 * @param {number} [duration=3000] - How long to show it
 * @returns {HTMLElement}
 */
export function showSuccessToast(message, duration = 3000) {
	return showToast(message, 'success', duration);
}
