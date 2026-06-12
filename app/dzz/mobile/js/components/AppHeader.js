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

        // ===== Filename filter =====
        let filterDebounce = null;

        /** Toggles the search bar; hiding it clears an active filter, opening focuses the input. */
        function toggleSearch() {
            store.searchOpen = !store.searchOpen;
            if (!store.searchOpen && store.nameFilter) {
                store.nameFilter = '';
            } else if (store.searchOpen) {
                setTimeout(() => document.querySelector('.search-bar input')?.focus(), 50);
            }
        }

        /** Debounced (400 ms) input handler — pushes the value into store.nameFilter. */
        function onSearchInput(evt) {
            clearTimeout(filterDebounce);
            const value = evt.target.value;
            filterDebounce = setTimeout(() => { store.nameFilter = value.trim(); }, 400);
        }

        /** Clears the filter but keeps the search bar open. */
        function clearSearch(evt) {
            clearTimeout(filterDebounce);
            evt.target.closest('.search-bar').querySelector('input').value = '';
            store.nameFilter = '';
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

        return { store, toggleSort, cancelSelection, openActionSheet, galleryTitle, sortIcon, sortLabel,
                 toggleSearch, onSearchInput, clearSearch };
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

            <!-- Filename filter toggle -->
            <button
                class="header-btn"
                :class="{ 'search-active': store.searchOpen || store.nameFilter }"
                @click="toggleSearch"
                :title="store.t.filterFilenameTip || 'Filter by filename'"
                aria-label="Filter by filename"
            >
                <i class="fas fa-search"></i>
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

        <!-- Filename filter bar (slides below the header) -->
        <div v-if="store.searchOpen && !store.selectionMode" class="search-bar">
            <i class="fas fa-search search-bar-icon"></i>
            <input
                type="search"
                :value="store.nameFilter"
                :placeholder="store.t.filterFilenameEmptyText || 'Filter by filename...'"
                @input="onSearchInput"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
            />
            <button v-if="store.nameFilter" class="search-bar-clear" @click="clearSearch" aria-label="Clear filter">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `
};
