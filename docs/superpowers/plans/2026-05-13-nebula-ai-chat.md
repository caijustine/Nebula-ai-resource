# Nebula AI Chat Assistant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a streaming AI chat assistant to Nebula — accessible as a slide-in right panel from the navbar and expandable to a full `/chat` page — powered by Claude via the Anthropic API.

**Architecture:** A new `POST /chat` FastAPI endpoint receives the conversation history, injects the resource feed and personality system prompt, streams Claude's response via Server-Sent Events (SSE), and the React frontend reads the stream chunk-by-chunk to render text word-by-word in real time.

**Tech Stack:** `anthropic` Python SDK (backend streaming), FastAPI `StreamingResponse`, React `ReadableStream` API (frontend SSE reader), Framer Motion (panel animation), Tailwind CSS, React Router v6.

---

## File Map

**Create:**
- `backend/chat.py` — system prompt builder
- `backend/tests/test_chat.py` — all backend chat tests
- `frontend/src/types/chat.ts` — `ChatMessage` type
- `frontend/src/api/chat.ts` — `streamChat()` streaming fetch helper
- `frontend/src/hooks/useChat.ts` — shared state/logic hook (used by panel + page)
- `frontend/src/components/ChatPanel.tsx` — slide-in right panel
- `frontend/src/pages/ChatPage.tsx` — full-screen chat at `/chat`

**Modify:**
- `backend/requirements.txt` — add `anthropic`
- `backend/models.py` — add `ChatMessageRequest` and `ChatRequest`
- `backend/main.py` — add `POST /chat` endpoint
- `docker-compose.yml` — pass `ANTHROPIC_API_KEY` env var to backend container
- `.env` and `.env.example` — add `ANTHROPIC_API_KEY`
- `frontend/src/components/Navbar.tsx` — add `onOpenChat` prop + "Ask Nebula" dropdown item
- `frontend/src/App.tsx` — add `chatOpen` state, `<ChatPanel />`, and `/chat` route

---

## Task 1: Install Anthropic SDK and configure API key

**Files:**
- Modify: `backend/requirements.txt`
- Modify: `docker-compose.yml`
- Modify: `.env`
- Modify: `.env.example`

- [ ] **Step 1: Add `anthropic` to requirements.txt**

Open `backend/requirements.txt` and add this line at the end:

```
anthropic
```

The full file should now end with:
```
pytest-asyncio==0.23.6
anthropic
```

- [ ] **Step 2: Pass the API key to the backend container in docker-compose.yml**

In `docker-compose.yml`, find the `backend:` → `environment:` section (currently has `DATABASE_URL` and `ADMIN_PASSWORD`). Add one line:

```yaml
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: ${DATABASE_URL}
      ADMIN_PASSWORD: ${ADMIN_PASSWORD}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
```

- [ ] **Step 3: Add the API key to .env and .env.example**

In `.env`, add:
```
ANTHROPIC_API_KEY=your_actual_api_key_here
```

In `.env.example`, add:
```
ANTHROPIC_API_KEY=
```

> **How to get an API key:** Go to console.anthropic.com → sign up → API Keys → Create Key. Paste the `sk-ant-...` value into `.env`.

- [ ] **Step 4: Rebuild the Docker container so it installs the new package**

```bash
docker compose down && docker compose up --build
```

Expected: containers start successfully, no import errors in backend logs.

- [ ] **Step 5: Commit**

```bash
git add backend/requirements.txt docker-compose.yml .env.example
git commit -m "feat: add anthropic SDK and API key config"
```

---

## Task 2: chat.py — system prompt builder

**Files:**
- Create: `backend/tests/test_chat.py`
- Create: `backend/chat.py`

- [ ] **Step 1: Write the failing tests**

Create `backend/tests/test_chat.py`:

```python
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
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /path/to/ai_resources/backend
pytest tests/test_chat.py -v
```

Expected: `ModuleNotFoundError: No module named 'chat'` — confirms there's nothing to pass yet.

