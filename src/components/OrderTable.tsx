import { useState } from 'react';
import { Plus, Minus, Trash2, Check } from 'lucide-react';
import type { OrderLine } from '../db/database';

interface OrderTableProps {
  lines: OrderLine[];
  orderType: 'verkoop' | 'inkoop';
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onChangeAantal: (id: number, val: number) => void;
  onDelete: (id: number) => void;
  flashId?: number | null;
}

export default function OrderTable({
  lines,
  orderType,
  onIncrement,
  onDecrement,
  onChangeAantal,
  onDelete,
  flashId,
}: OrderTableProps) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const isVerkoop = orderType === 'verkoop';
  const accent = isVerkoop ? 'var(--accent)' : 'var(--inkoop)';
  const glow = isVerkoop ? 'var(--accent-glow)' : 'var(--inkoop-glow)';

  if (lines.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 10, padding: '32px 20px',
        color: 'var(--text-3)', fontSize: 13,
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          border: '1px dashed var(--border-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-3)',
        }}>
          <Minus size={20} />
        </div>
        <p style={{ margin: 0 }}>Nog geen artikelen gescand</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '0 20px 100px' }}>
      {lines.map((line, i) => {
        const isNew = line.id === flashId;
        const delay = Math.min(i * 30, 200);

        return (
          <div
            key={line.id}
            className={isNew ? 'scan-success' : ''}
            style={{
              background: 'var(--glass-bg)',
              backdropFilter: 'var(--glass-blur)',
              WebkitBackdropFilter: 'var(--glass-blur)',
              border: isNew ? `1px solid ${accent}50` : '1px solid var(--border-1)',
              borderRadius: 14,
              padding: '11px 13px',
              display: 'flex', alignItems: 'center', gap: 10,
              animation: `rowIn 0.35s var(--ease-spring) ${delay}ms both`,
              transition: 'border-color 0.3s var(--ease)',
            }}
          >
            {/* Index badge */}
            <div style={{
              minWidth: 26, height: 26,
              background: 'var(--border-1)',
              borderRadius: 8,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 600,
              color: 'var(--text-3)',
              fontFamily: 'DM Mono, monospace',
              flexShrink: 0,
            }}>
              {String(lines.length - i).padStart(2, '0')}
            </div>

            {/* Article info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{
                margin: 0,
                fontSize: 13, fontWeight: 600,
                color: 'var(--text-1)',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {line.artikelnummer}
                {line.kleurnummer && line.kleurnummer !== line.artikelnummer && (
                  <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · {line.kleurnummer}</span>
                )}
              </p>
              <p style={{
                margin: '2px 0 0', fontSize: 11,
                color: 'var(--text-3)',
                fontFamily: 'DM Mono, monospace',
              }}>
                {line.maat || '—'} · {line.barcode}
              </p>
            </div>

            {/* Quantity controls */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
              <button
                onClick={() => onDecrement(line.id!)}
                style={ctrlBtnStyle}
              >
                <Minus size={13} />
              </button>

              <input
                type="number"
                min={1}
                value={line.aantal}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) onChangeAantal(line.id!, v);
                }}
                style={{
                  width: 38, height: 30,
                  background: 'var(--border-1)',
                  border: '1px solid var(--border-2)',
                  borderRadius: 8,
                  textAlign: 'center',
                  color: 'var(--text-1)',
                  fontFamily: 'DM Mono, monospace',
                  fontWeight: 500,
                  fontSize: 13,
                  outline: 'none',
                }}
              />

              <button
                onClick={() => onIncrement(line.id!)}
                style={{
                  ...ctrlBtnStyle,
                  background: `${accent}20`,
                  border: `1px solid ${accent}35`,
                  color: accent,
                }}
              >
                <Plus size={13} />
              </button>
            </div>

            {/* Delete */}
            {confirmDelete === line.id ? (
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button
                  onClick={() => { onDelete(line.id!); setConfirmDelete(null); }}
                  style={{
                    background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                    borderRadius: 8, padding: '5px 9px',
                    color: '#F87171', cursor: 'pointer', fontSize: 11, fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: 4,
                  }}
                >
                  <Check size={11} /> Ja
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  style={{
                    background: 'var(--border-1)', border: '1px solid var(--border-2)',
                    borderRadius: 8, padding: '5px 9px',
                    color: 'var(--text-3)', cursor: 'pointer', fontSize: 11,
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(line.id!)}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-3)', cursor: 'pointer',
                  padding: '4px 6px', borderRadius: 8,
                  display: 'flex', alignItems: 'center',
                  transition: 'color 0.2s var(--ease)',
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#F87171')}
                onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-3)')}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

const ctrlBtnStyle: React.CSSProperties = {
  width: 30, height: 30,
  background: 'var(--border-1)',
  border: '1px solid var(--border-2)',
  borderRadius: 8,
  color: 'var(--text-2)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s var(--ease)',
};
