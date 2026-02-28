import React from 'react';

const DossierHero = ({ badge, title, subtitle }) => {
  return (
    <header className="dossier-header" style={{ padding: '4rem 0', borderBottom: '1px solid var(--border-color)', marginBottom: '4rem' }}>
      <div className="badge" style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', padding: '0.2rem 0.5rem', borderRadius: '4px', background: '#059669', color: 'white', marginBottom: '0.5rem', display: 'inline-block' }}>
        {badge || "Geverifieerd Dossier"}
      </div>
      <h1 className="hero-title" style={{ fontSize: '3.5rem', fontWeight: '800', marginBottom: '1rem', background: 'linear-gradient(to right, #60a5fa, #2563eb)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        {title}
      </h1>
      <p className="hero-subtitle" style={{ fontSize: '1.25rem', color: 'var(--text-muted)', maxWidth: '700px' }}>
        {subtitle}
      </p>
    </header>
  );
};

export default DossierHero;
