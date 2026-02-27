const { inject, computed } = Vue;

export const AppHeader = {
    name: 'AppHeader',
    setup() {
        const store = inject('store');

        function toggleSort() {
            store.photosSort = (store.photosSort === 'DESC') ? 'ASC' : 'DESC';
            // Reload photos
            if (store._reloadPhotos) store._reloadPhotos();
        }

        function cancelSelection() {
            store.selectionMode   = false;
            store.selectedPhotos  = [];
        }

        function openActionSheet() {
            if (store.selectedPhotos.length > 0) {
                store.actionSheetOpen = true;
            }
        }

        const galleryTitle = computed(() => {
            return store.t.GALLERY_TITLE || window.GALLERY_CONFIG?.title || 'Gallery';
        });

        const sortIcon = computed(() => {
            return store.photosSort === 'DESC' ? 'fa-sort-amount-down' : 'fa-sort-amount-up';
        });

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
            <button class="header-btn" @click="cancelSelection" :title="'Cancel'">
                <i class="fas fa-times"></i>
            </button>
            <span class="sel-count">{{ store.selectedPhotos.length }} selected</span>
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
