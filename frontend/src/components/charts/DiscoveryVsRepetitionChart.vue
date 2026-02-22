<template>
  <div class="chart-container card">
    <h3 class="section-title">Discovery vs. Repetition</h3>
    <div class="chart-wrapper">
      <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js';
import type { DiscoveryRatePoint } from '@music-livereview/shared';
import { useChartData } from '../../composables/useChartData';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

const props = defineProps<{ data: DiscoveryRatePoint[] }>();
const { toDiscoveryChart, stackedBarOptions } = useChartData();

const chartData = computed(() => props.data.length ? toDiscoveryChart(props.data) : null);
const chartOptions = stackedBarOptions;
</script>

<style scoped>
.chart-wrapper {
  height: 350px;
}
</style>
