import Dexie, { type Table } from 'dexie';

export interface Article {
  id?: number;
  barcode: string;
  artikelnummer: string;
  kleurnummer: string;
  maat: string;
  artikel?: string;
  kleur?: string;
  [key: string]: unknown;
}

export interface Customer {
  id?: number;
  klantnummer: string;
  klantnaam: string;
  filiaal?: string;
  klantrelatie?: string;
  debiteurnummer?: string;
  magazijn?: string;
}

export interface OrderLine {
  id?: number;
  sessionId: string;
  barcode: string;
  artikelnummer: string;
  kleurnummer: string;
  maat: string;
  artikel?: string;
  kleur?: string;
  aantal: number;
  timestamp: number;
}

export interface Session {
  id: string;
  type: 'verkoop' | 'inkoop';
  klant: Customer | null;
  status: 'active' | 'finished';
  createdAt: number;
  updatedAt: number;
}

export interface ExportColumn {
  id: string;
  sourceField: string;
  label: string;
  enabled: boolean;
}

export interface ExportConfig {
  id?: number;
  name: string;
  orderType: 'verkoop' | 'inkoop';
  columns: ExportColumn[];
  skipFirstRow: boolean;
  dataStartRow: number;
}

class ScanLabbDB extends Dexie {
  articles!: Table<Article>;
  customers!: Table<Customer>;
  orderLines!: Table<OrderLine>;
  sessions!: Table<Session>;
  exportConfigs!: Table<ExportConfig>;

  constructor() {
    super('ScanLabbDB');
    this.version(1).stores({
      articles: '++id, barcode, artikelnummer',
      customers: '++id, klantnummer, klantnaam',
      orderLines: '++id, sessionId, barcode, timestamp',
      sessions: 'id, type, status',
      exportConfigs: '++id, name, orderType',
    });
  }
}

export const db = new ScanLabbDB();
