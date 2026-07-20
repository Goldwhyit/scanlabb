interface SegmentedOption {
  value: string;
  label: string;
  badge?: number;
}

interface SegmentedControlProps {
  options: SegmentedOption[];
  value: string;
  onChange: (value: string) => void;
  accent: string;
}

export default function SegmentedControl({ options, value, onChange, accent }: SegmentedControlProps) {
  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: '1px solid var(--border-1)',
        borderRadius: 999,
        padding: 4,
        gap: 3,
        boxShadow: 'var(--glass-shadow)',
      }}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            style={{
              flex: 1,
              minHeight: 44,
              padding: '0 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              background: active ? `${accent}20` : 'transparent',
              border: active ? `1px solid ${accent}40` : '1px solid transparent',
              borderRadius: 999,
              color: active ? accent : 'var(--text-3)',
              fontWeight: 700, fontSize: 13,
              fontFamily: 'Outfit, sans-serif',
              cursor: 'pointer',
              transition: 'all 0.25s var(--ease)',
            }}
          >
            {opt.label}
            {typeof opt.badge === 'number' && opt.badge > 0 && (
              <span style={{
                minWidth: 18, height: 18, padding: '0 5px',
                borderRadius: 999,
                background: active ? accent : 'var(--border-2)',
                color: active ? '#030712' : 'var(--text-2)',
                fontSize: 10, fontWeight: 800,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'DM Mono, monospace',
              }}>
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
