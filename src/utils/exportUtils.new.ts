import * as XLSX from 'xlsx';
import type { Customer } from '../db/database';
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

export interface ExportResult {
  file: File;
  fileName: string;
  sharedOrMailed: boolean;
}

export async function exportToExcel(
  lines: OrderLine[],
  config: ExportConfig,
  filename: string,
  orderType: 'verkoop' | 'inkoop',
  klant?: Customer | null
): Promise<ExportResult> {
  const wb = buildWorkbook(lines, config, orderType, klant);
  const fileName = `${filename}.xlsx`;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const workbookArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const file = new File([workbookArray], fileName, { type: mimeType });

  const sharedOrMailed = await shareOrMailExport(file, fileName, orderType);

  return {
    file,
    fileName,
    sharedOrMailed,
  };
}

export function saveExportFile(file: File): void {
  const objectUrl = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

function buildWorkbook(
  lines: OrderLine[],
  config: ExportConfig,
  orderType: 'verkoop' | 'inkoop',
  klant?: Customer | null
) {
  const inkoopFixedFieldSet = new Set([
    'datum',
    'klant',
    'filiaal',
    'klantrelatie',
    'debiteurnummer',
    'magazijn',
  ]);

  const inkoopLineFieldSet = new Set([
    'artikelnummer',
    'kleurnummer',
    'maat',
    'barcode',
    'aantal',
  ]);

  const enabledCols = config.columns.filter(
    (column) =>
      column.enabled &&
      !(
        orderType === 'inkoop' &&
        (inkoopFixedFieldSet.has(column.sourceField) ||
          inkoopLineFieldSet.has(column.sourceField) ||
          column.sourceField === 'ordertype')
      )
  );

  const inkoopFixedCols: ExportColumn[] =
    orderType === 'inkoop'
      ? [
          { id: 'datum', sourceField: 'datum', label: 'Datum', enabled: true },
          { id: 'klant', sourceField: 'klant', label: 'Klant', enabled: true },
          { id: 'filiaal', sourceField: 'filiaal', label: 'Filiaal', enabled: true },
          { id: 'klantrelatie', sourceField: 'klantrelatie', label: 'Klantrelatie', enabled: true },
          { id: 'debiteurnummer', sourceField: 'debiteurnummer', label: 'Debiteurnummer', enabled: true },
          { id: 'magazijn', sourceField: 'magazijn', label: 'Magazijn', enabled: true },
        ]
      : [];

  const inkoopLineCols: ExportColumn[] =
    orderType === 'inkoop'
      ? [
          { id: 'artikelnummer_fixed', sourceField: 'artikelnummer', label: 'Artikelnummer', enabled: true },
          { id: 'kleurnummer_fixed', sourceField: 'kleurnummer', label: 'Kleurnummer', enabled: true },
          { id: 'maat_fixed', sourceField: 'maat', label: 'Maat', enabled: true },
          { id: 'barcode_fixed', sourceField: 'barcode', label: 'Barcode', enabled: true },
          { id: 'aantal_fixed', sourceField: 'aantal', label: 'Aantal', enabled: true },
        ]
      : [];

  const exportCols = [...inkoopFixedCols, ...inkoopLineCols, ...enabledCols];
  const rows: unknown[][] = [];

  for (let i = 1; i < config.dataStartRow; i++) {
    rows.push(exportCols.map(() => ''));
  }

  if (!config.skipFirstRow) {
    rows.push(exportCols.map((column) => column.label));
  }

  for (const line of lines) {
    const row = exportCols.map((column) => getValue(line, column.sourceField, orderType, klant));
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = exportCols.map((column) => {
    const maxLen = Math.max(
      column.label.length,
      ...lines.map((line) => String(getValue(line, column.sourceField, orderType, klant)).length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, orderType === 'verkoop' ? 'Verkooporder' : 'Inkooporder');
  return wb;
}

async function shareOrMailExport(
  file: File,
  fileName: string,
  orderType: 'verkoop' | 'inkoop'
): Promise<boolean> {
  const targetEmails = ['retail@looplabb.com', 'dwight@looplabb.com'];

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Export ${orderType}`,
          text: `Exportbestand voor ${orderType}order`,
          files: [file],
        });
        return true;
      }
    } catch {
      // gebruiker annuleert shareflow
    }
  }

  if (typeof window !== 'undefined') {
    const subject = encodeURIComponent(`Export ${orderType}order - ${fileName.replace(/\.xlsx$/, '')}`);
    const body = encodeURIComponent(
      `In de bijlage het exportbestand ${fileName}.\n\n` +
        'Gebruik daarna eventueel ook de knop Opslaan in de app om het bestand lokaal te bewaren.'
    );
    window.location.href = `mailto:${targetEmails.join(',')}?subject=${subject}&body=${body}`;
    return true;
  }

  return false;
}

function getValue(
  line: OrderLine,
  field: string,
  orderType: string,
  klant?: Customer | null
): unknown {
  switch (field) {
    case 'datum':
      return new Date().toLocaleDateString('nl-NL');
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
      return klant?.klantnaam ?? '';
    case 'filiaal':
      return klant?.filiaal ?? '';
    case 'klantrelatie':
      return klant?.klantrelatie ?? '';
    case 'debiteurnummer':
      return klant?.debiteurnummer ?? klant?.klantnummer ?? '';
    case 'magazijn':
      return klant?.magazijn || 'Magazijn Looplabb';
    default:
      return '';
  }
}
