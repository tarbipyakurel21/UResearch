# UResearch backend

This service is the server-side foundation for the UResearch research workspace.

## Architecture

- **FastAPI** exposes project, paper, annotation, and grounded-chat endpoints.
- **PostgreSQL** stores project metadata, paper metadata, and annotations.
- **UploadThing** stores uploaded PDF objects directly from the browser.
- **Redis + Celery** provide the asynchronous ingestion boundary for PDF extraction,
  chunking, citation indexing, and future AI jobs.

The frontend uploads PDFs to Next.js's `/api/uploadthing` route; UploadThing
returns a durable file URL and key. The backend's
`POST /api/projects/{project_id}/papers` endpoint accepts that metadata as JSON
and stores it in PostgreSQL. The `POST /api/chat/grounded-prompt` endpoint
deliberately returns a reviewable prompt rather than sending research content to
an AI provider.

## Run the stack

```bash
docker compose up --build
```

The API is available at <http://localhost:8000>, with OpenAPI documentation at
<http://localhost:8000/docs>.

This is an architecture scaffold, not a production deployment. Authentication,
Alembic migrations, PDF extraction, embeddings, citation retrieval, and provider
adapters should be added before exposing it beyond a trusted development network.
