import io
import logging
import urllib.request
from uuid import UUID
from celery import Celery
from pypdf import PdfReader
from sqlalchemy.orm import Session

from .config import get_settings
from .db import SessionLocal
from .models import Paper

logger = logging.getLogger(__name__)

settings = get_settings()
celery_app = Celery("uresearch", broker=settings.redis_url, backend=settings.redis_url)
celery_app.conf.update(
    broker_connection_retry_on_startup=False,
    broker_connection_max_retries=1,
    broker_connection_timeout=1.0,
)


def extract_metadata_from_pdf_stream(pdf_bytes: bytes) -> dict:
    """Extract paper title, author list, DOI, page count, file size, and text directly from PDF stream.
    Zero assumptions: returns only what is genuinely present in the document.
    """
    import re

    result: dict = {
        "title": None,
        "authors": [],
        "text": "",
        "abstract": None,
        "doi": None,
        "page_count": 0,
        "file_size": len(pdf_bytes),
    }
    try:
        reader = PdfReader(io.BytesIO(pdf_bytes))
        result["page_count"] = len(reader.pages)
        meta = reader.metadata

        # 1. Check PDF metadata title
        if meta and meta.title:
            t = str(meta.title).strip()
            if len(t) >= 4 and not t.lower().endswith(".pdf") and "untitled" not in t.lower():
                result["title"] = t

        # 2. Check PDF metadata authors
        if meta and meta.author:
            authors = [a.strip() for a in str(meta.author).replace(";", ",").split(",") if a.strip()]
            valid_authors = [
                a for a in authors
                if len(a) >= 2 and not any(skip in a.lower() for skip in ["microsoft", "adobe", "latex", "unknown", "user"])
            ]
            if valid_authors:
                result["authors"] = valid_authors

        # 3. Extract text from pages
        extracted_pages = []
        for page in reader.pages[:12]:
            text = page.extract_text() or ""
            extracted_pages.append(text)

        full_text = "\n\n".join(extracted_pages)
        result["text"] = full_text

        # 4. If title not in metadata, derive from first page prominent lines
        if not result["title"] and extracted_pages:
            first_page_lines = [l.strip() for l in extracted_pages[0].split("\n") if l.strip()]
            candidate_lines = []
            for line in first_page_lines[:8]:
                low = line.lower()
                if any(skip in low for skip in ["arxiv:", "proceedings", "journal", "http", "doi:", "issn", "vol.", "copyright"]):
                    continue
                if len(line) < 3 or line.isdigit():
                    continue
                candidate_lines.append(line)
                if len(" ".join(candidate_lines)) > 140 or len(candidate_lines) >= 3:
                    break

            if candidate_lines:
                result["title"] = " ".join(candidate_lines)

        # 5. Extract DOI if present in first 3 pages
        search_sample = "\n".join(extracted_pages[:3])
        doi_match = re.search(r"\b(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)\b", search_sample)
        if doi_match:
            result["doi"] = doi_match.group(1).rstrip(".,;)")

        # 6. Extract Abstract if marked section exists
        abstract_match = re.search(
            r"(?i)\babstract\b[:\s—\-\n]+([\s\S]{60,1800}?)(?=\n\s*(?:[1I]\.?\s+introduction|keywords|index terms|\n\n\n))",
            search_sample,
        )
        if abstract_match:
            clean_abstract = " ".join(abstract_match.group(1).split())
            if len(clean_abstract) >= 50:
                result["abstract"] = clean_abstract

    except Exception as exc:
        logger.warning("Error parsing PDF bytes: %s", exc)

    return result


@celery_app.task
def extract_paper_text(paper_id: str) -> str:
    """Download PDF, extract actual paper title, authors, and text, and update database."""
    db: Session = SessionLocal()
    try:
        paper = db.get(Paper, UUID(paper_id))
        if not paper or not paper.source_url:
            return paper_id

        req = urllib.request.Request(paper.source_url, headers={"User-Agent": "UResearch/1.0"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            pdf_bytes = resp.read()

        extracted = extract_metadata_from_pdf_stream(pdf_bytes)
        if extracted.get("title"):
            paper.title = extracted["title"]

        if extracted.get("authors") and not paper.authors:
            paper.authors = extracted["authors"]

        if extracted.get("text"):
            paper.extracted_text = extracted["text"]
            paper.status = "ready"

        meta = dict(paper.metadata_json or {})
        if extracted.get("abstract"):
            meta["abstract"] = extracted["abstract"]
        if extracted.get("doi"):
            meta["doi"] = extracted["doi"]
        if extracted.get("page_count"):
            meta["page_count"] = extracted["page_count"]
        if extracted.get("file_size"):
            meta["file_size"] = extracted["file_size"]
        paper.metadata_json = meta

        db.commit()
    except Exception as exc:
        logger.warning("Failed to extract paper text for %s: %s", paper_id, exc)
    finally:
        db.close()

    return paper_id
