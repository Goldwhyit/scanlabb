import { useEffect } from 'react';
import { useAppStore } from './stores/appStore';
import { db } from './db/database';
import { ThemeProvider } from './context/ThemeContext';
import HomePage from './pages/HomePage';
import KlantKiezenPage from './pages/KlantKiezenPage';
import ScanSessiePage from './pages/ScanSessiePage';
import DatabaseBeheerPage from './pages/DatabaseBeheerPage';
import ExportInstellingenPage from './pages/ExportInstellingenPage';

function Router() {
  const { currentPage, activeSession, setPage } = useAppStore();

  useEffect(() => {
    if (activeSession) db.sessions.put({ ...activeSession }).catch(console.warn);
  }, [activeSession]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(console.warn);
    }
  }, []);

  useEffect(() => {
    if (currentPage === 'scan-sessie' && !activeSession) setPage('home');
  }, [currentPage, activeSession, setPage]);

  switch (currentPage) {
    case 'home':               return <HomePage />;
    case 'klant-kiezen':       return <KlantKiezenPage />;
    case 'scan-sessie':        return <ScanSessiePage />;
    case 'database-beheer':    return <DatabaseBeheerPage />;
    case 'export-instellingen':return <ExportInstellingenPage />;
    default:                   return <HomePage />;
  }
}

export default function App() {
  return (
    <ThemeProvider>
      <Router />
    </ThemeProvider>
  );
}
