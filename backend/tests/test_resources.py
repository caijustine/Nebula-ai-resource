# ─── test_resources.py — API endpoint tests ──────────────────────────────────
# These are automated tests for every endpoint in main.py.
# Running `pytest` in the backend folder runs all functions whose name starts with `test_`.
#
# Each test:
#   1. Makes an HTTP request to an endpoint using the `client` fixture
#   2. Checks that the response status code is what we expect
#   3. Checks that the response data looks correct
#
# `assert` is how we check things. If the condition is false, the test FAILS
# and pytest shows you exactly what was expected vs what actually happened.
# Example: `assert response.status_code == 200` fails if we get 404 instead.
#
# The `client` parameter in every test function is the pytest fixture from conftest.py.
# pytest automatically detects it and passes in the TestClient connected to the test database.


def test_health(client):
    # The simplest possible test — just confirm the server is running
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_get_resources_returns_empty_list(client):
    # A fresh database should have no resources — the API should return []
    response = client.get("/resources")
    assert response.status_code == 200
    assert response.json() == []


def test_create_resource_minimal(client):
    # POST with only the required fields (title + url) should succeed with 201 Created
    response = client.post("/resources", json={
        "title": "OpenAI Docs",
        "url": "https://platform.openai.com/docs",
    })
    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "OpenAI Docs"
    assert data["url"] == "https://platform.openai.com/docs"
    assert data["id"] is not None       # database should have assigned an id
    assert data["created_at"] is not None  # database should have set a timestamp


def test_create_resource_all_fields(client):
    # All optional fields should also save and come back correctly
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
    # A title of only spaces should be rejected with 422 Unprocessable Entity
    # (our custom validation in main.py checks data.title.strip())
    response = client.post("/resources", json={
        "title": "   ",
        "url": "https://example.com",
    })
    assert response.status_code == 422


def test_create_resource_rejects_invalid_url(client):
    # A URL without a protocol scheme should be rejected
    response = client.post("/resources", json={
        "title": "Test",
        "url": "not-a-url",
    })
    assert response.status_code == 422


def test_create_resource_rejects_url_without_scheme(client):
    # Even a real-looking URL without http:// or https:// should be rejected
    response = client.post("/resources", json={
        "title": "Test",
        "url": "example.com",
    })
    assert response.status_code == 422


def test_resources_sorted_newest_first(client):
    # Create two resources — the second one should appear first in the list
    # because our GET /resources query orders by created_at DESC
    client.post("/resources", json={"title": "First", "url": "https://first.com"})
    client.post("/resources", json={"title": "Second", "url": "https://second.com"})
    response = client.get("/resources")
    data = response.json()
    assert data[0]["title"] == "Second"
    assert data[1]["title"] == "First"


def test_delete_resource_with_correct_password(client):
    # Create a resource, delete it, then confirm it's gone
    create_resp = client.post("/resources", json={
        "title": "To Delete",
        "url": "https://delete.me",
    })
    resource_id = create_resp.json()["id"]
    delete_resp = client.delete(
        f"/resources/{resource_id}",
        headers={"x-admin-password": "admin"},  # correct password
    )
    assert delete_resp.status_code == 204   # 204 No Content = successful delete
    # Confirm the resource is no longer in the list
    list_resp = client.get("/resources")
    assert all(r["id"] != resource_id for r in list_resp.json())


def test_delete_resource_with_wrong_password(client):
    # Wrong password should return 403 Forbidden and NOT delete the resource
    create_resp = client.post("/resources", json={
        "title": "Keep Me",
        "url": "https://keep.me",
    })
    resource_id = create_resp.json()["id"]
    delete_resp = client.delete(
        f"/resources/{resource_id}",
        headers={"x-admin-password": "wrong"},  # wrong password
    )
    assert delete_resp.status_code == 403


def test_delete_nonexistent_resource(client):
    # Trying to delete an id that doesn't exist should return 404 Not Found
    response = client.delete(
        "/resources/99999",
        headers={"x-admin-password": "admin"},
    )
    assert response.status_code == 404


def test_verify_admin_correct_password(client):
    # The /admin/verify endpoint should return 200 for the correct password
    response = client.post(
        "/admin/verify",
        headers={"x-admin-password": "admin"},
    )
    assert response.status_code == 200


def test_verify_admin_wrong_password(client):
    # And 403 for a wrong password
    response = client.post(
        "/admin/verify",
        headers={"x-admin-password": "wrong"},
    )
    assert response.status_code == 403
