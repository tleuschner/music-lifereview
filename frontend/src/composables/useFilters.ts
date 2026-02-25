import { ref, computed } from "vue";
import type { StatsFilter } from "@music-livereview/shared";

export function useFilters() {
  const dateFrom = ref<string | null>(null);
  const dateTo = ref<string | null>(null);
  const selectedArtist = ref<string | null>(null);
  const sortBy = ref<"hours" | "count">("count");
  const limit = ref(20);

  const dateRangeError = computed<string | null>(() => {
    if (dateFrom.value && dateTo.value && dateFrom.value > dateTo.value) {
      return '"From" must be before "To"';
    }
    return null;
  });

  // Month picker returns "YYYY-MM"; append "-01" so the backend can cast to a full date.
  // Drop both dates when the range is invalid so no bad request reaches the backend.
  const activeFilters = computed<StatsFilter>(() => ({
    from: !dateRangeError.value && dateFrom.value ? `${dateFrom.value}-01` : undefined,
    to: !dateRangeError.value && dateTo.value ? `${dateTo.value}-01` : undefined,
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
    sortBy.value = "count";
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
    dateRangeError,
    resetFilters,
  };
}
