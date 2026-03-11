import React from 'react';
import { useCart } from './CartContext';

const CartOverlay = () => {
  const { cart, isCartOpen, setIsCartOpen, updateQuantity, cartTotal, cartCount } = useCart();

  if (!isCartOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[2000] flex justify-end transition-opacity duration-300"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={() => setIsCartOpen(false)}
    >
      <div 
        className="w-full max-w-md bg-background h-full shadow-2xl flex flex-col transform transition-transform duration-500 ease-out translate-x-0"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-100">
          <div>
            <h3 className="text-2xl font-bold font-serif">Winkelwagen</h3>
            <p className="text-sm text-secondary">{cartCount} items</p>
          </div>
          <button 
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors text-2xl" 
            onClick={() => setIsCartOpen(false)}
          >
            &times;
          </button>
        </div>

        {/* Items List */}
        <div className="flex-grow overflow-y-auto p-8 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
               <span className="text-6xl mb-4">🛒</span>
               <p className="text-lg">Je winkelwagen is nog leeg.</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 group">
                <div className="flex-grow">
                  <span className="block font-bold text-lg leading-tight mb-1 group-hover:text-accent transition-colors">
                    {item.title || item.name}
                  </span>
                  <span className="text-secondary font-medium">
                    €{item.price?.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                
                <div className="flex items-center bg-slate-50 rounded-full px-2 py-1 border border-slate-100">
                  <button 
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all font-bold"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-bold text-sm">{item.quantity}</span>
                  <button 
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all font-bold"
                    onClick={() => updateQuantity(item.id, 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div className="p-8 bg-surface border-t border-slate-100">
            <div className="flex justify-between items-end mb-8">
              <span className="text-secondary font-medium">Subtotaal</span>
              <span className="text-3xl font-black font-serif">
                €{cartTotal.toLocaleString('nl-NL', { minimumFractionDigits: 2 })}
              </span>
            </div>
            
            <button 
              className="btn-primary w-full py-5 text-lg shadow-xl shadow-accent/20" 
              onClick={() => alert('Bedankt voor je interesse! De checkout wordt momenteel geconfigureerd.')}
            >
              Afrekenen
            </button>
            
            <p className="mt-4 text-center text-xs text-secondary italic">
              Gratis verzending bij bestellingen boven €50,-
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartOverlay;