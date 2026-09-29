'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, saveAuth } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { email, password });
      saveAuth(res.data);
      const role = res.data.user.role;
      if (role === 'VENDOR') router.push('/vendor/dashboard');
      else if (role === 'ADMIN') router.push('/admin/dashboard');
      else router.push('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto bg-white p-6 rounded-lg border space-y-4">
      <h1 className="text-xl font-bold">Login</h1>
      {error && <p className="text-red-500 text-sm">{error}</p>}
      <input className="border rounded px-3 py-2 w-full" type="email" placeholder="Email"
        value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="border rounded px-3 py-2 w-full" type="password" placeholder="Password"
        value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="bg-black text-white w-full py-2 rounded">Login</button>
      <p className="text-xs text-gray-500">
        Demo logins (after seeding): admin@demo.com / vendor@demo.com / customer@demo.com — password: password123
      </p>
    </form>
  );
}
