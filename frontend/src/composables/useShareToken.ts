import { computed } from 'vue';
import { useRoute } from 'vue-router';

export function useShareToken() {
  const route = useRoute();
  const token = computed(() => route.params.token as string);

  const shareUrl = computed(() => {
    if (!token.value) return '';
    return `${window.location.origin}/results/${token.value}`;
  });

  async function copyToClipboard() {
    if (shareUrl.value) {
      await navigator.clipboard.writeText(shareUrl.value);
    }
  }

  return { token, shareUrl, copyToClipboard };
}
