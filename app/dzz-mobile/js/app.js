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

// ===== History API helpers — module scope so swipe handler can call _push() =====
const _base = location.pathname + (location.search || '');
let _seq = 0;
function _push() {
    _seq++;
    history.pushState({ _ga: _seq }, '', _base + '#' + _seq);
}

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

        // Swipe left/right to change pages
        let swipeStartX = 0;
        let swipeStartY = 0;

        function onMainTouchStart(evt) {
            swipeStartX = evt.touches[0].clientX;
            swipeStartY = evt.touches[0].clientY;
        }

        async function onMainTouchEnd(evt) {
            const dx = evt.changedTouches[0].clientX - swipeStartX;
            const dy = evt.changedTouches[0].clientY - swipeStartY;

            // Swipe left/right for pagination
            if (!store.paginateDataView || store.photos.length === 0) return;
            if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
            const totalPages = Math.ceil(store.totalPhotos / store.pageSize);
            if (dx < 0 && store.page < totalPages) {
                store.page++;
                if (store._reloadPhotos) await store._reloadPhotos();
                document.querySelector('.main-content').scrollTop = 0;
                _push();  // register swipe-forward as a history entry
            } else if (dx > 0 && store.page > 1) {
                store.page--;
                if (store._reloadPhotos) await store._reloadPhotos();
                document.querySelector('.main-content').scrollTop = 0;
                _push();  // register swipe-back as a history entry
            }
        }

        return { store, onMainTouchStart, onMainTouchEnd };
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
                @touchend.passive="onMainTouchEnd"
            >
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

// ===== Android Back Button — History API trap =====
function handleBackNavigation() {
    // Close modals/panels in priority order (topmost first)
    if (store.confirmDialog.open)  { store.confirmDialog.open = false; return true; }
    if (store.gpsMapOpen)          { store.gpsMapOpen = false;         return true; }
    if (store.dateChangeOpen)      { store.dateChangeOpen = false;     return true; }
    if (store.gpsEditorOpen)       { store.gpsEditorOpen = false;      return true; }
    if (store.exifModalOpen)       { store.exifModalOpen = false;      return true; }
    if (store.actionSheetOpen)     { store.actionSheetOpen = false;    return true; }
    if (store.nodeSheetOpen)       { store.nodeSheetOpen = false;      return true; }
    if (store.uploadOpen)          { store.uploadOpen = false;         return true; }
    if (store.settingsOpen)        { store.settingsOpen = false;       return true; }
    if (store.selectionMode)       {
        store.selectionMode = false;
        store.selectedPhotos = [];
        return true;
    }
    if (store.drawerOpen)          { store.drawerOpen = false;         return true; }
    // Pagination: consume back always; only navigate if page > 1
    if (store.paginateDataView && store.photos.length > 0) {
        if (store.page > 1) {
            store.page--;
            if (store._reloadPhotos) store._reloadPhotos();
            document.querySelector('.main-content')?.scrollTo(0, 0);
        }
        return true;  // on page 1 — consume back but do nothing
    }
    return false;
}

// ===== Bootstrap =====
async function bootstrap() {
    // 1. Load i18n strings
    await loadLocale();

    // 2. Mount Vue app
    const app = createApp(App);
    // TreeNodeItem is recursive and used inside NavTree — must be globally registered
    app.component('TreeNodeItem', TreeNodeItem);
    app.mount('#app');

    // 3. Android back button trap
    // Root cause of same-URL approach failures: Android Chrome/WebView silently
    // collapses consecutive history entries with identical URLs.
    // Fix: every pushState uses a unique URL (incrementing hash fragment),
    // so the browser is forced to treat each entry as distinct.
    // _base / _seq / _push are defined at module scope so the swipe handler
    // (onMainTouchEnd) can also call _push() after each page change.
    history.replaceState({ _ga: 0 }, '', _base + '#0');  // mark initial entry
    _push();  // buffer #1

    window.addEventListener('popstate', () => {
        // Check current hash (after navigation), not e.state — Android may return
        // null state for the replaceState'd initial entry, causing the guard to skip.
        if (!/^#\d+$/.test(location.hash)) return; // not our entry (e.g. Fancybox hash)
        handleBackNavigation();
        _push();  // new unique entry — can't be collapsed with previous
    });

    // 5. Initial ping (disk status + pending uploads count)
    try {
        const pingResult = await api.ping();
        const details = pingResult.details || {};
        store.pendingUploads = details.count      || 0;
        store.diskStatus     = details.diskStatus || null;
    } catch(e) {
        console.warn('Initial ping failed', e);
    }

    // 6. Periodic ping every 10 seconds
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
