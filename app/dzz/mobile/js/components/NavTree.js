const { ref, watch, onMounted, inject } = Vue;

const _localeMap = { bg: 'bg-BG', en: 'en-US' };

// Recursively collect all expanded Day paths below a node
function collectDayPaths(node) {
    const paths = [];
    if (node.nodeType === 'Day') {
        paths.push(node.path);
        return paths;
    }
    if (node.expanded && node.children) {
        for (const child of node.children) {
            paths.push(...collectDayPaths(child));
        }
    }
    return paths;
}

export const NavTree = {
    name: 'NavTree',
    setup() {
        const store = inject('store');
        const api   = inject('api');

        function formatNodeLabel(path, nodeType, text) {
            if (!path) return text;
            const parts = path.split('/');
            if (parts.length === 1) return text;
            const bcp47 = _localeMap[store.locale] || undefined;
            if (parts.length === 2) {
                try {
                    const d = new Date(parts[0] + '-' + parts[1] + '-01');
                    const s = d.toLocaleDateString(bcp47, { month: 'long', year: 'numeric' });
                    return s.replace(/[а-яёa-z]/i, c => c.toUpperCase());
                } catch(e) { return text; }
            }
            if (parts.length === 3) {
                try {
                    const d = new Date(parts[0] + '-' + parts[1] + '-' + parts[2]);
                    const s = d.toLocaleDateString(bcp47, { day: '2-digit', month: 'short' });
                    return s.replace(/[а-яёa-z]/i, c => c.toUpperCase());
                } catch(e) { return text; }
            }
            return text;
        }

        const treeLoading = ref(false);

        // ===== Sort helpers =====
        function sortNodes(nodes) {
            const desc = store.photosSort === 'DESC';
            nodes.sort((a, b) => desc
                ? b.text.localeCompare(a.text)
                : a.text.localeCompare(b.text));
        }

        function resortTree(nodes) {
            if (!nodes || !nodes.length) return;
            sortNodes(nodes);
            for (const n of nodes) {
                if (n.children && n.children.length > 0) resortTree(n.children);
            }
        }

        async function loadRoot() {
            treeLoading.value = true;
            try {
                let data;
                if (store.lazyLoad) {
                    data = await api.getTreeLevel('');
                    // In lazy mode, top-level nodes have no children yet
                    store.tree = (data.RECORDS || []).map(n => ({ ...n, expanded: false, children: [] }));
                } else {
                    data = await api.generateDirStruct();
                    // Full tree — normalize recursively
                    store.tree = normalizeFullTree(data.RECORDS || []);
                }
                sortNodes(store.tree);
            } catch(e) {
                console.error('Tree load failed', e);
            }
            treeLoading.value = false;
        }

        function normalizeFullTree(nodes) {
            return nodes.map(n => {
                const node = { ...n, expanded: false };
                if (n.RECORDS) {
                    node.children = normalizeFullTree(n.RECORDS);
                    delete node.RECORDS;
                }
                return node;
            });
        }

        async function toggleNode(node) {
            if (node.nodeType === 'Day') {
                // Load photos for this single day
                await loadPhotosForNode(node);
                // Close drawer on phone
                if (window.innerWidth < 768) store.drawerOpen = false;
                return;
            }

            if (node.expanded) {
                // Already expanded: clicking again loads photos from all visible days
                const dayPaths = collectDayPaths(node);
                if (dayPaths.length > 0) {
                    await loadPhotosForDayPaths(node, dayPaths);
                    if (window.innerWidth < 768) store.drawerOpen = false;
                }
                return;
            }

            // Expand: load children if needed
            if (store.lazyLoad && (!node.children || node.children.length === 0)) {
                node._loading = true;
                try {
                    const data = await api.getTreeLevel(node.path);
                    node.children = (data.RECORDS || []).map(n => ({ ...n, expanded: false, children: [] }));
                    sortNodes(node.children);
                } catch(e) {
                    console.error('Node expand failed', e);
                }
                node._loading = false;
            }
            node.expanded = true;
        }

        function collapseNode(node) {
            node.expanded = false;
        }

        function onNodeContext(node) {
            store.nodeSheetPath = node.path;
            store.nodeSheetOpen = true;
        }

        async function loadPhotosForNode(node) {
            store.loading = true;
            store.photos = [];
            store.currentPath = node.path;
            store.currentDayPaths = null;
            store.page = 1;

            // Build breadcrumb
            buildBreadcrumb(node);

            try {
                const data = await api.getPhotos(node.path, null, 1);
                store.photos     = data.RECORDS || [];
                store.totalPhotos = data.total  || 0;
            } catch(e) {
                console.error('Photos load failed', e);
            }
            store.loading = false;
        }

        async function loadPhotosForDayPaths(node, dayPaths) {
            store.loading = true;
            store.photos = [];
            store.currentPath = null;
            store.currentDayPaths = dayPaths;
            store.page = 1;

            buildBreadcrumb(node);

            try {
                const data = await api.getPhotos(null, dayPaths, 1);
                store.photos      = data.RECORDS || [];
                store.totalPhotos = data.total   || 0;
            } catch(e) {
                console.error('Photos load failed', e);
            }
            store.loading = false;
        }

        function buildBreadcrumb(node) {
            const crumbs = [];
            const parts = node.path.split('/');
            let pathAccum = '';
            for (let i = 0; i < parts.length; i++) {
                pathAccum = i === 0 ? parts[i] : pathAccum + '/' + parts[i];
                crumbs.push({
                    text: parts[i],
                    path: pathAccum
                });
            }
            store.breadcrumb = crumbs;
        }

        // Reload photos when filters/sort change while a path is active
        async function reloadCurrentPhotos() {
            if (!store.currentPath && !store.currentDayPaths) return;
            store.loading = true;
            try {
                const data = await api.getPhotos(
                    store.currentPath,
                    store.currentDayPaths,
                    store.page
                );
                store.photos      = data.RECORDS || [];
                store.totalPhotos = data.total   || 0;
            } catch(e) {
                console.error('Photo reload failed', e);
            }
            store.loading = false;
        }

        // Expose reload function on store for use by other components
        store._reloadPhotos = reloadCurrentPhotos;
        store._loadRoot     = loadRoot;

        // Watch for filter/sort changes → re-sort tree + reload photos
        watch(() => [store.showPhotos, store.showVideos, store.photosSort], () => {
            resortTree(store.tree);
            reloadCurrentPhotos();
        });

        // Watch for lazyLoad toggle → reload entire tree
        watch(() => store.lazyLoad, () => {
            store.tree      = [];
            store.photos    = [];
            store.currentPath     = null;
            store.currentDayPaths = null;
            store.breadcrumb      = [];
            loadRoot();
        });

        onMounted(loadRoot);

        return { store, treeLoading, toggleNode, collapseNode, onNodeContext, formatNodeLabel };
    },
    template: `
        <nav class="nav-drawer" :class="{ open: store.drawerOpen }" role="navigation">
            <div class="drawer-section-header">
                <i class="fas fa-images" style="margin-right:6px"></i>{{ store.t.navTreeTitle || 'CHRONOLOGY' }}
            </div>
            <div v-if="treeLoading" class="tree-loading">
                <div class="spinner" style="margin:0 auto"></div>
            </div>
            <ul v-else style="list-style:none; padding:0; margin:0; flex:1">
                <tree-node-item
                    v-for="yearNode in store.tree"
                    :key="yearNode.path"
                    :node="yearNode"
                    :level="0"
                    @toggle="toggleNode"
                    @collapse="collapseNode"
                    @node-context="onNodeContext"
                    :format-label="formatNodeLabel"
                />
            </ul>
        </nav>
    `
};