- [ ] **Step 3: Create backend/chat.py**

```python
# ─── chat.py — AI assistant personality and system prompt ─────────────────────
# This file defines WHO the Nebula assistant is. The "system prompt" is a block
# of text sent to Claude BEFORE any conversation starts — it acts like a character
# briefing. Claude reads it and behaves accordingly for the entire conversation.
#
# build_system_prompt() takes the current list of resources from the database
# and injects them into the prompt so Claude knows what Nebula has in its feed
# and can reference specific resources by name.

from typing import List
from models import Resource

# ── Personality template ───────────────────────────────────────────────────────
# {resource_list} is a placeholder — build_system_prompt() replaces it with the
# actual feed contents before sending to Claude.
_SYSTEM_PROMPT = """You are the Nebula assistant — an AI embedded in a resource-sharing \
platform for AI learners.

Your personality:
- Dry, cutting sarcasm. You act like helping people is mildly beneath you, but you \
always come through with genuinely great answers.
- Stereotypical observational humor — you notice patterns in how people ask questions \
and comment on them, even in ways that are blunt or culturally pointed.
- Deeply wise. You actually know a lot about AI and give real, valuable guidance \
underneath the sarcasm.
- Secretly caring. You want the user to find the right resource and grow, even if \
you'd never say it warmly.

Rules:
- If the user's last 3 or more consecutive messages are NOT about AI, machine learning, \
software, data science, or the resources in the feed — redirect them back to academic \
topics with a sarcastic comment about wasting your time.
- When recommending resources, reference them by title from the feed list.
- Keep responses concise. A short, sharp answer beats a long lecture.
- Never break character. Never apologize for the sarcasm.

Current Nebula resource feed:
{resource_list}"""


def build_system_prompt(resources: List[Resource]) -> str:
    """
    Returns the full system prompt with the resource feed injected.
    Called once per chat request before sending to Claude.
    """
    if not resources:
        resource_list = (
            "(No resources in the feed yet. Bold of someone to ask an empty "
            "library for recommendations.)"
        )
    else:
        lines = []
        for r in resources:
            line = f"- [{r.category or 'Uncategorized'}] {r.title}: {r.url}"
            if r.description:
                line += f" — {r.description}"
            lines.append(line)
        resource_list = "\n".join(lines)

    return _SYSTEM_PROMPT.format(resource_list=resource_list)
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
pytest tests/test_chat.py -v
```

Expected: all 5 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/chat.py backend/tests/test_chat.py
git commit -m "feat: add system prompt builder for Nebula AI assistant"
```

---

## Task 3: models.py — ChatMessageRequest and ChatRequest

**Files:**
- Modify: `backend/models.py`
- Modify: `backend/tests/test_chat.py`

- [ ] **Step 1: Write the failing test**

Add these tests to the bottom of `backend/tests/test_chat.py`:

```python
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
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_chat.py::test_chat_request_model_valid tests/test_chat.py::test_chat_request_model_requires_messages -v
```

Expected: `ImportError: cannot import name 'ChatRequest'`

- [ ] **Step 3: Add the models to models.py**

At the bottom of `backend/models.py`, add:

```python
# ── Chat request models ────────────────────────────────────────────────────────
# These two classes define the shape of the JSON body for POST /chat.
# They are NOT database tables (no `table=True`) — just validation schemas.
#
# ChatMessageRequest represents one message in the conversation history:
#   role: either "user" (the human) or "assistant" (Claude's previous replies)
#   content: the actual text of that message
#
# ChatRequest wraps a list of those messages — the full conversation so far.
# The frontend sends the entire history on every request so Claude has context
# for what was said earlier in the conversation.
class ChatMessageRequest(SQLModel):
    """One message in a conversation — either from the user or the assistant."""
    role: str     # "user" or "assistant"
    content: str  # the message text


class ChatRequest(SQLModel):
    """The full conversation history sent to POST /chat."""
    messages: List[ChatMessageRequest]
