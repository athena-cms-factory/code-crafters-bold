import React from 'react';
import EditableText from './EditableText';

const FAQ = ({ data, sectionName }) => {
    if (!data || data.length === 0) return null;

    return (
        <section id={sectionName} data-dock-section={sectionName} className="py-24 px-6 bg-slate-50">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-16">
                    <h2 className="text-4xl font-serif font-bold text-primary mb-4 capitalize">{sectionName.replace(/_/g, ' ')}</h2>
                    <div className="h-1 w-20 bg-accent mx-auto rounded-full"></div>
                </div>
                <div className="flex flex-col gap-6">
                    {data.map((item, index) => {
                        const vraagKey = Object.keys(item).find(k => /vraag|titel/i.test(k)) || 'vraag';
                        const antwoordKey = Object.keys(item).find(k => /antwoord|tekst|beschrijving/i.test(k)) || 'antwoord';

                        return (
                            <details key={index} className="group bg-white rounded-3xl shadow-lg border border-slate-100 open:shadow-xl transition-all duration-300 overflow-hidden">
                                <summary className="p-6 md:p-8 cursor-pointer list-none flex items-center justify-between font-bold text-lg md:text-xl text-primary select-none hover:bg-slate-50 transition-colors">
                                    <span><EditableText value={item[vraagKey]} cmsBind={{ file: sectionName, index, key: vraagKey }} /></span>
                                    <span className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent transition-transform duration-300 group-open:rotate-180">
                                        <i className="fa-solid fa-chevron-down"></i>
                                    </span>
                                </summary>
                                <div className="px-6 md:px-8 pb-8 text-slate-600 leading-relaxed border-t border-slate-100/50 pt-6 animate-reveal">
                                    <EditableText value={item[antwoordKey]} cmsBind={{ file: sectionName, index, key: antwoordKey }} />
                                </div>
                            </details>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default FAQ;
