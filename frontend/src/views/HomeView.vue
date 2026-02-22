<template>
  <div class="home">
    <section class="hero">
      <h1 class="hero-title">Your Spotify history,<br /><span class="hero-accent">visualized.</span></h1>
      <p class="hero-subtitle">
        Upload your Spotify Extended Streaming History and explore years of listening data
        through interactive charts. See your top artists, discover patterns, and compare
        against the community — no account needed.
      </p>
      <RouterLink to="/upload" class="btn btn-primary hero-cta">Upload Your Data</RouterLink>
    </section>

    <section class="features">
      <div class="grid grid-3">
        <div class="feature card">
          <h3 class="feature-title">Interactive Dashboard</h3>
          <p class="feature-desc">Filter by date range, sort by hours or play count, explore your top artists, tracks, and listening patterns.</p>
        </div>
        <div class="feature card">
          <h3 class="feature-title">Shareable Link</h3>
          <p class="feature-desc">Each upload generates a unique link. No sign-up, no passwords — share your stats with anyone.</p>
        </div>
        <div class="feature card">
          <h3 class="feature-title">Community Comparison</h3>
          <p class="feature-desc">See how you stack up. Percentile rankings, global averages, and trending artists across all uploads.</p>
        </div>
      </div>
    </section>

    <section class="how-it-works">
      <h2 class="section-title">How It Works</h2>
      <ol class="steps">
        <li class="step">
          <span class="step-num">1</span>
          <div>
            <strong>Request your data</strong>
            <p>Go to Spotify Privacy Settings and request "Extended streaming history." It can take up to 30 days.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">2</span>
          <div>
            <strong>Upload the JSON files</strong>
            <p>Drag and drop the <code>Streaming_History_Audio_*.json</code> files from your download.</p>
          </div>
        </li>
        <li class="step">
          <span class="step-num">3</span>
          <div>
            <strong>Explore your stats</strong>
            <p>Get an interactive dashboard with charts, heatmaps, and discovery insights — all from your link.</p>
          </div>
        </li>
      </ol>
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.home {
  display: flex;
  flex-direction: column;
  gap: 4rem;
}

.hero {
  text-align: center;
  padding: 4rem 0 2rem;
}

.hero-title {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 1.25rem;
}

.hero-accent {
  color: var(--color-primary);
}

.hero-subtitle {
  max-width: 600px;
  margin: 0 auto 2rem;
  color: var(--color-text-secondary);
  font-size: 1.1rem;
  line-height: 1.6;
}

.hero-cta {
  padding: 0.875rem 2rem;
  font-size: 1rem;
  text-decoration: none;
}

.feature-title {
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.feature-desc {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.5;
}

.steps {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.step {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.step-num {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
}

.step strong {
  display: block;
  margin-bottom: 0.25rem;
}

.step p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

.step code {
  background: var(--color-surface);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.8rem;
}
</style>
