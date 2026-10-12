# UResearch backend

This service is the server-side foundation for the UResearch research workspace.

## Architecture

- **FastAPI** exposes project, paper, annotation, and grounded-chat endpoints.
- **PostgreSQL** stores project metadata, paper metadata, and annotations.
- **MinIO/S3** stores uploaded PDF objects.
- **Redis + Celery** provide the asynchronous ingestion boundary for PDF extraction,
  chunking, citation indexing, and future AI jobs.

The frontend can continue using browser-local storage while features migrate to
the API. The `POST /api/chat/grounded-prompt` endpoint deliberately returns a
reviewable prompt rather than sending research content to an AI provider.

## Run the stack

```bash
docker compose up --build
```

The API is available at <http://localhost:8000>, with OpenAPI documentation at
<http://localhost:8000/docs>. MinIO's console is available at
<http://localhost:9001>.

This is an architecture scaffold, not a production deployment. Authentication,
Alembic migrations, PDF extraction, embeddings, citation retrieval, and provider
adapters should be added before exposing it beyond a trusted development network.
