import React from 'react';
import EditableMedia from './EditableMedia';
import EditableText from './EditableText';
import EditableLink from './EditableLink';

const CTA = ({ data, sectionName }) => {
    if (!data || data.length === 0) return null;
    const item = data[0];
    const titelKey = Object.keys(item).find(k => /titel|header/i.test(k)) || 'titel';
    const tekstKey = Object.keys(item).find(k => /tekst|beschrijving/i.test(k)) || 'tekst';
    const btnKey = Object.keys(item).find(k => /knop|label|button/i.test(k)) || 'knop_label';
    const urlKey = Object.keys(item).find(k => /url|link/i.test(k)) || 'knop_url';
    const bgKey = Object.keys(item).find(k => /achtergrond|foto|image/i.test(k));

    return (
        <section id={sectionName} data-dock-section={sectionName} className="py-32 px-6 relative overflow-hidden flex items-center justify-center text-center">
            {bgKey && item[bgKey] ? (
                <div className="absolute inset-0 z-0">
                    <EditableMedia src={item[bgKey]} cmsBind={{ file: sectionName, index: 0, key: bgKey }} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-primary/80 mix-blend-multiply"></div>
                </div>
            ) : (
                <div className="absolute inset-0 bg-[var(--color-primary)] z-0"></div>
            )}

            <div className="relative z-10 max-w-4xl mx-auto text-white">
                <h2 className="text-4xl md:text-6xl font-serif font-bold mb-8 leading-tight">
                    <EditableText value={item[titelKey]} cmsBind={{ file: sectionName, index: 0, key: titelKey }} />
                </h2>
                {tekstKey && (
                    <p className="text-xl md:text-2xl text-white/90 mb-12 max-w-2xl mx-auto leading-relaxed">
                        <EditableText value={item[tekstKey]} cmsBind={{ file: sectionName, index: 0, key: tekstKey }} />
                    </p>
                )}
                <EditableLink
                    label={item[btnKey] || "Start Nu"}
                    url={item[urlKey] || "#contact"}
                    table={sectionName}
                    field="link"
                    id={0}
                    className="bg-white text-primary px-12 py-5 rounded-full text-xl font-bold shadow-2xl hover:bg-accent hover:text-white transition-all transform hover:scale-105 inline-block"
                />
            </div>
        </section>
    );
};

export default CTA;
