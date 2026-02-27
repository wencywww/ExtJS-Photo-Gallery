import { store } from './state.js';

const API = window.GALLERY_CONFIG.apiUrl;

async function post(params) {
    const body = new URLSearchParams(params);
    const res  = await fetch(API, { method: 'POST', body });
    if (!res.ok) throw new Error('Server error ' + res.status);
    return res.json();
}

export const api = {
    ping() {
        return post({ targetAction: 'ping' });
    },

    getTreeLevel(nodePath) {
        return post({
            targetAction: 'getTreeLevel',
            nodePath,
            showPhotos: store.showPhotos,   // URLSearchParams → 'true'/'false' (PHP expects 'false')
            showVideos: store.showVideos
        });
    },

    generateDirStruct() {
        return post({
            targetAction: 'generateDirStruct',
            showPhotos: store.showPhotos,
            showVideos: store.showVideos
        });
    },

    getPhotos(path, dayPaths, page) {
        const params = {
            targetAction: 'getPhotos',
            photosSort:   store.photosSort,
            showPhotos:   store.showPhotos,
            showVideos:   store.showVideos,
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

    processUploads() {
        return post({ targetAction: 'processUploads' });
    },

    rotatePhotos(photos, angle) {
        return post({
            targetAction: 'rotatePhotos',
            photos:       JSON.stringify(photos.map(p => p.realUri)),
            rotateAngle:  angle
        });
    },

    deletePhotos(photos) {
        return post({
            targetAction: 'deletePhotos',
            photos:       JSON.stringify(photos.map(p => p.realUri))
        });
    },

    changePhotoDates(photos, targetDate) {
        // HTML date input returns YYYY-MM-DD; PHP expects YYYY/MM/DD for dir creation
        const serverDate = targetDate.split('-').join('/');
        return post({
            targetAction: 'changePhotoDates',
            photos:       JSON.stringify(photos.map(p => p.realUri)),
            targetDate:   serverDate
        });
    },

    setGpsData(photos, gpsParams) {
        return post({
            targetAction: 'setGpsData',
            photos:       JSON.stringify(photos.map(p => p.realUri)),
            ...gpsParams
        });
    },

    getAllPhotosForDay(path) {
        return post({
            targetAction: 'getPhotos',
            path,
            paths:        '',
            photosSort:   store.photosSort,
            showPhotos:   store.showPhotos,
            showVideos:   store.showVideos,
            paginateData: 0,
            start:        0,
            limit:        9999
        });
    },

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
