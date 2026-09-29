'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  vendor: { storeName: string };
}

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchProducts = async (q?: string) => {
    setLoading(true);
    const res = await api.get('/products', { params: { search: q } });
    setProducts(res.data.items);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <input
          className="border rounded px-3 py-2 flex-1"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchProducts(search)}
        />
        <button className="bg-black text-white px-4 py-2 rounded" onClick={() => fetchProducts(search)}>
          Search
        </button>
      </div>

      {loading ? (
        <p>Loading products...</p>
      ) : products.length === 0 ? (
        <p>No products found. Run the seed script or add products from a vendor dashboard.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {products.map((p) => (
            <Link
              key={p.id}
              href={`/products/${p.id}`}
              className="border rounded-lg p-4 bg-white hover:shadow-md transition"
            >
              <div className="h-40 bg-gray-100 rounded mb-3 flex items-center justify-center text-gray-400">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.title} className="h-full object-cover rounded" />
                ) : (
                  'No image'
                )}
              </div>
              <h3 className="font-semibold">{p.title}</h3>
              <p className="text-sm text-gray-500">{p.vendor?.storeName}</p>
              <p className="font-bold mt-1">₹{p.price}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
