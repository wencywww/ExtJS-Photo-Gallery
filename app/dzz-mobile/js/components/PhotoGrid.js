const { computed, inject } = Vue;


// Cache-bust URL helper (same as desktop)
function dcUrl(url) {
    return url + '?_dc=' + Date.now();
}

// Long-press state (shared across all thumb instances via module-level var)
let longPressTimer = null;

export const PhotoGrid = {
    name: 'PhotoGrid',
    setup() {
        const store = inject('store');
        const api   = inject('api');

        function isSelected(photo) {
            return store.selectedPhotos.some(p => p.realUri === photo.realUri);
        }

        function toggleSelect(photo) {
            const idx = store.selectedPhotos.findIndex(p => p.realUri === photo.realUri);
            if (idx >= 0) {
                store.selectedPhotos.splice(idx, 1);
            } else {
                store.selectedPhotos.push(photo);
            }
            if (store.selectedPhotos.length === 0) {
                store.selectionMode = false;
            }
        }

        function onTouchStart(photo, evt) {
            longPressTimer = setTimeout(() => {
                longPressTimer = null;
                // Enter selection mode
                store.selectionMode = true;
                if (!isSelected(photo)) {
                    store.selectedPhotos.push(photo);
                }
            }, 500);
        }

        function onTouchEnd() {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }

        function onTouchMove() {
            // Cancel long-press on scroll
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }

        function onPhotoTap(photo, index) {
            if (store.selectionMode) {
                toggleSelect(photo);
                return;
            }
            openLightbox(index);
        }

        function openLightbox(startIndex) {
            const dc = '?_dc=' + Date.now();
            const items = store.photos.map(p => {
                if (p.fileType === 'video') {
                    return {
                        src: p.realUri + dc,
                        type: 'video',
                        opts: {
                            caption: p.caption,
                            thumb:   p.thumbUri + dc
                        }
                    };
                }
                return {
                    src: p.realUri + dc,
                    opts: {
                        caption: p.caption,
                        thumb:   p.thumbUri + dc
                    }
                };
            });

            $.fancybox.open(items, {
                loop: true,
                animationEffect: 'zoom',
                buttons: ['zoom', 'slideShow', 'fullScreen', 'download', 'thumbs', 'close'],
                afterShow: function(instance, slide) {
                    if (store.showExifData && slide.type !== 'video') {
                        loadExifForSlide(slide.src.replace(dc, ''));
                    }
                }
            }, startIndex);
        }

        async function loadExifForSlide(url) {
            try {
                const resp = await fetch(url);
                const blob = await resp.blob();
                const buf  = await blob.arrayBuffer();
                const tags = ExifReader.load(buf, { expanded: true });
                store.exifData = buildExifMap(tags);
            } catch(e) {
                store.exifData = null;
            }
        }

        function buildExifMap(tags) {
            if (!tags) return [];
            const rows = [];
            // Flatten all tag groups
            for (const group of Object.values(tags)) {
                if (typeof group !== 'object') continue;
                for (const [key, tag] of Object.entries(group)) {
                    if (key === 'MakerNote') continue; // skip binary
                    const val = tag && tag.description !== undefined ? tag.description : (tag && tag.value !== undefined ? tag.value : null);
                    if (val !== null && val !== undefined && val !== '') {
                        rows.push({ key, val: String(val) });
                    }
                }
            }
            // Deduplicate by key
            const seen = new Set();
            return rows.filter(r => {
                if (seen.has(r.key)) return false;
                seen.add(r.key);
                return true;
            });
        }

        function onContextMenu(photo, evt) {
            // Prevent default context menu on desktop; long-press handles mobile
            evt.preventDefault();
            store.selectionMode = true;
            if (!isSelected(photo)) store.selectedPhotos.push(photo);
        }

        const noPhotosText = computed(() => store.t.gallery?.emptyText || 'No photos to show');

        // Breadcrumb navigation — clicking a crumb loads photos for that path
        async function clickBreadcrumb(crumb, idx) {
            if (idx === store.breadcrumb.length - 1) return; // current level — no-op
            store.loading        = true;
            store.photos         = [];
            store.currentPath    = crumb.path;
            store.currentDayPaths = null;
            store.page           = 1;
            store.breadcrumb     = store.breadcrumb.slice(0, idx + 1);
            try {
                const data = await api.getPhotos(crumb.path, null, 1);
                store.photos      = data.RECORDS || [];
                store.totalPhotos = data.total   || 0;
            } catch(e) {
                console.error('Breadcrumb nav failed', e);
            }
            store.loading = false;
        }

        return {
            store, isSelected, onTouchStart, onTouchEnd, onTouchMove,
            onPhotoTap, onContextMenu, noPhotosText, clickBreadcrumb
        };
    },
    template: `
        <div>
            <!-- Breadcrumb -->
            <div v-if="store.breadcrumb.length > 0" class="breadcrumb-bar">
                <span
                    v-for="(crumb, idx) in store.breadcrumb"
                    :key="crumb.path"
                    style="display:flex; align-items:center; gap:4px"
                >
                    <span
                        class="breadcrumb-item"
                        :class="{ current: idx === store.breadcrumb.length - 1 }"
                        @click="clickBreadcrumb(crumb, idx)"
                    >{{ crumb.text }}</span>
                    <span v-if="idx < store.breadcrumb.length - 1" class="breadcrumb-sep">
                        <i class="fas fa-chevron-right" style="font-size:0.6rem"></i>
                    </span>
                </span>
            </div>

            <!-- Loading -->
            <div v-if="store.loading" class="loading-overlay">
                <div class="spinner"></div>
            </div>

            <!-- Empty state -->
            <div v-else-if="!store.loading && store.photos.length === 0 && store.breadcrumb.length > 0" class="content-empty">
                <i class="fas fa-images"></i>
                <p>{{ noPhotosText }}</p>
            </div>

            <!-- No path selected -->
            <div v-else-if="!store.loading && store.photos.length === 0 && store.breadcrumb.length === 0" class="content-empty">
                <i class="fas fa-hand-point-left"></i>
                <p>Select a date from the tree</p>
            </div>

            <!-- Photo grid -->
            <div v-else class="photo-grid">
                <div
                    v-for="(photo, index) in store.photos"
                    :key="photo.realUri"
                    class="photo-thumb"
                    :class="{ selected: isSelected(photo) }"
                    @click="onPhotoTap(photo, index)"
                    @touchstart.passive="onTouchStart(photo, $event)"
                    @touchend.passive="onTouchEnd"
                    @touchmove.passive="onTouchMove"
                    @contextmenu="onContextMenu(photo, $event)"
                >
                    <!-- Video thumbnail -->
                    <template v-if="photo.fileType === 'video'">
                        <video
                            v-if="store.autoPlayVideos"
                            :src="photo.thumbUri"
                            autoplay
                            muted
                            loop
                            playsinline
                            loading="lazy"
                        ></video>
                        <img
                            v-else
                            :src="photo.thumbUri"
                            :alt="photo.caption"
                            loading="lazy"
                        />
                        <div class="video-play-icon" v-if="!store.autoPlayVideos">
                            <i class="fas fa-play"></i>
                        </div>
                    </template>

                    <!-- Photo thumbnail -->
                    <img
                        v-else
                        :src="photo.thumbUri"
                        :alt="photo.caption"
                        loading="lazy"
                    />

                    <!-- GPS indicator -->
                    <i
                        v-if="store.indicateGpsLocation && photo.gpsData == 1"
                        class="fas fa-map-marker-alt gps-indicator"
                    ></i>

                    <!-- Selection checkmark -->
                    <div class="select-check">
                        <i class="fas fa-check"></i>
                    </div>

                    <!-- Caption (hover only on desktop) -->
                    <div class="thumb-caption">{{ photo.caption }}</div>
                </div>
            </div>
        </div>
    `
};
