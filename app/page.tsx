'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type MacroKey = 'calories' | 'protein' | 'carbs' | 'fat' | 'fiber';

type FoodEntry = {
  id: number;
  name: string;
  portion: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

type Goal = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
};

const defaultGoals: Goal = {
  calories: 2200,
  protein: 150,
  carbs: 250,
  fat: 70,
  fiber: 30,
};

const starterEntries: FoodEntry[] = [
  { id: 1, name: 'Greek yogurt bowl', portion: '1 bowl', calories: 360, protein: 28, carbs: 25, fat: 12, fiber: 5 },
  { id: 2, name: 'Chicken rice lunch', portion: '1 plate', calories: 620, protein: 46, carbs: 58, fat: 18, fiber: 7 },
  { id: 3, name: 'Salmon salad', portion: '1 serving', calories: 540, protein: 42, carbs: 16, fat: 30, fiber: 9 },
];

const nutrientMeta: Record<MacroKey, { label: string; unit: string; tone: string }> = {
  calories: { label: 'Calories', unit: 'kcal', tone: 'text-amber-600' },
  protein: { label: 'Protein', unit: 'g', tone: 'text-blue-600' },
  carbs: { label: 'Carbs', unit: 'g', tone: 'text-violet-600' },
  fat: { label: 'Fat', unit: 'g', tone: 'text-rose-600' },
  fiber: { label: 'Fiber', unit: 'g', tone: 'text-emerald-600' },
};

function getProgress(nutrient: MacroKey, consumed: number, goal: number) {
  const ratio = goal === 0 ? 0 : Math.min((consumed / goal) * 100, 100);
  return Math.max(ratio, 0);
}

export default function Home() {
  const router = useRouter();
  const [loggedFoods, setLoggedFoods] = useState<FoodEntry[]>(starterEntries);
  const [goals, setGoals] = useState<Goal>(defaultGoals);
  const [foodText, setFoodText] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const authed = localStorage.getItem('food_indicator_auth') === 'true';
    if (!authed) {
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('food_indicator_auth');
    router.replace('/login');
  };

  const totals = useMemo(() => {
    return loggedFoods.reduce(
      (acc, item) => {
        acc.calories += item.calories;
        acc.protein += item.protein;
        acc.carbs += item.carbs;
        acc.fat += item.fat;
        acc.fiber += item.fiber;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
    );
  }, [loggedFoods]);

  const addFood = () => {
    const inputText = foodText.trim();
    if (!inputText) return;

    const tokens = inputText.split(',').map((part) => part.trim()).filter(Boolean);
    const base = tokens.length > 0 ? tokens[0] : 'New meal';

    const nextItem: FoodEntry = {
      id: Date.now(),
      name: base,
      portion: '1 serving',
      calories: Math.max(150, Math.round(Math.random() * 350 + 100)),
      protein: Math.max(10, Math.round(Math.random() * 25 + 15)),
      carbs: Math.max(15, Math.round(Math.random() * 30 + 20)),
      fat: Math.max(8, Math.round(Math.random() * 18 + 8)),
      fiber: Math.max(2, Math.round(Math.random() * 10 + 3)),
    };

    setLoggedFoods((current) => [nextItem, ...current]);
    setFoodText('');
  };

  const removeFood = (id: number) => {
    setLoggedFoods((current) => current.filter((item) => item.id !== id));
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-soft">Checking access…</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-8 text-slate-800 md:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="rounded-3xl border border-slate-200/80 bg-white/80 p-6 shadow-soft backdrop-blur-md">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-700">AI Nutrition Tracker</p>
              <h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">Daily nutrition overview</h1>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">
                Logged today: <span className="font-bold">{loggedFoods.length} meals</span>
              </div>
              <button
                onClick={handleLogout}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row">
                <input
                  value={foodText}
                  onChange={(event) => setFoodText(event.target.value)}
                  placeholder="Describe a meal, e.g. 2 eggs, toast, coffee with milk"
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none ring-0 transition focus:border-brand-400 focus:bg-white"
                />
                <button
                  onClick={addFood}
                  className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
                >
                  Add food
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold">Meals</h2>
                <span className="text-sm text-slate-500">AI confirmation step included in the next phase</span>
              </div>

              <div className="space-y-3">
                {loggedFoods.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{item.name}</p>
                      <p className="text-sm text-slate-500">{item.portion}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-600">
                      <span>{item.calories} kcal</span>
                      <span>•</span>
                      <span>{item.protein}g protein</span>
                      <button
                        onClick={() => removeFood(item.id)}
                        className="ml-2 rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-500 hover:text-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft">
              <h2 className="mb-5 text-xl font-bold">Goals</h2>
              <div className="space-y-4">
                {(Object.keys(nutrientMeta) as MacroKey[]).map((key) => (
                  <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <label className="font-medium text-slate-700">{nutrientMeta[key].label}</label>
                      <span className="text-slate-500">{goals[key]} {nutrientMeta[key].unit}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={key === 'calories' ? 4000 : 300}
                      step={5}
                      value={goals[key]}
                      onChange={(event) =>
                        setGoals((current) => ({ ...current, [key]: Number(event.target.value) }))
                      }
                      className="h-2 w-full cursor-pointer accent-brand-600"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/80 bg-white/80 p-5 shadow-soft">
              <h2 className="mb-5 text-xl font-bold">Progress</h2>
              <div className="space-y-4">
                {(Object.keys(nutrientMeta) as MacroKey[]).map((key) => {
                  const consumed = totals[key];
                  const goal = goals[key];
                  const progress = getProgress(key, consumed, goal);

                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{nutrientMeta[key].label}</span>
                        <span className="text-slate-500">{consumed}/{goal} {nutrientMeta[key].unit}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${key === 'calories' ? 'bg-amber-500' : key === 'protein' ? 'bg-blue-500' : key === 'carbs' ? 'bg-violet-500' : key === 'fat' ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
