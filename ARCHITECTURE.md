# UResearch architecture

UResearch keeps the original three-service research workflow and adds the JSON visualizer entirely in the browser. The visualizer does not upload JSON files or require a new backend service.

## Runtime map

```text
Browser (Next.js)
  ├─ research UI + JSON visualizer
  └─ /api/* requests
          │
          ▼
FastAPI server ───── PostgreSQL
  │  │
  │  ├────────────── S3-compatible object storage
  │  └─ enqueue
  ▼
RabbitMQ ─────────── Celery worker + Beat
                         │  │
                         │  ├─ Redis task results
                         │  ├─ LLM providers
                         │  ├─ S3-compatible storage
                         │  └─ signed webhook callback
                         ▼
                    FastAPI server
```

## Responsibilities

| Component | Responsibility | Suitable host |
| --- | --- | --- |
| Next.js client | UI, authentication flow, JSON visualization | Vercel |
| FastAPI server | API, database access, OAuth, uploads, task dispatch, webhooks | Vercel for short requests or a container host |
| Celery worker | PDF parsing, extraction, long-running AI work | Persistent container/worker host |
| Celery Beat | Scheduled Zotero synchronization | One persistent scheduler instance |
| PostgreSQL | Users, papers, projects, conversations, annotations | Managed PostgreSQL |
| RabbitMQ | Durable Celery task queue | Managed RabbitMQ |
| Redis | Celery result/status backend | Managed Redis |
| S3-compatible storage | PDFs, previews, extracted images and text | AWS S3 or compatible storage |

Vercel does not replace the persistent Celery worker, Beat scheduler, RabbitMQ, or Redis. Deploy those separately and point the API at their public/private service URLs.

## Configuration boundaries

Copy `server/.env.example` to `server/.env` and `jobs/.env.example` to `jobs/.env` for local development. In production, add the same names to the relevant hosting provider; never commit real values.

### Client

- `NEXT_PUBLIC_API_URL`: API origin. For a split deployment, use the FastAPI public URL without a trailing slash. On Vercel-hosted deployments the client deliberately uses same-origin `/api` routes so every preview talks to its matching FastAPI service through `vercel.json`.
- `NEXT_PUBLIC_POSTHOG_KEY`: PostHog project key. If omitted, analytics remains disabled without a console warning.
- `NEXT_PUBLIC_POSTHOG_HOST`: normally `https://us.i.posthog.com` or the matching PostHog region.
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`: required only for paid checkout.

`NEXT_PUBLIC_*` values are embedded in the browser bundle and are never secrets.

### Server

- Core: `DATABASE_URL`, provider API keys, `E2B_API_KEY`.
- Origins/auth: `CLIENT_DOMAIN`, `API_DOMAIN`, `SECURE_COOKIES`, Google OAuth variables.
- Queue: `CELERY_BROKER_URL`, `CELERY_API_URL`, `WEBHOOK_BASE_URL`, `JOBS_INTERNAL_SECRET`.
- Storage: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `S3_BUCKET_NAME`, `CLOUDFLARE_BUCKET_NAME`.
- Integrations: Zotero, Resend, Stripe, PostHog, Langfuse, Exa, OpenAlex and Azure speech are optional by feature.

### Jobs

- Queue: `CELERY_BROKER_URL` and `CELERY_RESULT_BACKEND`.
- Callback: `WEBHOOK_BASE_URL` and the same `JOBS_INTERNAL_SECRET` as the server.
- Storage: the same S3 variables as the server.
- AI: the provider keys used by extraction jobs.
- Scheduler: `ZOTERO_SYNC_INTERVAL_SECONDS` controls Celery Beat's Zotero sync interval.

## Required value relationships

1. `JOBS_INTERNAL_SECRET` must be identical on server and jobs.
2. `CELERY_BROKER_URL` must be identical on server and jobs.
3. S3 credentials, bucket, region and upload prefix must identify the same storage on both services.
4. `WEBHOOK_BASE_URL` must be reachable from the worker and point to the server.
5. `CLIENT_DOMAIN` must exactly match the browser origin allowed by CORS.
6. Google and Zotero callback URLs must exactly match the URLs registered with those providers.

## PDF ingestion sequence

1. The browser uploads a PDF to FastAPI.
2. FastAPI stores it in S3 and publishes a Celery task through RabbitMQ.
3. A worker downloads and processes the PDF, calls the configured AI providers, and stores derived assets in S3.
4. The worker calls the server webhook using `JOBS_INTERNAL_SECRET`.
5. FastAPI updates PostgreSQL; the browser's polling sees the completed paper.

## Zotero sequence

Interactive OAuth runs through FastAPI. Celery Beat periodically queues synchronization work, and workers send results back through the same authenticated webhook path used by ingestion.

## Deployment order

1. Provision PostgreSQL, S3-compatible storage, RabbitMQ, and Redis.
2. Deploy the jobs worker and exactly one Beat scheduler.
3. Deploy FastAPI with its database, broker, storage, callback and OAuth variables.
4. Deploy Next.js with its public API, PostHog and Stripe variables.
5. Register the final production callback URLs in Google and Zotero.
6. Verify health, login, a PDF upload, worker completion, webhook delivery, and Zotero connection in that order.
