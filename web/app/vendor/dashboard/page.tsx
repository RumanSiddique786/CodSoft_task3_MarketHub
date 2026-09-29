'use client';
import { useEffect, useState } from 'react';
import { api, getCurrentUser } from '@/lib/api';

export default function VendorDashboard() {
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [sales, setSales] = useState<any>(null);
  const [form, setForm] = useState({ title: '', description: '', price: '', stock: '', categoryId: '' });
  const [tab, setTab] = useState<'products' | 'orders'>('products');
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data));
  }, []);
  // Start as undefined (still checking), not null — this avoids a server/client
  // mismatch, since the server never knows about cookies at all.
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const load = async () => {
    const [p, o, s] = await Promise.all([
      api.get('/products/mine'),
      api.get('/orders/vendor'),
      api.get('/vendors/me/sales'),
    ]);
    setProducts(p.data);
    setOrders(o.data);
    setSales(s.data);
  };

  useEffect(() => {
    if (user?.role === 'VENDOR') load();
  }, [user]);

  // Uploads each selected file directly to S3 using a presigned URL from our backend.
  // The file bytes never pass through our own server — only the small signed URL request does.
  const uploadImages = async (files: FileList): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const presignRes = await api.post('/upload/presign', {
        fileName: file.name,
        fileType: file.type,
      });
      const { uploadUrl, publicUrl } = presignRes.data;

      // Plain fetch, NOT our `api` instance — the presigned URL already carries its
      // own auth signature in the query string; adding an Authorization header
      // would invalidate that signature and S3 would reject the upload.
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      urls.push(publicUrl);
    }
    return urls;
  };

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    try {
      const images = selectedFiles ? await uploadImages(selectedFiles) : [];
      await api.post('/products', {
        ...form,
        price: Number(form.price),
        stock: Number(form.stock),
        images,
      });
      setForm({ title: '', description: '', price: '', stock: '', categoryId: '' });
      setSelectedFiles(null);
      load();
    } catch (err: any) {
      // Show the real reason instead of guessing — S3 misconfiguration is only one
      // of several possible causes (invalid category, unapproved vendor, etc.)
      const reason = err.response?.data?.message || err.message || 'Unknown error';
      alert(`Failed to add product: ${reason}`);
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const updateStatus = async (itemId: string, status: string) => {
    await api.patch(`/orders/item/${itemId}/status`, { status });
    load();
  };

  if (user === undefined) {
    return <p>Loading...</p>; // still checking who's logged in — same on server and client
  }

  if (!user || user.role !== 'VENDOR') {
    return <p>Please login as a vendor to access this dashboard.</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Vendor Dashboard</h1>

      {sales && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white border rounded p-4"><p className="text-sm text-gray-500">Total Revenue</p><p className="text-xl font-bold">₹{sales.totalRevenue}</p></div>
          <div className="bg-white border rounded p-4"><p className="text-sm text-gray-500">Total Orders</p><p className="text-xl font-bold">{sales.totalOrders}</p></div>
          <div className="bg-white border rounded p-4"><p className="text-sm text-gray-500">Net (after {sales.commissionPct}% commission)</p><p className="text-xl font-bold">₹{sales.netAfterCommission.toFixed(2)}</p></div>
        </div>
      )}

      <div className="flex gap-4 mb-4 border-b">
        <button onClick={() => setTab('products')} className={`pb-2 ${tab === 'products' ? 'border-b-2 border-black font-semibold' : ''}`}>Products</button>
        <button onClick={() => setTab('orders')} className={`pb-2 ${tab === 'orders' ? 'border-b-2 border-black font-semibold' : ''}`}>Orders</button>
      </div>

      {tab === 'products' && (
        <div>
          <form onSubmit={addProduct} className="bg-white border rounded p-4 mb-6 grid grid-cols-2 gap-3">
            <input className="border rounded px-2 py-1" placeholder="Title" value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            <select className="border rounded px-2 py-1" value={form.categoryId}
              onChange={(e) => setForm({ ...form, categoryId: e.target.value })} required>
              <option value="">Select category...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="border rounded px-2 py-1 col-span-2" placeholder="Description" value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            <input className="border rounded px-2 py-1" type="number" placeholder="Price" value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })} required />
            <input className="border rounded px-2 py-1" type="number" placeholder="Stock" value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })} required />
            <div className="col-span-2">
              <label className="text-sm text-gray-600 block mb-1">Product images (optional)</label>
              <input type="file" accept="image/*" multiple
                onChange={(e) => setSelectedFiles(e.target.files)}
                className="text-sm" />
            </div>
            <button disabled={uploading} className="bg-black text-white rounded py-2 col-span-2 disabled:opacity-50">
              {uploading ? 'Uploading...' : 'Add Product'}
            </button>
          </form>

          <div className="grid gap-2">
            {products.map((p) => (
              <div key={p.id} className="bg-white border rounded p-3 flex items-center gap-3">
                <div className="w-12 h-12 bg-gray-100 rounded flex-shrink-0 flex items-center justify-center text-xs text-gray-400 overflow-hidden">
                  {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover" /> : 'No img'}
                </div>
                <span>{p.title} — ₹{p.price} — stock: {p.stock}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'orders' && (
        <div className="grid gap-2">
          {orders.map((item) => (
            <div key={item.id} className="bg-white border rounded p-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{item.product.title} x{item.quantity}</p>
                <p className="text-sm text-gray-500">Ship to: {item.order.shippingAddr}</p>
              </div>
              <select value={item.status} onChange={(e) => updateStatus(item.id, e.target.value)} className="border rounded px-2 py-1">
                <option value="PENDING">Pending</option>
                <option value="PAID">Paid</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
