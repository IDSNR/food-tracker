import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Nutrition Tracker',
    short_name: 'Nutrition',
    description: 'Track meals, calories, macros, and micronutrients.',
    start_url: '/food/',
    scope: '/food/',
    display: 'standalone',
    background_color: '#f5f7f3',
    theme_color: '#2d8b57',
    icons: [
      { src: '/food/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
    ],
  };
}
