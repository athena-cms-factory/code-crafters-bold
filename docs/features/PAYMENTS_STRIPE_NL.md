# 💳 Handleiding: Betalingen via Stripe & E-mail

Deze gids legt uit hoe de betalingsintegratie in Athena werkt, zowel voor de beheerder (developer/eigenaar) als voor de eindklant.

---

## 1. De Developer/Eigenaar: Hoe ontvang ik geld?

Om effectief geld op je rekening te ontvangen, moet de Athena Factory gekoppeld worden aan je eigen **Stripe** account.

### Stap A: Stripe Account Voorbereiden
1. Ga naar [Stripe.com](https://stripe.com) en maak een account aan.
2. Volg de stapsgewijze verificatie van Stripe (identiteitsbewijs, bankrekening koppelen).
3. **Belangrijk:** Ga in je Stripe Dashboard naar **Instellingen > Betaalmethoden** en activeer daar:
   - Bancontact
   - iDEAL
   - PayPal (optioneel, vereist koppeling met PayPal zakelijk)
   - Apple Pay / Google Pay

### Stap B: API Sleutels Koppelen
1. Zoek in het Stripe Dashboard naar de **API Keys**. Je hebt er twee nodig:
   - `Publishable key` (begint met `pk_test_` of `pk_live_`)
   - `Secret key` (begint met `sk_test_` of `sk_live_`)
2. Open het bestand `factory/.env` op je systeem.
3. Vul de sleutels in:
   ```env
   STRIPE_SECRET_KEY=sk_live_...jouw_sleutel...
   STRIPE_PUBLISHABLE_KEY=pk_live_...jouw_sleutel...
   ```
4. Herstart het Athena Dashboard.

---

## 2. De Klant: Hoe verloopt het aankoopproces?

De klant heeft in de webshop twee manieren om te bestellen:

### Route 1: Automatisch via Stripe (Aanbevolen)
1. De klant klikt in het mandje op **Afrekenen**.
2. De klant ziet een grote knop **"Nu Betalen via Stripe"**.
3. Bij het klikken wordt de klant veilig doorgeleid naar de Stripe-omgeving (herkenbaar aan het slotje in de URL).
4. De klant kiest zijn methode (bijv. **Bancontact app/Payconiq**).
5. Na de betaling wordt de klant teruggestuurd naar een speciale "Bedankt" pagina op jouw site.
6. **Resultaat:** Het geld wordt door Stripe verwerkt en volgens jouw Stripe-schema (bijv. wekelijks) op je bankrekening gestort. Je ontvangt direct een e-mail van Stripe over de nieuwe betaling.

### Route 2: Handmatig via E-mail
1. De klant vult onderaan de checkout-pagina zijn gegevens in (Naam, Adres, etc.).
2. De klant klikt op **"Bestelling Bevestigen"**.
3. De website verstuurt op de achtergrond een gedetailleerde e-mail naar jou (via de Athena Gateway).
4. De klant krijgt een melding: *"Bedankt! We nemen contact met je op voor de betaling."*
5. **Resultaat:** Jij ontvangt de bestellijst in je mailbox en moet zelf een factuur of betaallink sturen. Dit is ideaal voor B2B of speciale wensen.

---

## 3. Veiligheid & Privacy

- **Geen Opslag:** De Athena Factory slaat *geen* creditcardgegevens op. Alles verloopt via de beveiligde servers van Stripe.
- **Privacy:** Klantgegevens voor e-mailbestellingen worden direct doorgestuurd en niet bewaard in een publiek toegankelijke database.
- **Test Modus:** Je kunt eerst testen door de Stripe `test keys` te gebruiken. Je kunt dan "betalen" met test-kaarten van Stripe om te zien of alles werkt.

---

## 4. Problemen Oplossen

- **Klant ziet geen Bancontact:** Controleer in je Stripe Dashboard onder 'Settings > Payment Methods' of Bancontact is geactiveerd voor jouw regio.
- **Betaling lukt niet:** Controleer of de `STRIPE_SECRET_KEY` in de `.env` exact overeenkomt met de sleutel in je dashboard.
- **Dashboard Fout:** Zorg dat het Athena Dashboard (./athena.sh) draait, aangezien de websites dit dashboard gebruiken als veilige poort naar Stripe.
