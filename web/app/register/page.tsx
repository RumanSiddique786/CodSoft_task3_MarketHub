'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveAuth } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'CUSTOMER' });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/register', form);
      saveAuth(res.data);
      router.push(form.role === 'VENDOR' ? '/vendor/dashboard' : '/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto bg-white p-6 rounded-lg border space-y-4">
      <h1 className="text-xl font-bold">Create an account</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input className="border rounded px-3 py-2 w-full" placeholder="Full name"
        value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
      <input className="border rounded px-3 py-2 w-full" type="email" placeholder="Email"
        value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
      <input className="border rounded px-3 py-2 w-full" type="password" placeholder="Password"
        value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
      <select className="border rounded px-3 py-2 w-full" value={form.role}
        onChange={(e) => setForm({ ...form, role: e.target.value })}>
        <option value="CUSTOMER">Customer</option>
        <option value="VENDOR">Vendor</option>
      </select>
      <button className="bg-black text-white w-full py-2 rounded">Register</button>
    </form>
  );
}
