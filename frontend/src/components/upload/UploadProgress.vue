<template>
  <div class="progress card">
    <div class="progress-status">
      <LoadingSpinner v-if="state === 'reading' || state === 'aggregating' || state === 'uploading' || state === 'processing'" :message="message" />
      <div v-else-if="state === 'error'" class="progress-error">
        <p class="progress-error-text">{{ error }}</p>
        <button class="btn btn-secondary" @click="$emit('retry')">Try Again</button>
      </div>
      <div v-else-if="state === 'done'" class="progress-done">
        <p class="progress-done-text">Analysis complete!</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { UploadState } from '../../composables/useFileUpload';
import LoadingSpinner from '../shared/LoadingSpinner.vue';

const props = defineProps<{
  state: UploadState;
  error: string | null;
}>();

defineEmits<{ retry: [] }>();

const message = computed(() => {
  if (props.state === 'reading') return 'Reading files...';
  if (props.state === 'aggregating') return 'Processing your listening history...';
  if (props.state === 'uploading') return 'Uploading...';
  if (props.state === 'processing') return 'Saving your data...';
  return '';
});
</script>

<style scoped>
.progress-error {
  text-align: center;
}

.progress-error-text {
  color: var(--color-error);
  margin-bottom: 1rem;
}

.progress-done-text {
  color: var(--color-primary);
  font-weight: 600;
  font-size: 1.125rem;
  text-align: center;
}
</style>
