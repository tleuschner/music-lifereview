<template>
  <div class="upload-page">
    <h1 class="page-title">Upload Your Data</h1>

    <template v-if="uploadState === 'idle'">
      <FileDropZone @files="onFilesAdded" />

      <div v-if="files.length" class="file-list card">
        <div v-for="(file, i) in files" :key="i" class="file-item">
          <span class="file-name">{{ file.name }}</span>
          <span class="file-size">{{ formatSize(file.size) }}</span>
          <button class="file-remove" @click="removeFile(i)">&times;</button>
        </div>
      </div>

      <DataPreview :preview="preview" />

      <div v-if="files.length" class="upload-actions">
        <div class="privacy-row">
          <label class="opt-out-label">
            <input type="checkbox" v-model="optOut" class="opt-out-check" />
            Don't include my data in community stats
          </label>
          <button
            class="info-toggle"
            type="button"
            @click="showPrivacy = !showPrivacy"
            :aria-expanded="showPrivacy"
          >
            How is my data anonymized?
            <span class="info-caret">{{ showPrivacy ? "▲" : "▼" }}</span>
          </button>
        </div>

        <div v-if="showPrivacy" class="privacy-panel card">
          <p class="privacy-heading">What happens to your data</p>
          <ul class="privacy-list">
            <li>
              <span class="tag tag-keep">Kept</span>
              Track name, artist, album, timestamp, play duration, shuffle &amp;
              skip flags
            </li>
            <li>
              <span class="tag tag-hash">Hashed</span>
              Your Spotify username — converted to a one-way SHA-256 hash
              <em>in your browser</em>
              before upload. The raw value never leaves your device.
            </li>
            <li>
              <span class="tag tag-drop">Dropped</span>
              IP address, user-agent string, offline timestamp, incognito flag —
              stripped in your browser before upload.
            </li>
          </ul>
          <p class="privacy-note">
            The hash is only used to ensure your most recent upload is the one
            counted in community statistics. Checking
            <strong>"Don't include my data"</strong> skips that entirely — your
            personal dashboard still works normally.
          </p>
          <p class="privacy-note">
            All data is automatically deleted after <strong>30 days</strong>.
            You can also delete it at any time via your dashboard. See our
            <RouterLink to="/datenschutz" class="privacy-link"
              >Datenschutzerklärung</RouterLink
            >
            for full details.
          </p>
        </div>

        <button
          class="btn btn-primary"
          :disabled="parsing"
          @click="startUpload"
        >
          {{ parsing ? "Parsing..." : "Upload & Analyze" }}
        </button>
      </div>
    </template>

    <UploadProgress
      v-else-if="uploadState !== 'done'"
      :state="uploadState"
      :error="error"
      @retry="reset"
    />

    <template v-if="uploadState === 'done' && shareToken">
      <div class="upload-done">
        <p class="upload-done-text">Your analysis is ready!</p>
        <ShareLinkCard :url="shareUrl" />
        <RouterLink :to="`/results/${shareToken}`" class="btn btn-primary">
          View Dashboard
        </RouterLink>
      </div>
    </template>

    <p v-if="error && uploadState === 'idle'" class="upload-error">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useFileUpload } from "../composables/useFileUpload";
import { useLocalPreview } from "../composables/useLocalPreview";
import FileDropZone from "../components/upload/FileDropZone.vue";
import DataPreview from "../components/upload/DataPreview.vue";
import UploadProgress from "../components/upload/UploadProgress.vue";
import ShareLinkCard from "../components/shared/ShareLinkCard.vue";

const {
  files,
  uploadState,
  shareToken,
  error,
  optOut,
  addFiles,
  removeFile,
  reset,
  startUpload,
} = useFileUpload();
const { preview, parsing, parseFiles } = useLocalPreview();
const showPrivacy = ref(false);

const shareUrl = computed(() =>
  shareToken.value ? `${window.location.origin}/share/${shareToken.value}` : "",
);

async function onFilesAdded(newFiles: File[]) {
  await addFiles(newFiles);
}

// Parse for preview whenever files change
watch(
  files,
  (f) => {
    if (f.length) parseFiles(f);
  },
  { immediate: true },
);

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
</script>

<style scoped>
.upload-page {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.file-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.file-name {
  flex: 1;
  font-size: 0.875rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.file-size {
  color: var(--color-text-muted);
  font-size: 0.8rem;
}

.file-remove {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 1.25rem;
  padding: 0 0.25rem;
}

.file-remove:hover {
  color: var(--color-error);
}

.upload-actions {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: stretch;
}

.upload-actions .btn {
  align-self: center;
}

/* Privacy controls row */
.privacy-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.opt-out-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--color-text-muted);
  cursor: pointer;
  user-select: none;
}

.opt-out-check {
  accent-color: var(--color-primary);
  width: 15px;
  height: 15px;
  cursor: pointer;
}

.info-toggle {
  background: none;
  border: none;
  color: var(--color-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.info-toggle:hover {
  color: var(--color-text);
}

.info-caret {
  font-size: 0.6rem;
}

/* Privacy info panel */
.privacy-panel {
  font-size: 0.8rem;
  line-height: 1.6;
  color: var(--color-text-muted);
}

.privacy-heading {
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.6rem;
}

.privacy-list {
  list-style: none;
  padding: 0;
  margin: 0 0 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.privacy-list li {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.tag-keep {
  background: rgba(29, 185, 84, 0.15);
  color: #1db954;
}
.tag-hash {
  background: rgba(52, 152, 219, 0.15);
  color: #3498db;
}
.tag-drop {
  background: rgba(231, 76, 60, 0.12);
  color: #e74c3c;
}

.privacy-note {
  margin: 0;
  padding-top: 0.6rem;
  border-top: 1px solid #222;
}

.privacy-note + .privacy-note {
  border-top: none;
  padding-top: 0.4rem;
}

.privacy-link {
  color: var(--color-primary);
  text-decoration: none;
}

.privacy-link:hover {
  text-decoration: underline;
}

/* Done state */
.upload-done {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.upload-done-text {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-primary);
}

.upload-done .btn {
  text-decoration: none;
}

.upload-error {
  color: var(--color-error);
  font-size: 0.875rem;
  text-align: center;
}
</style>
