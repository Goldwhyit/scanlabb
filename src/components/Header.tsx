import { Sun, Moon, Database, Settings, ArrowLeft } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAppStore } from '../stores/appStore';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
}

export default function Header({ title, subtitle, showBack, onBack }: HeaderProps) {
  const { theme, toggle } = useTheme();
  const { setPage } = useAppStore();

  return (
    <header
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        borderBottom: '1px solid var(--border-1)',
        boxShadow: '0 1px 0 var(--border-2)',
        transition: 'background 0.4s cubic-bezier(0.4,0,0.2,1)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 60, gap: 12 }}>
          {showBack ? (
            <button
              onClick={onBack}
              style={{
                background: 'var(--border-1)',
                border: '1px solid var(--border-2)',
                borderRadius: 10,
                padding: '7px 10px',
                color: 'var(--text-2)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                transition: 'all 0.2s var(--ease)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--accent)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-accent)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-2)';
                (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border-2)';
              }}
            >
              <ArrowLeft size={17} />
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32,
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-alt) 100%)',
                borderRadius: 9,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px var(--accent-glow)',
                fontSize: 14, fontWeight: 800, color: '#0F172A',
                fontFamily: 'Outfit, sans-serif',
              }}>
                SL
              </div>
            </div>
          )}

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{
              margin: 0,
              fontWeight: title ? 700 : 800,
              fontSize: title ? 15 : 17,
              color: 'var(--text-1)',
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}>
              {title ?? 'ScanLabb'}
              {!title && (
                <span style={{ color: 'var(--accent)', fontWeight: 900 }}>.</span>
              )}
            </p>
            {subtitle && (
              <p style={{ margin: 0, fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>
                {subtitle}
              </p>
            )}
          </div>

          {/* Right controls */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <NavBtn icon={<Database size={16} />} label="DB" onClick={() => setPage('database-beheer')} />
            <NavBtn icon={<Settings size={16} />} label="Export" onClick={() => setPage('export-instellingen')} />
            <ThemeToggle theme={theme} toggle={toggle} />
          </div>
        </div>
      </div>
    </header>
  );
}

function NavBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        background: 'var(--border-1)',
        border: '1px solid var(--border-2)',
        borderRadius: 10,
        padding: '7px 10px',
        color: 'var(--text-2)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.2s var(--ease)',
      }}
      onMouseEnter={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color = 'var(--accent)';
        b.style.borderColor = 'var(--border-accent)';
        b.style.background = 'var(--accent-glow)';
      }}
      onMouseLeave={(e) => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.color = 'var(--text-2)';
        b.style.borderColor = 'var(--border-2)';
        b.style.background = 'var(--border-1)';
      }}
    >
      {icon}
    </button>
  );
}

function ThemeToggle({ theme, toggle }: { theme: string; toggle: () => void }) {
  return (
    <button
      onClick={toggle}
      style={{
        background: theme === 'dark' ? 'rgba(0,245,212,0.1)' : 'rgba(0,163,196,0.1)',
        border: '1px solid var(--border-accent)',
        borderRadius: 10,
        padding: '7px 10px',
        color: 'var(--accent)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        transition: 'all 0.3s var(--ease)',
        boxShadow: '0 0 12px var(--accent-glow)',
      }}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}
