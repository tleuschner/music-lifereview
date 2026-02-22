import type { ChartData, ChartOptions } from 'chart.js';
import type {
  TopArtistEntry,
  TopTrackEntry,
  TimelinePoint,
  ArtistTimelineResponse,
  DiscoveryRatePoint,
} from '@music-livereview/shared';

const COLORS = [
  '#1db954', '#1ed760', '#2ecc71', '#3498db', '#9b59b6',
  '#e74c3c', '#e67e22', '#f1c40f', '#00bcd4', '#ff5722',
];

export function useChartData() {
  function toBarChart(data: TopArtistEntry[] | TopTrackEntry[], labelKey: 'name', valueKey: 'totalHours' | 'playCount'): ChartData<'bar'> {
    return {
      labels: data.map(d => d[labelKey]),
      datasets: [{
        label: valueKey === 'totalHours' ? 'Hours' : 'Plays',
        data: data.map(d => d[valueKey]),
        backgroundColor: '#1db954',
        borderRadius: 4,
      }],
    };
  }

  function toLineChart(timeline: TimelinePoint[]): ChartData<'line'> {
    return {
      labels: timeline.map(t => t.period),
      datasets: [{
        label: 'Listening Hours',
        data: timeline.map(t => t.totalHours),
        borderColor: '#1db954',
        backgroundColor: 'rgba(29, 185, 84, 0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 2,
      }],
    };
  }

  function toStackedAreaChart(data: ArtistTimelineResponse): ChartData<'line'> {
    return {
      labels: data.periods,
      datasets: data.artists.map((artist, i) => ({
        label: artist.name,
        data: artist.values,
        borderColor: COLORS[i % COLORS.length],
        backgroundColor: COLORS[i % COLORS.length] + '40',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      })),
    };
  }

  function toHeatmapData(data: number[][]): { data: number[][]; maxValue: number } {
    const maxValue = Math.max(...data.flat());
    return { data, maxValue };
  }

  function toDiscoveryChart(data: DiscoveryRatePoint[]): ChartData<'bar'> {
    return {
      labels: data.map(d => d.period),
      datasets: [
        {
          label: 'New Songs',
          data: data.map(d => d.newSongs),
          backgroundColor: '#1db954',
          borderRadius: 2,
        },
        {
          label: 'Repeated',
          data: data.map(d => d.repeats),
          backgroundColor: '#3498db',
          borderRadius: 2,
        },
      ],
    };
  }

  const defaultBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { color: '#2a2a2a' }, ticks: { color: '#888' } },
      y: { grid: { display: false }, ticks: { color: '#e0e0e0' } },
    },
  };

  const defaultLineOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#e0e0e0' } } },
    scales: {
      x: { grid: { color: '#2a2a2a' }, ticks: { color: '#888', maxRotation: 45 } },
      y: { grid: { color: '#2a2a2a' }, ticks: { color: '#888' } },
    },
  };

  const stackedAreaOptions: ChartOptions<'line'> = {
    ...defaultLineOptions,
    scales: {
      ...defaultLineOptions.scales,
      y: { ...defaultLineOptions.scales!.y, stacked: true },
    },
  };

  const stackedBarOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#e0e0e0' } } },
    scales: {
      x: { stacked: true, grid: { color: '#2a2a2a' }, ticks: { color: '#888', maxRotation: 45 } },
      y: { stacked: true, grid: { color: '#2a2a2a' }, ticks: { color: '#888' } },
    },
  };

  return {
    toBarChart,
    toLineChart,
    toStackedAreaChart,
    toHeatmapData,
    toDiscoveryChart,
    defaultBarOptions,
    defaultLineOptions,
    stackedAreaOptions,
    stackedBarOptions,
  };
}
