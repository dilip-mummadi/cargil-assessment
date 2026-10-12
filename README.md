# Corporate Risk Reporting

A server-backed risk-position explorer built with .NET 10, React, TypeScript, and AG Grid Community. It reads the supplied 50,000-row CSV and keeps paging, sorting, filtering, and summaries on the API.

## Run locally

Requirements: .NET 10 SDK and Node.js 20.19+.

Terminal 1, start the API:

```sh
dotnet run --project backend/Crr.Api --urls http://localhost:5055
```

Terminal 2, start the frontend:

```sh
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` requests to the API at port 5055. No database or separate seed command is required; the API reads `risk_positions.csv` at startup.

## API

- `GET /api/positions?startRow=0&endRow=100&sortBy=pnl&sortDirection=desc&book=Ags&search=metals`
- `GET /api/summary?groupBy=commodity&book=Ags`
- `GET /api/metadata`
- `GET /api/positions/{tradeId}`
- `GET /api/health`

The paging response includes `rows` and the filtered `totalCount`. The summary endpoint uses the same filter set and always aggregates the complete filtered result, not the visible grid block.
