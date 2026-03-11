import React from 'react';
import EditableMedia from './EditableMedia';
import EditableText from './EditableText';
import EditableLink from './EditableLink';

const Hero = ({ data, sectionName, features = {}, style = {} }) => {
    const hero = data[0];
    if (!hero) return null;

    const heroTitle = hero.titel || hero.hero_header || hero.site_naam;
    const hasSearchLinks = features.google_search_links;

    const getGoogleSearchUrl = (query) => {
        return `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + (features.search_context || ''))}`;
    };

    return (
        <section
            id="hero"
            data-dock-section={sectionName}
            className="relative w-full h-auto min-h-[var(--hero-height,85vh)] max-h-[var(--hero-max-height,150vh)] aspect-[var(--hero-aspect-ratio,16/9)] flex items-center justify-center overflow-hidden bg-[var(--color-hero-bg)]"
            style={style}
        >
            <div className="absolute inset-0 z-0">
                <EditableMedia
                    src={hero.hero_afbeelding || hero.foto_url}
                    cmsBind={{ file: sectionName, index: 0, key: hero.hero_afbeelding ? 'hero_afbeelding' : 'foto_url' }}
                    className="w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 z-20 pointer-events-none" style={{
                    backgroundImage: 'linear-gradient(to bottom, var(--hero-overlay-start, rgba(0,0,0,0.6)), var(--hero-overlay-end, rgba(0,0,0,0.6)))'
                }}></div>
            </div>
            <div className="relative z-10 text-center px-6 max-w-5xl">
                <h1 className="text-5xl md:text-8xl font-serif font-bold text-white mb-8 leading-tight drop-shadow-2xl">
                    <EditableText value={heroTitle} cmsBind={{ file: sectionName, index: 0, key: hero.titel ? 'titel' : (hero.hero_header ? 'hero_header' : 'site_naam') }} />
                </h1>
                <div className="h-2 w-32 bg-accent mx-auto mb-10 rounded-full shadow-lg shadow-accent/50"></div>
                <div className="flex flex-col items-center gap-12">
                    <p className="text-xl md:text-2xl text-white/90 max-w-3xl mx-auto leading-relaxed drop-shadow-lg font-light italic">
                        <EditableText value={hero.ondertitel || hero.introductie} cmsBind={{ file: sectionName, index: 0, key: hero.ondertitel ? 'ondertitel' : 'introductie' }} />
                    </p>
                    <div className="flex flex-wrap justify-center gap-4">
                        <EditableLink
                            as="button"
                            label={hero.cta_label || "Contact"}
                            url={hero.cta_url || "#contact"}
                            cmsBind={{ file: sectionName, index: 0, key: 'cta' }}
                            className="bg-[var(--color-button-bg)] text-white px-10 py-4 rounded-full text-xl font-bold shadow-2xl hover:opacity-90 transition-all transform hover:scale-105"
                            onClick={(e) => {
                                const url = hero.cta_url || "#contact";
                                if (url.startsWith('#')) {
                                    e.preventDefault();
                                    document.getElementById(url.substring(1))?.scrollIntoView({ behavior: 'smooth' });
                                }
                            }}
                        />
                        {hasSearchLinks && (
                            <a href={getGoogleSearchUrl(heroTitle)} target="_blank" rel="noopener noreferrer" className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-8 py-3 rounded-full backdrop-blur-md transition-all font-bold flex items-center gap-3 group">
                                <i className="fa-brands fa-google group-hover:text-accent transition-colors"></i>
                                Zoek meer inzichten
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default Hero;
