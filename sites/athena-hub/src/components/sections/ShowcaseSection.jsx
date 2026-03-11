import React, { useState } from 'react';
import EditableMedia from '../EditableMedia';
import EditableText from '../EditableText';
import EditableLink from '../EditableLink';

const ShowcaseSection = ({ sectionName, items, sectionStyle }) => {
  const [showArchive, setShowArchive] = useState(false);
  const [archiveData, setArchiveData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchArchive = async () => {
    if (archiveData.length > 0) {
      setShowArchive(!showArchive);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch('https://api.github.com/users/athenacmsfactory/repos?sort=updated&per_page=100');
      const repos = await response.json();
      
      const data = repos
        .filter(repo => !repo.fork && repo.name !== 'athena-x') // Optioneel: filter eigen engine/monorepo uit
        .map(repo => ({
          name: repo.name.replace(/-/g, ' '),
          type: repo.language || 'Project',
          description: repo.description || 'Geen omschrijving beschikbaar.',
          githubLink: repo.html_url,
          liveLink: repo.has_pages ? `https://athenacmsfactory.github.io/${repo.name}/` : repo.homepage
        }));

      setArchiveData(data);
      setShowArchive(true);
    } catch (e) {
      console.error("Fout bij ophalen archive:", e);
    }
    setLoading(false);
  };

  return (
    <section id={sectionName} data-dock-section={sectionName} className="py-24 px-6 bg-[var(--color-background)]" style={sectionStyle}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center mb-20 text-center">
          <h2 className="text-5xl md:text-6xl font-serif font-bold text-primary mb-6 capitalize">
            {sectionName.replace(/_/g, ' ')}
          </h2>
          <div className="h-2 w-24 bg-accent rounded-full mb-8"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {items.map((item, index) => {
            const titleKey = Object.keys(item).find(k => /name|naam|titel|project|header|title/i.test(k)) || 'name';
            const textKey = Object.keys(item).find(k => /beschrijving|omschrijving|description|intro|text|summary/i.test(k)) || 'description';
            const imgKey = Object.keys(item).find(k => /image|foto|afbeelding|url|img/i.test(k)) || 'image';
            const linkData = item.link || item.link_url || "#";
            const linkUrl = (typeof linkData === 'object' && linkData !== null) ? (linkData.url || "#") : linkData;

            return (
              <div key={index} className="group relative flex flex-col rounded-[3rem] overflow-hidden bg-white shadow-2xl transition-all duration-500 hover:-translate-y-4 hover:shadow-accent/20">
                <a
                  href={linkUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-[16/10] overflow-hidden block relative"
                  onClick={(e) => { if (e.shiftKey) e.preventDefault(); }}
                >
                  <EditableMedia
                    src={item[imgKey]}
                    cmsBind={{ file: sectionName, index: index, key: imgKey }}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    fallback="Project Preview"
                  />
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <div className="bg-primary/80 backdrop-blur-md text-white px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-tighter shadow-xl">
                      Shift + Klik voor link
                    </div>
                  </div>
                </a>

                <div className="p-12 flex flex-col flex-grow">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-3xl font-bold text-primary group-hover:text-accent transition-colors">
                      <EditableText value={item[titleKey]} cmsBind={{ file: sectionName, index: index, key: titleKey }} />
                    </h3>
                    {item.category && (
                      <EditableText
                        value={item.category}
                        cmsBind={{ file: sectionName, index: index, key: 'category' }}
                        className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest"
                      />
                    )}
                  </div>

                  <div className="text-lg leading-relaxed text-slate-600 mb-8 line-clamp-3 font-light italic">
                    <EditableText value={item[textKey]} cmsBind={{ file: sectionName, index: index, key: textKey }} />
                  </div>

                  <div className="mt-auto pt-6 border-t border-slate-50 flex justify-between items-center">
                    <EditableLink
                      label={item.link_text || (typeof linkData === 'object' ? linkData.label : "Bekijk Project")}
                      url={linkData}
                      table={sectionName}
                      field="link"
                      id={index}
                      className="inline-flex items-center gap-2 text-primary font-black uppercase tracking-widest text-xs hover:text-accent transition-colors"
                    />
                    <div className="flex gap-3 text-slate-300">
                      <i className="fa-solid fa-laptop-code text-xl"></i>
                      <i className="fa-solid fa-magnifying-glass-chart text-xl"></i>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* --- ARCHIVE SECTION --- */}
        <div className="mt-20 flex flex-col items-center">
          <button
            onClick={fetchArchive}
            disabled={loading}
            className={`
              group relative px-12 py-5 rounded-full font-black uppercase tracking-[0.2em] text-sm overflow-hidden transition-all duration-500
              ${showArchive ? 'bg-primary text-white' : 'bg-white text-primary border-2 border-primary hover:bg-primary hover:text-white'}
            `}
          >
            <span className="relative z-10">
              {loading ? 'Laden...' : (showArchive ? 'Sluit Archief' : 'Volledig Portfolio / Archief')}
            </span>
            <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-500 opacity-20"></div>
          </button>

          {showArchive && archiveData.length > 0 && (
            <div className="mt-16 w-full transition-all duration-700 ease-in-out opacity-100 translate-y-0">
              <div className="bg-white/50 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 shadow-2xl border border-white/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b-2 border-slate-100">
                        <th className="py-6 px-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Type</th>
                        <th className="py-6 px-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Project</th>
                        <th className="py-6 px-4 font-black uppercase tracking-widest text-[10px] text-slate-400">Omschrijving</th>
                        <th className="py-6 px-4 font-black uppercase tracking-widest text-[10px] text-slate-400 text-right">Links</th>
                      </tr>
                    </thead>
                    <tbody>
                      {archiveData.map((project, idx) => (
                        <tr key={idx} className="group hover:bg-white/80 transition-colors">
                          <td className="py-6 px-4">
                            <span className="px-3 py-1 bg-slate-100 rounded-full text-[9px] font-bold uppercase text-slate-500">
                              {project.type || 'website'}
                            </span>
                          </td>
                          <td className="py-6 px-4">
                            <h4 className="font-bold text-primary text-lg">{project.name}</h4>
                          </td>
                          <td className="py-6 px-4">
                            <p className="text-slate-600 font-light italic line-clamp-1">{project.description}</p>
                          </td>
                          <td className="py-6 px-4 text-right">
                            <div className="flex justify-end gap-3">
                              {project.githubLink && (
                                <a href={project.githubLink} target="_blank" rel="noopener noreferrer" className="p-2 hover:text-accent transition-colors" title="GitHub">
                                  <i className="fa-brands fa-github text-xl"></i>
                                </a>
                              )}
                              {project.liveLink && (
                                <a href={project.liveLink} target="_blank" rel="noopener noreferrer" className="p-2 hover:text-accent transition-colors" title="Live Site">
                                  <i className="fa-solid fa-arrow-up-right-from-square text-lg"></i>
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ShowcaseSection;
