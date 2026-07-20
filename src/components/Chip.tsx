interface ChipProps {
  label: string;
  selected: boolean;
  onClick: () => void;
  accent?: string;
}

export default function Chip({ label, selected, onClick, accent = 'var(--accent)' }: ChipProps) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      style={{
        minHeight: 36,
        padding: '0 14px',
        borderRadius: 999,
        background: selected ? `${accent}20` : 'var(--border-1)',
        border: selected ? `1px solid ${accent}45` : '1px solid var(--border-2)',
        color: selected ? accent : 'var(--text-2)',
        fontSize: 12, fontWeight: 700,
        fontFamily: 'Outfit, sans-serif',
        cursor: 'pointer',
        transition: 'all 0.2s var(--ease)',
      }}
    >
      {label}
    </button>
  );
}
