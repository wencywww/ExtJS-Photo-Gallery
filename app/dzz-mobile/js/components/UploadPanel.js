const { ref, onMounted, onUnmounted, inject, computed } = Vue;

export const UploadPanel = {
    name: 'UploadPanel',
    setup() {
        const store = inject('store');
        const api   = inject('api');

        const dropzoneEl = ref(null);
        let   dzInstance = null;

        const stats     = store.uploadStats;
        const isUploading   = ref(false);
        const canStartUpload = computed(() => stats.queued > 0 && !isUploading.value);
        const canProcess     = computed(() => stats.uploaded > 0);

        function close() {
            store.uploadOpen = false;
            resetStats();
        }

        function resetStats() {
            stats.total         = 0;
            stats.queued        = 0;
            stats.uploaded      = 0;
            stats.failed        = 0;
            stats.bytes         = 0;
            stats.uploadedBytes = 0;
            store.uploadDone    = false;
        }

        function formatBytes(bytes) {
            if (bytes < 1024)        return bytes + ' B';
            if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
            return (bytes / 1024 / 1024).toFixed(1) + ' MB';
        }

        function startUpload() {
            if (!dzInstance) return;
            isUploading.value = true;
            dzInstance.processQueue();
        }

        async function processFiles() {
            store.loading = true;
            try {
                await api.processUploads();
                // Reload tree (new dates may have appeared)
                if (store._loadRoot) await store._loadRoot();
                store.pendingUploads = 0;
                store.confirmDialog = {
                    open:    false,
                    title:   '',
                    message: '',
                    onConfirm: null
                };
                // Show "done" notification inline
                store.uploadDone = true;
            } catch(e) {
                console.error('Process uploads failed', e);
            }
            store.loading = false;
        }

        onMounted(() => {
            if (!dropzoneEl.value) return;

            dzInstance = new Dropzone(dropzoneEl.value, {
                url:               window.GALLERY_CONFIG.uploadUrl,
                autoProcessQueue:  false,
                maxFilesize:       null,   // no size limit
                timeout:           120000,
                acceptedFiles:     'image/*,video/*',
                addRemoveLinks:    true,
                parallelUploads:   1,
                dictDefaultMessage: '📷 Tap to select or drop files here',
                dictRemoveFile:     'Remove'
            });

            dzInstance.on('addedfile', (file) => {
                if (!dzInstance) return;
                stats.total++;
                stats.bytes += file.size || 0;
                stats.queued = dzInstance.getQueuedFiles().length;
            });

            dzInstance.on('removedfile', (file) => {
                if (!dzInstance) return;
                stats.total  = Math.max(0, stats.total - 1);
                stats.bytes  = Math.max(0, stats.bytes - (file.size || 0));
                stats.queued = dzInstance.getQueuedFiles().length;
            });

            dzInstance.on('processing', () => {
                if (!dzInstance) return;
                dzInstance.options.autoProcessQueue = true;
            });

            dzInstance.on('uploadprogress', (file, progress, bytesSent) => {
                if (!dzInstance) return;
                // Update uploaded bytes incrementally
                stats.uploadedBytes = Math.min(stats.uploadedBytes + bytesSent, stats.bytes);
            });

            dzInstance.on('success', (file) => {
                if (!dzInstance) return;
                stats.uploaded++;
            });

            dzInstance.on('error', (file, err) => {
                if (!dzInstance) return;
                // Ignore "Upload canceled" errors triggered by destroy()
                if (typeof err === 'string' && err.toLowerCase().includes('canceled')) return;
                stats.failed++;
                console.error('Upload error', err);
            });

            dzInstance.on('complete', () => {
                if (!dzInstance) return;
                stats.queued = dzInstance.getQueuedFiles().length;
                if (stats.queued > 0) {
                    dzInstance.processQueue();
                }
            });

            dzInstance.on('queuecomplete', () => {
                if (!dzInstance) return;
                dzInstance.options.autoProcessQueue = false;
                isUploading.value = false;
                stats.queued = 0;
            });
        });

        onUnmounted(() => {
            if (dzInstance) {
                dzInstance.destroy();
                dzInstance = null;
            }
        });

        return {
            store, stats, dropzoneEl, isUploading,
            canStartUpload, canProcess,
            close, startUpload, processFiles, formatBytes
        };
    },
    template: `
        <div class="upload-overlay">
            <!-- Upload header (fixed at top of overlay) -->
            <div class="upload-header">
                <button class="header-btn" @click="close" style="color:#fff; margin-right:4px">
                    <i class="fas fa-times"></i>
                </button>
                <span class="upload-header-title">
                    {{ store.t.uploader?.winTitle || 'FILE UPLOADER' }}
                </span>
            </div>

            <!-- Toolbar -->
            <div class="upload-toolbar">
                <button
                    class="btn-primary"
                    @click="startUpload"
                    :disabled="!canStartUpload"
                >
                    <i :class="isUploading ? 'fas fa-spinner fa-spin' : 'fas fa-upload'"></i>
                    {{ store.t.uploader?.tbBtnUpload || 'Start upload' }}
                </button>

                <button
                    class="btn-secondary"
                    @click="processFiles"
                    :disabled="!canProcess || store.loading"
                    :title="store.t.indexer?.processingPhotos || 'Process files'"
                >
                    <i :class="store.loading ? 'fas fa-spinner fa-spin' : 'fas fa-cogs'"></i>
                    Process Files
                </button>

                <div class="upload-stats">
                    <span>
                        <i class="fas fa-layer-group"></i>
                        {{ store.t.uploader?.tbLblEnqueued || 'Queued' }}: {{ stats.queued }}
                    </span>
                    <span>
                        <i class="fas fa-check-circle" style="color:#4caf50"></i>
                        {{ store.t.uploader?.tbLblUploaded || 'Uploaded' }}: {{ stats.uploaded }}
                    </span>
                    <span v-if="stats.failed > 0">
                        <i class="fas fa-times-circle" style="color:var(--color-accent)"></i>
                        {{ store.t.uploader?.tbLblFailed || 'Failed' }}: {{ stats.failed }}
                    </span>
                    <span v-if="stats.bytes > 0">
                        <i class="fas fa-hdd"></i>
                        {{ formatBytes(stats.bytes) }}
                    </span>
                </div>
            </div>

            <!-- Success notice -->
            <div
                v-if="store.uploadDone"
                style="background:#e8f5e9; padding:10px 14px; font-size:0.85rem; color:#2e7d32; display:flex; align-items:center; gap:8px"
            >
                <i class="fas fa-check-circle"></i>
                Files processed successfully! Tree has been refreshed.
            </div>

            <!-- DropZone area -->
            <div class="upload-body">
                <div ref="dropzoneEl" class="dropzone mobile-dropzone"></div>
            </div>
        </div>
    `
};
