'use client';

import { useEffect } from 'react';

export default function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/food/sw.js', { scope: '/food/' }).catch(() => undefined);
    }
  }, []);

  return null;
}
