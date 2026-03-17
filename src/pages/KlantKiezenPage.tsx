import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Search, UserCheck, User } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import type { Customer } from '../db/database';

export default function KlantKiezenPage() {
  const { setPage, pendingOrderType, startSession } = useAppStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [all, setAll] = useState<Customer[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    db.customers.toArray().then(setAll);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setResults(all.slice(0, 30));
      return;
    }
    const q = query.toLowerCase();
    setResults(
      all
        .filter(
          (c) =>
            c.klantnaam.toLowerCase().includes(q) ||
            c.klantnummer.toLowerCase().includes(q)
        )
        .slice(0, 30)
    );
  }, [query, all]);

  const selectKlant = (klant: Customer) => {
    if (!pendingOrderType) return;
    startSession(pendingOrderType, klant);
  };

  const orderLabel = pendingOrderType === 'verkoop' ? 'Verkooporder' : 'Inkooporder';
  const accentColor = pendingOrderType === 'verkoop' ? 'text-[#00e5ff]' : 'text-purple-400';
  const btnColor =
    pendingOrderType === 'verkoop'
      ? 'bg-[#00e5ff] text-black'
      : 'bg-purple-500 text-white';

  return (
    <div className="flex flex-col min-h-screen bg-[#0f0f1a] text-white">
      <header className="px-4 pt-8 pb-4 flex items-center gap-3">
        <button
          onClick={() => setPage('home')}
          className="p-2 rounded-xl bg-white/5 active:bg-white/10"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-black">Klant kiezen</h2>
          <p className={`text-sm ${accentColor} font-semibold`}>{orderLabel}</p>
        </div>
      </header>

      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Zoek op naam of nummer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white/10 border border-white/10 rounded-xl pl-11 pr-4 py-3.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#00e5ff]/50 text-base"
          />
        </div>
      </div>

      {all.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-8 text-center">
          <User size={48} className="text-gray-600" />
          <p className="text-gray-400 text-sm">
            Geen klantenbestand geladen.{' '}
            <button
              onClick={() => setPage('database-beheer')}
              className="text-[#00e5ff] underline"
            >
              Upload een klantenbestand
            </button>
          </p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-6">
        {results.map((klant) => (
          <button
            key={klant.id}
            onClick={() => selectKlant(klant)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 active:bg-white/10 transition-colors text-left"
          >
            <div className="bg-white/10 rounded-full p-2.5 shrink-0">
              <UserCheck size={20} className="text-gray-300" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white truncate">{klant.klantnaam || '—'}</p>
              <p className="text-sm text-gray-400">{klant.klantnummer || 'Geen nummer'}</p>
            </div>
            <div className={`ml-auto shrink-0 ${btnColor} rounded-xl px-3 py-1.5 text-xs font-bold`}>
              Kies
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
