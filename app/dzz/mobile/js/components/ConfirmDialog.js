const { inject } = Vue;

export const ConfirmDialog = {
    name: 'ConfirmDialog',
    setup() {
        const store = inject('store');

        /** Calls the stored onConfirm callback and closes the dialog. */
        function confirm() {
            if (store.confirmDialog.onConfirm) {
                store.confirmDialog.onConfirm();
            }
            store.confirmDialog.open = false;
        }

        /** Closes the dialog without calling the onConfirm callback. */
        function cancel() {
            store.confirmDialog.open = false;
        }

        return { store, confirm, cancel };
    },
    template: `
        <div class="modal-backdrop" @click.self="cancel">
            <div class="modal-card" style="max-width:340px" role="alertdialog">
                <div class="modal-header" style="background:var(--color-accent)">
                    <i class="fas fa-exclamation-triangle" style="margin-right:8px"></i>
                    <span class="modal-header-title">{{ store.confirmDialog.title }}</span>
                </div>
                <div class="modal-body">
                    <p class="confirm-message">{{ store.confirmDialog.message }}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-txt" @click="cancel">Cancel</button>
                    <button class="btn-primary" style="background:var(--color-accent)" @click="confirm">
                        <i class="fas fa-check"></i> OK
                    </button>
                </div>
            </div>
        </div>
    `
};
