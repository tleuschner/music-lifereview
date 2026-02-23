import { ref, computed } from "vue";
import type { StatsFilter } from "@music-livereview/shared";

export function useFilters() {
  const dateFrom = ref<string | null>(null);
  const dateTo = ref<string | null>(null);
  const selectedArtist = ref<string | null>(null);
  const sortBy = ref<"hours" | "count">("hours");
  const limit = ref(50);

  // Month picker returns "YYYY-MM"; append "-01" so the backend can cast to a full date
  const activeFilters = computed<StatsFilter>(() => ({
    from: dateFrom.value ? `${dateFrom.value}-01` : undefined,
    to: dateTo.value ? `${dateTo.value}-01` : undefined,
    artist: selectedArtist.value ?? undefined,
    sort: sortBy.value,
    limit: limit.value,
  }));

  const hasActiveFilters = computed(
    () =>
      dateFrom.value !== null ||
      dateTo.value !== null ||
      selectedArtist.value !== null,
  );

  function resetFilters() {
    dateFrom.value = null;
    dateTo.value = null;
    selectedArtist.value = null;
    sortBy.value = "hours";
    limit.value = 20;
  }

  return {
    dateFrom,
    dateTo,
    selectedArtist,
    sortBy,
    limit,
    activeFilters,
    hasActiveFilters,
    resetFilters,
  };
}
