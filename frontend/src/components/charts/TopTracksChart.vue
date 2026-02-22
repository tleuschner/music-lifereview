<template>
  <div class="chart-container card">
    <h3 class="section-title">Top Tracks</h3>
    <div class="chart-wrapper">
      <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import type { TopTrackEntry } from '@music-livereview/shared';
import { useChartData } from '../../composables/useChartData';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const props = defineProps<{ data: TopTrackEntry[]; sortBy: 'hours' | 'count' }>();
const { toBarChart, defaultBarOptions } = useChartData();

const chartData = computed(() =>
  props.data.length ? toBarChart(props.data, 'name', props.sortBy === 'hours' ? 'totalHours' : 'playCount') : null
);
const chartOptions = defaultBarOptions;
</script>

<style scoped>
.chart-wrapper {
  height: 500px;
}
</style>
