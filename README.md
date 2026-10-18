# PreFlight Sandbox 🚀
> **AI-Powered Automated Execution Layer for First-Mile Open-Source Contributions**  
> *Theme: AI to Build Developer Tools*

---

## 💡 The Problem
Beginner developers face a catastrophic drop-off rate when attempting their first open-source contributions. Portals like `firstissue.dev` or `goodfirstissue.dev` help discover tickets, but once a contributor opens a repo with 500+ files, they hit **"the first-mile wall"**:
1. **Dependency Hell:** Setting up the local environment takes hours.
2. **Context Overload:** Lack of mental model on repository structure and data flow.
3. **Reproduction Friction:** Difficulty in reliably triggering or reproducing the reported bug.

---

## ⚡ The Solution: PreFlight Sandbox
Given any GitHub issue URL, **PreFlight Sandbox** performs static and semantic analysis to:
1. **Pinpoint Target Slice:** Identifies the exact target module, file, and function slice responsible for the bug.
2. **Auto-Generate `test_repro.py` (RED Phase):** Creates a standalone unit test that demonstrates the failure in RED (failing test-driven development workflow).
3. **Generate `PREFLIGHT.md` Mission Dossier:** Complete micro-architecture briefing, Mermaid data flow diagrams, root cause analysis, and step-by-step fix guide.
4. **Generate `.devcontainer/devcontainer.json`:** Isolated development environment configuration for VS Code & GitHub Codespaces to prevent host machine pollution.
5. **Interactive TDD Blueprint:** Terminal commands for clone, venv setup, and reproduction loop.

---

## 🛠️ Tech Stack
- **Backend:** Python 3.11+, FastAPI, Uvicorn, HTTPX (async client), Google GenAI SDK (`google-genai`).
- **Frontend:** React 18, Vite, Tailwind CSS, Lucide React icons.
- **APIs:** GitHub REST API v3 (fetching issue details, comments, and repository git trees).

---

## 📁 Repository Structure

```text
issueX/
├── backend/
│   ├── main.py              # FastAPI server + GitHub API v3 client + Gemini AI analysis
│   ├── requirements.txt     # Python dependencies (FastAPI, Google GenAI SDK, HTTPX)
│   ├── .env.example         # Template for GEMINI_API_KEY & GITHUB_TOKEN
│   └── .env                 # Local configuration
└── frontend/
    ├── index.html           # Dark-themed app entry with JetBrains Mono typography
    ├── package.json         # React 18, Vite, Tailwind CSS, Lucide React
    ├── vite.config.js       # Vite bundler configuration with backend proxy
    ├── tailwind.config.js   # Tailwind custom styling and theme tokens
    ├── postcss.config.js    # PostCSS pipeline
    └── src/
        ├── App.jsx          # Interactive developer dashboard with code viewer & 1-click demos
        ├── index.css        # Global CSS styles & glassmorphism
        └── main.jsx         # React DOM root
```

---

## 🚀 Getting Started

### 1. Start Backend Server
```bash
cd issueX/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```

On Windows PowerShell, use:
```powershell
Set-Location backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
py -m pip install -r requirements.txt
py -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload
```
API Documentation will be available at: `http://127.0.0.1:8001/docs`

### 2. Start Frontend Server
```bash
cd issueX/frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```
Access the dashboard at: `http://127.0.0.1:5174`

---

## 🎯 Features & Demos
- **1-Click Curated Demos:** Instant analysis for `psf/requests #5491`, `pallets/flask #4523`, `encode/httpx #1230`, and `fastapi/fastapi #3112`.
- **Zero-Friction Fallback:** Resilient synthesis engine ensures seamless hackathon demos even if external API limits are encountered.
- **Tabbed Code Viewer:** Switch between `test_repro.py`, `PREFLIGHT.md`, `devcontainer.json`, and terminal commands with 1-click copy and file download.

---

## 🖥️ Screenshots

### PreFlight Sandbox

<p align="center">
    <img src="./Screenshot%202026-10-18%20182119.png" alt="PreFlight Sandbox landing screen" width="100%" />
</p>

### Live Sandbox and Target Analysis

<p align="center">
    <img src="./Screenshot%202026-10-18%20184109.png" alt="Target analysis and editable source code" width="49%" />
    <img src="./Screenshot%202026-10-18%20184134.png" alt="Failing reproduction test in the live sandbox" width="49%" />
</p>

### Generated Developer Workflows

<p align="center">
    <img src="./Screenshot%202026-10-18%20184150.png" alt="Generated DevContainer configuration" width="49%" />
    <img src="./Screenshot%202026-10-18%20184210.png" alt="Generated CLI workflow" width="49%" />
</p>
