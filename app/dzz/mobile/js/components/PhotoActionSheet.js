const { ref, inject, computed } = Vue;

export const PhotoActionSheet = {
    name: 'PhotoActionSheet',
    setup() {
        const store = inject('store');
        const api   = inject('api');

        const showRotateSub = ref(false);

        /** Closes the action sheet and hides the rotate sub-menu. */
        function close() {
            store.actionSheetOpen = false;
            showRotateSub.value   = false;
        }

        /** Closes the action sheet and exits selection mode, clearing the selected photos. */
        function closeAndClearSelection() {
            close();
            store.selectionMode  = false;
            store.selectedPhotos = [];
        }

        const count         = computed(() => store.selectedPhotos.length);
        const hasSingleGps  = computed(() =>
            count.value === 1 && store.selectedPhotos[0]?.gpsData === 1
        );

        // ===== Rotate =====
        /** Rotates selected photos by the given angle and reloads the grid. */
        async function rotate(angle) {
            close();
            store.loading = true;
            try {
                await api.rotatePhotos(store.selectedPhotos, angle);
                // Reload current photos after rotate
                if (store._reloadPhotos) await store._reloadPhotos();
            } catch(e) {
                console.error('Rotate failed', e);
            }
            store.loading = false;
            closeAndClearSelection();
        }

        // ===== Delete =====
        /** Shows a confirmation dialog and deletes selected photos upon confirmation. */
        function deleteSelected() {
            close();
            const photos = [...store.selectedPhotos];
            store.confirmDialog = {
                open:    true,
                title:   store.t.gallery?.menuDeleteConfirmTitle || 'FILE DELETION',
                message: photos.length + (store.t.gallery?.menuDeleteConfirmText || ' files to be deleted'),
                onConfirm: async () => {
                    store.loading = true;
                    try {
                        await api.deletePhotos(photos);
                        if (store._reloadPhotos) await store._reloadPhotos();
                        if (store._loadRoot)     await store._loadRoot();
                    } catch(e) {
                        console.error('Delete failed', e);
                    }
                    store.loading = false;
                    closeAndClearSelection();
                }
            };
        }

        // ===== Change Date =====
        /** Opens the DateChangeModal pre-loaded with the selected photos. */
        function changeDate() {
            close();
            store.dateChangePhotos = [...store.selectedPhotos];
            store.dateChangeOpen   = true;
        }

        // ===== GPS =====
        /** Opens the GPS Editor pre-loaded with the selected photos. */
        function openGps() {
            close();
            store.gpsEditorPhotos = [...store.selectedPhotos];
            store.gpsEditorOpen   = true;
        }

        // ===== GPS Map Viewer =====
        /** Opens the read-only GPS map for the single selected photo. */
        function openGpsMap() {
            close();
            store.gpsMapPhoto = store.selectedPhotos[0];
            store.gpsMapOpen  = true;
        }

        // ===== EXIF =====
        /** Fetches and parses EXIF data for the single selected photo and opens ExifModal. */
        async function viewExif() {
            close();
            const photo = store.selectedPhotos[0];
            if (!photo) return;
            store.exifPhotoUri  = photo.realUri;
            store.exifData      = null;
            store.exifModalOpen = true;

            // Load EXIF from first selected photo
            try {
                const resp = await fetch(photo.realUri + '?_dc=' + Date.now());
                const blob = await resp.blob();
                const buf  = await blob.arrayBuffer();
                const tags = ExifReader.load(buf, { expanded: true });
                const rows = [];
                const seen = new Set();
                for (const group of Object.values(tags)) {
                    if (typeof group !== 'object') continue;
                    for (const [key, tag] of Object.entries(group)) {
                        if (key === 'MakerNote' || seen.has(key)) continue;
                        seen.add(key);
                        const val = tag?.description ?? tag?.value ?? null;
                        if (val !== null && val !== undefined && val !== '') {
                            rows.push({ key, val: String(val) });
                        }
                    }
                }
                store.exifData = rows;
            } catch(e) {
                store.exifData = [];
            }
        }

        return { store, count, hasSingleGps, showRotateSub, close, rotate, deleteSelected, changeDate, openGps, openGpsMap, viewExif };
    },
    template: `
        <div>
            <div class="sheet-backdrop visible" @click="close"></div>
            <div class="bottom-sheet open" role="dialog">
                <div class="sheet-handle"></div>
                <div class="sheet-title">
                    {{ count }} {{ store.t.nSelected || 'selected' }}
                </div>
                <div class="sheet-body">

                    <!-- Rotate -->
                    <div
                        class="action-sheet-item"
                        @click="showRotateSub = !showRotateSub"
                    >
                        <i class="fas fa-redo-alt"></i>
                        <span class="action-label">{{ store.t.gallery?.menuRotate || 'Rotation' }}</span>
                        <i class="fas fa-chevron-right" style="margin-left:auto; color:var(--color-text-muted); font-size:0.75rem"
                           :style="{ transform: showRotateSub ? 'rotate(90deg)' : '' }"></i>
                    </div>
                    <div v-if="showRotateSub" class="action-sub-group">
                        <button class="action-sub-btn" @click="rotate(90)">
                            {{ store.t.gallery?.menuRotate90 || '90°' }}
                        </button>
                        <button class="action-sub-btn" @click="rotate(-90)">
                            {{ store.t.gallery?.menuRotateMinus90 || '-90°' }}
                        </button>
                        <button class="action-sub-btn" @click="rotate(180)">
                            {{ store.t.gallery?.menuRotate180 || '180°' }}
                        </button>
                    </div>

                    <!-- Change date -->
                    <div class="action-sheet-item" @click="changeDate">
                        <i class="fas fa-calendar-alt"></i>
                        <span class="action-label">{{ store.t.dateChange?.winTitle || 'Change Date' }}</span>
                    </div>

                    <!-- GPS -->
                    <div class="action-sheet-item" @click="openGps">
                        <i class="fas fa-map-marker-alt"></i>
                        <span class="action-label">{{ store.t.gps?.winTitle || 'GPS Editor' }}</span>
                    </div>

                    <!-- GPS Map Viewer (only if single photo with GPS data) -->
                    <div v-if="hasSingleGps" class="action-sheet-item" @click="openGpsMap">
                        <i class="fas fa-map"></i>
                        <span class="action-label">{{ store.t.gps?.mapViewTitle || 'View on Map' }}</span>
                    </div>

                    <!-- EXIF -->
                    <div v-if="count === 1" class="action-sheet-item" @click="viewExif">
                        <i class="fas fa-info-circle"></i>
                        <span class="action-label">{{ store.t.exif?.exifTitle || 'EXIF data' }}</span>
                    </div>

                    <!-- Delete -->
                    <div class="action-sheet-item danger" @click="deleteSelected">
                        <i class="fas fa-trash-alt"></i>
                        <span class="action-label">{{ store.t.gallery?.menuDelete || 'Erase selected...' }}</span>
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
