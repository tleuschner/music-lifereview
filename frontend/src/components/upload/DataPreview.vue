<template>
  <div v-if="preview" class="preview card">
    <div class="preview-header">
      <h3 class="section-title">Preview</h3>
      <span class="preview-estimate-badge">estimates</span>
    </div>
    <div class="preview-stats grid grid-4">
      <div class="preview-stat">
        <span class="preview-stat-value">~{{ preview.entryCount.toLocaleString() }}</span>
        <span class="preview-stat-label">Entries</span>
      </div>
      <div class="preview-stat">
        <span class="preview-stat-value">~{{ preview.totalHoursEstimate.toLocaleString() }}h</span>
        <span class="preview-stat-label">Listening Time</span>
      </div>
      <div class="preview-stat">
        <span class="preview-stat-value">{{ formatDate(preview.dateFrom) }}</span>
        <span class="preview-stat-label">From</span>
      </div>
      <div class="preview-stat">
        <span class="preview-stat-value">{{ formatDate(preview.dateTo) }}</span>
        <span class="preview-stat-label">To</span>
      </div>
    </div>
    <div v-if="preview.topArtists.length" class="preview-artists">
      <p class="preview-artists-label">Top Artists (from sample)</p>
      <div class="preview-artist-list">
        <span v-for="artist in preview.topArtists" :key="artist.name" class="preview-artist-tag">
          {{ artist.name }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { PreviewSummary } from '../../composables/useLocalPreview';

defineProps<{ preview: PreviewSummary | null }>();

function formatDate(iso: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}
</script>

<style scoped>
.preview-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 1rem;
}

.preview-header .section-title {
  margin-bottom: 0;
}

.preview-estimate-badge {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--color-text-muted);
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.15rem 0.55rem;
  align-self: center;
}

.preview-stats {
  margin-bottom: 1rem;
}

.preview-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-stat-value {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--color-primary);
}

.preview-stat-label {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}

.preview-artists-label {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  margin-bottom: 0.5rem;
}

.preview-artist-list {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.preview-artist-tag {
  background: var(--color-bg);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  padding: 0.25rem 0.75rem;
  font-size: 0.8rem;
  color: var(--color-text);
}
</style>
