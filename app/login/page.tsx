'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/food';

type User = { id: number; email: string; display_name: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('dinis@dinis.dinis');
  const [password, setPassword] = useState('1nFwTgvILX!');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${basePath}/api/users`)
      .then(async (response) => {
        const data = await response.json();
        if (response.ok && data.ok) setUsers(data.users ?? []);
      })
      .catch(() => undefined);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const expectedEmail = process.env.NEXT_PUBLIC_AUTH_EMAIL || 'dinis@dinis.dinis';
    const expectedPassword = process.env.NEXT_PUBLIC_AUTH_PASSWORD || '1nFwTgvILX!';
    const normalizedEmail = email.trim().toLowerCase();
    const aliasEmail = normalizedEmail.includes('@') ? normalizedEmail : `${normalizedEmail}@local`;
    const directProfileMatch = normalizedEmail === 'user_2' || normalizedEmail === 'user_3' || normalizedEmail === 'user_2@local' || normalizedEmail === 'user_3@local';

    if ((email === expectedEmail && password === expectedPassword) || (directProfileMatch && password === 'dinis')) {
      try {
        const profileEmail = directProfileMatch ? aliasEmail : email.trim();
        const response = await fetch(`${basePath}/api/users`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: profileEmail, displayName: directProfileMatch ? (profileEmail.split('@')[0] || 'User') : (email.split('@')[0] || 'User') }) });
        const data = await response.json();
        const userId = Number(data?.user?.id ?? (directProfileMatch ? 0 : 1));
        localStorage.setItem('food_indicator_auth', 'true');
        localStorage.setItem('food_indicator_user_id', String(userId || 1));
        setError('');
        router.push('/');
        return;
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Could not create your profile');
        return;
      }
    }

    setError('Invalid credentials. Please use the provided email and password.');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#edfdf4,_#f8faf8_45%,_#eef3ef)] px-4">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white/80 p-8 shadow-soft backdrop-blur-xl">
        <div className="mb-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-700">Nutrition tracker</p>
          <h1 className="mt-3 text-3xl font-black text-slate-900">Welcome back</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email or username</label>
            <input
              type="text"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:bg-white"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:bg-white"
            />
          </div>

          {users.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Choose profile</label>
              <select value={selectedUserId ?? users[0]?.id ?? 1} onChange={(event) => setSelectedUserId(Number(event.target.value))} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-brand-400 focus:bg-white">
                {users.map((user) => <option key={user.id} value={user.id}>{user.display_name} · {user.email}</option>)}
              </select>
            </div>
          )}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <button
            type="submit"
            className="w-full rounded-2xl bg-brand-600 px-4 py-3 font-semibold text-white transition hover:bg-brand-700"
          >
            Sign in
          </button>
        </form>
      </div>
    </main>
  );
}
