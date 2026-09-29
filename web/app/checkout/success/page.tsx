'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function CheckoutSuccessPage() {
  const params = useSearchParams();
  const orderId = params.get('orderId');
  const sessionId = params.get('sessionId');
  const [status, setStatus] = useState<'checking' | 'paid' | 'pending'>('checking');

  useEffect(() => {
    if (!orderId) return;

    // Primary path: actively ask our backend to verify with Stripe directly
    // (works even if webhook delivery is broken locally, e.g. firewall issues).
    const verify = async () => {
      try {
        if (sessionId) {
          const res = await api.post('/payments/verify-session', { sessionId });
          if (res.data.status === 'PAID') {
            setStatus('paid');
            return true;
          }
        }
      } catch {
        // fall through to polling below
      }
      return false;
    };

    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      const confirmed = await verify();
      if (confirmed) {
        clearInterval(interval);
      } else if (attempts > 6) {
        setStatus('pending');
        clearInterval(interval);
      }
    }, 1200);

    verify(); // try immediately, don't wait for the first interval tick
    return () => clearInterval(interval);
  }, [orderId, sessionId]);

  return (
    <div className="max-w-md mx-auto text-center bg-white border rounded-lg p-8">
      {status === 'checking' && <p>Confirming your payment...</p>}
      {status === 'paid' && (
        <>
          <h1 className="text-2xl font-bold text-green-600 mb-2">Payment successful 🎉</h1>
          <p className="text-gray-500 mb-4">Order #{orderId?.slice(0, 8)} is confirmed.</p>
        </>
      )}
      {status === 'pending' && (
        <>
          <h1 className="text-xl font-bold mb-2">Payment received, confirming...</h1>
          <p className="text-gray-500 mb-4">
            This can take a moment. If it doesn't update, make sure your Stripe webhook (or `stripe listen`
            in dev) is running — see the README.
          </p>
        </>
      )}
      <Link href="/" className="text-blue-600 underline">Continue shopping</Link>
    </div>
  );
}
