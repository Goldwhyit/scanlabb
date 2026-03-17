import { useState, useCallback } from 'react';
import { ArrowLeft, Upload, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import { parseFile, rowToArticle, rowToCustomer } from '../utils/importUtils';

type TabType = 'artikelen' | 'klanten';
type ImportStatus = 'idle' | 'loading' | 'done' | 'error';

export default function DatabaseBeheerPage() {
  const { setPage } = useAppStore();
  const [tab, setTab] = useState<TabType>('artikelen');
  const [status, setStatus] = useState<ImportStatus>('idle');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [dbCount, setDbCount] = useState<{ articles: number; customers: number } | null>(null);

  const loadCounts = useCallback(async () => {
    const [a, c] = await Promise.all([db.articles.count(), db.customers.count()]);
    setDbCount({ articles: a, customers: c });
  }, []);

  useState(() => { loadCounts(); });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: TabType) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('loading');
    setMessage('');

    try {
      // For artikel import, try row 0 as header first
      const rows = await parseFile(file, 0);

      if (type === 'artikelen') {
        const articles = rows.map(rowToArticle).filter(Boolean) as NonNullable<ReturnType<typeof rowToArticle>>[];
        if (articles.length === 0) {
          throw new Error('Geen artikelen gevonden. Controleer of uw bestand een "Barcode" kolom heeft.');
        }
        await db.articles.clear();
        await db.articles.bulkAdd(articles);
        setPreview(rows.slice(0, 5));
        setMessage(`✓ ${articles.length} artikelen geïmporteerd`);
        setStatus('done');
      } else {
        const customers = rows.map(rowToCustomer).filter(Boolean) as NonNullable<ReturnType<typeof rowToCustomer>>[];
        if (customers.length === 0) {
          throw new Error('Geen klanten gevonden. Controleer of uw bestand "Klantnummer" en "Klantnaam" kolommen heeft.');
        }
        await db.customers.clear();
        await db.customers.bulkAdd(customers);
        setPreview(rows.slice(0, 5));
        setMessage(`✓ ${customers.length} klanten geïmporteerd`);
        setStatus('done');
      }
      await loadCounts();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Importfout');
    }

    // Reset file input
    e.target.value = '';
  };

  const clearDatabase = async (type: TabType) => {
    if (!confirm(`Weet u zeker dat u alle ${type} wilt verwijderen?`)) return;
    if (type === 'artikelen') await db.articles.clear();
    else await db.customers.clear();
    await loadCounts();
    setMessage(`${type === 'artikelen' ? 'Artikeldatabase' : 'Klantenbestand'} geleegd.`);
    setStatus('idle');
  };

  const previewHeaders = preview[0] ? Object.keys(preview[0]).slice(0, 6) : [];

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f1a] text-white">
      <header className="px-4 pt-8 pb-4 flex items-center gap-3">
        <button onClick={() => setPage('home')} className="p-2 rounded-xl bg-white/5 active:bg-white/10">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-xl font-black">Database beheer</h2>
      </header>

      {/* Stats */}
      {dbCount && (
        <div className="mx-4 mb-4 grid grid-cols-2 gap-3">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#00e5ff]">{dbCount.articles.toLocaleString('nl')}</p>
            <p className="text-xs text-gray-400 mt-0.5">Artikelen</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#00e5ff]">{dbCount.customers.toLocaleString('nl')}</p>
            <p className="text-xs text-gray-400 mt-0.5">Klanten</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mx-4 flex gap-1 bg-white/5 border border-white/10 rounded-xl p-1 mb-4">
        {(['artikelen', 'klanten'] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setStatus('idle'); setMessage(''); setPreview([]); }}
            className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${
              tab === t ? 'bg-[#00e5ff] text-black' : 'text-gray-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 px-4 space-y-4">
        {/* Upload area */}
        <div className="border-2 border-dashed border-white/15 rounded-2xl p-6 text-center">
          <Upload size={32} className="mx-auto text-gray-500 mb-3" />
          <p className="text-sm text-gray-300 font-semibold mb-1">
            Upload {tab === 'artikelen' ? 'artikeldatabase' : 'klantenbestand'}
          </p>
          <p className="text-xs text-gray-500 mb-4">
            Excel (.xlsx) of CSV bestand
            {tab === 'artikelen' && <><br />Vereist: Artikelnummer, Kleurnummer, Maat, Barcode</>}
            {tab === 'klanten' && <><br />Vereist: Klantnummer, Klantnaam</>}
          </p>
          <label className="cursor-pointer inline-block bg-[#00e5ff] text-black font-bold px-6 py-3 rounded-xl active:scale-95 transition-transform">
            Kies bestand
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => handleFileUpload(e, tab)}
            />
          </label>
        </div>

        {/* Status message */}
        {status === 'loading' && (
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
            <Loader2 size={18} className="animate-spin text-[#00e5ff]" />
            <p className="text-sm text-gray-300">Bezig met importeren...</p>
          </div>
        )}
        {status === 'done' && (
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 rounded-xl p-4">
            <CheckCircle2 size={18} className="text-green-400 shrink-0" />
            <p className="text-sm text-green-300">{message}</p>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <AlertCircle size={18} className="text-red-400 shrink-0" />
            <p className="text-sm text-red-300">{message}</p>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="flex items-center gap-2 text-sm text-gray-400 mb-2"
            >
              {showPreview ? <EyeOff size={14} /> : <Eye size={14} />}
              {showPreview ? 'Verberg' : 'Toon'} preview (eerste 5 rijen)
            </button>
            {showPreview && (
              <div className="overflow-x-auto rounded-xl border border-white/10">
                <table className="text-xs w-full">
                  <thead>
                    <tr className="bg-white/5">
                      {previewHeaders.map((h) => (
                        <th key={h} className="px-3 py-2 text-left text-gray-400 font-semibold whitespace-nowrap">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-white/5">
                        {previewHeaders.map((h) => (
                          <td key={h} className="px-3 py-2 text-gray-300 whitespace-nowrap max-w-[120px] truncate">
                            {String(row[h] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Delete button */}
        <button
          onClick={() => clearDatabase(tab)}
          className="w-full flex items-center justify-center gap-2 border border-red-500/30 text-red-400 rounded-xl py-3 text-sm font-semibold active:bg-red-500/10"
        >
          <Trash2 size={16} />
          Verwijder alle {tab}
        </button>
      </div>
    </div>
  );
}
