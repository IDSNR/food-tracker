'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { defaultFoodCatalog, type FoodCatalogItem } from '@/lib/foodCatalog';

type Nutrients = Record<string, number>;
type Entry = { id: number; user_id?: number; meal_name: string; meal_type: string; raw_input: string; nutrients: Nutrients; created_at: string };
type Goal = { amount: number; unit: string };
type Draft = { name: string; portion: string; nutrients: Nutrients };
type CatalogItem = { id?: number; name: string; portion: string; category: string; nutrients: Nutrients };
type User = { id: number; email: string; display_name: string; spend_usd?: number; request_count?: number; input_tokens_total?: number; output_tokens_total?: number };
type Recommendation = { name: string; portion: string; category: string; score: number; nutrients: Nutrients };

const macros = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
const micros = ['vitamin_a', 'vitamin_c', 'vitamin_d', 'vitamin_e', 'vitamin_k', 'calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'vitamin_b12', 'folate'];
const labels: Record<string, string> = { calories: 'Calories', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', fiber: 'Fiber', sugar: 'Sugar', sodium: 'Sodium', vitamin_a: 'Vitamin A', vitamin_c: 'Vitamin C', vitamin_d: 'Vitamin D', vitamin_e: 'Vitamin E', vitamin_k: 'Vitamin K', calcium: 'Calcium', iron: 'Iron', magnesium: 'Magnesium', zinc: 'Zinc', potassium: 'Potassium', vitamin_b12: 'Vitamin B12', folate: 'Folate' };
const units: Record<string, string> = { calories: 'kcal', sodium: 'mg', vitamin_a: 'mcg', vitamin_d: 'mcg', vitamin_k: 'mcg', calcium: 'mg', iron: 'mg', magnesium: 'mg', zinc: 'mg', potassium: 'mg', vitamin_b12: 'mcg', folate: 'mcg' };
const nutrientDisplayNames: Record<string, string> = Object.fromEntries(Object.entries(labels).map(([key, label]) => [key, `${label} (${units[key] ?? 'g'})`]));
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/food';

function productNutrients(item: Partial<Record<string, number>> | undefined, factor = 1): Nutrients {
  return Object.fromEntries([...(Object.keys(labels)), ...microNames()].map((key) => {
    const value = Number(item?.[key] ?? 0) * factor;
    return [key, Number.isFinite(value) ? value : 0];
  }));
}

function microNames() {
  return micros;
}

async function api(path: string, options?: RequestInit) {
  const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...options?.headers } });
  const body = await response.text();
  if (!body) throw new Error(`Server returned an empty response (${response.status})`);
  let data: { ok?: boolean; error?: string; [key: string]: unknown };
  try { data = JSON.parse(body); } catch { throw new Error(`Server returned invalid JSON (${response.status})`); }
  if (!response.ok || !data.ok) throw new Error(data.error ?? 'Request failed');
  return data;
}

