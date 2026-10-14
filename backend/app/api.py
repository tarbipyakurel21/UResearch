from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from .db import get_db
from .models import Annotation, Paper, Project
from .schemas import (
    AnnotationCreate,
    AnnotationRead,
    ChatRequest,
    GroundedPrompt,
    PaperRead,
    ProjectCreate,
    ProjectRead,
    UploadThingPaperCreate,
)
from .tasks import extract_paper_text

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
    extract_paper_text.delay(str(paper.id))
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
