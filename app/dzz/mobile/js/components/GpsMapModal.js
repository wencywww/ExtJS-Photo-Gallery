const { ref, inject, onMounted, onUnmounted, nextTick } = Vue;

export const GpsMapModal = {
    name: 'GpsMapModal',
    setup() {
        const store  = inject('store');
        const mapEl  = ref(null);
        const lat    = ref(null);
        const lng    = ref(null);
        const alt    = ref(null);
        const error  = ref(null);
        const loading = ref(true);
        let   gmap   = null;
        let   marker = null;

        /** Closes the GPS map modal and clears the photo reference from the store. */
        function close() {
            store.gpsMapOpen  = false;
            store.gpsMapPhoto = null;
        }

        onMounted(async () => {
            const photo = store.gpsMapPhoto;
            if (!photo) { error.value = 'No photo selected'; loading.value = false; return; }

            // 1. Fetch image bytes and parse GPS with ExifReader
            try {
                const res = await fetch(photo.realUri);
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const buf  = await res.arrayBuffer();
                const tags = ExifReader.load(buf, { expanded: true });

                lat.value = tags.gps?.Latitude  ?? null;
                lng.value = tags.gps?.Longitude ?? null;
                alt.value = tags.gps?.Altitude  ?? null;

                if (lat.value === null || lng.value === null) {
                    error.value = store.t.gps?.noGpsData || 'No GPS coordinates found in EXIF';
                    loading.value = false;
                    return;
                }
            } catch(e) {
                error.value = 'Failed to read EXIF: ' + e.message;
                loading.value = false;
                return;
            }

            loading.value = false;
            // Wait for Vue to render the v-else map div before accessing mapEl
            await nextTick();

            // 2. Init read-only Google Map
            if (typeof google === 'undefined' || !mapEl.value) {
                error.value = store.t.gps?.noGpsData || 'Google Maps not available';
                return;
            }
            const pos = { lat: lat.value, lng: lng.value };
            gmap = new google.maps.Map(mapEl.value, {
                zoom:      15,
                center:    pos,
                mapTypeId: google.maps.MapTypeId.HYBRID,
                disableDefaultUI: false,
                gestureHandling:  'greedy'
            });
            marker = new google.maps.Marker({
                position: pos,
                map:      gmap,
                title:    photo.caption || ''
            });
        });

        onUnmounted(() => {
            marker = null;
            gmap   = null;
        });

        return { store, mapEl, lat, lng, alt, error, loading, close };
    },
    template: `
        <div class="modal-backdrop gps-editor-backdrop" @click.self="close">
            <div class="modal-card gps-modal" role="dialog" aria-label="GPS Location">
                <div class="modal-header">
                    <i class="fas fa-map-marker-alt" style="margin-right:8px"></i>
                    <span class="modal-header-title">{{ store.t.gps?.mapViewTitle || 'GPS LOCATION' }}</span>
                    <button class="header-btn" @click="close" style="color:#fff; width:32px; height:32px">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Map area -->
                <div class="gps-map-container">
                    <!-- Loading state -->
                    <div v-if="loading" style="display:flex;align-items:center;justify-content:center;height:100%;gap:8px;color:var(--color-text-muted);font-size:0.85rem">
                        <i class="fas fa-spinner fa-spin"></i>
                        Reading EXIF...
                    </div>
                    <!-- Error state -->
                    <div v-else-if="error" style="display:flex;align-items:center;justify-content:center;height:100%;padding:16px;text-align:center;color:var(--color-text-muted);font-size:0.85rem">
                        <i class="fas fa-exclamation-triangle" style="margin-right:6px;color:var(--color-accent)"></i>
                        {{ error }}
                    </div>
                    <!-- Map -->
                    <div v-else ref="mapEl" style="width:100%;height:100%"></div>
                </div>

                <!-- Coordinates info -->
                <div class="modal-body" style="padding:12px 16px">
                    <div v-if="lat !== null && lng !== null" style="font-size:0.82rem;color:var(--color-text-muted);display:flex;flex-direction:column;gap:4px">
                        <span>
                            <strong style="color:var(--color-text)">{{ store.t.gps?.latFieldLbl || 'Latitude' }}:</strong>
                            {{ lat?.toFixed(7) }}
                        </span>
                        <span>
                            <strong style="color:var(--color-text)">{{ store.t.gps?.lngFieldLbl || 'Longitude' }}:</strong>
                            {{ lng?.toFixed(7) }}
                        </span>
                        <span v-if="alt !== null">
                            <strong style="color:var(--color-text)">{{ store.t.gps?.altFieldLbl || 'Altitude' }}:</strong>
                            {{ typeof alt === 'number' ? alt.toFixed(1) + ' m' : alt }}
                        </span>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-txt" @click="close">
                        {{ store.t.btnClose || 'Close' }}
                    </button>
                </div>
            </div>
        </div>
    `
};
