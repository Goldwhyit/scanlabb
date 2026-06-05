import { useEffect, useState } from 'react';
import { ShoppingCart, PackageSearch, Wifi, WifiOff, ChevronRight } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import Header from '../components/Header';

export default function HomePage() {
  const { setPage, setPendingOrderType, activeSession } = useAppStore();
  const [articleCount, setArticleCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    db.articles.count().then(setArticleCount);
    db.customers.count().then(setCustomerCount);
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);

  const startOrder = (type: 'verkoop' | 'inkoop') => {
    setPendingOrderType(type);
    setPage('klant-kiezen');
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main style={{ flex: 1, maxWidth: 680, width: '100%', margin: '0 auto', padding: '24px 20px' }}>
        {/* Online status */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 7,
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-1)',
          borderRadius: 99, padding: '5px 12px',
          fontSize: 11, fontWeight: 600,
          color: isOnline ? 'var(--accent)' : '#F59E0B',
          marginBottom: 28,
          animation: 'fadeUp 0.4s var(--ease-spring)',
        }}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
          {isOnline ? 'Online' : 'Offline modus'}
        </div>

        {/* Active session banner */}
        {activeSession && (
          <div style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--glass-blur)',
            border: '1px solid var(--border-accent)',
            borderRadius: 18,
            padding: '16px 18px',
            marginBottom: 20,
            boxShadow: '0 0 32px var(--accent-glow)',
            animation: 'fadeUp 0.4s var(--ease-spring)',
          }}>
            <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Sessie actief
            </p>
            <p style={{ margin: '0 0 12px', fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>
              {activeSession.type === 'verkoop' ? 'Verkooporder' : 'Inkooporder'} — {activeSession.klant?.klantnaam ?? '—'}
            </p>
            <button
              onClick={() => setPage('scan-sessie')}
              style={{
                width: '100%', padding: '11px 0',
                background: 'var(--accent)',
                border: 'none', borderRadius: 12,
                color: '#030712', fontWeight: 800, fontSize: 14,
                cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                boxShadow: '0 0 20px var(--accent-glow)',
                transition: 'all 0.2s var(--ease)',
              }}
            >
              Hervat sessie →
            </button>
          </div>
        )}

        {/* Stats */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24,
          animation: 'fadeUp 0.4s var(--ease-spring) 60ms both',
        }}>
          {[
            { label: 'Artikelen', value: articleCount.toLocaleString('nl'), warn: articleCount === 0 },
            { label: 'Klanten', value: customerCount.toLocaleString('nl'), warn: customerCount === 0 },
          ].map((s, i) => (
            <div
              key={i}
              onClick={() => setPage('database-beheer')}
              style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'var(--glass-blur)',
                border: s.warn ? '1px solid rgba(245,158,11,0.25)' : '1px solid var(--border-1)',
                borderRadius: 16, padding: '16px 18px',
                cursor: 'pointer',
                transition: 'all 0.2s var(--ease)',
              }}
            >
              <p style={{ margin: '0 0 4px', fontFamily: 'DM Mono, monospace', fontSize: 26, fontWeight: 500, color: s.warn ? '#F59E0B' : 'var(--accent)', letterSpacing: '-0.02em' }}>
                {s.value}
              </p>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</p>
              {s.warn && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#F59E0B' }}>→ Upload bestand</p>}
            </div>
          ))}
        </div>

        {/* Order buttons */}
        <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Nieuwe sessie
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Verkoop */}
          <button
            onClick={() => startOrder('verkoop')}
            style={{
              width: '100%', padding: '20px 20px',
              background: 'linear-gradient(135deg, rgba(0,245,212,0.12) 0%, rgba(0,229,255,0.06) 100%)',
              border: '1px solid rgba(0,245,212,0.22)',
              borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 16,
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 0 32px rgba(0,245,212,0.08)',
              transition: 'all 0.3s var(--ease)',
              animation: 'fadeUp 0.4s var(--ease-spring) 120ms both',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 48px rgba(0,245,212,0.18)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 32px rgba(0,245,212,0.08)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px var(--accent-glow)',
            }}>
              <ShoppingCart size={22} color="#030712" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Verkooporder</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Artikelen inscannen voor verkoop</p>
            </div>
            <ChevronRight size={18} color="var(--accent)" />
          </button>

          {/* Inkoop */}
          <button
            onClick={() => startOrder('inkoop')}
            style={{
              width: '100%', padding: '20px 20px',
              background: 'linear-gradient(135deg, rgba(168,85,247,0.10) 0%, rgba(124,58,237,0.05) 100%)',
              border: '1px solid rgba(168,85,247,0.20)',
              borderRadius: 20,
              display: 'flex', alignItems: 'center', gap: 16,
              cursor: 'pointer', textAlign: 'left',
              boxShadow: '0 0 32px rgba(168,85,247,0.06)',
              transition: 'all 0.3s var(--ease)',
              animation: 'fadeUp 0.4s var(--ease-spring) 180ms both',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 0 48px rgba(168,85,247,0.15)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 0 32px rgba(168,85,247,0.06)'; e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: 14, flexShrink: 0,
              background: 'linear-gradient(135deg, var(--inkoop) 0%, #7C3AED 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 20px var(--inkoop-glow)',
            }}>
              <PackageSearch size={22} color="#ffffff" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 800, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>Inkooporder</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>Artikelen inscannen voor inkoop</p>
            </div>
            <ChevronRight size={18} color="var(--inkoop)" />
          </button>
        </div>
      </main>

      <footer style={{ textAlign: 'center', padding: '20px', fontSize: 11, color: 'var(--text-3)' }}>
        ScanLabb v2.0 — LoopLabb B.V. Amsterdam
      </footer>
    </div>
  );
}
