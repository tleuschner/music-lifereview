<template>
  <div class="filter-bar card">
    <div class="filter-row">
      <div class="filter-group">
        <label class="filter-label">From</label>
        <input type="month" :value="dateFrom" class="filter-input" @input="$emit('update:dateFrom', ($event.target as HTMLInputElement).value || null)" />
      </div>
      <div class="filter-group">
        <label class="filter-label">To</label>
        <input type="month" :value="dateTo" class="filter-input" @input="$emit('update:dateTo', ($event.target as HTMLInputElement).value || null)" />
      </div>
      <div class="filter-group">
        <label class="filter-label">Sort by</label>
        <select :value="sortBy" class="filter-input" @change="$emit('update:sortBy', ($event.target as HTMLSelectElement).value)">
          <option value="hours">Listening Hours</option>
          <option value="count">Play Count</option>
        </select>
      </div>
      <button v-if="hasActiveFilters" class="btn btn-secondary filter-reset" @click="$emit('reset')">
        Reset
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  dateFrom: string | null;
  dateTo: string | null;
  sortBy: 'hours' | 'count';
  hasActiveFilters: boolean;
}>();

defineEmits<{
  'update:dateFrom': [value: string | null];
  'update:dateTo': [value: string | null];
  'update:sortBy': [value: string];
  reset: [];
}>();
</script>

<style scoped>
.filter-row {
  display: flex;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.filter-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.filter-input {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.5rem 0.75rem;
  color: var(--color-text);
  font-size: 0.875rem;
}

.filter-reset {
  align-self: flex-end;
}
</style>
