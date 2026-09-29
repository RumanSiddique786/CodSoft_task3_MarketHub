'use client';
import Link from 'next/link';

export default function CheckoutCancelPage() {
  return (
    <div className="max-w-md mx-auto text-center bg-white border rounded-lg p-8">
      <h1 className="text-xl font-bold mb-2">Checkout cancelled</h1>
      <p className="text-gray-500 mb-4">No payment was made. Your order is still saved as pending if you'd like to try again.</p>
      <Link href="/" className="text-blue-600 underline">Back to shop</Link>
    </div>
  );
}
