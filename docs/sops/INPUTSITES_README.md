# Athena inputsites

Dit is de 'drop-zone' voor extern gegenereerde websites (bv. van v0.dev, Bolt.new, of handgemaakte prototypes).

## De Twee Wegen naar Athena

### 1. De Quick Wrap (Geautomatiseerd)
Gebruik de `athenafier.js` om de site direct te 'docken'.
- **Commando:** `node factory/5-engine/athenafier.js [site-naam]`
- **Resultaat:** Een `dock-map.json` en een gegenereerd sitetype. De AI probeert de bestaande HTML te behouden en alleen tags te injecteren.
- **Wanneer:** Voor snelle demo's of zeer complexe, unieke ontwerpen.

### 2. De Athena Standard (Handmatig / Kwalitatief)
Zet de AI-site om naar echte Athena-componenten (`Section.jsx`, `Header.jsx`).
- **Handleiding:** Zie [CONVERSION_GUIDE.md](./CONVERSION_GUIDE.md)
- **Wanneer:** Voor productie-sites die langdurig beheer nodig hebben via de Google Sheet.
