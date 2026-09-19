# TerraFuse — Environmental Decision Firewall

> **Autonomous Environmental Decision Firewall for Sustainable Procurement**  
> Intercepts procurement quotes (PDF, DOCX, XLSX, CSV), extracts bill-of-materials via Google Gemini, deterministically calculates true lifecycle impact (DEFRA / EPA WARM), and blocks high-risk purchasing decisions before capital commitment.

---

## 🌍 Why TerraFuse?

Corporate procurement teams commit millions to single-use plastics and high-carbon goods due to incomplete vendor disclosures and greenwashing. 

**TerraFuse acts as a Decision Firewall before purchase approval**:
1. **Real Ingestion**: Ingests actual supplier quotes, purchase orders, and spec sheets across PDF, DOCX, XLSX, and CSV.
2. **AI Extraction**: Uses Google Gemini (with deterministic heuristic fallback) to extract item counts, materials, costs, and unstated assumptions into a strict fact vs. inference schema.
3. **Deterministic Calculation**: The AI *never* invents carbon or waste numbers. All lifecycle metrics (CO₂e, waste, water, recyclability, landfill risk) are deterministically computed using published factor registries (**DEFRA GHG 2024**, **US EPA WARM v16**, **PlasticsEurope**).
4. **Decision Firewall**: Automatically checks circular economy rules, flags low-recyclability materials in single-use scenarios, flags high uncertainty, and prevents authorization until risks are mitigated.
5. **Dynamic Circular Alternatives**: Evaluates modular, recycled, and rental options through the exact same deterministic formulas.
6. **Immutable Audit Trail & Certificate**: Maintains timestamped audit logs for every review state change, generating a shareable verification certificate with cryptographic checksums.

---

## 🛠️ Architecture

`
                                      ┌─────────────────────────────────────────┐
                                      │  Upload Document (PDF / DOCX / XLSX)    │
                                      └────────────────────┬────────────────────┘
                                                           │
                                                           ▼
                                      ┌─────────────────────────────────────────┐
                                      │  Text & Table Extraction Engine         │
                                      │  (pdf-parse v2, mammoth, xlsx)          │
                                      └────────────────────┬────────────────────┘
                                                           │
                                                           ▼
                                      ┌─────────────────────────────────────────┐
                                      │  AI Extraction & Fact-Finding           │
                                      │  (Google Gemini / Heuristic Fallback)   │
                                      └────────────────────┬────────────────────┘
                                                           │
                                                           ▼
                                      ┌─────────────────────────────────────────┐
                                      │  Deterministic LCA Calculation Engine   │
                                      │  (DEFRA 2024, EPA WARM v16, Ecoinvent)  │
                                      └───────────┬─────────────────┬───────────┘
                                                  │                 │
                         ┌────────────────────────┘                 └────────────────────────┐
                         ▼                                                                   ▼
       ┌─────────────────────────────────────────┐                         ┌─────────────────────────────────────────┐
       │     Decision Firewall Risk Rules        │                         │      Dynamic Alternatives Generator     │
       │  (Flags: Circularity, Waste, Data Gaps) │                         │  (Modular, Recycled Fiber, Rental Mode) │
       └──────────────────┬──────────────────────┘                         └──────────────────┬──────────────────────┘
                          │                                                                   │
                          └───────────────────────────────┬───────────────────────────────────┘
                                                          ▼
                                      ┌─────────────────────────────────────────┐
                                      │  Dual-Mode Database & Audit Trail       │
                                      │  (PostgreSQL / Zero-Config PGlite)      │
                                      └───────────────────┬─────────────────────┘
                                                          │
                                                          ▼
                                      ┌─────────────────────────────────────────┐
                                      │  Bespoke React Frontend & Certificate   │
                                      └─────────────────────────────────────────┘
`

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20.6+ (v24 recommended)
- **pnpm**: v9+ (corepack enable pnpm or 
pm i -g pnpm)

### 2. Clone & Install
`ash
git clone https://github.com/Madhavan20906/TerraFuse.git
cd TerraFuse
pnpm install
`

### 3. Configure Environment
Copy the example environment file:
`ash
cp .env.example .env
`
Add your Gemini API key (optional; system includes a deterministic fallback parser):
`env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=5000
`

### 4. Run Locally

**Start the Backend API Server (Port 5000):**
`ash
cd artifacts/api-server
pnpm run dev
`

**Start the Frontend App (Port 3000):**
`ash
cd artifacts/terrafuse
pnpm run dev
`
Open **http://localhost:3000** in your browser.

---

## 🧪 Automated Test Suite

Run the full automated test suite (12 / 12 tests across LCA calculations, firewall rules, document extraction, and API lifecycle):
`ash
cd artifacts/api-server
pnpm run test
`

---

## 📊 Environmental Factor Sources & Methodology

- **DEFRA (UK Department for Environment, Food & Rural Affairs)**: 2024 Government Greenhouse Gas Conversion Factors for Company Reporting.
- **US EPA WARM (Waste Reduction Model v16)**: Life-cycle greenhouse gas emission factors for materials management and curbside recovery.
- **PlasticsEurope**: Eco-profiles and Environmental Product Declarations for flexible PVC and polyolefins.
- **Amortization Curve Formula**:
  M_{\\text{allocated}} = M_{\\text{total}} \\times \\max\\left(0.12, \\frac{1}{\\text{reuseCycles}}\\right)

---

## 📜 License
MIT
