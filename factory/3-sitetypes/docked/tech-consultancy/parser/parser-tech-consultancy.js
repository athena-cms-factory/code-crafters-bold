import { runParser } from '../../../../5-engine/core/parser-engine.js';

const customPrompt = `
Analyseer de input tekst voor een Technisch Consultancy bureau.
Extracteer data voor de volgende tabellen:
- basis: Naam, tagline, adres, telefoon, email.
- expertise: Titel van expertise, beschrijving, passend icoon (bv. 'code', 'cloud', 'security').
- projects: Klantnaam, project titel, samenvatting, resultaat, afbeelding_url.
- packages: Pakketnaam, features (lijst), prijs.

Zorg dat alle data gestructureerd is voor een zakelijke uitstraling.
`;

runParser('tech-consultancy.json', customPrompt);
