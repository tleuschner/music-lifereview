<template>
  <footer class="app-footer">
    <div class="footer-inner">
      <span class="footer-copy">&copy; {{ year }} music livereview</span>
      <nav class="footer-links">
        <RouterLink to="/impressum" class="footer-link">Impressum</RouterLink>
        <RouterLink to="/datenschutz" class="footer-link">Datenschutz</RouterLink>
      </nav>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';

const year = new Date().getFullYear();
</script>

<style scoped>
.app-footer {
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  margin-top: auto;
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.footer-copy {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.footer-links {
  display: flex;
  gap: 1.5rem;
}

.footer-link {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  text-decoration: none;
}

.footer-link:hover {
  color: var(--color-text);
}
</style>
