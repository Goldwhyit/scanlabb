import { useEffect, useRef, useState } from 'react';
import { Plus, Minus, Trash2, Check } from 'lucide-react';
import type { OrderLine } from '../db/database';

interface OrderListProps {
  lines: OrderLine[];
  onIncrement: (id: number) => void;
  onDecrement: (id: number) => void;
  onChangeAantal: (id: number, val: number) => void;
  onDelete: (id: number) => void;
  accentColor: string;
}

export default function OrderList({
  lines,
  onIncrement,
  onDecrement,
  onChangeAantal,
  onDelete,
  accentColor,
}: OrderListProps) {
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [sheetLineId, setSheetLineId] = useState<number | null>(null);
  const [swipingLineId, setSwipingLineId] = useState<number | null>(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [revealedDeleteId, setRevealedDeleteId] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);
  const justSwiped = useRef(false);

  const activeLine = sheetLineId ? lines.find((l) => l.id === sheetLineId) : undefined;

  useEffect(() => {
    if (sheetLineId && !activeLine) {
      setSheetLineId(null);
      setConfirmDelete(null);
    }
  }, [sheetLineId, activeLine]);

  const maxSwipe = 92;

  const handleTouchStart = (lineId: number, clientX: number) => {
    touchStartX.current = clientX;
    setSwipingLineId(lineId);
    setSwipeOffset(revealedDeleteId === lineId ? -maxSwipe : 0);
  };

  const handleTouchMove = (lineId: number, clientX: number) => {
    if (touchStartX.current === null || swipingLineId !== lineId) return;
    const diff = clientX - touchStartX.current;
    if (Math.abs(diff) > 8) justSwiped.current = true;
    const base = revealedDeleteId === lineId ? -maxSwipe : 0;
    const next = Math.min(0, Math.max(-maxSwipe, base + diff));
    setSwipeOffset(next);
  };

  const handleTouchEnd = (lineId: number) => {
    if (swipingLineId !== lineId) return;
    const shouldReveal = swipeOffset <= -maxSwipe * 0.6;
    setRevealedDeleteId(shouldReveal ? lineId : null);
    setSwipeOffset(shouldReveal ? -maxSwipe : 0);
    setSwipingLineId(null);
    touchStartX.current = null;
  };

  if (lines.length === 0) {
    return (
      <div className="text-center py-10 text-gray-600 text-sm">
        Nog geen artikelen gescand
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <div className="px-1 pb-1">
          <p className="text-[11px] text-gray-500">
            Tip: swipe naar links om te verwijderen · tik op een regel om aantal te wijzigen.
          </p>
        </div>
      {lines.map((line) => (
        <div
          key={line.id}
          className="relative bg-white/5 border border-white/10 rounded-xl overflow-hidden"
        >
          <div className="absolute right-0 top-0 h-full w-[92px]">
            <button
              onClick={() => {
                onDelete(line.id!);
                setRevealedDeleteId(null);
                setSwipeOffset(0);
                if (sheetLineId === line.id) setSheetLineId(null);
              }}
              className="h-full w-full bg-red-500 text-white text-xs font-bold flex items-center justify-center"
            >
              Verwijder
            </button>
          </div>

          <div
            onClick={() => {
              if (justSwiped.current) {
                justSwiped.current = false;
                return;
              }
              setConfirmDelete(null);
              setSheetLineId(line.id!);
            }}
            onTouchStart={(e) => handleTouchStart(line.id!, e.touches[0].clientX)}
            onTouchMove={(e) => handleTouchMove(line.id!, e.touches[0].clientX)}
            onTouchEnd={() => handleTouchEnd(line.id!)}
            style={{
              transform: `translateX(${swipingLineId === line.id ? swipeOffset : revealedDeleteId === line.id ? -maxSwipe : 0}px)`,
              transition: swipingLineId === line.id ? 'none' : 'transform 160ms ease',
              touchAction: 'pan-y',
            }}
            className="relative z-10 bg-[#171724] w-full px-3 py-2.5 flex items-center gap-2 text-left active:bg-white/5"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white font-semibold truncate whitespace-nowrap">
                {line.artikelnummer}
                {line.kleurnummer && line.kleurnummer !== line.artikelnummer && (
                  <span className="text-gray-400 font-normal"> · {line.kleurnummer}</span>
                )}
                <span className="text-gray-500 font-normal"> · {line.maat || '—'}</span>
              </p>
            </div>
            <span className="shrink-0 bg-white/10 border border-white/20 rounded-lg px-2 py-1 text-xs font-bold text-white min-w-10 text-center">
              {line.aantal}x
            </span>
          </div>
        </div>
      ))}
      </div>

      {activeLine && (
        <div className="fixed inset-0 z-40">
          <button
            onClick={() => {
              setSheetLineId(null);
              setConfirmDelete(null);
            }}
            className="absolute inset-0 bg-black/60"
            aria-label="Sluit"
          />

          <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-white/15 bg-[#12121f] p-4 pb-6">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-white/20" />

            <p className="text-sm text-white font-bold truncate">
              {activeLine.artikelnummer}
              {activeLine.kleurnummer && activeLine.kleurnummer !== activeLine.artikelnummer && (
                <span className="text-gray-400 font-normal"> · {activeLine.kleurnummer}</span>
              )}
              <span className="text-gray-500 font-normal"> · {activeLine.maat || '—'}</span>
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {activeLine.barcode}
              {activeLine.artikel ? ` · ${activeLine.artikel}` : ''}
            </p>

            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => onDecrement(activeLine.id!)}
                className="bg-white/10 rounded-lg p-2.5 active:scale-95 active:bg-white/20"
              >
                <Minus size={16} />
              </button>
              <input
                type="number"
                min={1}
                value={activeLine.aantal}
                onChange={(e) => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v >= 1) onChangeAantal(activeLine.id!, v);
                }}
                className="flex-1 bg-white/10 border border-white/10 rounded-lg text-center py-2 text-white font-bold text-base focus:outline-none focus:border-white/30"
              />
              <button
                onClick={() => onIncrement(activeLine.id!)}
                className={`${accentColor} rounded-lg p-2.5 active:scale-95`}
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="mt-4 flex justify-end">
              {confirmDelete === activeLine.id ? (
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => {
                      onDelete(activeLine.id!);
                      setConfirmDelete(null);
                      setSheetLineId(null);
                    }}
                    className="bg-red-500 text-white rounded-lg px-2 py-1.5 text-xs font-bold flex items-center gap-1 active:scale-95"
                  >
                    <Check size={12} /> Ja, verwijder
                  </button>
                  <button
                    onClick={() => setConfirmDelete(null)}
                    className="bg-white/10 text-white rounded-lg px-2 py-1.5 text-xs active:scale-95"
                  >
                    Nee
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(activeLine.id!)}
                  className="shrink-0 px-2 py-1.5 rounded-lg text-red-300 bg-red-500/10 border border-red-500/20 text-xs font-semibold active:text-red-200"
                >
                  <span className="inline-flex items-center gap-1">
                    <Trash2 size={12} /> Verwijder regel
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
