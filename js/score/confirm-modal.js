export function showConfirmModal(message) {
    return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.style.display = 'block';
        overlay.innerHTML = `
            <div class="modal-content confirm-modal-content">
                <p>${message}</p>
                <div class="confirm-modal-actions">
                    <button class="btn-cancel">Cancel</button>
                    <button class="btn-confirm">Yes, clear</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.btn-cancel').onclick = () => {
            overlay.remove();
            resolve(false);
        };
        overlay.querySelector('.btn-confirm').onclick = () => {
            overlay.remove();
            resolve(true);
        };
        overlay.onclick = e => {
            if (e.target === overlay) {
                overlay.remove();
                resolve(false);
            }
        };
    });
}
