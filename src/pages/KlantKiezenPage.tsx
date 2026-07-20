import { useState, useEffect, useRef } from 'react';
import { Search, UserCheck } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import type { Customer } from '../db/database';
import Header from '../components/Header';

export default function KlantKiezenPage() {
  const { setPage, pendingOrderType, startSession } = useAppStore();
  const [query, setQuery] = useState('');
  const [all, setAll] = useState<Customer[]>([]);
  const [results, setResults] = useState<Customer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const isVerkoop = pendingOrderType === 'verkoop';
  const accent = isVerkoop ? 'var(--accent)' : 'var(--inkoop)';
  const glow = isVerkoop ? 'var(--accent-glow)' : 'var(--inkoop-glow)';

  useEffect(() => {
    db.customers.toArray().then((c) => { setAll(c); setResults(c.slice(0, 40)); });
    setTimeout(() => inputRef.current?.focus(), 300);
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q) { setResults(all.slice(0, 40)); return; }
    setResults(all.filter((c) =>
      c.klantnaam.toLowerCase().includes(q) || c.klantnummer.toLowerCase().includes(q)
    ).slice(0, 40));
  }, [query, all]);

  const select = (klant: Customer) => {
    if (pendingOrderType) startSession(pendingOrderType, klant);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Header
        title={isVerkoop ? 'Verkooporder' : 'Inkooporder'}
        subtitle="Klant kiezen"
        showBack
        onBack={() => setPage('home')}
      />

      <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Search */}
        <div style={{ padding: '16px 20px 8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)', pointerEvents: 'none' }} />
            <input
              ref={inputRef}
              type="text"
              placeholder="Zoek op naam of klantnummer…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '13px 14px 13px 42px',
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                border: '1px solid var(--border-2)',
                borderRadius: 14,
                color: 'var(--text-1)',
                fontSize: 15,
                fontFamily: 'Outfit, sans-serif',
                outline: 'none',
                boxShadow: 'var(--glass-shadow)',
                transition: 'border-color 0.2s var(--ease)',
              }}
              onFocus={(e) => e.target.style.borderColor = accent}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
            />
          </div>
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
            {results.length} klanten gevonden
          </p>
        </div>

        {/* Empty state */}
        {all.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '40px 20px', color: 'var(--text-3)' }}>
            <UserCheck size={40} />
            <p style={{ margin: 0, fontSize: 14, textAlign: 'center' }}>
              Geen klantenbestand geladen.{' '}
              <button onClick={() => setPage('database-beheer')} style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: 14, padding: 0, textDecoration: 'underline' }}>
                Upload een bestand
              </button>
            </p>
          </div>
        )}

        {/* Results */}
        <div style={{ flex: 1, overflow: 'auto', padding: '0 20px 80px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {results.map((klant, i) => (
            <button
              key={klant.id}
              onClick={() => select(klant)}
              style={{
                width: '100%',
                background: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                borderRadius: 14,
                padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
                cursor: 'pointer', textAlign: 'left',
                animation: `rowIn 0.3s var(--ease-spring) ${Math.min(i * 25, 200)}ms both`,
                transition: 'all 0.2s var(--ease)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${accent}40`; e.currentTarget.style.transform = 'translateX(3px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-1)'; e.currentTarget.style.transform = 'translateX(0)'; }}
            >
              <div style={{
                width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                background: `${accent}18`,
                border: `1px solid ${accent}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <UserCheck size={17} color={accent} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {klant.klantnaam || '—'}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                  {klant.klantnummer || 'Geen nummer'}
                </p>
              </div>
              <div style={{
                padding: '5px 12px', borderRadius: 8,
                background: `${accent}18`, border: `1px solid ${accent}30`,
                fontSize: 12, fontWeight: 700, color: accent,
                flexShrink: 0,
              }}>
                Kies
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
