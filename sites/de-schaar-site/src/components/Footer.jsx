import React from 'react';
import EditableText from './EditableText';

export default function Footer({ primaryTable, socialData = [] }) {
  const info = primaryTable?.[0] || {};

  const iconMap = {
    'fa': 'fa-brands fa-facebook',
    'in': 'fa-brands fa-instagram',
    'tw': 'fa-brands fa-twitter',
    'li': 'fa-brands fa-linkedin',
    'yt': 'fa-brands fa-youtube',
    'wa': 'fa-brands fa-whatsapp'
  };

  // Zoek velden met verschillende mogelijke aliassen
  const rawNaam = info.bedrijfsnaam || info.naam_bedrijf || info.naam || info.titel || 'De Salon';
  const naam = (typeof rawNaam === 'object' && rawNaam !== null) ? (rawNaam.text || rawNaam.title || 'De Salon') : rawNaam;

  const adres = info.adres || info.address || info.locatie || '';
  const telefoon = info.telefoonnummer || info.telefoon || info.phone || '';
  const email = info.email_algemeen || info.email_publiek || info.email || '';
  const kvk = info.kvk_nummer || info.kvk || info.chamber_of_commerce || '';

  // Zoek de juiste keys voor de editor
  const findKey = (search) => Object.keys(info).find(k => k.toLowerCase().includes(search));

  const naamKey = findKey('naam') || findKey('titel') || 'bedrijfsnaam';
  const adresKey = findKey('adres') || findKey('address') || 'adres';
  const telKey = findKey('telefoon') || findKey('phone') || 'telefoonnummer';
  const emailKey = findKey('email') || findKey('email_algemeen');
  const kvkKey = findKey('kvk') || findKey('kvk_nummer');

  return (
    <footer
      id="footer"
      className="py-24 text-slate-400 border-t border-white/5"
      style={{ backgroundColor: 'var(--color-footer-bg, #020617)' }}
    >
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-16 mb-16">
          {/* Company Info */}
          <div className="md:col-span-2">
            <h3 className="text-3xl font-serif font-bold text-white mb-6 uppercase tracking-tighter">
              <EditableText
                tagName="span"
                value={rawNaam}
                table="basis"
                id={0}
                field={naamKey}
              />
            </h3>
            {adres && (
              <div className="mb-4 flex items-start gap-4">
                <i className="fa-solid fa-location-dot text-accent mt-1 shrink-0"></i>
                <EditableText
                  tagName="p"
                  className="text-lg leading-relaxed max-w-sm"
                  value={adres}
                  table="basis"
                  id={0}
                  field={adresKey}
                />
              </div>
            )}

            {/* Social Icons */}
            <div className="flex gap-4 mt-10">
              {socialData.map((social, idx) => (
                <a
                  key={idx}
                  href={social.url || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white/5 hover:bg-accent hover:text-white rounded-xl flex items-center justify-center text-xl transition-all duration-300"
                  title={social.naam}
                >
                  <i className={iconMap[social.icoon_klasse] || `fa-solid fa-${social.icoon_klasse}`}></i>
                </a>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8">
              <EditableText
                tagName="span"
                value={info.footer_contact_title || 'Contact'}
                table="basis"
                id={0}
                field="footer_contact_title"
              />
            </h4>
            <div className="space-y-6">
              {telefoon && (
                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-accent transition-colors">
                    <i className="fa-solid fa-phone text-xs"></i>
                  </div>
                  <EditableText
                    tagName="span"
                    className="text-sm font-bold group-hover:text-white transition-colors"
                    value={telefoon}
                    table="basis"
                    id={0}
                    field={telKey}
                  />
                </div>
              )}
              {email && (
                <div className="flex items-center gap-4 group cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-accent transition-colors">
                    <i className="fa-solid fa-envelope text-xs"></i>
                  </div>
                  <EditableText
                    tagName="span"
                    className="text-sm font-bold group-hover:text-white transition-colors"
                    value={email}
                    table="basis"
                    id={0}
                    field={emailKey}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Legal */}
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-[0.2em] mb-8">
              <EditableText
                tagName="span"
                value={info.footer_admin_title || 'Administratie'}
                table="basis"
                id={0}
                field="footer_admin_title"
              />
            </h4>
            {kvk && (
              <p className="text-xs mb-4 flex justify-between border-b border-white/5 pb-2">
                <span className="opacity-50">
                  <EditableText
                    tagName="span"
                    value={info.kvk_label || 'KVK Nummer'}
                    table="basis"
                    id={0}
                    field="kvk_label"
                  />
                </span>
                <EditableText
                  tagName="span"
                  className="text-white font-bold"
                  value={kvk}
                  table="basis"
                  id={0}
                  field={kvkKey}
                />
              </p>
            )}
            <p className="text-[10px] leading-relaxed opacity-30 mt-8">
              &copy; {new Date().getFullYear()} {naam}.<br />
              <EditableText
                tagName="span"
                value={info.footer_rights_text || 'Alle rechten voorbehouden.'}
                table="basis"
                id={0}
                field="footer_rights_text"
              />
            </p>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] uppercase tracking-widest opacity-20">
            <EditableText
              tagName="span"
              value={info.footer_credit_text || 'Design by Athena CMS Factory'}
              table="basis"
              id={0}
              field="footer_credit_text"
            />
          </p>
          <div className="flex gap-6 text-[10px] uppercase tracking-widest font-bold">
            <a href="#" className="hover:text-accent transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-accent transition-colors">Algemene Voorwaarden</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
