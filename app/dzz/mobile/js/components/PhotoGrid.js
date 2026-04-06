const { computed, inject, watch } = Vue;


// Cache-bust URL helper (same as desktop)
/** Appends a cache-busting timestamp query parameter to a URL. */
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

        /** Returns true if the given photo is in the current selection. */
        function isSelected(photo) {
            return store.selectedPhotos.some(p => p.realUri === photo.realUri);
        }

        /** Adds or removes a photo from the selection; exits selection mode when the list empties. */
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

        /** Starts a 500 ms long-press timer that enters selection mode if not cancelled. */
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

        /** Cancels the long-press timer when the finger lifts before 500 ms. */
        function onTouchEnd() {
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }

        /** Cancels the long-press timer when the finger moves (scroll gesture). */
        function onTouchMove() {
            // Cancel long-press on scroll
            if (longPressTimer) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }

        /** Handles a tap on a thumbnail: toggles selection in selection mode, or opens the lightbox. */
        function onPhotoTap(photo, index) {
            if (store.selectionMode) {
                toggleSelect(photo);
                return;
            }
            openLightbox(index);
        }

        /** Opens Fancybox for all current photos starting at startIndex, loading EXIF after each slide. */
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
                hash: false,
                animationEffect: 'zoom',
                buttons: ['zoom', 'slideShow', 'fullScreen', 'download', 'thumbs', 'close'],
                afterShow: function(instance, slide) {
                    if (store.showExifData && slide.type !== 'video') {
                        loadExifForSlide(slide.src.replace(dc, ''));
                    }
                }
            }, startIndex);
        }

        /** Fetches and parses EXIF tags from an image URL into store.exifData. */
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

        /** Flattens ExifReader tag groups into a deduplicated array of {key, val} rows. */
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

        /** Desktop right-click handler: prevents the browser menu and enters selection mode. */
        function onContextMenu(photo, evt) {
            // Prevent default context menu on desktop; long-press handles mobile
            evt.preventDefault();
            store.selectionMode = true;
            if (!isSelected(photo)) store.selectedPhotos.push(photo);
        }

        const noPhotosText = computed(() => store.t.gallery?.emptyText || 'No photos to show');

        // ===== Home screen drill-down =====
        // drillStack: [{path, cards}, ...] — each entry is one drilled level
        /** Returns the path of the deepest drill level, or empty string on the root screen. */
        const drillPath = computed(() =>
            store.drillStack.length > 0 ? store.drillStack[store.drillStack.length - 1].path : ''
        );
        /** Returns the cards to display: root tree nodes or the top of the drill stack. */
        const currentCards = computed(() =>
            store.drillStack.length === 0
                ? store.tree
                : store.drillStack[store.drillStack.length - 1].cards
        );

        /** Builds a breadcrumb array from a slash-separated YYYY/MM/DD path string. */
        function buildBreadcrumbFromPath(path) {
            const parts = path.split('/');
            const crumbs = [];
            if (parts[0]) crumbs.push({ text: parts[0], path: parts[0] });
            if (parts[1]) crumbs.push({ text: parts[1], path: `${parts[0]}/${parts[1]}` });
            if (parts[2]) crumbs.push({ text: parts[2], path });
            return crumbs;
        }

        /** Returns the Font Awesome icon class appropriate for the card's depth (year/month/day). */
        function cardIcon(card) {
            if (card.leaf) return 'fas fa-calendar-check';
            const depth = card.path ? card.path.split('/').length : 0;
            return depth === 1 ? 'fas fa-calendar' : 'fas fa-calendar-alt';
        }

        /** Returns a human-readable label for a card; month cards show the localised month name. */
        function cardLabel(card) {
            const depth = card.path ? card.path.split('/').length : 0;
            if (depth === 2) {
                try {
                    const yearPart = card.path.split('/')[0];
                    const d = new Date(parseInt(yearPart), parseInt(card.text, 10) - 1, 1);
                    return d.toLocaleString(store.locale || 'en', { month: 'long' });
                } catch { return card.text; }
            }
            return card.text;
        }

        /** Sorts a card array in-place according to the current photosSort direction. */
        function sortCards(cards) {
            const desc = store.photosSort === 'DESC';
            cards.sort((a, b) => desc
                ? b.text.localeCompare(a.text)
                : a.text.localeCompare(b.text));
        }

