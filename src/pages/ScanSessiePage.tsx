import { useEffect, useState, useCallback, useRef } from 'react';
import { Download, LogOut, ScanLine, Camera, FolderPlus } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import type { OrderLine, ExportConfig, ScanMode } from '../db/database';
import Header from '../components/Header';
import ScannerViewport from '../components/ScannerViewport';
import KPICards from '../components/KPICards';
import OrderTable from '../components/OrderTable';
import SegmentedControl from '../components/SegmentedControl';
import Fab from '../components/Fab';
import Chip from '../components/Chip';
import Tooltip from '../components/Tooltip';
import Toast from '../components/Toast';
import { useScanner } from '../utils/useScanner';
import { normalizeBarcode } from '../utils/barcodeUtils';
import { exportToExcel, DEFAULT_VERKOOP_COLUMNS, DEFAULT_INKOOP_COLUMNS } from '../utils/exportUtils';

const SCAN_MODE_OPTIONS: { value: ScanMode; label: string }[] = [
  { value: 'single', label: 'Single' },
  { value: 'multi', label: 'Multi' },
  { value: 'grouped', label: 'Grouped' },
];

export default function ScanSessiePage() {
  const { activeSession, endSession, setLastScanResult, scannerProfile, setScannerProfile } = useAppStore();
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [manualAantal, setManualAantal] = useState('');
  const [manualBarcode, setManualBarcode] = useState('');
  const [exportedFile, setExportedFile] = useState<File | null>(null);
  const [showPostExport, setShowPostExport] = useState(false);
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const [flashId, setFlashId] = useState<number | null>(null);
  const manualRef = useRef<HTMLInputElement>(null);
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const [suppressKeyboard, setSuppressKeyboard] = useState(true);

  const isVerkoop = activeSession?.type === 'verkoop';
  const accent = isVerkoop ? 'var(--accent)' : 'var(--inkoop)';
  const glow = isVerkoop ? 'var(--accent-glow)' : 'var(--inkoop-glow)';
  const [useEAN13, setUseEAN13] = useState(true);
  const [useGS1, setUseGS1] = useState(true);

  const [activeTab, setActiveTab] = useState<'scan' | 'review'>('scan');
  const [scanMode, setScanMode] = useState<ScanMode>(activeSession?.scanMode ?? 'multi');
  const [maxScans, setMaxScans] = useState<number | undefined>(activeSession?.maxScans);
  const [currentGroupId, setCurrentGroupId] = useState<string | undefined>(undefined);
  const [currentGroupLabel, setCurrentGroupLabel] = useState<string | undefined>(undefined);

  const [linesLoaded, setLinesLoaded] = useState(false);

  const loadLines = useCallback(async () => {
    if (!activeSession) return;
    const all = await db.orderLines.where('sessionId').equals(activeSession.id).sortBy('timestamp');
    setLines(all.reverse());
    setLinesLoaded(true);
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
    if (activeSession) db.sessions.put({ ...activeSession, scanMode, maxScans, updatedAt: Date.now() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id, scanMode, maxScans]);

  const existingGroupCount = new Set(lines.map((l) => l.groupId).filter(Boolean)).size;

  const startNewGroup = useCallback(() => {
    const label = `Groep ${existingGroupCount + 1}`;
    setCurrentGroupId(crypto.randomUUID());
    setCurrentGroupLabel(label);
  }, [existingGroupCount]);

  useEffect(() => {
    if (scanMode === 'grouped' && !currentGroupId && linesLoaded) startNewGroup();
    if (scanMode !== 'grouped') { setCurrentGroupId(undefined); setCurrentGroupLabel(undefined); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanMode, linesLoaded]);

  const totalItemsSoFar = lines.reduce((s, l) => s + l.aantal, 0);
  const limitReached = typeof maxScans === 'number' && maxScans > 0 && totalItemsSoFar >= maxScans;

  const handleScan = useCallback(async (barcode: string, format?: string) => {
    if (!activeSession) return;
    if (limitReached) {
      setLastScanResult({ success: false, message: `Scanlimiet bereikt (max ${maxScans})`, barcode });
      return;
    }
    const norm = normalizeBarcode(barcode);
    const article = await db.articles.where('barcode').equals(norm).first();

    if (!article) {
      const formatSuffix = format ? ` [${format}]` : '';
      setLastScanResult({ success: false, message: `Barcode niet gevonden: ${norm}${formatSuffix}`, barcode: norm });
      return;
    }

    const qty = parseInt(manualAantal, 10);
    const safeQty = (!isNaN(qty) && qty >= 1) ? qty : 1;

    if (typeof maxScans === 'number' && maxScans > 0 && totalItemsSoFar + safeQty > maxScans) {
      setLastScanResult({ success: false, message: `Aantal (${safeQty}) overschrijdt de scanlimiet (max ${maxScans}, nu ${totalItemsSoFar})`, barcode: norm });
      return;
    }

    const existing = await db.orderLines
      .where('sessionId').equals(activeSession.id)
      .filter((l) => l.barcode === norm).first();

    let updatedId: number;
    if (existing?.id) {
      await db.orderLines.update(existing.id, { aantal: existing.aantal + safeQty, timestamp: Date.now() });
      updatedId = existing.id;
    } else {
      updatedId = await db.orderLines.add({
        sessionId: activeSession.id,
        barcode: norm,
        artikelnummer: article.artikelnummer,
        kleurnummer: article.kleurnummer,
        maat: article.maat,
        artikel: article.artikel,
        kleur: article.kleur,
        prijs: article.prijs,
        aantal: safeQty,
        timestamp: Date.now(),
        ...(scanMode === 'grouped' ? { groupId: currentGroupId, groupLabel: currentGroupLabel } : {}),
      }) as number;
    }

    setLastScanResult({ success: true, message: `${norm} · ${article.artikelnummer} · ${article.kleurnummer} · ${article.maat}`, barcode: norm });
    setFlashId(updatedId);
    setTimeout(() => setFlashId(null), 600);
    setManualAantal('');
    await loadLines();
    if (scanMode === 'single') setActiveTab('review');
  }, [activeSession, manualAantal, setLastScanResult, loadLines, limitReached, maxScans, scanMode, currentGroupId, currentGroupLabel]);

  const selectedFormats = [] as string[];
  if (useEAN13) selectedFormats.push('EAN_13');
  if (useGS1) selectedFormats.push('GS1_128');

  const {
    videoRef, isActive, hasPermission, cameras, selectedCamera, toggleScan, switchCamera,
    torchSupported, torchOn, toggleTorch,
  } = useScanner({
    onScan: handleScan,
    onError: (e) => setLastScanResult({ success: false, message: e }),
    formats: selectedFormats,
  });

  useEffect(() => {
    if (scanMode === 'single' && activeTab === 'review' && isActive) toggleScan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

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
  const handleUpdateLine = async (id: number, patch: Partial<Pick<OrderLine, 'status' | 'note'>>) => {
    await db.orderLines.update(id, patch); await loadLines();
  };

  const handleExport = () => {
    if (!exportConfig || !activeSession) return;
    const ts = new Date().toISOString().slice(0, 10);
    const klant = activeSession.klant?.klantnaam ?? 'onbekend';
    (async () => {
      const file = await exportToExcel(lines, exportConfig, `${activeSession.type}-${klant}-${ts}`, activeSession.type, klant);
      setExportedFile(file);
      setShowPostExport(true);
    })();
  };

  const downloadExportedFile = () => {
    if (!exportedFile) return;
    const url = URL.createObjectURL(exportedFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = exportedFile.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const clearSheet = async () => {
    if (!activeSession) return;
    if (!confirm('Weet je zeker dat je alle regels in deze sessie wilt verwijderen?')) return;
    await db.orderLines.where('sessionId').equals(activeSession.id).delete();
    await loadLines();
    setShowPostExport(false);
    setExportedFile(null);
  };

  const handleManualBarcode = async () => {
    if (!manualBarcode || !activeSession) return;
    if (limitReached) {
      setLastScanResult({ success: false, message: `Scanlimiet bereikt (max ${maxScans})` });
      setManualBarcode('');
      return;
    }
    const scanned = manualBarcode;
    setManualBarcode('');
    barcodeInputRef.current?.focus();

    const norm = normalizeBarcode(scanned);
    const article = await db.articles.where('barcode').equals(norm).first();
    if (!article) {
      setLastScanResult({ success: false, message: `Barcode niet gevonden: ${norm}`, barcode: norm });
      return;
    }
    const qty = parseInt(manualAantal, 10);
    const safeQty = (!isNaN(qty) && qty >= 1) ? qty : 1;
    if (typeof maxScans === 'number' && maxScans > 0 && totalItemsSoFar + safeQty > maxScans) {
      setLastScanResult({ success: false, message: `Aantal (${safeQty}) overschrijdt de scanlimiet (max ${maxScans}, nu ${totalItemsSoFar})`, barcode: norm });
      return;
    }
    const existing = await db.orderLines.where('sessionId').equals(activeSession.id).filter((l) => l.barcode === norm).first();
    if (existing?.id) {
      await db.orderLines.update(existing.id, { aantal: existing.aantal + safeQty, timestamp: Date.now() });
    } else {
      await db.orderLines.add({
        sessionId: activeSession.id,
        barcode: norm,
        artikelnummer: article.artikelnummer,
        kleurnummer: article.kleurnummer,
        maat: article.maat,
        artikel: article.artikel,
        kleur: article.kleur,
        prijs: article.prijs,
        aantal: safeQty,
        timestamp: Date.now(),
        ...(scanMode === 'grouped' ? { groupId: currentGroupId, groupLabel: currentGroupLabel } : {}),
      });
    }
    setLastScanResult({ success: true, message: `${norm} · ${article.artikelnummer} · ${article.kleurnummer} · ${article.maat}`, barcode: norm });
    setManualAantal('');
    await loadLines();
    if (scanMode === 'single') setActiveTab('review');
  };

  // Laser/keyboard-wedge scanners don't reliably send a detectable Enter keydown on
  // every device, so auto-submit once input pauses briefly instead of waiting on it.
  // The ref always points at the latest closure (latest manualAantal/scanMode/group),
  // so editing those fields inside the debounce window doesn't submit stale values.
  const handleManualBarcodeRef = useRef(handleManualBarcode);
  handleManualBarcodeRef.current = handleManualBarcode;

  useEffect(() => {
    if (!manualBarcode) return;
    const timer = setTimeout(() => { handleManualBarcodeRef.current(); }, 300);
    return () => clearTimeout(timer);
  }, [manualBarcode]);

  const handleEnd = () => { if (isActive) toggleScan(); endSession(); };

  const totalItems = lines.reduce((s, l) => s + l.aantal, 0);

  if (!activeSession) return null;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header
        title={`${isVerkoop ? 'Verkooporder' : 'Inkooporder'} · ${lines.length} gescand`}
        subtitle={activeSession.klant?.klantnaam ?? '—'}
        showBack
        onBack={handleEnd}
      />

      <div style={{ maxWidth: 680, width: '100%', margin: '0 auto', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 14 }}>
        {/* Scan / Review segmented control */}
        <div style={{ padding: '0 20px' }}>
          <SegmentedControl
            options={[
              { value: 'scan', label: 'Scan' },
              { value: 'review', label: 'Review', badge: lines.length },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as 'scan' | 'review')}
            accent={accent}
          />
        </div>

        {/* Persistent actions layer: export + session, reachable from both tabs */}
        <div style={{ padding: '0 20px', display: 'flex', gap: 10 }}>
          <button
            onClick={handleExport}
            className="btn-glass"
            style={{
              flex: 1, minHeight: 44,
              padding: '0 16px',
              background: `${accent}18`,
              border: `1px solid ${accent}35`,
              borderRadius: 12,
              color: accent,
              fontWeight: 700, fontSize: 13,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              fontFamily: 'Outfit, sans-serif',
              boxShadow: `0 0 16px ${glow}`,
            }}
          >
            <Download size={15} /> Exporteer XLSX
          </button>
          <button
            onClick={handleEnd}
            aria-label="Sessie beëindigen"
            style={{
              minHeight: 44, minWidth: 44, padding: '0 14px',
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

        {/* Post-export actions */}
        {showPostExport && exportedFile && (
          <div style={{ padding: '0 20px' }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={downloadExportedFile} className="btn-glass" style={{ flex: 1, minHeight: 44, padding: '10px 12px', borderRadius: 10, background: 'var(--accent)', color: '#000', fontWeight: 700 }}>Download bestand</button>
              <button onClick={clearSheet} style={{ minHeight: 44, padding: '10px 12px', borderRadius: 10, background: 'rgba(239,68,68,0.08)', color: '#F87171', border: '1px solid rgba(239,68,68,0.2)', fontWeight: 700 }}>Sheet leegmaken</button>
            </div>
          </div>
        )}

        {activeTab === 'scan' ? (
          <>
            {/* Scan-mode selector + limit */}
            <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                {SCAN_MODE_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    selected={scanMode === opt.value}
                    accent={accent}
                    onClick={() => setScanMode(opt.value)}
                  />
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                  <label htmlFor="max-scans" style={{ fontSize: 11, color: 'var(--text-3)' }}>Limiet</label>
                  <input
                    id="max-scans"
                    type="number"
                    min={1}
                    placeholder="geen"
                    value={maxScans ?? ''}
                    onChange={(e) => setMaxScans(e.target.value ? parseInt(e.target.value, 10) : undefined)}
                    style={{
                      width: 64, height: 36, padding: '0 8px', borderRadius: 8,
                      border: '1px solid var(--border-2)', background: 'var(--border-1)',
                      color: 'var(--text-1)', fontFamily: 'DM Mono, monospace', fontSize: 12, textAlign: 'center', outline: 'none',
                    }}
                  />
                </div>
              </div>
              {scanMode === 'grouped' && (
                <Tooltip
                  id="grouped-scan"
                  title="Grouped scan"
                  text="Scans worden verzameld in de huidige groep. Gebruik de knop rechtsonder om een nieuwe groep te starten."
                />
              )}
              {limitReached && (
                <p style={{ margin: 0, fontSize: 12, color: '#F59E0B' }}>Scanlimiet bereikt ({maxScans}) — verhoog de limiet om verder te scannen.</p>
              )}
            </div>

            {/* Scanner profile selector and symbology toggles */}
            <div style={{ padding: '0 20px', display: 'flex', gap: 12, justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ width: 260 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 600 }}>Scanner profiel</label>
                <select
                  value={scannerProfile ?? ''}
                  onChange={(e) => setScannerProfile(e.target.value || null)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--glass-bg)', color: 'var(--text-1)' }}
                >
                  <option value="">Browser camera (default)</option>
                  <option value="SE4750SR">SE4750SR — short range (LED/imager)</option>
                  <option value="SE4750MR">SE4750MR — mid range (laser/imager)</option>
                  <option value="SE4750-LED-LASER">SE4750 LED / Laser</option>
                  <option value="PRZM">Zebra PRZM imager (1D/2D)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>Symbologie</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={useEAN13} onChange={(e) => setUseEAN13(e.target.checked)} /> EAN-13
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                  <input type="checkbox" checked={useGS1} onChange={(e) => setUseGS1(e.target.checked)} /> GS1-128
                </label>
                <span title="GS1-128 is Code 128 met FNC1 and Application Identifiers (bijv. (01)GTIN). Als een GS1-code GTIN bevat, wordt deze automatisch geëxtraheerd vóór lookup." style={{ fontSize: 13, color: 'var(--text-3)', marginLeft: 6, cursor: 'help' }}>ℹ</span>
              </div>
            </div>

            <ScannerViewport
              videoRef={videoRef as React.RefObject<HTMLVideoElement>}
              isActive={isActive}
              hasPermission={hasPermission}
              cameras={cameras}
              selectedCamera={selectedCamera}
              onToggle={toggleScan}
              onSwitchCamera={switchCamera}
              orderType={activeSession.type}
              torchSupported={torchSupported}
              torchOn={torchOn}
              onToggleTorch={toggleTorch}
            />

            {/* Manual quantity */}
            <div style={{ padding: '0 20px' }}>
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

            {/* Manual barcode input */}
            <div style={{ padding: '0 20px', display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 5, fontWeight: 500 }}>Handmatige barcode</label>
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Barcode invoeren"
                  value={manualBarcode}
                  autoFocus
                  inputMode={suppressKeyboard ? 'none' : 'text'}
                  onPointerDown={() => setSuppressKeyboard(false)}
                  onBlur={() => setSuppressKeyboard(true)}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleManualBarcode();
                    }
                  }}
                  style={{ width: '100%', minHeight: 44, padding: '10px 12px', borderRadius: 10, border: '1px solid var(--border-2)', background: 'var(--glass-bg)', color: 'var(--text-1)' }}
                />
              </div>
              <div style={{ width: 120 }}>
                <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 5, fontWeight: 500 }}>&nbsp;</label>
                <button onClick={handleManualBarcode} className="btn-glass" style={{ width: '100%', minHeight: 44, borderRadius: 10, background: 'var(--accent)', color: '#000', fontWeight: 700 }}>Voer in</button>
              </div>
            </div>
          </>
        ) : (
          <>
            <KPICards
              totalLines={lines.length}
              totalItems={totalItems}
              fulfillmentRate={lines.length > 0 ? 100 : 0}
              orderType={activeSession.type}
            />

            <div style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                <ScanLine size={13} />
                {lines.length} regels · {totalItems} stuks
              </div>
              <div style={{ flex: 1, height: 1, background: 'var(--border-1)' }} />
            </div>

            <OrderTable
              lines={lines}
              orderType={activeSession.type}
              onIncrement={handleIncrement}
              onDecrement={handleDecrement}
              onChangeAantal={handleChangeAantal}
              onDelete={handleDelete}
              onUpdateLine={handleUpdateLine}
              flashId={flashId}
              onStartScanning={() => setActiveTab('scan')}
            />
          </>
        )}
      </div>

      <Toast />

      {activeTab === 'review' ? (
        <Fab icon={<Camera size={22} />} label="Terug naar scanner" onClick={() => setActiveTab('scan')} accent={accent} />
      ) : scanMode === 'grouped' ? (
        <Fab icon={<FolderPlus size={22} />} label="Nieuwe groep starten" onClick={startNewGroup} accent={accent} />
      ) : null}
    </div>
  );
}
