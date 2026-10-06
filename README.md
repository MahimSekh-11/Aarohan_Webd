# 🌾 VillageMart (Tiorkhali Mart)

An elite, full-stack, hyper-local e-commerce ecosystem designed to empower village economies, local merchants, and rural communities. **VillageMart** connects local artisans and store owners with nearby customers through a robust, performant web platform featuring fully integrated lead management, client-side resource optimization, and strict administrator oversight.

---

## 🎨 Design Vision & Aesthetic

VillageMart is crafted around the **Slate Horizon** aesthetic—pairing deep, eye-safe slate canvases with mint, warm apricot and ivory accents. Focused heavily on negative space, legible typography, and real-time community engagement, it offers:
* **Modern Typography**: Readable system fonts with native script fallbacks.
* **Micro-Interactions**: Fluid entry paths and layout shifts handled seamlessly via `motion`.
* **Zero Latency Visuals**: Low-bandwidth optimization techniques ensuring immediate rendering over rural networks.

---

## 🚀 Key Architectural Strengths

### 1. Robust Role-Based Access Control (RBAC)
Three distinct application roles operate concurrently within a unified, secure matrix:
* **👑 Administrator**: Full dashboard visibility to approve candidate store managers, monitor overall community growth, prune catalog items, and maintain system integrity.
* **🏪 Store Manager (Merchant)**: Dedicated operations studio to list digital inventory (with name, discount, real-time calculated prices, and local delivery indicators), view customer inquiries, update status pipelines (`new` ➔ `contacted` ➔ `resolved`), and analyze monthly sales benchmarks.
* **🛒 Customer**: Visual bento-grid catalog to filter items by categories (e.g. *Groceries, Handicrafts, Clothing, Clay Art*) or look up unique local store brands. Users can trigger instant interest inquiries with details for direct merchant delivery.

### 2. High-Performance Client-Side Image Compressor
By default, heavy high-resolution smartphone images can cause slow page loads. VillageMart solves this with an instant, canvas-backed processing pool:
* Auto-compresses massive files to 70% quality JPEGs under an `800px` dimensional boundary.
* Completes processing before launching network transit, resulting in near-instant listing creation and minimal network load.

### 3. Integrated Lead-to-Sale Pipeline
Instead of introducing complex payment barriers for rural transactions, VillageMart utilizes a high-conversion, hyper-local trust model:
* **Direct Connections**: Customers trigger an inquiry with active, single-tap contact cards containing phone numbers and physical delivery coordinates.
* **Operations Tracking**: Merchants are instantly notified of new inquiries and can flag leads sequentially through statuses, allowing direct peer-to-peer execution.

---

## 🛠️ Full-Stack Technology Suite

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 19 + TypeScript | Component reusability, precise type systems, and responsive dynamic views. |
| **Bundling & dev** | Vite 6 + `tsx` | Ultra-fast Hot Module Replacement (HMR) simulation and rapid local compilation. |
| **Styling** | Tailwind CSS v4 | High-fidelity utility classes, custom themes, and adaptive mobile grids. |
| **Animations** | `motion` (`motion/react`) | Fluid, hardware-accelerated user experience transitions. |
| **State Management** | Zustand | Global lightweight store orchestration for reactive authentication. |
| **Backend API** | Express.js | Secure routing middleware, token parsing, and product/lead CRUD endpoints. |
| **Database** | MongoDB + Mongoose | Highly schema-flexible storage of models (Users, Products, Leads) with Atlas persistence and an explicit local preview replica set. |

---

## 📂 Project Structure Overview

```bash
├── api/index.js            # Vercel entry importing the built serverless handler
├── backend/                # Server-side controllers and database adapters
│   ├── middleware.ts       # Unified JSON Web Token (JWT) verification guard
│   ├── models.ts           # Mongoose Data Schemas (User, Product, Lead)
│   └── routes.ts           # REST API Endpoint declarations
├── src/                    # Client-side React Application
│   ├── components/         # Highly reusable layout templates & providers
│   │   ├── Navbar.tsx      # Main application utility hub
│   │   └── NotificationProvider.tsx  # Dynamic notification indicator
│   ├── pages/              # Module Layout page grids
│   │   ├── AdminDashboard.tsx      # Store Approval and Telemetry Panel
│   │   ├── Landing.tsx             # Interactive village entryway
│   │   ├── ManagerDashboard.tsx    # Inventory and Operations studio
│   │   └── Marketplace.tsx         # Customer showcase and filtering deck
│   ├── store/              # Global state declarations (Zustand Auth Store)
│   └── main.tsx            # React application entry point
├── server.ts               # Standalone host using the shared serverless API
├── package.json            # Manifest file declaring dependencies and build workflows
└── .env.example            # Environment variables placeholder
```