/**
 * Handles a card tap: loads photos when the card is a Day leaf, or pushes the next
 * drill level (year → months, month → days) onto drillStack.
 */
        async function drillInto(card) {
            if (card.leaf) {
                // Day node → load photos (drillStack stays intact for back navigation)
                store.breadcrumb      = buildBreadcrumbFromPath(card.path);
                store.currentPath     = card.path;
                store.currentDayPaths = null;
                store.page            = 1;
                store.loading         = true;
                try {
                    const data = await api.getPhotos(card.path, null, 1);
                    store.photos      = data.RECORDS || [];
                    store.totalPhotos = data.total   || 0;
                } catch(e) {
                    console.error('Drill-down photo load failed', e);
                }
                store.loading = false;
                if (window.innerWidth < 768) store.drawerOpen = false;
            } else {
                // Year or Month → push new level with loaded children
                store.drillLoading = true;
                try {
                    const data = await api.getTreeLevel(card.path);
                    const cards = data.RECORDS || [];
                    sortCards(cards);
                    store.drillStack = [...store.drillStack, { path: card.path, cards }];
                } catch(e) {
                    console.error('Drill-down tree load failed', e);
                }
                store.drillLoading = false;
            }
        }

        // Re-sort all drillStack levels when sort order changes
        watch(() => store.photosSort, () => {
            store.drillStack.forEach(level => sortCards(level.cards));
        });

        /** Pops the top level from drillStack, returning to the previous card view. */
        function drillUp() {
            store.drillStack = store.drillStack.slice(0, -1);
        }

        // Breadcrumb navigation — clicking a crumb loads photos for that path
        /** Navigates to an ancestor breadcrumb level and loads its photos. */
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

        /** Clears the loaded photos and breadcrumb, returning to the home drill-down card view. */
        function backToCards() {
            store.photos          = [];
            store.breadcrumb      = [];
            store.totalPhotos     = 0;
            store.currentPath     = null;
            store.currentDayPaths = null;
            store.page            = 1;
        }

        return {
            store, isSelected, onTouchStart, onTouchEnd, onTouchMove,
            onPhotoTap, onContextMenu, noPhotosText, clickBreadcrumb,
            currentCards, drillPath, drillInto, drillUp, cardIcon, cardLabel,
            backToCards
        };
    },
    template: `
        <div>
            <!-- Breadcrumb -->
            <div v-if="store.breadcrumb.length > 0" class="breadcrumb-bar">
                <span style="display:flex; align-items:center; gap:4px; flex:1; overflow:hidden">
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
                </span>
                <button
                    v-if="store.drillStack.length > 0"
                    class="breadcrumb-back-cards"
                    @click="backToCards"
                    title="Back to cards"
                ><i class="fas fa-border-all"></i></button>
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

            <!-- Home screen: drill-down year/month/day cards -->
            <div v-else-if="!store.loading && store.photos.length === 0 && store.breadcrumb.length === 0" class="home-screen">

                <!-- Drill breadcrumb (shown when inside a year or month) -->
                <div v-if="store.drillStack.length > 0" class="home-drill-crumb">
                    <button class="home-crumb-btn" @click="drillUp">
                        <i class="fas fa-arrow-left"></i>
                    </button>
                    <span class="home-crumb-sep">/</span>
                    <button class="home-crumb-btn" @click="store.drillStack = store.drillStack.slice(0, 1)">
                        {{ store.drillStack[0].path }}
                    </button>
                    <template v-if="store.drillStack.length > 1">
                        <span class="home-crumb-sep">/</span>
                        <span class="home-crumb-current">{{ cardLabel({ text: drillPath.split('/')[1], path: drillPath }) }}</span>
                    </template>
                </div>

                <!-- Drill-level loading -->
                <div v-if="store.drillLoading" class="loading-overlay">
                    <div class="spinner"></div>
                </div>

                <!-- Cards grid -->
                <div v-else class="home-cards-grid">
                    <div
                        v-for="card in currentCards"
                        :key="card.path"
                        class="home-card"
                        @click="drillInto(card)"
                    >
                        <i :class="['home-card-icon', cardIcon(card)]"></i>
                        <div class="home-card-value">{{ cardLabel(card) }}</div>
                        <span v-if="card.items" class="home-card-count">
                            <i class="fas fa-image"></i> {{ card.items }}
                        </span>
                        <span v-if="!card.leaf && !card.items" class="home-card-sub">
                            <i class="fas fa-chevron-right" style="font-size:0.65rem"></i>
                        </span>
                    </div>
                </div>

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
