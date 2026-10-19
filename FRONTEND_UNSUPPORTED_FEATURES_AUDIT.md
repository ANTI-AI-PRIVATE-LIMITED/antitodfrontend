# Comprehensive Audit: Unsupported Frontend Features & Dead Buttons

> **Target Repositories:**  
> - **Frontend:** `Xyberah-redesign` (React 18 + Vite)  
> - **Backend:** `Xyberah-backend` (Express.js on branch `feature/merge-live-features`)  
> **Date:** October 19, 2026  
> **Purpose:** Identify every button, UI control, workflow, and entire page in the frontend that is **not backed by real backend capabilities** in the current backend branch (`feature/merge-live-features`), and specify what must be removed, hidden, or cleaned up for a reliable, production-ready release.

---

## Executive Summary

The backend branch `feature/merge-live-features` provides substantial capabilities for:
- **Authentication & RBAC:** Admin login, OTP verification, password recovery, user/group permissions (`/AdminRoutes/*`, `/AdminRoutes/rbac/*`).
- **Billing & Subscriptions:** Razorpay integration, plan limits, usage tracking (`/AdminRoutes/billing/*`, `/BillingRoutes/*`).
- **Honeypot Logs & Threat Map (V2 & V3):** ClickHouse queries, attacking host profiles, geolocation, threat maps, commands, and timelines (`/HoneyPotRoutes/*`).
- **Threat Intelligence (IOCs):** Centralized IOC feed, statistics, filters, and background feed sync (`/IocRoutes/*`).
- **Infrastructure Management:** Servers, shippers, agents, Docker containers, templates, and deployments (`/AdminRoutes/agents/*`, `/AdminRoutes/templates/*`, `/AdminRoutes/deployments/*`, etc.).
- **Attack Surface Management (ASM / Recon):** Native TIaaS ASM scanner (`/AsmScanRoutes/*`), OpenASM BFF (`/asm/*`), and Django ReNgine reverse proxy (`/rengine/*`).
- **Integrations:** SIEM/SOAR connectors, event pipelines, and threat feed previews (`/IntegrationsRoutes/*`).
- **Provider Proxies:** Server-side proxy for IPData, Ransomware.live, and Gemini LLM (`/AdminRoutes/proxy/*`).

However, multiple screens and buttons in the frontend (`Xyberah-redesign`) were built as **visual prototypes, demo-mode mocks, or client-side placeholders** that have **no backend database, no routes, and no operational engine** in `feature/merge-live-features`.

---

## 1. Dead, Misleading & Stubbed UI Buttons

These buttons exist directly on live pages but fail silently, throw errors, display alerts, or do nothing on the backend:

