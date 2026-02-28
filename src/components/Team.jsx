import React from 'react';
import EditableMedia from './EditableMedia';
import EditableText from './EditableText';

const Team = ({ data, sectionName }) => {
    if (!data || data.length === 0) return null;

    return (
        <section id={sectionName} data-dock-section={sectionName} className="py-24 px-6 bg-white">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold text-primary mb-4 capitalize">{sectionName.replace(/_/g, ' ')}</h2>
                    <div className="h-1 w-20 bg-accent mx-auto rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
                    {data.map((item, index) => {
                        const naamKey = Object.keys(item).find(k => /naam/i.test(k)) || 'naam';
                        const rolKey = Object.keys(item).find(k => /rol|functie/i.test(k)) || 'rol';
                        const bioKey = Object.keys(item).find(k => /tekst|bio|beschrijving/i.test(k)) || 'bio';
                        const imgKey = Object.keys(item).find(k => /foto|afbeelding/i.test(k)) || 'foto';

                        return (
                            <div key={index} className="flex flex-col items-center text-center group">
                                <div className="w-48 h-48 rounded-full overflow-hidden mb-6 border-4 border-white shadow-2xl group-hover:scale-105 transition-transform duration-300 ring-4 ring-transparent hover:ring-accent/30 relative">
                                    <EditableMedia src={item[imgKey]} cmsBind={{ file: sectionName, index, key: imgKey }} className="w-full h-full object-cover" />
                                </div>
                                <h3 className="text-xl font-bold text-primary mb-1">
                                    <EditableText value={item[naamKey]} cmsBind={{ file: sectionName, index, key: naamKey }} />
                                </h3>
                                <div className="text-sm font-bold text-accent uppercase tracking-widest mb-4">
                                    <EditableText value={item[rolKey]} cmsBind={{ file: sectionName, index, key: rolKey }} />
                                </div>
                                {bioKey && (
                                    <p className="text-slate-600 text-sm leading-relaxed max-w-xs mx-auto">
                                        <EditableText value={item[bioKey]} cmsBind={{ file: sectionName, index, key: bioKey }} />
                                    </p>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Team;
