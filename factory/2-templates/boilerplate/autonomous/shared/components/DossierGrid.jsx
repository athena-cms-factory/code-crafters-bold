import React from 'react';

const DossierGrid = ({ title, items }) => {
  return (
    <section style={{ marginBottom: '4rem' }}>
      <h2 className="section-title" style={{ fontSize: '2rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span>📂</span> {title || "Projecten"}
      </h2>
      <div className="grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '2rem' }}>
        {items?.map((item, index) => (
          <div key={index} className="card" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '1.5rem', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s ease, border-color 0.2s ease' }}>
            {item.account && (
              <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 'bold', marginBottom: '0.5rem' }}>
                {item.account.toUpperCase()}
              </div>
            )}
            <h3 className="card-title" style={{ fontSize: '1.5rem', marginBottom: '0.75rem', color: '#fff' }}>
              {item.title}
            </h3>
            <p className="card-description" style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', flexGrow: 1 }}>
              {item.description}
            </p>
            {item.tags && (
              <div className="card-tags" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {item.tags.map((tag, i) => (
                  <span key={i} className="tag" style={{ backgroundColor: 'rgba(37, 99, 235, 0.1)', color: '#60a5fa', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.875rem', fontWeight: 500 }}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="btn" style={{ display: 'inline-block', backgroundColor: 'var(--primary)', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '8px', textDecoration: 'none', fontWeight: '600', textAlign: 'center', transition: 'background-color 0.2s' }}>
              Bekijk Project
            </a>
          </div>
        ))}
      </div>
    </section>
  );
};

export default DossierGrid;
