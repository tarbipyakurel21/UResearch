import os
import pytest
from dotenv import load_dotenv
from sqlalchemy import create_engine, select, text
from sqlalchemy.orm import Session

from app.models import Annotation, Paper, Project

load_dotenv(".env")


def get_live_db_url() -> str:
    url = ""
    env_path = os.path.join(os.path.dirname(__file__), "../../.env")
    if os.path.exists(env_path):
        with open(env_path) as f:
            for line in f:
                if line.startswith("DATABASE_URL="):
                    url = line.split("=", 1)[1].strip().strip('"').strip("'")
                    break
    if not url:
        url = os.getenv("DATABASE_URL", "")
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+psycopg://", 1)
    return url



@pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="DATABASE_URL not set")
def test_live_supabase_connection():
    db_url = get_live_db_url()
    engine = create_engine(db_url)
    with engine.connect() as conn:
        res = conn.execute(text("SELECT 1;")).scalar()
        assert res == 1


@pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="DATABASE_URL not set")
def test_live_supabase_existing_papers_query():
    """Verify that existing records in the live database conform to the SQLAlchemy Paper model."""
    db_url = get_live_db_url()
    engine = create_engine(db_url)
    with Session(engine) as session:
        papers = list(session.scalars(select(Paper)))
        assert len(papers) >= 2, f"Expected at least 2 papers in DB, found {len(papers)}"
        titles = [p.title for p in papers]
        assert "EEGNet" in titles or any("EEG" in t for t in titles)
        for p in papers:
            assert p.id is not None
            assert p.status is not None
            assert isinstance(p.authors, list)
            assert isinstance(p.metadata_json, dict)


@pytest.mark.skipif(not os.getenv("DATABASE_URL"), reason="DATABASE_URL not set")
def test_live_supabase_transaction_rollback():
    """Verify write operations work on live Postgres and clean up via rollback."""
    db_url = get_live_db_url()
    engine = create_engine(db_url)
    with engine.connect() as conn:
        trans = conn.begin()
        try:
            conn.execute(
                text("INSERT INTO projects (id, name, description) VALUES (gen_random_uuid(), :name, :desc)"),
                {"name": "Temp Test Project", "desc": "Verification test"},
            )
            count = conn.execute(
                text("SELECT count(*) FROM projects WHERE name = 'Temp Test Project'")
            ).scalar()
            assert count == 1
        finally:
            trans.rollback()

        count_after = conn.execute(
            text("SELECT count(*) FROM projects WHERE name = 'Temp Test Project'")
        ).scalar()
        assert count_after == 0
