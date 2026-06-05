import { useState, useCallback } from 'react';
import { Upload, Trash2, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import { parseFile, rowToArticle, rowToCustomer } from '../utils/importUtils';
import Header from '../components/Header';

type Tab = 'artikelen' | 'klanten';
type Status = 'idle' | 'loading' | 'done' | 'error';

export default function DatabaseBeheerPage() {
  const { setPage } = useAppStore();
  const [tab, setTab] = useState<Tab>('artikelen');
  const [status, setStatus] = useState<Status>('idle');
  const [message, setMessage] = useState('');
  const [preview, setPreview] = useState<Record<string, unknown>[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [counts, setCounts] = useState<{ articles: number; customers: number } | null>(null);

  const loadCounts = useCallback(async () => {
    const [a, c] = await Promise.all([db.articles.count(), db.customers.count()]);
    setCounts({ articles: a, customers: c });
  }, []);

  useState(() => { loadCounts(); });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: Tab) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStatus('loading'); setMessage('');
    try {
      const rows = await parseFile(file, 0);
      if (type === 'artikelen') {
        const articles = rows.map(rowToArticle).filter(Boolean) as NonNullable<ReturnType<typeof rowToArticle>>[];
        if (!articles.length) throw new Error('Geen artikelen gevonden. Controleer of "Barcode" kolom aanwezig is.');
        await db.articles.clear();
        await db.articles.bulkAdd(articles);
        setMessage(`${articles.length.toLocaleString('nl')} artikelen geïmporteerd`);
      } else {
        const customers = rows.map(rowToCustomer).filter(Boolean) as NonNullable<ReturnType<typeof rowToCustomer>>[];
        if (!customers.length) throw new Error('Geen klanten gevonden. Controleer "Klantnummer" en "Klantnaam" kolommen.');
        await db.customers.clear();
        await db.customers.bulkAdd(customers);
        setMessage(`${customers.length.toLocaleString('nl')} klanten geïmporteerd`);
      }
      setPreview(rows.slice(0, 5));
      setStatus('done');
      await loadCounts();
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Importfout');
    }
    e.target.value = '';
  };

  const clearDB = async (type: Tab) => {
    if (!confirm(`Alle ${type} verwijderen?`)) return;
    if (type === 'artikelen') await db.articles.clear(); else await db.customers.clear();
    await loadCounts();
    setMessage(`${type} verwijderd`); setStatus('idle');
  };

  const previewHeaders = preview[0] ? Object.keys(preview[0]).slice(0, 5) : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Header title="Database" subtitle="Artikelen & klanten" showBack onBack={() => setPage('home')} />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px' }}>
        {/* Counts */}
        {counts && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
            {[{ label: 'Artikelen', val: counts.articles }, { label: 'Klanten', val: counts.customers }].map((s, i) => (
              <div key={i} style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-1)', borderRadius: 16, padding: '16px', animation: 'fadeUp 0.4s var(--ease-spring) both', animationDelay: `${i * 60}ms` }}>
                <p style={{ margin: '0 0 4px', fontFamily: 'DM Mono, monospace', fontSize: 28, fontWeight: 500, color: 'var(--accent)', letterSpacing: '-0.02em' }}>{s.val.toLocaleString('nl')}</p>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)' }}>{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--border-1)', borderRadius: 14, padding: 4, gap: 3, marginBottom: 20 }}>
          {(['artikelen', 'klanten'] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setStatus('idle'); setMessage(''); setPreview([]); }}
              style={{
                flex: 1, padding: '10px 0',
                background: tab === t ? 'var(--accent)' : 'transparent',
                border: 'none', borderRadius: 10,
                color: tab === t ? '#030712' : 'var(--text-3)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
                fontFamily: 'Outfit, sans-serif',
                transition: 'all 0.25s var(--ease)',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Upload zone */}
        <label style={{
          display: 'block',
          border: '1.5px dashed var(--border-2)',
          borderRadius: 20, padding: '32px 20px',
          textAlign: 'center', cursor: 'pointer',
          marginBottom: 16,
          transition: 'all 0.2s var(--ease)',
        }}
          onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
          onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-2)'}
        >
          <Upload size={28} color="var(--text-3)" style={{ marginBottom: 10 }} />
          <p style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>
            Upload {tab === 'artikelen' ? 'artikeldatabase' : 'klantenbestand'}
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 12, color: 'var(--text-3)' }}>
            Excel (.xlsx) of CSV
            {tab === 'artikelen' && ' · Vereist: Barcode, Artikelnummer, Kleurnummer, Maat'}
            {tab === 'klanten' && ' · Vereist: Klantnummer, Klantnaam'}
          </p>
          <div style={{
            display: 'inline-block', padding: '10px 24px',
            background: 'var(--accent)', borderRadius: 12,
            color: '#030712', fontWeight: 700, fontSize: 14,
          }}>
            Kies bestand
          </div>
          <input type="file" accept=".xlsx,.xls,.csv" style={{ display: 'none' }} onChange={(e) => handleUpload(e, tab)} />
        </label>

        {/* Status */}
        {status === 'loading' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', background: 'var(--glass-bg)', border: '1px solid var(--border-1)', borderRadius: 12, marginBottom: 12 }}>
            <Loader2 size={16} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>Bezig met importeren…</p>
          </div>
        )}
        {status === 'done' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', background: 'rgba(0,245,212,0.07)', border: '1px solid rgba(0,245,212,0.25)', borderRadius: 12, marginBottom: 12 }}>
            <CheckCircle2 size={16} color="var(--accent)" />
            <p style={{ margin: 0, fontSize: 13, color: 'var(--accent)' }}>✓ {message}</p>
          </div>
        )}
        {status === 'error' && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '12px 16px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 12, marginBottom: 12 }}>
            <AlertCircle size={16} color="#F87171" />
            <p style={{ margin: 0, fontSize: 13, color: '#F87171' }}>{message}</p>
          </div>
        )}

        {/* Preview */}
        {preview.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <button onClick={() => setShowPreview(!showPreview)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0', marginBottom: 8 }}>
              {showPreview ? <EyeOff size={13} /> : <Eye size={13} />}
              Preview (eerste 5 rijen)
            </button>
            {showPreview && (
              <div style={{ overflow: 'auto', borderRadius: 12, border: '1px solid var(--border-1)', background: 'var(--glass-bg)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <thead>
                    <tr>
                      {previewHeaders.map((h) => (
                        <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, borderBottom: '1px solid var(--border-1)', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i}>
                        {previewHeaders.map((h) => (
                          <td key={h} style={{ padding: '7px 12px', color: 'var(--text-2)', borderBottom: i < preview.length - 1 ? '1px solid var(--border-1)' : 'none', maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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

        {/* Clear */}
        <button
          onClick={() => clearDB(tab)}
          style={{
            width: '100%', padding: '13px', borderRadius: 14,
            background: 'transparent', border: '1px solid rgba(239,68,68,0.20)',
            color: '#F87171', fontWeight: 600, fontSize: 14, cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <Trash2 size={15} /> Verwijder alle {tab}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
