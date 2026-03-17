import * as XLSX from 'xlsx';
import type { OrderLine, ExportConfig, ExportColumn } from '../db/database';

export const DEFAULT_VERKOOP_COLUMNS: ExportColumn[] = [
  { id: 'ordertype', sourceField: 'ordertype', label: 'Verkooporder', enabled: true },
  { id: 'artikelnummer', sourceField: 'artikelnummer', label: 'Artikelnummer', enabled: true },
  { id: 'kleurnummer', sourceField: 'kleurnummer', label: 'Kleurnummer', enabled: true },
  { id: 'maat', sourceField: 'maat', label: 'Maat', enabled: true },
  { id: 'barcode', sourceField: 'barcode', label: 'Barcode', enabled: true },
  { id: 'aantal', sourceField: 'aantal', label: 'Aantal', enabled: true },
  { id: 'artikel', sourceField: 'artikel', label: 'Artikel', enabled: false },
  { id: 'kleur', sourceField: 'kleur', label: 'Kleur', enabled: false },
];

export const DEFAULT_INKOOP_COLUMNS: ExportColumn[] = [
  { id: 'ordertype', sourceField: 'ordertype', label: 'Inkooporder', enabled: true },
  { id: 'artikelnummer', sourceField: 'artikelnummer', label: 'Artikelnummer', enabled: true },
  { id: 'kleurnummer', sourceField: 'kleurnummer', label: 'Kleurnummer', enabled: true },
  { id: 'maat', sourceField: 'maat', label: 'Maat', enabled: true },
  { id: 'barcode', sourceField: 'barcode', label: 'Barcode', enabled: true },
  { id: 'aantal', sourceField: 'aantal', label: 'Aantal', enabled: true },
  { id: 'artikel', sourceField: 'artikel', label: 'Artikel', enabled: false },
  { id: 'kleur', sourceField: 'kleur', label: 'Kleur', enabled: false },
];

export function exportToExcel(
  lines: OrderLine[],
  config: ExportConfig,
  filename: string,
  orderType: 'verkoop' | 'inkoop',
  klantnaam?: string
): void {
  const enabledCols = config.columns.filter((c) => c.enabled);

  const rows: unknown[][] = [];

  // Optional empty first rows if user configured dataStartRow > 1
  for (let i = 1; i < config.dataStartRow; i++) {
    rows.push(enabledCols.map(() => ''));
  }

  // Header row (unless skipFirstRow)
  if (!config.skipFirstRow) {
    rows.push(enabledCols.map((c) => c.label));
  }

  // Data rows
  for (const line of lines) {
    const row: unknown[] = enabledCols.map((col) => {
      switch (col.sourceField) {
        case 'ordertype':
          return orderType === 'verkoop' ? 'VO' : 'IO';
        case 'artikelnummer':
          return line.artikelnummer;
        case 'kleurnummer':
          return line.kleurnummer;
        case 'maat':
          return line.maat;
        case 'barcode':
          return line.barcode;
        case 'aantal':
          return line.aantal;
        case 'artikel':
          return line.artikel ?? '';
        case 'kleur':
          return line.kleur ?? '';
        case 'klant':
          return klantnaam ?? '';
        default:
          return '';
      }
    });
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto column widths
  const colWidths = enabledCols.map((col) => {
    const maxLen = Math.max(
      col.label.length,
      ...lines.map((l) => String(getValue(l, col.sourceField, orderType, klantnaam)).length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, orderType === 'verkoop' ? 'Verkooporder' : 'Inkooporder');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

function getValue(
  line: OrderLine,
  field: string,
  orderType: string,
  klantnaam?: string
): unknown {
  switch (field) {
    case 'ordertype': return orderType === 'verkoop' ? 'VO' : 'IO';
    case 'artikelnummer': return line.artikelnummer;
    case 'kleurnummer': return line.kleurnummer;
    case 'maat': return line.maat;
    case 'barcode': return line.barcode;
    case 'aantal': return line.aantal;
    case 'artikel': return line.artikel ?? '';
    case 'kleur': return line.kleur ?? '';
    case 'klant': return klantnaam ?? '';
    default: return '';
  }
}
