import React from 'react';
import EditableText from './EditableText';

const AboutSection = ({ data }) => {
  if (!data || data.length === 0) return null;
  
  const info = data[0];
  const missie = info.missie_visie || info.missie || info.about || info.over_ons || '';
  const imageField = Object.keys(info).find(key => key.toLowerCase().includes('afbeelding') || key.toLowerCase().includes('foto') || key.toLowerCase().includes('image'));
  
  let imgSrc = null;
  if (imageField && info[imageField]) {
    imgSrc = info[imageField].startsWith('http') ? info[imageField] : `${import.meta.env.BASE_URL}images/${info[imageField]}`;
  }

  if (!missie) return null;
  
  const missieField = Object.keys(info).find(k => k.toLowerCase().includes('missie') || k.toLowerCase().includes('about') || k.toLowerCase().includes('over')) || 'missie_visie';

  return (
    <section className="py-20 px-6" data-dock-section="about">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {imgSrc && (
            <div className="order-2 md:order-1">
              <div className="aspect-square rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={imgSrc} 
                  alt="Over ons" 
                  className="w-full h-full object-cover"
                  data-dock-bind={JSON.stringify({ file: 'bedrijfsinformatie', index: 0, key: imageField })}
                />
              </div>
            </div>
          )}
          <div className={`order-1 ${imgSrc ? 'md:order-2' : 'md:col-span-2 text-center'}`}>
            <h2 className="text-4xl md:text-5xl font-bold mb-8">
              Over Ons
            </h2>
            <div className={`h-1 w-20 bg-accent mb-8 ${imgSrc ? '' : 'mx-auto'}`}></div>
            <EditableText
              tag="p"
              table="bedrijfsinformatie"
              id={0}
              field={missieField}
              className="text-lg leading-relaxed text-slate-700 dark:text-slate-300"
            >
              {missie}
            </EditableText>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
