# AI Nutrition Tracker — Execution Plan

Personal-use web app: log food via text or photo → AI extracts full nutrient profile (macro + micro) → compare against your goals → surface deficiencies → suggest food/supplement fixes.

---

## 1. Core Features (from your idea)

1. **Food logging** — free-text ("2 eggs, toast, coffee with milk") or photo of a meal/plate.
2. **AI parsing (OpenRouter)** — model identifies food items + portions, returns full nutrient breakdown.
3. **Nutrient logging** — persist macro *and* micro values per entry.
4. **Goal comparison** — you set daily/weekly targets; app tracks intake vs. goal.
5. **Deficiency detection** — not just calories/protein/carbs/fat, but vitamins & minerals too.
6. **Supplement suggestions** — when a micronutrient is chronically low.

## 2. Additional Features Worth Adding

- **Confirm-before-save step**: AI parse is shown as an editable form before it's logged — vision/text models will misjudge portions sometimes, and you want a correction loop, not silent bad data.
- **Food-first suggestions before supplements**: e.g. "low on iron this week → try red meat, lentils, spinach" with supplements as a secondary suggestion, not the default.
- **Quick-add / favorites**: save meals you eat often so you're not re-describing "my usual breakfast" every day (also cuts AI costs).
- **Daily/weekly/monthly dashboard** with trend charts per nutrient, not just today's snapshot.
- **Water intake tracking** (simple, but usually paired with nutrition apps).
- **Personalized RDA engine**: targets computed from age, sex, weight, height, activity level rather than one static goal — with manual override.
- **Local nutrient reference cache**: store parsed results per food so identical/similar entries don't re-hit the AI every time (cost + speed).
- **Photo portion calibration**: optionally ask a clarifying question when portion size is ambiguous from an image ("small or large bowl?") instead of guessing silently.
- **Export**: CSV/PDF export of a period, useful if you ever want to bring data to a doctor or dietitian.
- **Streaks/reminders**: gentle nudge if you haven't logged a meal by a certain time.
- **Barcode/label fallback**: for packaged food, let text input include the label's nutrition facts directly (skip AI estimation entirely, more accurate).

## 3. Tech Stack Recommendation

Since it's a solo personal project, optimize for low maintenance over scalability.

| Layer | Recommendation | Why |
|---|---|---|
| Frontend | Next.js (React) | one framework for UI + API routes, easy deploy |
| Backend | Next.js API routes (or a small Express service if you outgrow it) | no separate backend to host |
| Database | Supabase (Postgres) | free tier, built-in auth, storage for images, generous for solo use |
| Auth | Supabase Auth, or skip entirely if it's single-user and privately hosted | less to build |
| Image storage | Supabase Storage | pairs naturally with the DB |
| AI | OpenRouter, calling a vision-capable model for photos and a cheaper text model for text-only entries | lets you swap models without re-architecting |
| Hosting | my personal server, it´s going to be exposed at dinis.webmdee.com/food

## 4. Data Model (sketch)

```
users
  id, email, created_at

goals
  id, user_id, nutrient_key, target_amount, unit, effective_from

food_logs
  id, user_id, logged_at, meal_type, raw_input_text, image_url, ai_model_used

food_log_items
  id, food_log_id, food_name, estimated_portion, confidence

food_log_nutrients
  id, food_log_item_id, nutrient_key, amount, unit

nutrient_reference   -- static RDA table (macros + vitamins + minerals)
  nutrient_key, display_name, unit, default_rda_male, default_rda_female, upper_limit

supplement_catalog
  id, nutrient_key, name, typical_dose, notes
```

## 5. AI Integration Flow (OpenRouter)

1. User submits text or photo.
2. Backend sends a prompt requiring **strict JSON output**: list of food items, estimated portions, and a full nutrient breakdown (calories, protein, carbs, fat, fiber, sugar, sodium, plus vitamins A/C/D/E/K/B-complex and minerals iron/calcium/magnesium/zinc/potassium, etc.).
3. Use a vision-capable model for images, a cheaper/faster text model for plain descriptions — OpenRouter lets you route by request type.
4. Parsed result is shown to the user as an **editable form** (correct portion, add/remove items) before saving.
5. On confirm, nutrients are written to `food_log_nutrients`.
6. A daily aggregation job (or on-the-fly query) sums nutrients and compares to `goals`.
7. Deficiencies trigger a food-first suggestion, and a supplement suggestion if the gap persists over a rolling window (e.g. 7 days), not from a single low day.

## 6. Build Phases

| Phase | Scope |
|---|---|
| 0 — Setup | Repo, Next.js + Supabase project, OpenRouter API key, basic auth |
| 1 — MVP | Text-only logging → AI macro breakdown → manual goals → simple daily dashboard |
| 2 — Micronutrients | Extend AI prompt + schema to full vitamin/mineral set, deficiency flags |
| 3 — Image logging | Add vision model path, portion confirmation UI |
| 4 — Suggestions | Food-first and supplement suggestion engine, rolling-average logic |
| 5 — History & trends | Charts over time, weekly/monthly views |
| 6 — Quality of life | Favorites/quick-add, exports, reminders |
| 7 — Cost/perf polish | Caching repeated foods, model selection tuning, rate limiting |

## 7. Cost & Reliability Notes

- Cache AI results per distinct food description to avoid re-billing for repeats.
- Pick a cheaper OpenRouter model for routine text parsing; reserve stronger/vision models for photos or low-confidence cases.
- Enforce JSON schema in the prompt and validate the response server-side before saving — models occasionally drift from the requested format.

## 8. Disclaimer to Bake Into the App

This tool estimates nutrients via AI and is not a substitute for lab testing or professional advice — worth a small in-app note, especially before showing supplement suggestions, since actual deficiencies should be confirmed with bloodwork and a doctor or dietitian.


## 9. Authentication

There should be a page before everything that is dedicated to basic authentication email + password, being the email dinis@dinis.dinis and the password 1nFwTgvILX!

P.S. all credentials on a .env file
P.P.S. this will be a git repo, so add a .gitignore, etc...