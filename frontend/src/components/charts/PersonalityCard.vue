<template>
  <div class="chart-container card">
    <div class="chart-header">
      <h3>Your Listener Personality</h3>
      <p class="chart-subtitle">Based on your time of day, loyalty, skip habits, session length, and shuffle patterns</p>
    </div>

    <div v-if="!result" class="empty-state">
      <p>Not enough data to determine your personality yet.</p>
    </div>

    <template v-else>
      <div class="personality-hero">
        <div class="personality-emoji">{{ result.emoji }}</div>
        <div class="personality-identity">
          <h2 class="personality-name">{{ result.name }}</h2>
          <p class="personality-description">{{ result.description }}</p>
          <p class="personality-fun-stat">✦ {{ result.funStat }}</p>
          <p v-if="rarityText" class="personality-rarity">{{ rarityText }}</p>
        </div>
      </div>

      <div class="dimension-breakdown">
        <h4 class="breakdown-title">How we got here</h4>
        <div class="dimension-list">
          <div
            v-for="(key) in dimensionKeys"
            :key="key"
            class="dimension-row"
          >
            <span class="dimension-label">{{ DIMENSION_LABELS[key] }}</span>
            <span
              class="dimension-value"
              :class="key"
              :data-tooltip="DIMENSION_VALUE_TOOLTIPS[key][result.dimensions[key] as never]"
            >{{ DIMENSION_VALUE_LABELS[key][result.dimensions[key] as never] }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import type { PersonalityInputsResponse } from '@music-livereview/shared';
import {
  calculatePersonality,
  DIMENSION_LABELS,
  DIMENSION_VALUE_LABELS,
  DIMENSION_VALUE_TOOLTIPS,
  type DimensionScores,
} from '../../services/personalityEngine';
import { recordPersonality, getPersonalityDistribution } from '../../services/api';

const props = defineProps<{
  data: PersonalityInputsResponse | null;
  token: string;
}>();

const result = computed(() => props.data ? calculatePersonality(props.data) : null);
const dimensionKeys = Object.keys(DIMENSION_LABELS) as Array<keyof DimensionScores>;

const rarityText = ref<string | null>(null);

async function syncPersonality() {
  if (!result.value || !props.token) return;

  const id = result.value.id;

  // Fire-and-forget record — we don't block the UI on this
  recordPersonality(props.token, id).catch(() => {/* best-effort */});

  try {
    const dist = await getPersonalityDistribution();
    const entry = dist.entries.find(e => e.personalityId === id);
    if (entry && dist.total >= 5) {
      rarityText.value = `${entry.percentage}% of listeners share this personality.`;
    }
  } catch {
    // distribution is non-critical — silently ignore
  }
}

onMounted(() => { if (result.value) syncPersonality(); });
watch(result, (val) => { if (val) syncPersonality(); }, { once: true });
</script>

<style scoped>
.personality-hero {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(29, 185, 84, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
  border: 1px solid rgba(29, 185, 84, 0.2);
  border-radius: 12px;
  margin-bottom: 1.5rem;
}

.personality-emoji {
  font-size: 3.5rem;
  line-height: 1;
  flex-shrink: 0;
}

.personality-identity {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.personality-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1db954;
  margin: 0;
}

.personality-description {
  color: #ccc;
  line-height: 1.6;
  margin: 0;
  font-size: 0.95rem;
}

.personality-fun-stat {
  color: #888;
  font-size: 0.85rem;
  margin: 0;
  font-style: italic;
}

.personality-rarity {
  color: #555;
  font-size: 0.8rem;
  margin: 0;
}

.breakdown-title {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #666;
  margin: 0 0 0.75rem 0;
}

.dimension-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.dimension-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 6px;
}

.dimension-label {
  color: #888;
  font-size: 0.85rem;
}

.dimension-value {
  font-size: 0.85rem;
  font-weight: 600;
  color: #1db954;
  position: relative;
  cursor: default;
}

.dimension-value[data-tooltip]:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  bottom: calc(100% + 8px);
  right: 0;
  width: max-content;
  max-width: 240px;
  background: #1a1a1a;
  border: 1px solid rgba(29, 185, 84, 0.3);
  border-radius: 6px;
  padding: 0.5rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 400;
  color: #bbb;
  line-height: 1.4;
  white-space: normal;
  z-index: 10;
  pointer-events: none;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.dimension-value[data-tooltip]:hover::before {
  content: '';
  position: absolute;
  bottom: calc(100% + 2px);
  right: 10px;
  border: 5px solid transparent;
  border-top-color: rgba(29, 185, 84, 0.3);
  z-index: 11;
  pointer-events: none;
}
</style>