| # | Page / Location | Button / UI Control | Current Frontend Behavior | Backend Availability in `feature/merge-live-features` | Recommended Action |
|---|---|---|---|---|---|
| 1 | **Header** (`Header.tsx:125`) | **Notification Bell Button** | Purely visual `<button>` with **NO `onClick` handler** and a static red dot (`<span />`). | **None.** No notification inbox, read/unread states, or notification model exists. | **Remove button** from Header or hide until backend notification service exists. |
| 2 | **IOC Manager** (`IocPage.tsx:135`) | **"+ Add IOC" Button** | Calls `showAddIocNotice()`, rendering an alert banner: *"IOC creation is not connected to the current data API."* | **None.** `/IocRoutes` only has `stats`, `feed`, `filters`, and `sync`. There is **no `POST /IocRoutes` endpoint**. | **Remove "+ Add IOC" button**. IOCs are fed automatically from public feeds. |
| 3 | **Honeypot Logs** (`HoneypotLogsPage.tsx:737`) | **"Add to IOC" Button** (Event Inspector) | Merely navigates the user to the IOC page (`onNavigate('iocs')`). Does not create or promote any IOC. | **None.** No endpoint exists to convert a honeypot incident into a custom IOC. | **Remove button** to avoid user confusion. |
| 4 | **SOC Rules** (`RulesPage.tsx:347`) | **"+ New Rule" Button** | Triggers browser alert: *"Rule authoring is currently disabled in Demo Mode. Connect a persistence backend to enable this feature."* | **None.** No `/rules` endpoint, detection rule database, or Sigma/YARA compiler exists in backend. | **Remove button** (or remove the entire page). |
| 5 | **Response Playbooks** (`PlaybookPage.tsx:344`) | **"+ New Playbook" Button** | Triggers browser alert: *"Playbook authoring is currently disabled in Demo Mode. Connect a persistence backend to enable this feature."* | **None.** No `/playbooks` endpoint, SOAR workflow runner, or step execution engine exists in backend. | **Remove button** (or remove the entire page). |
| 6 | **Settings Modal** (`SettingsModal.tsx:125`) | **Whitelist Tab & "ADD TO WHITELIST" Button** | Saves items only to browser `localStorage['xyberah_whitelist']`. | **None.** No server-side whitelist exists. Adding an IP here does NOT affect honeypot filtering, rate limits, or scoring. | **Remove Whitelist tab** from Settings modal. |
| 7 | **Settings Modal** (`SettingsModal.tsx:70`) | **VirusTotal API Key Input & "SAVE" Button** | Saves key to `localStorage['xyberah_vt_key']`. | **None.** Backend proxy only proxies IPData, Ransomware.live, Gemini, and CORS fetch. No VirusTotal proxy exists. | **Remove VirusTotal input** unless backend proxy adds a VT endpoint. |
| 8 | **Network Tools** (`NetworkToolsView.tsx` & `netTools.ts:162`) | **"Traceroute" Tab & Action** | `performTrace()` generates **fake random IP hops** (`10.x.x.x` with `Math.random()`)! | **None.** Browsers cannot execute raw ICMP traceroute without a dedicated backend raw socket runner. | **Remove "Traceroute" tab**. |
| 9 | **Network Tools** (`NetworkToolsView.tsx` & `netTools.ts:145`) | **"HTTP Headers" Tab & Action** | `analyzeHttpHeaders()` immediately returns `null` (*"Task 101: Tools that fetch a URL the user types cannot work through an allowlist."*). | **None.** No arbitrary URL header inspection endpoint exists. | **Remove "HTTP Headers" tab**. |
| 10 | **Web Check** (`WebCheckView.tsx:285, 548, 565, 587`) | **Visual Recon, HTTP Headers, Security Policy, Tech Stack Cards** | Render "Coming Soon" badges and error text: *"Arbitrary website inspection coming soon in v1.1 via backend egress."* | **None.** No backend headless browser or egress scraper exists. | **Remove these 4 placeholder cards** from WebCheckView. |
| 11 | **Dynamic Sandbox** (`DynamicSandboxView.tsx` & `otxSandbox.ts:13`) | **"Detonate / Analyze File" Button & AI Chat** | `submitFileToSandbox()` explicitly throws: `Error('OTX Sandbox submission is disabled for v1. Backend proxy integration coming in v1.1.')`. | **None.** No sandbox file detonation environment (Cuckoo/CAPE) or upload API exists in backend. | **Remove file & route** (already hidden from navigation). |
| 12 | **Security Sandbox** (`SandboxBrowserView.tsx:608`) | **Remote Browser Address Bar & Go Button** | Displays amber banner: *"Live sandbox browser for arbitrary domains is transitioning to dedicated AWS container egress (Coming Soon in v1.1)."* | **None.** No remote container browser egress exists. | **Remove file & route** (already hidden from navigation). |
| 13 | **AI Assistant** (`ChatView.tsx` & `ViewRouter.tsx:673`) | **Chat View / AI Assistant** | Renders static placeholder: *"AI Assistant Disabled for Version 1. The integrated AI SOC assistant is turned off for this release."* | **None.** Single-turn prompt proxy exists (`/AdminRoutes/proxy/gemini`), but no multi-turn chat session memory or SOC assistant exists. | **Remove file & route dispatch**. |

---

## 2. Entire Pages / Modules Operating on 100% Mock / LocalStorage Data

These entire pages have **no database tables, no controllers, and no routes** in `Xyberah-backend`:

