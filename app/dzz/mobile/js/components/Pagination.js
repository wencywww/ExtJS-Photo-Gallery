const { computed, inject } = Vue;

export const Pagination = {
    name: 'Pagination',
    setup() {
        const store = inject('store');

        /** Computes the total number of pages from totalPhotos and pageSize. */
        const totalPages = computed(() => {
            if (!store.pageSize || store.pageSize <= 0) return 1;
            return Math.max(1, Math.ceil(store.totalPhotos / store.pageSize));
        });

        const hasPrev = computed(() => store.page > 1);
        const hasNext = computed(() => store.page < totalPages.value);

        /** Navigates to the given page number, reloads photos, and scrolls the content to the top. */
        async function goTo(page) {
            if (page < 1 || page > totalPages.value) return;
            store.page = page;
            if (store._reloadPhotos) await store._reloadPhotos();
            // Scroll to top of content
            const main = document.querySelector('.main-content');
            if (main) main.scrollTop = 0;
        }

        /** Updates the page size from the select element and reloads from page 1. */
        function changePageSize(evt) {
            store.pageSize = parseInt(evt.target.value, 10) || 20;
            store.page = 1;
            if (store._reloadPhotos) store._reloadPhotos();
        }

        return { store, totalPages, hasPrev, hasNext, goTo, changePageSize };
    },
    template: `
        <div class="pagination-wrapper">
            <div class="page-size-row">
                <span>{{ store.t.gridPager?.pageSize || 'Photos per page' }}:</span>
                <select @change="changePageSize" :value="store.pageSize">
                    <option v-for="n in [10,20,50,100]" :key="n" :value="n">{{ n }}</option>
                </select>
                <span style="margin-left:auto; color:var(--color-text-muted)">
                    {{ store.t.gridPager?.total || 'Total' }}: {{ store.totalPhotos }}
                </span>
            </div>
            <div class="pagination-bar">
                <button class="page-btn" :disabled="!hasPrev" @click="goTo(1)">
                    <i class="fas fa-angle-double-left"></i>
                </button>
                <button class="page-btn" :disabled="!hasPrev" @click="goTo(store.page - 1)">
                    <i class="fas fa-angle-left"></i>
                </button>
                <span class="page-info">{{ store.page }} / {{ totalPages }}</span>
                <button class="page-btn" :disabled="!hasNext" @click="goTo(store.page + 1)">
                    <i class="fas fa-angle-right"></i>
                </button>
                <button class="page-btn" :disabled="!hasNext" @click="goTo(totalPages)">
                    <i class="fas fa-angle-double-right"></i>
                </button>
            </div>
        </div>
    `
};
