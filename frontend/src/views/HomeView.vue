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

    <section class="how-it-works card">
      <h2 class="section-title">How It Works</h2>
      <div class="steps-layout">
        <ol class="steps">
          <li class="step">
            <span class="step-num">1</span>
            <div>
              <strong>Request your data from Spotify</strong>
              <p>
                Go to
                <a href="https://www.spotify.com/account/privacy/" target="_blank" rel="noopener" class="step-link">Spotify Privacy Settings</a>
                and request "Extended streaming history." You'll get a confirmation on the page (see right) and an email with a download link. It can take a few days.
              </p>
            </div>
          </li>
          <li class="step">
            <span class="step-num">2</span>
            <div>
              <strong>Upload your export</strong>
              <p>Drop the downloaded <code>.zip</code> directly — or the individual <code>Streaming_History_Audio_*.json</code> files. No extraction needed.</p>
            </div>
          </li>
          <li class="step">
            <span class="step-num">3</span>
            <div>
              <strong>Explore your stats</strong>
              <p>Get an interactive dashboard with charts, heatmaps, and discovery insights — shareable via a unique link, no account needed.</p>
            </div>
          </li>
        </ol>
        <div class="step-preview">
          <img src="/spotify-export-ready.png" alt="Spotify export confirmation screen" class="preview-img" />
        </div>
      </div>
      <RouterLink to="/upload" class="btn btn-primary steps-cta">Get Started</RouterLink>
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

.how-it-works {
  padding: 2.5rem;
}

.how-it-works .section-title {
  margin-bottom: 2rem;
}

.steps-layout {
  display: flex;
  gap: 2.5rem;
  align-items: flex-start;
}

.steps {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  flex: 1;
}

.step {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.step-num {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-primary);
  color: #000;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
}

.step strong {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 1rem;
}

.step p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.55;
}

.step-link {
  color: var(--color-primary);
  text-decoration: none;
}

.step-link:hover {
  text-decoration: underline;
}

.step code {
  background: var(--color-bg);
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
  font-size: 0.8rem;
  border: 1px solid var(--color-border);
}

.step-preview {
  flex-shrink: 0;
  width: 240px;
}

.preview-img {
  width: 100%;
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  display: block;
}

.steps-cta {
  display: inline-block;
  margin-top: 2rem;
  text-decoration: none;
  padding: 0.75rem 1.75rem;
}

@media (max-width: 640px) {
  .steps-layout {
    flex-direction: column;
  }

  .step-preview {
    width: 100%;
    max-width: 280px;
  }
}
</style>
