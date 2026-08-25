'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('dinis@dinis.dinis');
  const [password, setPassword] = useState('1nFwTgvILX!');
  const [error, setError] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    const expectedEmail = process.env.NEXT_PUBLIC_AUTH_EMAIL || 'dinis@dinis.dinis';
    const expectedPassword = process.env.NEXT_PUBLIC_AUTH_PASSWORD || '1nFwTgvILX!';

    if (email === expectedEmail && password === expectedPassword) {
      localStorage.setItem('food_indicator_auth', 'true');
      setError('');
      router.push('/');
      return;
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
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
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
