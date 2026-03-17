import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, GripVertical, Eye, EyeOff, Check, ChevronUp, ChevronDown } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import type { ExportConfig, ExportColumn } from '../db/database';
import { DEFAULT_VERKOOP_COLUMNS, DEFAULT_INKOOP_COLUMNS } from '../utils/exportUtils';

type OrderType = 'verkoop' | 'inkoop';

const ALL_SOURCE_FIELDS = [
  { field: 'ordertype', label: 'Ordertype (VO/IO)' },
  { field: 'artikelnummer', label: 'Artikelnummer' },
  { field: 'kleurnummer', label: 'Kleurnummer' },
  { field: 'maat', label: 'Maat' },
  { field: 'barcode', label: 'Barcode' },
  { field: 'aantal', label: 'Aantal' },
  { field: 'artikel', label: 'Artikel omschrijving' },
  { field: 'kleur', label: 'Kleur omschrijving' },
  { field: 'klant', label: 'Klantnaam' },
];

export default function ExportInstellingenPage() {
  const { setPage } = useAppStore();
  const [orderType, setOrderType] = useState<OrderType>('verkoop');
  const [config, setConfig] = useState<ExportConfig>({
    name: 'Standaard',
    orderType: 'verkoop',
    columns: DEFAULT_VERKOOP_COLUMNS,
    skipFirstRow: false,
    dataStartRow: 1,
  });
  const [saved, setSaved] = useState(false);

  const loadConfig = useCallback(async (type: OrderType) => {
    const existing = await db.exportConfigs.where('orderType').equals(type).first();
    if (existing) {
      setConfig(existing);
    } else {
      setConfig({
        name: 'Standaard',
        orderType: type,
        columns: type === 'verkoop' ? DEFAULT_VERKOOP_COLUMNS : DEFAULT_INKOOP_COLUMNS,
        skipFirstRow: false,
        dataStartRow: 1,
      });
    }
  }, []);

  useEffect(() => { loadConfig(orderType); }, [orderType, loadConfig]);

  const saveConfig = async () => {
    const existing = await db.exportConfigs.where('orderType').equals(orderType).first();
    if (existing?.id) {
      await db.exportConfigs.update(existing.id, { ...config, orderType });
    } else {
      await db.exportConfigs.add({ ...config, orderType });
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleColumn = (id: string) => {
    setConfig((c) => ({
      ...c,
      columns: c.columns.map((col) =>
        col.id === id ? { ...col, enabled: !col.enabled } : col
      ),
    }));
  };

  const renameColumn = (id: string, label: string) => {
    setConfig((c) => ({
      ...c,
      columns: c.columns.map((col) =>
        col.id === id ? { ...col, label } : col
      ),
    }));
  };

  const moveColumn = (id: string, dir: 'up' | 'down') => {
    setConfig((c) => {
      const cols = [...c.columns];
      const idx = cols.findIndex((col) => col.id === id);
      const newIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= cols.length) return c;
      [cols[idx], cols[newIdx]] = [cols[newIdx], cols[idx]];
      return { ...c, columns: cols };
    });
  };

  const addColumn = (sourceField: string) => {
    if (config.columns.find((c) => c.sourceField === sourceField)) return;
    const meta = ALL_SOURCE_FIELDS.find((f) => f.field === sourceField);
    const newCol: ExportColumn = {
      id: sourceField + '_' + Date.now(),
      sourceField,
      label: meta?.label ?? sourceField,
      enabled: true,
    };
    setConfig((c) => ({ ...c, columns: [...c.columns, newCol] }));
  };

  const removeColumn = (id: string) => {
    setConfig((c) => ({ ...c, columns: c.columns.filter((col) => col.id !== id) }));
  };

  const availableToAdd = ALL_SOURCE_FIELDS.filter(
    (f) => !config.columns.find((c) => c.sourceField === f.field)
  );

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f1a] text-white">
      <header className="px-4 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => setPage('home')} className="p-2 rounded-xl bg-white/5 active:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black">Export instellingen</h2>
          <p className="text-xs text-gray-400">Kolommen & opmaak configureren</p>
        </div>
      </header>

      {/* Order type tabs */}
      <div className="mx-4 flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-4">
        {(['verkoop', 'inkoop'] as OrderType[]).map((t) => (
          <button
            key={t}
            onClick={() => setOrderType(t)}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${
              orderType === t
                ? t === 'verkoop' ? 'bg-[#00e5ff] text-black' : 'bg-purple-500 text-white'
                : 'text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 space-y-5 pb-24">
        {/* First row settings */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
          <p className="text-sm font-bold text-white">Rijinstellingen</p>

          <label className="flex items-center gap-3">
            <div
              onClick={() => setConfig((c) => ({ ...c, skipFirstRow: !c.skipFirstRow }))}
              className={`w-11 h-6 rounded-full transition-colors cursor-pointer flex items-center px-0.5 ${
                config.skipFirstRow ? 'bg-[#00e5ff]' : 'bg-white/15'
              }`}
            >
              <div className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${config.skipFirstRow ? 'translate-x-5' : ''}`} />
            </div>
            <span className="text-sm text-gray-300">
              {config.skipFirstRow ? 'Geen headerregel in export' : 'Headerregel opnemen'}
            </span>
          </label>

          <div>
            <label className="text-xs text-gray-400 block mb-1">Data begint op rij</label>
            <input
              type="number"
              min={1}
              max={10}
              value={config.dataStartRow}
              onChange={(e) => setConfig((c) => ({ ...c, dataStartRow: parseInt(e.target.value) || 1 }))}
              className="bg-white/10 border border-white/10 rounded-xl px-4 py-2.5 text-white w-24 focus:outline-none focus:border-white/30"
            />
            <p className="text-xs text-gray-500 mt-1">
              Gebruik dit om lege regels vóór de data toe te voegen (bijv. voor template-headers)
            </p>
          </div>
        </div>

        {/* Column order & visibility */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
          <p className="text-sm font-bold text-white mb-3">Kolomvolgorde & zichtbaarheid</p>
          <div className="space-y-2">
            {config.columns.map((col, idx) => (
              <div
                key={col.id}
                className={`flex items-center gap-2 rounded-xl p-2.5 border ${
                  col.enabled ? 'bg-white/5 border-white/10' : 'bg-transparent border-white/5 opacity-50'
                }`}
              >
                <GripVertical size={16} className="text-gray-600 shrink-0" />

                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={col.label}
                    onChange={(e) => renameColumn(col.id, e.target.value)}
                    className="bg-transparent text-sm text-white font-medium w-full focus:outline-none border-b border-transparent focus:border-white/30"
                  />
                  <p className="text-xs text-gray-500">{col.sourceField}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveColumn(col.id, 'up')}
                    disabled={idx === 0}
                    className="p-1.5 rounded-lg text-gray-400 active:text-white disabled:opacity-20"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    onClick={() => moveColumn(col.id, 'down')}
                    disabled={idx === config.columns.length - 1}
                    className="p-1.5 rounded-lg text-gray-400 active:text-white disabled:opacity-20"
                  >
                    <ChevronDown size={14} />
                  </button>
                  <button
                    onClick={() => toggleColumn(col.id)}
                    className="p-1.5 rounded-lg text-gray-400 active:text-white"
                  >
                    {col.enabled ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={() => removeColumn(col.id)}
                    className="p-1.5 rounded-lg text-gray-400 active:text-red-400 text-sm font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add column */}
          {availableToAdd.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <p className="text-xs text-gray-400 mb-2">Kolom toevoegen</p>
              <div className="flex flex-wrap gap-2">
                {availableToAdd.map((f) => (
                  <button
                    key={f.field}
                    onClick={() => addColumn(f.field)}
                    className="text-xs bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 text-gray-300 active:bg-white/20"
                  >
                    + {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save button - sticky */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-[#0f0f1a]/90 backdrop-blur border-t border-white/10">
        <button
          onClick={saveConfig}
          className={`w-full py-4 rounded-xl font-bold text-base flex items-center justify-center gap-2 transition-all active:scale-95 ${
            saved ? 'bg-green-500 text-white' : 'bg-[#00e5ff] text-black'
          }`}
        >
          {saved ? <><Check size={18} /> Opgeslagen</> : 'Instellingen opslaan'}
        </button>
      </div>
    </div>
  );
}
