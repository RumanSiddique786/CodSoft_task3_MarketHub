'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCurrentUser, logout } from '@/lib/api';

export default function AuthNav() {
  const router = useRouter();
  const [user, setUser] = useState<any>(undefined);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLogout = () => {
    logout();
    // Full page reload (not router.push) so every component's in-memory state
    // — cart, dashboards, cached user data — resets cleanly, avoiding the kind
    // of stale-token race that happens when switching accounts without this.
    window.location.href = '/login';
  };

  if (user === undefined) return null; // avoid hydration mismatch, same trick as the dashboards

  if (!user) {
    return null; // Login/Register links already shown elsewhere in the nav
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500">({user.role.toLowerCase()}) {user.email}</span>
      <button onClick={handleLogout} className="text-sm underline">Logout</button>
    </div>
  );
}
