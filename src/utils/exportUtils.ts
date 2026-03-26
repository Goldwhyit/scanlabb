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

export async function exportToExcel(
  lines: OrderLine[],
  config: ExportConfig,
  filename: string,
  orderType: 'verkoop' | 'inkoop',
  klant?: Customer | null
): Promise<void> {
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
    (c) =>
      c.enabled &&
      !(
        orderType === 'inkoop' &&
        (inkoopFixedFieldSet.has(c.sourceField) || inkoopLineFieldSet.has(c.sourceField) || c.sourceField === 'ordertype')
      )
  );
  const klantnaam = klant?.klantnaam ?? '';

  const inkoopFixedCols: ExportColumn[] = orderType === 'inkoop'
    ? [
        { id: 'datum', sourceField: 'datum', label: 'Datum', enabled: true },
        { id: 'klant', sourceField: 'klant', label: 'Klant', enabled: true },
        { id: 'filiaal', sourceField: 'filiaal', label: 'Filiaal', enabled: true },
        { id: 'klantrelatie', sourceField: 'klantrelatie', label: 'Klantrelatie', enabled: true },
        { id: 'debiteurnummer', sourceField: 'debiteurnummer', label: 'Debiteurnummer', enabled: true },
        { id: 'magazijn', sourceField: 'magazijn', label: 'Magazijn', enabled: true },
      ]
    : [];

  const inkoopLineCols: ExportColumn[] = orderType === 'inkoop'
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

  // Optional empty first rows if user configured dataStartRow > 1
  for (let i = 1; i < config.dataStartRow; i++) {
    rows.push(exportCols.map(() => ''));
  }

  // Header row (unless skipFirstRow)
  if (!config.skipFirstRow) {
    rows.push(exportCols.map((c) => c.label));
  }

  // Data rows
  for (const line of lines) {
    const row: unknown[] = exportCols.map((col) => {
      switch (col.sourceField) {
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
          return klantnaam ?? '';
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
    });
    rows.push(row);
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Auto column widths
  const colWidths = exportCols.map((col) => {
    const maxLen = Math.max(
      col.label.length,
      ...lines.map((l) => String(getValue(l, col.sourceField, orderType, klant)).length)
    );
    return { wch: Math.min(maxLen + 2, 40) };
  });
  ws['!cols'] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, orderType === 'verkoop' ? 'Verkooporder' : 'Inkooporder');

  const fileNameWithExt = `${filename}.xlsx`;
  const targetEmails = ['retail@looplabb.com', 'dwight@looplabb.com'];

  const workbookArray = XLSX.write(wb, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
  const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  const exportFile = new File([workbookArray], fileNameWithExt, { type: mimeType });

  let shareOpened = false;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [exportFile] })) {
        await navigator.share({
          title: `Export ${orderType}`,
          text: `Exportbestand voor ${orderType}order`,
          files: [exportFile],
        });
        shareOpened = true;
      }
    } catch {
      // gebruiker annuleert of platform ondersteunt niet volledig
    }
  }

  if (!shareOpened) {
    XLSX.writeFile(wb, fileNameWithExt);

    if (typeof window !== 'undefined') {
      const subject = encodeURIComponent(`Export ${orderType}order - ${filename}`);
      const body = encodeURIComponent(
        `In de bijlage het exportbestand ${fileNameWithExt}.\n\n` +
        'Als bijlage niet automatisch meegaat, voeg het zojuist gedownloade bestand toe.'
      );
      window.location.href = `mailto:${targetEmails.join(',')}?subject=${subject}&body=${body}`;
    }
  }
}

function getValue(
  line: OrderLine,
  field: string,
  orderType: string,
  klant?: Customer | null
): unknown {
  switch (field) {
    case 'datum': return new Date().toLocaleDateString('nl-NL');
    case 'ordertype': return orderType === 'verkoop' ? 'VO' : 'IO';
    case 'artikelnummer': return line.artikelnummer;
    case 'kleurnummer': return line.kleurnummer;
    case 'maat': return line.maat;
    case 'barcode': return line.barcode;
    case 'aantal': return line.aantal;
    case 'artikel': return line.artikel ?? '';
    case 'kleur': return line.kleur ?? '';
    case 'klant': return klant?.klantnaam ?? '';
    case 'filiaal': return klant?.filiaal ?? '';
    case 'klantrelatie': return klant?.klantrelatie ?? '';
    case 'debiteurnummer': return klant?.debiteurnummer ?? klant?.klantnummer ?? '';
    case 'magazijn': return klant?.magazijn || 'Magazijn Looplabb';
    default: return '';
  }
}
