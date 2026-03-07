# Athena Conversion Guide: From Prototype to Production

Deze gids beschrijft de "mooie weg": het handmatig omzetten van een AI-gegenereerd prototype naar een robuust Athena Sitetype.

## Stappenplan

### 1. Voorbereiding
- Plaats je prototype (HTML/React) in `inputsites/[naam]`.
- Draai de `athenafier.js` om een basis blueprint, data-extractie en een `index.docked.html` te krijgen:
  ```bash
  node factory/5-engine/athenafier.js [naam]
  ```

### 2. Snel Deployen (De "Quick Wrap" weg)
Als je het prototype direct live wilt zien in de Athena Dock zonder componenten te herschrijven:
```bash
node factory/5-engine/deploy-prototype.js [naam]
```
Dit maakt een Vite-omgeving aan in `sites/[naam]-site` en registreert de site in de Dock.

### 3. De Sitetype Refactor (De "Mooie weg")
Ga naar `factory/3-sitetypes/docked/[naam]/web/standard/`.
Je moet hier de AI-code opsplitsen in Athena-logica.

### 3. De Gouden Prompt voor AI (Gemini/Claude)
Kopieer de code van je prototype en gebruik deze prompt om de Athena-componenten te genereren:

---
**PROMPT:**
"Ik heb een website prototype (zie code hieronder). Ik wil dit omzetten naar een Athena CMS Sitetype.
Geef me de code voor de volgende bestanden:

1. **Section.jsx**: Gebruik een loop over `data` om de verschillende secties te renderen. Zorg voor `data-dock-section` op de container en `data-dock-bind` (via de EditableText/EditableMedia wrappers) op de elementen.
2. **Header.jsx**: Maak een robuuste header die de eerste rij van de 'hero' tabel gebruikt.
3. **index.css**: Extraheer de specifieke Tailwind stijlen of custom CSS uit het prototype.

Hanteer de Athena conventies:
- Gebruik `import EditableText from './EditableText'`.
- Gebruik `import EditableMedia from './EditableMedia'`.
- Gebruik `import.meta.env.BASE_URL` voor alle paden.
- Zorg dat alles 'dockable' is."
---

### 4. Verificatie
Zodra de componenten in de `web/standard/` map staan, kun je een nieuwe site genereren via de dashboard of CLI:
```bash
node 6-utilities/generate-site.js [site-naam] [naam] docked
```
- Controleer of de site correct laadt in de Athena Dock.
- Test of wijzigingen in de Dock (of de Google Sheet) direct zichtbaar zijn.
