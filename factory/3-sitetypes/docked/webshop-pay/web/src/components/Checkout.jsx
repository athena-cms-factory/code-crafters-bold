import React, { useState } from 'react';
import { useCart } from './CartContext';
import { Link } from 'react-router-dom';

const Checkout = () => {
  const { cart, cartTotal, clearCart } = useCart();
  const [paymentMethod, setPaymentMethod] = useState('payconiq');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      const dashboardPort = import.meta.env.VITE_DASHBOARD_PORT || '4001';
      const response = await fetch(`http://localhost:${dashboardPort}/api/payments/create-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectName: '{{PROJECT_NAME}}',
          cart: cart,
          successUrl: window.location.origin + '/checkout?status=success',
          cancelUrl: window.location.origin + '/checkout?status=cancel'
        })
      });

      const data = await response.json();
      if (data.success && data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Kon geen betaalsessie aanmaken.");
      }
    } catch (e) {
      alert("Betalingsfout: " + e.message);
      setIsProcessing(false);
    }
  };

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center">
        <h2 className="text-3xl font-serif font-bold mb-4 text-[var(--color-heading)]">Je winkelmand is leeg</h2>
        <p className="text-secondary mb-8">Voeg wat producten toe voordat je gaat afrekenen.</p>
        <Link to="/" className="btn-primary px-8 py-3 rounded-full">Terug naar de winkel</Link>
      </div>
    );
  }

  // Check for status in URL
  const query = new URLSearchParams(window.location.search);
  const status = query.get('status');

  if (status === 'success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center bg-green-50">
        <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white text-4xl mb-6">✓</div>
        <h2 className="text-3xl font-serif font-bold mb-4 text-green-800">Betaling Geslaagd!</h2>
        <p className="text-green-700 mb-8 max-w-md">Bedankt voor je aankoop. We maken je bestelling direct in orde.</p>
        <Link to="/" onClick={() => clearCart()} className="btn-primary px-8 py-3 rounded-full bg-green-600 border-none text-white">Terug naar de winkel</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] py-20 px-6">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16">
        
        {/* Linker kant: Besteloverzicht */}
        <div className="space-y-8">
          <Link to="/" className="inline-flex items-center text-accent hover:underline mb-8">
            <span className="mr-2">←</span> Terug naar winkel
          </Link>
          <h1 className="text-4xl font-serif font-bold text-[var(--color-heading)]">Afrekenen</h1>
          
          <div className="bg-surface p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-white/5">
            <h3 className="text-xl font-bold mb-6">Besteloverzicht</h3>
            <div className="space-y-4 mb-8">
              {cart.map(item => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.title || item.name}</span>
                    <span className="text-sm text-secondary ml-2">x{item.quantity}</span>
                  </div>
                  <span className="font-bold">€{(item.price * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-slate-100 dark:border-white/5 pt-6 flex justify-between items-center">
              <span className="text-xl font-bold">Totaal</span>
              <span className="text-3xl font-black text-accent">€{cartTotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Rechter kant: Betaalmethode */}
        <div className="bg-surface p-8 md:p-12 rounded-[3rem] shadow-xl border border-slate-100 dark:border-white/5 self-start">
          <h3 className="text-2xl font-bold mb-8 text-center">Betaalmethode</h3>
          
          <div className="space-y-4 mb-8">
            <button 
              onClick={handlePayment}
              disabled={isProcessing}
              className={`w-full py-5 rounded-2xl text-xl font-bold shadow-xl transition-all flex items-center justify-center gap-4 ${isProcessing ? 'bg-slate-200 cursor-not-allowed' : 'btn-primary shadow-accent/20 hover:scale-[1.02]'}`}
            >
              <i className="fa-brands fa-stripe text-4xl text-blue-500"></i>
              {isProcessing ? 'Verwerken...' : `Nu Betalen (€${cartTotal.toFixed(2)})`}
            </button>
            <p className="text-center text-xs text-secondary font-medium px-4">
              Veilig betalen via Bancontact (Payconiq), iDEAL, Creditcard of PayPal.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-4 opacity-40 grayscale">
            <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
          </div>
        </div>

      </div>
    </div>
  );
};

export default Checkout;