```

Also add `List` to the imports at the top of models.py — change:
```python
from typing import Optional
```
to:
```python
from typing import List, Optional
```

- [ ] **Step 4: Run to confirm pass**

```bash
pytest tests/test_chat.py -v
```

Expected: all 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/models.py backend/tests/test_chat.py
git commit -m "feat: add ChatMessageRequest and ChatRequest models"
```

---

## Task 4: main.py — POST /chat streaming endpoint

**Files:**
- Modify: `backend/main.py`
- Modify: `backend/tests/test_chat.py`

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `backend/tests/test_chat.py`:

```python
import os
from unittest.mock import MagicMock, patch


def test_chat_missing_api_key(client, monkeypatch):
    # If ANTHROPIC_API_KEY is not set, the endpoint must return 500
    # (not crash silently or call Anthropic with no key)
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    response = client.post(
        "/chat",
        json={"messages": [{"role": "user", "content": "hello"}]},
    )
    assert response.status_code == 500
    assert "ANTHROPIC_API_KEY" in response.json()["detail"]


def test_chat_returns_event_stream(client, monkeypatch):
    # With a valid (mocked) Anthropic client, the endpoint returns text/event-stream
    # and the body contains our [DONE] marker.
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-key")

    # Build a mock that pretends to be the Anthropic streaming context manager.
    # The context manager (with client.messages.stream(...) as stream:) needs:
    #   __enter__ → returns itself
    #   __exit__  → does nothing
    #   .text_stream → an iterable of text chunks
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
    # The response body should contain the text chunks and the [DONE] marker
    assert "Hello" in response.text
    assert "[DONE]" in response.text
```

- [ ] **Step 2: Run to confirm failure**

```bash
pytest tests/test_chat.py::test_chat_missing_api_key tests/test_chat.py::test_chat_returns_event_stream -v
```

Expected: both FAIL — `POST /chat` doesn't exist yet (404).

- [ ] **Step 3: Add imports to main.py**

At the top of `backend/main.py`, update the imports section. Find:

```python
import os
import re
from contextlib import asynccontextmanager
from typing import List

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from database import get_session
from models import Resource, ResourceCreate, ResourceRead
```

Replace with:

```python
import json
import os
import re
from contextlib import asynccontextmanager
from typing import List

from anthropic import Anthropic
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select

from chat import build_system_prompt
from database import get_session
from models import Resource, ResourceCreate, ResourceRead, ChatRequest
```

- [ ] **Step 4: Add POST /chat to main.py**

At the bottom of `backend/main.py`, add:

```python
# ── POST /chat — Streaming AI assistant ───────────────────────────────────────
# This endpoint powers the Nebula AI chat assistant.
#
# How streaming works:
#   1. We call Anthropic's API with the conversation history + system prompt
#   2. Instead of waiting for the full response, Anthropic sends it in small chunks
#   3. We immediately forward each chunk to the frontend using Server-Sent Events (SSE)
#   4. SSE is a simple text format: each event is "data: <content>\n\n"
#   5. The frontend reads these events one-by-one and appends text to the message
#
# json.dumps() safely encodes each chunk — this handles newlines and special
# characters so the SSE format isn't accidentally broken.
@app.post("/chat")
def chat_stream(request: ChatRequest, session: Session = Depends(get_session)):
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=500,
            detail="ANTHROPIC_API_KEY not configured — add it to .env and restart Docker",
        )

    resources = session.exec(select(Resource)).all()
    system_prompt = build_system_prompt(list(resources))
    client = Anthropic(api_key=api_key)

    def generate():
        # This is a generator function — `yield` sends one chunk at a time.
        # FastAPI's StreamingResponse calls next() on this generator repeatedly
        # until it's exhausted, sending each yielded string to the browser immediately.
        try:
            with client.messages.stream(
                model="claude-haiku-4-5-20251001",
                max_tokens=1024,
                system=system_prompt,
                messages=[
                    {"role": m.role, "content": m.content}
                    for m in request.messages
                ],
            ) as stream:
                for text in stream.text_stream:
                    if text:
                        yield f"data: {json.dumps(text)}\n\n"
            yield f"data: {json.dumps('[DONE]')}\n\n"
        except Exception as e:
            yield f"data: {json.dumps(f'[ERROR] {str(e)}')}\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")
```

