<template>
  <div
    class="dropzone"
    :class="{ 'dropzone-active': dragging }"
    @dragover.prevent="dragging = true"
    @dragleave="dragging = false"
    @drop.prevent="onDrop"
    @click="openFilePicker"
  >
    <div class="dropzone-content">
      <div class="dropzone-icon">+</div>
      <p class="dropzone-text">Drop your Spotify export zip here</p>
      <p class="dropzone-hint">or click to browse &mdash; also accepts individual JSON files</p>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept=".zip,.json"
      multiple
      hidden
      @change="onFileInput"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ files: [files: File[]] }>();
const dragging = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function openFilePicker() {
  fileInput.value?.click();
}

function onDrop(e: DragEvent) {
  dragging.value = false;
  if (e.dataTransfer?.files) {
    emit('files', Array.from(e.dataTransfer.files));
  }
}

function onFileInput(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files) {
    emit('files', Array.from(input.files));
    input.value = '';
  }
}
</script>

<style scoped>
.dropzone {
  border: 2px dashed var(--color-border);
  border-radius: var(--radius-lg);
  padding: 3rem 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s;
}

.dropzone:hover,
.dropzone-active {
  border-color: var(--color-primary);
  background: rgba(29, 185, 84, 0.05);
}

.dropzone-icon {
  font-size: 2.5rem;
  color: var(--color-text-muted);
  margin-bottom: 0.5rem;
}

.dropzone-text {
  font-size: 1rem;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.dropzone-hint {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}
</style>
