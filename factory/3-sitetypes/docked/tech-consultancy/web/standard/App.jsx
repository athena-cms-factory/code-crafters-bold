import React, { useMemo } from 'react';
import { HashRouter as Router } from 'react-router-dom';
/* {{SHOP_IMPORT_START}} */
import { CartProvider } from './components/CartContext';
/* {{SHOP_IMPORT_END}} */
import Header from './components/Header';
import Section from './components/Section';
import Footer from './components/Footer';
import StyleInjector from './components/StyleInjector';

import { DisplayConfigProvider } from './components/DisplayConfigContext';

const App = ({ data }) => {
  const primaryTable = Object.keys(data)[0];

  const content = (
    <DisplayConfigProvider data={data}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] transition-colors duration-500">
          <StyleInjector siteSettings={data['site_settings']} />
          
          <Header primaryTable={data[primaryTable]} tableName={primaryTable} siteSettings={data['site_settings']} />
          
          <main style={{ paddingTop: 'var(--content-top-offset, 0px)' }}>
            <Section data={data} />
          </main>

          <Footer data={data} />
        </div>
      </Router>
    </DisplayConfigProvider>
  );

  /* {{SHOP_WRAPPER_START}} */
  return <CartProvider>{content}</CartProvider>;
  /* {{SHOP_WRAPPER_END}} */

  /* {{NON_SHOP_WRAPPER_START}}
  return content;
  {{NON_SHOP_WRAPPER_END}} */
};

export default App;