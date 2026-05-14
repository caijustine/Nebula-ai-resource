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
    const body = await res.json().catch(() => null)
    const detail = (body as any)?.detail ?? `Server error: ${res.status}`
    onError(new Error(detail))
    return
  }

  if (!res.body) {
    onError(new Error('Response has no body'))
    return
  }
  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const parts = buffer.split('\n')
      buffer = parts.pop() ?? ''   // keep the last (possibly incomplete) line for next read

      for (const line of parts) {
        if (!line.startsWith('data: ')) continue

        let data: string
        try {
          data = JSON.parse(line.slice(6))  // strip "data: " then JSON-decode
        } catch {
          continue
        }

        if (data === '[DONE]') { onDone(); return }
        if (data.startsWith('[ERROR]')) { onError(new Error(data.replace(/^\[ERROR\]\s*/, ''))); return }
        onChunk(data)
      }
    }
  } catch {
    onError(new Error('Stream interrupted'))
    return
  }

  onDone()
}
