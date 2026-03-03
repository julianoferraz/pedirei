'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';

const COLORS = {
  primary: '#0F2B3C',
  secondary: '#1B6B93',
  accent: '#FF6B35',
  accentHover: '#E85A28',
  light: '#F0F7FB',
  green: '#22C55E',
  red: '#EF4444',
  gray: '#64748B',
  darkBg: '#0A1628',
};

function useInView(options = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.15, ...options }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [ref, isInView] as const;
}

function AnimatedSection({
  children,
  className = '',
  delay = 0,
  style = {},
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  const [ref, isInView] = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? 'translateY(0)' : 'translateY(32px)',
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─── ICONS ─────────────────────────────
function IconWhatsapp({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#22C55E" opacity="0.15" />
      <path d="M6 10l3 3 5-5" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconX() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="10" fill="#EF4444" opacity="0.15" />
      <path d="M7 7l6 6M13 7l-6 6" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
function IconBot({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}
function IconChart({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
function IconCreditCard({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}
function IconMenu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </svg>
  );
}
function IconShield({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IconArrowRight({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
function IconChevronDown() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function IconGlobe({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
    </svg>
  );
}

// ─── WHATSAPP CHAT BUBBLE ──────────────
function WaBubble({ from, children, time }: { from: string; children: ReactNode; time: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: from === 'user' ? 'flex-end' : 'flex-start', animation: 'fadeSlideUp 0.35s ease' }}>
      <div
        style={{
          maxWidth: '84%',
          padding: '7px 10px',
          borderRadius: from === 'user' ? '10px 2px 10px 10px' : '2px 10px 10px 10px',
          background: from === 'user' ? '#005C4B' : '#1F2C34',
          color: '#E9EDEF',
          fontSize: 12.5,
          lineHeight: 1.45,
        }}
      >
        {children}
        <div style={{ fontSize: 9.5, color: '#8696A0', textAlign: 'right', marginTop: 2 }}>{time}</div>
      </div>
    </div>
  );
}

function WaHeader({ name, emoji }: { name: string; emoji: string }) {
  return (
    <div style={{ background: '#1F2C34', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B35, #FF9F1C)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
        }}
      >
        {emoji}
      </div>
      <div>
        <div style={{ color: '#E9EDEF', fontSize: 13.5, fontWeight: 600 }}>{name}</div>
        <div style={{ color: '#8696A0', fontSize: 10.5 }}>online</div>
      </div>
    </div>
  );
}

function TypingIndicator({ from = 'bot' }: { from?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: from === 'user' ? 'flex-end' : 'flex-start' }}>
      <div style={{ padding: '10px 16px', borderRadius: 10, background: from === 'user' ? '#005C4B' : '#1F2C34' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: '#8696A0',
                animation: `pulse 1s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PixQrBlock() {
  return (
    <div style={{ background: '#111B21', borderRadius: 8, padding: 10, marginTop: 6, border: '1px solid #2A3942' }}>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        <div
          style={{
            width: 100,
            height: 100,
            background: 'white',
            borderRadius: 6,
            padding: 6,
            display: 'grid',
            gridTemplateColumns: 'repeat(11,1fr)',
            gridTemplateRows: 'repeat(11,1fr)',
            gap: 1,
          }}
        >
          {Array.from({ length: 121 }).map((_, i) => {
            const r = Math.floor(i / 11),
              c = i % 11;
            const isCorner = (r < 3 && c < 3) || (r < 3 && c > 7) || (r > 7 && c < 3);
            const isFilled = isCorner || Math.random() > 0.5;
            return <div key={i} style={{ background: isFilled ? '#0F2B3C' : 'white', borderRadius: 1 }} />;
          })}
        </div>
      </div>
      <div
        style={{
          background: '#0D1418',
          borderRadius: 6,
          padding: '6px 8px',
          fontFamily: 'monospace',
          fontSize: 9,
          color: '#8696A0',
          wordBreak: 'break-all',
          lineHeight: 1.4,
        }}
      >
        00020126580014br.gov.bcb.pix0136a1b2c3d4-e5f6...
      </div>
      <div style={{ fontSize: 9.5, color: '#22C55E', textAlign: 'center', marginTop: 6, fontWeight: 600 }}>
        Escaneie ou copie o código acima
      </div>
    </div>
  );
}

// ─── WHATSAPP DEMO — PEDIDO PELO ZAP ───
function DemoWhatsappOrder() {
  const [step, setStep] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalSteps = 14;

  useEffect(() => {
    if (step < totalSteps) {
      const delays = [800, 1400, 1400, 1200, 1200, 1400, 1200, 1400, 1800, 1600, 2200, 1400, 1800, 1600];
      const t = setTimeout(() => setStep((s) => s + 1), delays[step] || 1400);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setStep(0), 3500);
      return () => clearTimeout(t);
    }
  }, [step]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [step]);

  const msgs: ReactNode[] = [];
  if (step > 0) msgs.push(<WaBubble key="1" from="user" time="19:30">Oi, quero pedir!</WaBubble>);
  if (step > 1)
    msgs.push(
      <WaBubble key="2" from="bot" time="19:30">
        Olá! 👋 Bem-vindo à <b>Pizzaria do João</b>!{'\n\n'}Posso montar seu pedido aqui pelo chat. Temos:{'\n'}🍕 Pizzas
        {'\n'}🍔 Lanches{'\n'}🥤 Bebidas{'\n\n'}O que vai ser hoje?
      </WaBubble>
    );
  if (step > 2) msgs.push(<WaBubble key="3" from="user" time="19:31">Pizza calabresa grande</WaBubble>);
  if (step > 3)
    msgs.push(
      <WaBubble key="4" from="bot" time="19:31">
        ✅ <b>Pizza Calabresa Grande</b> — R$39,90{'\n\n'}Alguma observação? (ex: sem cebola){'\n'}Quer pedir mais alguma coisa?
      </WaBubble>
    );
  if (step > 4) msgs.push(<WaBubble key="5" from="user" time="19:31">Só isso, pode fechar</WaBubble>);
  if (step > 5)
    msgs.push(
      <WaBubble key="6" from="bot" time="19:32">
        📋 <b>Resumo do pedido #254</b>
        {'\n\n'}🍕 Pizza Calabresa G — R$39,90{'\n'}🛵 Taxa de entrega — R$6,00{'\n'}━━━━━━━━━━{'\n'}💰{' '}
        <b>Total: R$45,90</b>
        {'\n\n'}Como quer pagar?{'\n'}1️⃣ Pix automático{'\n'}2️⃣ Cartão na entrega{'\n'}3️⃣ Dinheiro
      </WaBubble>
    );
  if (step > 6) msgs.push(<WaBubble key="7" from="user" time="19:32">Pix</WaBubble>);
  if (step > 7)
    msgs.push(
      <WaBubble key="8" from="bot" time="19:32">
        <div>Pix gerado! Escaneie o QR Code ou copie o código 👇</div>
        <PixQrBlock />
        <div style={{ marginTop: 6 }}>⏱️ Válido por 15 minutos</div>
      </WaBubble>
    );
  if (step > 8)
    msgs.push(
      <WaBubble key="9" from="bot" time="19:33">
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 16 }}>✅</span>
          <b style={{ color: '#22C55E' }}>Pagamento confirmado!</b>
        </div>
        {'\n'}Seu pedido foi enviado para a cozinha.{'\n'}Tempo estimado: 40-50 min 🍕
      </WaBubble>
    );
  if (step > 9) msgs.push(<WaBubble key="10" from="user" time="19:33">Boa, valeu!</WaBubble>);
  if (step > 10)
    msgs.push(
      <WaBubble key="11" from="bot" time="19:34">
        Nós que agradecemos! 😊{'\n'}Qualquer dúvida é só chamar aqui.
      </WaBubble>
    );
  if (step > 11)
    msgs.push(
      <div key="time1" style={{ textAlign: 'center', margin: '8px 0' }}>
        <span style={{ background: '#1F2C34', color: '#8696A0', fontSize: 10, padding: '3px 10px', borderRadius: 6 }}>
          35 min depois
        </span>
      </div>
    );
  if (step > 12)
    msgs.push(
      <WaBubble key="12" from="bot" time="20:08">
        🛵 <b>Seu pedido saiu para entrega!</b>
        {'\n\n'}O entregador já está a caminho.{'\n'}Obrigado pela preferência! 🧡
      </WaBubble>
    );

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 310,
        background: '#0B141A',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}
    >
      <WaHeader name="Pizzaria do João" emoji="🍕" />
      <div
        ref={containerRef}
        style={{
          height: 420,
          padding: '10px 8px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") #0B141A`,
          scrollbarWidth: 'none',
        }}
      >
        {msgs}
        {step < totalSteps && step > 0 && step !== 11 && (
          <TypingIndicator from={[1, 3, 5, 7, 10].includes(step) ? 'user' : 'bot'} />
        )}
      </div>
    </div>
  );
}

// ─── SITE DEMO — PEDIDO PELO SITE ──────
function SiteMockupScreen({ children, url }: { children: ReactNode; url: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 8, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
      <div
        style={{
          background: '#F1F5F9',
          padding: '6px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          borderBottom: '1px solid #E2E8F0',
        }}
      >
        <div style={{ display: 'flex', gap: 4 }}>
          {['#EF4444', '#FBBF24', '#22C55E'].map((c) => (
            <div key={c} style={{ width: 7, height: 7, borderRadius: '50%', background: c, opacity: 0.7 }} />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            background: 'white',
            borderRadius: 4,
            padding: '3px 8px',
            fontSize: 9,
            color: '#94A3B8',
            textAlign: 'center',
            border: '1px solid #E2E8F0',
          }}
        >
          🔒 {url}
        </div>
      </div>
      {children}
    </div>
  );
}

function DemoSiteOrder() {
  const [phase, setPhase] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const totalPhases = 7;

  useEffect(() => {
    if (phase < totalPhases) {
      const delays = [1000, 2200, 2800, 2800, 2400, 2400, 2800];
      const t = setTimeout(() => setPhase((p) => p + 1), delays[phase] || 2000);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => setPhase(0), 3500);
      return () => clearTimeout(t);
    }
  }, [phase]);

  useEffect(() => {
    if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
  }, [phase]);

  // WhatsApp part (bot sends link)
  const waMsgs: ReactNode[] = [];
  if (phase > 0) waMsgs.push(<WaBubble key="s1" from="user" time="20:15">Oi, quero pedir!</WaBubble>);
  if (phase > 1)
    waMsgs.push(
      <WaBubble key="s2" from="bot" time="20:15">
        Olá! 👋 Bem-vindo ao <b>Burger House</b>!{'\n\n'}Separei o cardápio pra você 👇{'\n\n'}🔗{' '}
        <span style={{ color: '#53BDEB', textDecoration: 'underline' }}>burgerhouse.pedirei.online</span>
        {'\n\n'}É só abrir, montar o pedido e finalizar por lá. Rápido e fácil! 😉
      </WaBubble>
    );

  // Site screens
  const renderSiteScreen = () => {
    if (phase < 3) return null;

    if (phase === 3) {
      // Menu screen
      return (
        <SiteMockupScreen url="burgerhouse.pedirei.online">
          <div style={{ padding: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                }}
              >
                🍔
              </div>
              <span style={{ fontWeight: 700, fontSize: 12, color: COLORS.primary }}>Burger House</span>
            </div>
            <div
              style={{
                fontSize: 9,
                color: COLORS.accent,
                fontWeight: 600,
                marginBottom: 6,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              🍔 Hambúrgueres
            </div>
            {(
              [
                ['Smash Burger', 'Pão, 2x blend 80g, cheddar, cebola caramelizada', 'R$ 28,90', '🔥'],
                ['X-Bacon', 'Pão, blend 150g, bacon crocante, queijo, alface', 'R$ 32,90', ''],
                ['Frango Crispy', 'Pão, frango empanado, maionese especial, salada', 'R$ 26,90', ''],
              ] as const
            ).map(([name, desc, price, badge]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  gap: 8,
                  padding: '8px 0',
                  borderBottom: '1px solid #F1F5F9',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  🍔
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.primary }}>
                    {name}{' '}
                    {badge && (
                      <span
                        style={{
                          fontSize: 9,
                          background: '#FEF2F2',
                          color: '#EF4444',
                          padding: '1px 4px',
                          borderRadius: 3,
                        }}
                      >
                        {badge} Popular
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 9, color: COLORS.gray, lineHeight: 1.3 }}>{desc}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginTop: 2 }}>{price}</div>
                </div>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: COLORS.accent,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  +
                </div>
              </div>
            ))}
          </div>
        </SiteMockupScreen>
      );
    }

    if (phase === 4) {
      // Cart screen
      return (
        <SiteMockupScreen url="burgerhouse.pedirei.online/carrinho">
          <div style={{ padding: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 10 }}>🛒 Seu Carrinho</div>
            {(
              [
                ['Smash Burger', '2x', 'R$ 57,80'],
                ['X-Bacon', '1x', 'R$ 32,90'],
              ] as const
            ).map(([name, qty, price]) => (
              <div
                key={name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 0',
                  borderBottom: '1px solid #F1F5F9',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.primary }}>{name}</div>
                  <div style={{ fontSize: 10, color: COLORS.gray }}>{qty}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary }}>{price}</span>
              </div>
            ))}
            <div
              style={{
                marginTop: 8,
                padding: '6px 0',
                borderBottom: '1px solid #E2E8F0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: COLORS.gray,
              }}
            >
              <span>Subtotal</span>
              <span>R$ 90,70</span>
            </div>
            <div
              style={{
                padding: '6px 0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 10,
                color: COLORS.gray,
              }}
            >
              <span>Entrega</span>
              <span>R$ 7,00</span>
            </div>
            <div
              style={{
                padding: '8px 0',
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 13,
                fontWeight: 700,
                color: COLORS.primary,
              }}
            >
              <span>Total</span>
              <span style={{ color: COLORS.accent }}>R$ 97,70</span>
            </div>
            <div
              style={{
                background: COLORS.accent,
                color: 'white',
                textAlign: 'center',
                padding: '8px',
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                marginTop: 6,
              }}
            >
              Finalizar Pedido →
            </div>
          </div>
        </SiteMockupScreen>
      );
    }

    if (phase === 5) {
      // Payment / Pix
      return (
        <SiteMockupScreen url="burgerhouse.pedirei.online/checkout">
          <div style={{ padding: 10, textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: COLORS.primary, marginBottom: 6 }}>
              Pagamento via Pix
            </div>
            <div style={{ fontSize: 10, color: COLORS.gray, marginBottom: 10 }}>
              Escaneie o QR Code para pagar R$ 97,70
            </div>
            <div
              style={{
                width: 80,
                height: 80,
                background: 'white',
                borderRadius: 6,
                padding: 4,
                margin: '0 auto 8px',
                display: 'grid',
                gridTemplateColumns: 'repeat(9,1fr)',
                gridTemplateRows: 'repeat(9,1fr)',
                gap: 1,
                border: '1px solid #E2E8F0',
              }}
            >
              {Array.from({ length: 81 }).map((_, i) => {
                const r = Math.floor(i / 9),
                  c = i % 9;
                const isCorner = (r < 3 && c < 3) || (r < 3 && c > 5) || (r > 5 && c < 3);
                const isFilled = isCorner || Math.random() > 0.45;
                return <div key={i} style={{ background: isFilled ? '#0F2B3C' : 'white', borderRadius: 0.5 }} />;
              })}
            </div>
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: 6,
                padding: '6px 8px',
                fontFamily: 'monospace',
                fontSize: 8,
                color: '#94A3B8',
                wordBreak: 'break-all',
                marginBottom: 8,
              }}
            >
              00020126580014br.gov.bcb.pix...
            </div>
            <div
              style={{
                background: COLORS.secondary,
                color: 'white',
                padding: '6px',
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 600,
              }}
            >
              📋 Copiar código Pix
            </div>
            <div
              style={{ marginTop: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: COLORS.accent,
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <span style={{ fontSize: 9, color: COLORS.gray }}>Aguardando pagamento...</span>
            </div>
          </div>
        </SiteMockupScreen>
      );
    }

    if (phase >= 6) {
      // Confirmation
      return (
        <SiteMockupScreen url="burgerhouse.pedirei.online/pedido/254">
          <div style={{ padding: 12, textAlign: 'center' }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: '#DCFCE7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 8px',
                fontSize: 20,
              }}
            >
              ✅
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: COLORS.primary, marginBottom: 2 }}>
              Pedido Confirmado!
            </div>
            <div style={{ fontSize: 10, color: COLORS.gray, marginBottom: 10 }}>
              Pedido #254 • Pagamento aprovado
            </div>
            <div
              style={{
                background: '#F8FAFC',
                borderRadius: 8,
                padding: 8,
                textAlign: 'left',
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 9, color: COLORS.gray, marginBottom: 4 }}>ITENS</div>
              <div style={{ fontSize: 10, color: COLORS.primary }}>2x Smash Burger — R$57,80</div>
              <div style={{ fontSize: 10, color: COLORS.primary }}>1x X-Bacon — R$32,90</div>
              <div
                style={{
                  borderTop: '1px solid #E2E8F0',
                  marginTop: 6,
                  paddingTop: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                }}
              >
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary }}>Total</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent }}>R$97,70</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center' }}>
              <div
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#22C55E',
                  animation: 'pulse 2s infinite',
                }}
              />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#22C55E' }}>Preparando seu pedido...</span>
            </div>
            <div style={{ fontSize: 9, color: COLORS.gray, marginTop: 4 }}>Tempo estimado: 35-45 min</div>
          </div>
        </SiteMockupScreen>
      );
    }

    return null;
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 310,
        background: '#0B141A',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: '0 20px 50px rgba(0,0,0,0.35)',
        border: '1px solid rgba(255,255,255,0.06)',
        flexShrink: 0,
      }}
    >
      <WaHeader name="Burger House" emoji="🍔" />
      <div
        ref={containerRef}
        style={{
          height: 420,
          padding: '10px 8px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 5,
          background: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.015'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E") #0B141A`,
          scrollbarWidth: 'none',
        }}
      >
        {waMsgs}
        {phase === 1 && <TypingIndicator />}
        {phase >= 3 && (
          <div style={{ margin: '6px 0', animation: 'fadeSlideUp 0.4s ease' }}>{renderSiteScreen()}</div>
        )}
        {phase >= 6 && (
          <WaBubble from="bot" time="20:18">
            ✅ <b>Pagamento confirmado!</b>
            {'\n\n'}Seu pedido #254 foi para a cozinha! 🍔{'\n'}Tempo estimado: 35-45 min{'\n\n'}Obrigado por pedir
            no Burger House! 🧡
          </WaBubble>
        )}
        {phase > 0 && phase < 3 && phase !== 1 && <TypingIndicator from={phase === 0 ? 'user' : 'bot'} />}
      </div>
    </div>
  );
}

