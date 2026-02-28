import React from 'react';
import EditableMedia from './EditableMedia';
import EditableText from './EditableText';

const Testimonials = ({ data, sectionName }) => {
    if (!data || data.length === 0) return null;

    return (
        <section id={sectionName} data-dock-section={sectionName} className="py-24 px-6 bg-slate-50">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold text-primary mb-4 capitalize">{sectionName.replace(/_/g, ' ')}</h2>
                    <div className="h-1 w-20 bg-accent mx-auto rounded-full"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {data.map((item, index) => {
                        const citaatKey = Object.keys(item).find(k => /tekst|quote|citaat|review/i.test(k)) || 'tekst';
                        const auteurKey = Object.keys(item).find(k => /naam|auteur|klant/i.test(k)) || 'naam';
                        const roleKey = Object.keys(item).find(k => /rol|functie|bedrijf/i.test(k)) || 'rol';
                        const imgKey = Object.keys(item).find(k => /foto|afbeelding/i.test(k));

                        return (
                            <div key={index} className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 flex flex-col relative">
                                <i className="fa-solid fa-quote-left text-4xl text-accent/20 mb-6 absolute top-8 left-8"></i>
                                <div className="mb-6 relative z-10 text-lg leading-relaxed text-slate-600 italic">
                                    "<EditableText value={item[citaatKey]} cmsBind={{ file: sectionName, index, key: citaatKey }} />"
                                </div>
                                <div className="mt-auto flex items-center gap-4 border-t border-slate-100 pt-6">
                                    {imgKey && item[imgKey] && (
                                        <div className="w-12 h-12 rounded-full overflow-hidden shadow-sm flex-shrink-0">
                                            <EditableMedia src={item[imgKey]} cmsBind={{ file: sectionName, index, key: imgKey }} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <div>
                                        <div className="font-bold text-primary">
                                            <EditableText value={item[auteurKey]} cmsBind={{ file: sectionName, index, key: auteurKey }} />
                                        </div>
                                        {roleKey && (
                                            <div className="text-sm text-accent font-semibold uppercase tracking-wider">
                                                <EditableText value={item[roleKey]} cmsBind={{ file: sectionName, index, key: roleKey }} />
                                            </div>
                                        )}
                                    </div>
                                    <div className="ml-auto text-yellow-400 text-sm flex gap-1">
                                        <i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i><i className="fa-solid fa-star"></i>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default Testimonials;
