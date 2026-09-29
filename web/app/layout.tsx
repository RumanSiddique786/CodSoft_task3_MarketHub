import './globals.css';
import Link from 'next/link';
import { CartProvider } from '@/lib/cart';
import CartNavLink from '@/components/CartNavLink';
import AuthNav from '@/components/AuthNav';

export const metadata = { title: 'MarketHub', description: 'Multi-vendor marketplace' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <CartProvider>
          <nav className="bg-white border-b px-6 py-4 flex justify-between items-center">
            <Link href="/" className="font-bold text-xl">MarketHub</Link>
            <div className="flex gap-4 text-sm items-center">
              <Link href="/">Shop</Link>
              <CartNavLink />
              <Link href="/vendor/dashboard">Vendor Dashboard</Link>
              <Link href="/admin/dashboard">Admin Panel</Link>
              <Link href="/login">Login</Link>
              <Link href="/register">Register</Link>
              <AuthNav />
            </div>
          </nav>
          <main className="p-6 max-w-6xl mx-auto">{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
