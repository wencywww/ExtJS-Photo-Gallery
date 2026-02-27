const { ref, computed, inject, onMounted } = Vue;

export const DateChangeModal = {
    name: 'DateChangeModal',
    setup() {
        const store = inject('store');
        const api   = inject('api');

        // Default to first photo's date if available
        const defaultDate = computed(() => {
            const photo = store.dateChangePhotos[0];
            if (!photo) return '';
            // caption is "YYYY-MM-DD / filename"
            const match = photo.caption && photo.caption.match(/^(\d{4}-\d{2}-\d{2})/);
            return match ? match[1] : '';
        });

        const targetDate = ref('');
        const saving     = ref(false);

        function open() {
            targetDate.value = defaultDate.value;
        }

        function close() {
            store.dateChangeOpen   = false;
            store.dateChangePhotos = [];
        }

        async function save() {
            if (!targetDate.value) return;
            saving.value = true;
            try {
                await api.changePhotoDates(store.dateChangePhotos, targetDate.value);
                // Reload tree (date changed = photos moved)
                if (store._loadRoot)     await store._loadRoot();
                if (store._reloadPhotos) await store._reloadPhotos();
                store.selectionMode  = false;
                store.selectedPhotos = [];
                close();
            } catch(e) {
                console.error('Date change failed', e);
            }
            saving.value = false;
        }

        // Initialize date on creation
        targetDate.value = '';
        // Will be set correctly when component mounts via created-like logic
        onMounted(() => {
            targetDate.value = defaultDate.value;
        });

        return { store, targetDate, saving, save, close };
    },
    template: `
        <div class="modal-backdrop" @click.self="close">
            <div class="modal-card" role="dialog">
                <div class="modal-header">
                    <i class="fas fa-calendar-alt" style="margin-right:8px"></i>
                    <span class="modal-header-title">
                        {{ store.t.dateChange?.winTitle || 'FILE DATE CHANGE' }}
                    </span>
                    <button class="header-btn" @click="close" style="color:#fff; width:32px; height:32px">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <p style="font-size:0.85rem; color:var(--color-text-muted); margin-bottom:14px">
                        {{ store.t.dateChange?.displayField || 'Change date for the selected photos' }}
                        ({{ store.dateChangePhotos.length }})
                    </p>
                    <div class="form-row">
                        <label class="form-label">{{ store.t.dateChange?.dateFieldLbl || 'New date' }}</label>
                        <input
                            type="date"
                            class="form-input"
                            v-model="targetDate"
                            :disabled="saving"
                        />
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-txt" @click="close" :disabled="saving">
                        {{ store.t.dateChange?.btnCancel || 'Cancel' }}
                    </button>
                    <button
                        class="btn-primary"
                        @click="save"
                        :disabled="!targetDate || saving"
                    >
                        <i class="fas fa-save"></i>
                        {{ store.t.dateChange?.btnWrite || 'Save' }}
                    </button>
                </div>
            </div>
        </div>
    `
};
