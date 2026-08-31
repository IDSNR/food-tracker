'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Goal = { amount: number; unit: string };
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '/food';

const nutrients = [
  ['calories', 'Calories', 'kcal'], ['protein', 'Protein', 'g'], ['carbs', 'Carbs', 'g'], ['fat', 'Fat', 'g'], ['fiber', 'Fiber', 'g'], ['sugar', 'Sugar', 'g'], ['sodium', 'Sodium', 'mg'],
  ['vitamin_a', 'Vitamin A', 'mcg'], ['vitamin_c', 'Vitamin C', 'mg'], ['vitamin_d', 'Vitamin D', 'mcg'], ['vitamin_e', 'Vitamin E', 'mg'], ['vitamin_k', 'Vitamin K', 'mcg'], ['calcium', 'Calcium', 'mg'], ['iron', 'Iron', 'mg'], ['magnesium', 'Magnesium', 'mg'], ['zinc', 'Zinc', 'mg'], ['potassium', 'Potassium', 'mg'], ['vitamin_b12', 'Vitamin B12', 'mcg'], ['folate', 'Folate', 'mcg'],
];

async function getNutrition(userId: number) {
  const response = await fetch(`${basePath}/api/nutrition?userId=${userId}`);
  const text = await response.text();
  if (!text) throw new Error(`Server returned an empty response (${response.status})`);
  const data = JSON.parse(text);
  if (!response.ok || !data.ok) throw new Error(data.error ?? 'Could not load settings');
  return data;
}

