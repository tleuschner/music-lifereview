<template>
  <div class="chart-container card">
    <h3 class="section-title">Listening Over Time</h3>
    <div class="chart-wrapper">
      <Line v-if="chartData" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Line } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js';
import type { TimelinePoint } from '@music-livereview/shared';
import { useChartData } from '../../composables/useChartData';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

const props = defineProps<{ data: TimelinePoint[] }>();
const { toLineChart, defaultLineOptions } = useChartData();

const chartData = computed(() => props.data.length ? toLineChart(props.data) : null);
const chartOptions = defaultLineOptions;
</script>

<style scoped>
.chart-wrapper {
  height: 350px;
}
</style>
