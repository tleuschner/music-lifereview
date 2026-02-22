<template>
  <div class="stat-card card">
    <p class="stat-label">{{ label }}</p>
    <p class="stat-value">{{ value }}</p>
    <p v-if="subtitle" class="stat-subtitle">{{ subtitle }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  subtitle?: string;
}>();
</script>

<style scoped>
.stat-card {
  text-align: center;
}

.stat-label {
  color: var(--color-text-secondary);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-primary);
}

.stat-subtitle {
  color: var(--color-text-muted);
  font-size: 0.8rem;
  margin-top: 0.25rem;
}
</style>
