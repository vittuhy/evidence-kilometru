# Evidence Kilometrů

Aplikace pro sledování kilometrů u operativního leasingu.

## Funkce

- 📊 Sledování aktuálních kilometrů
- 📈 Výpočet statistik a trendů
- 📅 Přidávání a editace záznamů
- 💾 Ukládání dat na server
- 📱 Responzivní design

## Instalace a spuštění

### 1. Instalace závislostí

```bash
# Frontend závislosti
npm install

# Backend závislosti
cd server
npm install
```

### 2. Spuštění backend serveru

```bash
cd server
npm start
```

Server poběží na `http://localhost:3001`

### 3. Spuštění frontendu

```bash
npm start
```

Aplikace poběží na `http://localhost:3000`

## Konfigurace

### API URL

Pro produkci nastavte environment variable:

```bash
REACT_APP_API_URL=https://your-api-domain.com/api
```

### Leasing konstanty

Upravte konstanty v `src/App.tsx`:

```typescript
const LEASE_START = '2025-07-08';
const TOTAL_ALLOWED_KM = 40000; // 20,000 km/rok * 2 roky
const TOLERANCE_KM = 3000; // Tolerovaný nadlimit
```

## API Endpoints

- `GET /api/records` - Získat všechny záznamy
- `POST /api/records` - Vytvořit nový záznam
- `PUT /api/records/:id` - Upravit záznam
- `DELETE /api/records/:id` - Smazat záznam
- `GET /api/health` - Kontrola stavu serveru

## Deployment

### Full-Stack Deployment (Netlify)

1. Push kód do Git repozitáře
2. Propojte s Netlify
3. Nastavte build command: `npm run build`
4. Nastavte publish directory: `build`
5. Netlify automaticky detekuje a spustí funkce v `netlify/functions/`

### API Endpoints

Všechny API endpointy jsou dostupné přes Netlify Functions:
- `GET /api/records` - Získat všechny záznamy
- `POST /api/records` - Vytvořit nový záznam
- `PUT /api/records/:id` - Upravit záznam
- `DELETE /api/records/:id` - Smazat záznam
- `GET /api/health` - Kontrola stavu serveru

## Struktura dat

```typescript
interface MileageRecord {
  id: number;
  date: string;
  totalKm: number;
  createdAt: string;
}
```

## Technologie

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Node.js, Express.js
- **Storage**: JSON file (lze upgradovat na databázi)
- **Deployment**: Netlify (frontend), Vercel/Netlify Functions (backend)
