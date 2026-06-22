/**
 * Toast notification system for user feedback
 * @module utils/toast
 */

let toastContainer = null;

/**
 * Initialize toast container
 */
function initToastContainer() {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    toastContainer.setAttribute('aria-live', 'polite');
    document.body.appendChild(toastContainer);
  }
}

/**
 * Show toast notification
 * @param {string} message - Toast message
 * @param {string} [type='info'] - Toast type (success, error, warning, info)
 * @param {number} [duration=5000] - Auto-dismiss duration in ms
 * @param {Function} [onAction] - Action button callback
 * @param {string} [actionText] - Action button text
 * @returns {HTMLElement} Toast element
 */
export function showToast(message, type = 'info', duration = 5000, onAction = null, actionText = null) {
  initToastContainer();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.setAttribute('role', 'alert');

  const icon = getToastIcon(type);

  toast.innerHTML = `
    <span class="toast-icon">${icon}</span>
    <span class="toast-message">${message}</span>
    ${actionText ? `<button class="toast-action">${actionText}</button>` : ''}
    <button class="toast-dismiss" aria-label="Close">&times;</button>
  `;

  toastContainer.appendChild(toast);

  // Animate in
  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  // Action button
  if (onAction && actionText) {
    const actionBtn = toast.querySelector('.toast-action');
    actionBtn.addEventListener('click', () => {
      onAction();
      hideToast(toast);
    });
  }

  // Dismiss button
  const dismissBtn = toast.querySelector('.toast-dismiss');
  dismissBtn.addEventListener('click', () => {
    hideToast(toast);
  });

  // Auto-dismiss
  if (duration > 0) {
    setTimeout(() => {
      hideToast(toast);
    }, duration);
  }

  return toast;
}

/**
 * Hide toast notification
 * @param {HTMLElement} toast - Toast element
 */
export function hideToast(toast) {
  if (!toast) return;

  toast.classList.remove('show');
  toast.classList.add('hide');

  setTimeout(() => {
    toast.remove();
  }, 300);
}

/**
 * Show success toast
 * @param {string} message - Message
 * @param {number} [duration=3000] - Duration
 */
export function showSuccessToast(message, duration = 3000) {
  return showToast(message, 'success', duration);
}

/**
 * Show error toast
 * @param {string} message - Message
 * @param {number} [duration=10000] - Duration
 * @param {Function} [onRetry] - Retry callback
 */
export function showErrorToast(message, duration = 10000, onRetry = null) {
  return showToast(message, 'error', duration, onRetry, 'Retry');
}

/**
 * Show warning toast
 * @param {string} message - Message
 * @param {number} [duration=5000] - Duration
 */
export function showWarningToast(message, duration = 5000) {
  return showToast(message, 'warning', duration);
}

/**
 * Show info toast
 * @param {string} message - Message
 * @param {number} [duration=5000] - Duration
 */
export function showInfoToast(message, duration = 5000) {
  return showToast(message, 'info', duration);
}

/**
 * Get icon for toast type
 * @param {string} type - Toast type
 * @returns {string} Icon emoji
 */
function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[type] || icons.info;
}

/**
 * Clear all toasts
 */
export function clearAllToasts() {
  if (toastContainer) {
    toastContainer.innerHTML = '';
  }
}