### A. Detection Engineering / SOC Rules (`src/pages/RulesPage.tsx`)
- **Frontend State:** Displays a list of Sigma, YARA, and Snort rules with severity and MITRE ATT&CK tags.
- **Data Source:** Loaded strictly from `DEMO_RULES` via `dataProvider.getRules()`.
- **Backend Reality:** `Xyberah-backend` has **zero endpoints for rules**. There is no rule CRUD, no database model, and no rule evaluation engine.
- **Recommendation:** **Remove from `src/data/navigation.ts`** and remove `case 'rules':` from `ViewRouter.tsx`.

### B. Response Playbooks (`src/pages/PlaybookPage.tsx`)
- **Frontend State:** Displays incident response workflows (C2 containment, Phishing response, Ransomware triage).
- **Data Source:** Loaded strictly from `DEMO_PLAYBOOKS` via `dataProvider.getPlaybooks()`.
- **Backend Reality:** `Xyberah-backend` has **zero endpoints for playbooks or SOAR workflows**.
- **Recommendation:** **Remove from `src/data/navigation.ts`** and remove `case 'playbooks':` from `ViewRouter.tsx`.

### C. Graph Investigation & Investigation Bench (`InvestigationPage.tsx` & `InvestigationBenchView.tsx`)
- **Frontend State:** Case management, evidence workbench, artifact collection, and link analysis.
- **Data Source:** Saves cases and artifacts strictly to browser `localStorage['xyberah_cases']` and `localStorage['xyberah_investigation_state']`.
- **Backend Reality:** `Xyberah-backend` has **no `/cases` or `/investigations` API**. No team sharing or persistent storage exists.
- **Recommendation:** **Remove or hide from `src/data/navigation.ts`** until a real backend case management module is developed.

### D. Brand Intel / Brand Monitor (`components/views/BrandMonitorView.tsx`)
- **Frontend State:** Monitored assets, typosquatting calculations, phishing cert alerts.
- **Data Source:** Hardcoded `MOCK_CERTS` array, client-side CertStream WebSocket (frequently blocked), and `localStorage['xyberah_monitored_assets']`.
- **Backend Reality:** `Xyberah-backend` has **no Brand Intel service, no domain scrapers, and no `/brand` API**.
- **Recommendation:** **Remove from `src/data/navigation.ts`** and remove `case 'brand_intel':` from `ViewRouter.tsx`.

### E. Vulnerability Manager (`src/pages/VulnerabilityManagerPage.tsx`)
- **Frontend State:** Renders 6 hardcoded mock vulnerabilities (`MOCK_VULNS` for Fortinet, Ivanti, Docker, etc.).
- **Backend Reality:** This is an orphaned prototype page. It is not even linked in `navigation.ts`. Real vulnerability management is already provided by:
  - `XyberahReconView` (backed by `/AsmScanRoutes/vulnerabilities`)
  - `CvePage` (backed by NVD/CISA live data)
- **Recommendation:** **Completely delete `VulnerabilityManagerPage.tsx`** and remove `case 'vulnerability_manager':` from `ViewRouter.tsx`.

### F. Dynamic Sandbox (`DynamicSandboxView.tsx`) & Security Sandbox (`SandboxBrowserView.tsx`)
- **Frontend State:** File detonation and isolated browser preview.
- **Backend Reality:** Already marked as `status: 'hidden'` in `navigation.ts`. Both rely on disabled/stubbed services (`otxSandbox.ts` throws, remote browser has no AWS egress).
- **Recommendation:** **Delete both view files** and remove their leftover cases from `ViewRouter.tsx`.

### G. Threat Canvas (`ThreatCanvasView.tsx`) & Network Topology (`NetworkTopologyView.tsx`)
- **Frontend State:** Interactive STRIDE threat modeling and network diagram builder.
- **Backend Reality:** Both are 100% client-side diagrams saved only in browser IndexedDB/LocalStorage. No backend collaborative persistence exists.
- **Recommendation:** If retained, clearly badge them as **"Offline Client Tools"**, or remove them from primary operations navigation.

---

## 3. Disconnected Backend Endpoints (Implemented in Backend but Missing in Frontend)

