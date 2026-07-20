import { useState } from 'react';
import { X } from 'lucide-react';

interface TooltipProps {
  id: string;
  title: string;
  text: string;
}

export default function Tooltip({ id, title, text }: TooltipProps) {
  const storageKey = `scanlabb-tip-${id}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(storageKey) === '1');

  if (dismissed) return null;

  const close = () => {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  };

  return (
    <div
      role="tooltip"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-2)',
        borderRadius: 14,
        padding: '12px 14px',
        boxShadow: 'var(--glass-shadow)',
        zIndex: 50,
        animation: 'fadeUp 0.3s var(--ease-spring)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{title}</p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4 }}>{text}</p>
        </div>
        <button
          onClick={close}
          aria-label="Sluiten"
          style={{
            width: 24, height: 24, flexShrink: 0,
            background: 'none', border: 'none',
            color: 'var(--text-3)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
