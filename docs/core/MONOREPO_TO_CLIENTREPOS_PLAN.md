# 🚀 IMPLEMENTED WORKFLOW: Monorepo to Client Repositories

Dit document beschrijft de *geïmplementeerde* workflow voor het automatisch distribueren van individuele websites vanuit deze Monorepo naar hun eigen klant-repositories. Deze workflow is een fundament voor professionele groei en financiële onafhankelijkheid.

## 🎯 De Doelstelling
Elke site in `sites/[naam]` krijgt een eigen "leven" in een unieke GitHub repository, primair binnen de `athena-cms-factory` organisatie (bijv. `athena-cms-factory/[naam]`). Dit zorgt voor een professionele uitstraling naar klanten en een vlekkeloze publicatie op GitHub Pages.

## 📈 De Workflow (Geautomatiseerde Distributie)

1. **Centrale Ontwikkeling:** Alle sites worden beheerd in de Athena Monorepo.
2. **Geautomatiseerde Distributie:** Via de GitHub Action (`.github/workflows/athena-publisher.yml`) wordt elke verandering in een specifieke site-map automatisch "doorverwezen" naar zijn eigen repository binnen de `athena-cms-factory` organisatie.
3. **Klant-Oplevering:** De klant ziet alleen de code van hun eigen site, wat vertrouwen en kwaliteit uitstraalt.

## 🛠️ Technische Uitvoering

We gebruiken de `git subtree push` methodiek binnen een GitHub Action (`.github/workflows/athena-publisher.yml`).

### Workflow Voorbeeld:
```yaml
name: 🔱 Athena Monorepo Publisher
on:
  push:
    paths:
      - 'sites/**'
    branches:
      - main

jobs:
  publish:
    runs-on: ubuntu-latest
    if: github.repository == 'athenacmsfactory/athena-cms-monorepo'
    steps:
      - name: 🛰️ Checkout Monorepo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.ATHENA_DEPLOY_TOKEN }}

      - name: 🔍 Detect Changed Sites
        id: detect
        run: |
          CHANGED_SITES=$(git diff --name-only ${{ github.event.before }} ${{ github.event.after }} | grep '^sites/' | cut -d/ -f2 | sort -u | xargs)
          echo "sites=$CHANGED_SITES" >> $GITHUB_OUTPUT

      - name: 🚀 Push Subtrees to Client Repos
        env:
          GITHUB_TOKEN: ${{ secrets.ATHENA_DEPLOY_TOKEN }}
          API_TOKEN_GITHUB: ${{ secrets.ATHENA_DEPLOY_TOKEN }}
          OWNER: "athena-cms-factory" # Nu gericht op de organisatie
        run: |
          for SITE in ${{ steps.detect.outputs.sites }}; do
            # ... (logica om repo aan te maken en subtree te pushen)
          done
```
---
*Gebouwd op vakmanschap, gericht op herstel en gedreven door succes.*
*Gemaakt op 1 februari 2026 door Gemini-CLI.*


## 📦 Submappen publiceren als zelfstandige GitHub-repo

Om een submap van je monorepo (bijv. `sites/site-a`) te publiceren als een zelfstandige GitHub-repo zonder submodules te gebruiken, zijn er drie gangbare methodes. De beste keuze hangt af van of je dit eenmalig wilt doen of dat de twee repositories continu synchroon moeten blijven.

### 1. De "Geadvanceerde" Manier: GitHub Actions (Automatisering)
Dit is de meest professionele oplossing voor een monorepo. Telkens als je een wijziging pusht naar je monorepo, zorgt een script ervoor dat de relevante submap naar de aparte repository wordt "gekopieerd".

Je kunt hiervoor een populaire Action gebruiken zoals `cpina/github-action-push-to-another-repository`.

**Voorbeeld workflow bestand (`.github/workflows/publish-site-a.yml`):**
```yaml
name: Publish Site A

on:
  push:
    branches: [ main ]
    paths: [ 'sites/site-a/**' ] # Alleen draaien als er iets in deze map verandert

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Pushes to another repository
        uses: cpina/github-action-push-to-another-repository@main
        env:
          API_TOKEN_GITHUB: ${{ secrets.AUTO_PUBLISH_TOKEN }}
        with:
          source-directory: 'sites/site-a'
          destination-github-username: 'athena-cms-factory'
          destination-repository-name: 'site-a-standalone'
          user-email: info@jouw-site.nl
          target-branch: main
```
*   **Voordeel:** Volledig automatisch. De losse repo is altijd up-to-date.
*   **Nodig:** Een *Personal Access Token (PAT)* met repo-rechten, opgeslagen in de Secrets van je monorepo.

---

### 2. De "Git-Native" Manier: `git subtree`
Git heeft een ingebouwde functie genaamd `subtree`. Hiermee kun je een map isoleren en naar een andere repo pushen zonder dat de hoofdrepo "vervuild" raakt met submodule-metadata.

**Stappenplan:**
1.  Voeg de losse repository toe als een remote:
    ```bash
    git remote add site-a-remote https://github.com/gebruikersnaam/site-a-standalone.git
    ```
2.  Push de specifieke map naar de losse repo:
    ```bash
    git subtree push --prefix sites/site-a site-a-remote main
    ```
*   **Voordeel:** Geen extra tools nodig, behoudt de commit-historie van die specifieke map.
*   **Nadeel:** Je moet dit commando handmatig uitvoeren (of in een script zetten) elke keer als je wilt updaten.

---

### 3. De "Clean Break" Manier: `git filter-repo`
Als je een map definitief wilt afsplitsen naar een nieuwe repo met behoud van historie (en alle andere bestanden wilt wissen), gebruik je `git filter-repo` (de moderne opvolger van `filter-branch`).

**Stappenplan:**
1.  Maak een **kopie** van je monorepo op je computer (belangrijk!).
2.  Run in die kopie:
    ```bash
    git filter-repo --subdirectory-filter sites/site-a/
    ```
3.  Nu bevat deze lokale map alleen nog de bestanden uit `site-a`, maar met de volledige historie.
4.  Koppel deze map aan een nieuwe GitHub repo en push.

*   **Voordeel:** Perfect voor eenmalige migraties of het opschonen van historie.
*   **Nadeel:** Niet bedoeld voor continu synchroniseren.

### Welke moet je kiezen?
*   Wil je dat **elke commit** in je monorepo direct zichtbaar is in de losse repo? Kies **Methode 1 (GitHub Actions)**.
*   Wil je af en toe **handmatig** een versie publiceren? Kies **Methode 2 (git subtree)**.
*   Wil je een project **permanent verhuizen** uit de monorepo naar een eigen plek? Kies **Methode 3 (filter-repo)**.