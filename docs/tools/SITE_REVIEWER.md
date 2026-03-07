# Athena Site Reviewer - Handleiding (v1.0)

De **Site Reviewer** is een interactieve tool waarmee je razendsnel door je volledige portfolio van gegenereerde sites kunt bladeren. Het automatiseert het installeren van dependencies en het opstarten van de development servers, zodat jij je kunt focussen op de visuele controle.

## 🚀 Opstarten
De Site Reviewer is geïntegreerd in het Athena Dashboard en geforceerd ingesteld op de Linux-omgeving van je Chromebook.

1.  Open de terminal in de project root.
2.  Voer de launcher uit:
    ```bash
    bash factory/athena.sh
    ```
3.  Er opent automatisch een **Linux Chrome** venster op: `http://localhost:5001/reviewer.html`.

## 🛠️ Functionaliteiten
- **Automatische Preview**: Klik op een site in de lijst aan de linkerkant. Het systeem controleert of `node_modules` aanwezig zijn (installeert ze zo nodig) en start de server.
- **Resource Management**: Bij het laden van een nieuwe site wordt de vorige site-server automatisch gestopt om RAM en CPU te besparen.
- **Snelle Navigatie**: Gebruik de **[Volgende]** en **[Vorige]** knoppen om systematisch je sites te controleren.
- **Dock Integratie**: Zie je een foutje? Klik op **[Open in Dock]** om de site direct in de editor te laden.

## 🔍 Bulk Audit Utility
Voor een snelle technische check van alle sites kun je het audit-script draaien:
```bash
node factory/6-utilities/bulk-site-audit.js
```
Dit genereert een rapport in `output/SITES_AUDIT_REPORT.md` met de status van alle 35+ sites (o.a. ontbrekende bestanden of corrupte JSON).

## 🛡️ Stabiliteit
De Site Reviewer (v8.0.5) bevat specifieke fixes voor `EPIPE` crashes en poort-conflicten. Het dashboard zelf draait altijd op poort **5001** en wordt beveiligd tegen onbedoeld afsluiten tijdens de review-cyclus.
