import { useState } from 'react';
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

  if (lines.length === 0) {
    return (
      <div className="text-center py-10 text-gray-600 text-sm">
        Nog geen artikelen gescand
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {lines.map((line) => (
        <div
          key={line.id}
          className="bg-white/5 border border-white/10 rounded-2xl p-3"
        >
          {/* Article info */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="font-bold text-white text-sm leading-tight truncate">
                {line.artikelnummer}
                {line.kleurnummer && line.kleurnummer !== line.artikelnummer && (
                  <span className="text-gray-400 font-normal"> · {line.kleurnummer}</span>
                )}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                Maat: {line.maat || '—'} &nbsp;|&nbsp; {line.barcode}
              </p>
              {line.artikel && (
                <p className="text-xs text-gray-500 truncate">{line.artikel}</p>
              )}
            </div>

            {/* Delete button */}
            {confirmDelete === line.id ? (
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => { onDelete(line.id!); setConfirmDelete(null); }}
                  className="bg-red-500 text-white rounded-lg px-2 py-1.5 text-xs font-bold flex items-center gap-1 active:scale-95"
                >
                  <Check size={12} /> Ja
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
                onClick={() => setConfirmDelete(line.id!)}
                className="shrink-0 p-2 rounded-xl text-gray-500 active:text-red-400 active:bg-red-500/10"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>

          {/* Quantity controls */}
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() => onDecrement(line.id!)}
              className="bg-white/10 rounded-xl p-2.5 active:scale-95 active:bg-white/20"
            >
              <Minus size={16} />
            </button>
            <input
              type="number"
              min={1}
              value={line.aantal}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 1) onChangeAantal(line.id!, v);
              }}
              className="flex-1 bg-white/10 border border-white/10 rounded-xl text-center py-2 text-white font-bold text-base focus:outline-none focus:border-white/30 w-16"
            />
            <button
              onClick={() => onIncrement(line.id!)}
              className={`${accentColor} rounded-xl p-2.5 active:scale-95`}
            >
              <Plus size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
