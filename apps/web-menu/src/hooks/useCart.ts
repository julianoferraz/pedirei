'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import type { MenuItem } from '@/lib/api';

interface CartItem extends MenuItem {
  quantity: number;
  notes?: string;
}

interface CartStore {
  items: CartItem[];
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clear: () => void;
  total: number;
  count: number;
}

// Simple cart state (could be zustand in production)
let cartItems: CartItem[] = [];
let listeners: Array<() => void> = [];

function notify() {
  listeners.forEach((l) => l());
}

export function useCart(): CartStore {
  const [, setTick] = useState(0);

  // Subscribe to changes
  if (typeof window !== 'undefined') {
    const forceUpdate = () => setTick((t) => t + 1);
    if (!listeners.includes(forceUpdate)) {
      listeners.push(forceUpdate);
    }
  }

  const addItem = (item: MenuItem) => {
    const existing = cartItems.find((c) => c.id === item.id);
    if (existing) {
      existing.quantity += 1;
    } else {
      cartItems.push({ ...item, quantity: 1 });
    }
    notify();
  };

  const removeItem = (id: string) => {
    cartItems = cartItems.filter((c) => c.id !== id);
    notify();
  };

  const updateQuantity = (id: string, qty: number) => {
    if (qty <= 0) {
      removeItem(id);
      return;
    }
    const item = cartItems.find((c) => c.id === id);
    if (item) {
      item.quantity = qty;
      notify();
    }
  };

  const clear = () => {
    cartItems = [];
    notify();
  };

  const total = cartItems.reduce((sum, c) => sum + c.price * c.quantity, 0);
  const count = cartItems.reduce((sum, c) => sum + c.quantity, 0);

  return {
    items: [...cartItems],
    addItem,
    removeItem,
    updateQuantity,
    clear,
    total,
    count,
  };
}
