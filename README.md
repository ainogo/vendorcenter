# VendorCenter

VendorCenter is a multi-portal local services marketplace with separate customer, vendor, and company/admin experiences.

The platform combines a React frontend, an Express + PostgreSQL backend, and a hybrid retrieval-assisted AI assistant for service discovery, booking guidance, and FAQ support.

## What Ships

- Customer portal for service discovery, booking, payments, reviews, and account history
- Vendor portal for onboarding, service management, and booking operations
- Company/admin portal for vendor approvals, analytics, zone management, and oversight
- AI assistant with semantic search, tool dispatch, and LLM fallback

## Architecture At A Glance

| Layer | Stack |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind, Radix UI |
| Backend | Node.js, Express, TypeScript, Zod |
| Database | PostgreSQL + pgvector |
| AI | Qwen2.5-3B GGUF, Groq, Gemini, semantic search |
| Deployment | Vercel (frontend), Railway (backend), Hugging Face Space (self-hosted model) |

## Repository Layout

```text
vendorcenter/
├── backend/        # Express API, DB bootstrap, workers, feature modules
├── frontend/       # Vite multi-entry app for customer, vendor, and company portals
├── deploy/         # Production runbooks, preflight scripts, hosting helpers
├── docs/           # Architecture, AI docs, scope docs, reports
├── infra/          # Docker and local infrastructure files
├── model/          # HF Space runtime, notebooks, training data, model scripts
├── .github/
├── AGENTS.md
├── package.json
└── README.md
```

## Local Development

### Prerequisites

- Node.js 20+
- npm 10+
- PostgreSQL with `pgvector` available for the full AI feature set
- Local `.env` configured with database, JWT, SMTP, and AI provider values

### Install

```bash
npm install
```

### Run

Start the backend and frontend in separate terminals from the repo root:

```bash
npm run dev:backend
npm run dev:frontend
```

Local URLs:

- Customer portal: `http://localhost:3000/`
- Vendor portal: `http://localhost:3000/vendor`
- Company portal: `http://localhost:3000/company`
- Backend API: `http://localhost:4000/`

The frontend dev server is a single Vite app that serves all three portal entry points.

## Common Commands

| Command | Purpose |
|---|---|
| `npm run dev:backend` | Start backend on port `4000` |
| `npm run dev:frontend` | Start frontend on port `3000` |
| `npm run build` | Build backend and frontend |
| `npm run db:bootstrap` | Bootstrap database schema and seed core data |
| `npm run db:health` | Run database health check |
| `npm run db:seed-admin` | Seed admin user; requires `ADMIN_PASSWORD` |

## AI Assistant

VendorCenter uses a hybrid retrieval-assisted assistant, not a full classic document RAG pipeline.

Current AI flow includes:

- `pgvector` semantic FAQ and category matching
- Semantic vendor search with geo filtering
- LLM provider chain: self-hosted Qwen2.5-3B GGUF -> Groq -> Gemini fallback
- Deterministic handling for common chat/control prompts
- Query logging and confidence-based routing

Language support is intentionally described conservatively:

- English is the strongest language for the fine-tuned model
- Hindi and Hinglish are reasonably supported for marketplace queries
- Marathi support is reliable for VendorCenter workflows, but it is significantly reinforced by backend keyword mapping, deterministic handling, and provider fallback logic

## Database

- Core schema: `backend/src/db/schema.sql`
- Embedding tables include service category and FAQ vectors
- The app uses PostgreSQL as the primary database and `pgvector` for semantic search

## Deployment

- Frontend deployment root: `frontend/`
- Backend deployment root: `backend/`
- Model-serving Space files: `model/hf-space/`
- Production scripts and runbooks: `deploy/`

Current deployment targets:

- Vercel for frontend
- Railway for backend
- Hugging Face Space for the self-hosted GGUF model

## Security Notes

- Production startup blocks insecure default JWT secrets
- Input sanitization is enabled server-side
- API routes are rate-limited and validated with Zod
- Upload handling includes validation and error sanitization
- Secrets are expected in local or deployment environment files, not in git-tracked files

## Documentation

- Architecture: `docs/architecture.md`
- AI notes: `docs/ai-features.md`
- AI roadmap: `docs/AI_PLAN.md`
- Project scope: `docs/PROJECT_SCOPE.md`
- Project scope PDF: `docs/Project_Scope_VendorCenter.pdf`
- Module docs: `docs/modules/`
- Reports: `docs/reports/`

## Notes

- `model/` contains notebooks, training data, Hugging Face runtime assets, and model scripts
- `deploy/` contains deployment helpers and operational runbooks
- Keep local secrets and private planning artifacts out of commits
