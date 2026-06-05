import { useEffect, useRef, useState } from 'react';
import { TrendingUp, ScanLine, BarChart3 } from 'lucide-react';

interface KPIData {
  totalLines: number;
  totalItems: number;
  fulfillmentRate: number;
  orderType: 'verkoop' | 'inkoop';
}

function useCountUp(target: number, duration = 600) {
  const [value, setValue] = useState(target);
  const prevRef = useRef(target);

  useEffect(() => {
    if (prevRef.current === target) return;
    const start = prevRef.current;
    const diff = target - start;
    const startTime = performance.now();
    prevRef.current = target;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(start + diff * ease));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return value;
}

export default function KPICards({ totalLines, totalItems, fulfillmentRate, orderType }: KPIData) {
  const isVerkoop = orderType === 'verkoop';
  const accent = isVerkoop ? 'var(--accent)' : 'var(--inkoop)';
  const glow = isVerkoop ? 'var(--accent-glow)' : 'var(--inkoop-glow)';

  const animLines = useCountUp(totalLines);
  const animItems = useCountUp(totalItems);
  const animRate = useCountUp(Math.round(fulfillmentRate));

  const cards = [
    {
      icon: <ScanLine size={18} />,
      label: 'Orderregels',
      value: animLines.toLocaleString('nl'),
      sub: 'unieke artikelen',
    },
    {
      icon: <BarChart3 size={18} />,
      label: 'Gescand',
      value: animItems.toLocaleString('nl'),
      sub: 'totaal stuks',
      highlight: true,
    },
    {
      icon: <TrendingUp size={18} />,
      label: 'Fulfillment',
      value: `${animRate}%`,
      sub: 'van doel',
    },
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: 10,
      padding: '0 20px',
    }}>
      {cards.map((card, i) => (
        <div
          key={i}
          style={{
            background: card.highlight ? `linear-gradient(135deg, ${glow}, transparent)` : 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            border: card.highlight ? `1px solid ${accent}40` : '1px solid var(--border-2)',
            borderRadius: 16,
            padding: '14px 14px 12px',
            boxShadow: card.highlight
              ? `var(--glass-shadow), 0 0 24px ${glow}`
              : 'var(--glass-shadow)',
            animation: 'fadeUp 0.4s var(--ease-spring) both',
            animationDelay: `${i * 60}ms`,
          }}
        >
          <div style={{
            color: card.highlight ? accent : 'var(--text-3)',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            {card.icon}
            <span style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.07em',
              textTransform: 'uppercase',
              color: 'var(--text-3)',
            }}>
              {card.label}
            </span>
          </div>
          <p style={{
            margin: 0,
            fontFamily: 'DM Mono, monospace',
            fontSize: 22,
            fontWeight: 500,
            color: card.highlight ? accent : 'var(--text-1)',
            letterSpacing: '-0.02em',
            lineHeight: 1,
            textShadow: card.highlight ? `0 0 20px ${glow}` : 'none',
            animation: 'numUp 0.4s var(--ease-spring) both',
            animationDelay: `${i * 60 + 100}ms`,
          }}>
            {card.value}
          </p>
          <p style={{
            margin: '4px 0 0',
            fontSize: 11,
            color: 'var(--text-3)',
          }}>
            {card.sub}
          </p>
        </div>
      ))}
    </div>
  );
}
