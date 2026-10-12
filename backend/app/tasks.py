from celery import Celery

from .config import get_settings

celery_app = Celery("uresearch", broker=get_settings().redis_url, backend=get_settings().redis_url)


@celery_app.task
def extract_paper_text(paper_id: str) -> str:
    """Reserved ingestion boundary for PDF extraction and citation indexing."""
    return paper_id
