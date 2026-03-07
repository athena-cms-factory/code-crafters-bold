# Beveiliging en Evaluatie (Athena v7.9.2)

Dit document combineert een diepgaande evaluatie van de beveiligingsarchitectuur van de Athena CMS Factory met een praktische checklist voor ondernemers.

## DEEL 1: BEVEILIGINGSEVALUATIE - HET SHEETS-MANAGED MODEL

De Athena architectuur biedt een fundamenteel veiliger model dan traditionele Content Management Systemen (CMS) zoals WordPress.

### 1. Verkleining van het Aanvalsoppervlak

De belangrijkste veiligheidswinst van Athena ligt in de overgang van een dynamische naar een statische architectuur.

*   **WordPress/PHP:** Draait actieve code op de server die communiceert met een SQL-database. Elke plugin en het kernsysteem zelf zijn potentiële doelwitten voor exploits.
*   **Athena (React 19):** De openbare website bestaat uit statische HTML, CSS en JavaScript. Er draait **geen database-engine** en **geen server-side scripttaal** op de webserver.
*   **Resultaat:** SQL-injecties en Cross-Site Scripting (XSS) op serverniveau zijn technisch onmogelijk.

### 2. Identity & Access Management (IAM)

Athena delegeert de backend-beveiliging volledig aan de robuuste infrastructuur van Google.

*   **Authenticatie:** In plaats van een eigen (vaak zwak) inlogsysteem, gebruikt Athena Google-accounts.
*   **Voordeel:** Klanten profiteren direct van Google's miljardeninvesteringen in cybersecurity, inclusief multi-factor authenticatie (MFA) en geavanceerde brute-force beveiliging.

### 3. Data-integriteit & Sanitisatie

*   **Output Escaping:** Athena's React engine "escapes" automatisch alle data die uit de Google Sheet komt. Tekst in een cel wordt door de browser altijd als tekst behandeld, nooit als uitvoerbare code.
*   **Validatie tijdens Bouw:** Omdat data wordt opgehaald en geconverteerd tijdens het bouwproces (via `AthenaDataManager`), fungeert de 5-engine als een extra filterlaag tussen de bron (Sheet) en de eindgebruiker.

### 4. Vergelijking Bedreigingsprofiel

| Bedreiging | Traditioneel CMS (WP) | Athena (Sheets-managed) |
| :--- | :--- | :--- |
| **SQL Injectie** | Hoog risico | **Onmogelijk** |
| **Brute Force Login** | Zeer frequent doelwit | **Nihil** (Google Auth) |
| **Plugin Kwetsbaarheid** | 90% van alle incidenten | **Nihil** (Geen plugins op site) |
| **Zero-day Exploits** | Wekelijks onderhoud nodig | **Nihil** (Statisch veroudert niet) |
| **Data Ransomware** | Server ransomware mogelijk | **Laag** (Cloud versiebeheer) |

---

## DEEL 2: BEVEILIGINGSCHECKLIST VOOR ONDERNEMERS

Hoewel de Athena Factory technisch inherent veilig is, blijft de menselijke factor cruciaal. Gebruik deze checklist om uw Google Sheets CMS optimaal te beveiligen.

### 1. Toegang tot de Google Sheet

*   [ ] **Geen Publieke Deling:** Zorg dat de Sheet **NOOIT** is ingesteld op "Iedereen met de link kan bewerken".
*   [ ] **Specifieke Rechten:** Deel de Sheet alleen met noodzakelijke personen via hun e-mailadres.
*   [ ] **Service Account:** Gebruik bij voorkeur de Athena Service Account methode voor data-sync, zodat de Sheet volledig privé kan blijven.
*   [ ] **Regelmatige Schoonmaak:** Controleer elke 3 maanden wie toegang heeft tot uw Sheets en verwijder oud-medewerkers.

### 2. Google Account Beveiliging (De Backend)

Omdat uw Google Sheet uw CMS is, is uw Google-account de sleutel tot uw website.

*   [ ] **Multi-Factor Authenticatie (MFA):** Schakel 2-staps verificatie in op alle Google-accounts die toegang hebben tot de Sheet.
*   [ ] **Sterke Wachtwoorden:** Gebruik een uniek en complex wachtwoord voor uw Google beheeraccount.

### 3. Data & Privacy (AVG/GDPR)

*   [ ] **Geen Gevoelige Persoonsgegevens:** Gebruik de Sheet voor productinfo, prijzen en publieke content. Sla **geen** medische dossiers, wachtwoorden of creditcardgegevens op in de cellen.
*   [ ] **Privacyverklaring:** Vermeld in uw privacyverklaring dat website-inhoud wordt beheerd via Google Cloud infrastructuur.

### 4. Incident Management

*   [ ] **Versiegeschiedenis:** Maak uzelf vertrouwd met "Versiegeschiedenis" in Google Sheets. Als data per ongeluk wordt verwijderd, kunt u een back-up in seconden herstellen.
*   [ ] **Offline Back-up:** Download periodiek een export (XLSX of CSV) van uw belangrijkste data.

---
*Door deze stappen te volgen, maakt u optimaal gebruik van Athena's veilige architectuur en minimaliseert u operationele risico's.*
