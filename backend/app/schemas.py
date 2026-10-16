from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ProjectCreate(BaseModel):
    name: str = Field(min_length=1, max_length=240)
    description: str | None = None


class ProjectRead(ProjectCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class PaperRead(BaseModel):
    id: UUID
    project_id: UUID | None
    title: str
    authors: list[str]
    source_url: str | None
    status: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


class UploadThingPaperCreate(BaseModel):
    """Metadata returned by UploadThing after a browser-direct PDF upload."""

    key: str = Field(min_length=1, max_length=1000)
    url: str = Field(min_length=1, max_length=2000)
    filename: str = Field(min_length=1, max_length=500)
    content_type: str = Field(default="application/pdf", max_length=255)
    size: int | None = Field(default=None, ge=0)


class AnnotationCreate(BaseModel):
    quote: str = Field(min_length=1)
    note: str | None = None
    locator: dict = Field(default_factory=dict)


class AnnotationRead(AnnotationCreate):
    id: UUID
    paper_id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class ChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=8000)
    paper_ids: list[UUID] = Field(default_factory=list)
    evidence: list[str] = Field(default_factory=list)


class GroundedPrompt(BaseModel):
    prompt: str
    citations: list[dict]


class GeminiChatRequest(BaseModel):
    question: str = Field(min_length=1, max_length=12000)
    paper_title: str | None = None
    paper_abstract: str | None = None
    context: str | None = None
    history: list[dict] = Field(default_factory=list)


class GeminiChatResponse(BaseModel):
    answer: str
    grounded: bool = True
    model: str = "gemini-2.5-flash"

