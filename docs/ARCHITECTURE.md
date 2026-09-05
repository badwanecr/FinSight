# FinSight — Architecture

## 1. Service map

```
        ┌─────────────────────┐
        │   React UI (Vite)   │  TypeScript · MUI · Redux Toolkit · RTK Query · Recharts
        └──────────┬──────────┘
                   │ REST (JWT)
                   ▼
        ┌─────────────────────┐        Bearer service token          ┌──────────────────────┐
        │   Django + DRF      │ ──────────────────────────────────►  │  FastAPI analytics   │
        │   (source of truth) │ ◄──────────────────────────────────  │  (stateless engine)  │
        └──────────┬──────────┘        JSON results                  └──────────┬───────────┘
                   │                                                            │
                   ▼                                                  Pandas · NumPy · SciPy
        ┌─────────────────────┐                                       scikit-learn (IsolationForest)
        │   PostgreSQL        │
        └─────────────────────┘
                   ▲
        ┌─────────────────────┐
        │   Redis (cache)     │  analytics:user:{id}:{kind}:{range}:{digest}
        └─────────────────────┘
```

## 2. Responsibility split

| Concern | Owner | Notes |
| --- | --- | --- |
| Auth (register / login / refresh / logout) | Django | Simple JWT, custom email user model |
| Authorization / per-user data isolation | Django | Every queryset filtered by `request.user` |
| Accounts, Categories, Transactions, Statements | Django | Business rules + DB transactions |
| Balance keeping | Django | `transactions/services.py`, `select_for_update` |
| Anomaly **persistence** & review workflow | Django | `anomalies` app — the record of truth |
| Spending summary / trends / category analytics | FastAPI | Pure functions over a payload |
| Anomaly **detection** (z-score / IQR / IsolationForest) | FastAPI | Replaceable behind one response contract |
| Human-friendly anomaly explanations | FastAPI | `reason` string in every result |
| Caching expensive analytics | Django + Redis | Keyed by user + range + payload digest |

## 3. Request flow — analytics

```
React → GET /api/analytics/summary
      → Django authenticates the JWT
      → Django loads the user's transactions (optionally date-bounded)
      → Django builds a compact payload  {user_id, transactions:[{id,amount,category,type,date,...}]}
      → cache hit?  → return cached result
      → POST {FASTAPI_URL}/analytics/summary  (Authorization: Bearer <service token>, timeout)
      → FastAPI validates with Pydantic, computes with pandas/NumPy, returns JSON
      → Django caches (TTL) and returns it inside the standard envelope
```

If FastAPI times out / 5xx / returns junk, the Django client raises
`AnalyticsUnavailable`; the analytics views translate that to:

```json
HTTP 503
{ "success": false, "data": null,
  "message": "Analytics are temporarily unavailable. Your transactions are safe.",
  "error_code": "ANALYTICS_UNAVAILABLE" }
```

The **dashboard** endpoint is resilient by design: the four summary cards, spending
trend, category breakdown, top expenses and recent transactions are computed
**locally in Django** from the ledger. Only the anomaly-alert strip needs FastAPI,
and its absence is reported as `analytics_available: false` without failing the
response.

## 4. Why FastAPI is stateless

* No database connection, no session store, no user table.
* Every request carries all the data it needs.
* Two consecutive requests with the same payload are independent and
  interchangeable → horizontal scaling is just "add replicas behind a load
  balancer".
* The only shared secret is `FASTAPI_SERVICE_TOKEN` (service-to-service auth).

## 5. Anomaly detection — replaceable algorithms

`app/services/anomaly_service.py` runs three detectors and normalises each result
to the same `AnomalyItem` shape:

| Method | Technique | Grouping |
| --- | --- | --- |
| `ZSCORE` | robust (MAD) standard score, `|z| > 3` | per category |
| `IQR` | Tukey fences `Q1 − 1.5·IQR … Q3 + 1.5·IQR` | per category |
| `ISOLATION_FOREST` | `sklearn.ensemble.IsolationForest` on 8 engineered features | whole dataset |

