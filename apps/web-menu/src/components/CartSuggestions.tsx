'use client';

import { useEffect, useState } from 'react';
import { formatCurrency } from '@/lib/utils';
import { Plus, Sparkles } from 'lucide-react';

interface SuggestedItem {
  menuItemId: string;
  name: string;
  price: number;
  imageUrl: string | null;
}

interface CartSuggestionsProps {
  slug: string;
  cartItemIds: string[];
  onAdd: (item: SuggestedItem) => void;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function CartSuggestions({ slug, cartItemIds, onAdd }: CartSuggestionsProps) {
  const [items, setItems] = useState<SuggestedItem[]>([]);

  useEffect(() => {
    if (cartItemIds.length === 0) {
      setItems([]);
      return;
    }

    const ids = cartItemIds.join(',');
    fetch(`${API_URL}/api/public/${encodeURIComponent(slug)}/suggestions?itemIds=${encodeURIComponent(ids)}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setItems(res.data.filter((d: SuggestedItem) => d && !cartItemIds.includes(d.menuItemId)));
        }
      })
      .catch(() => {});
  }, [slug, cartItemIds.join(',')]);

  if (items.length === 0) return null;

  return (
    <div className="px-4 pb-3">
      <p className="text-xs font-semibold text-gray-500 mb-2 flex items-center gap-1">
        <Sparkles size={12} className="text-amber-500" />
        Combina com seu pedido
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {items.map((item) => (
          <button
            key={item.menuItemId}
            onClick={() => onAdd(item)}
            className="flex-shrink-0 bg-gray-50 hover:bg-gray-100 rounded-lg p-2 flex items-center gap-2 border transition w-48"
          >
            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-10 h-10 rounded-md object-cover"
              />
            )}
            <div className="flex-1 text-left min-w-0">
              <p className="text-xs font-medium text-gray-800 truncate">{item.name}</p>
              <p className="text-xs text-brand-600 font-semibold">{formatCurrency(item.price)}</p>
            </div>
            <Plus size={14} className="text-brand-500 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}