---

## ⚙️ Direct Setup & Commands

### Prerequisites
* **Node.js 22** Installed
* **MongoDB replica set / Atlas** connection string (temporary preview storage is used only when no URI is configured in development)

### Installation
1. Install project dependencies:
   ```bash
   npm install
   ```
2. Configure environmental credentials. Copy the sample config:
   ```bash
   cp .env.example .env
   ```
   *Within `.env`, you can customize security secrets and backend binding ports.*

### Running locally
* **Development Mode** (Vite frontend and watched Express backend):
  ```bash
  npm run dev
  ```
  Open `http://localhost:5173` to start interacting.

* **Production Compilation**:
  Bundles client assets and bundles the private backend into `build/server.mjs` and the public frontend into `dist/`:
  ```bash
  npm run build
  npm start
  ```

---

## 🔐 Environment Variables Guide

```env
# MongoDB Atlas Database URI Connection String
MONGODB_URI=mongodb+srv://...

# Authentication Cryptographic Secret Key for JWT Signing
JWT_SECRET=your_super_secure_signing_secret_here

# Network Deployment Port (Hardcoded to 3000 in AIS Environment)
PORT=3000
```

---
<img width="572" height="1024" alt="image" src="https://github.com/user-attachments/assets/d6cf0f90-f7cd-4215-a815-08e9e1473990" />

*Created with 💜 for rural entrepreneurship and community self-reliance.*

## Vercel deployment

Deploy the repository root with Node.js 22. `vercel.json` sets the Vite preset, `npm run vercel-build`, and the static output directory `dist`. The build creates the private backend bundle `build/serverless.mjs`; `api/index.js` loads that ESM bundle. Backend source lives in `backend/`, so only the actual handler becomes a function. Server code is excluded from public static output. The custom function build follows [Vercel's build-output guidance](https://vercel.com/docs/functions/runtimes/node-js/advanced-node-configuration).

Set `MONGODB_URI` and `JWT_SECRET` in Vercel's Preview and Production environment settings, and allow the deployment to connect to your MongoDB Atlas database. The deployed handler uses the existing database and does not create default administrator accounts during cold starts. After pushing these changes, create a fresh deployment with the build cache disabled once to discard the old compiled `api/index.js`. Visit `/api/health`; `status: "ok"` confirms that the function loads and `configured: true` confirms that both required environment variables are present. A real catalog request is needed to verify database connectivity.

`npm run test:deployment` creates the deployment build, then runs its exact entry with plain Node, checks native WAV replies in all seven languages, and tests database connection concurrency and failures without touching a real database. Model caches use the writable temporary directory on Vercel. Model downloads still need network access, memory and enough request time; the large NLLB translation model can exceed [serverless filesystem limits](https://vercel.com/docs/functions/runtimes), so use a persistent backend for that model in production. Bundled interface translations and native reply synthesis do not need a model download.

## Multilingual assistant and refreshed UI

The app now uses a consistent navy, mint and apricot theme across the landing page, marketplace, account forms and all three dashboards. The floating assistant supports voice and typed conversation, selected native languages, product drafts, validated website actions, expiring confirmations and removable preferences. Routes load separately, animations respect reduced-motion preferences, and the marketplace includes discounted-price filtering, sorting, visible loading/retry states and keyboard-accessible product dialogs.

See [the complete implementation and setup guide](docs/VOICE_AGENT.md) for architecture, supported languages/actions, changed files, provider configuration, database requirements, privacy, memory controls and test instructions.

For broad natural language understanding and serverless speech, configure `GEMINI_API_KEY` in backend environment settings. No provider key is bundled into the client. Without a key, supported core commands use the local parser and microphone fallback uses multilingual Whisper. Existing bundled UI translations cover seven languages immediately. The assistant offers thirteen language choices plus automatic detection; voice quality and broader understanding depend on the selected providers.

Run `npm run lint`, `npm test`, `npm run test:agent`, `npm run test:browser`, and `npm run test:deployment`. Browser tests require Vite on port 5178 (or set `BROWSER_TEST_ORIGIN`) and use real isolated MongoDB data with simulated microphones and speech services. `npm run test:speech-http` performs a real synthesized-audio Whisper round trip. Real accent/noise evaluation and live Gemini API calls need microphone samples/provider credentials.
