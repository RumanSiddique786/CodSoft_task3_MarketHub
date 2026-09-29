'use client';
import { useEffect, useState } from 'react';
import { api, getCurrentUser } from '@/lib/api';

export default function AdminDashboard() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const load = async () => {
    const [v, o] = await Promise.all([
      api.get('/vendors'),
      api.get('/orders/admin/all'),
    ]);
    setVendors(v.data);
    setOrders(o.data);
  };

  useEffect(() => {
    if (user?.role === 'ADMIN') load();
  }, [user]);

  const setStatus = async (id: string, status: string) => {
    await api.patch(`/vendors/${id}/status`, { status });
    load();
  };

  const setCommission = async (id: string, commissionPct: number) => {
    await api.patch(`/vendors/${id}/commission`, { commissionPct });
    load();
  };

  if (user === undefined) {
    return <p>Loading...</p>;
  }

  if (!user || user.role !== 'ADMIN') {
    return <p>Please login as an admin to access this panel.</p>;
  }

  const totalRevenue = orders.reduce((s, o) => s + Number(o.totalAmount), 0);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded p-4"><p className="text-sm text-gray-500">Vendors</p><p className="text-xl font-bold">{vendors.length}</p></div>
        <div className="bg-white border rounded p-4"><p className="text-sm text-gray-500">Orders</p><p className="text-xl font-bold">{orders.length}</p></div>
        <div className="bg-white border rounded p-4"><p className="text-sm text-gray-500">Platform Revenue</p><p className="text-xl font-bold">₹{totalRevenue}</p></div>
      </div>

      <h2 className="font-semibold mb-2">Vendors</h2>
      <div className="grid gap-2 mb-6">
        {vendors.map((v) => (
          <div key={v.id} className="bg-white border rounded p-3 flex justify-between items-center">
            <div>
              <p className="font-medium">{v.storeName} — {v.user?.email}</p>
              <p className="text-sm text-gray-500">Status: {v.status} — Commission: {v.commissionPct}%</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStatus(v.id, 'APPROVED')} className="bg-green-600 text-white px-3 py-1 rounded text-sm">Approve</button>
              <button onClick={() => setStatus(v.id, 'SUSPENDED')} className="bg-red-600 text-white px-3 py-1 rounded text-sm">Suspend</button>
              <input type="number" defaultValue={v.commissionPct}
                onBlur={(e) => setCommission(v.id, Number(e.target.value))}
                className="border rounded px-2 py-1 w-16 text-sm" />
            </div>
          </div>
        ))}
      </div>

      <h2 className="font-semibold mb-2">All Orders</h2>
      <div className="grid gap-2">
        {orders.map((o) => (
          <div key={o.id} className="bg-white border rounded p-3">
            <p className="font-medium">{o.customer?.name} — ₹{o.totalAmount} — {o.status}</p>
            <p className="text-sm text-gray-500">{o.items.length} item(s)</p>
          </div>
        ))}
      </div>
    </div>
  );
}
