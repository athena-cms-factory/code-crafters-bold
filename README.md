# 🔱 Athena CMS Factory (v7.9.2 - Sandbox)

Welkom bij de Athena CMS Factory, een geavanceerde monorepo voor het genereren en beheren van React 19 + Tailwind v4 websites. Deze omgeving is geoptimaliseerd voor Chromebook hardware (Debian 12) en maakt intensief gebruik van AI-delegatie.

## 🚀 Snel aan de slag

### 1. Servers opstarten
Gebruik de nieuwe geconsolideerde launcher:
```bash
./launch.sh
```
*Dit start het Dashboard (poort 5001), het Dock (poort 5002) en de door jou gekozen site (poort 5000).*

### 2. Dashboard Toegang
Open je browser op: `http://localhost:5001`

---

## 🏛️ Kern Architectuur

Het systeem is opgebouwd uit drie hoofdonderdelen die naadloos samenwerken:

1.  **Factory (Backend)**: De motor die nieuwe sites bouwt op basis van Blauwdrukken (SiteTypes) en Data Bronnen.
2.  **Dock (Visual Editor)**: Een real-time editor die via `postMessage` communiceert met de sites in een iframe.
3.  **Sites**: Onafhankelijke React applicaties die direct naar GitHub Pages gepusht kunnen worden.

---

## ⚙️ Systeembeheer (Nieuw in v7.9)

We hebben het beheer van de sandbox gecentraliseerd voor maximale stabiliteit:

### 📡 Centralized Config (`ConfigManager`)
Alle poorten en paden worden nu beheerd vanuit `factory/5-engine/lib/ConfigManager.js`. 
- Geen hardcoded poorten meer in frontend of shell scripts.
- Wijzig poorten eenvoudig in de `.env` of de ConfigManager.

### 🔄 Intelligent Process Management (`ProcessManager`)
Processen worden niet meer "bruut" gekilled op poortnummer alleen.
- Actieve processen worden getracked in `factory/config/active-processes.json`.
- Gebruik `node factory/cli/pm-cli.js list` voor status.
- Gebruik `node factory/cli/pm-cli.js stop-all` voor een schone afsluiting.

### 🧹 Logbeheer (`LogManager`)
Logs worden automatisch geroteerd om schijfruimte te besparen.
- Beheer logs via de **Systeem Onderhoud** knop in het Dashboard.
- Standaard worden alleen de laatste 5 logs per type bewaard.

---

## 🧙‍♂️ AI Delegatie (Jules & Antigravity)

Deze repo is ontworpen om samen te werken met Google AI Agents:
- **Jules**: Gebruik `/jules` voor complexe refactoring taken (zoals de Data Sync of Asset Scavenger upgrades).
- **Antigravity**: De agentic IDE die volledige browser-checks kan uitvoeren om de UI te valideren.

---

## 🧭 Ontwikkelingstips
- Gebruik altijd `pnpm` voor Node.js operaties.
- Houd de `factory/output/logs/` in de gaten bij fouten.
- Gebruik Conductor (`conductor/index.md`) om experimentele "tracks" bij te houden.

---
*Gemaakt voor en door de Athena Community - februari 2026*

### --- Betaalmethodes & Stripe ---
Zie factory/docs/PAYMENTS_STRIPE_NL.md voor de volledige handleiding.
