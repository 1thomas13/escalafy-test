# Reporting Dashboard — Prueba Técnica

## Para empezar

1. Leé **[INSTRUCTIONS.md](INSTRUCTIONS.md)** para los detalles completos de la prueba.

2. Instalá dependencias:
```bash
npm install
```

3. Configurá tu base de datos PostgreSQL y ejecutá el script de seed:
```bash
psql -U tu_usuario -d tu_base_de_datos -f database/seed.sql
```

4. Creá un `.env` con `DATABASE_URL` apuntando a tu base.

5. Arrancá el dev:
```bash
npm run dev
```

Abrí [http://localhost:3000](http://localhost:3000) y listo.

## Estructura (App Router)

```
app/
  page.tsx              # Server component, carga inicial con getReportData()
  api/
    reporting/route.ts  # GET /api/reporting
    db/                 # Conexión Drizzle + Postgres
components/
  report-dashboard.tsx  # Maneja filtros, cards y tabla
  report-filters.tsx    # Controles (org, fechas, métricas)
  data-table.tsx        # Tabla diaria con paginación
lib/
  reporting.ts          # Función getReportData() reutilizable
database/
  seed.sql              # Schema y datos de prueba
```

## Implementación

- **Función de reporting** (`lib/reporting.ts`): Lógica central. Se usa en el server component (carga inicial) y en el endpoint API. Una query SQL con CTEs une meta_ads_data, google_ads_data y store_data; las métricas calculadas/derivadas se aplican en JS.

- **Carga inicial server-side**: La página llama a `getReportData()` directo (sin HTTP) y le pasa `initialReportData` al dashboard. Los datos se ven en la primera carga.

- **Controles**: Cuando cambiás filtros, hace `router.push` con los query params. La página se re-renderiza en el servidor con los nuevos params y vuelve a llamar `getReportData`. Todo lo provee el servidor.

- **UI**: Cards para los totals, tabla paginada para el desglose diario. Filtros con debounce. shadcn/ui + Tailwind.

## Tests

```bash
npm test
```

Un test verifica que el componente de filtros renderiza sin romper. Es muy basico pero no esta demas realmente.

## Pre-instalado

- **Next.js** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui**