- [ ] **Step 5: Run all backend tests**

```bash
pytest tests/ -v
```

Expected: all tests pass (the original resource tests + all new chat tests).

- [ ] **Step 6: Commit**

```bash
git add backend/main.py backend/tests/test_chat.py
git commit -m "feat: add POST /chat streaming endpoint"
```

---

## Task 5: Frontend types and streaming API helper

**Files:**
- Create: `frontend/src/types/chat.ts`
- Create: `frontend/src/api/chat.ts`

- [ ] **Step 1: Create frontend/src/types/chat.ts**

```typescript
// ─── chat.ts — TypeScript types for the chat feature ─────────────────────────
// TypeScript "interfaces" describe the shape of objects — what fields they have
// and what type each field is. If you accidentally use the wrong field name,
// TypeScript will show a red underline immediately in your editor.

export interface ChatMessage {
  role: 'user' | 'assistant'  // only these two values are allowed
  content: string
}
```

- [ ] **Step 2: Create frontend/src/api/chat.ts**

```typescript
// ─── chat.ts — Streaming fetch helper ────────────────────────────────────────
// This file handles the HTTP connection to POST /chat and reads the streaming
// response chunk by chunk.
//
// How browser streaming works:
//   1. fetch() sends the request and returns a Response object immediately
//   2. res.body is a ReadableStream — you can read from it incrementally
//   3. reader.read() returns the next chunk of bytes (as a Uint8Array)
//   4. TextDecoder converts those bytes into a string
//   5. We split on "\n" to find SSE "data: ..." lines
//   6. JSON.parse() decodes the chunk (the backend JSON-encodes each one)
//   7. onChunk() is called with the decoded text, onDone() when finished

import type { ChatMessage } from '../types/chat'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export async function streamChat(
  messages: ChatMessage[],
  onChunk: (text: string) => void,
  onDone: () => void,
  onError: (err: Error) => void,
): Promise<void> {
  let res: Response
  try {
    res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    })
  } catch {
    onError(new Error('Connection failed — is the backend running?'))
    return
  }

  if (!res.ok) {
    onError(new Error(`Server error: ${res.status}`))
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      // decode bytes → string, keeping multi-byte characters intact across chunks
      const raw = decoder.decode(value, { stream: true })

      for (const line of raw.split('\n')) {
        if (!line.startsWith('data: ')) continue

        let data: string
        try {
          data = JSON.parse(line.slice(6))  // strip "data: " then JSON-decode
        } catch {
          continue
        }

        if (data === '[DONE]') { onDone(); return }
        if (data.startsWith('[ERROR]')) { onError(new Error(data.slice(8))); return }
        onChunk(data)
      }
    }
  } catch {
    onError(new Error('Stream interrupted'))
    return
  }

  onDone()
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/types/chat.ts frontend/src/api/chat.ts
git commit -m "feat: add chat types and streaming API helper"
```

---

## Task 6: useChat hook — shared chat state and logic

**Files:**
- Create: `frontend/src/hooks/useChat.ts`

- [ ] **Step 1: Create frontend/src/hooks/useChat.ts**

