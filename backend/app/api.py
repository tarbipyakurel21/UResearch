import json
import logging
import urllib.request
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .config import get_settings
from .db import get_db
from .models import Annotation, Paper, Project
from .schemas import (
    AnnotationCreate,
    AnnotationRead,
    ChatRequest,
    GeminiChatRequest,
    GeminiChatResponse,
    GroundedPrompt,
    PaperRead,
    ProjectCreate,
    ProjectRead,
    UploadThingPaperCreate,
)
from .tasks import extract_paper_text

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api")


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@router.post("/projects", response_model=ProjectRead)
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)) -> Project:
    project = Project(name=payload.name, description=payload.description)
    db.add(project)
    db.commit()
    db.refresh(project)
    return project


@router.get("/projects", response_model=list[ProjectRead])
def list_projects(db: Session = Depends(get_db)) -> list[Project]:
    return list(db.scalars(select(Project).order_by(Project.updated_at.desc())))


def register_upload(
    payload: UploadThingPaperCreate, db: Session, project_id: UUID | None = None
) -> Paper:
    """Register a PDF that the browser uploaded directly to UploadThing.

    The binary never passes through a Vercel function.  This endpoint stores
    only the durable UploadThing file URL/key in PostgreSQL and queues any
    later extraction work.
    """
    paper = Paper(
        project_id=project_id,
        title=payload.filename.rsplit(".", 1)[0] or "Untitled paper",
        source_url=payload.url,
        object_key=payload.key,
        metadata_json={"content_type": payload.content_type, "size": payload.size},
        status="queued",
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    try:
        extract_paper_text.delay(str(paper.id))
    except Exception as exc:
        logger.warning("Could not enqueue Celery text extraction (Redis may be offline): %s", exc)
    return paper


@router.post("/papers", response_model=PaperRead)
def register_library_paper(payload: UploadThingPaperCreate, db: Session = Depends(get_db)) -> Paper:
    """Save an UploadThing PDF in the user's unassigned library."""
    return register_upload(payload, db)


@router.post("/projects/{project_id}/papers", response_model=PaperRead)
def register_project_paper(
    project_id: UUID, payload: UploadThingPaperCreate, db: Session = Depends(get_db)
) -> Paper:
    if db.get(Project, project_id) is None:
        raise HTTPException(status_code=404, detail="Project not found")
    return register_upload(payload, db, project_id=project_id)


@router.get("/projects/{project_id}/papers", response_model=list[PaperRead])
def list_papers(project_id: UUID, db: Session = Depends(get_db)) -> list[Paper]:
    return list(db.scalars(select(Paper).where(Paper.project_id == project_id).order_by(Paper.updated_at.desc())))


@router.post("/papers/{paper_id}/annotations", response_model=AnnotationRead)
def create_annotation(
    paper_id: UUID, payload: AnnotationCreate, db: Session = Depends(get_db)
) -> Annotation:
    if db.get(Paper, paper_id) is None:
        raise HTTPException(status_code=404, detail="Paper not found")
    annotation = Annotation(paper_id=paper_id, **payload.model_dump())
    db.add(annotation)
    db.commit()
    db.refresh(annotation)
    return annotation


@router.post("/chat/grounded-prompt", response_model=GroundedPrompt)
def grounded_prompt(payload: ChatRequest, db: Session = Depends(get_db)) -> GroundedPrompt:
    papers = list(db.scalars(select(Paper).where(Paper.id.in_(payload.paper_ids))))
    evidence = [item.strip() for item in payload.evidence if item.strip()]
    if not evidence:
        evidence = [paper.extracted_text[:6000] for paper in papers if paper.extracted_text]
    if not evidence:
        raise HTTPException(status_code=422, detail="Evidence is required before asking a grounded question")
    citations = [{"paper_id": str(paper.id), "title": paper.title} for paper in papers]
    prompt = (
        "Answer the question only from the evidence below. Quote supporting passages, "
        "cite the paper title, and state uncertainty instead of inventing claims.\n\n"
        f"Question:\n{payload.question}\n\nEvidence:\n" + "\n\n---\n\n".join(evidence)
    )
    return GroundedPrompt(prompt=prompt, citations=citations)


def generate_gemini_content(prompt: str, api_key: str, model: str = "gemini-2.5-flash") -> str:
    """Call Google Gemini REST API."""
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "parts": [
                    {"text": prompt}
                ]
            }
        ],
        "generationConfig": {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
        },
    }
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        candidates = data.get("candidates", [])
        if candidates:
            parts = candidates[0].get("content", {}).get("parts", [])
            if parts:
                return parts[0].get("text", "")
        return "No text generated by Gemini."


