import StyleInjector from './components/StyleInjector';
import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Section from './components/Section';
import Footer from './components/Footer';
import Checkout from './components/Checkout';
import CartOverlay from './components/CartOverlay';
import { CartProvider } from './components/CartContext';
const Layout = ({ data, children }) => (
<div className="min-h-screen bg-[var(--color-background)]">
      <StyleInjector siteSettings={data['site_settings']} />
<Header data={data.basisgegevens || Object.values(data)[0]} siteSettings={data.site_settings} />
<main className="pt-20">{children}</main>
<Footer data={data} />
<CartOverlay />
</div>
);
const App = ({ data }) => {
  const siteId = data.site_settings?.[0]?.site_name || 'urban-soles';
  return (
    <CartProvider siteId={siteId}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <Routes>
          <Route path="/" element={<Layout data={data}><Section data={data} /></Layout>} />
          <Route path="/checkout" element={<Layout data={data}><Checkout /></Layout>} />
        </Routes>
      </Router>
    </CartProvider>
  );
};
export default App;