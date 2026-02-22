<template>
  <!-- Floating action button — always visible -->
  <button class="bmc-fab" @click="forceShow" aria-label="Buy me a coffee">
    ☕
  </button>

  <!-- Modal overlay -->
  <Transition name="fade">
    <div v-if="visible" class="bmc-overlay" @click.self="dismiss">
      <Transition name="scale-up">
        <div v-if="visible" class="bmc-modal">
          <span class="bmc-icon">☕</span>
          <h2 class="bmc-title">Enjoying your stats?</h2>
          <p class="bmc-sub">
            This took a lot of late nights to build. If it brought you any joy,
            a coffee would genuinely make my day.
          </p>
          <a
            href="https://buymeacoffee.com/timleuschner"
            target="_blank"
            rel="noopener noreferrer"
            class="bmc-btn"
            @click="dismiss"
            >☕ Buy me a coffee</a
          >
          <button class="bmc-skip" @click="dismiss">No thanks</button>
        </div>
      </Transition>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref } from "vue";

const STORAGE_KEY = "bmc_dismissed";

const visible = ref(false);

function show() {
  visible.value = true;
}

function forceShow() {
  visible.value = true;
}

function dismiss() {
  visible.value = false;
}

defineExpose({ show });
</script>

<style scoped>
/* ── Floating button ── */
.bmc-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  z-index: 999;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 1px solid #333;
  background: #1e1e1e;
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.45);
  transition:
    transform 0.15s,
    background 0.15s;
  animation: bmc-shake 5s ease-in-out infinite;
}

.bmc-fab:hover {
  background: #2a2a2a;
  transform: scale(1.1);
  animation: none;
}

@keyframes bmc-shake {
  /* idle for first 88%, then shake, then settle */
  0%,
  88% {
    transform: rotate(0deg);
  }
  90% {
    transform: rotate(-14deg);
  }
  92% {
    transform: rotate(14deg);
  }
  94% {
    transform: rotate(-10deg);
  }
  96% {
    transform: rotate(10deg);
  }
  98% {
    transform: rotate(-4deg);
  }
  100% {
    transform: rotate(0deg);
  }
}

/* ── Modal overlay ── */
.bmc-overlay {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.bmc-modal {
  background: #1e1e1e;
  border: 1px solid #2e2e2e;
  border-radius: 16px;
  padding: 2.5rem 2rem;
  max-width: 420px;
  width: 100%;
  text-align: center;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.bmc-icon {
  font-size: 3rem;
  line-height: 1;
}

.bmc-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 700;
  color: #e8e8e8;
}

.bmc-sub {
  margin: 0;
  font-size: 0.9rem;
  color: #888;
  line-height: 1.6;
  max-width: 320px;
}

.bmc-btn {
  display: inline-block;
  margin-top: 0.5rem;
  padding: 12px 28px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #1a1a1a;
  background: #ffdd00;
  border-radius: 8px;
  text-decoration: none;
  transition:
    background 0.15s,
    transform 0.1s;
}

.bmc-btn:hover {
  background: #ffe633;
  transform: translateY(-1px);
}

.bmc-skip {
  background: none;
  border: none;
  color: #444;
  font-size: 0.8rem;
  cursor: pointer;
  padding: 4px 8px;
  transition: color 0.15s;
}

.bmc-skip:hover {
  color: #777;
}

/* ── Transitions ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.scale-up-enter-active,
.scale-up-leave-active {
  transition:
    transform 0.25s ease,
    opacity 0.25s ease;
}
.scale-up-enter-from,
.scale-up-leave-to {
  transform: scale(0.93);
  opacity: 0;
}
</style>
