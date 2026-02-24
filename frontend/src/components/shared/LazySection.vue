<template>
  <div ref="sentinel">
    <slot v-if="visible" />
    <div v-else class="lazy-placeholder" :style="{ minHeight }" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

withDefaults(defineProps<{ minHeight?: string }>(), { minHeight: '400px' });

const sentinel = ref<HTMLElement | null>(null);
const visible = ref(false);
let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting) {
        visible.value = true;
        observer?.disconnect();
        observer = null;
      }
    },
    { rootMargin: '600px' },
  );
  if (sentinel.value) observer.observe(sentinel.value);
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<style scoped>
.lazy-placeholder {
  border-radius: 8px;
  background: var(--color-surface, #1a1a1a);
}
</style>
