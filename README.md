# 🌾 VillageMart (Tiorkhali Mart)

An elite, full-stack, hyper-local e-commerce ecosystem designed to empower village economies, local merchants, and rural communities. **VillageMart** connects local artisans and store owners with nearby customers through a robust, performant web platform featuring fully integrated lead management, client-side resource optimization, and strict administrator oversight.

---

## 🎨 Design Vision & Aesthetic

VillageMart is crafted around the **Slate Horizon** aesthetic—pairing deep, eye-safe slate canvases with electric violet and emerald accents. Focused heavily on negative space, legible typography, and real-time community engagement, it offers:
* **Modern Typography**: Bold "Inter" UI elements paired with monospace status arrays.
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
| **Database** | MongoDB + Mongoose | Highly schema-flexible storage of models (Users, Products, Leads) with automatic Atlas or local fallback. |

---

## 📂 Project Structure Overview

```bash
├── api/                    # Server-side controllers and database adapters
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
├── server.ts               # Express Server with incorporated Vite Dev Middleware
├── package.json            # Manifest file declaring dependencies and build workflows
└── .env.example            # Environment variables placeholder
```

---

## ⚙️ Direct Setup & Commands

### Prerequisites
* **Node.js** Installed (v18+)
* **MongoDB** connection string (or defaults automatically to an in-memory test database)

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
* **Development Mode** (Vite Dev Server integrated into Express backend):
  ```bash
  npm run dev
  ```
  Open `http://localhost:3000` to start interacting.

* **Production Compilation**:
  Bundles client assets and transpiles server TypeScript cleanly under `dist/`:
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
