import React from 'react';
import { HashLink as Link } from 'react-router-hash-link';
import EditableText from './EditableText';

export default function Footer({ data }) {
  // Gebruik de eerste elementen uit de arrays (conform Google Sheets mapping)
  const settings = Array.isArray(data?.site_settings) ? data.site_settings[0] : (data?.site_settings || {});
  const contactInfo = Array.isArray(data?.contact) ? data.contact[0] : (data?.contact || {});
  const navigation = data?.navigation || [];
  // Intelligent Deployment Trigger v3 (Robust)
  const siteTitle = settings.site_title || settings.site_name || 'Karel Webdesign';
  const email = contactInfo.contact_email || contactInfo.email || settings.contact_email || '';
  const btw = contactInfo.btw || contactInfo.btw_nummer || '';
  const initials = siteTitle.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 relative pt-20 pb-10">
      <div className="container mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">

          {/* Column 1: Brand */}
          <div className="col-span-1 md:col-span-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg">
                {initials}
              </div>
              <h3 className="text-2xl font-bold text-white tracking-tight">
                <EditableText value={siteTitle} cmsBind={{ file: 'site_settings', index: 0, key: 'site_title' }} />
              </h3>
            </div>
            <p className="text-sm leading-relaxed max-w-xs">
              <EditableText
                value={settings.site_description || 'Professioneel webdesign voor ondernemers die vooruit willen.'}
                cmsBind={{ file: 'site_settings', index: 0, key: 'site_description' }}
              />
            </p>
          </div>

          {/* Column 2: Navigation */}
          <div className="space-y-6">
            <h4 className="text-white font-semibold uppercase tracking-wider text-sm">Quick Links</h4>
            <ul className="space-y-3">
              {navigation.sort((a, b) => a.order - b.order).map((item, idx) => (
                <li key={idx}>
                  <Link
                    to={item.href}
                    smooth
                    className="hover:text-blue-400 transition-colors duration-200 flex items-center group"
                  >
                    <span className="w-0 group-hover:w-2 h-0.5 bg-blue-400 transition-all mr-0 group-hover:mr-2 rounded-full"></span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Contact */}
          <div className="space-y-6">
            <h4 className="text-white font-semibold uppercase tracking-wider text-sm">Contact Info</h4>
            <ul className="space-y-4">
              {email && (
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-envelope text-blue-500 mt-1"></i>
                  <a href={`mailto:${email}`} className="hover:text-blue-400 transition-colors">
                    <EditableText value={email} cmsBind={{ file: 'contact', index: 0, key: 'contact_email' }} />
                  </a>
                </li>
              )}
              {contactInfo.phone && (
                <li className="flex items-start gap-3">
                  <i className="fa-solid fa-phone text-blue-500 mt-1"></i>
                  <span>{contactInfo.phone}</span>
                </li>
              )}
            </ul>
          </div>

          {/* Column 4: Business */}
          <div className="space-y-6">
            <h4 className="text-white font-semibold uppercase tracking-wider text-sm">Bedrijfsgegevens</h4>
            <div className="space-y-4">
              {btw && (
                <p className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase">BTW-Nummer</span>
                  <span className="text-white font-medium">{btw}</span>
                </p>
              )}
              {contactInfo.address && (
                <p className="flex flex-col">
                  <span className="text-xs text-slate-500 uppercase">Locatie</span>
                  <span className="text-white font-medium">{contactInfo.address}</span>
                </p>
              )}
            </div>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-10 border-t border-slate-800 flex flex-col md:flex-row justify-between items-center gap-6">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} {siteTitle}. Alle rechten voorbehouden.
          </p>
          <div className="flex items-center gap-2 grayscale hover:grayscale-0 transition-all opacity-40 hover:opacity-100 duration-500 cursor-default">
            <img src="./athena-icon.svg" alt="Athena Logo" className="w-5 h-5" />
            <span className="text-[10px] tracking-widest uppercase">Powered by Athena Factory</span>
          </div>
        </div>
      </div>
    </footer>
  );
}