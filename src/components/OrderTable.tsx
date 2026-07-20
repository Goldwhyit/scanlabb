import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Trash2, Check, MoreVertical, X, ScanLine } from 'lucide-react';
import type { OrderLine, OrderLineStatus } from '../db/database';
import Chip from './Chip';

interface OrderTableProps {
  lines: OrderLine[];
  orderType: 'verkoop' | 'inkoop';
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onChangeAantal: (id: number, val: number) => void;
  onDelete: (id: number) => void;
  onUpdateLine: (id: number, patch: Partial<Pick<OrderLine, 'status' | 'note'>>) => void;
  flashId?: number | null;
  onStartScanning?: () => void;
}

const STATUS_OPTIONS: { value: OrderLineStatus; label: string }[] = [
  { value: 'goed', label: 'Goed' },
  { value: 'beschadigd', label: 'Beschadigd' },
  { value: 'retour', label: 'Retour' },
];

const MAX_SWIPE = 92;

interface LineGroup {
  key: string;
  groupId?: string;
  groupLabel?: string;
  items: OrderLine[];
}

// Buckets by groupId rather than requiring adjacency, so a rescan (which bumps a
// line's timestamp and can move it elsewhere in the sorted `lines` array) never
// splits a group into two clusters. Ungrouped lines each get their own single-item
// bucket, keyed by line id, preserving their original relative order.
function groupLines(lines: OrderLine[]): LineGroup[] {
  const order: string[] = [];
  const buckets = new Map<string, OrderLine[]>();
  for (const line of lines) {
    const key = line.groupId ?? `ungrouped-${line.id}`;
    if (!buckets.has(key)) { buckets.set(key, []); order.push(key); }
    buckets.get(key)!.push(line);
  }
  return order.map((key) => {
    const items = buckets.get(key)!;
    return { key, groupId: items[0].groupId, groupLabel: items[0].groupLabel, items };
  });
}

