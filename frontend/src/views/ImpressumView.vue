<template>
  <div class="legal-page">
    <h1 class="page-title">Impressum</h1>

    <section class="legal-section">
      <h2>Angaben gemäß § 5 TMG</h2>
      <p>
        [FULL NAME]<br />
        [STREET AND HOUSE NUMBER]<br />
        [POSTAL CODE] [CITY]<br />
        Deutschland
      </p>
    </section>

    <section class="legal-section">
      <h2>Kontakt</h2>
      <p>E-Mail: <a href="mailto:[EMAIL]">[EMAIL]</a></p>
    </section>

    <section class="legal-section">
      <h2>Verantwortlich für den Inhalt nach § 55 Abs. 2 RStV</h2>
      <p>
        [FULL NAME]<br />
        [STREET AND HOUSE NUMBER]<br />
        [POSTAL CODE] [CITY]
      </p>
    </section>

    <section class="legal-section">
      <h2>Haftungsausschluss</h2>
      <p>
        Diese Website ist ein privates Projekt ohne kommerziellen Hintergrund.
        Die bereitgestellten Analysen basieren ausschließlich auf Daten, die Nutzer selbst hochladen.
        Eine Gewähr für die Richtigkeit der dargestellten Auswertungen wird nicht übernommen.
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
</script>

<style scoped>
.legal-page {
  max-width: 700px;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
}

.legal-section h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.legal-section p {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
}

.legal-section a {
  color: var(--color-primary);
  text-decoration: none;
}

.legal-section a:hover {
  text-decoration: underline;
}
</style>
