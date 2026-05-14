# ─── test_chat.py — Tests for the AI chat system prompt builder ───────────────
import os
import pytest
from datetime import datetime, timezone
from unittest.mock import MagicMock, patch

from chat import build_system_prompt
from models import Resource


def _make_resource(title: str, url: str, category: str = "Tools", description: str = None) -> Resource:
    """Helper that creates a Resource object for testing without hitting the database."""
    return Resource(
        id=1,
        title=title,
        url=url,
        category=category,
        description=description,
        created_at=datetime.now(timezone.utc),
    )


def test_build_system_prompt_empty_feed():
    # When there are no resources, the prompt should acknowledge that gracefully
    result = build_system_prompt([])
    assert "No resources" in result


def test_build_system_prompt_includes_resource_title():
    # Resource titles must appear in the prompt so Claude can reference them
    resource = _make_resource("Deep Learning Book", "https://deeplearningbook.org")
    result = build_system_prompt([resource])
    assert "Deep Learning Book" in result


def test_build_system_prompt_includes_resource_url():
    resource = _make_resource("Deep Learning Book", "https://deeplearningbook.org")
    result = build_system_prompt([resource])
    assert "deeplearningbook.org" in result


def test_build_system_prompt_includes_description_when_present():
    resource = _make_resource(
        "Fast AI Course",
        "https://fast.ai",
        description="Practical deep learning for coders",
    )
    result = build_system_prompt([resource])
    assert "Practical deep learning for coders" in result


def test_build_system_prompt_multiple_resources():
    resources = [
        _make_resource("Resource A", "https://a.com"),
        _make_resource("Resource B", "https://b.com"),
    ]
    result = build_system_prompt(resources)
    assert "Resource A" in result
    assert "Resource B" in result


def test_build_system_prompt_excludes_separator_when_no_description():
    # When description is None, the " — " separator must NOT appear on the resource line.
    # We check only the line that mentions the resource URL, not the whole prompt,
    # because the personality text itself contains " — " in unrelated places.
    resource = _make_resource("No Desc Resource", "https://nodesc.com")  # description=None by default
    result = build_system_prompt([resource])
    resource_line = next(line for line in result.splitlines() if "nodesc.com" in line)
    assert " — " not in resource_line


def test_chat_request_model_valid():
    # Confirm the request model accepts a valid conversation
    from models import ChatRequest, ChatMessageRequest
    req = ChatRequest(messages=[ChatMessageRequest(role="user", content="hello")])
    assert req.messages[0].role == "user"
    assert req.messages[0].content == "hello"


def test_chat_request_model_requires_messages():
    # messages field is required — missing it should raise a validation error
    from pydantic import ValidationError
    from models import ChatRequest
    with pytest.raises(ValidationError):
        ChatRequest()  # no messages field


def test_chat_missing_api_key(client, monkeypatch):
    # If ANTHROPIC_API_KEY is not set, the endpoint must return 500
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.setattr("main._anthropic_client", None)  # reset singleton
    response = client.post(
        "/chat",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 500
    assert "ANTHROPIC_API_KEY" in response.json()["detail"]


def test_chat_returns_event_stream(client, monkeypatch):
    # With a valid (mocked) Anthropic client, the endpoint returns text/event-stream
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")
    monkeypatch.setattr("main._anthropic_client", None)  # reset singleton so the mock is used

    mock_stream = MagicMock()
    mock_stream.__enter__ = MagicMock(return_value=mock_stream)
    mock_stream.__exit__ = MagicMock(return_value=False)
    mock_stream.text_stream = iter(["Hello", " world"])

    with patch("main.Anthropic") as MockAnthropic:
        MockAnthropic.return_value.messages.stream.return_value = mock_stream
        response = client.post(
            "/chat",
            json={"messages": [{"role": "user", "content": "hello"}]},
        )

    assert response.status_code == 200
    assert "text/event-stream" in response.headers["content-type"]
    assert "Hello" in response.text
    assert "[DONE]" in response.text