// Recursive tree node component
export const TreeNodeItem = {
    name: 'TreeNodeItem',
    props: {
        node:        { type: Object, required: true },
        level:       { type: Number, default: 0 },
        formatLabel: { type: Function, required: true }
    },
    emits: ['toggle', 'collapse', 'node-context'],
    setup(props, { emit }) {
        const store = inject('store');

        function isActive(node) {
            if (node.nodeType === 'Day') {
                return store.currentPath === node.path;
            }
            return false;
        }

        function iconClass(node) {
            if (node.nodeType === 'Day') return 'fas fa-calendar-check';
            return node.expanded ? 'fas fa-folder-open' : 'fas fa-folder';
        }

        return { store, isActive, iconClass };
    },
    template: `
        <li>
            <div
                class="tree-node"
                :class="['tree-level-' + level, { active: isActive(node) }]"
                @click="$emit('toggle', node)"
            >
                <div class="tree-node-inner">
                    <!-- Expand/collapse arrow for non-leaf nodes -->
                    <i
                        v-if="!node.leaf"
                        class="fas fa-chevron-right tree-node-arrow"
                        :class="{ expanded: node.expanded }"
                        @click.stop="node.expanded ? $emit('collapse', node) : $emit('toggle', node)"
                    ></i>
                    <span v-else style="width:14px; flex-shrink:0"></span>

                    <!-- Node icon -->
                    <i :class="iconClass(node) + ' tree-node-icon'"></i>

                    <!-- Node label -->
                    <span class="tree-node-text">
                        {{ formatLabel(node.path, node.nodeType, node.text) }}
                    </span>

                    <!-- Loading indicator -->
                    <span v-if="node._loading" style="font-size:0.7rem; color:var(--color-text-muted)">
                        <i class="fas fa-spinner fa-spin"></i>
                    </span>

                    <!-- Item count badge on Day nodes -->
                    <span v-if="node.nodeType === 'Day' && node.items" class="tree-node-count">
                        {{ node.items }}
                    </span>

                    <!-- Context menu button for Day nodes -->
                    <button
                        v-if="node.nodeType === 'Day'"
                        class="tree-node-ctx-btn"
                        @click.stop="$emit('node-context', node)"
                        title="Actions for this day"
                    >
                        <i class="fas fa-ellipsis-v"></i>
                    </button>
                </div>
            </div>

            <!-- Children (expanded non-leaf) -->
            <ul
                v-if="!node.leaf && node.expanded && node.children && node.children.length"
                class="tree-children"
                style="list-style:none; padding:0; margin:0"
            >
                <tree-node-item
                    v-for="child in node.children"
                    :key="child.path"
                    :node="child"
                    :level="level + 1"
                    @toggle="$emit('toggle', $event)"
                    @collapse="$emit('collapse', $event)"
                    @node-context="$emit('node-context', $event)"
                    :format-label="formatLabel"
                />
            </ul>
        </li>
    `
};