export default function SettingsPage() {
  const router = useRouter();
  const [goals, setGoals] = useState<Record<string, Goal>>({});
  const [dark, setDark] = useState(false);
  const [message, setMessage] = useState('');
  const [userId, setUserId] = useState<number>(1);
  const [catalogOptions, setCatalogOptions] = useState<string[]>([]);
  const [catalogForm, setCatalogForm] = useState({
    name: '',
    portion: '1 serving',
    category: 'Fruit',
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
    sodium: 0,
    customCategory: '',
  });

  const loadCatalogOptions = async () => {
    try {
      const response = await fetch(`${basePath}/api/catalog`);
      const data = await response.json();
      const categories = Array.isArray(data.categories) && data.categories.length ? data.categories : ['Fruit', 'Protein', 'Vegetable', 'Grain', 'Dairy', 'Custom'];
      setCatalogOptions(categories);
      setCatalogForm((current) => ({ ...current, category: categories.includes(current.category) ? current.category : categories[0] ?? 'Fruit' }));
    } catch {
      setCatalogOptions(['Fruit', 'Protein', 'Vegetable', 'Grain', 'Dairy', 'Custom']);
    }
  };

  useEffect(() => {
    const storedUserId = typeof window !== 'undefined' ? Number(window.localStorage.getItem('food_indicator_user_id') ?? '1') : 1;
    setUserId(storedUserId || 1);
    if (typeof window === 'undefined') return;
    if (window.localStorage.getItem('food_indicator_auth') !== 'true') { router.replace('/login'); return; }
    const savedTheme = window.localStorage.getItem('food_indicator_theme') === 'dark';
    setDark(savedTheme);
    document.documentElement.classList.toggle('dark', savedTheme);
    const activeUserId = Number(window.localStorage.getItem('food_indicator_user_id') ?? '1');
    setUserId(activeUserId || 1);
    getNutrition(activeUserId || 1).then((data) => setGoals(data.goals)).catch((error) => setMessage(error.message));
    loadCatalogOptions();
  }, [router]);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    localStorage.setItem('food_indicator_theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  const saveGoals = async (key: string, amount: number, unit: string) => {
    const next = { ...goals, [key]: { amount, unit } };
    setGoals(next);
    try {
      const response = await fetch(`${basePath}/api/nutrition`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, goals: next }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Could not save goal');
      setMessage('Saved');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save goal'); }
  };

  const saveCatalogItem = async () => {
    const category = catalogForm.customCategory.trim() || catalogForm.category;
    if (!catalogForm.name.trim()) {
      setMessage('Food name is required.');
      return;
    }

    try {
      const payload = {
        name: catalogForm.name.trim(),
        portion: catalogForm.portion || '1 serving',
        category,
        nutrients: {
          calories: Number(catalogForm.calories) || 0,
          protein: Number(catalogForm.protein) || 0,
          carbs: Number(catalogForm.carbs) || 0,
          fat: Number(catalogForm.fat) || 0,
          fiber: Number(catalogForm.fiber) || 0,
          sugar: Number(catalogForm.sugar) || 0,
          sodium: Number(catalogForm.sodium) || 0,
          vitamin_a: 0, vitamin_c: 0, vitamin_d: 0, vitamin_e: 0, vitamin_k: 0,
          calcium: 0, iron: 0, magnesium: 0, zinc: 0, potassium: 0, vitamin_b12: 0, folate: 0,
        },
      };

      const response = await fetch(`${basePath}/api/catalog`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ item: payload }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error ?? 'Could not save food item');
      setMessage('Food item saved to catalog');
      setCatalogForm({
        name: '',
        portion: '1 serving',
        category: catalogOptions[0] ?? 'Fruit',
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        customCategory: '',
      });
      await loadCatalogOptions();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save food item');
    }
  };

  return <main className="min-h-screen px-4 py-8 text-slate-800 dark:text-slate-100 md:px-8"><div className="mx-auto max-w-3xl space-y-6">
    <header className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">Settings</p><h1 className="mt-2 text-3xl font-black">Your nutrition targets</h1></div><button onClick={() => router.push('/')} className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">Back to dashboard</button></header>
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900/80"><div className="flex items-center justify-between"><div><h2 className="text-xl font-bold">Appearance</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Choose the display theme for this device.</p></div><button onClick={toggleTheme} aria-label="Toggle dark mode" className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold dark:border-slate-600 dark:bg-slate-800">{dark ? 'Dark mode' : 'Light mode'}</button></div></section>
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900/80"><h2 className="text-xl font-bold">Daily configuration</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Set targets for every macro and micronutrient. Changes save automatically.</p><div className="mt-5 grid gap-3 sm:grid-cols-2">{nutrients.map(([key, label, unit]) => <label key={key} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><span>{label} <span className="text-xs text-slate-400">({unit})</span></span><input type="number" min="0" step="any" value={goals[key]?.amount ?? 0} onChange={(event) => saveGoals(key, Number(event.target.value), unit)} className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right dark:border-slate-600 dark:bg-slate-900" /></label>)}</div></section>
    <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 shadow-soft dark:border-slate-700 dark:bg-slate-900/80"><h2 className="text-xl font-bold">Food catalog editor</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Add new items to the quick-add list and choose the category they belong to.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="block text-xs text-slate-600 dark:text-slate-300 sm:col-span-2"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Food name</span><input value={catalogForm.name} onChange={(event) => setCatalogForm({ ...catalogForm, name: event.target.value })} placeholder="Food name" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Portion</span><input value={catalogForm.portion} onChange={(event) => setCatalogForm({ ...catalogForm, portion: event.target.value })} placeholder="Portion" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Category</span><select value={catalogForm.category} onChange={(event) => setCatalogForm({ ...catalogForm, category: event.target.value })} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"><option value="">Choose category</option>{catalogOptions.map((category) => <option key={category} value={category}>{category}</option>)}</select></label><label className="block text-xs text-slate-600 dark:text-slate-300 sm:col-span-2"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">New category</span><input value={catalogForm.customCategory} onChange={(event) => setCatalogForm({ ...catalogForm, customCategory: event.target.value })} placeholder="New category" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Calories (kcal)</span><input type="number" value={catalogForm.calories} onChange={(event) => setCatalogForm({ ...catalogForm, calories: Number(event.target.value) })} placeholder="Calories" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Protein (g)</span><input type="number" value={catalogForm.protein} onChange={(event) => setCatalogForm({ ...catalogForm, protein: Number(event.target.value) })} placeholder="Protein" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Carbs (g)</span><input type="number" value={catalogForm.carbs} onChange={(event) => setCatalogForm({ ...catalogForm, carbs: Number(event.target.value) })} placeholder="Carbs" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Fat (g)</span><input type="number" value={catalogForm.fat} onChange={(event) => setCatalogForm({ ...catalogForm, fat: Number(event.target.value) })} placeholder="Fat" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Fiber (g)</span><input type="number" value={catalogForm.fiber} onChange={(event) => setCatalogForm({ ...catalogForm, fiber: Number(event.target.value) })} placeholder="Fiber" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Sugar (g)</span><input type="number" value={catalogForm.sugar} onChange={(event) => setCatalogForm({ ...catalogForm, sugar: Number(event.target.value) })} placeholder="Sugar" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label><label className="block text-xs text-slate-600 dark:text-slate-300"><span className="mb-1 block font-semibold text-slate-700 dark:text-slate-200">Sodium (mg)</span><input type="number" value={catalogForm.sodium} onChange={(event) => setCatalogForm({ ...catalogForm, sodium: Number(event.target.value) })} placeholder="Sodium" className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800" /></label></div><button onClick={saveCatalogItem} className="mt-5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white">Add to food catalog</button>{message && <p className="mt-4 text-sm text-brand-700">{message}</p>}</section>
  </div></main>;
}
