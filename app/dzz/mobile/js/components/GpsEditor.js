const { ref, reactive, onMounted, onUnmounted, nextTick, inject, computed } = Vue;

export const GpsEditor = {
    name: 'GpsEditor',
    setup() {
        const store = inject('store');
        const api   = inject('api');

        const mapEl           = ref(null);
        let   gMap            = null;
        let   gMarker         = null;
        const mapsAvailable   = ref(false);   // set in onMounted; window.google not in Vue template scope

        const saving      = ref(false);
        const fetchingAlt = ref(false);

        // GPS form fields
        const form = reactive({
            lat:              '',
            lng:              '',
            alt:              '',
            updateLat:        true,
            updateLng:        true,
            updateAlt:        true,
            useElevationApi:  false,
            preserveExisting: true,
        });

        // Saved locations
        const savedLocations   = ref([]);
        const selectedLocation = ref('');
        const editingLocName   = ref('');
        const showLocEditor    = ref(false);
        const editingExisting  = ref(false);
        const editingLocId     = ref(null);

        /** Closes the GPS editor and clears the photos list from the store. */
        function close() {
            store.gpsEditorOpen  = false;
            store.gpsEditorPhotos = [];
        }

        const isOSM = store.mapsProvider === 'OSM';

        /** Reads existing GPS coordinates from the single selected photo's EXIF and fills the form. */
        async function preloadPhotoGps() {
            const photos = store.gpsEditorPhotos;
            if (!photos || photos.length !== 1) return;
            const photo = photos[0];
            if (photo.gpsData != 1) return;
            try {
                const res = await fetch(photo.realUri);
                if (!res.ok) return;
                const buf  = await res.arrayBuffer();
                const tags = ExifReader.load(buf, { expanded: true });
                const lat  = tags.gps?.Latitude;
                const lng  = tags.gps?.Longitude;
                const alt  = tags.gps?.Altitude;
                if (typeof lat === 'number' && !isNaN(lat) && lat >= -90 && lat <= 90 &&
                    typeof lng === 'number' && !isNaN(lng) && lng >= -180 && lng <= 180) {
                    form.lat = String(lat);
                    form.lng = String(lng);
                    if (typeof alt === 'number' && !isNaN(alt)) {
                        form.alt = String(Math.round(alt));
                    }
                }
            } catch(e) {
                // ignore — fall back to the Sofia default
            }
        }

        // Initialize the map (Leaflet/OSM or Google Maps, depending on store.mapsProvider)
        onMounted(async () => {
            await loadSavedLocations();
            await preloadPhotoGps();

            const hasCoords  = form.lat !== '' && form.lng !== '';
            const defaultLat = hasCoords ? parseFloat(form.lat) : 0;
            const defaultLng = hasCoords ? parseFloat(form.lng) : 0;
            const defaultZoom = hasCoords ? 14 : 0;

            if (isOSM) {
                mapsAvailable.value = true; // OSM/Leaflet needs no API key

                gMap = L.map(mapEl.value, { zoomControl: true, attributionControl: true })
                    .setView([defaultLat, defaultLng], defaultZoom);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(gMap);

                gMarker = L.marker([defaultLat, defaultLng], {
                    draggable: true,
                    title:     'Drag to set location'
                }).addTo(gMap);

                // Drag end → update fields
                gMarker.on('dragend', function(evt) {
                    const pos = evt.target.getLatLng();
                    form.lat = pos.lat.toFixed(7);
                    form.lng = pos.lng.toFixed(7);
                    if (form.useElevationApi) fetchElevation();
                });

                // Map click → move marker + update fields
                gMap.on('click', function(evt) {
                    const pos = evt.latlng;
                    gMarker.setLatLng(pos);
                    form.lat = pos.lat.toFixed(7);
                    form.lng = pos.lng.toFixed(7);
                    if (form.useElevationApi) fetchElevation();
                });

                // Container may not have its final size yet on first paint
                await nextTick();
                gMap.invalidateSize();
                return;
            }

            mapsAvailable.value = !!(window.google && window.google.maps);
            if (!mapsAvailable.value) return;

            gMap = new google.maps.Map(mapEl.value, {
                center:    { lat: defaultLat, lng: defaultLng },
                zoom:      defaultZoom,
                mapTypeId: 'roadmap',
                streetViewControl:    false,
                fullscreenControl:    false,
                mapTypeControl:       false,
                gestureHandling:      'cooperative'
            });

            gMarker = new google.maps.Marker({
                position:  { lat: defaultLat, lng: defaultLng },
                map:       gMap,
                draggable: true,
                title:     'Drag to set location'
            });

            // Drag end → update fields
            gMarker.addListener('dragend', function(evt) {
                form.lat = evt.latLng.lat().toFixed(7);
                form.lng = evt.latLng.lng().toFixed(7);
                if (form.useElevationApi) fetchElevation();
            });

            // Map click → move marker + update fields
            gMap.addListener('click', function(evt) {
                const pos = evt.latLng;
                gMarker.setPosition(pos);
                form.lat = pos.lat().toFixed(7);
                form.lng = pos.lng().toFixed(7);
                if (form.useElevationApi) fetchElevation();
            });
        });

        onUnmounted(() => {
            if (isOSM && gMap) {
                gMap.remove();
            }
            gMap    = null;
            gMarker = null;
        });

        /** Moves the map marker and re-centres the map to match the current lat/lng form values. */
        function syncMapToForm() {
            if (!gMap || !gMarker) return;
            const lat = parseFloat(form.lat);
            const lng = parseFloat(form.lng);
            if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
                if (isOSM) {
                    gMarker.setLatLng([lat, lng]);
                    gMap.setView([lat, lng]);
                } else {
                    const pos = { lat, lng };
                    gMarker.setPosition(pos);
                    gMap.setCenter(pos);
                }
            }
        }

        /** Queries open-elevation.com for the current coordinates and fills the altitude field. */
        async function fetchElevation() {
            if (!form.lat || !form.lng) return;
            fetchingAlt.value = true;
            try {
                const url = `https://api.open-elevation.com/api/v1/lookup?locations=${form.lat},${form.lng}`;
                const res = await fetch(url);
                const data = await res.json();
                if (data.results && data.results.length > 0) {
                    form.alt = String(Math.round(data.results[0].elevation));
                }
            } catch(e) {
                console.warn('Elevation API failed', e);
            }
            fetchingAlt.value = false;
        }

        /** Writes GPS data to the selected photos via the API, then closes the editor. */
        async function save() {
            saving.value = true;
            const params = {};
            if (form.updateLat) { params.gps_lat_update = 1; params.gps_latitude  = form.lat; }
            if (form.updateLng) { params.gps_lng_update = 1; params.gps_longitude = form.lng; }
            if (form.updateAlt) { params.gps_alt_update = 1; params.gps_altitude  = form.alt; }
            params.gps_elevation_api    = form.useElevationApi  ? 1 : 0;
            params.gps_preserve_existing = form.preserveExisting ? 1 : 0;
            try {
                await api.setGpsData(store.gpsEditorPhotos, params);
                store.selectionMode  = false;
                store.selectedPhotos = [];
                close();
            } catch(e) {
                console.error('GPS save failed', e);
            }
            saving.value = false;
        }

        // ===== Saved Locations =====
        /** Fetches the saved-locations list from the server and stores it in savedLocations. */
        async function loadSavedLocations() {
            try {
                const data = await api.manageSavedLocations('read');
                savedLocations.value = data.RECORDS || [];
            } catch(e) {
                savedLocations.value = [];
            }
        }

        /** Applies the selected saved location's coordinates to the form and map. */
        function applyLocation(evt) {
            const locId = evt.target.value;
            const loc   = savedLocations.value.find(l => String(l.id) === String(locId));
            if (!loc) return;
            form.lat = String(loc.lat || '');
            form.lng = String(loc.lng || '');
            form.alt = String(loc.alt || '');
            syncMapToForm();
        }

        /** Shows the inline location-name editor ready to create a new saved location. */
        function startNewLocation() {
            editingLocName.value  = '';
            editingExisting.value = false;
            editingLocId.value    = null;
            showLocEditor.value   = true;
        }

        /** Populates the inline name editor with the currently selected location for editing. */
        function startEditLocation() {
            const locId = selectedLocation.value;
            const loc   = savedLocations.value.find(l => String(l.id) === String(locId));
            if (!loc) return;
            editingLocName.value  = loc.name;
            editingExisting.value = true;
            editingLocId.value    = locId;
            showLocEditor.value   = true;
        }

        /** Creates or updates the saved location using the current form coordinates and name. */
        async function saveLocation() {
            const name = editingLocName.value.trim();
            if (!name) return;
            // PHP expects data as JSON: {name, lat, lng, alt, zoom} for create
            //                           {id, name, lat, lng, alt, zoom} for update
            const payload = {
                name: name,
                lat:  parseFloat(form.lat) || 0,
                lng:  parseFloat(form.lng) || 0,
                alt:  parseFloat(form.alt) || 0,
                zoom: 0
            };
            if (editingExisting.value) {
                payload.id = editingLocId.value;
                await api.manageSavedLocations('update', payload);
            } else {
                await api.manageSavedLocations('create', payload);
            }
            showLocEditor.value = false;
            await loadSavedLocations();
        }

        /** Prompts for confirmation and deletes the currently selected saved location. */
        function deleteLocation() {
            const locId = selectedLocation.value;
            if (!locId) return;
            const loc = savedLocations.value.find(l => String(l.id) === String(locId));
            if (!loc) return;
            store.confirmDialog = {
                open:    true,
                title:   store.t.gps?.locationsDeleteConfirm || 'Delete location',
                message: `Delete "${loc.name}"?`,
                onConfirm: async () => {
                    await api.manageSavedLocations('destroy', { id: locId });
                    selectedLocation.value = '';
                    await loadSavedLocations();
                }
            };
        }

        return {
            store, mapEl, mapsAvailable, form, saving, fetchingAlt,
            savedLocations, selectedLocation, editingLocName, showLocEditor, editingExisting,
            syncMapToForm, fetchElevation, save, close,
            applyLocation, startNewLocation, startEditLocation, saveLocation, deleteLocation
        };
    },
    template: `
        <div class="modal-backdrop gps-editor-backdrop" @click.self="close">
            <div class="modal-card gps-modal" role="dialog">
                <div class="modal-header">
                    <i class="fas fa-map-marker-alt" style="margin-right:8px"></i>
                    <span class="modal-header-title">{{ store.t.gps?.winTitle || 'GPS LOCATION EDITOR' }}</span>
                    <button class="header-btn" @click="close" style="color:#fff; width:32px; height:32px">
                        <i class="fas fa-times"></i>
                    </button>
                </div>

                <!-- Map -->
                <div class="gps-map-container">
                    <div ref="mapEl"></div>
                    <div v-if="!mapsAvailable"
                         style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--color-text-muted);font-size:0.85rem">
                        Map not available
                    </div>
                </div>

                <div class="modal-body">
                    <!-- Lat field -->
                    <div class="gps-field-row">
                        <input type="checkbox" v-model="form.updateLat" />
                        <span class="gps-field-label">{{ store.t.gps?.latFieldLbl || 'Latitude' }}</span>
                        <input
                            type="number"
                            class="form-input"
                            v-model="form.lat"
                            step="0.0000001"
                            min="-90"
                            max="90"
                            placeholder="-90 … 90"
                            @change="syncMapToForm"
                        />
                    </div>

                    <!-- Lng field -->
                    <div class="gps-field-row">
                        <input type="checkbox" v-model="form.updateLng" />
                        <span class="gps-field-label">{{ store.t.gps?.lngFieldLbl || 'Longitude' }}</span>
                        <input
                            type="number"
                            class="form-input"
                            v-model="form.lng"
                            step="0.0000001"
                            min="-180"
                            max="180"
                            placeholder="-180 … 180"
                            @change="syncMapToForm"
                        />
                    </div>

                    <!-- Alt field -->
                    <div class="gps-field-row">
                        <input type="checkbox" v-model="form.updateAlt" />
                        <span class="gps-field-label">{{ store.t.gps?.altFieldLbl || 'Altitude' }}</span>
                        <input
                            type="number"
                            class="form-input"
                            v-model="form.alt"
                            step="1"
                            placeholder="meters"
                        />
                        <button
                            class="btn-icon"
                            @click="fetchElevation"
                            :disabled="fetchingAlt || !form.lat || !form.lng"
                            :title="store.t.gps?.elevationAPI || 'Use elevation API'"
                        >
                            <i :class="fetchingAlt ? 'fas fa-spinner fa-spin' : 'fas fa-mountain'"></i>
                        </button>
                    </div>

                    <!-- Options -->
                    <label class="form-checkbox-row">
                        <input type="checkbox" v-model="form.useElevationApi" />
                        <span class="form-checkbox-label">
                            {{ store.t.gps?.elevationAPI || 'Use elevation API' }}
                        </span>
                    </label>
                    <label class="form-checkbox-row">
                        <input type="checkbox" v-model="form.preserveExisting" />
                        <span class="form-checkbox-label">
                            {{ store.t.gps?.preserveExisting || 'Preserve existing GPS data' }}
                        </span>
                    </label>

                    <!-- Saved Locations -->
                    <div class="saved-locations-row">
                        <select
                            class="saved-locations-select"
                            v-model="selectedLocation"
                            @change="applyLocation"
                        >
                            <option value="">{{ store.t.gps?.locationsComboLbl || 'Locations...' }}</option>
                            <option
                                v-for="loc in savedLocations"
                                :key="loc.id"
                                :value="loc.id"
                            >{{ loc.name }}</option>
                        </select>
                        <button class="btn-icon" @click="startNewLocation" :title="store.t.gps?.locationsBtnNew || 'New'">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon" @click="startEditLocation" :disabled="!selectedLocation" :title="store.t.gps?.locationsBtnEdit || 'Edit'">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                        <button class="btn-icon danger" @click="deleteLocation" :disabled="!selectedLocation" :title="store.t.gps?.locationsBtnDelete || 'Delete'">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>

                    <!-- Location name editor (inline) -->
                    <div v-if="showLocEditor" style="margin-top:8px; display:flex; gap:6px; align-items:center">
                        <input
                            type="text"
                            class="form-input"
                            v-model="editingLocName"
                            :placeholder="store.t.gps?.locationsEditorLbl || 'Location Name'"
                            style="flex:1"
                        />
                        <button class="btn-icon" @click="saveLocation" :title="'Save'">
                            <i class="fas fa-check"></i>
                        </button>
                        <button class="btn-icon" @click="showLocEditor = false" :title="'Cancel'">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <div class="modal-footer">
                    <button class="btn-txt" @click="close" :disabled="saving">
                        {{ store.t.btnCancel || 'Cancel' }}
                    </button>
                    <button class="btn-primary" @click="save" :disabled="saving">
                        <i :class="saving ? 'fas fa-spinner fa-spin' : 'fas fa-save'"></i>
                        {{ store.t.gps?.btnWrite || 'Write GPS' }}
                    </button>
                </div>
            </div>
        </div>
    `
};
