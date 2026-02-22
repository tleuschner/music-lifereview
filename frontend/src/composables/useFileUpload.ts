import { ref } from 'vue';
import { uploadFiles, getStatus } from '../services/api';
import type { StatusResponse } from '@music-livereview/shared';

export type UploadState = 'idle' | 'validating' | 'uploading' | 'processing' | 'done' | 'error';

export function useFileUpload() {
  const files = ref<File[]>([]);
  const uploadState = ref<UploadState>('idle');
  const shareToken = ref<string | null>(null);
  const error = ref<string | null>(null);
  const statusData = ref<StatusResponse | null>(null);
  const optOut = ref(false);

  function addFiles(newFiles: File[]) {
    const jsonFiles = newFiles.filter(f => f.name.endsWith('.json'));
    if (jsonFiles.length === 0) {
      error.value = 'Please upload .json files from your Spotify data export.';
      return;
    }
    files.value = [...files.value, ...jsonFiles];
    error.value = null;
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
  }

  async function startUpload() {
    if (files.value.length === 0) return;

    try {
      uploadState.value = 'uploading';
      error.value = null;

      const result = await uploadFiles(files.value, optOut.value);
      shareToken.value = result.shareToken;
      uploadState.value = 'processing';

      await pollStatus(result.shareToken);
    } catch (err: any) {
      uploadState.value = 'error';
      error.value = err.response?.data?.error ?? err.message ?? 'Upload failed';
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

  return { files, uploadState, shareToken, error, statusData, optOut, addFiles, removeFile, reset, startUpload };
}
