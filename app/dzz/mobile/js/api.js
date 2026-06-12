import { store } from './state.js';

const API = window.GALLERY_CONFIG.apiUrl;

/** Sends a POST request to the gallery API with the given params and returns parsed JSON. */
async function post(params) {
    const body = new URLSearchParams(params);
    const res  = await fetch(API, { method: 'POST', body });
    if (!res.ok) throw new Error('Server error ' + res.status);
    return res.json();
}

export const api = {
    /** Pings the server; returns pending upload count and disk status. */
    ping() {
        return post({ targetAction: 'ping' });
    },

    /** Fetches direct child nodes for the given tree path (lazy load). */
    getTreeLevel(nodePath) {
        return post({
            targetAction: 'getTreeLevel',
            nodePath,
            showPhotos: store.showPhotos,   // URLSearchParams → 'true'/'false' (PHP expects 'false')
            showVideos: store.showVideos,
            nameFilter: store.nameFilter,
            useIndex:   store.useIndex
        });
    },

    /** Fetches the complete directory tree in one request (non-lazy mode). */
    generateDirStruct() {
        return post({
            targetAction: 'generateDirStruct',
            showPhotos: store.showPhotos,
            showVideos: store.showVideos,
            nameFilter: store.nameFilter,
            useIndex:   store.useIndex
        });
    },

    /** Loads photos for a single path or an array of day paths, with pagination support. */
    getPhotos(path, dayPaths, page) {
        const params = {
            targetAction: 'getPhotos',
            photosSort:   store.photosSort,
            showPhotos:   store.showPhotos,
            showVideos:   store.showVideos,
            nameFilter:   store.nameFilter,
            useIndex:     store.useIndex,
            paginateData: store.paginateDataView ? 1 : 0,
            start:        store.paginateDataView ? ((page - 1) * store.pageSize) : 0,
            limit:        store.pageSize
        };
        if (dayPaths && dayPaths.length > 0) {
            params.paths = JSON.stringify(dayPaths);
            params.path  = '';
        } else {
            params.path  = path || '';
            params.paths = '';
        }
        return post(params);
    },

    /** Triggers server-side processing (EXIF extraction, thumbnail generation) of pending uploads. */
    processUploads() {
        return post({ targetAction: 'processUploads' });
    },

    /** Rotates the given photos by the specified angle (90, -90, or 180 degrees). */
    rotatePhotos(photos, angle) {
        return post({
            targetAction: 'rotatePhotos',
            photos:       JSON.stringify(photos.map(p => p.realUri)),
            rotateAngle:  angle
        });
    },

    /** Permanently deletes the given photos from the server. */
    deletePhotos(photos) {
        return post({
            targetAction: 'deletePhotos',
            photos:       JSON.stringify(photos.map(p => p.realUri))
        });
    },

    /** Moves the given photos to a new date directory; converts YYYY-MM-DD to YYYY/MM/DD for PHP. */
    changePhotoDates(photos, targetDate) {
        // HTML date input returns YYYY-MM-DD; PHP expects YYYY/MM/DD for dir creation
        const serverDate = targetDate.split('-').join('/');
        return post({
            targetAction: 'changePhotoDates',
            photos:       JSON.stringify(photos.map(p => p.realUri)),
            targetDate:   serverDate
        });
    },

    /** Writes GPS coordinates/altitude into the EXIF of the given photos. */
    setGpsData(photos, gpsParams) {
        return post({
            targetAction: 'setGpsData',
            photos:       JSON.stringify(photos.map(p => p.realUri)),
            ...gpsParams
        });
    },

    /** Fetches all photos for a single day path without pagination (used by NodeActionSheet).
     *  Intentionally omits nameFilter — whole-day actions must see every file of the day. */
    getAllPhotosForDay(path) {
        return post({
            targetAction: 'getPhotos',
            path,
            paths:        '',
            photosSort:   store.photosSort,
            showPhotos:   store.showPhotos,
            showVideos:   store.showVideos,
            useIndex:     store.useIndex,
            paginateData: 0,
            start:        0,
            limit:        9999
        });
    },

    /** Rebuilds the server-side SQLite index from the filesystem; returns {success, count, duration}. */
    rebuildIndex() {
        return post({ targetAction: 'rebuildIndex' });
    },

    /** CRUD operations for saved GPS locations; action is 'read'|'create'|'update'|'destroy'. */
    manageSavedLocations(action, payload) {
        const params = {
            targetAction: 'manageSavedLocations',
            actionType:   action   // PHP reads $_REQUEST['actionType'], not 'action'
        };
        if (payload) {
            params.data = JSON.stringify(payload);  // PHP does json_decode($_REQUEST['data'])
        }
        return post(params);
    }
};