export default function OrderTable({
  lines,
  orderType,
  onIncrement,
  onDecrement,
  onChangeAantal,
  onDelete,
  onUpdateLine,
  flashId,
  onStartScanning,
}: OrderTableProps) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [sheetLineId, setSheetLineId] = useState<number | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [swipingLineId, setSwipingLineId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [revealedDeleteId, setRevealedDeleteId] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  // Keyed by line id — a shared flag would let a swipe on one row swallow the next
  // kebab-menu tap on a different row.
  const justSwipedRef = useRef<Map<number, boolean>>(new Map());

  const isVerkoop = orderType === 'verkoop';
  const accent = isVerkoop ? 'var(--accent)' : 'var(--inkoop)';
  const glow = isVerkoop ? 'var(--accent-glow)' : 'var(--inkoop-glow)';

  const activeLine = sheetLineId ? lines.find((l) => l.id === sheetLineId) : undefined;

  useEffect(() => {
    if (sheetLineId && !activeLine) setSheetLineId(null);
  }, [sheetLineId, activeLine]);

  useEffect(() => {
    setNoteDraft(activeLine?.note ?? '');
  }, [activeLine?.id, activeLine?.note]);

  const openSheet = (id: number) => {
    setConfirmDelete(null);
    setSheetLineId(id);
  };
  const closeSheet = () => {
    setSheetLineId(null);
    setConfirmDelete(null);
  };

  const handleTouchStart = (lineId: number, clientX: number) => {
    touchStartX.current = clientX;
    setSwipingLineId(lineId);
    setSwipeOffset(revealedDeleteId === lineId ? -MAX_SWIPE : 0);
  };
  const handleTouchMove = (lineId: number, clientX: number) => {
    if (touchStartX.current === null || swipingLineId !== lineId) return;
    const diff = clientX - touchStartX.current;
    if (Math.abs(diff) > 8) justSwipedRef.current.set(lineId, true);
    const base = revealedDeleteId === lineId ? -MAX_SWIPE : 0;
    setSwipeOffset(Math.min(0, Math.max(-MAX_SWIPE, base + diff)));
  };
  const handleTouchEnd = (lineId: number) => {
    if (swipingLineId !== lineId) return;
    const shouldReveal = swipeOffset <= -MAX_SWIPE * 0.6;
    setRevealedDeleteId(shouldReveal ? lineId : null);
    setSwipeOffset(shouldReveal ? -MAX_SWIPE : 0);
    setSwipingLineId(null);
    touchStartX.current = null;
  };

  if (lines.length === 0) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', gap: 14, padding: '48px 20px',
        color: 'var(--text-3)', fontSize: 13,
      }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          border: '1px dashed var(--border-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text-3)',
        }}>
          <ScanLine size={24} />
        </div>
        <p style={{ margin: 0 }}>Nog geen artikelen gescand</p>
        {onStartScanning && (
          <button
            onClick={onStartScanning}
            className="btn-glass"
            style={{
              minHeight: 44, padding: '0 20px',
              borderRadius: 12,
              background: accent,
              border: 'none',
              color: isVerkoop ? '#030712' : '#ffffff',
              fontWeight: 700, fontSize: 13,
              fontFamily: 'Outfit, sans-serif',
              cursor: 'pointer',
              boxShadow: `0 0 20px ${glow}`,
            }}
          >
            Begin met scannen
          </button>
        )}
      </div>
    );
  }

  const groups = groupLines(lines);
  let renderIndex = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '0 20px 100px' }}>
      {groups.map((group) => (
        <div key={group.key} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {group.groupId && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 11, fontWeight: 700, color: 'var(--text-3)',
              textTransform: 'uppercase', letterSpacing: '0.06em',
              padding: '0 2px',
            }}>
              {group.groupLabel ?? 'Groep'} · {group.items.length}
            </div>
          )}
          {group.items.map((line) => {
            const isNew = line.id === flashId;
            const delay = Math.min(renderIndex * 30, 200);
            renderIndex += 1;
            const offset = swipingLineId === line.id ? swipeOffset : revealedDeleteId === line.id ? -MAX_SWIPE : 0;

            return (
              <div
                key={line.id}
                className={isNew ? 'scan-success' : ''}
                style={{
                  position: 'relative',
                  overflow: 'hidden',
                  borderRadius: 14,
                  animation: `rowIn 0.35s var(--ease-spring) ${delay}ms both`,
                }}
              >
                {/* Swipe-to-delete backing — only mounted while swiping/revealed, since the
                    translucent glass row above it would otherwise let it bleed through */}
                {(swipingLineId === line.id || revealedDeleteId === line.id) && (
                  <button
                    onClick={() => {
                      onDelete(line.id!);
                      setRevealedDeleteId(null);
                      setSwipeOffset(0);
                      if (sheetLineId === line.id) closeSheet();
                    }}
                    aria-label={`Verwijder ${line.artikelnummer}`}
                    style={{
                      position: 'absolute', right: 0, top: 0, bottom: 0, width: MAX_SWIPE,
                      background: '#EF4444', border: 'none', color: '#fff',
                      fontSize: 11, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Verwijder
                  </button>
                )}

                {/* Row content */}
                <div
                  onTouchStart={(e) => handleTouchStart(line.id!, e.touches[0].clientX)}
                  onTouchMove={(e) => handleTouchMove(line.id!, e.touches[0].clientX)}
                  onTouchEnd={() => handleTouchEnd(line.id!)}
                  style={{
                    position: 'relative',
                    background: 'var(--card-bg)',
                    border: isNew ? `1px solid ${accent}50` : '1px solid var(--card-border)',
                    borderRadius: 14,
                    padding: '11px 13px',
                    display: 'flex', alignItems: 'center', gap: 10,
                    touchAction: 'pan-y',
                    transform: `translateX(${offset}px)`,
                    transition: swipingLineId === line.id ? 'none' : 'transform 160ms ease, border-color 0.3s var(--ease)',
                  }}
                >
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
                      {line.status && ` · ${STATUS_OPTIONS.find((s) => s.value === line.status)?.label ?? line.status}`}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                    <button
                      onClick={() => onDecrement(line.id!)}
                      aria-label={`Verminder aantal van ${line.artikelnummer}`}
                      style={ctrlBtnStyle}
                    >
                      <Minus size={14} />
                    </button>

                    <input
                      type="number"
                      min={1}
                      value={line.aantal}
                      aria-label={`Aantal van ${line.artikelnummer}`}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10);
                        if (!isNaN(v) && v >= 1) onChangeAantal(line.id!, v);
                      }}
                      style={{
                        width: 40, height: 44,
                        background: 'var(--border-1)',
                        border: '1px solid var(--border-2)',
                        borderRadius: 10,
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
                      aria-label={`Verhoog aantal van ${line.artikelnummer}`}
                      style={{
                        ...ctrlBtnStyle,
                        background: `${accent}20`,
                        border: `1px solid ${accent}35`,
                        color: accent,
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Kebab menu */}
                  <button
                    onClick={() => {
                      if (justSwipedRef.current.get(line.id!)) { justSwipedRef.current.set(line.id!, false); return; }
                      openSheet(line.id!);
                    }}
                    aria-label={`Meer opties voor ${line.artikelnummer}`}
                    style={{
                      width: 44, height: 44, flexShrink: 0,
                      background: 'transparent', border: 'none',
                      color: 'var(--text-3)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: 8,
                    }}
                  >
                    <MoreVertical size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {/* Detail sheet: status chips + note + delete */}
      {activeLine && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 80 }}>
          <button
            onClick={closeSheet}
            aria-label="Sluiten"
            style={{ position: 'absolute', inset: 0, background: 'rgba(3,7,18,0.6)', border: 'none' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            WebkitBackdropFilter: 'var(--glass-blur)',
            borderTop: '1px solid var(--border-2)',
            borderTopLeftRadius: 20, borderTopRightRadius: 20,
            padding: '10px 20px 24px',
            boxShadow: 'var(--glass-shadow)',
          }}>
            <div style={{ width: 40, height: 5, borderRadius: 99, background: 'var(--border-2)', margin: '0 auto 14px' }} />

            <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>
              {activeLine.artikelnummer}
              {activeLine.kleurnummer && activeLine.kleurnummer !== activeLine.artikelnummer && (
                <span style={{ color: 'var(--text-3)', fontWeight: 400 }}> · {activeLine.kleurnummer}</span>
              )}
            </p>
            <p style={{ margin: '2px 0 16px', fontSize: 12, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
              {activeLine.maat || '—'} · {activeLine.barcode}
            </p>

            <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              {STATUS_OPTIONS.map((opt) => (
                <Chip
                  key={opt.value}
                  label={opt.label}
                  selected={activeLine.status === opt.value}
                  accent={accent}
                  onClick={() => onUpdateLine(activeLine.id!, { status: activeLine.status === opt.value ? undefined : opt.value })}
                />
              ))}
            </div>

            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              Opmerking
            </label>
            <textarea
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => onUpdateLine(activeLine.id!, { note: noteDraft || undefined })}
              placeholder="Voeg een opmerking toe…"
              rows={2}
              style={{
                width: '100%', padding: '10px 12px', marginBottom: 16,
                background: 'var(--border-1)', border: '1px solid var(--border-2)',
                borderRadius: 12, color: 'var(--text-1)', fontSize: 13,
                fontFamily: 'Outfit, sans-serif', resize: 'none', outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              {confirmDelete === activeLine.id ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { onDelete(activeLine.id!); closeSheet(); }}
                    style={{
                      minHeight: 44, padding: '0 14px',
                      background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
                      borderRadius: 10, color: '#F87171', cursor: 'pointer', fontSize: 12, fontWeight: 700,
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <Check size={13} /> Ja, verwijder
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    style={{
                      minHeight: 44, padding: '0 14px',
                      background: 'var(--border-1)', border: '1px solid var(--border-2)',
                      borderRadius: 10, color: 'var(--text-3)', cursor: 'pointer', fontSize: 12,
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(activeLine.id!)}
                  style={{
                    minHeight: 44, padding: '0 14px',
                    background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 10, color: '#F87171', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Trash2 size={14} /> Verwijder regel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ctrlBtnStyle: React.CSSProperties = {
  width: 34, height: 44,
  background: 'var(--border-1)',
  border: '1px solid var(--border-2)',
  borderRadius: 10,
  color: 'var(--text-2)',
  cursor: 'pointer',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.2s var(--ease)',
};
