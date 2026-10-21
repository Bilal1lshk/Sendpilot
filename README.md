<div align="center">

# 🚀 SendPilot

**Intelligent, Safe, and Automated LinkedIn Outbound & Prospect Engagement Platform**

[![Next.js](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2-blue?style=for-the-badge&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?style=for-the-badge&logo=mongodb)](https://www.mongodb.com/)
[![Playwright](https://img.shields.io/badge/Playwright-Automation-45ba4b?style=for-the-badge&logo=playwright)](https://playwright.dev/)

<p align="center">
  SendPilot empowers sales teams, growth agencies, and recruiters to scale personalized LinkedIn outreach safely. Built on a hybrid architecture that blends serverless API orchestration with offloaded residential browser automation, SendPilot bypasses bot detection while delivering AI-personalized campaigns at scale.
</p>

[Key Features](#-key-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Worker Runner](#-residential-worker-runner) • [Environment Variables](#-environment-variables) • [Scripts](#-available-scripts)

---

</div>

## ✨ Key Features

### 🎯 Multi-Step Campaign Automation
- **Visual Sequence Builder**: Construct targeted outreach cadences with personalized connection invitations, timed follow-ups, and condition-based branching.
- **Smart Stop-on-Reply**: Automatically pauses sequences the moment a lead responds to preserve human authenticity.
- **Audit Logging & Automatic Retries**: Full transparency into per-step execution status with built-in retry backoff on transient network faults.

### 🤖 AI Outreach Engine
- **Hyper-Personalized Notes**: Automatically drafts tailored invite messages leveraging prospect headline, summary, and experience signals.
- **AI Reply Classifier**: Classifies prospect replies into categories (e.g., *Interested*, *Not Now*, *Objection*, *Out of Office*) to trigger follow-up actions.

### 🛡️ Anti-Bot Detection & Safety First
- **Sticky Residential Proxy Rotation**: Direct integration with residential proxy networks (Oxylabs, BrightData, Smartproxy, Webshare) to route sessions through real household IPs.
- **Fingerprint & Geolocation Alignment**: Automatically aligns browser timezone, locale (`en-US`, `en-GB`, etc.), coordinates, and headers to match the proxy IP location.
- **Humanized Browser Actions**: Natural scroll rhythms, random delays, and genuine DOM event emulation powered by Playwright.
- **Account Rate Limits**: Strict daily caps for connection requests, profile visits, and direct messages per account.

### ⚡ Hybrid Serverless + Dedicated Worker Architecture
- Run lightweight operations serverless on Vercel or cloud containers.
- Offload resource-intensive browser automation to a dedicated local PC or VPS worker (`npm run worker`) using zero-config **Cloudflare Quick Tunnels** or **Localtunnel** with automatic failover and instant reconnection.

### 👥 Lead & Workspace Management
- **CSV Import Wizard**: Bulk lead import with automatic header detection and data normalization.
- **Lead Groups & Tagging**: Organize prospects by ICP, industry, priority, and campaign readiness.
- **Multi-Tenant Workspaces**: Organize campaigns and leads across separate workspaces with granular isolation.
- **Interactive CRM-Style Leads Table**: Real-time filtering, search, status badge tracking, and slide-over prospect inspection drawer.

### 🔒 Enterprise-Grade Security
- **NextAuth.js v5**: Google OAuth Single Sign-On and email credentials with 6-digit OTP verification via SMTP.
- **AES-256-GCM Credential Vault**: All session cookies (`li_at`, `JSESSIONID`) are encrypted at rest with authenticated AES-256-GCM.

---

## 🏛 Architecture

```mermaid
flowchart TD
    User([User / Web Browser]) -->|Next.js App Router| WebApp[SendPilot Web App\nNext.js 16 + React 19]
    WebApp -->|NextAuth / OTP| Auth[Authentication Service]
    WebApp -->|State / Cache| Redux[Redux Toolkit Store]
    WebApp -->|Persist Data| DB[(MongoDB Atlas)]

    subgraph Automation Engine
        WebApp -->|Dispatch Jobs| WorkerProxy{Worker Router}
        WorkerProxy -->|Serverless / Chromium| ServerlessRunner[@sparticuz/chromium\nAWS Lambda / Vercel]
        WorkerProxy -->|Offloaded Runner| Tunnel[Cloudflare / Localtunnel]
        Tunnel --> LocalWorker[Dedicated Residential Worker\nscripts/linkedin-worker.ts]
        LocalWorker --> Playwright[Playwright Browser Engine]
    end

    subgraph External Networks
        Playwright -->|Sticky Residential IP| ProxyPool[Residential Proxy Pool]
        ProxyPool --> LinkedIn[LinkedIn Platform]
    end

    subgraph AI Intelligence
        WebApp --> AIPersonalizer[AI Invite Personalizer]
        WebApp --> AIReply[AI Reply Classifier]
    end
```

---

## 🛠 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router, Server Actions), [React 19](https://react.dev/) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/), [Framer Motion](https://motion.dev/), [Sonner](https://sonner.emilkowal.com/), [Cobe 3D](https://github.com/shuding/cobe) |
| **State Management** | [Redux Toolkit](https://redux-toolkit.js.org/) & [React-Redux](https://react-redux.js.org/) |
| **Database** | [MongoDB](https://www.mongodb.com/) with [Mongoose 9](https://mongoosejs.com/) |
| **Authentication** | [NextAuth.js v5](https://authjs.dev/) (Google OAuth + Email/Password + OTP Verification) |
| **Browser Automation** | [Playwright Core](https://playwright.dev/), [@sparticuz/chromium](https://github.com/Sparticuz/chromium) |
| **Networking & Tunnels** | [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/), [Localtunnel](https://localtunnel.me/), [Undici](https://undici.nodejs.org/) |
| **Email Delivery** | [Nodemailer](https://nodemailer.com/) (Plain SMTP / TLS) |

---

## 📂 Project Structure

```text
sendpilot/
├── public/                 # Static assets and icons
├── scripts/                # Standalone automation runners & CLI utilities
│   ├── linkedin-worker.ts  # Dedicated Playwright worker daemon with auto-tunnel
│   ├── linkedin_extractor.py
│   └── linkedin-login-extractor.mjs
├── src/
│   ├── app/                # Next.js App Router pages and API route handlers
│   │   ├── (auth)/         # Login, register, OTP verification, password reset
│   │   ├── dashboard/      # Main dashboard, leads, campaigns, extractor, accounts, settings
│   │   ├── get-started/    # Onboarding wizard flow
│   │   └── api/            # REST API endpoints (campaigns, leads, flows, linkedin, auth)
│   ├── components/         # Reusable React components
│   │   ├── landing/        # Marketing landing page components (Hero, Features, Pricing, etc.)
│   │   ├── leads/          # Leads table, drawers, filters, CSV import dialogs
│   │   ├── onboarding/     # Step-by-step account connection and setup wizard
│   │   └── ui/             # Core UI elements (Globe, Orbiting circles, progressive blur)
│   ├── lib/                # Core business logic & utility modules
│   │   ├── ai-personalizer.ts              # AI message generators
│   │   ├── ai-reply-classifier.ts          # Response categorization
│   │   ├── connection-crypto.ts            # AES-256-GCM cookie encryption
│   │   ├── playwright-linkedin-connect.ts  # Connection dispatch automation
│   │   ├── playwright-linkedin-extractor.ts# Profile & data extraction
│   │   ├── playwright-linkedin-messaging.ts# Direct message automation
│   │   ├── mongodb.ts                      # MongoDB connection pool singleton
│   │   └── rate-limit.ts                   # Account daily caps & safety counters
│   ├── models/             # Mongoose schemas (User, Workspace, Campaign, Lead, LinkedInConnection)
│   ├── store/              # Redux Toolkit store and feature slices
│   └── types/              # TypeScript interfaces and NextAuth type augmentations
├── tests/                  # Security & integration test suites
├── .env.example            # Environment variables template
└── package.json            # Project manifest and scripts
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher (or `pnpm` / `bun`)
- **MongoDB**: A running MongoDB instance (local or MongoDB Atlas connection string)
- **Google Chrome / Chromium**: Installed locally for Playwright execution

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/Bilal1lshk/Sendpilot.git
cd Sendpilot
npm install
```

Install Playwright browsers (if running automation locally):

```bash
npx playwright install chromium
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory by copying `.env.example`:

```bash
cp .env.example .env
```

Open `.env` and configure your credentials. At minimum, configure:
- `MONGODB_URI`
- `AUTH_SECRET` / `NEXTAUTH_SECRET`
- `COOKIE_ENC_KEY` (Generate via: `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`)
- `AUTH_URL` / `NEXTAUTH_URL`
- `SMTP_*` (for email verification and OTPs)

*(See the [Environment Variables](#-environment-variables) section below for detailed descriptions).*

### 3. Run the Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🖥️ Residential Worker Runner

For production deployments (e.g. Vercel) where serverless execution limits, AWS Lambda IP blocks, or bot detection would hinder browser automation, SendPilot supports **offloading automation tasks to a dedicated worker runner**.

The worker runs Playwright on your local machine or an external residential VPS, automatically generating a secure tunnel and registering its public URL.

### Launching the Worker

```bash
# Standard headless worker with Cloudflare/Localtunnel auto-exposure:
npm run worker

# Run in headed mode (opens a visible browser window for live inspection):
npm run worker:headed

# Run locally without public tunneling (ideal for local end-to-end dev):
npm run worker:local
```

### How the Worker Works:
1. Starts a lightweight HTTP server on port `4000`.
2. Automatically provisions a public tunnel via **Cloudflare Quick Tunnels** (or falls back to **Localtunnel**).
3. Writes the active tunnel URL to `.tunnel-url` and logs the webhook endpoint.
4. Outbound connection dispatches, messages, and profile extractions use the fixed `https://sendpilot-bilal-runner.loca.lt` worker URL by default. Keep the runner subdomain set to `sendpilot-bilal-runner`.

---

## 🔑 Environment Variables

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `MONGODB_URI` | MongoDB Atlas or local connection string | `mongodb+srv://...` |
| `AUTH_SECRET` | Secret key used to encrypt NextAuth JWT tokens | 32-byte random string |
| `NEXTAUTH_URL` | Canonical URL of the application | `http://localhost:3000` |
| `COOKIE_ENC_KEY` | AES-256-GCM base64 key for encrypting LinkedIn credentials | Base64 32-byte key |
| `AUTH_GOOGLE_ID` | *(Optional)* Google OAuth Client ID | `*.apps.googleusercontent.com` |
| `AUTH_GOOGLE_SECRET` | *(Optional)* Google OAuth Client Secret | Client secret string |
| `LINKEDIN_CLIENT_ID` | *(Optional)* LinkedIn Developer App Client ID | Client ID |
| `LINKEDIN_CLIENT_SECRET` | *(Optional)* LinkedIn Developer App Client Secret | Client Secret |
| `SMTP_HOST` | SMTP server host for sending OTP emails | `mail.example.com` |
| `SMTP_PORT` | SMTP port (e.g. 587 or 465) | `587` |
| `SMTP_USER` | SMTP username | `contact@example.com` |
| `SMTP_PASS` | SMTP password | Secret string |
| `SMTP_FROM` | Sender display name and address | `"SendPilot" <noreply@...>` |
| `OTP_SECRET` | Signing secret for OTP tokens | Random secret string |
| `PROXY_SERVER` | *(Optional)* Residential proxy server endpoint | `http://pr.oxylabs.io:7777` |
| `PROXY_USER` | *(Optional)* Residential proxy username | `customer-username` |
| `PROXY_PASS` | *(Optional)* Residential proxy password | Proxy password |
| `PROXY_COUNTRY` | *(Optional)* Country code for IP rotation & browser timezone | `US` |
| `LINKEDIN_WORKER_URL`| Dedicated worker tunnel URL | `https://sendpilot-bilal-runner.loca.lt` |
| `LINKEDIN_WORKER_SECRET` | *(Optional)* Shared secret for worker endpoint security | Shared auth secret |

---

## 📜 Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server with hot-reload at `localhost:3000` |
| `npm run build` | Builds the optimized production application |
| `npm run start` | Starts the Next.js production server |
| `npm run worker` | Runs the Playwright automation worker with auto-tunneling |
| `npm run worker:headed` | Runs the Playwright automation worker with a visible browser UI |
| `npm run worker:local` | Runs the Playwright automation worker on `localhost:4000` without a tunnel |
| `npm run lint` | Runs ESLint 9 checks across the codebase |
| `npm run test:security` | Executes the test suite for cookie encryption and security rules |

---

## 🛡️ Security & Responsible Outreach

SendPilot is designed with safety, privacy, and account health as first-class priorities:
- **Zero Plaintext Credentials**: Authentication cookies and tokens are encrypted with AES-256-GCM before database insertion.
- **Smart Delays & Randomization**: Actions are dispatched with jittered delay intervals mimicking organic user behavior.
- **Strict Daily Rate Limits**: Prevents automated actions from exceeding LinkedIn platform thresholds.
- Always comply with LinkedIn's terms of service and relevant regional outreach and privacy regulations (GDPR, CAN-SPAM).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
