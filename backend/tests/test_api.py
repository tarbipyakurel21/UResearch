import uuid
import pytest
from fastapi.testclient import TestClient


def test_health(client: TestClient):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_project_crud(client: TestClient):
    # 1. Create project
    create_resp = client.post(
        "/api/projects",
        json={"name": "Neural Decoding", "description": "Analyzing EEG signal representations"},
    )
    assert create_resp.status_code == 200, create_resp.text
    project_data = create_resp.json()
    project_id = project_data["id"]
    assert project_data["name"] == "Neural Decoding"
    assert project_data["description"] == "Analyzing EEG signal representations"

    # 2. List projects
    list_resp = client.get("/api/projects")
    assert list_resp.status_code == 200
    projects = list_resp.json()
    assert any(p["id"] == project_id for p in projects)

    # 3. Get single project
    get_resp = client.get(f"/api/projects/{project_id}")
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == project_id

    # 4. Delete project
    del_resp = client.delete(f"/api/projects/{project_id}")
    assert del_resp.status_code in (200, 204)

    # 5. Verify deletion
    verify_resp = client.get(f"/api/projects/{project_id}")
    assert verify_resp.status_code == 404


def test_paper_crud_and_listing(client: TestClient):
    # 1. Register unassigned library paper
    unassigned_payload = {
        "key": "test_key_unassigned",
        "url": "https://ufs.sh/f/test_unassigned.pdf",
        "filename": "Attention Is All You Need.pdf",
        "content_type": "application/pdf",
        "size": 123456,
    }
    paper1_resp = client.post("/api/papers", json=unassigned_payload)
    assert paper1_resp.status_code == 200, paper1_resp.text
    paper1_data = paper1_resp.json()
    paper1_id = paper1_data["id"]
    assert paper1_data["title"] == "Attention Is All You Need"
    assert paper1_data["source_url"] == unassigned_payload["url"]
    assert paper1_data["project_id"] is None

    # 2. Create project and register paper under project
    proj_resp = client.post("/api/projects", json={"name": "Transformer Architectures"})
    proj_id = proj_resp.json()["id"]

    project_payload = {
        "key": "test_key_proj",
        "url": "https://ufs.sh/f/test_proj.pdf",
        "filename": "BERT Pretraining.pdf",
        "content_type": "application/pdf",
        "size": 654321,
    }
    paper2_resp = client.post(f"/api/projects/{proj_id}/papers", json=project_payload)
    assert paper2_resp.status_code == 200
    paper2_id = paper2_resp.json()["id"]
    assert paper2_resp.json()["project_id"] == proj_id

    # 3. List all papers
    all_papers_resp = client.get("/api/papers")
    assert all_papers_resp.status_code == 200, all_papers_resp.text
    all_papers = all_papers_resp.json()
    all_paper_ids = [p["id"] for p in all_papers]
    assert paper1_id in all_paper_ids
    assert paper2_id in all_paper_ids

    # 4. List papers by project
    proj_papers_resp = client.get(f"/api/projects/{proj_id}/papers")
    assert proj_papers_resp.status_code == 200
    proj_paper_ids = [p["id"] for p in proj_papers_resp.json()]
    assert paper2_id in proj_paper_ids
    assert paper1_id not in proj_paper_ids

    # 5. Get single paper
    single_paper_resp = client.get(f"/api/papers/{paper1_id}")
    assert single_paper_resp.status_code == 200
    assert single_paper_resp.json()["id"] == paper1_id

    # 6. Delete paper
    del_paper_resp = client.delete(f"/api/papers/{paper1_id}")
    assert del_paper_resp.status_code in (200, 204)

    # 7. Verify paper deleted
    assert client.get(f"/api/papers/{paper1_id}").status_code == 404


def test_annotations_crud_and_cascade(client: TestClient):
    # Register paper
    paper_resp = client.post(
        "/api/papers",
        json={
            "key": "ann_test_key",
            "url": "https://ufs.sh/f/ann_test.pdf",
            "filename": "EEGNet_Evaluation.pdf",
            "content_type": "application/pdf",
        },
    )
    paper_id = paper_resp.json()["id"]

    # Create annotation
    ann_payload = {
        "quote": "The model achieved 84.5% accuracy across all subjects.",
        "note": "Crucial empirical benchmark to compare with baseline",
        "locator": {"page": 4, "paragraph": 2},
    }
    ann_resp = client.post(f"/api/papers/{paper_id}/annotations", json=ann_payload)
    assert ann_resp.status_code == 200
    ann_data = ann_resp.json()
    assert ann_data["quote"] == ann_payload["quote"]
    assert ann_data["paper_id"] == paper_id

    # List annotations for paper
    list_ann_resp = client.get(f"/api/papers/{paper_id}/annotations")
    assert list_ann_resp.status_code == 200
    annotations = list_ann_resp.json()
    assert len(annotations) >= 1
    assert any(a["id"] == ann_data["id"] for a in annotations)

    # Delete paper and verify annotation cascaded
    del_resp = client.delete(f"/api/papers/{paper_id}")
    assert del_resp.status_code in (200, 204)
    assert client.get(f"/api/papers/{paper_id}/annotations").status_code == 404


def test_chat_grounded_prompt(client: TestClient):
    paper_resp = client.post(
        "/api/papers",
        json={
            "key": "prompt_test_key",
            "url": "https://ufs.sh/f/prompt_test.pdf",
            "filename": "Grounded_Study.pdf",
        },
    )
    paper_id = paper_resp.json()["id"]

    # 1. Without evidence - should fail validation
    invalid_resp = client.post(
        "/api/chat/grounded-prompt",
        json={"question": "What is the primary contribution?", "paper_ids": [paper_id]},
    )
    assert invalid_resp.status_code == 422

    # 2. With evidence
    valid_resp = client.post(
        "/api/chat/grounded-prompt",
        json={
            "question": "What is the primary contribution?",
            "paper_ids": [paper_id],
            "evidence": ["Section 3.1: We propose a compact convolutional neural network for EEG."],
        },
    )
    assert valid_resp.status_code == 200
    prompt_data = valid_resp.json()
    assert "prompt" in prompt_data
    assert "Section 3.1" in prompt_data["prompt"]
    assert len(prompt_data["citations"]) >= 1


def test_chat_with_paper_endpoint(client: TestClient):
    resp = client.post(
        "/api/chat",
        json={
            "question": "Explain the convolutional filter architecture",
            "paper_title": "EEGNet: A Compact Convolutional Neural Network",
            "paper_abstract": "EEG-based brain-computer interfaces require robust feature extractors.",
            "context": "Layer 1 uses temporal convolutions followed by depthwise separable convolutions.",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "answer" in data
    assert "EEGNet" in data["answer"]