Statistics are computed **within meaningful groups** (category), never one global
mean, so a ₹8,000 grocery run is flagged even though it is unremarkable next to
rent.

Because Django and the frontend only depend on the `AnomalyItem` contract
(`transaction_id, amount, category, detection_method, anomaly_score, severity,
reason`), the underlying maths can be swapped — z-score → IQR → IsolationForest →
a future model — without touching them.

## 6. Standard API envelope

Every Django response:

```json
// success
{ "success": true,  "data": { ... }, "message": "Request successful", "error_code": null }
// error
{ "success": false, "data": { ...field errors... }, "message": "…", "error_code": "…" }
```

Implemented centrally by `common/responses.py` (`EnvelopeJSONRenderer` +
`envelope_exception_handler`). Paginated lists keep `count / page / total_pages /
next / previous` inside `data`.

OpenAPI docs are served by `drf-spectacular` at `/api/docs/` (Swagger),
`/api/redoc/` and `/api/schema/`. The schema describes the *inner* payloads
(serializer shapes); every one is delivered inside the envelope above.

## 7. Data model (essentials)

```
User(id, name, email✦unique, password✦hashed, currency, default_account→Account,
     notify_*, created_at, updated_at)

Account(id, user→User, account_name, account_type∈{BANK,CASH,CREDIT_CARD,WALLET,
        INVESTMENT,OTHER}, balance, currency, is_active, timestamps)
        └ unique(user, account_name)

Category(id, user→User, name, type∈{INCOME,EXPENSE}, icon, is_default, timestamps)
        └ unique(user, name, type)   · default set seeded per user on signup

Transaction(id, account→Account, category→Category(PROTECT), amount>0,
            transaction_type∈{INCOME,EXPENSE}, description, merchant,
            transaction_date, timestamps)

Anomaly(id, user→User, transaction→Transaction(SET_NULL), detection_method,
        anomaly_score, severity∈{LOW,MEDIUM,HIGH,CRITICAL}, reason,
        amount/category/merchant/date snapshot, status∈{OPEN,REVIEWED,IGNORED},
        reviewed, detected_at, updated_at)
        └ unique(user, transaction, detection_method)
```

### Balance rules

* `amount` must be `> 0`; type/category must agree (EXPENSE↔EXPENSE category).
* create: `balance += (type == INCOME ? +amount : −amount)`
* update / delete: reverse the previous signed impact, then apply the new one.
* all three paths run in a single `transaction.atomic()` block with
  `select_for_update()` on the affected account rows.

## 8. Caching & invalidation

* Key: `analytics:user:{user_id}:{kind}:{start}_{end}:{sha1(payload)[:12]}`.
* TTL: `ANALYTICS_CACHE_TTL_SECONDS` (default 900s).
* On any transaction create/update/delete the frontend invalidates the
  `Dashboard` / `Analytics` / `Anomaly` RTK Query tags; server-side the digest in
  the key changes as soon as the transaction set changes, so stale entries are
  naturally bypassed. `analytics.services.invalidate_user()` can also hard-clear.

## 9. Async-ready

Today: `Django → FastAPI → response` (synchronous, small payloads).
The `analytics.services` layer is the single seam where a Celery task could be
introduced (`Django → Celery → Redis → worker → FastAPI → result`) without any
change to the React data layer — the frontend already tolerates a "pending"
/ "unavailable" state.

## 10. Security checklist

JWT access/refresh with rotation · Django password hashing · per-object ownership
checks (`common/permissions.py`) · DRF validation on every write · CORS allow-list
· `nosniff` / `X-Frame-Options: DENY` / referrer-policy / HSTS (prod) · scoped
rate limits on auth (`20/min`) and analytics (`60/min`) · service-to-service
bearer token for FastAPI · all secrets from environment, `.env` git-ignored,
`.env.example` committed.

## 11. Deployment shape (future)

```
Internet → Load Balancer ─┬─► Frontend (nginx static)
                          └─► Django (N replicas)  ─► PostgreSQL (RDS)
                                     │
                                     └─► FastAPI (M replicas)  ─► Redis
```

Django and FastAPI scale independently; FastAPI has no sticky state.
