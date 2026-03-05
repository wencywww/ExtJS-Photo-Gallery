const { inject, computed } = Vue;

export const NodeActionSheet = {
    name: 'NodeActionSheet',
    setup() {
        const store = inject('store');
        const api   = inject('api');

        // Human-readable label from path "YYYY/MM/DD"
        const _localeMap = { bg: 'bg-BG', en: 'en-US' };

        const dayLabel = computed(() => {
            const path = store.nodeSheetPath;
            if (!path) return '';
            const parts = path.split('/');
            if (parts.length !== 3) return path;
            try {
                const bcp47 = _localeMap[store.locale] || undefined;
                const d = new Date(parts[0] + '-' + parts[1] + '-' + parts[2]);
                return d.toLocaleDateString(bcp47, { day: '2-digit', month: 'long', year: 'numeric' });
            } catch(e) { return path; }
        });

        // Close sheet and return the captured path for use by async callers
        function closeSheet() {
            const path = store.nodeSheetPath;
            store.nodeSheetOpen = false;
            store.nodeSheetPath = null;
            return path;
        }

        function close() {
            closeSheet();
        }

        async function openDateChange() {
            const path = closeSheet();
            if (!path) return;
            store.loading = true;
            try {
                const data   = await api.getAllPhotosForDay(path);
                const photos = data.RECORDS || [];
                if (photos.length > 0) {
                    store.dateChangePhotos = photos;
                    store.dateChangeOpen   = true;
                }
            } catch(e) {
                console.error('NodeActionSheet: getAllPhotosForDay failed', e);
            } finally {
                store.loading = false;
            }
        }

        async function openGpsEditor() {
            const path = closeSheet();
            if (!path) return;
            store.loading = true;
            try {
                const data   = await api.getAllPhotosForDay(path);
                const photos = data.RECORDS || [];
                if (photos.length > 0) {
                    store.gpsEditorPhotos = photos;
                    store.gpsEditorOpen   = true;
                }
            } catch(e) {
                console.error('NodeActionSheet: getAllPhotosForDay failed', e);
            } finally {
                store.loading = false;
            }
        }

        return { store, dayLabel, close, openDateChange, openGpsEditor };
    },
    template: `
        <div>
            <div class="sheet-backdrop visible" @click="close"></div>
            <div class="bottom-sheet open" role="dialog">
                <div class="sheet-handle"></div>
                <div class="sheet-title">
                    <i class="fas fa-calendar-check" style="margin-right:6px"></i>
                    {{ dayLabel }}
                </div>
                <div class="sheet-body">

                    <!-- Change Date for all photos of this day -->
                    <div class="action-sheet-item" @click="openDateChange">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="action-label">{{ store.t.dateChange?.winTitle || 'Change Date' }} ({{ store.t.allLabel || 'all' }})</span>
                    </div>

                    <!-- GPS Editor for all photos of this day -->
                    <div class="action-sheet-item" @click="openGpsEditor">
                        <i class="fas fa-map-marker-alt"></i>
                        <span class="action-label">{{ store.t.gps?.winTitle || 'GPS Editor' }} ({{ store.t.allLabel || 'all' }})</span>
                    </div>

                    <!-- Cancel -->
                    <div class="action-sheet-item" @click="close" style="border-top: 2px solid var(--color-border)">
                        <i class="fas fa-times"></i>
                        <span class="action-label">{{ store.t.btnCancel || 'Cancel' }}</span>
                    </div>

                </div>
            </div>
        </div>
    `
};
