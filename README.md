# FinSight

**See your finances clearly. Spend smarter.**

FinSight is a personal finance management and spending‑analytics platform. It lets
you manage financial accounts, record income and expenses, categorize spending,
generate monthly statements, understand spending patterns and detect unusual
financial activity with statistical analysis and machine learning.

## Architecture

```
        React UI (TypeScript + MUI)
                  │  REST
                  ▼
        Django REST backend  ──────────►  FastAPI analytics engine
                  │   (source of truth)      (stateless, Pandas / NumPy / scikit‑learn)
                  ▼
             PostgreSQL
```

* **Django** owns all financial data and business operations (auth, accounts,
  categories, transactions, statements, anomaly persistence).
* **FastAPI** performs **stateless** analytics and anomaly detection. It never
  touches the database — Django sends it a payload and stores whatever it needs
  from the response.
* **Redis** (optional) caches expensive analytics and can back async processing
  via Celery later.

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full description.

## Repository layout

```
finsight/
├── backend/            # Django + DRF  (port 8000)
├── analytics-service/  # FastAPI       (port 9000)
├── frontend/           # React + Vite  (port 5173 dev / 80 in Docker)
├── docker-compose.yml
├── .env.example
└── README.md
```

## Quick start (Docker)

```bash
cp .env.example .env
docker compose up --build
```

* Frontend: http://localhost:5173
* Django API: http://localhost:8000/api/
* Django API docs (Swagger): http://localhost:8000/api/docs/  · Redoc: http://localhost:8000/api/redoc/  · schema: http://localhost:8000/api/schema/
* Analytics API docs (Swagger): http://localhost:9000/docs

## Quick start (local, without Docker)

### 1. Analytics service

```bash
cd analytics-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 9000
```

### 2. Django backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                 # adjust DATABASE_URL / FASTAPI_URL
python manage.py migrate
python manage.py seed_demo           # optional demo user + data
python manage.py runserver 8000
```

Without `DATABASE_URL` the backend falls back to a local SQLite database so you
can try it immediately.

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## Demo credentials

After `python manage.py seed_demo`:

```
email:    demo@finsight.app
password: DemoPass123
```

## API documentation

The Django backend serves an OpenAPI 3 schema and interactive docs (via
`drf-spectacular`, assets self-hosted — no CDN):

| URL | What |
| --- | --- |
| `/api/docs/`   | Swagger UI (use **Authorize** with a `Bearer <access>` token) |
| `/api/redoc/`  | Redoc |
| `/api/schema/` | Raw OpenAPI YAML |

The FastAPI analytics engine serves its own Swagger UI at `/docs` and Redoc at `/redoc`.

## Django admin

```bash
cd backend && python manage.py createsuperuser
```

Then sign in at `/admin/` (the login form asks for the **email**, not a username).

## Testing

```bash
# Django
cd backend && python manage.py test

# Analytics
cd analytics-service && pytest
```

## Environment variables

See [`.env.example`](.env.example). Nothing secret is committed; every service
reads its configuration from the environment.
