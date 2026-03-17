import { ShoppingCart, PackageSearch, Database, Settings, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { useEffect, useState } from 'react';
import { db } from '../db/database';

export default function HomePage() {
  const { setPage, setPendingOrderType, activeSession } = useAppStore();
  const [articleCount, setArticleCount] = useState(0);
  const [customerCount, setCustomerCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    db.articles.count().then(setArticleCount);
    db.customers.count().then(setCustomerCount);
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  const startOrder = (type: 'verkoop' | 'inkoop') => {
    setPendingOrderType(type);
    setPage('klant-kiezen');
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f1a] text-white">
      {/* Header */}
      <header className="px-6 pt-10 pb-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-white">
              Scan<span className="text-[#00e5ff]">Labb</span>
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Barcode scan systeem</p>
          </div>
          <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
            {isOnline
              ? <><Wifi size={14} className="text-green-400" /><span className="text-green-400">Online</span></>
              : <><WifiOff size={14} className="text-yellow-400" /><span className="text-yellow-400">Offline</span></>
            }
          </div>
        </div>

        {/* Stats bar */}
        <div className="flex gap-3 mt-5">
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#00e5ff]">{articleCount.toLocaleString('nl')}</p>
            <p className="text-xs text-gray-400 mt-0.5">Artikelen</p>
          </div>
          <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-[#00e5ff]">{customerCount.toLocaleString('nl')}</p>
            <p className="text-xs text-gray-400 mt-0.5">Klanten</p>
          </div>
        </div>
      </header>

      {/* Resume session banner */}
      {activeSession && (
        <div className="mx-6 mb-4 bg-[#00e5ff]/10 border border-[#00e5ff]/30 rounded-2xl p-4">
          <p className="text-xs text-[#00e5ff] font-semibold uppercase tracking-wide mb-1">Sessie actief</p>
          <p className="text-white font-bold">
            {activeSession.type === 'verkoop' ? 'Verkooporder' : 'Inkooporder'} — {activeSession.klant?.klantnaam ?? 'Onbekend'}
          </p>
          <button
            onClick={() => setPage('scan-sessie')}
            className="mt-3 w-full bg-[#00e5ff] text-black font-bold py-3 rounded-xl text-sm active:scale-95 transition-transform"
          >
            Hervat sessie →
          </button>
        </div>
      )}

      {/* Main actions */}
      <main className="flex-1 px-6 space-y-4">
        <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold">Nieuwe sessie</p>

        <button
          onClick={() => startOrder('verkoop')}
          className="w-full bg-gradient-to-r from-[#00e5ff] to-[#0096ff] text-black font-black py-5 rounded-2xl flex items-center gap-4 px-6 active:scale-95 transition-transform shadow-lg shadow-[#00e5ff]/20"
        >
          <div className="bg-black/20 rounded-xl p-2.5">
            <ShoppingCart size={24} />
          </div>
          <div className="text-left">
            <p className="text-lg leading-tight">Verkooporder</p>
            <p className="text-xs font-normal opacity-70">Artikelen inscannen voor verkoop</p>
          </div>
        </button>

        <button
          onClick={() => startOrder('inkoop')}
          className="w-full bg-gradient-to-r from-[#7c3aed] to-[#a855f7] text-white font-black py-5 rounded-2xl flex items-center gap-4 px-6 active:scale-95 transition-transform shadow-lg shadow-purple-500/20"
        >
          <div className="bg-black/20 rounded-xl p-2.5">
            <PackageSearch size={24} />
          </div>
          <div className="text-left">
            <p className="text-lg leading-tight">Inkooporder</p>
            <p className="text-xs font-normal opacity-70">Artikelen inscannen voor inkoop</p>
          </div>
        </button>

        <div className="pt-2">
          <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold mb-3">Beheer</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setPage('database-beheer')}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-start gap-3 active:bg-white/10 transition-colors"
            >
              <Database size={22} className="text-gray-300" />
              <div>
                <p className="font-bold text-sm text-white">Database</p>
                <p className="text-xs text-gray-400">Artikelen & klanten</p>
              </div>
            </button>
            <button
              onClick={() => setPage('export-instellingen')}
              className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-start gap-3 active:bg-white/10 transition-colors"
            >
              <Settings size={22} className="text-gray-300" />
              <div>
                <p className="font-bold text-sm text-white">Export</p>
                <p className="text-xs text-gray-400">Opmaak & kolommen</p>
              </div>
            </button>
          </div>
        </div>
      </main>

      <footer className="px-6 py-6 text-center text-xs text-gray-600">
        ScanLabb v1.0 — LoopLabb B.V.
      </footer>
    </div>
  );
}
