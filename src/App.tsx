import { useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useAppStore } from './stores/appStore';
import { db } from './db/database';
import HomePage from './pages/HomePage';
import KlantKiezenPage from './pages/KlantKiezenPage';
import ScanSessiePage from './pages/ScanSessiePage';
import DatabaseBeheerPage from './pages/DatabaseBeheerPage';
import ExportInstellingenPage from './pages/ExportInstellingenPage';

export default function App() {
  const { currentPage, activeSession, setPage, theme, setTheme } = useAppStore();

  useEffect(() => {
    if (activeSession) {
      db.sessions.put({ ...activeSession }).catch(console.warn);
    }
  }, [activeSession]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(console.warn);
    }
  }, []);

  useEffect(() => {
    if (currentPage === 'scan-sessie' && !activeSession) {
      setPage('home');
    }
  }, [currentPage, activeSession, setPage]);

  useEffect(() => {
    document.documentElement.classList.toggle('theme-light', theme === 'light');
  }, [theme]);

  const pageComponent = (() => {
    switch (currentPage) {
      case 'home': return <HomePage />;
      case 'klant-kiezen': return <KlantKiezenPage />;
      case 'scan-sessie': return <ScanSessiePage />;
      case 'database-beheer': return <DatabaseBeheerPage />;
      case 'export-instellingen': return <ExportInstellingenPage />;
      default: return <HomePage />;
    }
  })();

  return (
    <>
      {pageComponent}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="fixed top-3 right-3 z-[60] bg-white/10 border border-white/20 text-white rounded-full p-2.5 backdrop-blur active:scale-95"
        aria-label={theme === 'dark' ? 'Zet light mode aan' : 'Zet dark mode aan'}
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
      >
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </button>
    </>
  );
}
