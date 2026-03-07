import React, { useState } from 'react';
import EditableMedia from './EditableMedia';
import EditableText from './EditableText';
import RepeaterControls from './RepeaterControls';

const Section = ({ data }) => {
  const isDev = import.meta.env.DEV;
  const [activeConfigTable, setActiveConfigTable] = useState(null);
  // Robust layout reading (handle both array and object)
  const layouts = Array.isArray(data.layout_settings) ? (data.layout_settings[0] || {}) : (data.layout_settings || {});

  const sectionConfigs = [
    { table: "basis", title: "basisgegevens", subtitle: "Overzicht van basisgegevens", defaultLayout: "list" },
    { table: "locaties", title: "locaties", subtitle: "Overzicht van locaties", defaultLayout: "list" },
    { table: "stylist_gradatie", title: "stylist gradatie", subtitle: "Overzicht van stylist gradatie", defaultLayout: "grid" },
    { table: "teamleden", title: "teamleden", subtitle: "Overzicht van teamleden", defaultLayout: "list" },
    { table: "diensten_hoofdgroepen", title: "diensten hoofdgroepen", subtitle: "Overzicht van diensten hoofdgroepen", defaultLayout: "grid" },
    { table: "diensten_tarieven", title: "diensten tarieven", subtitle: "Overzicht van diensten tarieven", defaultLayout: "list" },
    { table: "testimonials", title: "testimonials", subtitle: "Overzicht van testimonials", defaultLayout: "list" },
    { table: "aveda_informatie", title: "aveda informatie", subtitle: "Overzicht van aveda informatie", defaultLayout: "grid" },
    { table: "social_media", title: "social media", subtitle: "Overzicht van social media", defaultLayout: "grid" },
    { table: "paginastructuur", title: "paginastructuur", subtitle: "Overzicht van paginastructuur", defaultLayout: "grid" }
  ];

  // Helper voor actuele layout per sectie
  const getLayout = (tableName, defaultStyle) => {
    return layouts[tableName] || layouts[tableName.toLowerCase()] || defaultStyle || 'grid';
  };

  // Helper voor veilige API calls zonder slash-problemen
  const getApiUrl = (path) => {
    const base = import.meta.env.BASE_URL || '/';
    return (base + '/' + path).replace(new RegExp('/+', 'g'), '/');
  };

  const addItem = async (file) => {
    try {
      const res = await fetch(getApiUrl('__athena/update-json'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: file.toLowerCase(), action: 'add' })
      });
      if ((await res.json()).success) {
        window.parent.postMessage({ type: 'DOCK_TRIGGER_REFRESH' }, '*');
      }
    } catch (err) { console.error(err); }
  };

  const updateLayout = async (table, style) => {
    try {
      await fetch(getApiUrl('__athena/update-json'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: 'layout_settings', index: 0, key: table, value: style })
      });
      window.parent.postMessage({ type: 'DOCK_TRIGGER_REFRESH' }, '*');
    } catch (err) { console.error(err); }
  };

  const moveSection = async (table, direction) => {
    try {
      const currentOrder = sectionConfigs.map(c => c.table.toLowerCase());
      await fetch(getApiUrl('__athena/update-json'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder-sections',
          key: table,
          direction,
          value: currentOrder
        })
      });
      window.parent.postMessage({ type: 'DOCK_TRIGGER_REFRESH' }, '*');
    } catch (err) { console.error(err); }
  };

  const savedOrder = Array.isArray(data.section_order) ? data.section_order : [];
  const sortedConfigs = [...sectionConfigs].sort((a, b) => {
    const idxA = savedOrder.indexOf(a.table.toLowerCase());
    const idxB = savedOrder.indexOf(b.table.toLowerCase());
    if (idxA === -1 && idxB === -1) return 0;
    if (idxA === -1) return 1;
    if (idxB === -1) return -1;
    return idxA - idxB;
  });

  const getText = (val) => (typeof val === 'object' && val !== null) ? (val.text || '') : val;

  if (!data || Object.keys(data).length === 0) {
    return <div className="p-20 text-center opacity-50">Data aan het laden...</div>;
  }

  return (
    <div className="flex flex-col">
      {sortedConfigs.map((config, idx) => {
        // Skip hoofdgroepen als we ze gaan integreren in de tarieven sectie
        // Skip ook social media en paginastructuur (die horen in header/footer)
        // Skip basisgegevens (al in footer/header)
        // Sectie-specifieke instellingen ophalen (voor titel/ondertitel/zichtbaarheid)
        const sectionMeta = (data.section_settings || []).find(s => s && s.id === config.table.toLowerCase()) || {};
        const isVisible = sectionMeta.visible !== false;

        // Skip technical sections by default
        if (config.table === 'paginastructuur') return null;
        
        // Skip based on visibility setting (except in Dev mode where we show them dimmed)
        if (!isVisible && !isDev) return null;

        const realKey = Object.keys(data).find(k => k.toLowerCase() === config.table.toLowerCase());
        let items = data[realKey] || [];
        if (!Array.isArray(items)) items = [items];
        
        // Skip if no items and not in dev
        if (items.length === 0 && !isVisible && !isDev) return null;

        const currentLayout = getLayout(config.table, config.defaultLayout);
        const visibleItems = isDev ? items : items.filter(item => item && !item._hidden);
        
        if (visibleItems.length === 0 && !isVisible && !isDev) return null;

        const sectionTitle = sectionMeta.title || config.title;
        const sectionSubtitle = sectionMeta.subtitle || config.subtitle;
        const metaIndex = (data.section_settings || []).findIndex(s => s && s.id === config.table.toLowerCase());

        // Display config voor metadata velden
        const displayConfigRaw = (data.display_config?.sections || {})[config.table.toLowerCase()] || {};
        const displayConfig = {
          visible_fields: Array.isArray(displayConfigRaw.visible_fields) ? displayConfigRaw.visible_fields : [],
          hidden_fields: Array.isArray(displayConfigRaw.hidden_fields) ? displayConfigRaw.hidden_fields : []
        };

        const metaBind = (key) => metaIndex !== -1
          ? { file: 'section_settings', index: metaIndex, key }
          : null;

        const bgClass = idx % 2 === 1 ? 'bg-black/5 dark:bg-white/5' : 'bg-transparent';
        const visibilityClass = !isVisible ? 'opacity-40 grayscale-[50%]' : '';

        // SPECIAL CASE: DIENSTEN TARIEVEN (Gegroepeerd)
        if (config.table === 'diensten_tarieven') {
          const hoofdgroepen = data.diensten_hoofdgroepen || [];
          const grouped = hoofdgroepen
            .map((groep, originalIndex) => ({
              ...groep,
              originalIndex,
              items: visibleItems.filter(item => String(item.groep_id) === String(groep.groep_id))
            }))
            .sort((a, b) => (a.volgorde || 0) - (b.volgorde || 0))
            .filter(g => g.items.length > 0);

          return (
            <section
              key={idx}
              id={config.table.toLowerCase()}
              data-dock-section={config.table.toLowerCase()}
              className={`py-32 px-6 ${bgClass} ${visibilityClass} relative`}
            >
              {!isVisible && isDev && <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] px-2 py-1 rounded font-bold uppercase z-50">Hidden Section</div>}
              <div className="max-w-6xl mx-auto">
                <header className="mb-24 text-center max-w-3xl mx-auto group/header relative">
                  <h2 className="text-5xl md:text-6xl font-serif font-bold mb-8 text-[var(--color-heading)] text-center">
                    <EditableText
                      value={sectionTitle}
                      cmsBind={metaBind('title')}
                    />
                  </h2>
                  <div className="h-1.5 w-12 mx-auto mb-8 bg-accent"></div>
                  <div className="text-xl italic font-light opacity-60 text-text text-center">
                    <EditableText
                      value={sectionSubtitle}
                      cmsBind={metaBind('subtitle')}
                    />
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-20 gap-y-24">
                  {grouped.map((group, gIdx) => (
                    <div key={gIdx} className="space-y-12">
                      <div className="relative group/category">
                        <div className="flex items-center gap-6 mb-10">
                          <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg shrink-0">
                            <EditableMedia
                              src={group.afbeelding}
                              className="w-full h-full object-cover"
                              cmsBind={{ file: 'diensten_hoofdgroepen', index: group.originalIndex, key: 'afbeelding' }}
                            />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-3xl font-serif font-bold text-accent uppercase tracking-[0.2em]">
                              <EditableText
                                value={group.naam}
                                cmsBind={{ file: 'diensten_hoofdgroepen', index: group.originalIndex, key: 'naam' }}
                              />
                            </h3>
                            <div className="h-1 w-12 bg-accent/30 mt-2"></div>
                          </div>
                        </div>

                        <div className="space-y-8 pl-4 border-l-2 border-accent/5">
                          {group.items.map((item, iIdx) => (
                            <div key={iIdx} className="group/item relative">
                              <div className="flex justify-between items-baseline gap-4 mb-1">
                                <EditableText
                                  tagName="span"
                                  value={item.dienst_naam}
                                  className="text-lg font-medium text-text group-hover/item:text-accent transition-colors duration-300"
                                  cmsBind={{ file: 'diensten_tarieven', index: item.absoluteIndex ?? iIdx, key: 'dienst_naam' }}
                                />
                                <div className="flex-1 border-b border-dotted border-slate-300 dark:border-white/10 mx-2 relative top-[-4px] opacity-40"></div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold whitespace-nowrap">
                                    {getText(item.prijs_indicatie)}
                                  </span>
                                  <EditableText
                                    tagName="span"
                                    value={item.basis_prijs}
                                    className="font-serif font-bold text-xl text-text"
                                    cmsBind={{ file: 'diensten_tarieven', index: item.absoluteIndex ?? iIdx, key: 'basis_prijs' }}
                                    renderValue={(val) => `€${getText(val)}`}
                                  />
                                </div>
                              </div>
                              {item.gradatie_afhankelijk && (
                                <p className="text-[9px] uppercase tracking-[0.1em] text-accent/50 font-bold">
                                  Prijs varieert per stylist gradatie
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        return (
          <section
            key={idx}
            id={config.table.toLowerCase()}
            data-dock-section={config.table.toLowerCase()}
            className={`py-32 px-6 ${bgClass} ${visibilityClass} relative transition-colors duration-500`}
          >
            {!isVisible && isDev && <div className="absolute top-4 right-4 bg-red-500 text-white text-[10px] px-2 py-1 rounded font-bold uppercase z-50">Hidden Section</div>}

            <div className="max-w-7xl mx-auto">

              <header className="mb-24 text-center max-w-3xl mx-auto group/header relative">
                <h2 className="text-5xl md:text-6xl font-serif font-bold mb-8 text-[var(--color-heading)] text-center">
                  <EditableText
                    value={sectionTitle}
                    cmsBind={metaBind('title')}
                    table="section_settings"
                    field="title"
                    id={metaIndex}
                  />
                </h2>
                <div className="h-1.5 w-12 mx-auto mb-8 bg-accent"></div>
                <div className="text-xl italic font-light opacity-60 text-text text-center">
                  <EditableText
                    value={sectionSubtitle}
                    cmsBind={metaBind('subtitle')}
                    table="section_settings"
                    field="subtitle"
                    id={metaIndex}
                  />
                </div>
              </header>

              <div className={
                (currentLayout === 'grid' ? "flex flex-wrap justify-center gap-x-12 gap-y-24" : "") +
                (currentLayout === 'list' ? "max-w-4xl mx-auto flex flex-col gap-24" : "") +
                (currentLayout === 'z-pattern' ? "flex flex-col gap-32" : "") +
                (currentLayout === 'focus' ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16" : "")
              }>
                {visibleItems.map((item, index) => {
                  const isHidden = item._hidden;
                  const itemClass = 'relative group transition-all duration-500 ' + (isHidden ? 'opacity-30 grayscale blur-[1px]' : '');

                  const keys = Object.keys(item);

                  // 1. Haal configuratie op
                  const configFields = displayConfig.visible_fields;
                  const hiddenFields = displayConfig.hidden_fields;

                  // 2. Bepaal kandidaten voor hoofdvelden (zoals voorheen)
                  let candidateTitle = keys.find(k => /naam|titel|header|kop/i.test(k)) || keys[0];
                  let candidateDesc = keys.find(k => /beschrijving|omschrijving|tekst|bio/i.test(k)) || keys[1];
                  let candidateImg = keys.find(k => /foto|afbeelding|img|image/i.test(k) && !k.includes('buiten')) || 'afbeelding';
                  let candidatePrice = keys.find(k => /prijs|kosten|tarief/i.test(k));

                  // 3. Pas visibility regels toe op hoofdvelden
                  // Als een veld expliciet verborgen is, mag het GEEN hoofdveld zijn.
                  const titleKey = hiddenFields.includes(candidateTitle) ? null : candidateTitle;
                  const descKey = hiddenFields.includes(candidateDesc) ? null : candidateDesc;
                  const imgKey = hiddenFields.includes(candidateImg) ? null : candidateImg;
                  const priceKey = (candidatePrice && !hiddenFields.includes(candidatePrice)) ? candidatePrice : null;

                  // 4. Bepaal extra velden (metadata)
                  const technicalFields = ['absoluteIndex', '_hidden', 'id', 'pk', 'uuid', 'naam', 'product_naam', 'bedrijfsnaam', 'titel', 'kaas_naam', 'naam_hond', 'beschrijving', 'omschrijving', 'korte_bio', 'info', 'inhoud_bericht', 'prijs', 'kosten', 'categorie', 'type', 'specialisatie'];

                  const metaFields = keys.filter(k => {
                    // a. Als het een hoofdveld is dat we tonen, sla over voor meta
                    if (k === titleKey || k === descKey || k === imgKey || k === priceKey) return false;

                    // b. Als het expliciet verborgen is, sla over
                    if (hiddenFields.includes(k)) return false;

                    // c. Als er een whitelist is (visible_fields), moet het erin staan
                    if (configFields.length > 0) {
                      return configFields.includes(k);
                    }

                    // d. Anders: standaard filter (geen technische velden of afbeeldingen)
                    if (technicalFields.some(tf => k.toLowerCase().includes(tf))) return false;
                    if (k.toLowerCase().includes('foto') || k.toLowerCase().includes('image')) return false;

                    return true;
                  });

                  const renderMetadata = () => (
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center md:justify-start">
                      {metaFields.map(mk => (
                        <EditableText
                          key={mk}
                          value={String(item[mk])}
                          cmsBind={{ file: config.table.toLowerCase(), index, key: mk }}
                          className="text-sm opacity-70"
                        />
                      ))}
                    </div>
                  );

                  // Binding object voor de Dock
                  const bind = (key) => JSON.stringify({ file: config.table.toLowerCase(), index, key });

                  if (priceKey) {
                    return (
                      <div key={index} className={itemClass + " w-full max-w-2xl mx-auto"}>
                        <div className="flex justify-between items-end">
                          <div className="flex-1">
                            {titleKey && <EditableText tagName="span" value={item[titleKey]} className="text-lg font-medium block text-text" cmsBind={{ file: config.table.toLowerCase(), index, key: titleKey }} data-dock-bind={bind(titleKey)} />}
                            {descKey && <EditableText tagName="span" value={item[descKey]} className="text-sm opacity-60 block mt-1 text-text" cmsBind={{ file: config.table.toLowerCase(), index, key: descKey }} data-dock-bind={bind(descKey)} />}
                            {renderMetadata()}
                            <div className="border-b border-dotted border-slate-300 dark:border-white/20 flex-1 mx-4 relative top-[-5px]"></div>
                          </div>
                          <EditableText tagName="span" value={item[priceKey]} className="font-serif font-bold text-lg text-text" cmsBind={{ file: config.table.toLowerCase(), index, key: priceKey }} data-dock-bind={bind(priceKey)} />
                        </div>
                      </div>
                    );
                  }

                  if (currentLayout === 'z-pattern') {
                    const isEven = index % 2 === 0;
                    return (
                      <article key={index} className={itemClass + ' flex flex-col ' + (isEven ? 'md:flex-row' : 'md:flex-row-reverse') + ' items-center gap-16 md:gap-24'}>
                        {imgKey && (
                          <div className="w-full md:w-1/2 aspect-square md:aspect-video rounded-[3rem] overflow-hidden shadow-2xl">
                            <EditableMedia src={item[imgKey]} dataItem={item} cmsBind={{ file: config.table.toLowerCase(), index, key: imgKey }} data-dock-bind={bind(imgKey)} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className={`w-full ${imgKey ? 'md:w-1/2' : 'max-w-3xl mx-auto'} text-center ${imgKey ? 'md:text-left' : ''}`}>
                          {titleKey && <EditableText tagName="h3" value={item[titleKey]} className="text-4xl font-serif font-bold mb-6 block text-[var(--color-heading)]" cmsBind={{ file: config.table.toLowerCase(), index, key: titleKey }} data-dock-bind={bind(titleKey)} />}
                          {descKey && <EditableText tagName="p" value={item[descKey]} className="text-xl leading-relaxed font-light block opacity-70 text-text" cmsBind={{ file: config.table.toLowerCase(), index, key: descKey }} data-dock-bind={bind(descKey)} />}
                          {renderMetadata()}
                        </div>
                      </article>
                    );
                  }

                  if (currentLayout === 'list') {
                    return (
                      <article key={index} className={itemClass + ' flex flex-col md:flex-row items-start gap-12 border-b border-slate-100 dark:border-white/5 pb-24 last:border-0'}>
                        {imgKey && (
                          <div className="w-32 h-32 rounded-full overflow-hidden flex-shrink-0 shadow-lg">
                            <EditableMedia src={item[imgKey]} dataItem={item} cmsBind={{ file: config.table.toLowerCase(), index, key: imgKey }} data-dock-bind={bind(imgKey)} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="flex-1">
                          {titleKey && <EditableText tagName="h3" value={item[titleKey]} className="text-3xl font-serif font-bold mb-4 block text-[var(--color-heading)]" cmsBind={{ file: config.table.toLowerCase(), index, key: titleKey }} data-dock-bind={bind(titleKey)} />}
                          {descKey && <EditableText tagName="p" value={item[descKey]} className="text-lg leading-relaxed font-light block opacity-70 text-text" cmsBind={{ file: config.table.toLowerCase(), index, key: descKey }} data-dock-bind={bind(descKey)} />}
                          {renderMetadata()}
                        </div>
                      </article>
                    );
                  }

                  return (
                    <article key={index} className={itemClass + ' ' + (currentLayout === 'focus' && index === 0 ? 'md:col-span-3' : 'w-full md:w-[calc(45%)] lg:w-[calc(30%)] min-w-[300px]')}>
                      {imgKey && (
                        <div className={'relative overflow-hidden mb-10 ' + (currentLayout === 'focus' && index === 0 ? 'aspect-video rounded-[4rem]' : 'aspect-square rounded-[3rem]') + ' shadow-2xl'}>
                          <EditableMedia src={item[imgKey]} alt={getText(item[titleKey])} className="w-full h-full object-cover" dataItem={item} cmsBind={{ file: config.table.toLowerCase(), index, key: imgKey }} data-dock-bind={bind(imgKey)} />
                        </div>
                      )}
                      {titleKey && <EditableText tagName="h3" value={item[titleKey]} className={(currentLayout === 'focus' && index === 0 ? 'text-4xl' : 'text-2xl') + ' font-serif font-bold mb-4 block text-[var(--color-heading)]'} cmsBind={{ file: config.table.toLowerCase(), index, key: titleKey }} data-dock-bind={bind(titleKey)} />}
                      {descKey && <EditableText tagName="p" value={item[descKey]} className={'leading-relaxed font-light block opacity-70 text-text ' + (currentLayout === 'focus' && index === 0 ? 'text-xl' : 'line-clamp-4')} cmsBind={{ file: config.table.toLowerCase(), index, key: descKey }} data-dock-bind={bind(descKey)} />}
                      {renderMetadata()}
                    </article>
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
