import React, { useState, useEffect } from 'react';
import EditableMedia from './EditableMedia';
import EditableText from './EditableText';
import EditableLink from './EditableLink';

const Section = ({ data }) => {
  const sectionOrder = data.section_order || [];
  const layoutSettings = data.layout_settings || {};
  const sectionSettings = data.section_settings || {};

  const iconMap = {
    'table': 'fa-table-columns',
    'zap': 'fa-bolt-lightning',
    'smartphone': 'fa-mobile-screen-button',
    'laptop': 'fa-laptop',
    'gear': 'fa-gear',
    'check': 'fa-circle-check',
    'star': 'fa-star',
    'globe': 'fa-globe',
    'users': 'fa-users',
    'rocket': 'fa-rocket'
  };

  useEffect(() => {
    if (window.athenaScan) {
      window.athenaScan(data);
    }
  }, [data, sectionOrder]);

  return (
    <div className="flex flex-col">
      {sectionOrder.filter(name => name !== 'site_settings').map((sectionName, idx) => {
        const items = data[sectionName] || [];
        if (items.length === 0) return null;

        const currentSettings = sectionSettings[sectionName] || {};
        const sectionBgColor = currentSettings.backgroundColor || null;
        const sectionStyle = sectionBgColor ? { backgroundColor: sectionBgColor } : {};
        const currentLayout = layoutSettings[sectionName] || 'list';

        // --- 1. HERO SECTION ---
        if (sectionName === 'basis' || sectionName === 'basis' || sectionName === 'hero') {
          const hero = items[0];
          const heroTitle = hero.title || hero.titel || hero.hero_header || hero.site_naam;
          const heroSubtitle = hero.subtitle || hero.ondertitel || hero.introductie;
          const imgKey = Object.keys(hero).find(k => /foto|afbeelding|url|image|img/i.test(k)) || 'image';

          return (
            <section
              key={idx}
              id="hero"
              data-dock-section={sectionName}
              className="relative w-full h-auto min-h-[var(--hero-height,85vh)] max-h-[var(--hero-max-height,150vh)] aspect-[var(--hero-aspect-ratio,16/9)] flex items-center justify-center overflow-hidden bg-[var(--color-hero-bg)] pt-24"
              style={sectionStyle}
            >
              <div className="absolute inset-0 z-0">
                <EditableMedia
                  src={hero[imgKey]}
                  cmsBind={{ file: sectionName, index: 0, key: imgKey }}
                  className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 z-20 pointer-events-none" style={{
                  backgroundImage: 'linear-gradient(to bottom, var(--hero-overlay-start, rgba(0,0,0,0.6)), var(--hero-overlay-end, rgba(0,0,0,0.6)))'
                }}></div>
              </div>
              <div className="relative z-10 text-center px-6 max-w-5xl">
                {!hero[imgKey] && <div className="h-2 w-32 bg-accent mx-auto mb-10 rounded-full shadow-lg shadow-accent/50"></div>}
                <h1 className="text-5xl md:text-8xl font-serif font-bold text-white mb-8 leading-tight drop-shadow-2xl">
                  <EditableText value={heroTitle} cmsBind={{ file: sectionName, index: 0, key: Object.keys(hero).find(k => k === 'title' || k === 'titel' || k === 'hero_header' || k === 'site_naam') || 'title' }} />
                </h1>
                <div className="flex flex-col items-center gap-12">
                  <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow-lg font-light italic">
                    <EditableText value={heroSubtitle} cmsBind={{ file: sectionName, index: 0, key: Object.keys(hero).find(k => k === 'subtitle' || k === 'ondertitel' || k === 'introductie') || 'subtitle' }} />
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <EditableLink
                      as="button"
                      label={hero.cta_text || hero.cta_label || "Contact"}
                      url={hero.cta_url || "#contact"}
                      cmsBind={{ file: sectionName, index: 0, key: hero.cta_text ? 'cta_text' : (hero.cta_label ? 'cta_label' : 'cta') }}
                      className="bg-[var(--color-button-bg)] text-white px-10 py-4 rounded-full text-xl font-bold shadow-2xl hover:opacity-90 transition-all transform hover:scale-105"
                      onClick={(e) => {
                        const url = hero.cta_url || "#contact";
                        if (url.startsWith('#')) {
                          e.preventDefault();
                          document.getElementById(url.substring(1))?.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
            </section>
          );
        }

        // --- 2. GENERIC SECTION (DEFAULT) ---
        return (
          <section key={idx} id={sectionName} data-dock-section={sectionName} className="py-24 px-6 bg-[var(--color-background)]" style={sectionStyle}>
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col items-center mb-16 text-center">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4 capitalize">
                  {sectionName.replace(/_/g, ' ')}
                </h2>
                <div className="h-1.5 w-24 bg-accent rounded-full"></div>
              </div>

              <div className={currentLayout === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12' : 'space-y-20'}>
                {items.map((item, index) => {
                  const titleKey = Object.keys(item).find(k => /naam|titel|onderwerp|header|title/i.test(k));
                  const textKeys = Object.keys(item).filter(k => k !== titleKey && !/foto|afbeelding|url|image|img|link|id|icon/i.test(k));
                  const imgKey = Object.keys(item).find(k => /foto|afbeelding|url|image|img/i.test(k));
                  const isEven = index % 2 === 0;

                  // --- GRID LAYOUT ---
                  if (currentLayout === 'grid') {
                    const iconClass = item.icon ? (iconMap[item.icon.toLowerCase()] || `fa-${item.icon.toLowerCase()}`) : null;
                    return (
                      <div key={index} className="flex flex-col items-center text-center bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 hover:shadow-2xl transition-all duration-300">
                        {iconClass && (
                          <div className="w-20 h-20 bg-accent/10 rounded-3xl flex items-center justify-center mb-8 text-accent text-4xl shadow-inner">
                            <i className={`fa-solid ${iconClass}`}></i>
                          </div>
                        )}
                        {titleKey && (
                          <h3 className="text-2xl font-bold text-primary mb-4 leading-tight">
                            <EditableText value={item[titleKey]} cmsBind={{ file: sectionName, index: index, key: titleKey }} />
                          </h3>
                        )}
                        {textKeys.map(tk => (
                          <div key={tk} className="text-slate-600 text-lg leading-relaxed line-clamp-4">
                            <EditableText value={item[tk]} cmsBind={{ file: sectionName, index: index, key: tk }} />
                          </div>
                        ))}
                      </div>
                    );
                  }

                  // --- LIST / ALTERNATING LAYOUT ---
                  return (
                    <div key={index} className={`flex flex-col items-center text-center ${currentLayout === 'list' ? '' : (isEven ? 'md:flex-row' : 'md:flex-row-reverse')} gap-12 md:gap-20`}>
                      {imgKey && item[imgKey] && (
                        <div className="w-full md:w-1/2 aspect-[4/3] rounded-[3rem] overflow-hidden shadow-2xl rotate-1 group hover:rotate-0 transition-transform duration-500 border-8 border-white">
                          <EditableMedia src={item[imgKey]} cmsBind={{ file: sectionName, index: index, key: imgKey }} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1">
                        {titleKey && (
                          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-8">
                            <h3 className="text-3xl font-serif font-bold text-primary leading-tight flex-1">
                              <EditableText value={item[titleKey]} cmsBind={{ file: sectionName, index: index, key: titleKey }} />
                            </h3>
                          </div>
                        )}
                        {textKeys.map(tk => (
                          <div key={tk} className="text-xl leading-relaxed text-slate-600 mb-6 font-light">
                            <EditableText value={item[tk]} cmsBind={{ file: sectionName, index: index, key: tk }} />
                          </div>
                        ))}
                        {(item.link || item.link_url) && (
                          <EditableLink
                            label={item.link || "Lees meer"}
                            url={item.link_url || item.link}
                            table={sectionName}
                            field="link"
                            id={index}
                            className="inline-flex items-center gap-2 text-accent font-bold hover:underline text-lg mt-4"
                          >
                            {typeof item.link === 'string' ? item.link : "Lees meer"} <i className="fa-solid fa-arrow-right text-sm ml-1"></i>
                          </EditableLink>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
};

export default Section;