import type { ReactNode } from 'react';

interface FabProps {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  accent?: string;
}

export default function Fab({ icon, label, onClick, accent = 'var(--accent)' }: FabProps) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="btn-glass"
      style={{
        position: 'fixed',
        bottom: 16, right: 16,
        zIndex: 60,
        width: 56, height: 56,
        borderRadius: '50%',
        background: accent,
        border: 'none',
        color: '#030712',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer',
        boxShadow: `0 4px 20px rgba(0,0,0,0.35), 0 0 24px ${accent}40`,
        transition: 'transform 0.2s var(--ease)',
      }}
    >
      {icon}
    </button>
  );
}