```typescript
// ─── useChat.ts — Custom React hook for chat state ────────────────────────────
// A "custom hook" is a function that bundles related useState + useEffect logic
// so two components (ChatPanel and ChatPage) can share the same behavior without
// duplicating code. React hooks must start with "use" — that's the convention.
//
// This hook manages:
//   messages     → the full conversation history (array of {role, content} objects)
//   input        → the current text the user is typing
//   isStreaming  → true while Claude is mid-response (prevents double-sends)
//   error        → any error message to show the user
//   messagesEndRef → a ref attached to a hidden div at the bottom of the message
//                    list, used to auto-scroll as new text arrives

import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types/chat'
import { streamChat } from '../api/chat'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // useRef creates a stable reference to a DOM element across re-renders.
  // We attach this to a hidden <div> at the bottom of the message list.
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to the bottom whenever messages change (new text arrives).
  // scrollIntoView() moves the page so the referenced element is visible.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return

    const userMsg: ChatMessage = { role: 'user', content: input.trim() }
    // history = all previous messages + the new user message (used to send to API)
    const history = [...messages, userMsg]
    // Immediately add the user message AND an empty assistant message to the UI.
    // The empty assistant message will be filled in chunk-by-chunk as Claude responds.
    setMessages([...history, { role: 'assistant', content: '' }])
    setInput('')
    setIsStreaming(true)
    setError(null)

    await streamChat(
      history,
      // onChunk: append each new piece of text to the last message (the assistant's)
      (chunk) => {
        setMessages((prev) => {
          const updated = [...prev]
          updated[updated.length - 1] = {
            role: 'assistant',
            content: updated[updated.length - 1].content + chunk,
          }
          return updated
        })
      },
      // onDone: streaming finished, hide the blinking cursor
      () => setIsStreaming(false),
      // onError: show the error message below the chat
      (err) => {
        setError(err.message)
        setIsStreaming(false)
      },
    )
  }

  // Allow pressing Enter to send (Shift+Enter inserts a newline instead)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    sendMessage,
    handleKeyDown,
    messagesEndRef,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/hooks/useChat.ts
git commit -m "feat: add useChat hook for shared chat state"
```

---

## Task 7: ChatPanel component — slide-in right panel

**Files:**
- Create: `frontend/src/components/ChatPanel.tsx`

- [ ] **Step 1: Create frontend/src/components/ChatPanel.tsx**

```tsx
/* ─── ChatPanel.tsx — Slide-in AI chat panel ──────────────────────────────────
   This panel slides in from the right side of the screen when the user clicks
   "Ask Nebula" in the navbar dropdown. It contains the full chat interface.

   Key layout decisions:
   - position: fixed → stays on top of the page content, doesn't affect layout
   - z-index: 40 → renders above the page but below z-50 (the navbar)
   - The Expand button closes the panel AND navigates to /chat (full-screen mode)
   - Messages: user messages on the right (fuchsia), assistant on the left (white) */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'

interface ChatPanelProps {
  onClose: () => void
}

export function ChatPanel({ onClose }: ChatPanelProps) {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    sendMessage,
    handleKeyDown,
    messagesEndRef,
  } = useChat()
  const navigate = useNavigate()

  return (
    /* motion.div with x: '100%' → x: 0 slides the panel in from the right.
       type: 'spring' gives it a natural elastic feel rather than a linear slide. */
    <motion.div
      className="fixed top-0 right-0 h-full w-[380px] max-w-[100vw] z-40 flex flex-col bg-[#06060f]/97 backdrop-blur-2xl border-l border-white/[0.07] shadow-[-8px_0_40px_rgba(0,0,0,0.6)]"
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 300 }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <motion.span
            className="text-blue-400 text-sm"
            style={{ filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.9))' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            ✦
          </motion.span>
          <span className="text-white/80 text-sm font-medium tracking-wide">
            Nebula Assistant
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Expand button: closes the panel and navigates to the full /chat page */}
          <button
            onClick={() => { onClose(); navigate('/chat') }}
            className="text-white/30 hover:text-white/70 text-xs transition-colors px-2 py-1 rounded hover:bg-white/[0.05]"
            title="Open full page"
          >
            ⤢ Expand
          </button>
          <button
            onClick={onClose}
            className="text-white/30 hover:text-white/70 transition-colors p-1 rounded hover:bg-white/[0.05] text-sm"
          >
            ✕
          </button>
        </div>
      </div>

      {/* ── Message list ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-white/25 text-xs text-center mt-8 leading-relaxed">
            Ask me anything about AI.<br />
            <span className="text-white/15">I'll try to care.</span>
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-fuchsia-950/50 border border-fuchsia-500/20 text-fuchsia-100/90'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/75'
              }`}
            >
              {msg.content}
              {/* Blinking cursor: only shown on the last assistant message while streaming */}
              {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-[2px] h-[1em] bg-white/50 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-red-400/70 text-xs text-center px-2">{error}</p>
        )}

        {/* Invisible div at the bottom — scrollIntoView() targets this to auto-scroll */}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ────────────────────────────────────────────────────── */}
      <div className="px-4 py-3 border-t border-white/[0.06]">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the cosmos..."
            disabled={isStreaming}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-fuchsia-500/30 transition-colors disabled:opacity-50"
          />
          <motion.button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="px-3 py-2 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/28 text-fuchsia-200/85 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              boxShadow:
                '0 0 10px rgba(232,121,249,0.30), 0 0 26px rgba(192,132,252,0.16)',
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            →
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/ChatPanel.tsx
git commit -m "feat: add ChatPanel slide-in component"
```

---

## Task 8: ChatPage — full-screen chat

**Files:**
- Create: `frontend/src/pages/ChatPage.tsx`

- [ ] **Step 1: Create frontend/src/pages/ChatPage.tsx**

```tsx
/* ─── ChatPage.tsx — Full-screen AI chat page ─────────────────────────────────
   Accessible at /chat. Same chat logic as ChatPanel (via useChat hook)
   but laid out to fill the entire viewport for a focused experience.
   A "← Feed" button in the top-left navigates back to the main page. */