// ─── FAQ ITEM ──────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: '1px solid #E2E8F0' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: COLORS.primary, flex: 1, paddingRight: 16 }}>
          {q}
        </span>
        <span
          style={{
            transform: open ? 'rotate(180deg)' : 'rotate(0)',
            transition: 'transform 0.3s ease',
            color: COLORS.gray,
          }}
        >
          <IconChevronDown />
        </span>
      </button>
      <div style={{ maxHeight: open ? 300 : 0, overflow: 'hidden', transition: 'max-height 0.4s ease' }}>
        <p style={{ padding: '0 0 20px', margin: 0, fontSize: 15, color: COLORS.gray, lineHeight: 1.7 }}>{a}</p>
      </div>
    </div>
  );
}

// ─── MAIN ──────────────────────────────
export default function PedireiLanding() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleMobileLink = () => setMobileMenuOpen(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: COLORS.primary, overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100% { opacity: 0.4; } 50% { opacity: 1; } }
        @keyframes float { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .cta-btn { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; background: ${COLORS.accent}; color: white; border: none; border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-decoration: none; font-family: inherit; }
        .cta-btn:hover { background: ${COLORS.accentHover}; transform: translateY(-2px); box-shadow: 0 8px 24px rgba(255,107,53,0.35); }
        .cta-btn-outline { display: inline-flex; align-items: center; gap: 8px; padding: 14px 32px; background: transparent; color: white; border: 2px solid rgba(255,255,255,0.3); border-radius: 12px; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s ease; text-decoration: none; font-family: inherit; }
        .cta-btn-outline:hover { border-color: white; background: rgba(255,255,255,0.08); }
        .section { padding: 100px 24px; }
        .container { max-width: 1140px; margin: 0 auto; }
        .plan-card { background: white; border-radius: 20px; padding: 36px 28px; border: 2px solid #E2E8F0; transition: all 0.3s ease; position: relative; }
        .plan-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
        .plan-popular { border-color: ${COLORS.accent}; box-shadow: 0 12px 40px rgba(255,107,53,0.15); transform: scale(1.03); }
        .plan-popular:hover { transform: scale(1.03) translateY(-4px); }
        .feature-card { background: white; border-radius: 16px; padding: 32px 24px; border: 1px solid #E8EDF2; transition: all 0.3s ease; }
        .feature-card:hover { border-color: ${COLORS.secondary}; box-shadow: 0 8px 32px rgba(27,107,147,0.1); transform: translateY(-2px); }
        .segment-pill { padding: 10px 20px; border-radius: 50px; background: white; border: 1px solid #E2E8F0; font-size: 14px; font-weight: 500; color: ${COLORS.primary}; cursor: default; transition: all 0.3s ease; display: inline-flex; align-items: center; gap: 6px; }
        .segment-pill:hover { border-color: ${COLORS.accent}; color: ${COLORS.accent}; background: #FFF7F3; }
        .demo-tab { padding: 12px 28px; border-radius: 50px; font-size: 14px; font-weight: 600; cursor: pointer; border: 2px solid transparent; transition: all 0.3s ease; font-family: inherit; display: inline-flex; align-items: center; gap: 8px; }
        .demo-tab-active { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.25); color: white; }
        .demo-tab-inactive { background: transparent; border-color: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); }
        .demo-tab-inactive:hover { color: rgba(255,255,255,0.8); border-color: rgba(255,255,255,0.15); }
        .desktop-nav { display: flex; gap: 32px; align-items: center; }
        .mobile-menu-btn { display: none; background: none; border: none; color: white; cursor: pointer; padding: 8px; }
        .mobile-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 150; opacity: 0; visibility: hidden; transition: all 0.3s ease; backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
        .mobile-overlay-open { opacity: 1; visibility: visible; }
        .mobile-drawer { position: fixed; top: 0; right: 0; width: 300px; max-width: 85vw; height: 100dvh; height: 100vh; background: #0F2B3C; z-index: 151; transform: translateX(100%); transition: transform 0.35s cubic-bezier(.4,0,.2,1); padding: 24px; display: flex; flex-direction: column; overflow-y: auto; box-shadow: -10px 0 40px rgba(0,0,0,0.3); }
        .mobile-drawer-open { transform: translateX(0); }
        .mobile-drawer nav a { display: block; color: rgba(255,255,255,0.8); text-decoration: none; font-size: 17px; font-weight: 500; padding: 16px 0; border-bottom: 1px solid rgba(255,255,255,0.08); transition: color 0.2s; }
        .mobile-drawer nav a:hover, .mobile-drawer nav a:active { color: white; }
        @media (max-width: 1024px) {
          .plans-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .features-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .footer-grid { grid-template-columns: 1fr 1fr !important; gap: 32px !important; }
        }
        @media (max-width: 768px) {
          .desktop-nav { display: none !important; }
          .mobile-menu-btn { display: flex !important; }
          .hero-grid { flex-direction: column !important; text-align: center; }
          .hero-title { font-size: 32px !important; }
          .hero-section { padding-top: 100px !important; padding-bottom: 60px !important; }
          .plans-grid { grid-template-columns: 1fr !important; max-width: 420px; margin-left: auto !important; margin-right: auto !important; }
          .features-grid { grid-template-columns: 1fr !important; }
          .comparison-grid { grid-template-columns: 1fr !important; }
          .steps-grid { grid-template-columns: 1fr !important; }
          .footer-grid { grid-template-columns: 1fr !important; text-align: center; gap: 32px !important; }
          .footer-brand { justify-content: center !important; }
          .footer-brand-desc { max-width: 100% !important; }
          .footer-contact { justify-content: center !important; }
          .section { padding: 64px 16px; }
          .plan-popular { transform: scale(1); }
          .plan-popular:hover { transform: translateY(-4px); }
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
          .demo-cards { flex-direction: column !important; align-items: center !important; }
        }
        @media (max-width: 480px) {
          .hero-title { font-size: 26px !important; }
          .hero-section { padding-top: 90px !important; }
          .stats-grid { grid-template-columns: 1fr !important; }
          .footer-grid { gap: 24px !important; }
          .segment-pill { padding: 8px 14px; font-size: 13px; }
          .cta-btn { padding: 12px 24px; font-size: 15px; }
          .cta-btn-outline { padding: 12px 24px; font-size: 15px; }
          .plan-card { padding: 28px 20px; }
          .feature-card { padding: 24px 18px; }
        }
      `}</style>

      {/* ─── HEADER ─── */}
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          background: 'rgba(15,43,60,0.95)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div
          className="container"
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 24px' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${COLORS.accent}, #FF9F1C)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              🍽️
            </div>
            <span style={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em' }}>
              Pedirei<span style={{ color: COLORS.accent }}>.Online</span>
            </span>
          </div>
          <nav className="desktop-nav">
            {['Funcionalidades', 'Planos', 'FAQ'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'color 0.2s',
                }}
                onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'white')}
                onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.7)')}
              >
                {item}
              </a>
            ))}
            <a
              href="https://admin.pedirei.online"
              style={{ color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: 14, fontWeight: 500 }}
            >
              Entrar
            </a>
            <a href="#cadastro" className="cta-btn" style={{ padding: '10px 24px', fontSize: 14 }}>
              Teste Grátis
            </a>
          </nav>
          <button
            className="mobile-menu-btn"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* ─── MOBILE MENU ─── */}
      <div
        className={`mobile-overlay${mobileMenuOpen ? ' mobile-overlay-open' : ''}`}
        onClick={() => setMobileMenuOpen(false)}
      />
      <div className={`mobile-drawer${mobileMenuOpen ? ' mobile-drawer-open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: `linear-gradient(135deg, ${COLORS.accent}, #FF9F1C)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 14,
              }}
            >
              🍽️
            </div>
            <span style={{ color: 'white', fontSize: 16, fontWeight: 700 }}>
              Pedirei<span style={{ color: COLORS.accent }}>.Online</span>
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', padding: 8 }}
            aria-label="Fechar menu"
          >
            <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column' }}>
          {['Funcionalidades', 'Planos', 'FAQ'].map((item) => (
            <a key={item} href={`#${item.toLowerCase()}`} onClick={handleMobileLink}>
              {item}
            </a>
          ))}
          <a href="https://admin.pedirei.online" onClick={handleMobileLink}>
            Entrar
          </a>
        </nav>
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <a
            href="#cadastro"
            className="cta-btn"
            style={{ width: '100%', justifyContent: 'center' }}
            onClick={handleMobileLink}
          >
            Teste Grátis
          </a>
        </div>
      </div>

      {/* ─── HERO ─── */}
      <section
        className="hero-section"
        style={{
          background: `linear-gradient(165deg, ${COLORS.primary} 0%, #0A1F30 50%, #112D42 100%)`,
          paddingTop: 140,
          paddingBottom: 80,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-50%',
            right: '-20%',
            width: 800,
            height: 800,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(27,107,147,0.12) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-30%',
            left: '-10%',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,53,0.06) 0%, transparent 70%)',
          }}
        />
        <div className="container" style={{ position: 'relative', textAlign: 'center' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 16px',
              borderRadius: 50,
              background: 'rgba(255,107,53,0.12)',
              marginBottom: 24,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: COLORS.accent }} />
            <span style={{ color: COLORS.accent, fontSize: 13, fontWeight: 600 }}>
              14 dias grátis — sem cartão de crédito
            </span>
          </div>
          <h1
            className="hero-title"
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 50,
              fontWeight: 800,
              color: 'white',
              lineHeight: 1.15,
              marginBottom: 20,
              letterSpacing: '-0.02em',
              maxWidth: 720,
              margin: '0 auto 20px',
            }}
          >
            Seu restaurante recebendo pedidos pelo <span style={{ color: COLORS.accent }}>WhatsApp</span> em 5
            minutos
          </h1>
          <p
            style={{
              fontSize: 18,
              color: 'rgba(255,255,255,0.6)',
              lineHeight: 1.7,
              marginBottom: 36,
              maxWidth: 560,
              margin: '0 auto 36px',
            }}
          >
            Cardápio digital inteligente + chatbot com IA que atende, recebe pedidos e cobra automaticamente. Zero
            comissão.
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 48 }}>
            <a href="#cadastro" className="cta-btn" style={{ fontSize: 17, padding: '16px 36px' }}>
              Começar Grátis <IconArrowRight />
            </a>
            <a href="#demo" className="cta-btn-outline">
              Ver como funciona
            </a>
          </div>
          <div style={{ display: 'flex', gap: 36, justifyContent: 'center', flexWrap: 'wrap' }}>
            {(
              [
                ['0%', 'comissão'],
                ['5 min', 'setup'],
                ['24h', 'atendimento IA'],
              ] as const
            ).map(([n, l]) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: 'white' }}>{n}</span>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF BAR ─── */}
      <section style={{ background: 'white', padding: '40px 24px', borderBottom: '1px solid #F1F5F9' }}>
        <div
          className="container stats-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}
        >
          {(
            [
              ['🚀', 'Setup em 5 min', 'Envie foto do cardápio e pronto'],
              ['💰', 'Zero comissão', 'Só mensalidade fixa, sem surpresas'],
              ['🤖', 'IA que entende gírias', 'GPT atende como humano'],
              ['📱', 'Sem app para baixar', 'Funciona no WhatsApp que já existe'],
            ] as const
          ).map(([icon, title, desc]) => (
            <div key={title} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 28 }}>{icon}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: COLORS.primary }}>{title}</span>
              <span style={{ fontSize: 13, color: COLORS.gray }}>{desc}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── DEMO SECTION — DOIS CARDS ─── */}
      <section
        id="demo"
        className="section"
        style={{
          background: `linear-gradient(165deg, ${COLORS.primary}, #0A1F30)`,
          paddingTop: 80,
          paddingBottom: 80,
        }}
      >
        <div className="container">
          <AnimatedSection style={{ textAlign: 'center', marginBottom: 40 }}>
            <p
              style={{
                color: COLORS.accent,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Veja funcionando
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 36,
                fontWeight: 700,
                color: 'white',
                marginBottom: 12,
              }}
            >
              Dois jeitos de pedir, mesma experiência
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, maxWidth: 560, margin: '0 auto' }}>
              Seu cliente escolhe: faz o pedido direto pela conversa no WhatsApp ou abre o cardápio digital no
              navegador
            </p>
          </AnimatedSection>

          <AnimatedSection delay={0.15}>
            <div
              className="demo-cards"
              style={{ display: 'flex', gap: 40, justifyContent: 'center', alignItems: 'flex-start' }}
            >
              {/* Card 1 — Pedido pelo WhatsApp */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 340 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 20px',
                    borderRadius: 50,
                    background: 'rgba(34,197,94,0.12)',
                    border: '1px solid rgba(34,197,94,0.2)',
                  }}
                >
                  <IconWhatsapp size={16} />
                  <span style={{ color: '#22C55E', fontSize: 13, fontWeight: 600 }}>Pedido pelo WhatsApp</span>
                </div>
                <DemoWhatsappOrder />
                <p
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 12,
                    textAlign: 'center',
                    lineHeight: 1.5,
                  }}
                >
                  Chatbot monta o pedido, gera Pix, confirma pagamento e avisa quando saiu pra entrega
                </p>
              </div>

              {/* Card 2 — Pedido pelo Site */}
              <div
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, maxWidth: 340 }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '8px 20px',
                    borderRadius: 50,
                    background: 'rgba(27,107,147,0.12)',
                    border: '1px solid rgba(27,107,147,0.2)',
                  }}
                >
                  <span style={{ color: COLORS.secondary }}>
                    <IconGlobe size={16} />
                  </span>
                  <span style={{ color: COLORS.secondary, fontSize: 13, fontWeight: 600 }}>
                    Pedido pelo Cardápio Digital
                  </span>
                </div>
                <DemoSiteOrder />
                <p
                  style={{
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: 12,
                    textAlign: 'center',
                    lineHeight: 1.5,
                  }}
                >
                  Bot envia o link, cliente monta o pedido no site, paga e recebe confirmação no WhatsApp
                </p>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── PARA QUEM É ─── */}
      <section style={{ background: COLORS.light, padding: '64px 24px' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <AnimatedSection>
            <p
              style={{
                color: COLORS.accent,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Para todo tipo de restaurante
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 28,
                fontWeight: 700,
                marginBottom: 32,
                color: COLORS.primary,
              }}
            >
              Feito para o seu negócio
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12 }}>
              {[
                '🍕 Pizzaria',
                '🍔 Hamburgueria',
                '🍱 Marmitaria',
                '🍣 Sushi',
                '🥤 Açaiteria',
                '🍗 Lanchonete',
                '🍰 Confeitaria',
                '🍖 Churrascaria',
                '🍝 Restaurante',
                '🥘 Food Truck',
              ].map((seg) => (
                <span key={seg} className="segment-pill">
                  {seg}
                </span>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── FUNCIONALIDADES ─── */}
      <section id="funcionalidades" className="section" style={{ background: 'white' }}>
        <div className="container">
          <AnimatedSection style={{ textAlign: 'center', marginBottom: 60 }}>
            <p
              style={{
                color: COLORS.accent,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Funcionalidades
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.primary,
              }}
            >
              Tudo que seu restaurante precisa
            </h2>
          </AnimatedSection>
          <div
            className="features-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}
          >
            {(
              [
                [
                  <span key="ic1" style={{ color: '#22C55E' }}>
                    <IconWhatsapp size={28} />
                  </span>,
                  'WhatsApp com IA',
                  'Chatbot inteligente que recebe pedidos, tira dúvidas e envia status. Seu cliente conversa como se fosse com um atendente humano.',
                ],
                [
                  <span key="ic2" style={{ color: COLORS.secondary }}>
                    <IconMenu size={28} />
                  </span>,
                  'Cardápio Digital',
                  'Link personalizado com fotos, preços e categorias por horário. Pizzas só aparecem à noite, pratos do dia somem após o almoço.',
                ],
                [
                  <span key="ic3" style={{ color: '#8B5CF6' }}>
                    <IconBot size={28} />
                  </span>,
                  'Cadastro por Foto',
                  'Envie a foto do cardápio físico ou PDF e a IA extrai itens, preços e categorias. Você só revisa e confirma.',
                ],
                [
                  <span key="ic4" style={{ color: COLORS.accent }}>
                    <IconCreditCard size={28} />
                  </span>,
                  'Pix Automático',
                  'QR Code gerado na hora, confirmação via webhook. Sem comprovante manual. Também aceita cartão e dinheiro.',
                ],
                [
                  <span key="ic5" style={{ color: '#EC4899' }}>
                    <IconChart size={28} />
                  </span>,
                  'Painel Completo',
                  'Dashboard com pedidos em tempo real, faturamento, ticket médio, itens mais vendidos e horários de pico.',
                ],
                [
                  <span key="ic6" style={{ color: '#14B8A6' }}>
                    <IconShield size={28} />
                  </span>,
                  'Dados Protegidos',
                  'Cada restaurante tem espaço isolado com dados criptografados. Seus clientes são SEUS, não de marketplace.',
                ],
              ] as [ReactNode, string, string][]
            ).map(([icon, title, desc], i) => (
              <AnimatedSection key={title} delay={i * 0.08}>
                <div className="feature-card">
                  <div style={{ marginBottom: 16 }}>{icon}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: COLORS.primary }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 14, color: COLORS.gray, lineHeight: 1.7 }}>{desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMO FUNCIONA ─── */}
      <section className="section" style={{ background: COLORS.light }}>
        <div className="container">
          <AnimatedSection style={{ textAlign: 'center', marginBottom: 60 }}>
            <p
              style={{
                color: COLORS.accent,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Simples de começar
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.primary,
              }}
            >
              3 passos para receber pedidos
            </h2>
          </AnimatedSection>
          <div
            className="steps-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}
          >
            {(
              [
                [
                  '📸',
                  'Cadastre o cardápio',
                  'Envie uma foto do cardápio físico ou PDF. A IA extrai tudo. Você revisa com arrastar e soltar e confirma em minutos.',
                ],
                [
                  '📱',
                  'Conecte o WhatsApp',
                  'Escaneie o QR Code no painel e o chatbot com IA já está ativo. Clientes mandam "oi" e são atendidos na hora.',
                ],
                [
                  '🎉',
                  'Receba pedidos',
                  'Pedidos chegam no painel com notificação sonora. Mude o status e o cliente é avisado automaticamente.',
                ],
              ] as const
            ).map(([icon, title, desc], i) => (
              <AnimatedSection key={title} delay={i * 0.15}>
                <div style={{ textAlign: 'center', padding: 32 }}>
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: '50%',
                      background: `linear-gradient(135deg, ${COLORS.accent}15, ${COLORS.secondary}15)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 20px',
                      fontSize: 32,
                      position: 'relative',
                    }}
                  >
                    {icon}
                    <span
                      style={{
                        position: 'absolute',
                        top: -4,
                        right: -4,
                        width: 26,
                        height: 26,
                        borderRadius: '50%',
                        background: COLORS.accent,
                        color: 'white',
                        fontSize: 13,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {i + 1}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12, color: COLORS.primary }}>
                    {title}
                  </h3>
                  <p style={{ fontSize: 15, color: COLORS.gray, lineHeight: 1.7 }}>{desc}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* ─── COMPARAÇÃO IFOOD ─── */}
      <section className="section" style={{ background: 'white' }}>
        <div className="container">
          <AnimatedSection style={{ textAlign: 'center', marginBottom: 60 }}>
            <p
              style={{
                color: COLORS.accent,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Comparação honesta
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.primary,
              }}
            >
              Pedirei.Online vs Marketplace
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <div
                className="comparison-grid"
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}
              >
                <div
                  style={{
                    background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)',
                    borderRadius: 20,
                    padding: 36,
                    border: '2px solid #BBF7D0',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: `linear-gradient(135deg, ${COLORS.accent}, #FF9F1C)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 14,
                      }}
                    >
                      🍽️
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 18, color: COLORS.primary }}>Pedirei.Online</span>
                  </div>
                  {[
                    '0% de comissão por pedido',
                    'A partir de R$0/mês',
                    'Atendimento via WhatsApp com IA',
                    'Cardápio próprio com seu link',
                    'Dados dos clientes são SEUS',
                    'Campanhas de marketing',
                    'Pix automático integrado',
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 0',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                      }}
                    >
                      <IconCheck />
                      <span style={{ fontSize: 14, color: COLORS.primary }}>{item}</span>
                    </div>
                  ))}
                </div>
                <div
                  style={{ background: '#FAFAFA', borderRadius: 20, padding: 36, border: '2px solid #E5E7EB' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      iF
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 18, color: COLORS.gray }}>Marketplaces</span>
                  </div>
                  {[
                    '12% a 27% de comissão',
                    'R$100+ por mês',
                    'Sem WhatsApp direto',
                    'Cardápio dentro do app deles',
                    'Dados dos clientes são DELES',
                    'Sem campanhas próprias',
                    'Pagamento pelo app deles',
                  ].map((item) => (
                    <div
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 0',
                        borderBottom: '1px solid rgba(0,0,0,0.04)',
                      }}
                    >
                      <IconX />
                      <span style={{ fontSize: 14, color: COLORS.gray }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── PLANOS ─── */}
      <section id="planos" className="section" style={{ background: COLORS.light }}>
        <div className="container">
          <AnimatedSection style={{ textAlign: 'center', marginBottom: 60 }}>
            <p
              style={{
                color: COLORS.accent,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Planos e preços
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.primary,
                marginBottom: 12,
              }}
            >
              Comece grátis, escale quando quiser
            </h2>
            <p style={{ color: COLORS.gray, fontSize: 16 }}>
              Todos os planos incluem Pix automático e chatbot com IA
            </p>
          </AnimatedSection>
          <div
            className="plans-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, alignItems: 'start' }}
          >
            {[
              {
                name: 'Gratuito',
                price: '0',
                period: 'para sempre',
                orders: '30 pedidos/mês',
                features: ['1 operador', 'Cardápio digital', 'Chatbot com IA', 'Pix automático'],
                popular: false,
              },
              {
                name: 'Essencial',
                price: '69,90',
                period: '/mês',
                orders: '300 pedidos/mês',
                features: [
                  '2 operadores',
                  'Sem marca Pedirei',
                  'Relatório básico',
                  'Comandos via WhatsApp',
                  'Cadastro por foto/PDF',
                ],
                popular: true,
              },
              {
                name: 'Profissional',
                price: '129,90',
                period: '/mês',
                orders: '1.000 pedidos/mês',
                features: [
                  'Operadores ilimitados',
                  'Relatórios completos',
                  'Nota fiscal (NFC-e)',
                  'Impressão de pedidos',
                  'Pedido repetido',
                ],
                popular: false,
              },
              {
                name: 'Negócio',
                price: '199,90',
                period: '/mês',
                orders: 'Pedidos ilimitados',
                features: [
                  'Múltiplas unidades',
                  'Domínio próprio',
                  'Visual personalizado',
                  'Suporte prioritário',
                  'Chave OpenAI própria',
                ],
                popular: false,
              },
            ].map((plan, i) => (
              <AnimatedSection key={plan.name} delay={i * 0.1}>
                <div className={`plan-card ${plan.popular ? 'plan-popular' : ''}`}>
                  {plan.popular && (
                    <div
                      style={{
                        position: 'absolute',
                        top: -14,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        background: COLORS.accent,
                        color: 'white',
                        padding: '6px 20px',
                        borderRadius: 50,
                        fontSize: 12,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      MAIS POPULAR
                    </div>
                  )}
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: COLORS.primary, marginBottom: 4 }}>
                    {plan.name}
                  </h3>
                  <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 16 }}>{plan.orders}</p>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 14, color: COLORS.gray }}>R$</span>
                    <span
                      style={{ fontSize: 40, fontWeight: 800, color: COLORS.primary, lineHeight: 1 }}
                    >
                      {plan.price}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: COLORS.gray, marginBottom: 24 }}>{plan.period}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
                    {plan.features.map((f) => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <IconCheck />
                        <span style={{ fontSize: 14, color: COLORS.primary }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <a
                    href="#cadastro"
                    className="cta-btn"
                    style={{
                      width: '100%',
                      justifyContent: 'center',
                      padding: '12px 24px',
                      background: plan.popular ? COLORS.accent : 'transparent',
                      color: plan.popular ? 'white' : COLORS.primary,
                      border: plan.popular ? 'none' : `2px solid ${COLORS.primary}`,
                    }}
                  >
                    Começar {plan.name === 'Gratuito' ? 'Grátis' : 'Agora'}
                  </a>
                </div>
              </AnimatedSection>
            ))}
          </div>
          <AnimatedSection delay={0.4}>
            <p style={{ textAlign: 'center', marginTop: 32, fontSize: 14, color: COLORS.gray }}>
              🎁 Todos os planos começam com <strong>14 dias de trial</strong> com todas as funcionalidades
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section id="faq" className="section" style={{ background: 'white' }}>
        <div className="container" style={{ maxWidth: 720 }}>
          <AnimatedSection style={{ textAlign: 'center', marginBottom: 48 }}>
            <p
              style={{
                color: COLORS.accent,
                fontWeight: 600,
                fontSize: 14,
                marginBottom: 8,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              Dúvidas frequentes
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 36,
                fontWeight: 700,
                color: COLORS.primary,
              }}
            >
              Perguntas Frequentes
            </h2>
          </AnimatedSection>
          <AnimatedSection delay={0.1}>
            {(
              [
                [
                  'Preciso de um número de WhatsApp exclusivo?',
                  'Recomendamos usar um número dedicado para o restaurante. Pode ser um chip novo ou seu número comercial existente.',
                ],
                [
                  'O chatbot realmente entende o que o cliente pede?',
                  'Sim! Usamos GPT (inteligência artificial da OpenAI) que entende linguagem natural, gírias e variações. O cliente conversa como se fosse com um atendente humano.',
                ],
                [
                  'Posso cancelar a qualquer momento?',
                  'Sim, sem multa e sem fidelidade. Você pode fazer downgrade para o plano Gratuito quando quiser.',
                ],
                [
                  'Como funciona o período de teste?',
                  'Ao se cadastrar, você ganha 14 dias com todas as funcionalidades do plano Profissional. Após o período, pode escolher o plano ideal.',
                ],
                [
                  'Preciso instalar algum aplicativo?',
                  'Não! Tudo funciona pelo navegador. Seus clientes pedem pelo WhatsApp que já têm instalado.',
                ],
                [
                  'E se eu já tiver cardápio em foto ou PDF?',
                  'Nossa IA importa automaticamente! Envie a foto ou PDF e o sistema cadastra todos os itens com nome, descrição e preço.',
                ],
                [
                  'Vocês cobram comissão por pedido?',
                  'Não, nunca. A receita vem apenas da mensalidade fixa. Seus lucros são 100% seus.',
                ],
              ] as const
            ).map(([q, a]) => (
              <FaqItem key={q} q={q} a={a} />
            ))}
          </AnimatedSection>
        </div>
      </section>

      {/* ─── CADASTRO ─── */}
      <section
        id="cadastro"
        className="section"
        style={{
          background: `linear-gradient(165deg, ${COLORS.primary}, #0A1F30)`,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 600,
            height: 600,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,107,53,0.08) 0%, transparent 70%)',
          }}
        />
        <div className="container" style={{ position: 'relative', maxWidth: 560, textAlign: 'center' }}>
          <AnimatedSection>
            <h2
              style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: 36,
                fontWeight: 700,
                color: 'white',
                marginBottom: 12,
              }}
            >
              Comece a receber pedidos agora
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, marginBottom: 40 }}>
              14 dias grátis com tudo liberado. Sem cartão de crédito.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={0.15}>
            <div
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 20,
                padding: 36,
                backdropFilter: 'blur(12px)',
              }}
            >
              {[
                { placeholder: 'Nome do restaurante', type: 'text' },
                { placeholder: 'WhatsApp (ex: 87 99999-0000)', type: 'tel' },
                { placeholder: 'E-mail', type: 'email' },
                { placeholder: 'Senha', type: 'password' },
              ].map((field) => (
                <input
                  key={field.placeholder}
                  type={field.type}
                  placeholder={field.placeholder}
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.06)',
                    color: 'white',
                    fontSize: 15,
                    marginBottom: 14,
                    outline: 'none',
                    fontFamily: 'inherit',
                    transition: 'border-color 0.3s',
                  }}
                  onFocus={(e) => ((e.target as HTMLInputElement).style.borderColor = COLORS.accent)}
                  onBlur={(e) =>
                    ((e.target as HTMLInputElement).style.borderColor = 'rgba(255,255,255,0.15)')
                  }
                />
              ))}
              <button
                className="cta-btn"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '16px',
                  fontSize: 17,
                  marginTop: 8,
                }}
              >
                Criar Conta Grátis <IconArrowRight />
              </button>
              <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 16 }}>
                Ao se cadastrar, você concorda com nossos{' '}
                <a href="/termos" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
                  Termos de Uso
                </a>{' '}
                e{' '}
                <a href="/privacidade" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'underline' }}>
                  Política de Privacidade
                </a>
                .
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* ─── CTA FINAL ─── */}
      <section style={{ background: COLORS.accent, padding: '64px 24px', textAlign: 'center' }}>
        <div className="container">
          <h2
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 32,
              fontWeight: 700,
              color: 'white',
              marginBottom: 12,
            }}
          >
            Pronto para automatizar seus pedidos?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 32 }}>
            Seu restaurante a um clique de receber pedidos pelo WhatsApp com IA
          </p>
          <a
            href="#cadastro"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '16px 40px',
              background: 'white',
              color: COLORS.accent,
              borderRadius: 12,
              fontSize: 17,
              fontWeight: 700,
              textDecoration: 'none',
              transition: 'all 0.3s ease',
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(-2px)';
              (e.target as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.transform = 'translateY(0)';
              (e.target as HTMLElement).style.boxShadow = 'none';
            }}
          >
            Criar Conta Grátis <IconArrowRight />
          </a>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer style={{ background: COLORS.darkBg, padding: '64px 24px 32px' }}>
        <div className="container">
          <div
            className="footer-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr',
              gap: 48,
              marginBottom: 48,
            }}
          >
            <div>
              <div className="footer-brand" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: `linear-gradient(135deg, ${COLORS.accent}, #FF9F1C)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                  }}
                >
                  🍽️
                </div>
                <span style={{ color: 'white', fontSize: 18, fontWeight: 700 }}>
                  Pedirei<span style={{ color: COLORS.accent }}>.Online</span>
                </span>
              </div>
              <p
                className="footer-brand-desc"
                style={{
                  color: 'rgba(255,255,255,0.4)',
                  fontSize: 14,
                  lineHeight: 1.7,
                  maxWidth: 280,
                }}
              >
                Sistema inteligente de pedidos via WhatsApp para restaurantes. Cardápio digital, chatbot com IA,
                Pix automático e painel completo.
              </p>
            </div>
            <div>
              <h4 style={{ color: 'white', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Produto</h4>
              {['Funcionalidades', 'Planos', 'FAQ'].map((link) => (
                <a
                  key={link}
                  href={`#${link.toLowerCase()}`}
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.4)',
                    textDecoration: 'none',
                    fontSize: 14,
                    marginBottom: 10,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.8)')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}
                >
                  {link}
                </a>
              ))}
            </div>
            <div>
              <h4 style={{ color: 'white', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Legal</h4>
              {[
                { label: 'Termos de Uso', href: '/termos' },
                { label: 'Privacidade', href: '/privacidade' },
              ].map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  style={{
                    display: 'block',
                    color: 'rgba(255,255,255,0.4)',
                    textDecoration: 'none',
                    fontSize: 14,
                    marginBottom: 10,
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.8)')}
                  onMouseLeave={(e) => ((e.target as HTMLElement).style.color = 'rgba(255,255,255,0.4)')}
                >
                  {link.label}
                </a>
              ))}
            </div>
            <div>
              <h4 style={{ color: 'white', fontWeight: 600, fontSize: 14, marginBottom: 16 }}>Contato</h4>
              <a
                className="footer-contact"
                href="https://wa.me/5587999999999"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: '#22C55E',
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                }}
              >
                <IconWhatsapp size={18} /> Fale conosco
              </a>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 24, textAlign: 'center' }}>
            <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
              &copy; 2026 Pedirei.Online. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
