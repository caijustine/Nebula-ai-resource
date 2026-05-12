def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_resources_returns_empty_list(client):
    response = client.get("/resources")
    assert response.status_code == 200
    assert response.json() == []


def test_create_resource_minimal(client):
    response = client.post("/resources", json={
        "title": "OpenAI Docs",
        "url": "https://platform.openai.com/docs",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "OpenAI Docs"
    assert data["url"] == "https://platform.openai.com/docs"
    assert data["id"] is not None
    assert data["created_at"] is not None


def test_create_resource_all_fields(client):
    response = client.post("/resources", json={
        "title": "Andrej Karpathy's Zero to Hero",
        "url": "https://youtube.com/karpathy",
        "description": "Best neural net course on YouTube",
        "category": "Videos",
        "tags": "ml, neural-nets, free",
        "submitter_name": "Alex",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["category"] == "Videos"
    assert data["submitter_name"] == "Alex"


def test_create_resource_rejects_blank_title(client):
    response = client.post("/resources", json={
        "title": "   ",
        "url": "https://example.com",
    })
    assert response.status_code == 422


def test_create_resource_rejects_invalid_url(client):
    response = client.post("/resources", json={
        "title": "Test",
        "url": "not-a-url",
    })
    assert response.status_code == 422


def test_create_resource_rejects_url_without_scheme(client):
    response = client.post("/resources", json={
        "title": "Test",
        "url": "example.com",
    })
    assert response.status_code == 422


def test_resources_sorted_newest_first(client):
    client.post("/resources", json={"title": "First", "url": "https://first.com"})
    client.post("/resources", json={"title": "Second", "url": "https://second.com"})
    response = client.get("/resources")
    data = response.json()
    assert data[0]["title"] == "Second"
    assert data[1]["title"] == "First"


def test_delete_resource_with_correct_password(client):
    create_resp = client.post("/resources", json={
        "title": "To Delete",
        "url": "https://delete.me",
    })
    resource_id = create_resp.json()["id"]
    delete_resp = client.delete(
        f"/resources/{resource_id}",
        headers={"x-admin-password": "admin"},
    )
    assert delete_resp.status_code == 204
    # Confirm it's gone
    list_resp = client.get("/resources")
    assert all(r["id"] != resource_id for r in list_resp.json())


def test_delete_resource_with_wrong_password(client):
    create_resp = client.post("/resources", json={
        "title": "Keep Me",
        "url": "https://keep.me",
    })
    resource_id = create_resp.json()["id"]
    delete_resp = client.delete(
        f"/resources/{resource_id}",
        headers={"x-admin-password": "wrong"},
    )
    assert delete_resp.status_code == 403


def test_delete_nonexistent_resource(client):
    response = client.delete(
        "/resources/99999",
        headers={"x-admin-password": "admin"},
    )
    assert response.status_code == 404


def test_verify_admin_correct_password(client):
    response = client.post(
        "/admin/verify",
        headers={"x-admin-password": "admin"},
    )
    assert response.status_code == 200


def test_verify_admin_wrong_password(client):
    response = client.post(
        "/admin/verify",
        headers={"x-admin-password": "wrong"},
    )
    assert response.status_code == 403
