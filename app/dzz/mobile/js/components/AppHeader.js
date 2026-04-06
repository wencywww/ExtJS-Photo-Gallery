const { inject, computed } = Vue;

export const AppHeader = {
    name: 'AppHeader',
    setup() {
        const store = inject('store');

        /** Toggles photo sort order between DESC and ASC and reloads the current photos. */
        function toggleSort() {
            store.photosSort = (store.photosSort === 'DESC') ? 'ASC' : 'DESC';
            // Reload photos
            if (store._reloadPhotos) store._reloadPhotos();
        }

        /** Exits selection mode and clears the selected photos array. */
        function cancelSelection() {
            store.selectionMode   = false;
            store.selectedPhotos  = [];
        }

        /** Opens the photo action sheet if at least one photo is selected. */
        function openActionSheet() {
            if (store.selectedPhotos.length > 0) {
                store.actionSheetOpen = true;
            }
        }

        /** Returns the gallery title string (currently overridden to empty). */
        const galleryTitle = computed(() => {
            return ''; //override
            //return store.t.GALLERY_TITLE || window.GALLERY_CONFIG?.title || 'Gallery';
        });

        /** Returns the Font Awesome class for the current sort direction icon. */
        const sortIcon = computed(() => {
            return store.photosSort === 'DESC' ? 'fa-sort-amount-down' : 'fa-sort-amount-up';
        });

        /** Returns the localised label for the current sort direction button. */
        const sortLabel = computed(() => {
            return store.photosSort === 'DESC'
                ? (store.t.sortDESC || '▼ Date')
                : (store.t.sortASC  || '▲ Date');
        });

        return { store, toggleSort, cancelSelection, openActionSheet, galleryTitle, sortIcon, sortLabel };
    },
    template: `
        <!-- Selection mode header -->
        <header v-if="store.selectionMode" class="selection-bar" role="banner">
            <button class="header-btn" @click="cancelSelection" :title="store.t.btnCancel || 'Cancel'">
                <i class="fas fa-times"></i>
            </button>
            <span class="sel-count">{{ store.selectedPhotos.length }} {{ store.t.nSelected || 'selected' }}</span>
            <button class="header-btn" @click="openActionSheet" :title="'Actions'">
                <i class="fas fa-ellipsis-v"></i>
            </button>
        </header>

        <!-- Normal header -->
        <header v-else class="app-header" role="banner">
            <!-- Hamburger — hidden on tablet (drawer always visible) -->
            <button
                class="header-btn"
                @click="store.drawerOpen = !store.drawerOpen"
                :aria-expanded="store.drawerOpen"
                aria-label="Toggle navigation"
                style="display:flex"
            >
                <i :class="store.drawerOpen ? 'fas fa-times' : 'fas fa-bars'"></i>
            </button>

            <!-- Title -->
            <h1 class="header-title">{{ galleryTitle }}</h1>

            <!-- Sort toggle -->
            <button class="sort-btn" @click="toggleSort" :title="sortLabel">
                <i class="fas" :class="sortIcon"></i>
                <span>{{ store.photosSort }}</span>
            </button>

            <!-- Settings -->
            <button
                class="header-btn"
                @click="store.settingsOpen = true"
                :title="store.t.settings || 'Settings'"
                aria-label="Settings"
            >
                <i class="fas fa-cog"></i>
            </button>

            <!-- Pending uploads indicator -->
            <button
                v-if="store.pendingUploads > 0"
                class="header-btn"
                @click="store.uploadOpen = true"
                :title="'Pending: ' + store.pendingUploads"
            >
                <i class="fas fa-clock"></i>
                <span class="badge">{{ store.pendingUploads }}</span>
            </button>
        </header>
    `
};
