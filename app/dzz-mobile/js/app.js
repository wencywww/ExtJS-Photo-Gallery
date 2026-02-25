import { store }           from './state.js';
import { api }             from './api.js';
import { loadLocale }      from './i18n.js';

import { NavTree, TreeNodeItem } from './components/NavTree.js';
import { PhotoGrid }       from './components/PhotoGrid.js';
import { AppHeader }       from './components/AppHeader.js';
import { SettingsSheet }   from './components/SettingsSheet.js';
import { PhotoActionSheet }from './components/PhotoActionSheet.js';
import { UploadPanel }     from './components/UploadPanel.js';
import { ExifModal }       from './components/ExifModal.js';
import { GpsEditor }       from './components/GpsEditor.js';
import { DateChangeModal } from './components/DateChangeModal.js';
import { ConfirmDialog }   from './components/ConfirmDialog.js';
import { Pagination }      from './components/Pagination.js';
import { GpsMapModal }    from './components/GpsMapModal.js';
import { NodeActionSheet } from './components/NodeActionSheet.js';

const { createApp, provide } = Vue;

// Root app component
const App = {
    name: 'App',
    components: {
        AppHeader,
        NavTree,
        PhotoGrid,
        SettingsSheet,
        PhotoActionSheet,
        UploadPanel,
        ExifModal,
        GpsEditor,
        DateChangeModal,
        ConfirmDialog,
        Pagination,
        GpsMapModal,
        NodeActionSheet
    },
    setup() {
        // Provide store and api to all descendants
        provide('store', store);
        provide('api',   api);

        // Swipe left/right to change pages + Pull-to-Refresh
        let swipeStartX   = 0;
        let swipeStartY   = 0;
        let startScrollTop = 0;

        function onMainTouchStart(evt) {
            swipeStartX    = evt.touches[0].clientX;
            swipeStartY    = evt.touches[0].clientY;
            const main     = document.querySelector('.main-content');
            startScrollTop = main ? main.scrollTop : 0;
        }

        function onMainTouchMove(evt) {
            // Show pull-to-refresh indicator only when at the top of the list
            if (startScrollTop > 5) return;
            const dy = evt.touches[0].clientY - swipeStartY;
            const dx = evt.touches[0].clientX - swipeStartX;
            if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
                store.ptrPulling = Math.min(dy / 80, 1);
            } else {
                store.ptrPulling = 0;
            }
        }

        async function onMainTouchEnd(evt) {
            const dx = evt.changedTouches[0].clientX - swipeStartX;
            const dy = evt.changedTouches[0].clientY - swipeStartY;

            // Reset pull indicator
            store.ptrPulling = 0;

            // Pull-to-Refresh: pull down ≥80px from top, mostly vertical
            if (startScrollTop <= 5 && dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.5) {
                store.ptrLoading = true;
                try {
                    if (store._loadRoot) await store._loadRoot();
                    if (store.currentPath || store.currentDayPaths) {
                        if (store._reloadPhotos) await store._reloadPhotos();
                    }
                } finally {
                    store.ptrLoading = false;
                }
                return; // don't also trigger pagination
            }

            // Swipe left/right for pagination
            if (!store.paginateDataView || store.photos.length === 0) return;
            if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
            const totalPages = Math.ceil(store.totalPhotos / store.pageSize);
            if (dx < 0 && store.page < totalPages) {
                store.page++;
                if (store._reloadPhotos) await store._reloadPhotos();
                document.querySelector('.main-content').scrollTop = 0;
            } else if (dx > 0 && store.page > 1) {
                store.page--;
                if (store._reloadPhotos) await store._reloadPhotos();
                document.querySelector('.main-content').scrollTop = 0;
            }
        }

        return { store, onMainTouchStart, onMainTouchMove, onMainTouchEnd };
    },
    template: `
        <div class="gallery-app">

            <!-- Header (normal or selection mode) -->
            <AppHeader />

            <!-- Drawer overlay (phone only) -->
            <div
                class="drawer-overlay"
                :class="{ visible: store.drawerOpen }"
                @click="store.drawerOpen = false"
            ></div>

            <!-- Navigation tree (drawer on phone, sidebar on tablet) -->
            <NavTree />

            <!-- Main content area -->
            <main
                class="main-content"
                :class="{ 'has-pagination': store.paginateDataView && store.photos.length > 0 }"
                role="main"
                @touchstart.passive="onMainTouchStart"
                @touchmove.passive="onMainTouchMove"
                @touchend.passive="onMainTouchEnd"
            >
                <!-- Pull-to-Refresh indicator -->
                <div
                    class="ptr-indicator"
                    :class="{ loading: store.ptrLoading }"
                    :style="{ opacity: store.ptrLoading ? 1 : store.ptrPulling }"
                >
                    <i class="fas fa-sync" :class="{ 'fa-spin': store.ptrLoading }"></i>
                </div>
                <PhotoGrid />
            </main>

            <!-- Pagination bar (fixed at bottom, above status bar) -->
            <Pagination v-if="store.paginateDataView && store.photos.length > 0" />

            <!-- Status bar -->
            <footer class="status-bar" role="contentinfo">
                <span v-if="store.diskStatus" class="status-item">
                    <i class="fas fa-images"></i>
                    {{ store.diskStatus.filesCount }}
                </span>
                <span v-if="store.diskStatus" class="status-item">
                    <i class="fas fa-hdd"></i>
                    {{ store.diskStatus.totalSize }}
                </span>
                <span v-if="store.diskStatus" class="status-item" style="margin-left:auto">
                    <i class="fas fa-database"></i>
                    Free: {{ store.diskStatus.diskFreeSpace }}
                </span>
            </footer>

            <!-- FAB — Upload button (hidden when upload panel is open) -->
            <button
                v-if="!store.uploadOpen"
                class="fab"
                @click="store.uploadOpen = true"
                :aria-label="store.t.uploader?.winTitle || 'Upload'"
                :title="store.t.uploader?.winTitle || 'Upload'"
            >
                <i class="fas fa-camera-retro"></i>
                <span class="badge" v-if="store.pendingUploads > 0">
                    {{ store.pendingUploads }}
                </span>
            </button>

            <!-- Modals & overlays (v-if = proper onMounted/onUnmounted lifecycle) -->
            <SettingsSheet    v-if="store.settingsOpen" />
            <PhotoActionSheet v-if="store.actionSheetOpen" />
            <UploadPanel      v-if="store.uploadOpen" />
            <ExifModal        v-if="store.exifModalOpen" />
            <GpsEditor        v-if="store.gpsEditorOpen" />
            <DateChangeModal  v-if="store.dateChangeOpen" />
            <GpsMapModal      v-if="store.gpsMapOpen" />
            <NodeActionSheet  v-if="store.nodeSheetOpen" />
            <ConfirmDialog    v-if="store.confirmDialog.open" />

        </div>
    `
};

// ===== Bootstrap =====
async function bootstrap() {
    // 1. Load i18n strings
    await loadLocale();

    // 2. Mount Vue app
    const app = createApp(App);
    // TreeNodeItem is recursive and used inside NavTree — must be globally registered
    app.component('TreeNodeItem', TreeNodeItem);
    app.mount('#app');

    // 3. Initial ping (disk status + pending uploads count)
    try {
        const pingResult = await api.ping();
        const details = pingResult.details || {};
        store.pendingUploads = details.count      || 0;
        store.diskStatus     = details.diskStatus || null;
    } catch(e) {
        console.warn('Initial ping failed', e);
    }

    // 4. Periodic ping every 10 seconds
    setInterval(async () => {
        try {
            const pingResult = await api.ping();
            const details = pingResult.details || {};
            store.pendingUploads = details.count      || 0;
            store.diskStatus     = details.diskStatus || store.diskStatus;
        } catch(e) {
            // Silent fail on background pings
        }
    }, 10000);
}

bootstrap();
