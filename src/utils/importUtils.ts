import * as XLSX from 'xlsx';
import type { Article, Customer } from '../db/database';

function normalizeHeader(h: unknown): string {
  return String(h ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Map raw row object to Article using flexible header matching.
 * Barcode is the primary key — rows without a barcode are skipped.
 */
export function rowToArticle(row: Record<string, unknown>): Article | null {
  const keys = Object.keys(row);

  const find = (...candidates: string[]): string => {
    for (const c of candidates) {
      const k = keys.find((k) => normalizeHeader(k) === c);
      if (k !== undefined && row[k] != null && row[k] !== '') return String(row[k]);
    }
    return '';
  };

  const barcode = find('barcode');
  if (!barcode) return null;

  const artikelnummer = find('artikelnummer');
  const kleurnummer = find('kleurnummer');
  const maat = find('maat');
  const artikel = find('artikel');
  const kleur = find('kleur');

  return {
    barcode,
    artikelnummer,
    kleurnummer,
    maat,
    artikel,
    kleur,
    // store full row for future use
    ...Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, v])
    ),
  };
}

/**
 * Map raw row to Customer using flexible header matching.
 */
export function rowToCustomer(row: Record<string, unknown>): Customer | null {
  const keys = Object.keys(row);

  const find = (...candidates: string[]): string => {
    for (const c of candidates) {
      const k = keys.find((k) => normalizeHeader(k) === c);
      if (k !== undefined && row[k] != null && row[k] !== '') return String(row[k]);
    }
    return '';
  };

  const klantnummer = find('klantnummer', 'klant nummer', 'klantnr', 'nr', 'nummer', 'id');
  const klantnaam = find('klantnaam', 'klant naam', 'naam', 'name', 'bedrijf', 'bedrijfsnaam');
  const filiaal = find('filiaal', 'branch', 'vestiging');
  const klantrelatie = find('klantrelatie', 'klant relatie', 'relatie');
  const debiteurnummer = find('debiteurnummer', 'debiteur', 'debiteur nummer', 'debiteurnummer');
  const magazijn = find('magazijn', 'warehouse');

  if (!klantnummer && !klantnaam) return null;

  return { klantnummer, klantnaam, filiaal, klantrelatie, debiteurnummer, magazijn };
}

/**
 * Parse an Excel or CSV file and return an array of row objects.
 * headerRow: 0-indexed row number used as the header (default: 0 = first row).
 */
export async function parseFile(
  file: File,
  headerRow = 0
): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
          raw: false,
          range: headerRow, // start reading from this row as header
        });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}
