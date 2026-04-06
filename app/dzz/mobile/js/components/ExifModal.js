const { inject } = Vue;

export const ExifModal = {
    name: 'ExifModal',
    setup() {
        const store = inject('store');

        /** Closes the EXIF modal and clears cached EXIF data from the store. */
        function close() {
            store.exifModalOpen = false;
            store.exifData      = null;
            store.exifPhotoUri  = null;
        }

        return { store, close };
    },
    template: `
        <div class="modal-backdrop" @click.self="close">
            <div class="modal-card" role="dialog">
                <div class="modal-header">
                    <i class="fas fa-info-circle" style="margin-right:8px"></i>
                    <span class="modal-header-title">{{ store.t.exif?.exifTitle || 'EXIF data' }}</span>
                    <button class="header-btn" @click="close" style="color:#fff; width:32px; height:32px">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding:0">
                    <div v-if="store.exifData === null" class="exif-loading">
                        <div class="spinner" style="margin:0 auto 8px"></div>
                        Loading EXIF data...
                    </div>
                    <div v-else-if="store.exifData.length === 0" class="exif-loading">
                        No EXIF data found
                    </div>
                    <table v-else class="exif-table">
                        <tbody>
                            <tr v-for="row in store.exifData" :key="row.key">
                                <td class="exif-key">{{ row.key }}</td>
                                <td class="exif-val">{{ row.val }}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="modal-footer">
                    <button class="btn-txt" @click="close">Close</button>
                </div>
            </div>
        </div>
    `
};
