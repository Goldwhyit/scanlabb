import { CheckCircle2, AlertCircle, X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export default function Toast() {
  const { lastScanResult, setLastScanResult } = useAppStore();
  if (!lastScanResult) return null;

  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        left: 20, right: 20, bottom: 84,
        maxWidth: 640, margin: '0 auto',
        zIndex: 70,
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '12px 14px',
        background: 'var(--glass-bg)',
        backdropFilter: 'var(--glass-blur)',
        WebkitBackdropFilter: 'var(--glass-blur)',
        border: `1px solid ${lastScanResult.success ? 'rgba(0,245,212,0.3)' : 'rgba(239,68,68,0.3)'}`,
        borderRadius: 14,
        boxShadow: 'var(--glass-shadow)',
        animation: 'fadeUp 0.3s var(--ease-spring)',
      }}
    >
      {lastScanResult.success
        ? <CheckCircle2 size={16} color="var(--accent)" style={{ flexShrink: 0 }} aria-hidden="true" />
        : <AlertCircle size={16} color="#F87171" style={{ flexShrink: 0 }} aria-hidden="true" />
      }
      <p style={{
        margin: 0, flex: 1, fontSize: 13, fontWeight: 500,
        color: lastScanResult.success ? 'var(--accent)' : '#F87171',
        fontFamily: lastScanResult.success ? 'DM Mono, monospace' : 'Outfit, sans-serif',
      }}>
        {lastScanResult.message}
      </p>
      <button
        onClick={() => setLastScanResult(null)}
        aria-label="Melding sluiten"
        style={{
          width: 28, height: 28, flexShrink: 0,
          background: 'none', border: 'none',
          color: 'var(--text-3)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
}
