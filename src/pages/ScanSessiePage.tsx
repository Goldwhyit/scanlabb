import { useEffect, useState, useCallback, useRef } from 'react';
import { Download, LogOut, ScanLine, X, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import type { OrderLine, ExportConfig } from '../db/database';
import Header from '../components/Header';
import ScannerViewport from '../components/ScannerViewport';
import KPICards from '../components/KPICards';
import OrderTable from '../components/OrderTable';
import { useScanner } from '../utils/useScanner';
import { exportToExcel, DEFAULT_VERKOOP_COLUMNS, DEFAULT_INKOOP_COLUMNS } from '../utils/exportUtils';

export default function ScanSessiePage() {
  const { activeSession, endSession, setLastScanResult, lastScanResult } = useAppStore();
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [manualAantal, setManualAantal] = useState('');
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const manualRef = useRef<HTMLInputElement>(null);

  const isVerkoop = activeSession?.type === 'verkoop';
  const accent = isVerkoop ? 'var(--accent)' : 'var(--inkoop)';
  const glow = isVerkoop ? 'var(--accent-glow)' : 'var(--inkoop-glow)';

  const loadLines = useCallback(async () => {
    if (!activeSession) return;
    const all = await db.orderLines.where('sessionId').equals(activeSession.id).sortBy('timestamp');
    setLines(all.reverse());
  }, [activeSession]);

  useEffect(() => { loadLines(); }, [loadLines]);

  useEffect(() => {
    if (!activeSession) return;
    db.exportConfigs.where('orderType').equals(activeSession.type).first().then((cfg) => {
      setExportConfig(cfg ?? {
        name: 'Standaard', orderType: activeSession.type,
        columns: isVerkoop ? DEFAULT_VERKOOP_COLUMNS : DEFAULT_INKOOP_COLUMNS,
        skipFirstRow: false, dataStartRow: 1,
      });
    });
  }, [activeSession, isVerkoop]);

  useEffect(() => {
    if (activeSession) db.sessions.put({ ...activeSession, updatedAt: Date.now() });
  }, [activeSession]);

  const handleScan = useCallback(async (barcode: string) => {
    if (!activeSession) return;
    const article = await db.articles.where('barcode').equals(barcode).first();

    if (!article) {
      setLastScanResult({ success: false, message: `Barcode niet gevonden: ${barcode}`, barcode });
      return;
    }

    const qty = parseInt(manualAantal, 10);
    const safeQty = (!isNaN(qty) && qty >= 1) ? qty : 1;

    const existing = await db.orderLines
      .where('sessionId').equals(activeSession.id)
      .filter((l) => l.barcode === barcode).first();

    let updatedId: number;
    if (existing?.id) {
      await db.orderLines.update(existing.id, { aantal: existing.aantal + safeQty, timestamp: Date.now() });
      updatedId = existing.id;
    } else {
      updatedId = await db.orderLines.add({
        sessionId: activeSession.id,
        barcode,
        artikelnummer: article.artikelnummer,
        kleurnummer: article.kleurnummer,
        maat: article.maat,
        artikel: article.artikel,
        kleur: article.kleur,
        prijs: article.prijs,
        aantal: safeQty,
        timestamp: Date.now(),
      }) as number;
    }

    setLastScanResult({ success: true, message: `${article.artikelnummer} · ${article.kleurnummer} · ${article.maat}`, barcode });
    setFlashId(updatedId);
    setTimeout(() => setFlashId(null), 600);
    setManualAantal('');
    await loadLines();
  }, [activeSession, manualAantal, setLastScanResult, loadLines]);

  const { videoRef, isActive, hasPermission, cameras, selectedCamera, toggleScan, switchCamera } = useScanner({
    onScan: handleScan,
    onError: (e) => setLastScanResult({ success: false, message: e }),
  });

  const handleIncrement = async (id: number) => {
    const l = lines.find((x) => x.id === id);
    if (l) { await db.orderLines.update(id, { aantal: l.aantal + 1 }); await loadLines(); }
  };
  const handleDecrement = async (id: number) => {
    const l = lines.find((x) => x.id === id);
    if (l && l.aantal > 1) { await db.orderLines.update(id, { aantal: l.aantal - 1 }); await loadLines(); }
  };
  const handleChangeAantal = async (id: number, val: number) => {
    await db.orderLines.update(id, { aantal: val }); await loadLines();
  };
  const handleDelete = async (id: number) => {
    await db.orderLines.delete(id); await loadLines();
  };

  const handleExport = () => {
    if (!exportConfig || !activeSession) return;
    const ts = new Date().toISOString().slice(0, 10);
    const klant = activeSession.klant?.klantnaam ?? 'onbekend';
    exportToExcel(lines, exportConfig, `${activeSession.type}-${klant}-${ts}`, activeSession.type, klant);
  };

  const handleEnd = () => { if (isActive) toggleScan(); endSession(); };

  const totalItems = lines.reduce((s, l) => s + l.aantal, 0);
  const fulfillmentRate = lines.length > 0 ? Math.min(100, Math.round((totalItems / Math.max(totalItems, 1)) * 100)) : 0;

  if (!activeSession) return null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      <Header
        title={isVerkoop ? 'Verkooporder' : 'Inkooporder'}
        subtitle={activeSession.klant?.klantnaam ?? '—'}
        showBack
        onBack={handleEnd}
      />

      {/* Order type tab indicator */}
      <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', padding: '12px 20px 0' }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--glass-bg)',
          backdropFilter: 'var(--glass-blur)',
          border: '1px solid var(--border-1)',
          borderRadius: 12, padding: 4, gap: 2,
        }}>
          {(['verkoop', 'inkoop'] as const).map((t) => (
            <div
              key={t}
              style={{
                padding: '6px 16px',
                borderRadius: 9,
                fontSize: 12, fontWeight: 700,
                background: activeSession.type === t ? (t === 'verkoop' ? 'rgba(0,245,212,0.15)' : 'rgba(168,85,247,0.15)') : 'transparent',
                color: activeSession.type === t ? (t === 'verkoop' ? 'var(--accent)' : 'var(--inkoop)') : 'var(--text-3)',
                border: activeSession.type === t ? `1px solid ${t === 'verkoop' ? 'rgba(0,245,212,0.3)' : 'rgba(168,85,247,0.3)'}` : '1px solid transparent',
                transition: 'all 0.3s var(--ease)',
                textTransform: 'capitalize',
              }}
            >
              {t === 'verkoop' ? 'Verkooporder' : 'Inkooporder'}
            </div>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14 }}>
        {/* Scanner */}
        <ScannerViewport
          videoRef={videoRef as React.RefObject<HTMLVideoElement>}
          isActive={isActive}
          hasPermission={hasPermission}
          cameras={cameras}
          selectedCamera={selectedCamera}
          onToggle={toggleScan}
          onSwitchCamera={switchCamera}
          orderType={activeSession.type}
        />

        {/* Scan result feedback */}
        {lastScanResult && (
          <div style={{ padding: '0 20px' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 14px',
              background: lastScanResult.success ? 'rgba(0,245,212,0.08)' : 'rgba(239,68,68,0.08)',
              border: `1px solid ${lastScanResult.success ? 'rgba(0,245,212,0.25)' : 'rgba(239,68,68,0.25)'}`,
              borderRadius: 12,
              animation: 'fadeUp 0.3s var(--ease-spring)',
            }}>
              {lastScanResult.success
                ? <CheckCircle2 size={16} color="var(--accent)" style={{ flexShrink: 0 }} />
                : <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} />
              }
              <p style={{
                margin: 0, flex: 1, fontSize: 13, fontWeight: 500,
                color: lastScanResult.success ? 'var(--accent)' : '#F87171',
                fontFamily: lastScanResult.success ? 'DM Mono, monospace' : 'Outfit, sans-serif',
              }}>
                {lastScanResult.message}
              </p>
              <button onClick={() => setLastScanResult(null)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4 }}>
                <X size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Manual quantity + actions */}
        <div style={{ padding: '0 20px', display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 5, fontWeight: 500 }}>
              Aantal vóór scan
            </label>
            <input
              ref={manualRef}
              type="number"
              min={1}
              placeholder="1"
              value={manualAantal}
              onChange={(e) => setManualAantal(e.target.value)}
              style={{
                width: '100%', padding: '11px 14px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-2)',
                borderRadius: 12,
                color: 'var(--text-1)',
                fontFamily: 'DM Mono, monospace',
                fontSize: 16, fontWeight: 500,
                textAlign: 'center', outline: 'none',
                transition: 'border-color 0.2s var(--ease)',
              }}
              onFocus={(e) => e.target.style.borderColor = accent}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-2)'}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 5, fontWeight: 500 }}>Export</label>
            <button
              onClick={handleExport}
              style={{
                height: 44,
                padding: '0 16px',
                background: `${accent}18`,
                border: `1px solid ${accent}35`,
                borderRadius: 12,
                color: accent,
                fontWeight: 700, fontSize: 13,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7,
                fontFamily: 'Outfit, sans-serif',
                transition: 'all 0.2s var(--ease)',
                boxShadow: `0 0 16px ${glow}`,
              }}
            >
              <Download size={15} /> XLSX
            </button>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 5, fontWeight: 500 }}>Sessie</label>
            <button
              onClick={handleEnd}
              style={{
                height: 44, padding: '0 14px',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.20)',
                borderRadius: 12,
                color: '#F87171', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 7,
                fontSize: 13, fontWeight: 700,
                fontFamily: 'Outfit, sans-serif',
              }}
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <KPICards
          totalLines={lines.length}
          totalItems={totalItems}
          fulfillmentRate={fulfillmentRate}
          orderType={activeSession.type}
        />

        {/* Divider */}
        <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            <ScanLine size={13} />
            {lines.length} regels · {totalItems} stuks
          </div>
          <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
        </div>

        {/* Order table */}
        <OrderTable
          lines={lines}
          orderType={activeSession.type}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onChangeAantal={handleChangeAantal}
          onDelete={handleDelete}
          flashId={flashId}
        />
      </div>
    </div>
  );
}
