# ─── test_chat.py — Tests for the AI chat system prompt builder ───────────────
from datetime import datetime, timezone

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
    import pytest
    from pydantic import ValidationError
    from models import ChatRequest
    with pytest.raises(ValidationError):
        ChatRequest()  # no messages field