The backend on `feature/merge-live-features` has several fully functional endpoints that the frontend is **failing to expose**:

1. **STIX 2.1 Threat Indicator Export (`GET /HoneyPotRoutes/export/stix`):**
   - Backend has a complete STIX 2.1 bundle exporter with risk level, time, and country filtering.
   - Frontend `HoneypotLogsPage` only exports client-side CSV and plain JSON. It should wire this backend route to an "Export STIX 2.1" button.
2. **PDF Threat Intelligence Report (`GET /HoneyPotRoutes/export/pdf`):**
   - Backend generates a PDF threat summary report.
   - Frontend currently lacks a "Download PDF Summary" button in `HoneypotLogsPage`.
3. **TAXII 2.1 Push (`POST /HoneyPotRoutes/export/taxii/push`):**
   - Backend can push STIX bundles directly to remote TAXII collections.
   - Frontend has no modal or form in HoneypotLogsPage to trigger a TAXII push.

---

## 4. File-by-File Cleanup Checklist

| File | Exact Elements to Remove / Update |
|---|---|
| `src/components/layout/Header.tsx` | Remove or disable Notification Bell button (`at-header-notification`) without onClick. |
| `src/pages/IocPage.tsx` | Remove "+ Add IOC" button and `showAddIocNotice` alert logic. |
| `src/pages/HoneypotLogsPage.tsx` | Remove "Add to IOC" button from event inspector drawer. Add backend STIX/PDF export triggers. |
| `src/pages/RulesPage.tsx` | Remove "+ New Rule" button (or eliminate entire page). |
| `src/pages/PlaybookPage.tsx` | Remove "+ New Playbook" button (or eliminate entire page). |
| `components/SettingsModal.tsx` | Remove "Whitelist" tab and VirusTotal API key section. |
| `components/views/WebCheckView.tsx` | Remove "Visual Recon", "HTTP Headers", "Security Policy", and "Tech Stack" cards. |
| `components/views/NetworkToolsView.tsx` | Remove "Traceroute" tab (fake random IPs) and "HTTP Headers" tab. |
| `src/data/navigation.ts` | Remove navigation entries for: `rules`, `playbooks`, `investigate`, `brand_intel`, `chat`, `dynamic_sandbox`, `sandbox`. |
| `src/components/ViewRouter.tsx` | Remove dispatch cases for `chat`, `dynamic_sandbox`, `sandbox`, `vulnerability_manager`, and orphaned views. |
| `src/pages/VulnerabilityManagerPage.tsx` | **Delete file** (orphaned mock duplicate). |
| `components/views/DynamicSandboxView.tsx` | **Delete file** (disabled OTX sandbox). |
| `components/views/SandboxBrowserView.tsx` | **Delete file** (disabled remote browser). |
| `components/views/ChatView.tsx` | **Delete file** (disabled AI chat view). |

---

## 5. Summary Recommendation for Version 1.0 Launch

For a rock-solid, production-ready frontend against the current `feature/merge-live-features` backend:
1. **Focus on the 7 Core Verified Modules:**
   - **Dashboard:** Real ClickHouse counts, activity timeline, and posture indicators.
   - **Honeypot Logs:** Filtered logs, attacking host deep-dives, timelines, and command logs.
   - **Threat Map:** Global attack geospatial distribution and active honeypot nodes.
   - **Log Analysis:** Forensic analysis of raw honeypot events and commands.
   - **IOC Manager:** Real-time threat feed, source filters, and feed synchronization.
   - **Infrastructure:** Server registration, agent provisioning, shipper health, Docker container control, and stack deployments.
   - **Reconnaissance & Integrations:** Attack surface targets, vulnerability scans, workers, and SIEM/SOAR connectors.
   - **Access Control & Billing:** Users, RBAC permissions, audit log, and Razorpay subscriptions.
2. **Prune Unfinished Mock Modules:** Remove SOC Rules, Response Playbooks, Brand Intel, Dynamic Sandbox, Browser Sandbox, and AI Assistant until dedicated backend engines are scheduled and implemented.
