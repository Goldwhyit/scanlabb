import { useEffect, useState, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  Pause,
  Play,
  Download,
  ScanLine,
  Camera,
  CameraOff,
  FlipHorizontal,
  X,
} from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import type { OrderLine, ExportConfig } from '../db/database';
import OrderList from '../components/OrderList';
import { useScanner } from '../utils/useScanner';
import { exportToExcel, DEFAULT_VERKOOP_COLUMNS, DEFAULT_INKOOP_COLUMNS } from '../utils/exportUtils';

export default function ScanSessiePage() {
  const { activeSession, endSession, setLastScanResult, lastScanResult } = useAppStore();
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [manualAantal, setManualAantal] = useState<string>('');
  const [exportConfig, setExportConfig] = useState<ExportConfig | null>(null);
  const manualInputRef = useRef<HTMLInputElement>(null);

  const isVerkoop = activeSession?.type === 'verkoop';
  
  const accentText = isVerkoop ? 'text-[#00e5ff]' : 'text-purple-400';
  const accentBgBtn = isVerkoop
    ? 'bg-[#00e5ff] text-black'
    : 'bg-purple-500 text-white';

  // Load existing order lines for session
  const loadLines = useCallback(async () => {
    if (!activeSession) return;
    const all = await db.orderLines
      .where('sessionId')
      .equals(activeSession.id)
      .sortBy('timestamp');
    setLines(all.reverse()); // newest first
  }, [activeSession]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  // Load export config
  useEffect(() => {
    if (!activeSession) return;
    db.exportConfigs
      .where('orderType')
      .equals(activeSession.type)
      .first()
      .then((cfg) => {
        if (cfg) {
          setExportConfig(cfg);
        } else {
          setExportConfig({
            name: 'Standaard',
            orderType: activeSession.type,
            columns: isVerkoop ? DEFAULT_VERKOOP_COLUMNS : DEFAULT_INKOOP_COLUMNS,
            skipFirstRow: false,
            dataStartRow: 1,
          });
        }
      });
  }, [activeSession, isVerkoop]);

  // Persist session to db
  useEffect(() => {
    if (activeSession) {
      db.sessions.put({ ...activeSession, updatedAt: Date.now() });
    }
  }, [activeSession]);

  const handleScan = useCallback(
    async (barcode: string) => {
      if (!activeSession) return;

      // Look up article by barcode (primary key for scan logic)
      const article = await db.articles.where('barcode').equals(barcode).first();

      if (!article) {
        setLastScanResult({
          success: false,
          message: `Barcode niet gevonden: ${barcode}`,
          barcode,
        });
        return;
      }

      const qty = manualAantal ? parseInt(manualAantal, 10) : 1;
      const safeQty = isNaN(qty) || qty < 1 ? 1 : qty;

      // Check if this barcode already exists in the session
      const existing = await db.orderLines
        .where('sessionId')
        .equals(activeSession.id)
        .filter((l) => l.barcode === barcode)
        .first();

      if (existing && existing.id) {
        await db.orderLines.update(existing.id, {
          aantal: existing.aantal + safeQty,
          timestamp: Date.now(),
        });
      } else {
        await db.orderLines.add({
          sessionId: activeSession.id,
          barcode,
          artikelnummer: article.artikelnummer,
          kleurnummer: article.kleurnummer,
          maat: article.maat,
          artikel: article.artikel,
          kleur: article.kleur,
          aantal: safeQty,
          timestamp: Date.now(),
        });
      }

      setLastScanResult({
        success: true,
        message: `${article.artikelnummer} · ${article.kleurnummer} · ${article.maat}`,
        barcode,
      });

      // Reset manual antal after scan
      setManualAantal('');

      await loadLines();
    },
    [activeSession, manualAantal, setLastScanResult, loadLines]
  );

  const { videoRef, isActive, hasPermission, cameras, selectedCamera, toggleScan, switchCamera } =
    useScanner({
      onScan: handleScan,
      onError: (err) => setLastScanResult({ success: false, message: err }),
    });

  const handleIncrement = async (id: number) => {
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    await db.orderLines.update(id, { aantal: line.aantal + 1 });
    await loadLines();
  };

  const handleDecrement = async (id: number) => {
    const line = lines.find((l) => l.id === id);
    if (!line) return;
    if (line.aantal <= 1) return;
    await db.orderLines.update(id, { aantal: line.aantal - 1 });
    await loadLines();
  };

  const handleChangeAantal = async (id: number, val: number) => {
    await db.orderLines.update(id, { aantal: val });
    await loadLines();
  };

  const handleDelete = async (id: number) => {
    await db.orderLines.delete(id);
    await loadLines();
  };

  const handleExport = () => {
    if (!exportConfig || !activeSession) return;
    const ts = new Date().toISOString().slice(0, 10);
    const klantNaam = activeSession.klant?.klantnaam ?? 'onbekend';
    const filename = `${activeSession.type}-${klantNaam}-${ts}`;
    exportToExcel(lines, exportConfig, filename, activeSession.type, klantNaam);
  };

  const handleEndSession = () => {
    if (isActive) toggleScan();
    endSession();
  };

  const totalItems = lines.reduce((s, l) => s + l.aantal, 0);
  const totalLines = lines.length;

  if (!activeSession) return null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f1a] text-white">
      {/* Top bar */}
      <div className={`${isVerkoop ? 'bg-[#00e5ff]/10 border-b border-[#00e5ff]/20' : 'bg-purple-500/10 border-b border-purple-500/20'} px-4 py-3`}>
        <div className="flex items-center justify-between">
          <button
            onClick={handleEndSession}
            className="p-2 rounded-xl bg-white/5 active:bg-white/10"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center">
            <p className={`text-xs font-bold uppercase tracking-wide ${accentText}`}>
              {isVerkoop ? 'Verkooporder' : 'Inkooporder'}
            </p>
            <p className="text-sm font-bold text-white truncate max-w-[160px]">
              {activeSession.klant?.klantnaam ?? '—'}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">{totalLines} regels</p>
            <p className={`text-sm font-bold ${accentText}`}>{totalItems} stuks</p>
          </div>
        </div>
      </div>

      {/* Camera section */}
      <div className="relative bg-black">
        <video
          ref={videoRef}
          className="w-full h-56 object-cover"
          style={{ display: isActive ? 'block' : 'none' }}
          playsInline
          muted
        />

        {!isActive && (
          <div className="w-full h-56 flex flex-col items-center justify-center gap-3 bg-[#0a0a14]">
            {hasPermission === false ? (
              <>
                <CameraOff size={40} className="text-gray-600" />
                <p className="text-gray-500 text-sm text-center px-8">
                  Camera toegang geweigerd. Controleer uw browser-instellingen.
                </p>
              </>
            ) : (
              <>
                <Camera size={40} className="text-gray-600" />
                <p className="text-gray-500 text-sm">Camera staat uit</p>
              </>
            )}
          </div>
        )}

        {/* Scan overlay when active */}
        {isActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-56 h-28 border-2 ${isVerkoop ? 'border-[#00e5ff]' : 'border-purple-400'} rounded-lg opacity-80`}>
              <div className={`absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 ${isVerkoop ? 'border-[#00e5ff]' : 'border-purple-400'} rounded-tl`} />
              <div className={`absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 ${isVerkoop ? 'border-[#00e5ff]' : 'border-purple-400'} rounded-tr`} />
              <div className={`absolute bottom-0 left-0 w-5 h-5 border-b-2 border-l-2 ${isVerkoop ? 'border-[#00e5ff]' : 'border-purple-400'} rounded-bl`} />
              <div className={`absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 ${isVerkoop ? 'border-[#00e5ff]' : 'border-purple-400'} rounded-br`} />
            </div>
          </div>
        )}

        {/* Camera controls overlay */}
        <div className="absolute bottom-2 inset-x-2 flex items-center justify-between gap-2">
          <button
            onClick={toggleScan}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm ${accentBgBtn} active:scale-95 transition-transform`}
          >
            {isActive ? (
              <><Pause size={16} /> Pauzeer</>
            ) : (
              <><Play size={16} /> Start scan</>
            )}
          </button>

          {cameras.length > 1 && (
            <button
              onClick={() => {
                const other = cameras.find((c) => c.deviceId !== selectedCamera);
                if (other) switchCamera(other.deviceId);
              }}
              className="bg-white/10 text-white p-2.5 rounded-xl active:bg-white/20"
            >
              <FlipHorizontal size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Scan feedback */}
      {lastScanResult && (
        <div
          className={`mx-4 mt-3 px-4 py-3 rounded-xl flex items-center gap-3 ${
            lastScanResult.success
              ? 'bg-green-500/15 border border-green-500/30'
              : 'bg-red-500/15 border border-red-500/30'
          }`}
        >
          <ScanLine
            size={18}
            className={lastScanResult.success ? 'text-green-400 shrink-0' : 'text-red-400 shrink-0'}
          />
          <p
            className={`text-sm font-medium flex-1 ${
              lastScanResult.success ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {lastScanResult.message}
          </p>
          <button
            onClick={() => setLastScanResult(null)}
            className="text-gray-500 active:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Manual quantity input */}
      <div className="mx-4 mt-3 flex items-center gap-3">
        <div className="flex-1 relative">
          <label className="text-xs text-gray-400 mb-1 block">Aantal (optioneel)</label>
          <input
            ref={manualInputRef}
            type="number"
            min={1}
            placeholder="1"
            value={manualAantal}
            onChange={(e) => setManualAantal(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold text-center focus:outline-none focus:border-white/30"
          />
        </div>
        <div className="shrink-0">
          <label className="text-xs text-gray-400 mb-1 block">&nbsp;</label>
          <button
            onClick={handleExport}
            className={`${accentBgBtn} flex items-center gap-2 px-4 py-3 rounded-xl font-bold text-sm active:scale-95 transition-transform`}
          >
            <Download size={16} />
            Export
          </button>
        </div>
      </div>

      {/* Order lines */}
      <div className="flex-1 px-4 pt-4 pb-8 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
            Orderregels
          </p>
          <span className={`text-xs font-bold ${accentText}`}>
            {totalLines} × · {totalItems} stuks
          </span>
        </div>
        <OrderList
          lines={lines}
          onIncrement={handleIncrement}
          onDecrement={handleDecrement}
          onChangeAantal={handleChangeAantal}
          onDelete={handleDelete}
          accentColor={accentBgBtn}
        />
      </div>
    </div>
  );
}
