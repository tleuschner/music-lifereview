<template>
  <div v-if="loading" class="chart-container card">
    <LoadingSpinner />
  </div>
  <div v-else-if="error" class="chart-container card rate-limit-error">
    <p class="rate-limit-message">Rate limit reached — please wait a moment and try again.</p>
  </div>
  <slot v-else />
</template>

<script setup lang="ts">
import LoadingSpinner from './LoadingSpinner.vue';

defineProps<{ loading: boolean; error: boolean }>();
</script>

<style scoped>
.rate-limit-error {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 120px;
}

.rate-limit-message {
  color: var(--color-text-secondary);
  font-size: 0.875rem;
}
</style>
