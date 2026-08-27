# Nebula AI Chat Assistant — Design Spec

**Goal:** Add a streaming AI chat assistant to Nebula that helps users find resources, answers AI questions, and has a sarcastic-but-caring personality — accessible as a slide-in panel from the navbar and expandable to a full page.

**Architecture:** The frontend sends messages to a new `POST /chat` FastAPI endpoint. The backend attaches the assistant's personality, fetches the current resource feed as context, then calls Anthropic's Claude API with streaming enabled. Chunks arrive word-by-word and are forwarded immediately to the frontend, which renders them in real time.

**Tech Stack:** Anthropic Python SDK (`anthropic`), FastAPI `StreamingResponse`, React `fetch` with `ReadableStream`, Framer Motion for panel animation, Tailwind CSS for styling.

---

## Personality

The assistant's system prompt defines its character. It is:

- **Dry and sarcastic** — reacts to questions with mild exasperation before genuinely helping
- **Stereotypical for comedic effect** — makes observational, culturally-aware jokes (not mean-spirited, but unfiltered)
- **Wise** — actually knows a lot and gives real, valuable answers
- **Secretly caring** — always steers the user toward the best resource or answer, even while roasting them
- **Academic redirect** — after 3+ consecutive messages that are off-topic (not about AI, learning, or the resources), the assistant sarcastically nudges the conversation back

Example system prompt:

```
You are the Nebula assistant. You are deeply knowledgeable about AI, machine learning, and
the resources in the Nebula feed. You speak with dry, cutting sarcasm and stereotypical
humor — you act like helping people is beneath you, but you always come through with
genuinely great answers. You care about users finding the right resource even if you'd
never admit it warmly.

Rules:
- If the user asks something off-topic (not about AI, learning, or resources) 3 or more
  times in a row, redirect them back with a sarcastic comment about wasting your time.
- When relevant, reference specific resources from the Nebula feed by title.
- Keep responses concise unless a detailed explanation is genuinely needed.
- Never break character.

Here are the current resources in the Nebula feed:
{resource_list}
```

---

## Backend

### New file: `backend/chat.py`
Holds the system prompt template and a helper that formats the resource list into a readable string for the AI context.

```
build_system_prompt(resources: list[Resource]) -> str
```

Takes the list of Resource objects and returns the full system prompt with the feed injected.

### New endpoint: `POST /chat` in `backend/main.py`

**Request body:**
```json
{
  "messages": [
    { "role": "user", "content": "what's a good course for beginners?" },
    { "role": "assistant", "content": "..." },
    { "role": "user", "content": "something in the feed?" }
  ]
}
```

**What it does:**
1. Fetches all resources from the database
2. Builds the system prompt via `build_system_prompt()`
3. Calls `anthropic.messages.stream()` with the conversation history
4. Returns a `StreamingResponse` — each chunk is forwarded as `text/event-stream` (Server-Sent Events format)

**New `.env` variable:** `ANTHROPIC_API_KEY`

**New dependency in `requirements.txt`:** `anthropic`

### Streaming format
Each chunk sent to the frontend is a plain text delta (the next few characters of the response). The frontend accumulates these into the full message.

```
data: "Well"
data: ", since"
data: " you asked"
data: "..."
data: [DONE]
```

---

## Frontend

### New file: `frontend/src/api/chat.ts`
Handles the streaming fetch to `POST /chat`. Uses the browser's `ReadableStream` API to read chunks as they arrive and calls an `onChunk(text: string)` callback for each one.

```typescript
streamChat(messages: ChatMessage[], onChunk: (text: string) => void): Promise<void>
```

### New component: `frontend/src/components/ChatPanel.tsx`
The slide-in panel. Animated with Framer Motion (`x: '100%'` → `x: 0`).

**Contents:**
- Header bar: "Nebula Assistant" title + Expand button (→ navigates to `/chat`) + Close button
- Scrollable message history: user messages right-aligned, assistant messages left-aligned
- Streaming indicator: blinking cursor (`▍`) appended to the last assistant message while streaming
- Input area: text field + Send button (fuchsia glow, matches existing style)

**State:**
- `messages: ChatMessage[]` — full conversation history
- `input: string` — current draft
- `isStreaming: boolean` — true while a response is arriving

**Width:** 380px on desktop, full-width on mobile.

### New page: `frontend/src/pages/ChatPage.tsx`
Full-screen version of the chat. Same `ChatPanel` logic but laid out to fill the viewport. Has a back button (← Feed) in the top-left. Accessible at `/chat`.

### Updated: `frontend/src/components/Navbar.tsx`
Add **"Ask Nebula"** as a third item in the dropdown (below Feed and Admin). Clicking it triggers an `onOpenChat` prop that the parent (`App.tsx`) uses to toggle `ChatPanel` visibility.

### Updated: `frontend/src/App.tsx`
- Manages `chatOpen: boolean` state
- Renders `<ChatPanel />` conditionally with `AnimatePresence`
- Passes `onOpenChat` down to `<Navbar />`

### Updated: `frontend/src/App.tsx` routes
Add `<Route path="/chat" element={<ChatPage />} />`.

---

## Data Flow (end to end)

```
User types message → hits Send
  → frontend appends message to local history
  → calls streamChat(history, onChunk)
    → POST /chat { messages: [...] }
      → backend fetches resources from DB
      → backend calls Anthropic stream API
        → chunks arrive from Anthropic
          → backend forwards each chunk as SSE
            → frontend onChunk() appends text to last message
              → React re-renders with new characters
  → [DONE] signal → isStreaming = false → cursor disappears
```

---

## Error Handling

- **No API key set:** Backend returns `500` with message "ANTHROPIC_API_KEY not configured"
- **Anthropic API error:** Backend catches the exception and returns `502` with a user-friendly message; frontend shows "Something went wrong. Try again."
- **Empty message:** Frontend prevents sending (Send button disabled when input is blank)
- **Network drop mid-stream:** Frontend catches the read error and shows a "Connection lost" message

---

## Testing

**Backend (`tests/test_chat.py`):**
- `test_chat_returns_stream` — POST to `/chat` with a valid message, assert `content-type: text/event-stream`
- `test_chat_missing_api_key` — with `ANTHROPIC_API_KEY` unset, assert 500
- `test_build_system_prompt` — unit test that `build_system_prompt()` includes resource titles in the output

**Frontend (manual):**
- Send a message → words appear one by one
- Send 3+ off-topic messages → assistant redirects sarcastically
- Click Expand → navigates to `/chat`
- Close panel → panel slides out
- Reload on `/chat` → full chat page renders correctly
