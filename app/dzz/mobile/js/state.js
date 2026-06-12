const { reactive, watch } = Vue;

const LS_PREFIX = 'ext-gallery-';

/** Reads a boolean setting from localStorage, returning def if the key is absent. */
function lsGetBool(key, def) {
    const v = localStorage.getItem(LS_PREFIX + key);
    return v === null ? def : v === 'true';
}

/** Reads a string setting from localStorage, returning def if the key is absent. */
function lsGetStr(key, def) {
    return localStorage.getItem(LS_PREFIX + key) ?? def;
}

export const store = reactive({
    // Settings — same localStorage keys as desktop for cross-compatibility
    showExifData:        lsGetBool('showExifData', true),
    indicateGpsLocation: lsGetBool('indicateGpsLocation', true),
    showPhotos:          lsGetBool('showPhotos', true),
    showVideos:          lsGetBool('showVideos', true),
    autoPlayVideos:      lsGetBool('autoPlayVideos', false),
    paginateDataView:    lsGetBool('paginateDataView', false),
    darkMode:            lsGetBool('darkMode', false),
    useIndex:            lsGetBool('useIndex', true),  // SQLite index reads (server falls back to Finder)
    lazyLoad:            true,  // always on in mobile; not user-configurable
    photosSort:          lsGetStr('photosSort', 'DESC'),

    // Filename filter (part of name, case-insensitive; server-side) — session-only, not persisted
    nameFilter:          '',
    searchOpen:          false,

    // Navigation
    tree:            [],     // array of year nodes (each may have .children)
    drawerOpen:      false,
    breadcrumb:      [],     // [{text, path}, ...] — shown when drawer is closed

    // Home screen drill-down
    drillStack:      [],     // [{path, cards}] — stack of drill levels; top = current
    drillLoading:    false,

    // Photo grid
    photos:          [],
    totalPhotos:     0,
    currentPath:     null,   // active single Day path
    currentDayPaths: null,   // active multi-day paths (lazy Year/Month click)
    page:            1,
    pageSize:        20,
    loading:         false,

    // Selection mode
    selectionMode:   false,
    selectedPhotos:  [],     // array of photo objects

    // UI state
    settingsOpen:     false,
    uploadOpen:       false,
    actionSheetOpen:  false,
    exifModalOpen:    false,
    exifData:         null,
    exifPhotoUri:     null,
    gpsEditorOpen:    false,
    gpsEditorPhotos:  [],
    gpsMapOpen:       false,
    gpsMapPhoto:      null,
    nodeSheetOpen:    false,
    nodeSheetPath:    null,
    dateChangeOpen:   false,
    dateChangePhotos: [],
    confirmDialog: {
        open:      false,
        title:     '',
        message:   '',
        onConfirm: null
    },

    // Upload
    uploadStats: {
        total:         0,
        queued:        0,
        uploaded:      0,
        failed:        0,
        bytes:         0,
        uploadedBytes: 0
    },
    uploadStarted:  false,
    uploadDone:     false,
    pendingUploads: 0,
    diskStatus:     null,

    // i18n
    t:      {},
    locale: 'en'
});

// Persist settings to localStorage on change (identical keys with desktop)
const boolKeys = [
    'showExifData', 'indicateGpsLocation', 'showPhotos', 'showVideos',
    'autoPlayVideos', 'paginateDataView', 'darkMode', 'useIndex'
];
boolKeys.forEach(key => {
    watch(() => store[key], val => localStorage.setItem(LS_PREFIX + key, String(val)));
});
watch(() => store.photosSort, val => localStorage.setItem(LS_PREFIX + 'photosSort', val));