import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useChat } from '../hooks/useChat'

export function ChatPage() {
  const {
    messages,
    input,
    setInput,
    isStreaming,
    error,
    sendMessage,
    handleKeyDown,
    messagesEndRef,
  } = useChat()
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col pt-16">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-b border-white/[0.06] flex items-center gap-4">
        <button
          onClick={() => navigate('/')}
          className="text-white/30 hover:text-white/70 text-sm transition-colors"
        >
          ← Feed
        </button>
        <div className="flex items-center gap-2">
          <motion.span
            className="text-blue-400 text-sm"
            style={{ filter: 'drop-shadow(0 0 6px rgba(96,165,250,0.9))' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            ✦
          </motion.span>
          <span className="text-white/80 font-medium tracking-wide">
            Nebula Assistant
          </span>
        </div>
      </div>

      {/* ── Message list ────────────────────────────────────────────────── */}
      {/* max-w-3xl + mx-auto keeps long messages readable on wide screens */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl mx-auto w-full space-y-4">
        {messages.length === 0 && (
          <p className="text-white/25 text-sm text-center mt-16 leading-relaxed">
            Ask me anything about AI.<br />
            <span className="text-white/15">I'll try to care.</span>
          </p>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-fuchsia-950/50 border border-fuchsia-500/20 text-fuchsia-100/90'
                  : 'bg-white/[0.04] border border-white/[0.06] text-white/75'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' && isStreaming && i === messages.length - 1 && (
                <span className="inline-block w-[2px] h-[1em] bg-white/50 ml-0.5 animate-pulse align-middle" />
              )}
            </div>
          </div>
        ))}

        {error && (
          <p className="text-red-400/70 text-xs text-center">{error}</p>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Input area ──────────────────────────────────────────────────── */}
      <div className="px-6 py-4 border-t border-white/[0.06] max-w-3xl mx-auto w-full">
        <div className="flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask the cosmos..."
            disabled={isStreaming}
            className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-fuchsia-500/30 transition-colors disabled:opacity-50"
          />
          <motion.button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            className="px-4 py-3 rounded-xl bg-fuchsia-950/40 border border-fuchsia-500/28 text-fuchsia-200/85 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            style={{
              boxShadow:
                '0 0 10px rgba(232,121,249,0.30), 0 0 26px rgba(192,132,252,0.16)',
            }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.95 }}
          >
            →
          </motion.button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/ChatPage.tsx
