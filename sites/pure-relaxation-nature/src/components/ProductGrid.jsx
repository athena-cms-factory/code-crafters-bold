import React from 'react';
import EditableMedia from './EditableMedia';
import EditableText from './EditableText';
import { useCart } from './CartContext';

const ProductGrid = ({ data, sectionName, features = {} }) => {
    if (!data || data.length === 0) return null;

    const isWebshop = !!features.ecommerce;
    const hasSearchLinks = !!features.google_search_links;
    const { addToCart } = isWebshop ? useCart() : { addToCart: () => { } };

    return (
        <section id={sectionName} data-dock-section={sectionName} className="py-24 px-6 bg-background">
            <div className="max-w-7xl mx-auto">
                <h2 className="text-4xl font-serif font-bold mb-16 text-center text-primary uppercase tracking-widest">{sectionName.replace(/_/g, ' ')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
                    {data.map((item, index) => {
                        const priceValue = parseFloat(String(item.prijs || 0).replace(/[^0-9.,]/g, '').replace(',', '.'));
                        const titleKey = Object.keys(item).find(k => /naam|titel/i.test(k)) || 'naam';
                        const imgKey = Object.keys(item).find(k => /foto|afbeelding|url/i.test(k)) || 'product_foto_url';

                        const getGoogleSearchUrl = (query) => {
                            return `https://www.google.com/search?q=${encodeURIComponent(query + ' ' + (features.search_context || ''))}`;
                        };

                        return (
                            <article key={index} className="flex flex-col bg-surface rounded-[2.5rem] shadow-xl overflow-hidden transition-all hover:-translate-y-2 hover:shadow-2xl group border border-slate-100">
                                <div className="aspect-square overflow-hidden flex-shrink-0 relative">
                                    <EditableMedia src={item[imgKey]} cmsBind={{ file: sectionName, index, key: imgKey }} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                    <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                                </div>
                                <div className="p-8 flex flex-col flex-grow text-center">
                                    <h3 className="text-2xl font-bold mb-4 text-primary min-h-[4rem] flex items-center justify-center">
                                        <EditableText value={item[titleKey]} cmsBind={{ file: sectionName, index, key: titleKey }} />
                                    </h3>
                                    <div className="text-accent font-bold mt-auto text-3xl mb-6">€{priceValue.toFixed(2)}</div>
                                    <div className="flex flex-col gap-3">
                                        {isWebshop && (
                                            <button onClick={() => addToCart({ id: item.id || index, title: item[titleKey], price: priceValue, image: item[imgKey] })} className="w-full py-4 bg-[var(--color-button-bg)] text-white rounded-2xl font-bold hover:brightness-110 transition-all shadow-lg active:scale-95 text-lg uppercase tracking-wider">In winkelwagen</button>
                                        )}
                                        {hasSearchLinks && (
                                            <a href={getGoogleSearchUrl(item[titleKey])} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-primary transition-colors text-sm flex items-center justify-center gap-2">
                                                <i className="fa-brands fa-google text-xs"></i> Zoek details
                                            </a>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ProductGrid;
