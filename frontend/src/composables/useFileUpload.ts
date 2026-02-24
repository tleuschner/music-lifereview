import { ref } from 'vue';
import JSZip from 'jszip';
import { aggregateInWorker, postAggregated, getStatus } from '../services/api';
import type { StatusResponse } from '@music-livereview/shared';

const MAX_FILE_BYTES = 200 * 1024 * 1024;  // 200 MB per JSON file
const MAX_TOTAL_BYTES = 800 * 1024 * 1024; // 800 MB across all files

export type UploadState = 'idle' | 'validating' | 'reading' | 'aggregating' | 'uploading' | 'processing' | 'done' | 'error';

export function useFileUpload() {
  const files = ref<File[]>([]);
  const uploadState = ref<UploadState>('idle');
  const shareToken = ref<string | null>(null);
  const error = ref<string | null>(null);
  const statusData = ref<StatusResponse | null>(null);
  const optOut = ref(false);
  const readingProgress = ref<{ fileIndex: number; total: number } | null>(null);

  async function addFiles(newFiles: File[]) {
    error.value = null;
    const extracted: File[] = [];

    // Track total bytes including already-loaded files
    let totalBytes = files.value.reduce((sum, f) => sum + f.size, 0);

    for (const file of newFiles) {
      if (file.name.endsWith('.zip')) {
        try {
          const zip = await JSZip.loadAsync(file);
          const audioFiles = Object.values(zip.files).filter(
            entry => !entry.dir && /Streaming_History_Audio_.*\.json$/.test(entry.name.split('/').pop() ?? ''),
          );
          if (audioFiles.length === 0) {
            error.value = 'No Streaming_History_Audio_*.json files found in the zip.';
            return;
          }
          for (const entry of audioFiles) {
            const blob = await entry.async('blob');
            const filename = entry.name.split('/').pop()!;
            if (blob.size > MAX_FILE_BYTES) {
              error.value = `${filename} is too large (${(blob.size / 1024 / 1024).toFixed(0)} MB). Max 200 MB per file.`;
              return;
            }
            totalBytes += blob.size;
            if (totalBytes > MAX_TOTAL_BYTES) {
              error.value = 'Total data exceeds 800 MB. Upload a smaller export or fewer files.';
              return;
            }
            extracted.push(new File([blob], filename, { type: 'application/json' }));
          }
        } catch {
          error.value = 'Failed to read zip file.';
          return;
        }
      } else if (file.name.endsWith('.json')) {
        if (file.size > MAX_FILE_BYTES) {
          error.value = `${file.name} is too large (${(file.size / 1024 / 1024).toFixed(0)} MB). Max 200 MB per file.`;
          return;
        }
        totalBytes += file.size;
        if (totalBytes > MAX_TOTAL_BYTES) {
          error.value = 'Total data exceeds 800 MB. Upload a smaller export or fewer files.';
          return;
        }
        extracted.push(file);
      }
    }

    if (extracted.length === 0) {
      error.value = 'Please upload your Spotify export zip or JSON files.';
      return;
    }

    // Skip files that are already loaded (e.g. user dropped the same zip twice)
    const existingNames = new Set(files.value.map(f => f.name));
    const unique = extracted.filter(f => !existingNames.has(f.name));
    if (unique.length === 0) return; // all duplicates — silently ignore

    files.value = [...files.value, ...unique];
  }

  function removeFile(index: number) {
    files.value = files.value.filter((_, i) => i !== index);
  }

  function reset() {
    files.value = [];
    uploadState.value = 'idle';
    shareToken.value = null;
    error.value = null;
    statusData.value = null;
    readingProgress.value = null;
  }

  async function startUpload() {
    if (files.value.length === 0) return;

    try {
      error.value = null;
      readingProgress.value = null;

      // Step 1: read + aggregate in worker
      uploadState.value = 'reading';
      const { result, userHash } = await aggregateInWorker(files.value, (event) => {
        if (event.stage === 'reading') {
          readingProgress.value = { fileIndex: event.fileIndex, total: event.total };
        } else {
          uploadState.value = 'aggregating';
          readingProgress.value = null;
        }
      });

      // Step 2: POST the small aggregated payload
      uploadState.value = 'uploading';
      const response = await postAggregated(result, userHash, optOut.value);
      shareToken.value = response.shareToken;

      // Step 3: poll until server finishes DB writes
      uploadState.value = 'processing';
      await pollStatus(response.shareToken);
    } catch (err: unknown) {
      uploadState.value = 'error';
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      error.value = e.response?.data?.error ?? e.message ?? 'Upload failed';
    }
  }

  async function pollStatus(token: string) {
    const maxAttempts = 120; // 10 minutes at 5s intervals
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(r => setTimeout(r, 5000));

      try {
        const status = await getStatus(token);
        statusData.value = status;

        if (status.status === 'completed') {
          uploadState.value = 'done';
          return;
        }
        if (status.status === 'failed') {
          uploadState.value = 'error';
          error.value = 'Processing failed. Please try again.';
          return;
        }
      } catch {
        // Retry on network error
      }
    }

    uploadState.value = 'error';
    error.value = 'Processing timed out. Please try again.';
  }

  return { files, uploadState, shareToken, error, statusData, optOut, readingProgress, addFiles, removeFile, reset, startUpload };
}
