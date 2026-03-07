# Gids voor Beeldmateriaal Generatie (v7.9.2)

De door AI gegenereerde Unsplash-links zijn soms onbetrouwbaar (404-fouten). Deze gids helpt u om zelf afbeeldingen van hoge kwaliteit te genereren met AI-tools zoals **Google Antigravity Image Generator** of **DALL-E**.

## 📋 Hoe werkt het?

### Stap 1: Identificeer welke afbeeldingen u nodig heeft

Kijk in de `src/data/` map van uw site (bijv. `de-kaas-boerderij`). Elk JSON-bestand bevat items die een afbeelding vereisen.

**Voorbeeld:** `customer_interaction.json`
```json
{
  "title": "Absoluut de beste Polderkaas!",
  "customer_name": "Suzanne W.",
  "interaction_type": "Review"
}
```

### Stap 2: Genereer een Geschikte Prompt

Gebruik voor elk item deze formule:

```
Professional product photography of [SUBJECT], [STYLE], [ATMOSPHERE], high quality, 4k
```

**Voorbeelden per Niche:**

#### 🧀 Kaaswinkel
- **Voor een product:**
  ```
  Professional food photography of artisanal aged cheese on wooden board, rustic Dutch farmhouse style, warm natural lighting, shallow depth of field, high quality, 4k
  ```
- **Voor een sfeerfoto:**
  ```
  Cozy cheese tasting scene in rustic cellar, warm candlelight, wooden shelves with aging cheese wheels in background, inviting atmosphere, high quality, 4k
  ```

#### 🏛️ Advocatenkantoor
- **Voor een medewerker:**
  ```
  Professional corporate headshot of confident lawyer in modern office, natural window lighting, neutral background, business attire, high quality, 4k
  ```

#### 🏗️ Architect
- **Voor een project:**
  ```
  Modern architectural exterior photography, contemporary building design, clean lines, golden hour lighting, professional real estate photography, high quality, 4k
  ```

### Stap 3: Genereer de Afbeelding

1. **Open Google Antigravity Image Generator** of een andere AI-imagetool.
2. Plak de prompt.
3. Genereer de afbeelding.
4. Download als `.jpg` of `.webp`.

### Stap 4: Plaats de Afbeelding in Uw Site

1. **Sla de afbeelding op** in: `sites/[SITE-NAAM]/public/images/`
2. **Geef het een duidelijke naam**, bijvoorbeeld: `kaas-polderkroon.jpg` of `review-suzanne.jpg`
3. **Update het JSON-bestand:**

```json
{
  "title": "Absoluut de beste Polderkaas!",
  "image_url": "kaas-polderkroon.jpg"  // Relatief pad, GEEN slash aan het begin
}
```

**Let op:** Gebruik **GEEN** slash (`/`) aan het begin. De code voegt automatisch `BASE_URL + 'images/'` toe.

## 🤖 Automatische Prompt Generator

Wilt u een script dat automatisch prompts genereert voor al uw data? De `ProcessManager` kan dit in toekomstige versies ondersteunen.

## 🔧 Probleemoplossing

### "Afbeelding laadt niet"
- Controleer of het bestand daadwerkelijk in `public/images/` staat.
- Controleer of de bestandsnaam **exact** overeenkomt (hoofdlettergevoelig!).
- Gebruik **geen** spaties in bestandsnamen (gebruik `-` of `_`).

### "Ik zie nog steeds placeholder.jpg"
- Ververs de pagina met `Ctrl+F5` (harde refresh).
- Controleer of het JSON-bestand correct is opgeslagen.

## 📊 Overzicht: Welke Sites Hebben Hoeveel Afbeeldingen Nodig?

Voer dit commando uit om te zien hoeveel afbeeldingen elke site vereist:

```bash
node 5-engine/count-images.js
```
