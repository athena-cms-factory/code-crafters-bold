import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProject } from '../5-engine/core/factory.js';
import { deployProject } from '../5-engine/wizards/deploy-wizard.js';
import { loadEnv } from '../5-engine/env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runShowcase() {
    const root = path.resolve(__dirname);
    await loadEnv(path.join(root, '.env'));

    const showcase = [
        {
            name: 'bakkerij-warme-bloem',
            type: 'local-retail-basic',
            data: {
                winkel_info: [{
                    naam: "Ambachtelijke Bakkerij De Warme Bloem",
                    tagline: "Elke ochtend vers uit eigen oven.",
                    adres: "Bloemstraat 12, 9000 Gent",
                    openingsuren: "Ma-Za: 06:00 - 18:00, Zo: 07:00 - 13:00",
                    foto_hero: "https://images.unsplash.com/photo-1509440159596-0249088772ff?q=80&w=2072&auto=format&fit=crop"
                }],
                assortiment: [
                    { product: "Groot Ardeens Brood", prijs: "€3.20" },
                    { product: "Verse Croissants", prijs: "€1.10" },
                    { product: "Appelflap", prijs: "€1.80" },
                    { product: "Speltbrood", prijs: "€3.50" }
                ]
            }
        },
        {
            name: 'loodgieter-snel',
            type: 'buildflow-basic',
            data: {
                bedrijfs_info: [{
                    naam: "Loodgietersbedrijf Waterdicht & Snel",
                    specialisatie: "Snelle reparaties en installaties door heel Vlaanderen.",
                    foto_hero: "https://images.unsplash.com/photo-1581244276891-997995bc726b?q=80&w=2070&auto=format&fit=crop"
                }],
                diensten: [
                    { service: "Lekkage reparatie", omschrijving: "Wij sporen lekken op zonder breekwerk." },
                    { service: "Badkamer renovatie", omschrijving: "Van droom naar realiteit in 5 dagen." },
                    { service: "Ontstopping", omschrijving: "24/7 noodservice voor verstopte leidingen." }
                ]
            }
        },
        {
            name: 'advocaat-justitia',
            type: 'legal-basic',
            data: {
                legal_info: [{
                    naam: "Advocatenkantoor Justitia & Co",
                    tagline: "Uw recht, onze missie.",
                    foto_hero: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?q=80&w=2070&auto=format&fit=crop"
                }],
                expertises: [
                    { domein: "Familierecht", omschrijving: "Begeleiding bij scheiding en bemiddeling." },
                    { domein: "Ondernemingsrecht", omschrijving: "Advies voor KMO's en zelfstandigen." },
                    { domein: "Strafrecht", omschrijving: "Verdediging met passie en integriteit." }
                ]
            }
        },
        {
            name: 'tuinservice-groen',
            type: 'greenmaster-basic',
            data: {
                bedrijfs_info: [{
                    naam: "Tuinservice De Groene Vingers",
                    tagline: "Uw droomtuin, onze passie.",
                    foto_hero: "https://images.unsplash.com/photo-1558904541-efa8c1965f1e?q=80&w=2070&auto=format&fit=crop"
                }],
                diensten: [
                    { dienst: "Tuinaanleg", omschrijving: "Van ontwerp tot beplanting." },
                    { dienst: "Onderhoud", omschrijving: "Periodiek snoeiwerk en gazonverzorging." },
                    { dienst: "Hekwerk", omschrijving: "Duurzame omheiningen in hout en metaal." }
                ]
            }
        },
        {
            name: 'kapsalon-trendy',
            type: 'kapper-basic',
            data: {
                salon_info: [{
                    naam: "Kapsalon Trendy Coupé",
                    tagline: "Kwaliteit voor een eerlijke prijs.",
                    openingsuren: "Di-Vr: 09:00-18:00, Za: 08:30-17:00",
                    foto_hero: "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=2074&auto=format&fit=crop"
                }],
                prijslijst: [
                    { dienst: "Wassen/Knippen/Drogen", prijs: "€28.00" },
                    { dienst: "Kleuring", prijs: "€45.00" },
                    { dienst: "Baard trimmen", prijs: "€15.00" }
                ]
            }
        },
        {
            name: 'bistro-smaakvol',
            type: 'restaurant-basic',
            data: {
                restaurant_info: [{
                    naam: "Bistro Smaakvol",
                    tagline: "Eerlijk eten, gezellige sfeer.",
                    adres: "Marktplein 4, Antwerpen",
                    foto_hero: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop"
                }],
                menukaart: [
                    { gerecht: "Steak Friet", prijs: "€22.50" },
                    { gerecht: "Zalmfilet op de huid", prijs: "€24.00" },
                    { gerecht: "Vegetarische Lasagne", prijs: "€18.00" }
                ]
            }
        },
        {
            name: 'schilder-kleurrijk',
            type: 'buildflow-basic',
            data: {
                bedrijfs_info: [{
                    naam: "Schilderwerken Kleurrijk",
                    specialisatie: "Uw woning in een nieuw jasje.",
                    foto_hero: "https://images.unsplash.com/photo-1589939705384-5185138a04b9?q=80&w=2070&auto=format&fit=crop"
                }],
                diensten: [
                    { service: "Binnenschilderwerk", omschrijving: "Muren, plafonds en deuren." },
                    { service: "Behangen", omschrijving: "Vliesbehang en decoratieve prints." },
                    { service: "Buitenschilderwerk", omschrijving: "Bescherming tegen weer en wind." }
                ]
            }
        },
        {
            name: 'tandarts-lach',
            type: 'dentist-basic',
            data: {
                praktijk_info: [{
                    naam: "Tandartspraktijk De Witte Lach",
                    tagline: "Zorgvuldig en pijnvrij.",
                    foto_hero: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?q=80&w=2070&auto=format&fit=crop"
                }],
                behandelingen: [
                    { behandeling: "Controle", omschrijving: "Halfjaarlijkse checkup." },
                    { behandeling: "Bleken", omschrijving: "Veilig voor een stralend gebit." },
                    { behandeling: "Implantaten", omschrijving: "Duurzame vervanging van tanden." }
                ]
            }
        },
        {
            name: 'architect-ruimte',
            type: 'agency-basic',
            data: {
                agency_info: [{
                    naam: "Architectenbureau Ruimtelijk",
                    tagline: "Van concept tot realisatie.",
                    foto_hero: "https://images.unsplash.com/photo-1487958449913-d92799018b38?q=80&w=2070&auto=format&fit=crop"
                }],
                diensten: [
                    { dienst: "Woningbouw", omschrijving: "Unieke ontwerpen voor moderne huizen." },
                    { dienst: "Renovatie", omschrijving: "Oude panden herstellen met respect." },
                    { dienst: "Interieur", omschrijving: "Optimalisatie van uw woonruimte." }
                ]
            }
        },
        {
            name: 'consult-strategie',
            type: 'basis-basic',
            data: {
                info: [{
                    naam: "Business Consulting Strategisch Advies",
                    tagline: "Wij helpen uw bedrijf groeien.",
                    foto_hero: "https://images.unsplash.com/photo-1454165833767-027ffea9e77b?q=80&w=2070&auto=format&fit=crop"
                }],
                expertises: [
                    { topic: "Efficiëntie", beschrijving: "Optimaliseren van processen." },
                    { topic: "Marketing", beschrijving: "Bereik uw doelgroep effectiever." },
                    { topic: "HR", beschrijving: "Bouw aan een sterker team." }
                ]
            }
        }
    ];

    console.log(`\n🚀 Start Athena Showcase Generation (10 sites)`);

    for (const site of showcase) {
        try {
            console.log(`\n--- [ ${site.name.toUpperCase()} ] ---`);
            
            // 1. Create Project
            await createProject({
                projectName: site.name,
                blueprintFile: `${site.type}/blueprint/${site.type}.json`,
                siteType: site.type,
                layoutName: 'standard',
                styleName: 'modern',
                siteModel: 'SPA',
                autoSheet: false
            });

            // 2. Inject Data
            const dataDir = path.join(root, 'sites', site.name, 'src/data');
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
            }

            for (const [table, content] of Object.entries(site.data)) {
                const filePath = path.join(dataDir, `${table}.json`);
                fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
                console.log(`   📝 Data geschreven naar ${table}.json`);
            }

            // 3. Deploy Project
            console.log(`   🚀 Deploying...`);
            await deployProject(site.name, "feat: showcase automated deployment");

            console.log(`   ✅ VOLTOOID: ${site.name}`);

        } catch (err) {
            console.error(`   ❌ FOUT bij ${site.name}: ${err.message}`);
        }
    }

    console.log(`\n✨ Showcase Generation voltooid!`);
}

runShowcase();
