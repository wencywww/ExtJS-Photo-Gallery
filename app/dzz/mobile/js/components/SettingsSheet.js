const { inject, ref } = Vue;

export const SettingsSheet = {
    name: 'SettingsSheet',
    setup() {
        const store = inject('store');
        const api   = inject('api');

        /** Closes the settings bottom sheet. */
        function close() { store.settingsOpen = false; }

        /** Sets the sort order and reloads the current photos immediately. */
        function setSort(val) {
            store.photosSort = val;
            if (store._reloadPhotos) store._reloadPhotos();
        }

        // ===== SQLite index rebuild (chunked — no single long request, see galleryIndex.php) =====
        const rebuilding = ref(false);
        const rebuildProgress = ref('');

        /** Runs the chunked server-side index rebuild with live progress. */
        async function rebuildIndex() {
            if (rebuilding.value) return;
            rebuilding.value = true;
            rebuildProgress.value = '';
            const CHUNK_SIZE = 10;
            const t0 = Date.now();
            try {
                const init = await api.rebuildIndexInit();
                if (!init.success) throw new Error('init failed');
                const days = init.days;

                for (let i = 0; i < days.length; i += CHUNK_SIZE) {
                    const chunk = days.slice(i, i + CHUNK_SIZE);
                    const r = await api.rebuildIndexChunk(chunk);
                    if (!r.success) throw new Error('chunk failed');
                    rebuildProgress.value = Math.min(i + CHUNK_SIZE, days.length) + ' / ' + days.length;
                }

                const fin = await api.rebuildIndexFinish(days);
                if (!fin.success) throw new Error('finish failed');

                const duration = Math.round((Date.now() - t0) / 1000);
                const msg = (store.t.rebuildIndexDone || 'Index rebuilt: {0} files in {1} s')
                    .replace('{0}', fin.total).replace('{1}', duration);
                alert(msg);
                if (store._loadRoot) store._loadRoot();
            } catch (e) {
                alert('Error');
            }
            rebuilding.value = false;
            rebuildProgress.value = '';
        }

        return { store, close, setSort, rebuildIndex, rebuilding, rebuildProgress };
    },
    template: `
        <div>
            <div class="sheet-backdrop visible" @click="close"></div>
            <div class="bottom-sheet open" role="dialog" :aria-label="store.t.settings || 'Settings'">
                <div class="sheet-handle"></div>
                <div class="sheet-title">
                    <i class="fas fa-cog" style="margin-right:8px"></i>{{ store.t.settings || 'Settings' }}
                </div>
                <div class="sheet-body">

                    <!-- Sort -->
                    <div class="settings-section-label">{{ store.t.sortOrder || 'Sort order' }}</div>
                    <div class="sort-options">
                        <button
                            class="sort-option"
                            :class="{ active: store.photosSort === 'DESC' }"
                            @click="setSort('DESC')"
                        >
                            <i class="fas fa-sort-amount-down"></i>
                            {{ store.t.sortDESC || 'Newest first' }}
                        </button>
                        <button
                            class="sort-option"
                            :class="{ active: store.photosSort === 'ASC' }"
                            @click="setSort('ASC')"
                        >
                            <i class="fas fa-sort-amount-up"></i>
                            {{ store.t.sortASC || 'Oldest first' }}
                        </button>
                    </div>

                    <!-- Display settings -->
                    <div class="settings-section-label" style="margin-top:8px">{{ store.t.sectionDisplay || 'Display' }}</div>

                    <label class="settings-row">
                        <span class="settings-row-label">
                            <i class="fas fa-image" style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.showPhotos || 'Show Photos' }}
                        </span>
                        <span class="toggle">
                            <input type="checkbox" v-model="store.showPhotos">
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        </span>
                    </label>

                    <label class="settings-row">
                        <span class="settings-row-label">
                            <i class="fas fa-film" style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.showVideos || 'Show Videos' }}
                        </span>
                        <span class="toggle">
                            <input type="checkbox" v-model="store.showVideos">
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        </span>
                    </label>

                    <label class="settings-row">
                        <span class="settings-row-label">
                            <i class="fas fa-info-circle" style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.showExif || 'Show EXIF data' }}
                        </span>
                        <span class="toggle">
                            <input type="checkbox" v-model="store.showExifData">
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        </span>
                    </label>

                    <label class="settings-row">
                        <span class="settings-row-label">
                            <i class="fas fa-map-marker-alt" style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.indicateGpsLocation || 'Indicate GPS presence' }}
                        </span>
                        <span class="toggle">
                            <input type="checkbox" v-model="store.indicateGpsLocation" :disabled="!store.showExifData">
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        </span>
                    </label>

                    <label class="settings-row">
                        <span class="settings-row-label">
                            <i class="fas fa-play-circle" style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.autoPlayVideos || 'Autoplay video thumbs' }}
                        </span>
                        <span class="toggle">
                            <input type="checkbox" v-model="store.autoPlayVideos">
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        </span>
                    </label>

                    <!-- Navigation settings -->
                    <div class="settings-section-label" style="margin-top:8px">{{ store.t.sectionNavigation || 'Navigation' }}</div>

                    <label class="settings-row">
                        <span class="settings-row-label">
                            <i class="fas fa-th-large" style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.paginateDataView || 'Paginate gallery' }}
                        </span>
                        <span class="toggle">
                            <input type="checkbox" v-model="store.paginateDataView">
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        </span>
                    </label>

                    <label class="settings-row">
                        <span class="settings-row-label">
                            <i class="fas fa-bolt" style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.useIndex || 'Use SQLite index' }}
                        </span>
                        <span class="toggle">
                            <input type="checkbox" v-model="store.useIndex">
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        </span>
                    </label>

                    <div class="settings-row" style="cursor:pointer" @click="rebuildIndex">
                        <span class="settings-row-label">
                            <i :class="rebuilding ? 'fas fa-spinner fa-spin' : 'fas fa-database'"
                               style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.rebuildIndex || 'Rebuild index' }}
                        </span>
                        <span v-if="rebuildProgress" style="font-size:0.8rem; color:var(--color-text-muted)">
                            {{ rebuildProgress }}
                        </span>
                    </div>

                    <!-- Appearance -->
                    <div class="settings-section-label" style="margin-top:8px">{{ store.t.sectionAppearance || 'Appearance' }}</div>

                    <label class="settings-row">
                        <span class="settings-row-label">
                            <i class="fas fa-moon" style="margin-right:8px; color:var(--color-primary)"></i>
                            {{ store.t.darkMode || 'Dark mode' }}
                        </span>
                        <span class="toggle">
                            <input type="checkbox" v-model="store.darkMode">
                            <span class="toggle-track"><span class="toggle-thumb"></span></span>
                        </span>
                    </label>

                    <!-- Logout -->
                    <div style="margin-top:16px; padding-top:12px; border-top:1px solid var(--color-border); display:flex; flex-direction:column; align-items:center; gap:8px">
                        <a href="../../login/logout.php" class="settings-logout-btn">
                            <i class="fas fa-sign-out-alt" style="margin-right:8px"></i>
                            {{ store.t.logout || 'Logout' }}
                        </a>
                        <span style="font-size:0.72rem; color:var(--color-text-muted)">{{ store.t.appVersionLabel }} {{ store.t.appVersion }}</span>
                    </div>

                </div>
            </div>
        </div>
    `
};
