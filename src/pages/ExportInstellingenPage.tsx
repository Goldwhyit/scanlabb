import { useState, useEffect, useCallback } from 'react';
import { ChevronUp, ChevronDown, Eye, EyeOff, Check } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import { db } from '../db/database';
import type { ExportConfig, ExportColumn } from '../db/database';
import { DEFAULT_VERKOOP_COLUMNS, DEFAULT_INKOOP_COLUMNS } from '../utils/exportUtils';
import Header from '../components/Header';

type OT = 'verkoop' | 'inkoop';

const ALL_FIELDS = [
  { field: 'ordertype', label: 'Ordertype (VO/IO)' },
  { field: 'artikelnummer', label: 'Artikelnummer' },
  { field: 'kleurnummer', label: 'Kleurnummer' },
  { field: 'maat', label: 'Maat' },
  { field: 'barcode', label: 'Barcode' },
  { field: 'aantal', label: 'Aantal' },
  { field: 'artikel', label: 'Artikel omschrijving' },
  { field: 'kleur', label: 'Kleur omschrijving' },
  { field: 'klant', label: 'Klantnaam' },
];

export default function ExportInstellingenPage() {
  const { setPage } = useAppStore();
  const [ot, setOt] = useState<OT>('verkoop');
  const [config, setConfig] = useState<ExportConfig>({ name: 'Standaard', orderType: 'verkoop', columns: DEFAULT_VERKOOP_COLUMNS, skipFirstRow: false, dataStartRow: 1 });
  const [saved, setSaved] = useState(false);

  const load = useCallback(async (type: OT) => {
    const existing = await db.exportConfigs.where('orderType').equals(type).first();
    setConfig(existing ?? { name: 'Standaard', orderType: type, columns: type === 'verkoop' ? DEFAULT_VERKOOP_COLUMNS : DEFAULT_INKOOP_COLUMNS, skipFirstRow: false, dataStartRow: 1 });
  }, []);

  useEffect(() => { load(ot); }, [ot, load]);

  const save = async () => {
    const existing = await db.exportConfigs.where('orderType').equals(ot).first();
    if (existing?.id) await db.exportConfigs.update(existing.id, { ...config, orderType: ot });
    else await db.exportConfigs.add({ ...config, orderType: ot });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggle = (id: string) => setConfig((c) => ({ ...c, columns: c.columns.map((col) => col.id === id ? { ...col, enabled: !col.enabled } : col) }));
  const rename = (id: string, label: string) => setConfig((c) => ({ ...c, columns: c.columns.map((col) => col.id === id ? { ...col, label } : col) }));
  const move = (id: string, dir: 'up' | 'down') => setConfig((c) => {
    const cols = [...c.columns];
    const idx = cols.findIndex((col) => col.id === id);
    const ni = dir === 'up' ? idx - 1 : idx + 1;
    if (ni < 0 || ni >= cols.length) return c;
    [cols[idx], cols[ni]] = [cols[ni], cols[idx]];
    return { ...c, columns: cols };
  });
  const addField = (field: string) => {
    if (config.columns.find((c) => c.sourceField === field)) return;
    const meta = ALL_FIELDS.find((f) => f.field === field);
    const newCol: ExportColumn = { id: field + '_' + Date.now(), sourceField: field, label: meta?.label ?? field, enabled: true };
    setConfig((c) => ({ ...c, columns: [...c.columns, newCol] }));
  };
  const removeCol = (id: string) => setConfig((c) => ({ ...c, columns: c.columns.filter((col) => col.id !== id) }));

  const available = ALL_FIELDS.filter((f) => !config.columns.find((c) => c.sourceField === f.field));

  const accentVerkoop = 'var(--accent)';
  const accentInkoop = 'var(--inkoop)';
  const accent = ot === 'verkoop' ? accentVerkoop : accentInkoop;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Header title="Export" subtitle="Kolommen & opmaak" showBack onBack={() => setPage('home')} />

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '20px 20px 100px' }}>
        {/* OT tabs */}
        <div style={{ display: 'flex', background: 'var(--glass-bg)', border: '1px solid var(--border-1)', borderRadius: 14, padding: 4, gap: 3, marginBottom: 20 }}>
          {(['verkoop', 'inkoop'] as OT[]).map((t) => (
            <button key={t} onClick={() => setOt(t)} style={{
              flex: 1, padding: '10px 0',
              background: ot === t ? (t === 'verkoop' ? 'rgba(0,245,212,0.15)' : 'rgba(168,85,247,0.15)') : 'transparent',
              border: ot === t ? `1px solid ${t === 'verkoop' ? 'rgba(0,245,212,0.3)' : 'rgba(168,85,247,0.3)'}` : '1px solid transparent',
              borderRadius: 10,
              color: ot === t ? (t === 'verkoop' ? 'var(--accent)' : 'var(--inkoop)') : 'var(--text-3)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
              transition: 'all 0.25s var(--ease)', textTransform: 'capitalize',
            }}>
              {t}
            </button>
          ))}
        </div>

        {/* Row settings */}
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-1)', borderRadius: 18, padding: '18px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Rijinstellingen</p>

          <label style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, cursor: 'pointer' }}>
            <div
              onClick={() => setConfig((c) => ({ ...c, skipFirstRow: !c.skipFirstRow }))}
              style={{
                width: 44, height: 24, borderRadius: 99,
                background: config.skipFirstRow ? accent : 'var(--border-2)',
                display: 'flex', alignItems: 'center', padding: '0 3px',
                cursor: 'pointer', transition: 'background 0.3s var(--ease)',
                flexShrink: 0,
              }}
            >
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: '#fff',
                boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
                transform: config.skipFirstRow ? 'translateX(20px)' : 'translateX(0)',
                transition: 'transform 0.3s var(--ease)',
              }} />
            </div>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
              {config.skipFirstRow ? 'Geen headerregel in export' : 'Headerregel opnemen in export'}
            </span>
          </label>

          <div>
            <label style={{ display: 'block', fontSize: 11, color: 'var(--text-3)', marginBottom: 6, fontWeight: 500 }}>Data begint op rij</label>
            <input
              type="number" min={1} max={10}
              value={config.dataStartRow}
              onChange={(e) => setConfig((c) => ({ ...c, dataStartRow: parseInt(e.target.value) || 1 }))}
              style={{
                width: 80, padding: '8px 12px',
                background: 'var(--border-1)', border: '1px solid var(--border-2)',
                borderRadius: 10, color: 'var(--text-1)',
                fontFamily: 'DM Mono, monospace', fontSize: 14, outline: 'none',
              }}
            />
            <p style={{ margin: '6px 0 0', fontSize: 11, color: 'var(--text-3)' }}>
              Lege regels vóór de data (voor template-headers)
            </p>
          </div>
        </div>

        {/* Columns */}
        <div style={{ background: 'var(--glass-bg)', backdropFilter: 'var(--glass-blur)', border: '1px solid var(--border-1)', borderRadius: 18, padding: '18px', marginBottom: 16 }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>Kolomvolgorde & zichtbaarheid</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {config.columns.map((col, idx) => (
              <div key={col.id} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: col.enabled ? 'var(--border-1)' : 'transparent',
                border: `1px solid ${col.enabled ? 'var(--border-2)' : 'var(--border-1)'}`,
                borderRadius: 11, padding: '9px 10px',
                opacity: col.enabled ? 1 : 0.45,
                transition: 'all 0.2s var(--ease)',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <input
                    type="text" value={col.label}
                    onChange={(e) => rename(col.id, e.target.value)}
                    style={{ background: 'transparent', border: 'none', borderBottom: '1px solid transparent', color: 'var(--text-1)', fontSize: 13, fontWeight: 500, width: '100%', outline: 'none', fontFamily: 'Outfit, sans-serif' }}
                    onFocus={(e) => e.target.style.borderBottomColor = accent}
                    onBlur={(e) => e.target.style.borderBottomColor = 'transparent'}
                  />
                  <p style={{ margin: '2px 0 0', fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>{col.sourceField}</p>
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[
                    { dir: 'up', dis: idx === 0, Icon: ChevronUp },
                    { dir: 'down', dis: idx === config.columns.length - 1, Icon: ChevronDown },
                  ].map(({ dir, dis, Icon }) => (
                    <button key={dir} onClick={() => move(col.id, dir as 'up' | 'down')} disabled={dis}
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: dis ? 'default' : 'pointer', opacity: dis ? 0.25 : 1, padding: 4, borderRadius: 6 }}>
                      <Icon size={13} />
                    </button>
                  ))}
                  <button onClick={() => toggle(col.id)} style={{ background: 'none', border: 'none', color: col.enabled ? accent : 'var(--text-3)', cursor: 'pointer', padding: 4, borderRadius: 6 }}>
                    {col.enabled ? <Eye size={13} /> : <EyeOff size={13} />}
                  </button>
                  <button onClick={() => removeCol(col.id)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px 6px', borderRadius: 6, fontSize: 15, fontWeight: 700 }}>×</button>
                </div>
              </div>
            ))}
          </div>

          {available.length > 0 && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
              <p style={{ margin: '0 0 8px', fontSize: 11, color: 'var(--text-3)' }}>Kolom toevoegen</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {available.map((f) => (
                  <button key={f.field} onClick={() => addField(f.field)} style={{
                    padding: '5px 12px', background: 'var(--border-1)', border: '1px solid var(--border-2)',
                    borderRadius: 8, color: 'var(--text-2)', fontSize: 11, cursor: 'pointer',
                    fontFamily: 'Outfit, sans-serif', fontWeight: 500,
                    transition: 'all 0.2s var(--ease)',
                  }}>
                    + {f.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save button */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, padding: '16px 20px', background: 'var(--bg-primary)', borderTop: '1px solid var(--border-1)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <button onClick={save} style={{
            width: '100%', padding: '15px 0',
            background: saved ? 'rgba(34,197,94,0.15)' : accent,
            border: saved ? '1px solid rgba(34,197,94,0.35)' : 'none',
            borderRadius: 14, color: saved ? '#4ADE80' : '#030712',
            fontWeight: 800, fontSize: 15, cursor: 'pointer',
            fontFamily: 'Outfit, sans-serif',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: saved ? 'none' : `0 0 24px var(--accent-glow)`,
            transition: 'all 0.3s var(--ease)',
          }}>
            {saved ? <><Check size={17} /> Opgeslagen</> : 'Instellingen opslaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
