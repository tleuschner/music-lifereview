<template>
  <div class="legal-page">
    <h1 class="page-title">Datenschutzerklärung</h1>
    <p class="legal-intro">
      Der Schutz Ihrer persönlichen Daten ist uns wichtig. Diese Datenschutzerklärung informiert Sie
      darüber, welche Daten wir verarbeiten, auf welcher Rechtsgrundlage dies erfolgt und welche
      Rechte Ihnen zustehen.
    </p>

    <section class="legal-section">
      <h2>1. Verantwortliche Stelle</h2>
      <p>
        Verantwortlich im Sinne der DSGVO:<br /><br />
        [FULL NAME]<br />
        [STREET AND HOUSE NUMBER]<br />
        [POSTAL CODE] [CITY]<br />
        Deutschland<br /><br />
        E-Mail: <a href="mailto:[EMAIL]">[EMAIL]</a>
      </p>
    </section>

    <section class="legal-section">
      <h2>2. Welche Daten werden verarbeitet?</h2>
      <p>Wenn Sie Ihre Spotify-Streaming-Historie hochladen, verarbeiten wir folgende Daten:</p>
      <ul>
        <li><strong>Behalten:</strong> Titel, Künstler, Album, Zeitstempel, Wiedergabedauer, Shuffle- und Skip-Flags</li>
        <li>
          <strong>Pseudonymisiert:</strong> Ihr Spotify-Benutzername wird in Ihrem Browser zu einem
          SHA-256-Hash umgewandelt, bevor er unsere Server erreicht. Der Originalwert verlässt Ihr
          Gerät nie. Der Hash dient ausschließlich der Deduplizierung in anonymisierten
          Gemeinschaftsstatistiken.
        </li>
        <li>
          <strong>Nicht gespeichert / gelöscht:</strong> IP-Adresse, User-Agent, Offline-Zeitstempel,
          Inkognito-Flag — diese werden im Browser vor dem Upload entfernt.
        </li>
      </ul>
      <p>
        Es werden keine Konten angelegt. Zugang zu Ihren Daten erfolgt ausschließlich über einen
        einzigartigen, zufällig generierten Link (Share-Token).
      </p>
    </section>

    <section class="legal-section">
      <h2>3. Zweck und Rechtsgrundlage</h2>
      <p>
        <strong>Zweck:</strong> Visualisierung und Analyse Ihrer persönlichen Spotify-Hördaten sowie
        optionaler anonymisierter Vergleich mit Gemeinschaftsstatistiken.
      </p>
      <p>
        <strong>Rechtsgrundlage:</strong> Art. 6 Abs. 1 lit. a DSGVO (Einwilligung). Durch den
        bewussten Upload Ihrer Daten erklären Sie sich mit der Verarbeitung einverstanden. Die
        Einwilligung ist vollständig freiwillig. Sie können sie jederzeit widerrufen, indem Sie Ihre
        Daten über die Schaltfläche „Delete my data" im Dashboard löschen.
      </p>
    </section>

    <section class="legal-section">
      <h2>4. Speicherdauer</h2>
      <p>
        Ihre Daten werden automatisch nach <strong>30 Tagen</strong> gelöscht. Eine vorzeitige
        Löschung ist jederzeit über die Schaltfläche „Delete my data" im Dashboard möglich.
      </p>
    </section>

    <section class="legal-section">
      <h2>5. Weitergabe an Dritte</h2>
      <p>
        Es findet keine Weitergabe personenbezogener Daten an Dritte statt. Aggregierte,
        nicht personenbezogene Gemeinschaftsstatistiken (z. B. meistgehörte Künstler) werden auf
        dieser Website angezeigt, enthalten jedoch keinerlei Rückschlüsse auf einzelne Nutzer.
      </p>
    </section>

    <section class="legal-section">
      <h2>6. Hosting</h2>
      <p>
        Diese Website wird auf einem Server von <strong>Hetzner Online GmbH</strong>
        (Industriestr. 25, 91710 Gunzenhausen, Deutschland) gehostet. Die Server befinden sich in
        Deutschland. Hetzner verarbeitet Verbindungsdaten (IP-Adressen) gemäß ihrer eigenen
        <a href="https://www.hetzner.com/de/legal/privacy-policy" target="_blank" rel="noopener">Datenschutzerklärung</a>.
      </p>
    </section>

    <section class="legal-section">
      <h2>7. Ihre Rechte</h2>
      <p>Gemäß DSGVO stehen Ihnen folgende Rechte zu:</p>
      <ul>
        <li><strong>Auskunftsrecht</strong> (Art. 15 DSGVO): Sie können Auskunft über Ihre gespeicherten Daten verlangen.</li>
        <li><strong>Recht auf Berichtigung</strong> (Art. 16 DSGVO)</li>
        <li>
          <strong>Recht auf Löschung</strong> (Art. 17 DSGVO): Jederzeit über „Delete my data" im
          Dashboard oder per E-Mail-Anfrage.
        </li>
        <li><strong>Recht auf Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)</li>
        <li><strong>Recht auf Datenübertragbarkeit</strong> (Art. 20 DSGVO)</li>
        <li><strong>Widerspruchsrecht</strong> (Art. 21 DSGVO)</li>
      </ul>
      <p>
        Zur Ausübung Ihrer Rechte wenden Sie sich bitte an:
        <a href="mailto:[EMAIL]">[EMAIL]</a>
      </p>
    </section>

    <section class="legal-section">
      <h2>8. Beschwerderecht</h2>
      <p>
        Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die Verarbeitung
        Ihrer personenbezogenen Daten zu beschweren. Die zuständige Behörde richtet sich nach Ihrem
        Wohnsitz. Eine Liste aller deutschen Landesbehörden finden Sie beim
        <a href="https://www.bfdi.bund.de/DE/Infothek/Anschriften_Links/anschriften_links-node.html" target="_blank" rel="noopener">
          Bundesbeauftragten für den Datenschutz und die Informationsfreiheit (BfDI)
        </a>.
      </p>
    </section>

    <p class="legal-updated">Stand: {{ lastUpdated }}</p>
  </div>
</template>

<script setup lang="ts">
const lastUpdated = 'Februar 2026';
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

.legal-intro {
  color: var(--color-text-secondary);
  font-size: 0.95rem;
  line-height: 1.7;
}

.legal-section h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--color-text);
}

.legal-section p,
.legal-section li {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
  line-height: 1.7;
}

.legal-section ul {
  padding-left: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0.5rem 0;
}

.legal-section a {
  color: var(--color-primary);
  text-decoration: none;
}

.legal-section a:hover {
  text-decoration: underline;
}

.legal-updated {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  opacity: 0.6;
}
</style>
