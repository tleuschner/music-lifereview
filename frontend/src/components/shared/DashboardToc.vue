<template>
  <!-- Desktop: sticky sidebar -->
  <nav class="toc" aria-label="Page sections">
    <a
      v-for="section in sections"
      :key="section.id"
      :href="`#${section.id}`"
      class="toc-link"
      :class="{ active: activeSection === section.id }"
      @click.prevent="jumpTo(section.id)"
    >{{ section.label }}</a>
  </nav>

  <!-- Mobile: sticky pill bar, teleported to sit at top of dashboard-wrapper -->
  <!-- <Teleport to="#mobile-nav-slot">
  <nav class="mobile-nav" aria-label="Page sections">
    <div class="mobile-nav-inner">
      <a
        v-for="section in sections"
        :key="section.id"
        :ref="(el) => setPillRef(section.id, el)"
        :href="`#${section.id}`"
        class="mobile-pill"
        :class="{ active: activeSection === section.id }"
        @click.prevent="jumpTo(section.id)"
      >{{ section.label }}</a>
    </div>
  </nav>
  </Teleport> -->
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue';

const props = defineProps<{
  sections: Array<{ id: string; label: string }>;
}>();

const activeSection = ref(props.sections[0]?.id ?? '');
const pillRefs = new Map<string, HTMLElement>();

function setPillRef(id: string, el: unknown) {
  if (el instanceof HTMLElement) pillRefs.set(id, el);
  else pillRefs.delete(id);
}

watch(activeSection, (id) => {
  pillRefs.get(id)?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
});

let observer: IntersectionObserver | null = null;

onMounted(() => {
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeSection.value = entry.target.id;
        }
      }
    },
    { rootMargin: '-80px 0px -80% 0px', threshold: 0 },
  );
  for (const { id } of props.sections) {
    const el = document.getElementById(id);
    if (el) observer.observe(el);
  }
});

onUnmounted(() => observer?.disconnect());

function jumpTo(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - 80;
  window.scrollTo({ top, behavior: 'smooth' });
  history.replaceState(null, '', `#${id}`);
}
</script>

<style scoped>
/* ── Desktop sidebar ─────────────────────────────── */
.toc {
  position: sticky;
  top: 80px;
  align-self: flex-start;
  width: 148px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 100px);
  overflow-y: auto;
  scrollbar-width: none;
}

.toc::-webkit-scrollbar {
  display: none;
}

.toc-link {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
  text-decoration: none;
  padding: 0.3rem 0.75rem;
  border-left: 2px solid var(--color-border);
  line-height: 1.4;
  transition: color 0.15s, border-color 0.15s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toc-link:hover {
  color: var(--color-text);
  border-left-color: var(--color-text-secondary);
}

.toc-link.active {
  color: var(--color-primary);
  border-left-color: var(--color-primary);
}

/* ── Mobile pill bar ─────────────────────────────── */
.mobile-nav {
  display: none;
  position: sticky;
  top: 64px;
  z-index: 50;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.mobile-nav-inner {
  display: flex;
  gap: 0.375rem;
  padding: 0.5rem 1rem;
  overflow-x: auto;
  scrollbar-width: none;
}

.mobile-nav-inner::-webkit-scrollbar {
  display: none;
}

.mobile-pill {
  display: inline-block;
  flex-shrink: 0;
  padding: 0.2rem 0.625rem;
  font-size: 0.7rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  text-decoration: none;
  white-space: nowrap;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}

.mobile-pill:hover {
  color: var(--color-text);
  border-color: var(--color-text-secondary);
}

.mobile-pill.active {
  color: var(--color-primary);
  border-color: var(--color-primary);
  background: rgba(29, 185, 84, 0.1);
}

/* ── Breakpoints ─────────────────────────────────── */
@media (max-width: 1100px) {
  .toc {
    display: none;
  }

  .mobile-nav {
    display: block;
  }
}
</style>
