const { inject } = Vue;

export const SettingsSheet = {
    name: 'SettingsSheet',
    setup() {
        const store = inject('store');

        /** Closes the settings bottom sheet. */
        function close() { store.settingsOpen = false; }

        /** Sets the sort order and reloads the current photos immediately. */
        function setSort(val) {
            store.photosSort = val;
            if (store._reloadPhotos) store._reloadPhotos();
        }

        return { store, close, setSort };
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
