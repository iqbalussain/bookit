

# Bank Details, VAT in PDF, and LAN Multi-User Server

## 1. Bank details on Quotation & Invoice PDFs

The `bankName` and `bankAccountNumber` fields already exist in `BusinessSettings` and the Settings UI. Only the PDF template is missing them.

**Edit `src/lib/documentUtils.ts`** — add a "Payment Details" block above the footer:

```text
┌───────────────────────────┐
│ PAYMENT DETAILS           │
│ Bank:      HDFC Bank      │
│ Account:   1234 5678 9012 │
└───────────────────────────┘
```

Render only when either field is set.

## 2. VAT visible in PDF (Quotation + Invoice)

Currently the PDF table has columns: `# | Item | Qty | Rate | Total` and only a Grand Total row.

**Edit `src/lib/documentUtils.ts`**:

- Add **VAT %** and **VAT Amount** columns to the items table:
  `# | Item | Qty | Rate | VAT % | VAT Amt | Total`
- For lines where `vatApplicable` is false, show `—` in the VAT columns.
- Replace single Grand Total with a 3-row totals box:
  - **Subtotal** (sum of `qty × rate`)
  - **VAT** (sum of `vatAmount`)
  - **Grand Total** (`netTotal`)
- Same template is used for both quotation and invoice, so both get fixed in one edit.

## 3. LAN multi-user via local Node/Express server on the main PC

**New folder `server/`** at project root containing a standalone Express + SQLite server that runs on the main PC and exposes the same data over HTTP on the LAN.

```text
server/
├── package.json          (express, better-sqlite3, cors)
├── server.js             (REST API + SQLite, port 4000)
├── schema.sql            (mirrors current Electron schema + bank fields, vat columns, items, vouchers, audit)
└── README.md             (how to run + find LAN IP)
```

**Endpoints** (all JSON, all support concurrent clients via better-sqlite3 WAL mode):

```text
GET    /api/health
GET    /api/clients          POST /api/clients          PUT /api/clients/:id     DELETE …
GET    /api/items            POST /api/items            PUT  …                    DELETE …
GET    /api/quotations       POST /api/quotations       PUT  …                    DELETE …
GET    /api/invoices         POST /api/invoices         PUT  …                    DELETE …
GET    /api/purchase-invoices  POST … PUT … DELETE …
GET    /api/payments         POST /api/payments
GET    /api/vouchers         POST /api/vouchers
GET    /api/journal-entries  POST /api/journal-entries
GET    /api/accounts         POST /api/accounts         DELETE …
GET    /api/settings         PUT  /api/settings
GET    /api/companies        POST/PUT/DELETE
```

**Concurrency control** — each row gets `updated_at` and `version INTEGER`. PUT requires the client's `version`; if it doesn't match the DB, the server returns `409 Conflict` with the latest record so the client can prompt the user. SQLite is opened with `PRAGMA journal_mode=WAL` so multiple clients can read while one writes.

**Frontend integration** — new file `src/lib/apiClient.ts`:

- Reads server URL from `localStorage.serverUrl` (default `http://localhost:4000`).
- Wraps fetch with retry + 409 handling.
- Exported helpers: `api.list('clients')`, `api.save('clients', obj)`, etc.

**New `useRemoteCollection` hook** replacing `useLocalStorage` for shared collections when a server URL is configured. Behavior:
1. On mount: fetch from server, fall back to localStorage if offline.
2. Poll every 5s for changes (lightweight `If-Modified-Since`-style timestamp check via `GET /api/changes?since=…`).
3. On save: POST/PUT to server, then update local cache.
4. If server unreachable: keep working offline, queue mutations, sync when back.

**Settings page — new "Network" card**:
- Mode: `Standalone (this PC only)` | `Server (host the database)` | `Client (connect to server)`
- Server URL field (e.g. `http://192.168.1.50:4000`)
- "Test connection" button
- When mode = Server, show the LAN IP detected (read-only) and instructions to give it to client PCs.

**Electron integration** — when the app runs in Electron AND mode = Server, `main.js` automatically spawns the Node server as a child process on app start so the user doesn't run two programs.

## 4. Stability & concurrency

- WAL mode in SQLite (multiple concurrent readers + one writer, no blocking).
- Optimistic locking via `version` column (see above).
- Server logs every mutation with timestamp + client IP for audit.
- Client shows toast on `409 Conflict`: "This record was changed by another user. Reload?"
- Polling debounced; HMR/network errors shown as silent banner, not blocking dialogs.

## 5. Single-credit scope

All work fits in one cycle by reusing existing types, settings fields, and PDF template. The server is a small standalone module (~250 lines) and the client wrapper is one hook + one api file. No schema rewrite of localStorage is required — `useRemoteCollection` falls back transparently.

---

## Files changed / created

| File | Change |
|---|---|
| `src/lib/documentUtils.ts` | Add VAT columns, Subtotal/VAT/Total box, Bank details block |
| `server/package.json` | New — express, better-sqlite3, cors |
| `server/server.js` | New — REST API + SQLite WAL + optimistic locking |
| `server/schema.sql` | New — full schema incl. bank, vat, items, vouchers |
| `server/README.md` | New — setup & LAN instructions |
| `src/lib/apiClient.ts` | New — fetch wrapper with 409 handling |
| `src/hooks/useRemoteCollection.ts` | New — server-aware replacement for useLocalStorage |
| `src/contexts/AppContext.tsx` | Switch shared collections to useRemoteCollection when server configured |
| `src/pages/Settings.tsx` | New "Network / Multi-user" card |
| `main.js` | Optionally spawn server child process when mode = Server |