git commit -m "feat: add ChatPage full-screen chat"
```

---

## Task 9: Wire it all together — Navbar + App.tsx

**Files:**
- Modify: `frontend/src/components/Navbar.tsx`
- Modify: `frontend/src/App.tsx`

- [ ] **Step 1: Update Navbar.tsx to accept onOpenChat prop and add "Ask Nebula" item**

Replace the entire contents of `frontend/src/components/Navbar.tsx` with:

```tsx
/* ─── Navbar.tsx — Fixed top navigation bar ──────────────────────────────────
   This component always sits at the top of the screen (position: fixed).
   It has two parts:
     Left: the "nebula" logo, which opens a dropdown menu when clicked
     Right: the "Submit Resource" button

   Props:
     onOpenChat → called when the user clicks "Ask Nebula" in the dropdown.
                  App.tsx uses this to set chatOpen = true, which renders ChatPanel.

   State:
     scrolled → becomes true once you scroll 20px down, switches on the blurred background
     menuOpen → controls whether the dropdown is visible */

import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'

interface NavbarProps {
  onOpenChat?: () => void
}

export function Navbar({ onOpenChat }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (!menuOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <motion.nav
      className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between transition-all duration-300 ${
        scrolled
          ? 'bg-[#02030a]/90 backdrop-blur-xl border-b border-white/[0.04]'
          : 'bg-transparent'
      }`}
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      {/* ── Logo + dropdown ─────────────────────────────────────────────── */}
      <div ref={menuRef} className="relative">
        <button
          onClick={() => setMenuOpen((v) => !v)}
          className="flex items-center gap-2 group"
        >
          <motion.span
            className="text-blue-400 text-xl"
            style={{ filter: 'drop-shadow(0 0 8px rgba(96,165,250,0.9))' }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
          >
            ✦
          </motion.span>
          <span className="text-white font-semibold tracking-tight text-lg glow-blue">
            nebula
          </span>
        </button>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              className="absolute top-full left-0 mt-3 w-44 rounded-xl bg-[#06060f]/95 backdrop-blur-xl border border-white/[0.07] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.6)]"
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.14 }}
            >
              <Link
                to="/"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/[0.05] text-sm transition-colors"
              >
                <span className="text-white/25 text-xs">✦</span>
                Feed
              </Link>
              <div className="h-px bg-white/[0.05]" />
              <Link
                to="/admin"
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/[0.05] text-sm transition-colors"
              >
                <span className="text-white/25 text-xs">⚙</span>
                Admin
              </Link>
              <div className="h-px bg-white/[0.05]" />
              {/* Ask Nebula: closes the dropdown and opens the chat panel */}
              <button
                onClick={() => { setMenuOpen(false); onOpenChat?.() }}
                className="w-full flex items-center gap-3 px-4 py-3 text-white/60 hover:text-white hover:bg-white/[0.05] text-sm transition-colors"
              >
                <span className="text-fuchsia-400/50 text-xs">✦</span>
                Ask Nebula
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Submit Resource button ───────────────────────────────────────── */}
      <motion.button
        onClick={() => navigate('/submit')}
        className="px-4 py-2 rounded-lg bg-fuchsia-950/40 border border-fuchsia-500/28 text-fuchsia-200/85 text-sm font-medium hover:bg-fuchsia-900/40 hover:border-fuchsia-400/50 hover:text-fuchsia-100 transition-all"
        style={{
          boxShadow: '0 0 10px rgba(232,121,249,0.30), 0 0 26px rgba(192,132,252,0.16), 0 0 55px rgba(139,92,246,0.08)',
          textShadow: '0 0 10px rgba(245,183,255,0.70), 0 0 24px rgba(216,148,253,0.38)',
        }}
        whileHover={{ scale: 1.06, boxShadow: '0 0 14px rgba(232,121,249,0.55), 0 0 32px rgba(192,132,252,0.30), 0 0 65px rgba(139,92,246,0.14)' }}
        whileTap={{ scale: 0.95 }}
      >
        Submit Resource
      </motion.button>
    </motion.nav>
  )
}
```

- [ ] **Step 2: Update App.tsx to add chatOpen state, ChatPanel, and /chat route**

Replace the entire contents of `frontend/src/App.tsx` with:

```tsx
/* ─── App.tsx — Root component ────────────────────────────────────────────────
   This is the top-level component that every page in the app lives inside.
   It sets up:
     1. The router (so clicking links changes the URL without a full page reload)
     2. The persistent background visuals (particles + click ripples)
     3. The navbar (always visible at the top)
     4. The chat panel (slides in when the user clicks "Ask Nebula")
     5. The routes (which page component shows for which URL)

   chatOpen state lives here (not in Navbar) because App.tsx needs to render
   ChatPanel — components can only render siblings or children, not parents. */

import { useState } from 'react'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { Toaster } from 'react-hot-toast'
import { Navbar } from './components/Navbar'
import { ParticleField } from './components/ParticleField'
import { ClickRipple } from './components/ClickRipple'
import { ChatPanel } from './components/ChatPanel'
import { FeedPage } from './pages/FeedPage'
import { SubmitPage } from './pages/SubmitPage'
import { AdminPage } from './pages/AdminPage'
import { ChatPage } from './pages/ChatPage'

export default function App() {
  // chatOpen controls whether the slide-in ChatPanel is visible.
  // It lives here so Navbar can trigger it (via onOpenChat prop) and
  // App can render/remove the panel (via AnimatePresence).
  const [chatOpen, setChatOpen] = useState(false)

  return (
    <BrowserRouter>
      <ParticleField />
      <ClickRipple />

      <Navbar onOpenChat={() => setChatOpen(true)} />

      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f0f1e',
            color: '#e2e8f0',
            border: '1px solid rgba(255,255,255,0.07)',
            borderRadius: '12px',
            fontSize: '14px',
          },
        }}
      />

      {/* AnimatePresence lets ChatPanel animate out when chatOpen becomes false.
          Without this, the panel would just disappear instantly on close. */}
      <AnimatePresence>
        {chatOpen && <ChatPanel onClose={() => setChatOpen(false)} />}
      </AnimatePresence>

      <Routes>
        <Route path="/" element={<FeedPage />} />
        <Route path="/submit" element={<SubmitPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Routes>
    </BrowserRouter>
  )
}
```

- [ ] **Step 3: Verify the frontend builds without TypeScript errors**

```bash
cd frontend
npm run build
```

Expected: build succeeds with no errors. If TypeScript errors appear, check that import paths match exactly.

- [ ] **Step 4: Manual smoke test**

Start the app: `docker compose up`

Check each item:
- [ ] Click "nebula" logo → dropdown shows Feed, Admin, Ask Nebula
- [ ] Click "Ask Nebula" → ChatPanel slides in from right
- [ ] Type a message, press Enter → message appears on right, assistant responds word-by-word
- [ ] While streaming, blinking cursor appears on assistant message
- [ ] Click "⤢ Expand" → panel closes, navigates to `/chat`
- [ ] At `/chat`, chat works full-screen, "← Feed" returns to main page
- [ ] Close panel with ✕ → panel slides back out
- [ ] Send 3+ off-topic messages (e.g. "what's 2+2", "what's the weather", "tell me a joke") → assistant sarcastically redirects

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/Navbar.tsx frontend/src/App.tsx
git commit -m "feat: wire up chat panel and /chat route"
```

---

## Done

All 9 tasks complete. The Nebula AI assistant is live:
- Slide-in panel from "Ask Nebula" in the navbar
- Streaming responses appear word-by-word
- Personality: dry sarcasm, stereotypical humor, secretly caring
- Academic redirect after 3+ off-topic messages
- Full-screen mode at `/chat`
- Resource feed injected as context so Claude can reference Nebula's content
