# StockPilot AI — Smart Inventory Management

> Developed for the MedaVida Intern Hackathon Challenge.
> A complete, production-grade inventory management system for small retail businesses featuring **OCR Purchase Invoice Processing**, **Predictive Demand Forecasting & Stock-Out Calculations**, and **Strict Multi-Tenant Role-Based Access Control**.

---

## 🚀 Live Demo Credentials

| Persona | Role | Business | Email | Password | Permissions |
|:---|:---|:---|:---|:---|:---|
| **Ramesh** | Owner | Ramesh General Store | `ramesh@demo.com` | `demo123` | Full access: CRUD products, adjust stock, OCR import, restock orders |
| **Priya** | Staff | Ramesh General Store | `priya@demo.com` | `demo123` | Record sales (POS &lt;15s), view stock. Cannot change prices, delete products, or approve invoices |
| **Anita** | Owner | Anita Medical | `anita@demo.com` | `demo123` | Separate inventory. Server denies access if Anita attempts to view Ramesh's product |

*Quick login buttons are available directly on the login page for instantaneous 1-click evaluation.*

---

## 🌟 Key Features & Problem Solutions

### 1. Stock Movement Ledger (§02)
- Stock is **never** typed over. Every stock change is an immutable movement (`PURCHASE`, `SALE`, `ADJUSTMENT`) with user, timestamp, quantity, balance after, and reason.
- **No Negative Stock**: Sales or adjustments exceeding available stock are strictly rejected.
- **Fractional Quantities**: Allowed exclusively for `kg` and `litre` units; integer enforced for `pcs` and `box`.
- **Concurrency & Race Conditions**: Handled via atomic transactions with conditional checks.
- **Idempotency**: Client-generated idempotency keys prevent duplicate sales or stock decrements on network retries.
- **Product Archival**: Products with history are archived (`isArchived: true`), never hard deleted.

### 2. OCR Invoice Import & Human Confirmation (§03)
- Upload printed purchase invoice photos or PDFs (JPG, PNG, PDF max 5 MB).
- **Two-phase extraction**: Tesseract.js optical character recognition combined with a layout-aware parser extracts supplier name, invoice number, invoice date, and line items (quantity, unit rate, line total).
- **Fuzzy Product Matching**: Matches line items against existing catalog products by name or SKU.
- **Review & Confirm Step**: Extracted data **never** alters stock until the owner reviews the editable split-screen table.
- **Duplicate Detection**: Warns if the same supplier + invoice number or identical file hash was previously imported. Confirming an invoice twice is blocked at the database level.

### 3. Demand Forecasting & Stock-Out Prediction (§04)
- **Sales Velocity**: Weighted Moving Average over the product's recent sales history (linear weighting prioritizing recent demand). If fewer than 7 days of sales exist, the system explicitly flags `"Not enough history"` instead of guessing.
- **Days of Cover**: $\text{Current Stock} \div \text{Sales Velocity}$. Displays the exact predicted stock-out date.
- **Low-Stock Alert**: Automatically raised when $\text{Stock} \le \text{Reorder Level}$ OR $\text{Days of Cover} \le \text{Lead Time}$. Alerts clear automatically after restock.
- **Restock Recommendation**: Computes required units to cover lead time plus buffer days, rounded up to the product's supplier carton pack size.
- **Mathematical Explanation**: Every recommendation displays human-readable reasoning:
  > *"Cooking Oil: Sells 6/day, 9 left, 4-day lead time → order 48 (2 cartons of 24)"*
- **Bulk Sales History Import**: Paste or upload historical CSV sales records to instantly benchmark forecasts without manual data entry.
- **Export**: One-click printable purchase order and CSV export for suppliers.

### 4. Lightning-Fast POS for Staff (§05.9)
- Designed to record a multi-item customer sale in under 15 seconds on mobile.
- Instant product lookup, quantity steppers, live subtotal, and receipt generation.

---

## 🛠️ Technology Stack

- **Framework**: Next.js 15 (App Router, Server Actions, Route Handlers)
- **Language**: TypeScript (strict mode)
- **Database**: SQLite / PostgreSQL via Prisma ORM
- **Authentication**: Session cookie with role-based access control and tenant isolation
- **UI & Styling**: Tailwind CSS, Lucide React icons, responsive mobile drawer
- **OCR Engine**: Tesseract.js (WASM / Node.js) with pre-loaded mock invoice fixtures
- **Money Handling**: Stored in integer paise (₹1 = 100 paise) to prevent floating-point rounding errors

---

## 💻 Local Setup & Execution Instructions

### Prerequisites
- Node.js v18.17+ or v20+ or v22+
- npm v9+

### 1. Install Dependencies
```bash
npm install
```

### 2. Initialize Database & Seed Demo Data
```bash
npm run db:push
npm run db:seed
```

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 4. Or Run Production Build
```bash
npm run build
npm run start
```

---

## 🧪 Verification & Test Scenarios

1. **Staff Sales Test**: Log in as Priya (`priya@demo.com` / `demo123`). Navigate to **Record Sale**, add 2 units of Cooking Oil, and complete the sale. Notice stock drops from 9 to 7, and a `SALE -2` ledger entry is logged.
2. **Negative Stock Prevention**: Attempt to sell 100 units of Cooking Oil when only 7 are left. The server immediately rejects the sale with an `"Insufficient stock"` alert.
3. **Staff Restriction**: As Priya, attempt to delete or edit a product price. Access is denied with HTTP 403.
4. **Tenant Isolation**: Log in as Anita (`anita@demo.com` / `demo123`). In URL bar, try to query Ramesh's product ID. The server responds with HTTP 404 access denied.
5. **OCR Import & Confirmation**: Log in as Ramesh. Navigate to **OCR Invoices**, select Demo Sample 1 ("Gujarat Wholesale Distributors"), review the extracted 48 cartons of Cooking Oil, and click **Confirm & Update Stock Atomically**. Cooking Oil stock updates to 55, and the low-stock alert automatically clears!
6. **Duplicate Invoice Protection**: Attempt to confirm the same invoice again. The system rejects it with HTTP 409, preventing duplicate inventory increases.

