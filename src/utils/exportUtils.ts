import * as XLSX from 'xlsx';
import type { OrderLine, ExportConfig, ExportColumn } from '../db/database';

export const DEFAULT_VERKOOP_COLUMNS: ExportColumn[] = [
  { id: 'ordertype',    sourceField: 'ordertype',    label: 'Verkooporder', enabled: true },
  { id: 'artikelnummer',sourceField: 'artikelnummer',label: 'Artikelnummer',enabled: true },
  { id: 'kleurnummer',  sourceField: 'kleurnummer',  label: 'Kleurnummer',  enabled: true },
  { id: 'maat',         sourceField: 'maat',         label: 'Maat',         enabled: true },
  { id: 'barcode',      sourceField: 'barcode',      label: 'Barcode',      enabled: true },
  { id: 'aantal',       sourceField: 'aantal',       label: 'Aantal',       enabled: true },
  { id: 'artikel',      sourceField: 'artikel',      label: 'Artikel',      enabled: false },
];

export const DEFAULT_INKOOP_COLUMNS: ExportColumn[] = [
  { id: 'ordertype',    sourceField: 'ordertype',    label: 'Inkooporder',  enabled: true },
  { id: 'artikelnummer',sourceField: 'artikelnummer',label: 'Artikelnummer',enabled: true },
  { id: 'kleurnummer',  sourceField: 'kleurnummer',  label: 'Kleurnummer',  enabled: true },
  { id: 'maat',         sourceField: 'maat',         label: 'Maat',         enabled: true },
  { id: 'barcode',      sourceField: 'barcode',      label: 'Barcode',      enabled: true },
  { id: 'aantal',       sourceField: 'aantal',       label: 'Aantal',       enabled: true },
];

function getVal(line: OrderLine, field: string, orderType: string, klant?: string): unknown {
  switch (field) {
    case 'ordertype':     return orderType === 'verkoop' ? 'VO' : 'IO';
    case 'artikelnummer': return line.artikelnummer;
    case 'kleurnummer':   return line.kleurnummer;
    case 'maat':          return line.maat;
    case 'barcode':       return line.barcode;
    case 'aantal':        return line.aantal;
    case 'artikel':       return line.artikel ?? '';
    case 'kleur':         return line.kleur ?? '';
    case 'klant':         return klant ?? '';
    default:              return '';
  }
}

export async function exportToExcel(
  lines: OrderLine[],
  config: ExportConfig,
  filename: string,
  orderType: 'verkoop' | 'inkoop',
  klant?: string
): Promise<File> {
  const cols = config.columns.filter((c) => c.enabled);
  const rows: unknown[][] = [];
  for (let i = 1; i < config.dataStartRow; i++) rows.push(cols.map(() => ''));
  if (!config.skipFirstRow) rows.push(cols.map((c) => c.label));
  for (const line of lines) rows.push(cols.map((c) => getVal(line, c.sourceField, orderType, klant)));

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = cols.map((c) => ({ wch: Math.max(c.label.length + 2, 12) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, orderType === 'verkoop' ? 'Verkooporder' : 'Inkooporder');

  // Return file object, caller can download/share as needed
  const arrayBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const blob = new Blob([arrayBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const file = new File([blob], `${filename}.xlsx`, { type: blob.type });
  return file;
}
