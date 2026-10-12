from uuid import UUID

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
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
)
from .storage import put_object
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


@router.post("/projects/{project_id}/papers", response_model=PaperRead)
async def upload_paper(
    project_id: UUID, file: UploadFile = File(...), db: Session = Depends(get_db)
) -> Paper:
    project = db.get(Project, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")
    content = await file.read()
    key = f"papers/{project_id}/{file.filename or 'paper.pdf'}"
    put_object(key, content, file.content_type or "application/pdf")
    paper = Paper(
        project_id=project_id,
        title=(file.filename or "Untitled paper").rsplit(".", 1)[0],
        object_key=key,
        status="queued",
    )
    db.add(paper)
    db.commit()
    db.refresh(paper)
    extract_paper_text.delay(str(paper.id))
    return paper


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