@router.post("/chat", response_model=GeminiChatResponse)
def chat_with_paper(payload: GeminiChatRequest) -> GeminiChatResponse:
    """Answer questions grounded in the current research paper using Gemini API."""
    settings = get_settings()
    api_key = settings.resolved_gemini_key

    context_parts: list[str] = []
    if payload.paper_title:
        context_parts.append(f"Title: {payload.paper_title}")
    if payload.paper_abstract:
        context_parts.append(f"Abstract: {payload.paper_abstract}")
    if payload.context:
        context_parts.append(f"Paper Excerpts / Text:\n{payload.context[:10000]}")

    context_str = "\n\n".join(context_parts) if context_parts else "No specific paper text provided."

    history_str = ""
    if payload.history:
        formatted = []
        for h in payload.history[-6:]:
            role = h.get("sender") or h.get("role") or "user"
            text = h.get("content") or h.get("text") or ""
            formatted.append(f"{str(role).capitalize()}: {text}")
        history_str = "\nConversation History:\n" + "\n".join(formatted)

    system_instructions = (
        "You are an expert AI Research Assistant embedded in UResearch academic workbench. "
        "Your task is to provide clear, grounded, and rigorous academic explanations based on the paper. "
        "When referencing specific claims, findings, or methods, cite sections or pages in brackets where appropriate (e.g. [p. 1, Abstract] or [p. 3, §3.2]). "
        "Format your answer with clear markdown headings and bullet points. "
        "If something is not supported by the paper, state uncertainty clearly rather than fabricating facts."
    )

    full_prompt = (
        f"{system_instructions}\n\n"
        f"--- RESEARCH PAPER CONTEXT ---\n{context_str}\n\n"
        f"{history_str}\n\n"
        f"User Question: {payload.question}\n\n"
        "Assistant Response (academic markdown with citations):"
    )

    if api_key:
        try:
            answer = generate_gemini_content(full_prompt, api_key=api_key)
            return GeminiChatResponse(answer=answer, grounded=True, model="gemini-2.5-flash")
        except Exception as exc:
            logger.warning("Gemini API call failed: %s", exc)
            answer = (
                f"### Analysis of \"{payload.paper_title or 'Research Document'}\"\n\n"
                f"Regarding **\"{payload.question}\"**:\n\n"
                f"Based on the paper context:\n\n"
                f"> {payload.paper_abstract or 'Reviewing document evidence.'}\n\n"
                f"*(Note: Gemini API returned an error: {exc}. Please verify Gemini_API_KEY.)*"
            )
            return GeminiChatResponse(answer=answer, grounded=False, model="fallback")
    else:
        # Graceful grounded answer when API key is not configured yet
        answer = (
            f"### Grounded Response for \"{payload.paper_title or 'Research Document'}\"\n\n"
            f"Regarding your inquiry: **\"{payload.question}\"**\n\n"
            f"From the indexed paper abstract and sections:\n\n"
            f"> {payload.paper_abstract or 'The paper investigates architectural and empirical properties of the model.'}\n\n"
            f"*(To enable live Google Gemini model generation, add `Gemini_API_KEY` to your environment variables.)*"
        )
        return GeminiChatResponse(answer=answer, grounded=False, model="local-grounded")

