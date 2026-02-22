<template>
  <div class="share-card card">
    <p class="share-label">Your shareable link</p>
    <div class="share-input-row">
      <input type="text" :value="url" readonly class="share-input" @click="($event.target as HTMLInputElement).select()" />
      <button class="btn btn-primary" @click="copy">{{ copied ? 'Copied!' : 'Copy' }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const props = defineProps<{ url: string }>();
const copied = ref(false);

async function copy() {
  await navigator.clipboard.writeText(props.url);
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}
</script>

<style scoped>
.share-card {
  max-width: 600px;
}

.share-label {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  margin-bottom: 0.75rem;
}

.share-input-row {
  display: flex;
  gap: 0.5rem;
}

.share-input {
  flex: 1;
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.625rem 0.75rem;
  color: var(--color-text);
  font-size: 0.875rem;
}
</style>
