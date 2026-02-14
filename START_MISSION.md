# 🚀 Athena Sandbox Mission: Audit, Refactor & Jules-MCP Experimentation

## 🎯 Doelstelling
Deze sandbox is een volledig onafhankelijke kopie van Athena 2, bedoeld voor diepgaande doorlichting, grootschalige refactoring en het testen van geavanceerde delegatie-workflows met Jules (via MCP).

## 🛠️ Onmiddellijke Acties (Startprompt voor de volgende sessie)
Kopieer en plak de onderstaande tekst in je eerste prompt nadat je de Gemini CLI hebt opgestart in deze map:

---

**STARTPROMPT:**
"Ik ben nu in de Athena Sandbox (/home/kareltestspecial/ath/athena-sandbox). Dit is een veilige experimentele omgeving. Voer de volgende stappen uit:

1. **Audit:** Gebruik de 'codebase_investigator' om het volledige project door te lichten. Focus op architecturale inconsistenties, verouderde logica in 'factory/5-engine' en kansen voor optimalisatie. Sla dit op als 'MISSION_AUDIT_REPORT.md'.
2. **Conductor Setup:** Initialiseer de Conductor omgeving in deze sandbox met '/conductor:setup' als dat nog niet is gebeurd, zodat we tracks kunnen bijhouden voor de experimenten.
3. **Jules MCP Delegatie:** Identificeer een complexe refactoring taak (bijv. het standaardiseren van alle 'sync-*' scripts of het upgraden van de thema-engine) en gebruik de '/jules' opdracht om deze taak te delegeren naar jules.google.com.
4. **Isolatie Check:** Verifieer dat alle configuraties (poorten in .env, site-ports.json) gescheiden zijn van de productie-omgeving om conflicten te voorkomen."

---

## 🧭 Richtlijnen voor de Agent
- **Wees dapper:** Dit is een sandbox. Grote wijzigingen zijn toegestaan.
- **Documenteer alles:** Houd de Conductor tracks nauwgezet bij.
- **Gebruik Jules:** Test de limieten van wat Jules kan afhandelen versus wat de lokale agent doet.
- **Efficiëntie:** Gebruik 'pnpm' en houd rekening met de RAM/CPU beperkingen van de Chromebook.

*Datum van creatie: Zaterdag 14 februari 2026*
