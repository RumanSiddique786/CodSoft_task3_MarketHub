'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';

export default function CartNavLink() {
  const { totalItems } = useCart();
  return (
    <Link href="/cart" className="relative">
      Cart
      {totalItems > 0 && (
        <span className="absolute -top-2 -right-3 bg-black text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
          {totalItems}
        </span>
      )}
    </Link>
  );
}
