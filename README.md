# AI Nutrition Tracker

A single-user nutrition tracker built with Next.js, Tailwind, OpenRouter, and PostgreSQL.

## Features

- Email/password login screen
- OpenRouter meal analysis with a strict nutrient JSON contract
- Editable confirmation step before a meal is saved
- PostgreSQL persistence for meals, macro/micronutrients, goals, water, and cached analyses
- Daily macro progress plus vitamin and mineral totals
- Persistent goals, water logging, meal deletion, and a professional-advice disclaimer

## Local setup

1. Install dependencies:
   npm install
2. Copy environment variables and set `PG_URL` plus `OPENROUTER_API_KEY`:
   cp .env.example .env.local
3. Run the app:
   npm run dev
4. Open http://localhost:3014

## Default credentials

- Email: dinis@dinis.dinis
- Password: 1nFwTgvILX!

## Notes

The app uses PostgreSQL directly through `pg`; the required tables are created on the first API request. The parser caches normalized text inputs in `nutrient_cache` to avoid repeated OpenRouter charges.

Photo uploads, Supabase Storage, favorites, exports, reminders, and rolling seven-day deficiency/supplement recommendations are not yet implemented. The current micronutrient panel reports saved totals and does not diagnose deficiencies.
