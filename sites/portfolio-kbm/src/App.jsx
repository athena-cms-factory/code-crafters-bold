import React from 'react';
import './index.css';

// Components
const Hero = ({ data }) => {
  const heroData = data.hero?.[0] || {
    title: "Developer Dossier: Karel",
    subtitle: "Een compleet overzicht van alle software-projecten en repositories ontwikkeld tijdens het re-integratietraject."
  };
  
  return (
    <header data-dock-type="hero" data-dock-id="0">
      <div className="badge">Fase 1: Inventarisatie & Overzicht</div>
      <h1 className="hero-title" data-dock-id="title">{heroData.title}</h1>
      <p className="hero-subtitle" data-dock-id="subtitle">
        {heroData.subtitle}
      </p>
    </header>
  );
};

const Projects = ({ data }) => {
  const projects = data.projects || [];
  const aboutMe = data.about_me?.[0] || { title: "Belangrijkste Repositories", text: "53 projecten op GitHub" };

  return (
    <section>
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem'}}>
        <h2 className="section-title" style={{margin: 0}} data-dock-type="about_me" data-dock-id="0">
          <span data-dock-id="title">📂 {aboutMe.title}</span>
        </h2>
        <span style={{color: 'var(--text-muted)'}}>{aboutMe.text}</span>
      </div>
      
      <div className="grid">
        {projects.map((repo, index) => (
          <div key={index} className="card" data-dock-type="projects" data-dock-id={index}>
            <div style={{fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem'}}>
              GITHUB REPO
            </div>
            <h3 className="card-title" data-dock-id="title">{repo.title}</h3>
            <p className="card-description" data-dock-id="text">{repo.text || "Geen beschrijving beschikbaar."}</p>
            {repo.link && (
              <a href={repo.link} target="_blank" rel="noopener noreferrer" className="btn">
                Bekijk Code
              </a>
            )}
          </div>
        ))}
      </div>
    </section>
  );
};

const Phase2 = ({ data }) => {
  const services = data.services || [];
  const contact = data.contact?.[0] || { title: "Fase 2: Athena CMS Integratie", text: "In de volgende fase van dit dossier zullen we de Athena CMS Factory inzetten." };

  return (
    <section style={{marginTop: '4rem'}}>
      <h2 className="section-title" data-dock-type="contact" data-dock-id="0">
        <span data-dock-id="title">🚀 {contact.title}</span>
      </h2>
      <div className="card" style={{borderLeft: '4px solid var(--primary)'}}>
        <h3 data-dock-id="text">{contact.text}</h3>
        <ul style={{marginLeft: '1.5rem', marginTop: '1rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.5rem'}}>
          {services.map((service, index) => (
            <li key={index} data-dock-type="services" data-dock-id={index}>
              <strong data-dock-id="title">{service.title}</strong>: <span data-dock-id="text">{service.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer>
      <p>&copy; 2026 Karel - Re-integratie Project</p>
      <p style={{fontSize: '0.8rem', marginTop: '1rem', color: 'var(--text-muted)'}}>
        Gegenereerd op basis van live GitHub data van KarelTestSpecial & athenacmsfactory.
      </p>
    </footer>
  );
};

function App({ data }) {
  if (!data) return <div>Laden...</div>;

  return (
    <div className="container">
      <Hero data={data} />
      <Projects data={data} />
      <Phase2 data={data} />
      <Footer />
    </div>
  );
}

export default App;