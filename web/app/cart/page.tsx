'use client';
import { useState } from 'react';
import Link from 'next/link';
import { api, getCurrentUser } from '@/lib/api';
import { useCart } from '@/lib/cart';

export default function CartPage() {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const [shippingAddr, setShippingAddr] = useState('123 Demo Street, Lucknow, UP');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const checkout = async () => {
    const user = getCurrentUser();
    if (!user) {
      setMessage('Please log in to check out.');
      return;
    }
    if (items.length === 0) return;

    setLoading(true);
    try {
      // One order, all items — this is exactly what OrdersService splits into
      // per-vendor OrderItems on the backend, even across multiple sellers.
      const orderRes = await api.post('/orders', {
        shippingAddr,
        items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      });
      const sessionRes = await api.post('/payments/checkout-session', { orderId: orderRes.data.id });
      clearCart();
      window.location.href = sessionRes.data.url;
    } catch (err: any) {
      setMessage(err.response?.data?.message || 'Checkout failed');
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">Your cart is empty.</p>
        <Link href="/" className="text-blue-600 underline">Browse products</Link>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-3 gap-8">
      <div className="md:col-span-2 space-y-3">
        <h1 className="text-2xl font-bold mb-4">Your Cart</h1>
        {items.map((item) => (
          <div key={item.productId} className="bg-white border rounded p-3 flex items-center gap-3">
            <div className="w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
              {item.image && <img src={item.image} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1">
              <p className="font-medium">{item.title}</p>
              <p className="text-sm text-gray-500">₹{item.price} each</p>
            </div>
            <input type="number" min={1} value={item.quantity}
              onChange={(e) => updateQuantity(item.productId, Number(e.target.value))}
              className="border rounded px-2 py-1 w-16" />
            <p className="font-semibold w-20 text-right">₹{item.price * item.quantity}</p>
            <button onClick={() => removeItem(item.productId)} className="text-red-500 text-sm">Remove</button>
          </div>
        ))}
      </div>

      <div className="bg-white border rounded p-4 h-fit space-y-3">
        <h2 className="font-semibold">Order Summary</h2>
        <div className="flex justify-between text-sm">
          <span>Items</span>
          <span>{items.reduce((s, i) => s + i.quantity, 0)}</span>
        </div>
        <div className="flex justify-between font-bold">
          <span>Total</span>
          <span>₹{totalPrice}</span>
        </div>
        <div>
          <label className="text-sm text-gray-600 block mb-1">Shipping address</label>
          <textarea value={shippingAddr} onChange={(e) => setShippingAddr(e.target.value)}
            className="border rounded px-2 py-1 w-full text-sm" rows={2} />
        </div>
        <button onClick={checkout} disabled={loading} className="bg-black text-white w-full py-2 rounded disabled:opacity-50">
          {loading ? 'Redirecting to payment...' : 'Proceed to Checkout'}
        </button>
        {message && <p className="text-sm text-red-500">{message}</p>}
      </div>
    </div>
  );
}