export default function Home() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [currentUserId, setCurrentUserId] = useState<number | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [goals, setGoals] = useState<Record<string, Goal>>({});
  const [text, setText] = useState('');
  const [image, setImage] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>(defaultFoodCatalog as CatalogItem[]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [customFood, setCustomFood] = useState({ name: '', portion: '1 serving', category: 'Custom', protein: 0, carbs: 0, fat: 0, calories: 0, fiber: 0 });
  const [recommendation, setRecommendation] = useState<{ chosen: { name: string; portion: string; nutrients: Nutrients; reason: string }; recommendations: Recommendation[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refreshUsers = async () => {
    try {
      const data = await api(`${basePath}/api/users`);
      setUsers(data.users as User[]);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    const storedAuth = localStorage.getItem('food_indicator_auth') === 'true';
    const storedUserId = Number(localStorage.getItem('food_indicator_user_id') ?? '1') || 1;

    if (!storedAuth) {
      localStorage.setItem('food_indicator_auth', 'true');
      localStorage.setItem('food_indicator_user_id', String(storedUserId));
    }

    document.documentElement.classList.toggle('dark', localStorage.getItem('food_indicator_theme') === 'dark');
    setCurrentUserId(storedUserId);
    setLoading(true);

    refreshUsers();
  }, [router]);

  const currentUserSpend = useMemo(() => {
    const activeUser = users.find((user) => Number(user.id) === currentUserId) ?? users.find((user) => Number(user.id) === (currentUserId ?? 1)) ?? users[0];
    return Number(activeUser?.spend_usd ?? 0);
  }, [currentUserId, users]);

  useEffect(() => {
    if (!currentUserId) return;
    setLoading(true);
    Promise.all([
      api(`${basePath}/api/nutrition?date=${selectedDate}&userId=${currentUserId}`),
      api(`${basePath}/api/catalog?search=${encodeURIComponent(catalogSearch)}`),
    ])
      .then(([nutritionData, catalogData]) => {
        setEntries(nutritionData.entries as Entry[]);
        setGoals(nutritionData.goals as Record<string, Goal>);
        setCatalog((catalogData.items as CatalogItem[]).length ? (catalogData.items as CatalogItem[]) : (defaultFoodCatalog as CatalogItem[]));
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : 'Could not load your data'))
      .finally(() => setLoading(false));
  }, [currentUserId, selectedDate, catalogSearch]);

  const totals = useMemo(() => entries.reduce((sum, entry) => {
    for (const [key, value] of Object.entries(entry.nutrients ?? {})) sum[key] = (sum[key] ?? 0) + Number(value || 0);
    return sum;
  }, {} as Nutrients), [entries]);

  const loadRecommendation = async (askAi = false) => {
    if (!currentUserId) return;
    setBusy(true);
    try {
      const data = await api(`${basePath}/api/recommend?date=${selectedDate}&userId=${currentUserId}&askAi=${String(askAi)}`);
      setRecommendation(data as { chosen: { name: string; portion: string; nutrients: Nutrients; reason: string }; recommendations: Recommendation[] });
      setMessage(askAi ? 'AI meal suggestion ready' : 'Best item suggestion ready');
      await refreshUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not generate a recommendation');
    } finally {
      setBusy(false);
    }
  };

  const parseMeal = async () => {
    if (!text.trim() && !image) return;
    setBusy(true); setMessage('');
    try {
      const data = await api(`${basePath}/api/parse`, { method: 'POST', body: JSON.stringify({ userId: currentUserId ?? 1, text, image }) });
      const result = data.result as { name?: string; portion?: string; nutrients?: Nutrients };
      setDraft({
        name: result.name ?? 'Meal',
        portion: result.portion ?? '1 serving',
        nutrients: result.nutrients ?? {},
      });
      await refreshUsers();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not parse meal'); }
    finally { setBusy(false); }
  };

  const saveDraft = async () => {
    if (!draft || !currentUserId) return;
    setBusy(true);
    try {
      const data = await api(`${basePath}/api/nutrition`, { method: 'POST', body: JSON.stringify({ userId: currentUserId, meal: { name: draft.name, rawInput: text, imageUrl: image || null, loggedAt: `${selectedDate}T12:00:00` }, nutrients: draft.nutrients }) });
      setEntries((current) => [data.entry as Entry, ...current]);
      setDraft(null); setText(''); setImage(''); setMessage('Meal saved');
      await loadRecommendation();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save meal'); }
    finally { setBusy(false); }
  };

  const removeEntry = async (id: number) => {
    if (!currentUserId) return;
    try { await api(`${basePath}/api/nutrition?id=${id}&userId=${currentUserId}`, { method: 'DELETE' }); setEntries((current) => current.filter((entry) => entry.id !== id)); } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not remove meal'); }
  };

  const addQuickFood = (item: CatalogItem) => {
    setDraft({
      name: item.name,
      portion: item.portion,
      nutrients: { ...item.nutrients },
    });
    setMessage(`${item.name} added to review.`);
  };

  const addCustomFood = async () => {
    if (!customFood.name.trim()) return;
    const payload = {
      name: customFood.name.trim(),
      portion: customFood.portion || '1 serving',
      category: customFood.category || 'Custom',
      nutrients: {
        calories: Number(customFood.calories) || 0,
        protein: Number(customFood.protein) || 0,
        carbs: Number(customFood.carbs) || 0,
        fat: Number(customFood.fat) || 0,
        fiber: Number(customFood.fiber) || 0,
        sugar: 0,
        sodium: 0,
        vitamin_a: 0,
        vitamin_c: 0,
        vitamin_d: 0,
        vitamin_e: 0,
        vitamin_k: 0,
        calcium: 0,
        iron: 0,
        magnesium: 0,
        zinc: 0,
        potassium: 0,
        vitamin_b12: 0,
        folate: 0,
      },
    };

    try {
      const data = await api(`${basePath}/api/catalog`, { method: 'POST', body: JSON.stringify({ item: payload }) });
      const newItem = data.item as CatalogItem;
      setCatalog((current) => [newItem, ...current.filter((item) => item.name !== newItem.name)]);
      addQuickFood(newItem);
      setCustomFood({ name: '', portion: '1 serving', category: 'Custom', protein: 0, carbs: 0, fat: 0, calories: 0, fiber: 0 });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save food item');
    }
  };

  const logout = () => {
    localStorage.removeItem('food_indicator_auth');
    localStorage.removeItem('food_indicator_user_id');
    router.replace('/login');
  };

  const currentUser = users.find((user) => Number(user.id) === currentUserId) ?? { id: currentUserId ?? 1, email: 'default', display_name: 'Current User' };

  return <main className="min-h-screen px-4 py-8 text-slate-800 md:px-8"><div className="mx-auto max-w-7xl space-y-8">
    <header className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-soft backdrop-blur-md"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">AI Nutrition Tracker</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Your nutrition, grounded in your data</h1><p className="mt-2 text-sm text-slate-500">{entries.length} meals logged on {selectedDate === new Date().toISOString().slice(0, 10) ? 'today' : selectedDate}</p></div><div className="flex flex-wrap items-center gap-2"><button aria-label="Previous day" onClick={() => setSelectedDate((current) => { const date = new Date(`${current}T12:00:00`); date.setDate(date.getDate() - 1); return date.toISOString().slice(0, 10); })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg">‹</button><div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"><input aria-label="Selected day" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="text-sm outline-none" />{selectedDate === new Date().toISOString().slice(0, 10) && <span className="rounded-full bg-brand-100 px-2 py-1 text-xs font-semibold text-brand-800">Today</span>}</div><button aria-label="Next day" onClick={() => setSelectedDate((current) => { const date = new Date(`${current}T12:00:00`); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); })} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg">›</button><div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">$ {currentUserSpend.toFixed(4)} OpenRouter · {currentUser.display_name}</div><select value={currentUserId ?? 1} onChange={(event) => { const nextUserId = Number(event.target.value); localStorage.setItem('food_indicator_user_id', String(nextUserId)); setCurrentUserId(nextUserId); }} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"><option value={1}>Default User</option>{users.filter((user) => user.id !== 1).map((user) => <option key={user.id} value={user.id}>{user.display_name}</option>)}</select><a href={`${basePath}/settings`} aria-label="Open settings" title="Settings" className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-lg">⚙</a><button onClick={logout} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium">Log out</button></div></div></header>
    <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">OpenRouter spend</h2><span className="text-sm text-slate-500">Per-user request ledger</span></div><div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead><tr className="border-b border-slate-200 text-slate-600"><th className="px-3 py-2 font-semibold">User</th><th className="px-3 py-2 font-semibold">Email</th><th className="px-3 py-2 font-semibold">Requests</th><th className="px-3 py-2 font-semibold">Input</th><th className="px-3 py-2 font-semibold">Output</th><th className="px-3 py-2 font-semibold">Cost</th></tr></thead><tbody>{users.map((user) => <tr key={user.id} className="border-b border-slate-100 last:border-0"><td className="px-3 py-2 font-medium text-slate-800">{user.display_name}</td><td className="px-3 py-2 text-slate-600">{user.email}</td><td className="px-3 py-2 text-slate-700">{user.request_count ?? 0}</td><td className="px-3 py-2 text-slate-700">{user.input_tokens_total ?? 0}</td><td className="px-3 py-2 text-slate-700">{user.output_tokens_total ?? 0}</td><td className="px-3 py-2 font-semibold text-amber-700">$ {Number(user.spend_usd ?? 0).toFixed(6)}</td></tr>)}</tbody></table></div></div>
    {message && <p className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">{message}</p>}
    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]"><div className="space-y-6">
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Add a meal</h2><span className="text-sm text-slate-500">Logged for {currentUser.display_name}</span></div><div className="flex flex-col gap-3 md:flex-row"><input value={text} onChange={(event) => setText(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') parseMeal(); }} placeholder="Describe a meal, e.g. 2 eggs, toast, coffee with milk" className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-brand-400 focus:bg-white" /><label className="cursor-pointer rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium"><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 6 * 1024 * 1024) { setMessage('Choose an image smaller than 6 MB.'); return; } const reader = new FileReader(); reader.onload = () => setImage(String(reader.result)); reader.readAsDataURL(file); }} />{image ? 'Photo ready' : 'Take food photo'}</label><button disabled={busy} onClick={parseMeal} className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Working...' : 'Analyze meal'}</button></div>{image && <div className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3"><img src={image} alt="Selected food" className="h-20 w-20 rounded-xl object-cover" /><div className="text-sm"><p className="font-semibold">Photo attached</p><p className="text-slate-500">Your written details will be sent with this image.</p></div><button onClick={() => setImage('')} className="ml-auto text-xs text-slate-500 hover:text-red-600">Remove</button></div>}<p className="mt-3 text-xs text-slate-500">AI estimates are reviewed before they are saved.</p></div>
      {draft && <div className="rounded-3xl border-2 border-brand-200 bg-brand-50/50 p-5 shadow-soft"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-widest text-brand-700">Review before saving</p><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} className="mt-2 bg-transparent text-xl font-bold outline-none" /></div><button onClick={() => setDraft(null)} className="text-sm text-slate-500">Discard</button></div><input value={draft.portion} onChange={(event) => setDraft({ ...draft, portion: event.target.value })} className="mt-3 w-full rounded-xl border border-brand-200 bg-white px-3 py-2 text-sm" /><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">{[...macros, ...micros].map((key) => <label key={key} className="block rounded-xl border border-brand-200 bg-white p-2 text-xs text-slate-600"><span className="mb-1 block font-semibold text-slate-700">{nutrientDisplayNames[key] ?? labels[key]}</span><input type="number" step="any" value={draft.nutrients[key] ?? 0} onChange={(event) => setDraft({ ...draft, nutrients: { ...draft.nutrients, [key]: Number(event.target.value) } })} className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-900" /></label>)}</div><button onClick={saveDraft} disabled={busy} className="mt-5 rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">Confirm and save</button></div>}
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Quick-add foods</h2><span className="text-sm text-slate-500">Search catalog</span></div><div className="mb-4 flex gap-2"><input value={catalogSearch} onChange={(event) => setCatalogSearch(event.target.value)} placeholder="Search banana, apple, beef..." className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /><button onClick={() => setCatalogSearch('')} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">Clear</button></div><div className="grid gap-2 sm:grid-cols-2">{catalog.slice(0, 10).map((item) => <button key={`${item.name}-${item.portion}`} onClick={() => addQuickFood(item)} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left hover:border-brand-300"><div><p className="font-medium">{item.name}</p><p className="text-xs text-slate-500">{item.portion} · {item.category}</p></div><span className="text-xs font-semibold text-brand-700">Add</span></button>)}</div></div>
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Custom food</h2><span className="text-sm text-slate-500">Add to catalog</span></div><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-medium text-slate-600"><span className="mb-1 block text-slate-700">Food name</span><input placeholder="Food name" value={customFood.name} onChange={(event) => setCustomFood({ ...customFood, name: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label><label className="block text-xs font-medium text-slate-600"><span className="mb-1 block text-slate-700">Portion</span><input placeholder="Portion" value={customFood.portion} onChange={(event) => setCustomFood({ ...customFood, portion: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label><label className="block text-xs font-medium text-slate-600"><span className="mb-1 block text-slate-700">Category</span><input placeholder="Category" value={customFood.category} onChange={(event) => setCustomFood({ ...customFood, category: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label><label className="block text-xs font-medium text-slate-600"><span className="mb-1 block text-slate-700">Calories (kcal)</span><input type="number" placeholder="Calories (kcal)" value={customFood.calories} onChange={(event) => setCustomFood({ ...customFood, calories: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label><label className="block text-xs font-medium text-slate-600"><span className="mb-1 block text-slate-700">Protein (g)</span><input type="number" placeholder="Protein (g)" value={customFood.protein} onChange={(event) => setCustomFood({ ...customFood, protein: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label><label className="block text-xs font-medium text-slate-600"><span className="mb-1 block text-slate-700">Carbs (g)</span><input type="number" placeholder="Carbs (g)" value={customFood.carbs} onChange={(event) => setCustomFood({ ...customFood, carbs: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label><label className="block text-xs font-medium text-slate-600"><span className="mb-1 block text-slate-700">Fat (g)</span><input type="number" placeholder="Fat (g)" value={customFood.fat} onChange={(event) => setCustomFood({ ...customFood, fat: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label><label className="block text-xs font-medium text-slate-600"><span className="mb-1 block text-slate-700">Fiber (g)</span><input type="number" placeholder="Fiber (g)" value={customFood.fiber} onChange={(event) => setCustomFood({ ...customFood, fiber: Number(event.target.value) })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm" /></label></div><button onClick={addCustomFood} className="mt-4 rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Save food</button></div>
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft"><div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-bold">Recent meals</h2><span className="text-sm text-slate-500">Persisted in Postgres</span></div>{entries.length === 0 ? <p className="py-8 text-center text-sm text-slate-500">No meals yet. Analyze your first one above.</p> : <div className="space-y-3">{entries.map((entry) => <div key={entry.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between"><div><p className="font-semibold">{entry.meal_name}</p><p className="text-sm text-slate-500">{new Date(entry.created_at).toLocaleString()} · {entry.nutrients.calories ?? 0} kcal · {entry.nutrients.protein ?? 0}g protein</p></div><button onClick={() => removeEntry(entry.id)} className="self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 hover:text-red-600">Remove</button></div>)}</div>}</div>
    </div><aside className="space-y-6"><div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft"><h2 className="mb-5 text-xl font-bold">Today</h2><div className="space-y-4">{macros.map((key) => { const goal = goals[key] ?? { amount: 0, unit: units[key] ?? 'g' }; const value = Math.round((totals[key] ?? 0) * 10) / 10; const progress = goal.amount ? Math.min((value / goal.amount) * 100, 100) : 0; return <div key={key}><div className="flex justify-between text-sm"><span className="font-medium">{nutrientDisplayNames[key] ?? labels[key]}</span><span className="text-slate-500">{value}/{goal.amount} {goal.unit}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-brand-500" style={{ width: `${progress}%` }} /></div></div>; })}</div></div>
      <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft"><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-bold">Food suggestions</h2><div className="flex gap-2"><button onClick={() => loadRecommendation(false)} disabled={busy} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-50">Best item</button><button onClick={() => loadRecommendation(true)} disabled={busy} className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50">Ask AI</button></div></div>{recommendation ? <div className="space-y-4"><div className="rounded-2xl border border-brand-200 bg-brand-50 p-3"><p className="text-xs uppercase tracking-[0.2em] text-brand-700">{recommendation.chosen.reason.toLowerCase().includes('ai') ? 'AI meal' : 'Best item'}</p><p className="mt-2 text-lg font-bold">{recommendation.chosen.name}</p><p className="text-sm text-slate-500">{recommendation.chosen.portion}</p><p className="mt-2 text-sm text-slate-600">{recommendation.chosen.reason}</p></div><div className="space-y-2">{Object.entries(labels).slice(0, 8).map(([key, label]) => { const total = recommendation.chosen.nutrients?.[key] ?? 0; return <div key={key}><div className="flex justify-between text-xs"><span>{label}</span><span>{Math.round(total)} {units[key] ?? 'g'}</span></div><div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(total * 3, 100)}%` }} /></div></div>; })}</div><div className="space-y-2">{recommendation.recommendations.slice(0, 3).map((item) => <div key={item.name} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex items-center justify-between"><span className="font-medium">{item.name}</span><span className="text-xs text-brand-700">{Math.round(item.score)}</span></div><p className="mt-1 text-xs text-slate-500">{item.portion} • {item.category}</p></div>)}</div></div> : <p className="text-sm text-slate-500">Use the best-item algorithm or the AI button to compare meal ideas against today&apos;s gaps.</p>}</div>
    </aside></section>
    <section className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft"><h2 className="text-xl font-bold">Micronutrients</h2><p className="mt-1 text-sm text-slate-500">Summed from your saved meals, not placeholder values.</p><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{micros.map((key) => { const goal = goals[key] ?? { amount: 0, unit: units[key] ?? 'mg' }; const value = Math.round((totals[key] ?? 0) * 10) / 10; const progress = goal.amount ? Math.min(value / goal.amount * 100, 100) : 0; return <div key={key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3"><div className="flex justify-between text-sm"><span>{nutrientDisplayNames[key] ?? labels[key]}</span><span className="font-semibold">{value} / {goal.amount} {goal.unit}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} /></div><p className="mt-1 text-xs text-slate-500">{Math.round(progress)}% of target</p></div>; })}</div><p className="mt-5 text-xs text-slate-500">AI estimates are not lab results. Confirm possible deficiencies with a doctor or dietitian before supplements.</p></section>
  </div></main>;
}
