'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import type { TenantInfo, Category, MenuItem } from '@/lib/api';
import { formatCurrency, getDayShort } from '@/lib/utils';
import { useCart } from '@/hooks/useCart';
import {
  ShoppingCart,
  Clock,
  MapPin,
  Phone,
  ChevronDown,
  Plus,
  Minus,
  X,
  Truck,
  MessageCircle,
  UtensilsCrossed,
} from 'lucide-react';
import CartSuggestions from '@/components/CartSuggestions';

interface Props {
  info: TenantInfo;
  categories: Category[];
}

export default function MenuPage({ info, categories }: Props) {
  const cart = useCart();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const mesa = searchParams.get('mesa');
  const [activeCategory, setActiveCategory] = useState<string>(categories[0]?.id || '');
  const [showCart, setShowCart] = useState(false);
  const [showHours, setShowHours] = useState(false);
  const categoryRefs = useRef<Record<string, HTMLElement | null>>({});

  const scrollToCategory = (catId: string) => {
    setActiveCategory(catId);
    categoryRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const whatsappLink = info.phone
    ? `https://wa.me/${info.phone.replace(/\D/g, '')}?text=Olá! Gostaria de fazer um pedido.`
    : null;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header / Banner */}
      <header className="relative">
        {info.bannerUrl ? (
          <div
            className="h-48 bg-cover bg-center"
            style={{ backgroundImage: `url(${info.bannerUrl})` }}
          >
            <div className="absolute inset-0 bg-black/40" />
          </div>
        ) : (
          <div className="h-48 bg-gradient-to-br from-brand-500 to-brand-700" />
        )}

        <div className="absolute bottom-0 left-0 right-0 translate-y-1/2 px-4">
          <div className="max-w-lg mx-auto flex items-end gap-4">
            {info.logoUrl ? (
              <img
                src={info.logoUrl}
                alt={info.name}
                className="w-20 h-20 rounded-xl border-4 border-white shadow-lg object-cover bg-white"
              />
            ) : (
              <div className="w-20 h-20 rounded-xl border-4 border-white shadow-lg bg-brand-500 flex items-center justify-center text-white text-2xl font-bold">
                {info.name[0]}
              </div>
            )}
            <div className="pb-2">
              <h1 className="text-xl font-bold text-white drop-shadow-lg">{info.name}</h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  info.isOpen ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {info.isOpen ? '🟢 Aberto' : '🔴 Fechado'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 pt-14 space-y-4">
        {/* Table banner */}
        {mesa && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3">
            <UtensilsCrossed size={20} className="text-indigo-600 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-indigo-800">🍽️ Mesa {mesa}</p>
              <p className="text-xs text-indigo-600">Faça seu pedido direto da mesa!</p>
            </div>
          </div>
        )}

        {/* Info bar */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-2">
          {info.description && (
            <p className="text-sm text-gray-600">{info.description}</p>
          )}

          <div className="flex flex-wrap gap-3 text-xs text-gray-500">
            {info.estimatedDeliveryMin && (
              <span className="flex items-center gap-1">
                <Truck size={14} /> {info.estimatedDeliveryMin} min
              </span>
            )}
            {info.minimumOrder && info.minimumOrder > 0 && (
              <span>Pedido mín: {formatCurrency(info.minimumOrder)}</span>
            )}
            <button
              onClick={() => setShowHours(!showHours)}
              className="flex items-center gap-1 text-brand-600 hover:underline"
            >
              <Clock size={14} /> Horários <ChevronDown size={12} />
            </button>
            {info.address && (
              <span className="flex items-center gap-1">
                <MapPin size={14} /> {info.city}, {info.state}
              </span>
            )}
          </div>

          {showHours && (
            <div className="mt-2 border-t pt-2 text-xs text-gray-500 grid grid-cols-2 gap-1">
              {info.operatingHours.map((h) => (
                <div key={h.dayOfWeek} className="flex justify-between">
                  <span>{getDayShort(h.dayOfWeek)}</span>
                  <span>{h.isClosed ? 'Fechado' : `${h.openTime} - ${h.closeTime}`}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Category nav (sticky) */}
        <nav className="sticky top-0 z-10 bg-gray-50 pt-2 pb-1 -mx-4 px-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => scrollToCategory(cat.id)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium transition ${
                  activeCategory === cat.id
                    ? 'bg-brand-500 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-100'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </nav>

        {/* Menu categories */}
        {categories.map((cat) => (
          <section
            key={cat.id}
            ref={(el) => { categoryRefs.current[cat.id] = el; }}
            className="scroll-mt-20"
          >
            <h2 className="text-lg font-bold text-gray-800 mb-3">{cat.name}</h2>
            {cat.description && <p className="text-sm text-gray-500 mb-3">{cat.description}</p>}
            <div className="space-y-3">
              {cat.items
                .filter((i) => i.isActive)
                .map((item) => (
                  <MenuItemCard key={item.id} item={item} onAdd={() => cart.addItem(item)} />
                ))}
            </div>
          </section>
        ))}
      </div>

      {/* Cart FAB */}
      {cart.count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <div className="max-w-lg mx-auto">
            <button
              onClick={() => setShowCart(true)}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white py-3 px-6 rounded-xl font-semibold flex items-center justify-between transition"
            >
              <span className="flex items-center gap-2">
                <ShoppingCart size={20} />
                <span className="bg-white text-brand-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">
                  {cart.count}
                </span>
              </span>
              <span>Ver carrinho</span>
              <span>{formatCurrency(cart.total)}</span>
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp button */}
      {whatsappLink && cart.count === 0 && (
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 bg-green-500 hover:bg-green-600 text-white p-4 rounded-full shadow-lg transition"
          title="Pedir via WhatsApp"
        >
          <MessageCircle size={24} />
        </a>
      )}

      {/* Cart drawer */}
      {showCart && (
        <CartDrawer cart={cart} onClose={() => setShowCart(false)} whatsappLink={whatsappLink} slug={slug} mesa={mesa} />
      )}
    </div>
  );
}

// ── Menu Item Card ──────────────────────────────────────────

function MenuItemCard({ item, onAdd }: { item: MenuItem; onAdd: () => void }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm flex gap-3">
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-gray-800 truncate">{item.name}</h3>
        {item.description && (
          <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">{item.description}</p>
        )}
        <p className="text-brand-600 font-bold mt-1">{formatCurrency(item.price)}</p>
      </div>
      <div className="flex flex-col items-end justify-between">
        {item.imageUrl && (
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-20 h-20 rounded-lg object-cover"
          />
        )}
        <button
          onClick={onAdd}
          className="mt-2 bg-brand-500 hover:bg-brand-600 text-white p-1.5 rounded-lg transition"
          aria-label={`Adicionar ${item.name}`}
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

// ── Cart Drawer ─────────────────────────────────────────────

function CartDrawer({
  cart,
  onClose,
  whatsappLink,
  slug,
  mesa,
}: {
  cart: ReturnType<typeof useCart>;
  onClose: () => void;
  whatsappLink: string | null;
  slug: string;
  mesa: string | null;
}) {
  const buildWhatsappOrder = () => {
    let text = '🛒 *Meu Pedido:*\n\n';
    cart.items.forEach((item) => {
      text += `${item.quantity}x ${item.name} — ${formatCurrency(item.price * item.quantity)}\n`;
    });
    text += `\n💰 *Total: ${formatCurrency(cart.total)}*`;
    return whatsappLink?.split('?text=')[0] + '?text=' + encodeURIComponent(text);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[80vh] overflow-y-auto animate-slide-up">
        <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold">🛒 Meu Carrinho</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          {cart.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm truncate">{item.name}</h4>
                <p className="text-brand-600 text-sm font-semibold">
                  {formatCurrency(item.price * item.quantity)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => cart.updateQuantity(item.id, item.quantity - 1)}
                  className="p-1 rounded-lg border hover:bg-gray-50"
                >
                  <Minus size={14} />
                </button>
                <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                <button
                  onClick={() => cart.updateQuantity(item.id, item.quantity + 1)}
                  className="p-1 rounded-lg border hover:bg-gray-50"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* AI-powered suggestions */}
        <CartSuggestions
          slug={slug}
          cartItemIds={cart.items.map((i) => i.id)}
          onAdd={(item) => cart.addItem({ id: item.menuItemId, name: item.name, price: item.price, imageUrl: item.imageUrl || undefined } as any)}
        />

        <div className="sticky bottom-0 bg-white border-t p-4 space-y-3">
          <div className="flex items-center justify-between font-bold text-lg">
            <span>Total:</span>
            <span className="text-brand-600">{formatCurrency(cart.total)}</span>
          </div>

          <a
            href={`/${slug}/checkout${mesa ? `?mesa=${mesa}` : ''}`}
            className="block w-full bg-brand-500 hover:bg-brand-600 text-white text-center py-3 rounded-xl font-semibold transition"
          >
            Finalizar pedido
          </a>

          <a
            href={buildWhatsappOrder()}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-green-500 hover:bg-green-600 text-white text-center py-3 rounded-xl font-semibold transition"
          >
            <MessageCircle size={18} className="inline mr-2" />
            Enviar via WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
