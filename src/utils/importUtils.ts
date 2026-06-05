import * as XLSX from 'xlsx';
import type { Article, Customer } from '../db/database';

function norm(h: unknown): string {
  return String(h ?? '').toLowerCase().trim().replace(/\s+/g, ' ');
}

export function rowToArticle(row: Record<string, unknown>): Article | null {
  const keys = Object.keys(row);
  const find = (...c: string[]) => {
    for (const x of c) {
      const k = keys.find((k) => norm(k) === x);
      if (k && row[k] != null && row[k] !== '') return String(row[k]);
    }
    return '';
  };
  const barcode = find('barcode');
  if (!barcode) return null;
  return {
    barcode,
    artikelnummer: find('artikelnummer'),
    kleurnummer: find('kleurnummer'),
    maat: find('maat'),
    artikel: find('artikel'),
    kleur: find('kleur'),
    prijs: parseFloat(find('prijs', 'verkoopprijs', 'price')) || 0,
    ...Object.fromEntries(Object.entries(row)),
  };
}

export function rowToCustomer(row: Record<string, unknown>): Customer | null {
  const keys = Object.keys(row);
  const find = (...c: string[]) => {
    for (const x of c) {
      const k = keys.find((k) => norm(k) === x);
      if (k && row[k] != null && row[k] !== '') return String(row[k]);
    }
    return '';
  };
  const klantnummer = find('klantnummer', 'klantnr', 'nr', 'id', 'nummer');
  const klantnaam = find('klantnaam', 'naam', 'name', 'bedrijf', 'bedrijfsnaam');
  if (!klantnummer && !klantnaam) return null;
  return { klantnummer, klantnaam };
}

export async function parseFile(file: File, headerRow = 0): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'binary', cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '', raw: false, range: headerRow }));
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsBinaryString(file);
  });
}
