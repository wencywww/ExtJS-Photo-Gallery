import { store } from './state.js';

/**
 * Fetches locale strings from the server and populates store.t with a flat+structured
 * translation map. Falls back to minimal English strings if the request fails.
 */
export async function loadLocale() {
    try {
        const res  = await fetch(window.GALLERY_CONFIG.localeUrl);
        const data = await res.json();
        if (!data.success) return;

        store.locale = data.Locale;
        const c = data.Captions;
        const cc = data.CommonCaptions;

        // Build a flat + structured translation map
        // CommonCaptions: ERROR, noServerResponse, unknownError, loadingTxt, etc.
        // c['1']: navTreeTitle, rootNodeText, settings, showExif, indicateGpsLocation,
        //         showPhotos, showVideos, autoPlayVideos, paginateDataView, sortASC, sortDESC, lazyLoad
        // c['2']: btnStartUploader
        // c['4']: nested objects per component
        store.t = {
            ...cc,
            ...(c['1'] || {}),
            ...(c['2'] || {}),
            gallery:    (c['4'] || {}).homeGalleryDataView || {},
            exif:       (c['4'] || {}).exifVisualiser       || {},
            indexer:    (c['4'] || {}).indexerButton        || {},
            dateChange: (c['4'] || {}).photoDateChange      || {},
            gps:        (c['4'] || {}).gpsEditor            || {},
            uploader:   (c['4'] || {}).photoUploader        || {},
            gridPager:  (c['5'] || {}).gridPager            || {}
        };
    } catch (e) {
        console.error('Failed to load locale', e);
        // Set bare minimum fallback strings so the app is usable even if locale fails
        store.t = {
            loadingTxt: 'Loading...',
            settings: 'Settings',
            showPhotos: 'Show Photos',
            showVideos: 'Show Videos',
            sortASC: 'Ascending',
            sortDESC: 'Descending',
            gallery: { emptyText: 'No photos', menuDelete: 'Delete', menuRotate: 'Rotate' },
            uploader: { tbBtnUpload: 'Start upload', winTitle: 'Upload' },
            gps: { winTitle: 'GPS Editor' },
            dateChange: { winTitle: 'Change Date', btnWrite: 'Save', btnCancel: 'Cancel' },
            indexer: { processingPhotos: 'Processing...', noPhotos: 'No photos' }
        };
    }
}
