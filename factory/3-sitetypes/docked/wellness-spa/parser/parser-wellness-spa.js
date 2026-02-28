import { runParser } from '../../../../5-engine/core/parser-engine.js';

const customPrompt = `
Analyseer de input tekst voor een Wellness & Spa bedrijf.
Extracteer data voor de volgende tabellen:
- basis: Naam, tagline, adres, telefoon, email.
- services: Naam van de behandeling, beschrijving, prijs (getal), duur (bv. 60 min), afbeelding_url (of beschrijving van gewenste afbeelding).
- team: Naam, rol/specialisatie, bio, afbeelding_url.
- reviews: Naam klant, rating (1-5), commentaar.

Zorg dat prijzen pure getallen zijn zonder valutasymbool.
`;

runParser('wellness-spa.json', customPrompt);
