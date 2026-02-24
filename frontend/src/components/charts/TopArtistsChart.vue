<template>
  <div class="chart-container card">
    <h3 class="section-title">Top Artists</h3>
    <div class="chart-wrapper">
      <Bar v-if="chartData" :data="chartData" :options="chartOptions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Bar } from 'vue-chartjs';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
import type { ChartOptions } from 'chart.js';
import type { TopArtistEntry } from '@music-livereview/shared';
import { useChartData } from '../../composables/useChartData';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip);

const props = defineProps<{ data: TopArtistEntry[]; sortBy: 'hours' | 'count' }>();
const { toBarChart } = useChartData();

const chartData = computed(() =>
  props.data.length ? toBarChart(props.data, 'name', props.sortBy === 'hours' ? 'totalHours' : 'playCount') : null
);

const chartOptions = computed<ChartOptions<'bar'>>(() => ({
  responsive: true,
  maintainAspectRatio: false,
  indexAxis: 'y',
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { color: '#2a2a2a' }, ticks: { color: '#888' } },
    y: {
      grid: { display: false },
      ticks: {
        color: '#e0e0e0',
        ...(props.data.length > 20 ? {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          callback: function(this: any, value: number | string, index: number) {
            return index % 2 === 0 ? this.getLabelForValue(value as number) : '';
          },
        } : {}),
      },
    },
  },
}));
</script>

<style scoped>
.chart-wrapper {
  height: 500px;
}
</style>