# ScanLabb — Barcode Scan Applicatie

PWA barcode scan applicatie voor verkoop- en inkooporders.
Gebouwd voor N672 Android 10 MioWork, iOS Safari, Android Chrome en desktop.

## Snel starten

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in de browser.

## Productiebuild

```bash
npm run build
# Serveer de dist/ map via een statische webserver of CDN
```

## Features

- **Barcode is leidend** — scan zoekt altijd primair op barcode
- Continue scanmodus, debounce bescherming, haptische feedback
- Verkooporder & Inkooporder modules (aparte accentkleuren)
- Klant kiezen vóór start (zoeken op naam of nummer)
- Persistente sessies in IndexedDB — herstart-proof
- Upload artikeldatabase (xlsx/csv) — auto kolom-detectie
- Upload klantenbestand (xlsx/csv)
- Configureerbare XLSX export: kolommen, volgorde, headers, start-rij
- PWA: installeerbaar, offline bruikbaar na eerste load

## Technische stack

| | |
|---|---|
| React 19 + TypeScript | Frontend |
| Vite 8 | Build tool |
| Tailwind CSS 4 | Styling (mobile-first) |
| Zustand | State management |
| Dexie.js (IndexedDB) | Lokale opslag |
| @zxing/library | Barcode scanner via camera |
| SheetJS (xlsx) | Excel import & export |

## Bestandsstructuur

```
src/
├── db/database.ts                    # Dexie schema
├── stores/appStore.ts                # Zustand navigatie + sessie store
├── pages/
│   ├── HomePage.tsx                  # Startscherm
│   ├── KlantKiezenPage.tsx           # Klant selectie
│   ├── ScanSessiePage.tsx            # Scan scherm + orderlijst
│   ├── DatabaseBeheerPage.tsx        # Import artikelen & klanten
│   └── ExportInstellingenPage.tsx    # Kolom mapping & export opmaak
├── components/OrderList.tsx          # Orderregel lijst
└── utils/
    ├── useScanner.ts                 # ZXing barcode scanner hook
    ├── importUtils.ts                # Excel/CSV parse
    └── exportUtils.ts                # XLSX export
```

## Import artikelen — vereiste kolommen

| Kolomnaam | Beschrijving |
|---|---|
| Artikelnummer | Bijv. AC02 |
| Kleurnummer | Bijv. AC02BL |
| Maat | Bijv. OS, S, M, L |
| Barcode | EAN-13, bijv. 8719558690602 |

Kolom-detectie is case-insensitief. Extra kolommen worden bewaard.

## Import klanten — vereiste kolommen

| Kolomnaam | Beschrijving |
|---|---|
| Klantnummer | Uniek klantnummer |
| Klantnaam | Naam van de klant / het bedrijf |

## Export template-instelling

Via **Export instellingen** kunt u per ordertype instellen:
- Welke kolommen worden geëxporteerd
- De volgorde van kolommen
- Kolomnamen hernoemen
- Headerregel in/uitschakelen
- **"Data begint op rij"** — voeg lege regels toe vóór de data (voor Artikel_importeren.xlsx compatibiliteit)
